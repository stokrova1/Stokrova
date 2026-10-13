/**
 * STOKROVA Mobile — Offline Outbox Sync Status & Mesh Telemetry
 * Live network state indicator, local SQLite mutation queue depth,
 * vector clock conflict notification panel, and manual sync pulse.
 */

import { themeTokens, brandColors } from '@stokrova/ui';

export type NetworkLivenessState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'DEGRADED';

export interface PendingMutationEntry {
  operationId: string;
  entityType: 'INVENTORY_PICK' | 'INBOUND_RECEIPT' | 'CYCLE_COUNT' | 'TRANSFER';
  createdAtIso: string;
  retryCount: number;
}

export interface SyncConflictAlert {
  entityId: string;
  conflictType: 'VECTOR_CLOCK_DIVERGENCE' | 'NEGATIVE_STOCK_RISK';
  serverTimestampIso: string;
  localTimestampIso: string;
  resolutionStrategy: 'EXCEPTION_WORKFLOW' | 'IMMUTABLE_APPEND';
}

export class MobileSyncTelemetryViewModel {
  private networkState: NetworkLivenessState = 'ONLINE';
  private pendingMutations: PendingMutationEntry[] = [];
  private conflicts: SyncConflictAlert[] = [];
  private lastSyncSuccessIso: string = new Date().toISOString();

  constructor(initialState: NetworkLivenessState = 'ONLINE') {
    this.networkState = initialState;
  }

  public getNetworkState(): NetworkLivenessState {
    return this.networkState;
  }

  public setNetworkState(state: NetworkLivenessState): void {
    this.networkState = state;
  }

  public queueLocalMutation(
    entityType: PendingMutationEntry['entityType'],
    operationId = `op_${Date.now()}`,
  ): PendingMutationEntry {
    const entry: PendingMutationEntry = {
      operationId,
      entityType,
      createdAtIso: new Date().toISOString(),
      retryCount: 0,
    };
    this.pendingMutations.push(entry);
    return entry;
  }

  public clearSyncedMutations(operationIds: string[]): void {
    const set = new Set(operationIds);
    this.pendingMutations = this.pendingMutations.filter((m) => !set.has(m.operationId));
    this.lastSyncSuccessIso = new Date().toISOString();
  }

  public getPendingCount(): number {
    return this.pendingMutations.length;
  }

  public getPendingMutations(): PendingMutationEntry[] {
    return [...this.pendingMutations];
  }

  public recordConflict(conflict: SyncConflictAlert): void {
    this.conflicts.unshift({ ...conflict });
  }

  public getConflicts(): SyncConflictAlert[] {
    return [...this.conflicts];
  }

  public renderStatusChipHtml(): string {
    const isOnline = this.networkState === 'ONLINE';
    const isSyncing = this.networkState === 'SYNCING';
    const isDegraded = this.networkState === 'DEGRADED';

    let stateColor = '#4ADE80'; // Green
    if (isSyncing) stateColor = brandColors.gold[400];
    if (isDegraded) stateColor = '#FBBF24';
    if (!isOnline && !isSyncing && !isDegraded) stateColor = '#F87171'; // Red

    const pendingBadge =
      this.pendingMutations.length > 0
        ? `<span class="pending-count" style="margin-left: 6px; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; font-size: 0.7rem;">${this.pendingMutations.length}</span>`
        : '';

    return `
      <div class="mobile-sync-chip" style="display: inline-flex; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid ${stateColor}; color: #fff; padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; font-family: var(--stokrova-font-mono);">
        <span class="pulse-dot" style="width: 8px; height: 8px; border-radius: 50%; background: ${stateColor}; margin-right: 6px;"></span>
        <span>${this.networkState}</span>
        ${pendingBadge}
      </div>
    `.trim();
  }

  public renderTelemetryDrawerHtml(): string {
    const tokens = themeTokens.dark;
    const conflictsHtml = this.conflicts
      .map(
        (c) => `
          <div class="conflict-item" style="background: rgba(248,113,113,0.1); border-left: 3px solid #F87171; padding: 10px; border-radius: 4px; margin-bottom: 8px;">
            <div style="font-weight: 700; color: #F87171; font-size: 0.8rem;">${c.conflictType}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 2px;">
              Entity: ${c.entityId} — Strategy: ${c.resolutionStrategy}
            </div>
          </div>
        `.trim(),
      )
      .join('\n');

    return `
      <div class="sync-telemetry-drawer" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 16px; color: ${tokens.textPrimary}; max-width: 440px;">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0;">Offline Sync Engine Telemetry</h4>
          ${this.renderStatusChipHtml()}
        </header>

        <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; margin-bottom: 12px;">
          <div>Queue Depth: <strong>${this.pendingMutations.length} mutations</strong></div>
          <div>Last Success: ${new Date(this.lastSyncSuccessIso).toLocaleTimeString()}</div>
        </div>

        ${
          this.conflicts.length > 0
            ? `
          <div class="conflicts-section">
            <div style="font-size: 0.8rem; font-weight: 700; color: #F87171; margin-bottom: 6px;">
              Sync Conflicts (${this.conflicts.length})
            </div>
            ${conflictsHtml}
          </div>
        `
            : ''
        }
      </div>
    `.trim();
  }
}
