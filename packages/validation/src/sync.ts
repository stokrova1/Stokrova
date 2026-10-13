import { z } from 'zod';

export const SyncOperationEnvelopeSchema = z.object({
  operation_id: z.string().min(1, 'operation_id is required'),
  tenant_id: z.string().min(1, 'tenant_id is required'),
  device_id: z.string().min(1, 'device_id is required'),
  actor_user_id: z.string().min(1, 'actor_user_id is required'),
  client_sequence: z.number().int().nonnegative(),
  command_type: z.string().min(1, 'command_type is required'),
  entity_id: z.string().min(1, 'entity_id is required'),
  occurred_at: z.string().datetime(),
  schema_version: z.number().int().positive(),
  payload: z.record(z.unknown()),
});

export const SyncPushRequestSchema = z.object({
  operations: z.array(SyncOperationEnvelopeSchema).min(1, 'At least one operation required'),
});

export const SyncPullRequestSchema = z.object({
  after: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export const DevicePlatformSchema = z.enum([
  'TAURI_DESKTOP',
  'EXPO_MOBILE',
  'BROWSER_WEB',
  'CLI',
]);

export const DeviceStatusSchema = z.enum([
  'ACTIVE',
  'REVOKED',
  'PENDING',
]);

export const RegisterDeviceSchema = z.object({
  device_id: z.string().min(1).optional(),
  branch_id: z.string().nullable().optional(),
  device_name: z.string().trim().min(1, 'device_name is required').max(100),
  platform: DevicePlatformSchema,
  app_version: z.string().trim().min(1, 'app_version is required').max(50),
});

export const RevokeDeviceSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const SyncOperationStatusSchema = z.enum([
  'PENDING',
  'SENDING',
  'ACKED',
  'FAILED_RETRYABLE',
  'FAILED_PERMANENT',
  'CONFLICT',
]);

export const ClientOutboxOperationSchema = z.object({
  operation_id: z.string().min(1, 'operation_id is required'),
  tenant_id: z.string().min(1, 'tenant_id is required'),
  device_id: z.string().min(1, 'device_id is required'),
  actor_user_id: z.string().min(1, 'actor_user_id is required'),
  client_sequence: z.number().int().nonnegative(),
  command_type: z.string().min(1, 'command_type is required'),
  entity_id: z.string().min(1, 'entity_id is required'),
  payload: z.record(z.unknown()),
  schema_version: z.number().int().positive(),
  created_at: z.string().datetime(),
  attempt_count: z.number().int().nonnegative(),
  next_attempt_at: z.string().datetime().nullable(),
  status: SyncOperationStatusSchema,
  last_error_code: z.string().nullable(),
  last_error_message: z.string().nullable(),
});

export const ConflictResolutionStrategySchema = z.enum([
  'IMMUTABLE_APPEND',
  'SERVER_WINS',
  'CLIENT_WINS',
  'EXCEPTION_WORKFLOW',
]);

export const VectorClockSchema = z.record(z.string(), z.number().int().nonnegative());

export const SyncConflictLogSchema = z.object({
  id: z.string().min(1, 'id is required'),
  tenant_id: z.string().min(1, 'tenant_id is required'),
  entity_type: z.string().min(1, 'entity_type is required'),
  entity_id: z.string().min(1, 'entity_id is required'),
  client_version: z.number().int().nonnegative(),
  server_version: z.number().int().nonnegative(),
  client_payload: z.record(z.unknown()),
  server_payload: z.record(z.unknown()),
  resolution_strategy: ConflictResolutionStrategySchema,
  resolved_payload: z.record(z.unknown()).nullable().optional(),
  resolved_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
});

export const NetworkLivenessStatusSchema = z.enum([
  'ONLINE',
  'OFFLINE',
  'SYNCING',
  'DEGRADED',
]);

export const SyncTelemetryStatsSchema = z.object({
  device_id: z.string().min(1, 'device_id is required'),
  liveness_status: NetworkLivenessStatusSchema,
  pending_outbox_count: z.number().int().nonnegative(),
  last_sync_pulled_at: z.string().datetime().nullable().optional(),
  last_sync_pushed_at: z.string().datetime().nullable().optional(),
  last_server_sequence: z.number().int().nonnegative(),
  consecutive_sync_failures: z.number().int().nonnegative(),
  last_sync_duration_ms: z.number().int().nonnegative().nullable().optional(),
  last_error_message: z.string().nullable().optional(),
});

export const OfflineStoreConfigSchema = z.object({
  db_name: z.string().min(1, 'db_name is required'),
  wal_mode: z.boolean().default(true),
  max_batch_size: z.number().int().positive().max(500).default(100),
  sync_interval_ms: z.number().int().positive().default(5000),
  heartbeat_timeout_ms: z.number().int().positive().default(15000),
});

export type ValidatedSyncPushRequest = z.infer<typeof SyncPushRequestSchema>;
export type ValidatedSyncPullRequest = z.infer<typeof SyncPullRequestSchema>;
export type ValidatedRegisterDeviceRequest = z.infer<typeof RegisterDeviceSchema>;
export type ValidatedRevokeDeviceRequest = z.infer<typeof RevokeDeviceSchema>;
export type ValidatedClientOutboxOperation = z.infer<typeof ClientOutboxOperationSchema>;
export type ValidatedSyncConflictLog = z.infer<typeof SyncConflictLogSchema>;
export type ValidatedSyncTelemetryStats = z.infer<typeof SyncTelemetryStatsSchema>;
export type ValidatedOfflineStoreConfig = z.infer<typeof OfflineStoreConfigSchema>;

