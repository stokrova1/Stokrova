// ============================================================================
// STOKROVA — Advanced Treasury Domain Logic & Invariants
// Benchmark: Kyriba, GTreasury, SAP Treasury Management
// Rule 6, 8, 19: Pure integer minor arithmetic, cash transfer lifecycles, dual approval
// ============================================================================

export type CashTransferStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'INITIATED'
  | 'SETTLED'
  | 'REJECTED'
  | 'CANCELLED';

/**
 * Validates cash transfer state machine transitions and dual approval governance.
 */
export function assertValidCashTransferTransition(
  currentStatus: CashTransferStatus,
  targetStatus: CashTransferStatus,
  requiresDualApproval: boolean = false,
  isDualApproved: boolean = false,
): void {
  const allowedTransitions: Record<CashTransferStatus, CashTransferStatus[]> = {
    DRAFT: ['AWAITING_APPROVAL', 'CANCELLED'],
    AWAITING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['INITIATED', 'CANCELLED'],
    INITIATED: ['SETTLED', 'CANCELLED'],
    SETTLED: [],
    REJECTED: ['DRAFT'],
    CANCELLED: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid cash transfer status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }

  // Dual approval check when moving to APPROVED
  if (targetStatus === 'APPROVED' && requiresDualApproval && !isDualApproved) {
    throw new Error(
      'Cash transfer requires dual authorization before it can be marked APPROVED',
    );
  }
}

/**
 * Computes group or company aggregated cash position from individual bank balances.
 */
export function calculateCashPosition(bankBalancesMinor: string[]): string {
  let total = 0n;
  for (const bal of bankBalancesMinor) {
    total += BigInt(bal);
  }
  return total.toString();
}

/**
 * Computes deterministic cash flow forecast over a specified projection horizon.
 */
export function calculateCashForecast(
  openingCashMinor: string,
  inflowsMinor: string[],
  outflowsMinor: string[],
): {
  opening_cash_minor: string;
  total_inflows_minor: string;
  total_outflows_minor: string;
  projected_closing_minor: string;
  net_change_minor: string;
} {
  const opening = BigInt(openingCashMinor);

  let totalInflows = 0n;
  for (const inf of inflowsMinor) {
    totalInflows += BigInt(inf);
  }

  let totalOutflows = 0n;
  for (const out of outflowsMinor) {
    totalOutflows += BigInt(out);
  }

  const netChange = totalInflows - totalOutflows;
  const projectedClosing = opening + netChange;

  return {
    opening_cash_minor: openingCashMinor,
    total_inflows_minor: totalInflows.toString(),
    total_outflows_minor: totalOutflows.toString(),
    projected_closing_minor: projectedClosing.toString(),
    net_change_minor: netChange.toString(),
  };
}

/**
 * Validates bank transaction amount and integrity.
 */
export function assertValidBankTransactionImport(
  amountMinor: string,
  transactionDate: string,
): void {
  const amt = BigInt(amountMinor);
  if (amt === 0n) {
    throw new Error('Bank transaction amount cannot be zero');
  }

  const date = new Date(transactionDate);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid bank transaction date format');
  }
}
