/**
 * Procurement, Suppliers, Purchasing & Receiving Domain Engine (Phase 4)
 * Pure zero-dependency domain logic enforcing:
 * - Supplier business rules, MOQ/increment compliance, and scoring (4A)
 * - Purchase Order lifecycle transitions, authority thresholds, and integer totals (4B)
 * - Goods Receiving (GRN) over-receipt tolerances, inspection splits, and quarantine routing (4C)
 * - Landed Cost multi-method exact integer allocation with Hamilton-Hare remainder distribution (4D)
 * - 3-Way Matching (PO vs GRN vs Vendor Invoice) variance tolerances and discrepancy detection (4E)
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export type LandedCostAllocationMethod =
  | 'BY_VALUE'
  | 'BY_QUANTITY'
  | 'BY_WEIGHT'
  | 'BY_VOLUME';

export type ThreeWayMatchStatus =
  | 'PERFECT_MATCH'
  | 'TOLERANCE_ACCEPTED'
  | 'DISCREPANCY_FLAGGED'
  | 'REJECTED';

export interface ThreeWayMatchDiscrepancy {
  line_index: number;
  po_quantity: number;
  grn_quantity: number;
  invoiced_quantity: number;
  po_unit_cost_minor: string;
  invoiced_unit_cost_minor: string;
  price_variance_minor: string;
  quantity_variance: number;
  reason: string;
}

export interface ThreeWayMatchResult {
  match_status: ThreeWayMatchStatus;
  price_variance_minor: string;
  quantity_variance: number;
  is_within_tolerance: boolean;
  discrepancies: ThreeWayMatchDiscrepancy[];
}

export class ProcurementDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcurementDomainError';
  }
}

export class SupplierBlockedDomainError extends ProcurementDomainError {
  constructor(supplierName: string) {
    super(`Supplier '${supplierName}' is currently BLOCKED from purchasing operations.`);
    this.name = 'SupplierBlockedDomainError';
  }
}

export class SupplierInactiveDomainError extends ProcurementDomainError {
  constructor(supplierName: string) {
    super(`Supplier '${supplierName}' is currently INACTIVE.`);
    this.name = 'SupplierInactiveDomainError';
  }
}

export class MoqViolationDomainError extends ProcurementDomainError {
  constructor(requestedQty: number, moq: number) {
    super(`Requested quantity ${requestedQty} violates supplier Minimum Order Quantity (MOQ: ${moq}).`);
    this.name = 'MoqViolationDomainError';
  }
}

export class OrderIncrementViolationDomainError extends ProcurementDomainError {
  constructor(requestedQty: number, moq: number, increment: number) {
    super(
      `Requested quantity ${requestedQty} does not align with supplier order increment ${increment} beyond MOQ ${moq}.`,
    );
    this.name = 'OrderIncrementViolationDomainError';
  }
}

export class InvalidPoStatusTransitionDomainError extends ProcurementDomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Invalid Purchase Order transition from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidPoStatusTransitionDomainError';
  }
}

export class OverReceiptToleranceExceededDomainError extends ProcurementDomainError {
  constructor(ordered: number, allowedMax: number, attemptedTotal: number) {
    super(
      `Attempted total receipt quantity ${attemptedTotal} exceeds maximum allowed receipt ${allowedMax} for ordered quantity ${ordered}.`,
    );
    this.name = 'OverReceiptToleranceExceededDomainError';
  }
}

export class InspectionQuantitiesMismatchDomainError extends ProcurementDomainError {
  constructor(received: number, sumOfDispositions: number) {
    super(
      `Inspection quantities sum (${sumOfDispositions}) does not match total received quantity (${received}).`,
    );
    this.name = 'InspectionQuantitiesMismatchDomainError';
  }
}

export class LandedCostAllocationDomainError extends ProcurementDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'LandedCostAllocationDomainError';
  }
}

// ==========================================
// 4A: Suppliers & Vendor Rules
// ==========================================

export function normalizeSupplierCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,50}$/.test(normalized)) {
    throw new ProcurementDomainError(
      `Supplier code '${code}' is invalid. Must be 2-50 alphanumeric characters, hyphens, or underscores.`,
    );
  }
  return normalized;
}

export function assertValidSupplierMoq(
  orderQty: number,
  moq: number,
  increment: number,
): void {
  if (orderQty <= 0) {
    throw new ProcurementDomainError(
      `Order quantity must be strictly positive. Received: ${orderQty}`,
    );
  }
  if (moq > 0 && orderQty < moq) {
    throw new MoqViolationDomainError(orderQty, moq);
  }
  if (increment > 1) {
    const base = moq > 0 ? moq : 0;
    const excess = orderQty - base;
    if (excess % increment !== 0) {
      throw new OrderIncrementViolationDomainError(orderQty, moq, increment);
    }
  }
}

export function assertEligibleSupplierStatus(name: string, status: string): void {
  if (status === 'BLOCKED') {
    throw new SupplierBlockedDomainError(name);
  }
  if (status === 'INACTIVE') {
    throw new SupplierInactiveDomainError(name);
  }
}

export function calculateSupplierDeliveryScore(
  onTimeDeliveries: number,
  totalDeliveries: number,
): number {
  if (totalDeliveries <= 0) {
    return 10000; // Baseline neutral score for new suppliers
  }
  if (onTimeDeliveries < 0 || onTimeDeliveries > totalDeliveries) {
    throw new ProcurementDomainError(
      `Invalid delivery counts: onTime=${onTimeDeliveries}, total=${totalDeliveries}`,
    );
  }
  return Math.floor((onTimeDeliveries * 10000) / totalDeliveries);
}

// ==========================================
// 4B: Purchase Order Lifecycle & Totals
// ==========================================

const ALLOWED_PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['ISSUED', 'CANCELLED'],
  ISSUED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CLOSED', 'CANCELLED'],
  RECEIVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export function assertValidPoStatusTransition(
  current: PurchaseOrderStatus,
  target: PurchaseOrderStatus,
): void {
  const allowed = ALLOWED_PO_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new InvalidPoStatusTransitionDomainError(current, target);
  }
}

export function evaluatePoApprovalRequirement(
  totalMinor: bigint,
  tierThresholdMinor: bigint = 500000n, // $5,000 threshold default
): { requiresApproval: boolean; tier: 'AUTO' | 'MANAGER' | 'EXECUTIVE' } {
  if (totalMinor <= 0n) {
    return { requiresApproval: false, tier: 'AUTO' };
  }
  if (totalMinor <= tierThresholdMinor) {
    return { requiresApproval: false, tier: 'AUTO' };
  }
  if (totalMinor <= tierThresholdMinor * 10n) {
    return { requiresApproval: true, tier: 'MANAGER' };
  }
  return { requiresApproval: true, tier: 'EXECUTIVE' };
}

export interface PoLineCalculationInput {
  quantity: number;
  unit_cost_minor: bigint;
  tax_rate_basis_points?: number;
}

export interface PoLineCalculationOutput {
  line_subtotal_minor: bigint;
  line_tax_minor: bigint;
  line_total_minor: bigint;
}

export interface PoTotalsCalculationOutput {
  subtotal_minor: bigint;
  tax_minor: bigint;
  discount_minor: bigint;
  total_minor: bigint;
  lines: PoLineCalculationOutput[];
}

export function calculatePurchaseOrderTotals(
  lines: PoLineCalculationInput[],
  discountMinor: bigint = 0n,
): PoTotalsCalculationOutput {
  let subtotal = 0n;
  let totalTax = 0n;

  const lineOutputs: PoLineCalculationOutput[] = lines.map((line) => {
    if (line.quantity <= 0) {
      throw new ProcurementDomainError(`PO line quantity must be positive. Received ${line.quantity}`);
    }
    if (line.unit_cost_minor < 0n) {
      throw new ProcurementDomainError(`PO line unit cost cannot be negative.`);
    }

    const lineSubtotal = BigInt(line.quantity) * line.unit_cost_minor;
    const taxBps = BigInt(line.tax_rate_basis_points ?? 0);
    const lineTax = (lineSubtotal * taxBps) / 10000n;
    const lineTotal = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    totalTax += lineTax;

    return {
      line_subtotal_minor: lineSubtotal,
      line_tax_minor: lineTax,
      line_total_minor: lineTotal,
    };
  });

  const grossTotal = subtotal + totalTax;
  if (discountMinor < 0n) {
    throw new ProcurementDomainError(`PO discount cannot be negative.`);
  }
  const netTotal = grossTotal > discountMinor ? grossTotal - discountMinor : 0n;

  return {
    subtotal_minor: subtotal,
    tax_minor: totalTax,
    discount_minor: discountMinor,
    total_minor: netTotal,
    lines: lineOutputs,
  };
}

// ==========================================
// 4C: Goods Receiving (GRN) & Quarantine
// ==========================================

export function assertValidOverReceipt(
  orderedQty: number,
  alreadyReceivedQty: number,
  newReceiptQty: number,
  toleranceBasisPoints: number = 0, // e.g. 500 = 5% tolerance
): void {
  if (newReceiptQty <= 0) {
    throw new ProcurementDomainError(
      `Received quantity must be strictly positive. Received: ${newReceiptQty}`,
    );
  }
  const totalAttempted = alreadyReceivedQty + newReceiptQty;
  const maxAllowed = Math.floor(
    (orderedQty * (10000 + toleranceBasisPoints)) / 10000,
  );

  if (totalAttempted > maxAllowed) {
    throw new OverReceiptToleranceExceededDomainError(
      orderedQty,
      maxAllowed,
      totalAttempted,
    );
  }
}

export function assertValidInspectionQuantities(
  receivedQty: number,
  acceptedQty: number,
  quarantinedQty: number = 0,
  rejectedQty: number = 0,
): void {
  if (receivedQty < 0 || acceptedQty < 0 || quarantinedQty < 0 || rejectedQty < 0) {
    throw new ProcurementDomainError('Inspection quantities cannot be negative.');
  }

  const sum = acceptedQty + quarantinedQty + rejectedQty;
  if (sum !== receivedQty) {
    throw new InspectionQuantitiesMismatchDomainError(receivedQty, sum);
  }
}

// ==========================================
// 4D: Landed Cost Allocation Engine
// Exact Integer Math with Hamilton-Hare Remainder Distribution
// ==========================================

export interface LandedCostAllocationLineInput {
  goods_receipt_line_id: string;
  variant_id: string;
  received_quantity: number;
  original_line_cost_minor: bigint;
  weight_grams?: number;
  volume_cm3?: number;
}

export interface LandedCostLineAllocationResult {
  goods_receipt_line_id: string;
  variant_id: string;
  received_quantity: number;
  original_line_cost_minor: bigint;
  allocated_charge_minor: bigint;
  final_line_cost_minor: bigint;
  unit_landed_cost_minor: bigint;
}

export function allocateLandedCosts(
  method: LandedCostAllocationMethod,
  totalChargesMinor: bigint,
  lines: LandedCostAllocationLineInput[],
): LandedCostLineAllocationResult[] {
  if (lines.length === 0) {
    throw new LandedCostAllocationDomainError('Cannot allocate landed costs to zero receipt lines.');
  }
  if (totalChargesMinor <= 0n) {
    return lines.map((l) => {
      const unitCost =
        l.received_quantity > 0
          ? l.original_line_cost_minor / BigInt(l.received_quantity)
          : 0n;
      return {
        goods_receipt_line_id: l.goods_receipt_line_id,
        variant_id: l.variant_id,
        received_quantity: l.received_quantity,
        original_line_cost_minor: l.original_line_cost_minor,
        allocated_charge_minor: 0n,
        final_line_cost_minor: l.original_line_cost_minor,
        unit_landed_cost_minor: unitCost,
      };
    });
  }

  // Determine weight basis per line
  const basisValues: bigint[] = lines.map((line) => {
    switch (method) {
      case 'BY_VALUE':
        return line.original_line_cost_minor;
      case 'BY_QUANTITY':
        return BigInt(line.received_quantity);
      case 'BY_WEIGHT':
        return BigInt(line.weight_grams ?? 1);
      case 'BY_VOLUME':
        return BigInt(line.volume_cm3 ?? 1);
      default:
        throw new LandedCostAllocationDomainError(`Unsupported allocation method: ${method}`);
    }
  });

  const totalBasis = basisValues.reduce((acc, v) => acc + v, 0n);
  if (totalBasis <= 0n) {
    throw new LandedCostAllocationDomainError(
      `Total allocation basis for method ${method} must be strictly positive.`,
    );
  }

  // Step 1: Compute floor allocations and record remainders (Hamilton-Hare method)
  interface LineFloorState {
    index: number;
    floorAllocated: bigint;
    fractionRemainder: bigint;
  }

  const floorStates: LineFloorState[] = [];
  let sumFloorAllocated = 0n;

  for (let i = 0; i < lines.length; i++) {
    const basis = basisValues[i]!;
    // Exact division: floorAllocated = (totalChargesMinor * basis) / totalBasis
    const product = totalChargesMinor * basis;
    const floorAllocated = product / totalBasis;
    const remainder = product % totalBasis;

    floorStates.push({
      index: i,
      floorAllocated,
      fractionRemainder: remainder,
    });
    sumFloorAllocated += floorAllocated;
  }

  // Step 2: Distribute remaining cents to lines with largest remainders
  let undistributedMinor = totalChargesMinor - sumFloorAllocated;
  floorStates.sort((a, b) => {
    if (b.fractionRemainder > a.fractionRemainder) return 1;
    if (b.fractionRemainder < a.fractionRemainder) return -1;
    return a.index - b.index;
  });

  for (let i = 0; i < floorStates.length && undistributedMinor > 0n; i++) {
    const item = floorStates[i];
    if (item) {
      item.floorAllocated += 1n;
      undistributedMinor -= 1n;
    }
  }

  // Restore original ordering
  floorStates.sort((a, b) => a.index - b.index);

  // Step 3: Compute final lines and unit costs
  return lines.map((line, idx) => {
    const state = floorStates[idx]!;
    const allocated = state.floorAllocated;
    const finalLineCost = line.original_line_cost_minor + allocated;
    const unitLandedCost =
      line.received_quantity > 0
        ? finalLineCost / BigInt(line.received_quantity)
        : 0n;

    return {
      goods_receipt_line_id: line.goods_receipt_line_id,
      variant_id: line.variant_id,
      received_quantity: line.received_quantity,
      original_line_cost_minor: line.original_line_cost_minor,
      allocated_charge_minor: allocated,
      final_line_cost_minor: finalLineCost,
      unit_landed_cost_minor: unitLandedCost,
    };
  });
}

// ==========================================
// 4E: 3-Way Matching Engine
// ==========================================

export interface ThreeWayMatchLineItem {
  po_quantity: number;
  po_unit_cost_minor: bigint;
  grn_accepted_quantity: number;
  invoiced_quantity: number;
  invoiced_unit_cost_minor: bigint;
}

export interface ThreeWayMatchVerificationOptions {
  tolerancePriceBasisPoints?: number; // e.g. 100 = 1.00%
  toleranceQuantity?: number;         // e.g. 0
}

export function verifyThreeWayMatch(
  items: ThreeWayMatchLineItem[],
  options: ThreeWayMatchVerificationOptions = {},
): ThreeWayMatchResult {
  const priceToleranceBps = BigInt(options.tolerancePriceBasisPoints ?? 0);
  const qtyTolerance = options.toleranceQuantity ?? 0;

  let totalNetPriceVarianceMinor = 0n;
  let totalNetQtyVariance = 0;
  let hasPriceVarianceBeyondTolerance = false;
  let hasQtyVarianceBeyondTolerance = false;
  let hasAnyDiscrepancy = false;

  const discrepancies: ThreeWayMatchDiscrepancy[] = [];

  items.forEach((item, index) => {
    const qtyVariance = item.invoiced_quantity - item.grn_accepted_quantity;
    totalNetQtyVariance += qtyVariance;

    const unitPriceDiff = item.invoiced_unit_cost_minor - item.po_unit_cost_minor;
    const linePriceVariance = unitPriceDiff * BigInt(item.invoiced_quantity);
    totalNetPriceVarianceMinor += linePriceVariance;

    const absUnitPriceDiff = unitPriceDiff < 0n ? -unitPriceDiff : unitPriceDiff;
    const maxAllowedPriceDiff =
      item.po_unit_cost_minor > 0n
        ? (item.po_unit_cost_minor * priceToleranceBps) / 10000n
        : 0n;

    const isLinePriceDiscrepancy = absUnitPriceDiff > maxAllowedPriceDiff;
    const isLineQtyDiscrepancy = Math.abs(qtyVariance) > qtyTolerance;

    if (isLinePriceDiscrepancy) {
      hasPriceVarianceBeyondTolerance = true;
    }
    if (isLineQtyDiscrepancy) {
      hasQtyVarianceBeyondTolerance = true;
    }

    if (unitPriceDiff !== 0n || qtyVariance !== 0) {
      hasAnyDiscrepancy = true;
      let reason = '';
      if (unitPriceDiff !== 0n && qtyVariance !== 0) {
        reason = `Both unit price mismatch (${unitPriceDiff.toString()} minor) and quantity mismatch (${qtyVariance} units).`;
      } else if (unitPriceDiff !== 0n) {
        reason = `Unit price mismatch: Invoiced ${item.invoiced_unit_cost_minor} vs PO ${item.po_unit_cost_minor}.`;
      } else {
        reason = `Quantity mismatch: Invoiced ${item.invoiced_quantity} vs GRN Accepted ${item.grn_accepted_quantity}.`;
      }

      discrepancies.push({
        line_index: index,
        po_quantity: item.po_quantity,
        grn_quantity: item.grn_accepted_quantity,
        invoiced_quantity: item.invoiced_quantity,
        po_unit_cost_minor: item.po_unit_cost_minor.toString(),
        invoiced_unit_cost_minor: item.invoiced_unit_cost_minor.toString(),
        price_variance_minor: linePriceVariance.toString(),
        quantity_variance: qtyVariance,
        reason,
      });
    }
  });

  let matchStatus: ThreeWayMatchStatus = 'PERFECT_MATCH';
  let isWithinTolerance = true;

  if (hasPriceVarianceBeyondTolerance || hasQtyVarianceBeyondTolerance) {
    matchStatus = 'DISCREPANCY_FLAGGED';
    isWithinTolerance = false;
  } else if (hasAnyDiscrepancy) {
    matchStatus = 'TOLERANCE_ACCEPTED';
    isWithinTolerance = true;
  }

  return {
    match_status: matchStatus,
    price_variance_minor: totalNetPriceVarianceMinor.toString(),
    quantity_variance: totalNetQtyVariance,
    is_within_tolerance: isWithinTolerance,
    discrepancies,
  };
}

// ==========================================
// 4F: Purchase Request Domain Transitions
// ==========================================

export class InvalidPurchaseRequestStatusTransitionError extends ProcurementDomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Invalid Purchase Request transition from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidPurchaseRequestStatusTransitionError';
  }
}

export function assertValidPurchaseRequestTransition(
  currentStatus: string,
  targetStatus: string,
): void {
  const allowedTransitions: Record<string, string[]> = {
    DRAFT: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['CONVERTED', 'CANCELLED'],
    REJECTED: ['DRAFT', 'CANCELLED'],
    CANCELLED: [],
    CONVERTED: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidPurchaseRequestStatusTransitionError(currentStatus, targetStatus);
  }
}

// ==========================================
// 4G: RFQ & Supplier Quotation Transitions & Comparison
// ==========================================

export class InvalidRfqStatusTransitionError extends ProcurementDomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Invalid RFQ transition from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidRfqStatusTransitionError';
  }
}

export function assertValidRfqTransition(
  currentStatus: string,
  targetStatus: string,
): void {
  const allowedTransitions: Record<string, string[]> = {
    DRAFT: ['ISSUED', 'CANCELLED'],
    ISSUED: ['CLOSED', 'CANCELLED'],
    CLOSED: [],
    CANCELLED: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidRfqStatusTransitionError(currentStatus, targetStatus);
  }
}

export class InvalidSupplierQuotationTransitionError extends ProcurementDomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Invalid Supplier Quotation transition from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidSupplierQuotationTransitionError';
  }
}

export function assertValidSupplierQuotationTransition(
  currentStatus: string,
  targetStatus: string,
): void {
  const allowedTransitions: Record<string, string[]> = {
    RECEIVED: ['UNDER_REVIEW', 'SELECTED', 'REJECTED', 'EXPIRED'],
    UNDER_REVIEW: ['SELECTED', 'REJECTED', 'EXPIRED'],
    SELECTED: [],
    REJECTED: [],
    EXPIRED: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidSupplierQuotationTransitionError(currentStatus, targetStatus);
  }
}

export interface QuotationComparisonCandidate {
  id: string;
  quotation_number: string;
  supplier_id: string;
  supplier_name: string;
  total_minor: bigint;
  lead_time_days: number | null;
  payment_terms: string;
  valid_until: string | null;
  status: string;
}

export interface QuotationComparisonReport {
  candidates: {
    quotation_id: string;
    quotation_number: string;
    supplier_id: string;
    supplier_name: string;
    total_minor: string;
    lead_time_days: number | null;
    payment_terms: string;
    is_valid: boolean;
    score: number;
  }[];
  recommended_quotation_id: string | null;
}

export function evaluateSupplierQuotationComparison(
  candidates: QuotationComparisonCandidate[],
  asOfTimestamp = new Date(),
): QuotationComparisonReport {
  if (candidates.length === 0) {
    return { candidates: [], recommended_quotation_id: null };
  }

  const scored = candidates.map((c) => {
    const isValid = !c.valid_until || new Date(c.valid_until).getTime() >= asOfTimestamp.getTime();
    return {
      candidate: c,
      isValid,
    };
  });

  // Find lowest total cost among valid quotes
  const validCandidates = scored.filter((s) => s.isValid);
  let minCost = 0n;
  if (validCandidates.length > 0) {
    minCost = validCandidates.reduce(
      (min, cur) => (cur.candidate.total_minor < min ? cur.candidate.total_minor : min),
      validCandidates[0]!.candidate.total_minor,
    );
  }

  const reports = scored.map(({ candidate, isValid }) => {
    let score = 0;
    if (isValid && minCost > 0n && candidate.total_minor > 0n) {
      // Base score from cost ratio (up to 70 points)
      const costRatio = Number((minCost * 1000n) / candidate.total_minor) / 1000;
      const costPoints = Math.round(costRatio * 70);

      // Lead time points (up to 30 points, less days = more points)
      const leadTime = candidate.lead_time_days ?? 14;
      const leadPoints = Math.max(0, Math.min(30, 30 - leadTime));

      score = costPoints + leadPoints;
    }

    return {
      quotation_id: candidate.id,
      quotation_number: candidate.quotation_number,
      supplier_id: candidate.supplier_id,
      supplier_name: candidate.supplier_name,
      total_minor: candidate.total_minor.toString(),
      lead_time_days: candidate.lead_time_days,
      payment_terms: candidate.payment_terms,
      is_valid: isValid,
      score,
    };
  });

  // Recommended is highest score among valid quotes
  reports.sort((a, b) => b.score - a.score);
  const recommended = reports.find((r) => r.is_valid);

  return {
    candidates: reports,
    recommended_quotation_id: recommended ? recommended.quotation_id : null,
  };
}

// ==========================================
// 4H: Supplier Return Transitions
// ==========================================

export class InvalidSupplierReturnTransitionError extends ProcurementDomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Invalid Supplier Return transition from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidSupplierReturnTransitionError';
  }
}

export function assertValidSupplierReturnTransition(
  currentStatus: string,
  targetStatus: string,
): void {
  const allowedTransitions: Record<string, string[]> = {
    DRAFT: ['AUTHORIZED', 'CANCELLED'],
    AUTHORIZED: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidSupplierReturnTransitionError(currentStatus, targetStatus);
  }
}

// ==========================================
// 4I: Supplier Payment Allocation Checks
// ==========================================

export class SupplierPaymentAllocationExceededError extends ProcurementDomainError {
  constructor(invoiceId: string, balanceDue: bigint, attemptingToAllocate: bigint) {
    super(
      `Attempting to allocate ${attemptingToAllocate.toString()} minor to invoice '${invoiceId}', but remaining balance due is ${balanceDue.toString()} minor.`,
    );
    this.name = 'SupplierPaymentAllocationExceededError';
  }
}

export function assertValidSupplierPaymentAllocation(
  invoiceId: string,
  invoiceTotalMinor: bigint,
  alreadyPaidMinor: bigint,
  attemptingToAllocateMinor: bigint,
): void {
  if (attemptingToAllocateMinor <= 0n) {
    throw new ProcurementDomainError('Allocated amount must be strictly positive.');
  }

  const balanceDue = invoiceTotalMinor - alreadyPaidMinor;
  if (attemptingToAllocateMinor > balanceDue) {
    throw new SupplierPaymentAllocationExceededError(
      invoiceId,
      balanceDue,
      attemptingToAllocateMinor,
    );
  }
}

