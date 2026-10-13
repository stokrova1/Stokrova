/**
 * Outbox and Sync Protocol Contracts
 * Based on SYNC_PROTOCOL.md, ADR-007, ADR-009, and API_CONVENTIONS.md
 */

export type SyncOperationStatus =
  | 'PENDING'
  | 'SENDING'
  | 'ACKED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_PERMANENT'
  | 'CONFLICT';

export type SyncResultStatus =
  | 'APPLIED'
  | 'ALREADY_APPLIED'
  | 'REJECTED'
  | 'CONFLICT'
  | 'RETRY';

export type DevicePlatform =
  | 'TAURI_DESKTOP'
  | 'EXPO_MOBILE'
  | 'BROWSER_WEB'
  | 'CLI';

export type DeviceStatus =
  | 'ACTIVE'
  | 'REVOKED'
  | 'PENDING';

export type ConflictResolutionStrategy =
  | 'IMMUTABLE_APPEND'
  | 'SERVER_WINS'
  | 'CLIENT_WINS'
  | 'EXCEPTION_WORKFLOW';

export interface DeviceResponse {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  device_name: string;
  platform: DevicePlatform;
  app_version: string;
  status: DeviceStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterDeviceRequest {
  device_id?: string;
  branch_id?: string | null;
  device_name: string;
  platform: DevicePlatform;
  app_version: string;
}

export interface RevokeDeviceRequest {
  reason?: string;
}

export interface ClientOutboxOperation<TPayload = Record<string, unknown>> {
  operation_id: string;
  tenant_id: string;
  device_id: string;
  actor_user_id: string;
  client_sequence: number;
  command_type: string;
  entity_id: string;
  payload: TPayload;
  schema_version: number;
  created_at: string;
  attempt_count: number;
  next_attempt_at: string | null;
  status: SyncOperationStatus;
  last_error_code: string | null;
  last_error_message: string | null;
}

export interface SyncOperationEnvelope<TPayload = Record<string, unknown>> {
  operation_id: string;
  tenant_id: string;
  device_id: string;
  actor_user_id: string;
  client_sequence: number;
  command_type: string;
  entity_id: string;
  occurred_at: string;
  schema_version: number;
  payload: TPayload;
}

export interface SyncPushRequest {
  operations: SyncOperationEnvelope[];
}

export interface SyncOperationResult {
  operation_id: string;
  status: SyncResultStatus;
  server_sequence?: number;
  error_code?: string;
  error_message?: string;
}

export interface SyncPushResponse {
  results: SyncOperationResult[];
}

export interface SyncChangeItem<TPayload = Record<string, unknown>> {
  sequence: number;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'EVENT';
  payload: TPayload;
  created_at: string;
}

export interface SyncPullRequest {
  after?: number;
  limit?: number;
}

export interface SyncPullResponse {
  from_sequence: number;
  to_sequence: number;
  has_more: boolean;
  changes: SyncChangeItem[];
}

export interface TombstoneItem {
  entity_id: string;
  entity_type: string;
  deleted_at: string;
  deleted_by_user_id: string;
}

// ============================================================================
// Phase 20: Native SQLite Offline-First & Multi-Master Contracts
// ============================================================================

export type VectorClock = Record<string, number>;

export interface SyncConflictLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  client_version: number;
  server_version: number;
  client_payload: Record<string, unknown>;
  server_payload: Record<string, unknown>;
  resolution_strategy: ConflictResolutionStrategy;
  resolved_payload?: Record<string, unknown> | null;
  resolved_at?: string | null;
  created_at: string;
}

export type NetworkLivenessStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'SYNCING'
  | 'DEGRADED';

export interface SyncTelemetryStats {
  device_id: string;
  liveness_status: NetworkLivenessStatus;
  pending_outbox_count: number;
  last_sync_pulled_at?: string | null;
  last_sync_pushed_at?: string | null;
  last_server_sequence: number;
  consecutive_sync_failures: number;
  last_sync_duration_ms?: number | null;
  last_error_message?: string | null;
}

export interface OfflineStoreConfig {
  db_name: string;
  wal_mode: boolean;
  max_batch_size: number;
  sync_interval_ms: number;
  heartbeat_timeout_ms: number;
}
