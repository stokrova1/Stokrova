/**
 * Payments, Receipts & Financial Truth Domain Engine
 * Enforces separation of concerns (Order -> Invoice -> Payment -> Receipt)
 * and append-only financial ledger integrity.
 * Based on ARCHITECTURE.md, ADR-006, and Phase 1F specification.
 */

export const DomainPaymentMethods = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  STORE_CREDIT: 'STORE_CREDIT',
} as const;

export const DomainPaymentStatuses = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const DomainInvoiceStatuses = {
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export interface InvoiceBalanceResult {
  balanceDueMinor: bigint;
  status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID';
}

/**
 * Calculates current balance due and lifecycle status for an invoice.
 */
export function calculateInvoiceBalance(
  totalMinor: bigint,
  totalPaidMinor: bigint,
): InvoiceBalanceResult {
  if (totalPaidMinor >= totalMinor) {
    return {
      balanceDueMinor: 0n,
      status: DomainInvoiceStatuses.PAID,
    };
  }

  if (totalPaidMinor > 0n) {
    return {
      balanceDueMinor: totalMinor - totalPaidMinor,
      status: DomainInvoiceStatuses.PARTIALLY_PAID,
    };
  }

  return {
    balanceDueMinor: totalMinor,
    status: DomainInvoiceStatuses.ISSUED,
  };
}

/**
 * Evaluates whether a payment status transition is mathematically and operationally allowed.
 * e.g., PENDING -> CONFIRMED (Bank transfer verified)
 * CONFIRMED / CAPTURED -> REFUNDED
 */
export function canTransitionPaymentStatus(
  currentStatus: string,
  targetStatus: string,
): boolean {
  if (currentStatus === DomainPaymentStatuses.PENDING) {
    return (
      targetStatus === DomainPaymentStatuses.CONFIRMED ||
      targetStatus === DomainPaymentStatuses.CAPTURED ||
      targetStatus === DomainPaymentStatuses.FAILED
    );
  }

  if (currentStatus === DomainPaymentStatuses.CONFIRMED) {
    return (
      targetStatus === DomainPaymentStatuses.CAPTURED ||
      targetStatus === DomainPaymentStatuses.REFUNDED
    );
  }

  if (currentStatus === DomainPaymentStatuses.CAPTURED) {
    return targetStatus === DomainPaymentStatuses.REFUNDED;
  }

  return false;
}

/**
 * Verifies non-negativity and strictly positive payment amount.
 */
export function assertValidPaymentAmount(amountMinor: bigint): void {
  if (amountMinor <= 0n) {
    throw new Error(
      `Payment amount must be strictly positive (> 0). Received: ${amountMinor.toString()}`,
    );
  }
}

/**
 * Enforces that payment does not exceed remaining invoice balance due.
 */
export function assertNoOverpayment(
  paymentAmountMinor: bigint,
  balanceDueMinor: bigint,
  allowOverpayment = false,
): void {
  if (!allowOverpayment && paymentAmountMinor > balanceDueMinor) {
    throw new Error(
      `Payment amount ${paymentAmountMinor.toString()} exceeds remaining balance due ${balanceDueMinor.toString()}.`,
    );
  }
}

/**
 * Pure receipt audit tracker: generates next print count and reprint flag
 * without mutating financial state.
 */
export function calculateNextReceiptPrint(currentPrintCount = 0): {
  nextPrintCount: number;
  isReprint: boolean;
} {
  const nextCount = currentPrintCount + 1;
  return {
    nextPrintCount: nextCount,
    isReprint: nextCount > 1,
  };
}

// ---------------------------------------------------------------------------
// Split & Multi-Tender Payments Engine (Phase 3C)
// ---------------------------------------------------------------------------

export class PaymentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

export class NonCashOverTenderDomainError extends PaymentDomainError {
  constructor(tenderType: string, tenderedMinor: bigint, remainingBalanceMinor: bigint) {
    super(
      `Non-cash tender '${tenderType}' (${tenderedMinor.toString()}) cannot exceed remaining balance due (${remainingBalanceMinor.toString()}). Over-tendering to generate cash change is only permitted for CASH.`,
    );
    this.name = 'NonCashOverTenderDomainError';
  }
}

export class DuplicateTenderIdempotencyKeyError extends PaymentDomainError {
  constructor(key: string) {
    super(`Duplicate tender idempotency key detected: '${key}'.`);
    this.name = 'DuplicateTenderIdempotencyKeyError';
  }
}

export const DomainPaymentTenderTypes = {
  CASH: 'CASH',
  CARD: 'CARD',
  STORE_CREDIT: 'STORE_CREDIT',
  GIFT_CARD: 'GIFT_CARD',
  LOYALTY_POINTS: 'LOYALTY_POINTS',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;

export type DomainPaymentTenderTypeCode =
  (typeof DomainPaymentTenderTypes)[keyof typeof DomainPaymentTenderTypes];

export interface DomainPaymentTender {
  idempotency_key: string;
  tender_type: string;
  amount_minor: bigint;
  currency_code?: string;
  provider_reference?: string;
}

export interface DomainAllocatedTender {
  idempotency_key: string;
  tender_type: string;
  tendered_minor: bigint;
  allocated_minor: bigint;
  change_returned_minor: bigint;
}

export interface DomainMultiTenderCalculation {
  total_payable_minor: bigint;
  total_tendered_minor: bigint;
  total_allocated_minor: bigint;
  change_due_minor: bigint;
  remaining_balance_minor: bigint;
  is_fully_paid: boolean;
  allocated_tenders: DomainAllocatedTender[];
  cash_sale_total_minor: bigint;
}

/**
 * Deterministically evaluates split tenders, computes exact allocations and cash change,
 * and prevents non-cash over-tendering.
 */
export function calculateMultiTenderAllocation(
  totalPayableMinor: bigint,
  tenders: DomainPaymentTender[],
): DomainMultiTenderCalculation {
  if (totalPayableMinor < 0n) {
    throw new PaymentDomainError(
      `Total payable cannot be negative. Received: ${totalPayableMinor.toString()}`,
    );
  }

  // Verify unique idempotency keys
  const seenKeys = new Set<string>();
  for (const t of tenders) {
    if (seenKeys.has(t.idempotency_key)) {
      throw new DuplicateTenderIdempotencyKeyError(t.idempotency_key);
    }
    seenKeys.add(t.idempotency_key);
  }

  let remaining = totalPayableMinor;
  let totalTendered = 0n;
  let totalAllocated = 0n;
  let totalChange = 0n;
  let cashSaleTotal = 0n;
  const allocatedTenders: DomainAllocatedTender[] = [];

  for (const t of tenders) {
    if (t.amount_minor <= 0n) {
      throw new PaymentDomainError(
        `Tender amount must be strictly positive (> 0). Received: ${t.amount_minor.toString()}`,
      );
    }

    totalTendered += t.amount_minor;
    const isCash = t.tender_type === DomainPaymentTenderTypes.CASH;

    if (remaining === 0n) {
      // Order is already fully satisfied
      if (!isCash) {
        throw new NonCashOverTenderDomainError(t.tender_type, t.amount_minor, 0n);
      }
      allocatedTenders.push({
        idempotency_key: t.idempotency_key,
        tender_type: t.tender_type,
        tendered_minor: t.amount_minor,
        allocated_minor: 0n,
        change_returned_minor: t.amount_minor,
      });
      totalChange += t.amount_minor;
    } else if (t.amount_minor <= remaining) {
      // Tender partially or exactly satisfies remaining balance
      allocatedTenders.push({
        idempotency_key: t.idempotency_key,
        tender_type: t.tender_type,
        tendered_minor: t.amount_minor,
        allocated_minor: t.amount_minor,
        change_returned_minor: 0n,
      });
      totalAllocated += t.amount_minor;
      remaining -= t.amount_minor;
      if (isCash) {
        cashSaleTotal += t.amount_minor;
      }
    } else {
      // Tender exceeds remaining balance
      if (!isCash) {
        throw new NonCashOverTenderDomainError(t.tender_type, t.amount_minor, remaining);
      }
      const change = t.amount_minor - remaining;
      allocatedTenders.push({
        idempotency_key: t.idempotency_key,
        tender_type: t.tender_type,
        tendered_minor: t.amount_minor,
        allocated_minor: remaining,
        change_returned_minor: change,
      });
      totalAllocated += remaining;
      totalChange += change;
      cashSaleTotal += remaining; // Only the net portion is retained in drawer
      remaining = 0n;
    }
  }

  return {
    total_payable_minor: totalPayableMinor,
    total_tendered_minor: totalTendered,
    total_allocated_minor: totalAllocated,
    change_due_minor: totalChange,
    remaining_balance_minor: remaining,
    is_fully_paid: remaining === 0n,
    allocated_tenders: allocatedTenders,
    cash_sale_total_minor: cashSaleTotal,
  };
}
