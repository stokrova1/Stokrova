/**
 * Register & Till Balancing Domain Engine
 * Enforces financial invariants, double-entry cash ledger balance, and blind closing reconciliation.
 * Based on ARCHITECTURE.md, ADR-014, and Phase 1C specification.
 */

export const CashMovementTypes = {
  OPENING_FLOAT: 'OPENING_FLOAT',
  CASH_SALE: 'CASH_SALE',
  CASH_REFUND: 'CASH_REFUND',
  CASH_IN: 'CASH_IN',
  CASH_OUT: 'CASH_OUT',
} as const;

export type CashMovementTypeCode =
  (typeof CashMovementTypes)[keyof typeof CashMovementTypes];

export const RegisterSessionStatuses = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  RECONCILED: 'RECONCILED',
} as const;

export type RegisterSessionStatusCode =
  (typeof RegisterSessionStatuses)[keyof typeof RegisterSessionStatuses];

export interface CashMovementEntry {
  movement_type: string;
  amount_minor: bigint;
}

export interface TillCashSummary {
  opening_float_minor: bigint;
  total_cash_sales_minor: bigint;
  total_cash_refunds_minor: bigint;
  total_cash_in_minor: bigint;
  total_cash_out_minor: bigint;
  expected_closing_minor: bigint;
}

/**
 * Summarizes till cash operations and calculates the mathematically expected closing cash.
 * Formula: Expected = Opening Float + Cash Sales + Cash In - Cash Refunds - Cash Out
 * Note: If an 'OPENING_FLOAT' movement exists in the movements list, it is not double-counted.
 */
export function calculateTillSummary(
  openingFloatMinor: bigint,
  movements: CashMovementEntry[],
): TillCashSummary {
  let totalSales = 0n;
  let totalRefunds = 0n;
  let totalCashIn = 0n;
  let totalCashOut = 0n;

  for (const m of movements) {
    switch (m.movement_type) {
      case CashMovementTypes.CASH_SALE:
        totalSales += m.amount_minor;
        break;
      case CashMovementTypes.CASH_REFUND:
        totalRefunds += m.amount_minor;
        break;
      case CashMovementTypes.CASH_IN:
        totalCashIn += m.amount_minor;
        break;
      case CashMovementTypes.CASH_OUT:
        totalCashOut += m.amount_minor;
        break;
      case CashMovementTypes.OPENING_FLOAT:
        // Already captured by openingFloatMinor baseline
        break;
      default:
        // Unrecognized movement types are ignored in cash calculation
        break;
    }
  }

  const expectedClosing =
    openingFloatMinor + totalSales + totalCashIn - totalRefunds - totalCashOut;

  return {
    opening_float_minor: openingFloatMinor,
    total_cash_sales_minor: totalSales,
    total_cash_refunds_minor: totalRefunds,
    total_cash_in_minor: totalCashIn,
    total_cash_out_minor: totalCashOut,
    expected_closing_minor: expectedClosing,
  };
}

/**
 * Calculates variance between the actual blind counted cash and expected closing cash.
 * Formula: Variance = Actual Count - Expected
 * > 0: Surplus / Overage
 * < 0: Shortage / Short
 * = 0: Balanced
 */
export function calculateTillVarianceMinor(
  actualClosingMinor: bigint,
  expectedClosingMinor: bigint,
): bigint {
  return actualClosingMinor - expectedClosingMinor;
}

/**
 * Evaluates whether a session status transition is allowed.
 * OPEN -> CLOSED
 * CLOSED -> RECONCILED
 */
export function canTransitionRegisterSessionStatus(
  currentStatus: string,
  targetStatus: string,
): boolean {
  if (currentStatus === RegisterSessionStatuses.OPEN && targetStatus === RegisterSessionStatuses.CLOSED) {
    return true;
  }
  if (currentStatus === RegisterSessionStatuses.CLOSED && targetStatus === RegisterSessionStatuses.RECONCILED) {
    return true;
  }
  return false;
}

/**
 * Domain Invariant Assertions
 */
export function assertSessionIsOpen(sessionStatus: string): void {
  if (sessionStatus !== RegisterSessionStatuses.OPEN) {
    throw new Error(
      `Cannot execute cash operations on session with status '${sessionStatus}'. Session must be OPEN.`,
    );
  }
}

export function assertCanOpenSession(hasActiveSession: boolean): void {
  if (hasActiveSession) {
    throw new Error('Register already has an active OPEN session. Close it before opening a new session.');
  }
}

export function assertNonNegativeMinor(amountMinor: bigint, fieldName = 'Amount'): void {
  if (amountMinor < 0n) {
    throw new Error(`${fieldName} cannot be negative. Received: ${amountMinor.toString()}`);
  }
}

export function assertPositiveMinor(amountMinor: bigint, fieldName = 'Amount'): void {
  if (amountMinor <= 0n) {
    throw new Error(`${fieldName} must be strictly positive (> 0). Received: ${amountMinor.toString()}`);
  }
}
