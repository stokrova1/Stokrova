// ============================================================================
// STOKROVA — Reverse Logistics, RMA, Quality Inspection & Restocking Domain Engine
// Benchmark: SAP EWM, Manhattan WMS, ERPNext, Odoo 18
// Rule 26: Zero floating-point math, pure integer cents & basis points
// ============================================================================

export type DomainRmaStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type DomainRmaType =
  | 'CUSTOMER_RETURN'
  | 'VENDOR_RETURN'
  | 'INTERNAL_TRANSFER_RETURN';

export type DomainReturnReasonCode =
  | 'DEFECTIVE'
  | 'WRONG_ITEM_SHIPPED'
  | 'BUYER_REMORSE'
  | 'DAMAGED_IN_TRANSIT'
  | 'EXPIRED'
  | 'NOT_AS_DESCRIBED'
  | 'OTHER';

export type DomainResolutionPreference =
  | 'REFUND'
  | 'REPLACEMENT'
  | 'STORE_CREDIT'
  | 'REPAIR';

export type DomainInspectionConditionGrade =
  | 'GRADE_A_NEW'
  | 'GRADE_B_OPEN_BOX'
  | 'GRADE_C_REFURBISHABLE'
  | 'GRADE_D_SALVAGE'
  | 'SCRAP_HAZMAT';

export type DomainInspectionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'QUARANTINED';

export type DomainDispositionActionType =
  | 'RESTOCK_TO_PRIMARY'
  | 'TRANSFER_TO_REFURB'
  | 'RETURN_TO_VENDOR'
  | 'SCRAP_DISPOSAL';

export type DomainDispositionStatus = 'PLANNED' | 'EXECUTED' | 'CANCELLED';

export class ReturnsDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReturnsDomainError';
  }
}

// ----------------------------------------------------------------------------
// 1. RMA State Machine
// ----------------------------------------------------------------------------

const VALID_RMA_TRANSITIONS: Record<
  DomainRmaStatus,
  readonly DomainRmaStatus[]
> = {
  DRAFT: ['REQUESTED', 'APPROVED', 'CANCELLED'],
  REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

/**
 * Validates legal RMA lifecycle progression.
 */
export function assertRmaTransition(
  from: DomainRmaStatus,
  to: DomainRmaStatus,
): void {
  if (from === to) return;
  const allowed = VALID_RMA_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ReturnsDomainError(
      'INVALID_RMA_TRANSITION',
      `Illegal RMA state transition from '${from}' to '${to}'.`,
    );
  }
}

// ----------------------------------------------------------------------------
// 2. Return Authorization Quantity Invariants
// ----------------------------------------------------------------------------

export interface DomainReturnLineValidationParams {
  quantity_authorized: number;
  quantity_received?: number;
  original_fulfilled_quantity?: number | null;
  previously_returned_quantity?: number | null;
}

/**
 * Enforces business invariants for authorized return quantities.
 * Prevents over-returning beyond originally fulfilled quantities.
 */
export function assertReturnQuantityInvariants(
  params: DomainReturnLineValidationParams,
): void {
  if (params.quantity_authorized <= 0) {
    throw new ReturnsDomainError(
      'INVALID_AUTHORIZED_QUANTITY',
      `Authorized return quantity must be greater than zero, got ${params.quantity_authorized}.`,
    );
  }

  if (params.quantity_received !== undefined) {
    if (params.quantity_received < 0) {
      throw new ReturnsDomainError(
        'NEGATIVE_RECEIVED_QUANTITY',
        `Received quantity cannot be negative, got ${params.quantity_received}.`,
      );
    }

    if (params.quantity_received > params.quantity_authorized) {
      throw new ReturnsDomainError(
        'OVER_RECEIPT_FORBIDDEN',
        `Received quantity (${params.quantity_received}) cannot exceed authorized quantity (${params.quantity_authorized}).`,
      );
    }
  }

  if (
    params.original_fulfilled_quantity !== undefined &&
    params.original_fulfilled_quantity !== null
  ) {
    const prevReturned = params.previously_returned_quantity ?? 0;
    const maxPermitted = params.original_fulfilled_quantity - prevReturned;

    if (params.quantity_authorized > maxPermitted) {
      throw new ReturnsDomainError(
        'RETURN_EXCEEDS_FULFILLED_QUANTITY',
        `Authorized quantity (${params.quantity_authorized}) exceeds available returnable quantity (${maxPermitted}) out of originally fulfilled (${params.original_fulfilled_quantity}).`,
      );
    }
  }
}

/**
 * Computes overall RMA status based on constituent line receipts.
 */
export function evaluateRmaReceiptStatus(
  lines: Array<{ quantity_authorized: number; quantity_received: number }>,
): DomainRmaStatus {
  if (lines.length === 0) return 'APPROVED';

  const totalAuthorized = lines.reduce((acc, l) => acc + l.quantity_authorized, 0);
  const totalReceived = lines.reduce((acc, l) => acc + l.quantity_received, 0);

  if (totalReceived === 0) {
    return 'APPROVED';
  }

  if (totalReceived >= totalAuthorized) {
    return 'RECEIVED';
  }

  return 'PARTIALLY_RECEIVED';
}

// ----------------------------------------------------------------------------
// 3. Financial Restocking Fee & Refund Engine (Rule 26: Pure Integer Math)
// ----------------------------------------------------------------------------

export interface NetRefundResult {
  gross_refund_cents: number;
  restocking_fee_cents: number;
  net_refund_cents: number;
}

/**
 * Calculates net refund with integer half-up rounding on restocking fee basis points.
 * 1 basis point = 0.01% (10,000 bp = 100%).
 */
export function calculateNetRefund(
  grossRefundCents: number,
  restockingFeeBp: number,
): NetRefundResult {
  if (grossRefundCents < 0) {
    throw new ReturnsDomainError(
      'NEGATIVE_GROSS_REFUND',
      `Gross refund amount cannot be negative, got ${grossRefundCents}.`,
    );
  }

  if (restockingFeeBp < 0 || restockingFeeBp > 10000) {
    throw new ReturnsDomainError(
      'INVALID_RESTOCKING_FEE_BP',
      `Restocking fee basis points must be between 0 and 10000 (0% - 100%), got ${restockingFeeBp}.`,
    );
  }

  // Integer half-up rounding: (gross * bp + 5000) / 10000
  const restockingFeeCents = Math.floor(
    (grossRefundCents * restockingFeeBp + 5000) / 10000,
  );

  const netRefundCents = grossRefundCents - restockingFeeCents;

  return {
    gross_refund_cents: grossRefundCents,
    restocking_fee_cents: restockingFeeCents,
    net_refund_cents: netRefundCents,
  };
}

// ----------------------------------------------------------------------------
// 4. Quality Grading & Disposition Routing Engine
// ----------------------------------------------------------------------------

export interface DispositionRoutingPolicy {
  condition_grade: DomainInspectionConditionGrade;
  is_vendor_defect?: boolean;
}

/**
 * Heuristic routing engine that directs inspected units to their appropriate downstream destination.
 */
export function determineDispositionRoute(
  policy: DispositionRoutingPolicy,
): DomainDispositionActionType {
  if (policy.is_vendor_defect) {
    return 'RETURN_TO_VENDOR';
  }

  switch (policy.condition_grade) {
    case 'GRADE_A_NEW':
    case 'GRADE_B_OPEN_BOX':
      return 'RESTOCK_TO_PRIMARY';
    case 'GRADE_C_REFURBISHABLE':
    case 'GRADE_D_SALVAGE':
      return 'TRANSFER_TO_REFURB';
    case 'SCRAP_HAZMAT':
      return 'SCRAP_DISPOSAL';
    default:
      return 'TRANSFER_TO_REFURB';
  }
}
