import { describe, it, expect, beforeEach } from 'vitest';
import { SyncService } from './sync.service.js';
import { DevicesService } from '../devices/devices.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { SyncOperationEnvelope } from '@stokrova/contracts';

describe('SyncService', () => {
  let syncService: SyncService;
  let devicesService: DevicesService;
  let auditService: AuditService;

  const tenantId = 'ten_lagos_01';
  let deviceId: string;

  beforeEach(async () => {
    devicesService = new DevicesService();
    auditService = new AuditService();
    syncService = new SyncService(devicesService, auditService);

    const device = await devicesService.registerDevice(tenantId, {
      device_name: 'Counter POS 1',
      platform: 'TAURI_DESKTOP',
      app_version: '1.0.0',
    });
    deviceId = device.id;
  });

  const createTestEnvelope = (
    opId: string,
    clientSeq: number,
    commandType = 'sales.create',
  ): SyncOperationEnvelope => ({
    operation_id: opId,
    tenant_id: tenantId,
    device_id: deviceId,
    actor_user_id: 'usr_cashier_john',
    client_sequence: clientSeq,
    command_type: commandType,
    entity_id: `ent_${opId}`,
    occurred_at: new Date().toISOString(),
    schema_version: 1,
    payload: {
      amount_minor: 150000,
      currency: 'NGN',
    },
  });

  describe('Push Protocol & Idempotent Inbox', () => {
    it('applies new operations and assigns strictly monotonic server sequence', async () => {
      const op1 = createTestEnvelope('op_001', 1, 'sales.create');
      const op2 = createTestEnvelope('op_002', 2, 'payments.record');

      const response = await syncService.pushOperations(tenantId, {
        operations: [op1, op2],
      });

      expect(response.results).toHaveLength(2);
      expect(response.results[0]).toEqual({
        operation_id: 'op_001',
        status: 'APPLIED',
        server_sequence: 1,
      });
      expect(response.results[1]).toEqual({
        operation_id: 'op_002',
        status: 'APPLIED',
        server_sequence: 2,
      });
    });

    it('handles idempotent retries gracefully with ALREADY_APPLIED', async () => {
      const op1 = createTestEnvelope('op_retry_001', 1);

      // First push
      const res1 = await syncService.pushOperations(tenantId, {
        operations: [op1],
      });
      expect(res1.results[0]!.status).toBe('APPLIED');
      expect(res1.results[0]!.server_sequence).toBe(1);

      // Re-push identical operation (e.g. client network timeout retry)
      const res2 = await syncService.pushOperations(tenantId, {
        operations: [op1],
      });
      expect(res2.results[0]!.status).toBe('ALREADY_APPLIED');
      expect(res2.results[0]!.server_sequence).toBe(1);

      // Verify sequence did NOT advance and changes weren't duplicated
      const pull = await syncService.pullChanges(tenantId, { after: 0, limit: 100 });
      expect(pull.changes).toHaveLength(1);
    });

    it('rejects operations originating from a revoked device', async () => {
      await devicesService.revokeDevice(tenantId, deviceId, {
        reason: 'Compromised',
      });

      const op = createTestEnvelope('op_revoked_01', 1);
      const response = await syncService.pushOperations(tenantId, {
        operations: [op],
      });

      expect(response.results[0]!.status).toBe('REJECTED');
      expect(response.results[0]!.error_code).toBe('DEVICE_REVOKED');

      // Verify security event was recorded
      const securityEvents = await auditService.querySecurityEvents({
        tenant_id: tenantId,
      });
      expect(securityEvents).toHaveLength(1);
      expect(securityEvents[0]!.event_type).toBe('DEVICE_REVOKED_ACCESS');
    });

    it('rejects cross-tenant operation push attempts and records critical security event', async () => {
      const op = createTestEnvelope('op_cross_01', 1);
      op.tenant_id = 'ten_rogue_99'; // Tampered tenant ID in envelope

      const response = await syncService.pushOperations(tenantId, {
        operations: [op],
      });

      expect(response.results[0]!.status).toBe('REJECTED');
      expect(response.results[0]!.error_code).toBe('CROSS_TENANT_VIOLATION');

      const securityEvents = await auditService.querySecurityEvents({
        tenant_id: tenantId,
      });
      expect(securityEvents).toHaveLength(1);
      expect(securityEvents[0]!.event_type).toBe('CROSS_TENANT_SYNC_ATTEMPT');
      expect(securityEvents[0]!.severity).toBe('CRITICAL');
    });
  });

  describe('Pull Protocol & Change Feed', () => {
    beforeEach(async () => {
      // Seed 5 operations
      const ops = [
        createTestEnvelope('op_pull_1', 1, 'sales.create'),
        createTestEnvelope('op_pull_2', 2, 'payments.record'),
        createTestEnvelope('op_pull_3', 3, 'inventory.movement'),
        createTestEnvelope('op_pull_4', 4, 'receipt.print'),
        createTestEnvelope('op_pull_5', 5, 'sales.create'),
      ];
      await syncService.pushOperations(tenantId, { operations: ops });
    });

    it('pulls all changes starting from sequence 0', async () => {
      const pull = await syncService.pullChanges(tenantId, { after: 0, limit: 10 });

      expect(pull.from_sequence).toBe(0);
      expect(pull.to_sequence).toBe(5);
      expect(pull.has_more).toBe(false);
      expect(pull.changes).toHaveLength(5);
      expect(pull.changes.map((c) => c.sequence)).toEqual([1, 2, 3, 4, 5]);
    });

    it('pulls incremental changes after a cursor', async () => {
      const pull = await syncService.pullChanges(tenantId, { after: 3, limit: 10 });

      expect(pull.from_sequence).toBe(3);
      expect(pull.to_sequence).toBe(5);
      expect(pull.changes).toHaveLength(2);
      expect(pull.changes.map((c) => c.sequence)).toEqual([4, 5]);
    });

    it('paginates changes and sets has_more flag', async () => {
      const pull = await syncService.pullChanges(tenantId, { after: 0, limit: 2 });

      expect(pull.from_sequence).toBe(0);
      expect(pull.to_sequence).toBe(2);
      expect(pull.has_more).toBe(true);
      expect(pull.changes).toHaveLength(2);
    });

    it('rejects cursor request ahead of server sequence', async () => {
      await expect(
        syncService.pullChanges(tenantId, { after: 999, limit: 10 }),
      ).rejects.toThrowError(/ahead of server/);
    });
  });
});
