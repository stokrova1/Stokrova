// ============================================================================
// STOKROVA — Multi-Entity Consolidation & Intercompany Domain Logic
// Benchmark: Oracle NetSuite OneWorld, SAP S/4HANA Group Reporting
// Rule 1, 2, 5, 18: Pure integer currency translation, double-entry elimination,
// zero float math, immutable auditability
// ============================================================================

export type ConsolidationRunStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'CONSOLIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUPERSEDED';

export type IntercompanyMatchStatus =
  | 'MATCHED'
  | 'PARTIAL'
  | 'UNMATCHED_DIFFERENCE';

/**
 * Translates an entity account balance into the group reporting currency
 * using pure integer arithmetic with rate expressed in basis points (10000 = 1.0000).
 */
export function translateBalanceToReportingCurrency(
  balanceMinor: string,
  rateBasisPoints: number,
): string {
  if (rateBasisPoints <= 0) {
    throw new Error('Exchange rate basis points must be strictly positive');
  }
  const balance = BigInt(balanceMinor);
  const rate = BigInt(rateBasisPoints);
  const translated = (balance * rate) / 10000n;
  return translated.toString();
}

/**
 * Validates consolidation run state machine transitions.
 */
export function assertValidConsolidationStatusTransition(
  currentStatus: ConsolidationRunStatus,
  targetStatus: ConsolidationRunStatus,
): void {
  const allowedTransitions: Record<ConsolidationRunStatus, ConsolidationRunStatus[]> = {
    DRAFT: ['VALIDATING', 'FAILED'],
    VALIDATING: ['READY', 'FAILED'],
    READY: ['CONSOLIDATING', 'DRAFT'],
    CONSOLIDATING: ['COMPLETED', 'FAILED'],
    COMPLETED: ['SUPERSEDED'],
    FAILED: ['DRAFT', 'VALIDATING'],
    SUPERSEDED: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid consolidation run status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}

/**
 * Enforces double-entry equilibrium for consolidation adjustments and eliminations.
 */
export function assertValidEliminationEntry(
  debitsTotalMinor: string,
  creditsTotalMinor: string,
): void {
  const debits = BigInt(debitsTotalMinor);
  const credits = BigInt(creditsTotalMinor);

  if (debits !== credits) {
    throw new Error(
      `Elimination entry is unbalanced: total debits (${debitsTotalMinor}) must equal total credits (${creditsTotalMinor})`,
    );
  }

  if (debits <= 0n) {
    throw new Error('Elimination entry total amount must be strictly positive');
  }
}

/**
 * Compares two intercompany transaction legs and computes the discrepancy and match status.
 */
export function calculateIntercompanyDiscrepancy(
  fromAmountMinor: string,
  toAmountMinor: string,
  toleranceMinor: string = '0',
): {
  discrepancy_minor: string;
  match_status: IntercompanyMatchStatus;
} {
  const fromAmt = BigInt(fromAmountMinor);
  const toAmt = BigInt(toAmountMinor);
  const tolerance = BigInt(toleranceMinor);

  const diff = fromAmt - toAmt;
  const absDiff = diff < 0n ? -diff : diff;

  if (diff === 0n) {
    return {
      discrepancy_minor: '0',
      match_status: 'MATCHED',
    };
  }

  if (absDiff <= tolerance) {
    return {
      discrepancy_minor: diff.toString(),
      match_status: 'PARTIAL',
    };
  }

  return {
    discrepancy_minor: diff.toString(),
    match_status: 'UNMATCHED_DIFFERENCE',
  };
}

/**
 * Identifies unmapped accounts from an entity that have active transactions.
 */
export function identifyUnmappedAccounts(
  sourceAccountCodes: string[],
  mappedAccountCodes: Set<string>,
): string[] {
  return sourceAccountCodes.filter((code) => !mappedAccountCodes.has(code));
}

/**
 * Sums translated entity balances and applies elimination minor units.
 */
export function calculateConsolidatedLineTotal(
  entityBalancesMinor: string[],
  eliminationMinor: string = '0',
): string {
  let gross = 0n;
  for (const bal of entityBalancesMinor) {
    gross += BigInt(bal);
  }
  const net = gross - BigInt(eliminationMinor);
  return net.toString();
}
