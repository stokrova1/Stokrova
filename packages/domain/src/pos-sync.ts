/**
 * Offline POS Synchronization & Conflict Resolution Domain Engine (Phase 3E)
 * Pure domain logic with zero external dependencies.
 * Benchmarked against TetherPOS, QuickStock Sync, Odoo POS, and ERPNext (Rule 26).
 *
 * Guarantees:
 * - Rule 8: Never allow payment retries to duplicate payments
 * - Rule 10: Never use global last-write-wins for business-critical conflicts
 * - Rule 19: Always make critical commands idempotent
 * - Rule 24: Always make offline behavior explicit
 */

export class PosSyncDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PosSyncDomainError';
  }
}

export class PosSyncSequenceGapError extends PosSyncDomainError {
  constructor(deviceId: string, expectedSeq: number, receivedSeq: number) {
    super(
      `Sequence gap detected for device '${deviceId}'. Expected sequence ${expectedSeq}, but received ${receivedSeq}.`,
    );
    this.name = 'PosSyncSequenceGapError';
  }
}

export interface SequenceValidationResult {
  isContiguous: boolean;
  isGap: boolean;
  isDuplicateOrRegressed: boolean;
}

/**
 * Validates device sequence progression deterministically.
 */
export function validatePosSyncSequence(
  lastKnownSeq: number,
  incomingSeq: number,
): SequenceValidationResult {
  if (incomingSeq === lastKnownSeq + 1) {
    return {
      isContiguous: true,
      isGap: false,
      isDuplicateOrRegressed: false,
    };
  }

  if (incomingSeq > lastKnownSeq + 1) {
    return {
      isContiguous: false,
      isGap: true,
      isDuplicateOrRegressed: false,
    };
  }

  return {
    isContiguous: false,
    isGap: false,
    isDuplicateOrRegressed: true,
  };
}

/**
 * Immutably updates a distributed vector clock for device causality.
 */
export function advanceVectorClock(
  currentClock: Record<string, number>,
  deviceId: string,
  seq: number,
): Record<string, number> {
  const currentVal = currentClock[deviceId] ?? 0;
  return {
    ...currentClock,
    [deviceId]: Math.max(currentVal, seq),
  };
}

export interface OfflineStockReconciliationResult {
  canDirectDebit: boolean;
  fulfillableQty: number;
  discrepancyQty: number;
  resolutionStatus: 'PROCESSED' | 'CONFLICT_RECONCILED';
  reconciliationNote: string | null;
}

/**
 * Evaluates physical stock reconciliation for an offline sale.
 * In physical retail, goods are physically given to the customer during offline till checkout.
 * Under Rule 7, 10, 11, and 24:
 * We never destroy financial truth or cancel an offline sale. If server on-hand is insufficient,
 * we flag a reconciliation discrepancy entry and record the financial order authoritatively.
 */
export function evaluateOfflineInventoryReconciliation(
  onHandQty: number,
  requestedQty: number,
): OfflineStockReconciliationResult {
  if (requestedQty <= 0) {
    throw new PosSyncDomainError(
      `Requested quantity must be positive. Received: ${requestedQty}`,
    );
  }

  if (onHandQty >= requestedQty) {
    return {
      canDirectDebit: true,
      fulfillableQty: requestedQty,
      discrepancyQty: 0,
      resolutionStatus: 'PROCESSED',
      reconciliationNote: null,
    };
  }

  const available = Math.max(0, onHandQty);
  const discrepancy = requestedQty - available;

  return {
    canDirectDebit: false,
    fulfillableQty: available,
    discrepancyQty: discrepancy,
    resolutionStatus: 'CONFLICT_RECONCILED',
    reconciliationNote: `Physical inventory deficit of ${discrepancy} units incurred while device was offline. Reconciled via inventory adjustment ledger.`,
  };
}

export interface BatchSummaryCounts {
  total_submitted: number;
  processed_count: number;
  duplicate_count: number;
  conflict_count: number;
  rejected_count: number;
}

/**
 * Summarizes batch resolution counts deterministically.
 */
export function calculateBatchSummary(
  resolutions: { status: 'PROCESSED' | 'IDEMPOTENT_DUPLICATE' | 'CONFLICT_RECONCILED' | 'REJECTED' }[],
): BatchSummaryCounts {
  let processed = 0;
  let duplicate = 0;
  let conflict = 0;
  let rejected = 0;

  for (const r of resolutions) {
    switch (r.status) {
      case 'PROCESSED':
        processed++;
        break;
      case 'IDEMPOTENT_DUPLICATE':
        duplicate++;
        break;
      case 'CONFLICT_RECONCILED':
        conflict++;
        break;
      case 'REJECTED':
        rejected++;
        break;
    }
  }

  return {
    total_submitted: resolutions.length,
    processed_count: processed,
    duplicate_count: duplicate,
    conflict_count: conflict,
    rejected_count: rejected,
  };
}
