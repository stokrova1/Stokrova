import type { SyncOperationEnvelope, SyncChangeItem, SyncOperationStatus } from '@stokrova/contracts';
import { canTransitionOutbox } from '@stokrova/domain';

export * from './types.js';
export * from './sqlite-schema.js';
export * from './outbox-orchestrator.js';
export * from './pull-engine.js';
export * from './heartbeat-manager.js';

export class SyncEngine {
  /**
   * Validates whether a client sequence is monotonic and contiguous.
   */
  static validateClientSequence(lastKnownSeq: number, incomingSeq: number): boolean {
    return incomingSeq === lastKnownSeq + 1;
  }

  /**
   * Sorts operations deterministically by client sequence.
   */
  static sortOperationsBySequence(operations: SyncOperationEnvelope[]): SyncOperationEnvelope[] {
    return [...operations].sort((a, b) => a.client_sequence - b.client_sequence);
  }

  /**
   * Evaluates if an outbox operation can transition to a target status.
   */
  static canTransition(
    current: SyncOperationStatus,
    target: SyncOperationStatus,
  ): boolean {
    return canTransitionOutbox(current, target);
  }

  /**
   * Filters changes strictly after a given sequence cursor.
   */
  static filterChangesAfterCursor(changes: SyncChangeItem[], cursor: number): SyncChangeItem[] {
    return changes.filter((c) => c.sequence > cursor);
  }
}
