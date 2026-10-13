import type {
  NetworkLivenessStatus,
  SyncTelemetryStats,
} from '@stokrova/contracts';

export interface HeartbeatManagerOptions {
  deviceId: string;
  failureThreshold?: number;
}

export class SyncHeartbeatManager {
  private deviceId: string;
  private livenessStatus: NetworkLivenessStatus = 'ONLINE';
  private consecutiveFailures = 0;
  private failureThreshold: number;
  private lastSyncPulledAt: string | null = null;
  private lastSyncPushedAt: string | null = null;
  private lastSyncDurationMs: number | null = null;
  private lastErrorMessage: string | null = null;

  constructor(options: HeartbeatManagerOptions) {
    this.deviceId = options.deviceId;
    this.failureThreshold = options.failureThreshold ?? 3;
  }

  setLiveness(status: NetworkLivenessStatus): void {
    this.livenessStatus = status;
    if (status === 'ONLINE') {
      this.consecutiveFailures = 0;
    }
  }

  recordSyncStart(): void {
    if (this.livenessStatus === 'ONLINE') {
      this.livenessStatus = 'SYNCING';
    }
  }

  recordSyncSuccess(type: 'PUSH' | 'PULL' | 'BOTH', durationMs?: number): void {
    const now = new Date().toISOString();
    this.consecutiveFailures = 0;
    this.lastErrorMessage = null;
    this.livenessStatus = 'ONLINE';

    if (durationMs !== undefined) {
      this.lastSyncDurationMs = durationMs;
    }

    if (type === 'PUSH' || type === 'BOTH') {
      this.lastSyncPushedAt = now;
    }
    if (type === 'PULL' || type === 'BOTH') {
      this.lastSyncPulledAt = now;
    }
  }

  recordSyncFailure(errorMessage: string): void {
    this.consecutiveFailures += 1;
    this.lastErrorMessage = errorMessage;

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.livenessStatus = 'DEGRADED';
    }
  }

  getTelemetryStats(pendingOutboxCount: number, lastServerSequence: number): SyncTelemetryStats {
    return {
      device_id: this.deviceId,
      liveness_status: this.livenessStatus,
      pending_outbox_count: pendingOutboxCount,
      last_sync_pulled_at: this.lastSyncPulledAt,
      last_sync_pushed_at: this.lastSyncPushedAt,
      last_server_sequence: lastServerSequence,
      consecutive_sync_failures: this.consecutiveFailures,
      last_sync_duration_ms: this.lastSyncDurationMs,
      last_error_message: this.lastErrorMessage,
    };
  }

  getLivenessStatus(): NetworkLivenessStatus {
    return this.livenessStatus;
  }
}
