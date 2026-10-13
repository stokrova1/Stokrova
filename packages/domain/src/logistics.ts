// ============================================================================
// STOKROVA — Advanced Logistics, Fulfillment & Distribution Domain Engine (Phase 10)
// Benchmark: SAP TM, Manhattan TMS, Odoo 18 Shipping, Flexport
// Rule 22: Decoupled pure domain logic with zero external runtime dependencies
// Rule 26: Pure integer minor units, basis points, zero floats
// ============================================================================

export type DomainFulfillmentStatus =
  | 'PLANNED'
  | 'ALLOCATED'
  | 'PACKING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'HOLD'
  | 'CANCELLED';

export type DomainShipmentStatus =
  | 'DRAFT'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT'
  | 'EXCEPTION'
  | 'RETURNED_TO_ORIGIN'
  | 'CANCELLED';

export type DomainLogisticsChargeType =
  | 'CARRIER_FREIGHT'
  | 'FUEL_SURCHARGE'
  | 'HANDLING_FEE'
  | 'CUSTOMER_DELIVERY_FEE';

export type DomainLogisticsChargeProvenance =
  | 'ESTIMATED'
  | 'QUOTED'
  | 'CONFIRMED_ACTUAL';

export type DomainDeliveryAttemptOutcome =
  | 'DELIVERED'
  | 'CUSTOMER_UNAVAILABLE'
  | 'INCORRECT_ADDRESS'
  | 'ACCESS_RESTRICTED'
  | 'REJECTED'
  | 'DAMAGED'
  | 'RESCHEDULED';

export class LogisticsDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LogisticsDomainError';
  }
}

// ----------------------------------------------------------------------------
// 1. Shipment State Machine Transitions
// ----------------------------------------------------------------------------

const VALID_SHIPMENT_TRANSITIONS: Record<
  DomainShipmentStatus,
  readonly DomainShipmentStatus[]
> = {
  DRAFT: ['READY_FOR_DISPATCH', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DISPATCH: ['DISPATCHED', 'OUT_FOR_DELIVERY', 'DRAFT', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED_TO_ORIGIN'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'EXCEPTION', 'RETURNED_TO_ORIGIN', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_ATTEMPT', 'EXCEPTION', 'RETURNED_TO_ORIGIN'],
  FAILED_ATTEMPT: ['OUT_FOR_DELIVERY', 'EXCEPTION', 'RETURNED_TO_ORIGIN'],
  EXCEPTION: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RETURNED_TO_ORIGIN'],
  RETURNED_TO_ORIGIN: [],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Validates legal shipment lifecycle progression.
 * Enforces that once dispatched, a shipment cannot be cancelled.
 */
export function assertShipmentTransition(
  from: DomainShipmentStatus,
  to: DomainShipmentStatus,
): void {
  if (from === to) return;

  const allowed = VALID_SHIPMENT_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    if (from === 'DISPATCHED' && to === 'CANCELLED') {
      throw new LogisticsDomainError(
        'CANNOT_CANCEL_DISPATCHED_SHIPMENT',
        `Shipment has already been physically dispatched and cannot be cancelled. Initiate return to origin instead.`,
      );
    }
    throw new LogisticsDomainError(
      'INVALID_SHIPMENT_TRANSITION',
      `Illegal shipment state transition from '${from}' to '${to}'.`,
    );
  }
}

// ----------------------------------------------------------------------------
// 2. Fulfillment State Machine Transitions
// ----------------------------------------------------------------------------

const VALID_FULFILLMENT_TRANSITIONS: Record<
  DomainFulfillmentStatus,
  readonly DomainFulfillmentStatus[]
> = {
  PLANNED: ['ALLOCATED', 'PACKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'HOLD', 'CANCELLED'],
  ALLOCATED: ['PACKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'HOLD', 'CANCELLED'],
  PACKING: ['READY_FOR_DISPATCH', 'DISPATCHED', 'HOLD', 'CANCELLED'],
  READY_FOR_DISPATCH: ['DISPATCHED', 'HOLD', 'CANCELLED'],
  DISPATCHED: ['COMPLETED', 'HOLD'],
  HOLD: ['PLANNED', 'ALLOCATED', 'PACKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertFulfillmentTransition(
  from: DomainFulfillmentStatus,
  to: DomainFulfillmentStatus,
): void {
  if (from === to) return;

  const allowed = VALID_FULFILLMENT_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new LogisticsDomainError(
      'INVALID_FULFILLMENT_TRANSITION',
      `Illegal fulfillment state transition from '${from}' to '${to}'.`,
    );
  }
}

// ----------------------------------------------------------------------------
// 3. Fulfillment Quantity & Allocation Invariants
// ----------------------------------------------------------------------------

export interface OrderLineQuantity {
  id: string;
  quantity: number;
}

export interface FulfillmentLineQuantity {
  order_line_id: string;
  quantity: number;
}

/**
 * Validates that fulfillment item quantities do not exceed remaining unfulfilled order line quantities.
 */
export function validateFulfillmentQuantities(
  orderLines: OrderLineQuantity[],
  fulfillmentItems: FulfillmentLineQuantity[],
): void {
  const orderLineMap = new Map<string, number>();
  for (const ol of orderLines) {
    orderLineMap.set(ol.id, ol.quantity);
  }

  const requestedTotals = new Map<string, number>();
  for (const item of fulfillmentItems) {
    if (item.quantity <= 0) {
      throw new LogisticsDomainError(
        'INVALID_QUANTITY',
        `Fulfillment quantity must be greater than zero. Received: ${item.quantity}.`,
      );
    }
    const current = requestedTotals.get(item.order_line_id) ?? 0;
    requestedTotals.set(item.order_line_id, current + item.quantity);
  }

  for (const [orderLineId, reqQty] of requestedTotals.entries()) {
    const availableQty = orderLineMap.get(orderLineId);
    if (availableQty === undefined) {
      throw new LogisticsDomainError(
        'ORDER_LINE_NOT_FOUND',
        `Order line '${orderLineId}' does not exist on the specified sales order.`,
      );
    }
    if (reqQty > availableQty) {
      throw new LogisticsDomainError(
        'EXCEEDS_ORDERED_QUANTITY',
        `Requested fulfillment quantity ${reqQty} exceeds available order line quantity ${availableQty} for line '${orderLineId}'.`,
      );
    }
  }
}

// ----------------------------------------------------------------------------
// 4. Delivery Reconciliation (Partial vs Full Delivery)
// ----------------------------------------------------------------------------

export interface DeliveryReconciliationResult {
  isFullyDelivered: boolean;
  remainingQuantity: number;
  deliveryRatioBp: number; // basis points (10000 = 100.00%)
}

/**
 * Reconciles delivered quantities against original order quantities.
 * Pure integer arithmetic.
 */
export function reconcileDeliveredQuantities(
  orderTotalQuantity: number,
  previouslyDeliveredQuantity: number,
  currentDeliveredQuantity: number,
): DeliveryReconciliationResult {
  if (orderTotalQuantity <= 0) {
    return {
      isFullyDelivered: true,
      remainingQuantity: 0,
      deliveryRatioBp: 10000,
    };
  }

  const totalDelivered = previouslyDeliveredQuantity + currentDeliveredQuantity;
  const remaining = Math.max(0, orderTotalQuantity - totalDelivered);
  const deliveryRatioBp = Math.min(
    10000,
    Math.floor((totalDelivered * 10000) / orderTotalQuantity),
  );

  return {
    isFullyDelivered: totalDelivered >= orderTotalQuantity,
    remainingQuantity: remaining,
    deliveryRatioBp,
  };
}

// ----------------------------------------------------------------------------
// 5. Logistics Charges Calculation (Pure Integer Minor Units)
// ----------------------------------------------------------------------------

export interface ChargeAmountInput {
  amount_minor: string | bigint;
}

export function calculateTotalLogisticsCharges(
  charges: ChargeAmountInput[],
): bigint {
  return charges.reduce((total, c) => {
    const amount = typeof c.amount_minor === 'string' ? BigInt(c.amount_minor) : c.amount_minor;
    return total + amount;
  }, 0n);
}

// ----------------------------------------------------------------------------
// 6. External Carrier Milestone Reconciliation
// ----------------------------------------------------------------------------

const TERMINAL_STATUSES: readonly DomainShipmentStatus[] = [
  'DELIVERED',
  'RETURNED_TO_ORIGIN',
  'CANCELLED',
];

const STATUS_PROGRESSION_RANK: Record<DomainShipmentStatus, number> = {
  DRAFT: 0,
  READY_FOR_DISPATCH: 1,
  DISPATCHED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  FAILED_ATTEMPT: 4,
  EXCEPTION: 3,
  RETURNED_TO_ORIGIN: 5,
  DELIVERED: 5,
  CANCELLED: 5,
};

export interface MilestoneReconciliationResult {
  shouldUpdate: boolean;
  reason?: string;
}

/**
 * Evaluates whether an incoming carrier tracking milestone should update current shipment status.
 * Rejects stale, out-of-order, or post-terminal milestone updates.
 */
export function reconcileProviderMilestone(
  currentStatus: DomainShipmentStatus,
  incomingStatus: DomainShipmentStatus,
): MilestoneReconciliationResult {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return {
      shouldUpdate: false,
      reason: `Shipment is already in terminal state '${currentStatus}'. Stale milestone '${incomingStatus}' ignored.`,
    };
  }

  const currentRank = STATUS_PROGRESSION_RANK[currentStatus];
  const incomingRank = STATUS_PROGRESSION_RANK[incomingStatus];

  if (incomingRank < currentRank) {
    return {
      shouldUpdate: false,
      reason: `Incoming status '${incomingStatus}' represents a backward regression from '${currentStatus}'. Ignored.`,
    };
  }

  return { shouldUpdate: true };
}

// ----------------------------------------------------------------------------
// 7. Delivery Attempt & Policy Evaluation
// ----------------------------------------------------------------------------

export interface DeliveryAttemptEvaluation {
  action: 'RESCHEDULE' | 'RETURN_TO_ORIGIN';
  attemptsRemaining: number;
}

export function evaluateDeliveryAttemptPolicy(
  attemptCount: number,
  maxAttempts: number,
): DeliveryAttemptEvaluation {
  const attemptsRemaining = Math.max(0, maxAttempts - attemptCount);
  if (attemptCount >= maxAttempts) {
    return {
      action: 'RETURN_TO_ORIGIN',
      attemptsRemaining: 0,
    };
  }

  return {
    action: 'RESCHEDULE',
    attemptsRemaining,
  };
}

// ----------------------------------------------------------------------------
// 8. Vehicle & Run Capacity Verification
// ----------------------------------------------------------------------------

export function assertRunCapacityLimits(
  maxPayloadGrams: number,
  maxVolumeCm3: number,
  totalWeightGrams: number,
  totalVolumeCm3: number,
): void {
  if (totalWeightGrams > maxPayloadGrams) {
    throw new LogisticsDomainError(
      'PAYLOAD_CAPACITY_EXCEEDED',
      `Run total weight ${totalWeightGrams}g exceeds vehicle payload capacity ${maxPayloadGrams}g.`,
    );
  }

  if (totalVolumeCm3 > maxVolumeCm3) {
    throw new LogisticsDomainError(
      'VOLUME_CAPACITY_EXCEEDED',
      `Run total volume ${totalVolumeCm3}cm³ exceeds vehicle cargo volume capacity ${maxVolumeCm3}cm³.`,
    );
  }
}
