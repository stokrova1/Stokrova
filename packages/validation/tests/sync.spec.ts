import { describe, it, expect } from 'vitest';
import {
  SyncOperationEnvelopeSchema,
  SyncPullRequestSchema,
  RegisterDeviceSchema,
  RevokeDeviceSchema,
  ClientOutboxOperationSchema,
  VectorClockSchema,
  SyncConflictLogSchema,
  NetworkLivenessStatusSchema,
  SyncTelemetryStatsSchema,
  OfflineStoreConfigSchema,
} from '../src/sync.js';

describe('Sync Operation & Device Validation', () => {
  it('validates a compliant sync operation envelope', () => {
    const validEnvelope = {
      operation_id: '01JABCDEF1234567890',
      tenant_id: 'tenant_lagos_main',
      device_id: 'pos_register_01',
      actor_user_id: 'usr_cashier_john',
      client_sequence: 42,
      command_type: 'sales.create',
      entity_id: 'sale_9921',
      occurred_at: new Date().toISOString(),
      schema_version: 1,
      payload: {
        total_minor: 150000,
        currency: 'NGN',
      },
    };

    const parsed = SyncOperationEnvelopeSchema.safeParse(validEnvelope);
    expect(parsed.success).toBe(true);
  });

  it('rejects an envelope missing operation_id', () => {
    const invalidEnvelope = {
      tenant_id: 'tenant_lagos_main',
      device_id: 'pos_register_01',
      actor_user_id: 'usr_cashier_john',
      client_sequence: 42,
      command_type: 'sales.create',
      entity_id: 'sale_9921',
      occurred_at: new Date().toISOString(),
      schema_version: 1,
      payload: {},
    };

    const parsed = SyncOperationEnvelopeSchema.safeParse(invalidEnvelope);
    expect(parsed.success).toBe(false);
  });

  it('rejects an invalid ISO timestamp in occurred_at', () => {
    const invalidEnvelope = {
      operation_id: '01JABCDEF1234567890',
      tenant_id: 'tenant_lagos_main',
      device_id: 'pos_register_01',
      actor_user_id: 'usr_cashier_john',
      client_sequence: 42,
      command_type: 'sales.create',
      entity_id: 'sale_9921',
      occurred_at: 'not-a-timestamp',
      schema_version: 1,
      payload: {},
    };

    const parsed = SyncOperationEnvelopeSchema.safeParse(invalidEnvelope);
    expect(parsed.success).toBe(false);
  });

  it('applies default pagination limits on sync pull request', () => {
    const parsed = SyncPullRequestSchema.parse({});
    expect(parsed.after).toBe(0);
    expect(parsed.limit).toBe(100);
  });

  it('validates device registration request', () => {
    const validDevice = {
      device_name: 'Front Register POS-01',
      platform: 'TAURI_DESKTOP',
      app_version: '1.2.0',
    };
    const parsed = RegisterDeviceSchema.safeParse(validDevice);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid device platform', () => {
    const invalid = {
      device_name: 'Front Register POS-01',
      platform: 'UNKNOWN_PLATFORM',
      app_version: '1.2.0',
    };
    const parsed = RegisterDeviceSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates client outbox operation structure', () => {
    const validOutbox = {
      operation_id: 'op_outbox_01',
      tenant_id: 'ten_01',
      device_id: 'dev_01',
      actor_user_id: 'usr_01',
      client_sequence: 1,
      command_type: 'payments.record',
      entity_id: 'pay_01',
      payload: { amount_minor: 1000 },
      schema_version: 1,
      created_at: new Date().toISOString(),
      attempt_count: 0,
      next_attempt_at: null,
      status: 'PENDING',
      last_error_code: null,
      last_error_message: null,
    };
    const parsed = ClientOutboxOperationSchema.safeParse(validOutbox);
    expect(parsed.success).toBe(true);
  });

  describe('Phase 20: Vector Clocks & Offline-First Schemas', () => {
    it('validates vector clock format', () => {
      const clock = { 'node-a': 1, 'node-b': 4, 'node-c': 0 };
      const parsed = VectorClockSchema.safeParse(clock);
      expect(parsed.success).toBe(true);

      const invalidClock = { 'node-a': -1 };
      expect(VectorClockSchema.safeParse(invalidClock).success).toBe(false);
    });

    it('validates sync conflict log schema', () => {
      const conflictLog = {
        id: 'conf_01',
        tenant_id: 'ten_01',
        entity_type: 'product',
        entity_id: 'prod_99',
        client_version: 1,
        server_version: 2,
        client_payload: { name: 'Client Name' },
        server_payload: { name: 'Server Name' },
        resolution_strategy: 'EXCEPTION_WORKFLOW',
        created_at: new Date().toISOString(),
      };
      const parsed = SyncConflictLogSchema.safeParse(conflictLog);
      expect(parsed.success).toBe(true);
    });

    it('validates network liveness statuses', () => {
      expect(NetworkLivenessStatusSchema.safeParse('ONLINE').success).toBe(true);
      expect(NetworkLivenessStatusSchema.safeParse('OFFLINE').success).toBe(true);
      expect(NetworkLivenessStatusSchema.safeParse('SYNCING').success).toBe(true);
      expect(NetworkLivenessStatusSchema.safeParse('DEGRADED').success).toBe(true);
      expect(NetworkLivenessStatusSchema.safeParse('UNKNOWN').success).toBe(false);
    });

    it('validates sync telemetry stats', () => {
      const stats = {
        device_id: 'pos-term-01',
        liveness_status: 'ONLINE',
        pending_outbox_count: 3,
        last_server_sequence: 1204,
        consecutive_sync_failures: 0,
        last_sync_duration_ms: 142,
      };
      const parsed = SyncTelemetryStatsSchema.safeParse(stats);
      expect(parsed.success).toBe(true);
    });

    it('validates offline store configuration with defaults', () => {
      const minimal = { db_name: 'stokrova_local.sqlite' };
      const parsed = OfflineStoreConfigSchema.parse(minimal);
      expect(parsed.wal_mode).toBe(true);
      expect(parsed.max_batch_size).toBe(100);
      expect(parsed.sync_interval_ms).toBe(5000);
      expect(parsed.heartbeat_timeout_ms).toBe(15000);
    });
  });
});

