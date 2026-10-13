/**
 * Multi-Channel Sales Orders & Fulfillment Domain Engine
 * Zero-dependency pure domain logic enforcing deterministic state machine transitions,
 * integer line-item math, and fulfillment status calculations.
 * Benchmarked against Odoo, ERPNext, and OpenBoxes (Rule 26).
 */

export class OrderDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderDomainError';
  }
}

export class InvalidOrderStateTransitionError extends OrderDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition Sales Order from '${fromStatus}' to '${toStatus}'.`);
    this.name = 'InvalidOrderStateTransitionError';
  }
}

export class OverFulfillmentDomainError extends OrderDomainError {
  constructor(orderedQty: number, alreadyFulfilled: number, attemptingToFulfill: number) {
    super(
      `Cannot fulfill ${attemptingToFulfill} units. Ordered: ${orderedQty}, Already fulfilled: ${alreadyFulfilled}, Max fulfillable: ${orderedQty - alreadyFulfilled}.`,
    );
    this.name = 'OverFulfillmentDomainError';
  }
}

export const SalesOrderStatuses = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  RESERVED: 'RESERVED',
  PICKING: 'PICKING',
  PACKING: 'PACKING',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type SalesOrderStatusCode =
  (typeof SalesOrderStatuses)[keyof typeof SalesOrderStatuses];

export const OrderFulfillmentStatuses = {
  UNFULFILLED: 'UNFULFILLED',
  PARTIALLY_FULFILLED: 'PARTIALLY_FULFILLED',
  FULFILLED: 'FULFILLED',
} as const;

export type OrderFulfillmentStatusCode =
  (typeof OrderFulfillmentStatuses)[keyof typeof OrderFulfillmentStatuses];

export interface DomainOrderLineInput {
  quantity: number;
  unit_price_minor: bigint;
  discount_minor?: bigint;
  tax_minor?: bigint;
}

export interface DomainOrderLineTotals {
  quantity: number;
  unit_price_minor: bigint;
  subtotal_minor: bigint;
  discount_minor: bigint;
  tax_minor: bigint;
  line_total_minor: bigint;
}

export interface DomainOrderSummary {
  subtotal_minor: bigint;
  total_discount_minor: bigint;
  total_tax_minor: bigint;
  grand_total_minor: bigint;
}

/**
 * Validates legal sales order state transitions.
 */
export function canTransitionSalesOrderStatus(
  currentStatus: string,
  targetStatus: string,
): boolean {
  if (currentStatus === SalesOrderStatuses.DRAFT) {
    return (
      targetStatus === SalesOrderStatuses.CONFIRMED ||
      targetStatus === SalesOrderStatuses.CANCELLED
    );
  }
  if (currentStatus === SalesOrderStatuses.CONFIRMED) {
    return (
      targetStatus === SalesOrderStatuses.RESERVED ||
      targetStatus === SalesOrderStatuses.PICKING ||
      targetStatus === SalesOrderStatuses.DISPATCHED ||
      targetStatus === SalesOrderStatuses.CANCELLED
    );
  }
  if (currentStatus === SalesOrderStatuses.RESERVED) {
    return (
      targetStatus === SalesOrderStatuses.PICKING ||
      targetStatus === SalesOrderStatuses.DISPATCHED ||
      targetStatus === SalesOrderStatuses.CANCELLED
    );
  }
  if (currentStatus === SalesOrderStatuses.PICKING) {
    return (
      targetStatus === SalesOrderStatuses.PACKING ||
      targetStatus === SalesOrderStatuses.DISPATCHED ||
      targetStatus === SalesOrderStatuses.CANCELLED
    );
  }
  if (currentStatus === SalesOrderStatuses.PACKING) {
    return (
      targetStatus === SalesOrderStatuses.DISPATCHED ||
      targetStatus === SalesOrderStatuses.CANCELLED
    );
  }
  if (currentStatus === SalesOrderStatuses.DISPATCHED) {
    return targetStatus === SalesOrderStatuses.DELIVERED;
  }
  return false;
}

/**
 * Computes deterministic integer line item totals.
 */
export function calculateOrderLineTotals(
  input: DomainOrderLineInput,
): DomainOrderLineTotals {
  if (input.quantity <= 0) {
    throw new OrderDomainError(
      `Line quantity must be strictly positive (> 0). Received: ${input.quantity}`,
    );
  }
  if (input.unit_price_minor < 0n) {
    throw new OrderDomainError(
      `Unit price cannot be negative. Received: ${input.unit_price_minor.toString()}`,
    );
  }

  const subtotal = input.unit_price_minor * BigInt(input.quantity);
  const discount = input.discount_minor ?? 0n;
  const tax = input.tax_minor ?? 0n;

  if (discount > subtotal) {
    throw new OrderDomainError(
      `Discount (${discount.toString()}) cannot exceed subtotal (${subtotal.toString()}).`,
    );
  }

  const lineTotal = subtotal - discount + tax;

  return {
    quantity: input.quantity,
    unit_price_minor: input.unit_price_minor,
    subtotal_minor: subtotal,
    discount_minor: discount,
    tax_minor: tax,
    line_total_minor: lineTotal,
  };
}

/**
 * Aggregates all line item totals into overall order summary.
 */
export function calculateOrderSummary(
  lines: DomainOrderLineTotals[],
): DomainOrderSummary {
  let subtotal = 0n;
  let totalDiscount = 0n;
  let totalTax = 0n;
  let grandTotal = 0n;

  for (const l of lines) {
    subtotal += l.subtotal_minor;
    totalDiscount += l.discount_minor;
    totalTax += l.tax_minor;
    grandTotal += l.line_total_minor;
  }

  return {
    subtotal_minor: subtotal,
    total_discount_minor: totalDiscount,
    total_tax_minor: totalTax,
    grand_total_minor: grandTotal,
  };
}

/**
 * Enforces line fulfillment constraints.
 */
export function assertValidLineFulfillment(
  orderedQty: number,
  currentFulfilledQty: number,
  toFulfillQty: number,
): void {
  if (toFulfillQty <= 0) {
    throw new OrderDomainError(
      `Quantity to fulfill must be strictly positive (> 0). Received: ${toFulfillQty}`,
    );
  }
  if (currentFulfilledQty + toFulfillQty > orderedQty) {
    throw new OverFulfillmentDomainError(orderedQty, currentFulfilledQty, toFulfillQty);
  }
}

/**
 * Evaluates holistic fulfillment status for the entire sales order.
 */
export function evaluateOrderFulfillmentStatus(
  lines: { quantity: number; fulfilled_quantity: number }[],
): OrderFulfillmentStatusCode {
  if (lines.length === 0) {
    return OrderFulfillmentStatuses.UNFULFILLED;
  }

  let allFulfilled = true;
  let anyFulfilled = false;

  for (const l of lines) {
    if (l.fulfilled_quantity > 0) {
      anyFulfilled = true;
    }
    if (l.fulfilled_quantity < l.quantity) {
      allFulfilled = false;
    }
  }

  if (allFulfilled) {
    return OrderFulfillmentStatuses.FULFILLED;
  }
  if (anyFulfilled) {
    return OrderFulfillmentStatuses.PARTIALLY_FULFILLED;
  }
  return OrderFulfillmentStatuses.UNFULFILLED;
}
