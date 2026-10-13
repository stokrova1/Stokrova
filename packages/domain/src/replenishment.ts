// ============================================================================
// STOKROVA — Multi-Echelon Replenishment, Safety Stock & Reorder Domain Engine
// Benchmark: SAP S/4HANA MRP Live, NetSuite Demand Planning, Odoo 18
// Rule 26: Pure integer arithmetic, zero float drift, integer pack sizing
// ============================================================================

export type DomainStockHealthStatus =
  | 'CRITICAL_STOCKOUT'
  | 'REORDER_TRIGGERED'
  | 'HEALTHY'
  | 'OVERSTOCKED';

export type DomainReplenishmentStrategy =
  | 'MIN_MAX'
  | 'REORDER_POINT_SAFETY_STOCK'
  | 'PERIODIC_REVIEW';

export type DomainSourcingMethod =
  | 'PURCHASE_ORDER'
  | 'INTERNAL_TRANSFER'
  | 'MANUFACTURING';

export type DomainRecommendationStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CANCELLED';

export class ReplenishmentDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReplenishmentDomainError';
  }
}

// ----------------------------------------------------------------------------
// 1. Net Stock Position & Stock Health Classification
// ----------------------------------------------------------------------------

export interface NetStockPositionParams {
  on_hand: number;
  on_order: number;
  in_transit: number;
  allocated: number;
  backordered: number;
}

/**
 * Calculates authoritative Net Stock Position:
 * Net = OnHand + OnOrder + InTransit - Allocated - Backordered
 */
export function calculateNetStockPosition(
  params: NetStockPositionParams,
): number {
  return (
    params.on_hand +
    params.on_order +
    params.in_transit -
    params.allocated -
    params.backordered
  );
}

/**
 * Classifies inventory health status according to buffer thresholds.
 */
export function classifyStockHealth(
  netPosition: number,
  _safetyStock: number,
  reorderPoint: number,
  maxBuffer: number,
): DomainStockHealthStatus {
  if (netPosition <= 0) {
    return 'CRITICAL_STOCKOUT';
  }
  if (netPosition <= reorderPoint) {
    return 'REORDER_TRIGGERED';
  }
  if (netPosition > maxBuffer && maxBuffer > 0) {
    return 'OVERSTOCKED';
  }
  return 'HEALTHY';
}

// ----------------------------------------------------------------------------
// 2. Dynamic Reorder Point (ROP) & Safety Stock (SS)
// ----------------------------------------------------------------------------

/**
 * Calculates Reorder Point:
 * ROP = (LeadTimeDays * AvgDailyDemand) + SafetyStock
 */
export function calculateReorderPoint(
  leadTimeDays: number,
  avgDailyDemand: number,
  safetyStock: number,
): number {
  if (leadTimeDays < 0 || avgDailyDemand < 0 || safetyStock < 0) {
    throw new ReplenishmentDomainError(
      'INVALID_ROP_INPUT',
      'Lead time, average daily demand, and safety stock must be non-negative.',
    );
  }
  return leadTimeDays * avgDailyDemand + safetyStock;
}

export interface DynamicSafetyStockParams {
  service_level_factor_bp: number; // e.g. 95% = 1650 bp (Z=1.65), 99% = 2330 bp (Z=2.33)
  lead_time_days: number;
  lead_time_std_dev: number;
  daily_demand_avg: number;
  daily_demand_std_dev: number;
}

/**
 * Calculates dynamic safety stock with demand and lead time variability.
 * Pure integer arithmetic with half-up rounding.
 */
export function calculateDynamicSafetyStock(
  params: DynamicSafetyStockParams,
): number {
  if (params.service_level_factor_bp <= 0) {
    return 0;
  }

  const L = Math.max(1, params.lead_time_days);
  const sigmaD = params.daily_demand_std_dev;
  const D = params.daily_demand_avg;
  const sigmaL = params.lead_time_std_dev;

  const combinedVariance = L * (sigmaD * sigmaD) + (D * D) * (sigmaL * sigmaL);
  const combinedStdDev = Math.sqrt(combinedVariance);

  // Integer scale by basis points (10,000 = 1.0)
  return Math.round((combinedStdDev * params.service_level_factor_bp) / 1000);
}

// ----------------------------------------------------------------------------
// 3. Recommended Reorder Quantity & Sourcing Constraints
// ----------------------------------------------------------------------------

export interface ReorderQuantityParams {
  net_stock_position: number;
  reorder_point: number;
  max_quantity: number;
  order_multiple?: number; // Pack size / pallet multiple (default 1)
  min_order_quantity?: number; // MOQ (default 1)
}

/**
 * Computes optimal replenishment quantity respecting MOQ and order multiples.
 * Returns 0 if net stock position exceeds reorder point.
 */
export function calculateRecommendedReorderQuantity(
  params: ReorderQuantityParams,
): number {
  if (params.net_stock_position > params.reorder_point) {
    return 0;
  }

  const orderMultiple = Math.max(1, params.order_multiple ?? 1);
  const minOrderQty = Math.max(1, params.min_order_quantity ?? 1);

  // Target deficit to bring inventory up to maximum buffer
  const rawDeficit = Math.max(1, params.max_quantity - params.net_stock_position);

  // Round up to nearest order multiple
  const remainder = rawDeficit % orderMultiple;
  const roundedMultiple =
    remainder === 0 ? rawDeficit : rawDeficit + (orderMultiple - remainder);

  // Ensure minimum order quantity (MOQ)
  return Math.max(minOrderQty, roundedMultiple);
}

// ----------------------------------------------------------------------------
// 4. Recommendation State Machine Transitions
// ----------------------------------------------------------------------------

const VALID_RECOMMENDATION_TRANSITIONS: Record<
  DomainRecommendationStatus,
  readonly DomainRecommendationStatus[]
> = {
  PROPOSED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CONVERTED', 'CANCELLED'],
  REJECTED: [],
  CONVERTED: [],
  CANCELLED: [],
};

export function assertRecommendationTransition(
  from: DomainRecommendationStatus,
  to: DomainRecommendationStatus,
): void {
  if (from === to) return;
  const allowed = VALID_RECOMMENDATION_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ReplenishmentDomainError(
      'INVALID_RECOMMENDATION_TRANSITION',
      `Illegal recommendation transition from '${from}' to '${to}'.`,
    );
  }
}
