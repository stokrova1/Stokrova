/**
 * POS Session & Till Balancing Domain Engine
 * Zero-dependency domain model enforcing financial invariants, denomination tally checks,
 * drawer underflow prevention, and supervisor variance thresholds.
 * Benchmarked against TetherPOS, Odoo, and ERPNext (Rule 26).
 */

export class PosDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PosDomainError';
  }
}

export class PosSessionInvalidStateTransitionError extends PosDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition POS session from '${fromStatus}' to '${toStatus}'.`);
    this.name = 'PosSessionInvalidStateTransitionError';
  }
}

export class PosSessionAlreadyActiveError extends PosDomainError {
  constructor(registerId: string) {
    super(`POS Register '${registerId}' already has an active open session.`);
    this.name = 'PosSessionAlreadyActiveError';
  }
}

export class InsufficientTillCashDomainError extends PosDomainError {
  constructor(availableMinor: bigint, requestedMinor: bigint, operation: string) {
    super(
      `Insufficient cash in till drawer for ${operation}. Available: ${availableMinor.toString()}, Requested: ${requestedMinor.toString()}.`,
    );
    this.name = 'InsufficientTillCashDomainError';
  }
}

export class DenominationTallyMismatchError extends PosDomainError {
  constructor(calculatedMinor: bigint, declaredMinor: bigint) {
    super(
      `Denomination breakdown sum (${calculatedMinor.toString()}) does not match declared total (${declaredMinor.toString()}).`,
    );
    this.name = 'DenominationTallyMismatchError';
  }
}

export class SupervisorOverrideRequiredError extends PosDomainError {
  constructor(varianceMinor: bigint, maxVarianceMinor: bigint) {
    super(
      `Till variance (${varianceMinor.toString()}) exceeds allowed threshold (${maxVarianceMinor.toString()}). Supervisor override required.`,
    );
    this.name = 'SupervisorOverrideRequiredError';
  }
}

export const PosSessionStatuses = {
  OPEN: 'OPEN',
  SUSPENDED: 'SUSPENDED',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
  RECONCILED: 'RECONCILED',
} as const;

export type PosSessionStatusCode =
  (typeof PosSessionStatuses)[keyof typeof PosSessionStatuses];

export const PosCashMovementTypes = {
  OPENING_FLOAT: 'OPENING_FLOAT',
  CASH_SALE: 'CASH_SALE',
  CASH_REFUND: 'CASH_REFUND',
  CASH_IN: 'CASH_IN',
  CASH_OUT: 'CASH_OUT',
  CASH_DROP: 'CASH_DROP',
} as const;

export type PosCashMovementTypeCode =
  (typeof PosCashMovementTypes)[keyof typeof PosCashMovementTypes];

export interface DomainCashDenomination {
  denomination_minor: bigint;
  count: number;
}

export interface DomainPosCashMovement {
  movement_type: string;
  amount_minor: bigint;
}

export interface DomainPosTillSummary {
  opening_float_minor: bigint;
  total_cash_sales_minor: bigint;
  total_cash_refunds_minor: bigint;
  total_cash_in_minor: bigint;
  total_cash_out_minor: bigint;
  total_cash_drops_minor: bigint;
  current_drawer_balance_minor: bigint;
  expected_closing_minor: bigint;
}

export interface DomainTillVarianceResult {
  variance_minor: bigint;
  variance_category: 'BALANCED' | 'SURPLUS' | 'DEFICIT';
}

/**
 * Validates denomination breakdown tally against declared total.
 * Sum = Sum(denomination_minor * count)
 */
export function verifyDenominationsTally(
  denominations: DomainCashDenomination[],
  declaredTotalMinor: bigint,
): void {
  let tally = 0n;
  for (const d of denominations) {
    if (d.denomination_minor <= 0n) {
      throw new PosDomainError(
        `Denomination value must be strictly positive (> 0). Received: ${d.denomination_minor.toString()}`,
      );
    }
    if (d.count < 0) {
      throw new PosDomainError(`Denomination count cannot be negative. Received: ${d.count}`);
    }
    tally += d.denomination_minor * BigInt(d.count);
  }

  if (tally !== declaredTotalMinor) {
    throw new DenominationTallyMismatchError(tally, declaredTotalMinor);
  }
}

/**
 * Calculates current till drawer cash and comprehensive cash summary.
 * Formula:
 * Balance = Opening Float + Cash Sales - Cash Refunds + Cash In - Cash Out - Cash Drops
 */
export function calculatePosTillSummary(
  openingFloatMinor: bigint,
  movements: DomainPosCashMovement[],
): DomainPosTillSummary {
  let totalCashSales = 0n;
  let totalCashRefunds = 0n;
  let totalCashIn = 0n;
  let totalCashOut = 0n;
  let totalCashDrops = 0n;

  for (const m of movements) {
    switch (m.movement_type) {
      case PosCashMovementTypes.CASH_SALE:
        totalCashSales += m.amount_minor;
        break;
      case PosCashMovementTypes.CASH_REFUND:
        totalCashRefunds += m.amount_minor;
        break;
      case PosCashMovementTypes.CASH_IN:
        totalCashIn += m.amount_minor;
        break;
      case PosCashMovementTypes.CASH_OUT:
        totalCashOut += m.amount_minor;
        break;
      case PosCashMovementTypes.CASH_DROP:
        totalCashDrops += m.amount_minor;
        break;
      case PosCashMovementTypes.OPENING_FLOAT:
        // Captured by openingFloatMinor
        break;
      default:
        break;
    }
  }

  const netBalance =
    openingFloatMinor +
    totalCashSales -
    totalCashRefunds +
    totalCashIn -
    totalCashOut -
    totalCashDrops;

  return {
    opening_float_minor: openingFloatMinor,
    total_cash_sales_minor: totalCashSales,
    total_cash_refunds_minor: totalCashRefunds,
    total_cash_in_minor: totalCashIn,
    total_cash_out_minor: totalCashOut,
    total_cash_drops_minor: totalCashDrops,
    current_drawer_balance_minor: netBalance,
    expected_closing_minor: netBalance,
  };
}

/**
 * Invariant: Cashier cannot withdraw more cash than actually present in the drawer.
 */
export function assertSufficientDrawerCash(
  currentDrawerBalance: bigint,
  requestedDeductionMinor: bigint,
  operation: string,
): void {
  if (requestedDeductionMinor <= 0n) {
    throw new PosDomainError(
      `${operation} amount must be strictly positive (> 0). Received: ${requestedDeductionMinor.toString()}`,
    );
  }
  if (requestedDeductionMinor > currentDrawerBalance) {
    throw new InsufficientTillCashDomainError(
      currentDrawerBalance,
      requestedDeductionMinor,
      operation,
    );
  }
}

/**
 * Evaluates variance between actual blind count and expected till balance.
 */
export function evaluateTillVariance(
  actualCountMinor: bigint,
  expectedClosingMinor: bigint,
): DomainTillVarianceResult {
  const variance = actualCountMinor - expectedClosingMinor;

  let category: 'BALANCED' | 'SURPLUS' | 'DEFICIT' = 'BALANCED';
  if (variance > 0n) {
    category = 'SURPLUS';
  } else if (variance < 0n) {
    category = 'DEFICIT';
  }

  return {
    variance_minor: variance,
    variance_category: category,
  };
}

/**
 * Enforces supervisor override policy when till variance exceeds configured threshold.
 */
export function evaluateSupervisorOverrideRequirement(
  actualVarianceMinor: bigint,
  maxAllowedVarianceMinor: bigint,
  hasSupervisorApproval: boolean,
): void {
  const absoluteVariance = actualVarianceMinor < 0n ? -actualVarianceMinor : actualVarianceMinor;
  if (absoluteVariance > maxAllowedVarianceMinor && !hasSupervisorApproval) {
    throw new SupervisorOverrideRequiredError(actualVarianceMinor, maxAllowedVarianceMinor);
  }
}

/**
 * Validates legal state transitions for a POS session.
 */
export function canTransitionPosSessionStatus(
  currentStatus: string,
  targetStatus: string,
): boolean {
  if (currentStatus === PosSessionStatuses.OPEN) {
    return (
      targetStatus === PosSessionStatuses.SUSPENDED ||
      targetStatus === PosSessionStatuses.CLOSING ||
      targetStatus === PosSessionStatuses.CLOSED
    );
  }
  if (currentStatus === PosSessionStatuses.SUSPENDED) {
    return (
      targetStatus === PosSessionStatuses.OPEN ||
      targetStatus === PosSessionStatuses.CLOSING ||
      targetStatus === PosSessionStatuses.CLOSED
    );
  }
  if (currentStatus === PosSessionStatuses.CLOSING) {
    return targetStatus === PosSessionStatuses.CLOSED;
  }
  if (currentStatus === PosSessionStatuses.CLOSED) {
    return targetStatus === PosSessionStatuses.RECONCILED;
  }
  return false;
}
