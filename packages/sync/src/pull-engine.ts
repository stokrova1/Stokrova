import type {
  SyncPullRequest,
  SyncPullResponse,
  SyncChangeItem,
  SyncConflictLog,
} from '@stokrova/contracts';
import {
  detectSequenceGaps,
  resolveMasterEntityConflict,
  generateUuidV7,
} from '@stokrova/domain';

export type PullChangeOperation = SyncChangeItem['operation'];

export interface LocalEntityGetter {
  (entityType: string, entityId: string): {
    version: number;
    vector_clock?: Record<string, number>;
    payload: Record<string, unknown>;
    isLocallyModified?: boolean;
  } | null;
}

export interface LocalEntityApplier {
  (
    operation: PullChangeOperation,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
  ): void;
}

export interface PullApplicationResult {
  appliedCount: number;
  conflictLogs: SyncConflictLog[];
  hasGaps: boolean;
  missingSequences: number[];
  newCursorSequence: number;
}

export class ClientPullEngine {
  private tenantId: string;
  private lastServerSequence: number;
  private lastPulledAt: string | null = null;
  private conflictLogs: SyncConflictLog[] = [];

  constructor(tenantId: string, initialSequence = 0) {
    this.tenantId = tenantId;
    this.lastServerSequence = initialSequence;
  }

  /**
   * Constructs the pull request for the next batch of changes.
   */
  preparePullRequest(limit = 100): SyncPullRequest {
    return {
      after: this.lastServerSequence,
      limit,
    };
  }

  /**
   * Applies the server pull response to the local SQLite state.
   */
  applyPullResponse(
    response: SyncPullResponse,
    entityGetter?: LocalEntityGetter,
    entityApplier?: LocalEntityApplier,
  ): PullApplicationResult {
    const sequences = response.changes.map((c) => c.sequence);
    const gapAnalysis = detectSequenceGaps(sequences);
    const generatedConflicts: SyncConflictLog[] = [];
    let appliedCount = 0;

    // Changes must be sorted monotonically
    const sortedChanges = [...response.changes].sort((a, b) => a.sequence - b.sequence);

    for (const change of sortedChanges) {
      if (change.sequence <= this.lastServerSequence) {
        // Already processed
        continue;
      }

      if (change.operation === 'DELETE') {
        if (entityApplier) {
          entityApplier('DELETE', change.entity_type, change.entity_id, {});
        }
        appliedCount++;
        continue;
      }

      // INSERT or UPDATE
      const localEntity = entityGetter ? entityGetter(change.entity_type, change.entity_id) : null;

      if (localEntity && localEntity.isLocallyModified) {
        // Offline concurrent modification collision check (Rule 10)
        const serverVersion = (change.payload['version'] as number | undefined) ?? localEntity.version + 1;
        const serverClock = change.payload['vector_clock'] as Record<string, number> | undefined;

        const resolution = resolveMasterEntityConflict(
          `${change.entity_type.toLowerCase()}.update`,
          {
            version: localEntity.version,
            clock: localEntity.vector_clock,
            payload: localEntity.payload,
          },
          {
            version: serverVersion,
            clock: serverClock,
            payload: change.payload,
          },
        );

        if (resolution.isConflict || resolution.strategy === 'EXCEPTION_WORKFLOW') {
          const conflictEntry: SyncConflictLog = {
            id: generateUuidV7(),
            tenant_id: this.tenantId,
            entity_type: change.entity_type,
            entity_id: change.entity_id,
            client_version: localEntity.version,
            server_version: serverVersion,
            client_payload: localEntity.payload,
            server_payload: change.payload,
            resolution_strategy: 'EXCEPTION_WORKFLOW',
            resolved_payload: null,
            resolved_at: null,
            created_at: new Date().toISOString(),
          };

          this.conflictLogs.push(conflictEntry);
          generatedConflicts.push(conflictEntry);
        }

        // Apply winning payload
        if (entityApplier) {
          entityApplier(change.operation, change.entity_type, change.entity_id, resolution.winningPayload);
        }
      } else {
        // Clean apply without local contention
        if (entityApplier) {
          entityApplier(change.operation, change.entity_type, change.entity_id, change.payload);
        }
      }

      appliedCount++;
    }

    this.lastServerSequence = Math.max(this.lastServerSequence, response.to_sequence);
    this.lastPulledAt = new Date().toISOString();

    return {
      appliedCount,
      conflictLogs: generatedConflicts,
      hasGaps: gapAnalysis.hasGaps,
      missingSequences: gapAnalysis.missingSequences,
      newCursorSequence: this.lastServerSequence,
    };
  }

  getCursorSequence(): number {
    return this.lastServerSequence;
  }

  getLastPulledAt(): string | null {
    return this.lastPulledAt;
  }

  getConflictLogs(): SyncConflictLog[] {
    return [...this.conflictLogs];
  }
}
