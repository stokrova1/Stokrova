import { describe, it, expect } from 'vitest';
import {
  SyncEngine,
  SQLITE_PRAGMAS,
  SQLITE_INIT_SCRIPTS,
  ClientOutboxOrchestrator,
  ClientPullEngine,
  SyncHeartbeatManager,
} from '../src/index.js';
import type { SyncOperationEnvelope, SyncChangeItem } from '@stokrova/contracts';

describe('Sync Engine Primitives (@stokrova/sync)', () => {
  it('validates strictly monotonic client sequences', () => {
    expect(SyncEngine.validateClientSequence(0, 1)).toBe(true);
    expect(SyncEngine.validateClientSequence(1, 2)).toBe(true);
    expect(SyncEngine.validateClientSequence(1, 3)).toBe(false); // Gap
    expect(SyncEngine.validateClientSequence(2, 2)).toBe(false); // Duplicate
  });

  it('sorts operations deterministically by client sequence', () => {
    const ops = [
      { client_sequence: 3 } as SyncOperationEnvelope,
      { client_sequence: 1 } as SyncOperationEnvelope,
      { client_sequence: 2 } as SyncOperationEnvelope,
    ];

    const sorted = SyncEngine.sortOperationsBySequence(ops);
    expect(sorted.map((o) => o.client_sequence)).toEqual([1, 2, 3]);
  });

  it('filters monotonic change feed entries strictly after cursor', () => {
    const changes: SyncChangeItem[] = [
      { sequence: 10, tenant_id: 'ten_1', entity_type: 'Order', entity_id: '1', operation: 'INSERT', payload: {}, created_at: '' },
      { sequence: 11, tenant_id: 'ten_1', entity_type: 'Order', entity_id: '2', operation: 'INSERT', payload: {}, created_at: '' },
      { sequence: 12, tenant_id: 'ten_1', entity_type: 'Order', entity_id: '3', operation: 'INSERT', payload: {}, created_at: '' },
    ];

    const filtered = SyncEngine.filterChangesAfterCursor(changes, 10);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.sequence)).toEqual([11, 12]);
  });

  it('validates outbox status transitions', () => {
    expect(SyncEngine.canTransition('PENDING', 'SENDING')).toBe(true);
    expect(SyncEngine.canTransition('SENDING', 'ACKED')).toBe(true);
    expect(SyncEngine.canTransition('ACKED', 'SENDING')).toBe(false);
  });

  describe('Phase 20: SQLite Schema Definitions (ADR-004, ADR-009)', () => {
    it('defines WAL mode and foreign key pragmas', () => {
      expect(SQLITE_PRAGMAS).toContain('PRAGMA journal_mode = WAL;');
      expect(SQLITE_PRAGMAS).toContain('PRAGMA foreign_keys = ON;');
      expect(SQLITE_PRAGMAS).toContain('PRAGMA synchronous = NORMAL;');
    });

    it('contains DDL for all essential offline tables and indices', () => {
      const allDdl = SQLITE_INIT_SCRIPTS.join('\n');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS local_outbox');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS sync_cursor');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS local_catalog');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS local_customers');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS local_orders');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS local_order_lines');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS local_payments');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS local_inventory_ledger');
      expect(allDdl).toContain('CREATE TABLE IF NOT EXISTS sync_conflict_log');
    });
  });

  describe('Phase 20: Client Outbox Orchestrator', () => {
    it('enqueues operations with monotonic sequences and RFC 9562 UUIDv7 IDs', () => {
      const orchestrator = new ClientOutboxOrchestrator();
      const op1 = orchestrator.enqueueOperation({
        tenant_id: 'ten_01',
        device_id: 'term_01',
        actor_user_id: 'usr_cashier',
        command_type: 'sales.create',
        entity_id: 'sale_101',
        payload: { total_minor: 1500 },
      });

      const op2 = orchestrator.enqueueOperation({
        tenant_id: 'ten_01',
        device_id: 'term_01',
        actor_user_id: 'usr_cashier',
        command_type: 'payments.record',
        entity_id: 'pay_101',
        payload: { amount_minor: 1500 },
      });

      expect(op1.client_sequence).toBe(1);
      expect(op2.client_sequence).toBe(2);
      expect(op1.status).toBe('PENDING');
      expect(op2.status).toBe('PENDING');
      expect(op1.operation_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(orchestrator.getPendingCount()).toBe(2);
    });

    it('prepares push batch and transitions eligible records to SENDING', () => {
      const orchestrator = new ClientOutboxOrchestrator();
      orchestrator.enqueueOperation({
        tenant_id: 'ten_01',
        device_id: 'term_01',
        actor_user_id: 'usr_cashier',
        command_type: 'sales.create',
        entity_id: 'sale_101',
        payload: { total_minor: 1500 },
      });

      const batch = orchestrator.preparePushBatch(10);
      expect(batch).not.toBeNull();
      expect(batch?.operations).toHaveLength(1);
      expect(batch?.operations[0]?.command_type).toBe('sales.create');

      const record = orchestrator.getRecord(batch!.operations[0]!.operation_id);
      expect(record?.status).toBe('SENDING');
    });

    it('processes ACKED response and marks operations as completed', () => {
      const orchestrator = new ClientOutboxOrchestrator();
      const op = orchestrator.enqueueOperation({
        tenant_id: 'ten_01',
        device_id: 'term_01',
        actor_user_id: 'usr_cashier',
        command_type: 'payments.record',
        entity_id: 'pay_101',
        payload: { amount_minor: 1500 },
      });

      orchestrator.preparePushBatch(10);
      orchestrator.processPushResponse({
        results: [
          {
            operation_id: op.operation_id,
            status: 'APPLIED',
            server_sequence: 991,
          },
        ],
      });

      const record = orchestrator.getRecord(op.operation_id);
      expect(record?.status).toBe('ACKED');
      expect(orchestrator.getPendingCount()).toBe(0);
    });

    it('handles RETRY response with exponential backoff scheduling', () => {
      const orchestrator = new ClientOutboxOrchestrator();
      const op = orchestrator.enqueueOperation({
        tenant_id: 'ten_01',
        device_id: 'term_01',
        actor_user_id: 'usr_cashier',
        command_type: 'catalog.update',
        entity_id: 'prod_1',
        payload: { price: 200 },
      });

      orchestrator.preparePushBatch(10);
      orchestrator.processPushResponse({
        results: [
          {
            operation_id: op.operation_id,
            status: 'RETRY',
            error_code: 'RATE_LIMITED',
            error_message: 'Too many requests',
          },
        ],
      });

      const record = orchestrator.getRecord(op.operation_id);
      expect(record?.status).toBe('FAILED_RETRYABLE');
      expect(record?.attempt_count).toBe(1);
      expect(record?.next_attempt_at).not.toBeNull();
      expect(record?.last_error_code).toBe('RATE_LIMITED');
    });

    it('handles network failure by reverting SENDING operations to FAILED_RETRYABLE', () => {
      const orchestrator = new ClientOutboxOrchestrator();
      const op = orchestrator.enqueueOperation({
        tenant_id: 'ten_01',
        device_id: 'term_01',
        actor_user_id: 'usr_cashier',
        command_type: 'sales.create',
        entity_id: 'sale_999',
        payload: {},
      });

      orchestrator.preparePushBatch(10);
      orchestrator.markSendingFailed('Connection timed out');

      const record = orchestrator.getRecord(op.operation_id);
      expect(record?.status).toBe('FAILED_RETRYABLE');
      expect(record?.last_error_message).toBe('Connection timed out');
      expect(record?.attempt_count).toBe(1);
    });
  });

  describe('Phase 20: Client Pull Engine & Conflict Handling (Rule 10)', () => {
    it('prepares pull request with cursor advancement', () => {
      const pullEngine = new ClientPullEngine('ten_01', 500);
      const req = pullEngine.preparePullRequest(100);
      expect(req.after).toBe(500);
      expect(req.limit).toBe(100);
    });

    it('applies pull response cleanly when no local conflict exists', () => {
      const pullEngine = new ClientPullEngine('ten_01', 100);
      const appliedEntities: Record<string, unknown>[] = [];

      const result = pullEngine.applyPullResponse(
        {
          from_sequence: 101,
          to_sequence: 102,
          has_more: false,
          changes: [
            {
              sequence: 101,
              tenant_id: 'ten_01',
              entity_type: 'CatalogItem',
              entity_id: 'item_1',
              operation: 'INSERT',
              payload: { name: 'Item 1', base_price_minor: 1000 },
              created_at: new Date().toISOString(),
            },
            {
              sequence: 102,
              tenant_id: 'ten_01',
              entity_type: 'CatalogItem',
              entity_id: 'item_2',
              operation: 'INSERT',
              payload: { name: 'Item 2', base_price_minor: 2500 },
              created_at: new Date().toISOString(),
            },
          ],
        },
        () => null, // No locally modified entity
        (_op, _type, _id, payload) => {
          appliedEntities.push(payload);
        },
      );

      expect(result.appliedCount).toBe(2);
      expect(result.newCursorSequence).toBe(102);
      expect(result.hasGaps).toBe(false);
      expect(result.conflictLogs).toHaveLength(0);
      expect(appliedEntities).toHaveLength(2);
    });

    it('detects sequence gaps in stream and reports missing sequences', () => {
      const pullEngine = new ClientPullEngine('ten_01', 10);
      const result = pullEngine.applyPullResponse({
        from_sequence: 11,
        to_sequence: 15,
        has_more: false,
        changes: [
          {
            sequence: 11,
            tenant_id: 'ten_01',
            entity_type: 'Order',
            entity_id: 'ord_1',
            operation: 'INSERT',
            payload: {},
            created_at: '',
          },
          {
            sequence: 14,
            tenant_id: 'ten_01',
            entity_type: 'Order',
            entity_id: 'ord_2',
            operation: 'INSERT',
            payload: {},
            created_at: '',
          },
        ],
      });

      expect(result.hasGaps).toBe(true);
      expect(result.missingSequences).toEqual([12, 13]);
    });

    it('routes concurrent modifications to EXCEPTION_WORKFLOW (Rule 10)', () => {
      const pullEngine = new ClientPullEngine('ten_01', 50);

      const localStore: Record<string, unknown> = {
        name: 'Local Modified Name',
      };

      const result = pullEngine.applyPullResponse(
        {
          from_sequence: 51,
          to_sequence: 51,
          has_more: false,
          changes: [
            {
              sequence: 51,
              tenant_id: 'ten_01',
              entity_type: 'Product',
              entity_id: 'prod_99',
              operation: 'UPDATE',
              payload: {
                version: 2,
                vector_clock: { 'server': 2, 'pos-2': 1 },
                name: 'Server Concurrently Modified Name',
              },
              created_at: new Date().toISOString(),
            },
          ],
        },
        () => ({
          version: 2,
          vector_clock: { 'server': 1, 'pos-1': 2 }, // Concurrent vector clock!
          payload: localStore,
          isLocallyModified: true,
        }),
        (_op, _type, _id, winningPayload) => {
          Object.assign(localStore, winningPayload);
        },
      );

      expect(result.conflictLogs).toHaveLength(1);
      const conflict = result.conflictLogs[0]!;
      expect(conflict.resolution_strategy).toBe('EXCEPTION_WORKFLOW');
      expect(conflict.entity_id).toBe('prod_99');
      expect(conflict.server_payload).toHaveProperty('name', 'Server Concurrently Modified Name');
    });
  });

  describe('Phase 20: Sync Heartbeat Manager & Telemetry (Rule 24)', () => {
    it('manages network liveness transitions and records success', () => {
      const heartbeat = new SyncHeartbeatManager({ deviceId: 'term_pos_01' });
      expect(heartbeat.getLivenessStatus()).toBe('ONLINE');

      heartbeat.recordSyncStart();
      expect(heartbeat.getLivenessStatus()).toBe('SYNCING');

      heartbeat.recordSyncSuccess('BOTH', 85);
      expect(heartbeat.getLivenessStatus()).toBe('ONLINE');

      const stats = heartbeat.getTelemetryStats(0, 1500);
      expect(stats.device_id).toBe('term_pos_01');
      expect(stats.liveness_status).toBe('ONLINE');
      expect(stats.consecutive_sync_failures).toBe(0);
      expect(stats.last_sync_duration_ms).toBe(85);
      expect(stats.last_sync_pulled_at).not.toBeNull();
      expect(stats.last_sync_pushed_at).not.toBeNull();
    });

    it('degrades network state when failure threshold is reached', () => {
      const heartbeat = new SyncHeartbeatManager({ deviceId: 'term_pos_01', failureThreshold: 3 });

      heartbeat.recordSyncFailure('Socket timeout 1');
      expect(heartbeat.getLivenessStatus()).toBe('ONLINE');

      heartbeat.recordSyncFailure('Socket timeout 2');
      expect(heartbeat.getLivenessStatus()).toBe('ONLINE');

      heartbeat.recordSyncFailure('Socket timeout 3');
      expect(heartbeat.getLivenessStatus()).toBe('DEGRADED');

      const stats = heartbeat.getTelemetryStats(5, 1500);
      expect(stats.liveness_status).toBe('DEGRADED');
      expect(stats.consecutive_sync_failures).toBe(3);
      expect(stats.last_error_message).toBe('Socket timeout 3');

      // Recover
      heartbeat.recordSyncSuccess('PULL');
      expect(heartbeat.getLivenessStatus()).toBe('ONLINE');
      expect(heartbeat.getTelemetryStats(5, 1500).consecutive_sync_failures).toBe(0);
    });
  });
});

