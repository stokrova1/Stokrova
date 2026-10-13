// ============================================================================
// STOKROVA — Multi-Echelon Replenishment, Safety Stock & Reorder Contracts
// Benchmark: SAP S/4HANA MRP Live, NetSuite Demand Planning, Odoo 18
// Rule 26: Pure integer pricing (cents), zero floats, integer pack sizes
// ============================================================================

export type StockHealthStatus =
  | 'CRITICAL_STOCKOUT'
  | 'REORDER_TRIGGERED'
  | 'HEALTHY'
  | 'OVERSTOCKED';

export type ReplenishmentStrategy =
  | 'MIN_MAX'
  | 'REORDER_POINT_SAFETY_STOCK'
  | 'PERIODIC_REVIEW';

export type SourcingMethod =
  | 'PURCHASE_ORDER'
  | 'INTERNAL_TRANSFER'
  | 'MANUFACTURING';

export type RecommendationStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CANCELLED';

export interface ReplenishmentRule {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  variant_id: string;
  sku: string;
  strategy: ReplenishmentStrategy;
  min_quantity: number;
  max_quantity: number;
  safety_stock: number;
  reorder_point: number;
  lead_time_days: number;
  order_multiple: number;
  min_order_quantity: number;
  primary_vendor_id?: string | null;
  upstream_warehouse_id?: string | null;
  preferred_sourcing: SourcingMethod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockPosition {
  warehouse_id: string;
  variant_id: string;
  sku: string;
  on_hand: number;
  on_order: number;
  in_transit: number;
  allocated: number;
  backordered: number;
  net_position: number;
  safety_stock: number;
  reorder_point: number;
  max_quantity: number;
  health_status: StockHealthStatus;
}

export interface ReplenishmentRecommendation {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  variant_id: string;
  sku: string;
  rule_id: string;
  net_stock_position: number;
  reorder_point: number;
  recommended_quantity: number;
  sourcing_method: SourcingMethod;
  target_vendor_id?: string | null;
  source_warehouse_id?: string | null;
  estimated_cost_cents: number;
  currency: string;
  status: RecommendationStatus;
  generated_order_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// DTOs & Request/Response Types
// ----------------------------------------------------------------------------

export interface CreateReplenishmentRuleRequest {
  warehouse_id: string;
  variant_id: string;
  sku: string;
  strategy?: ReplenishmentStrategy;
  min_quantity: number;
  max_quantity: number;
  safety_stock?: number;
  reorder_point?: number;
  lead_time_days?: number;
  order_multiple?: number;
  min_order_quantity?: number;
  primary_vendor_id?: string | null;
  upstream_warehouse_id?: string | null;
  preferred_sourcing?: SourcingMethod;
  is_active?: boolean;
}

export interface UpdateReplenishmentRuleRequest {
  strategy?: ReplenishmentStrategy;
  min_quantity?: number;
  max_quantity?: number;
  safety_stock?: number;
  reorder_point?: number;
  lead_time_days?: number;
  order_multiple?: number;
  min_order_quantity?: number;
  primary_vendor_id?: string | null;
  upstream_warehouse_id?: string | null;
  preferred_sourcing?: SourcingMethod;
  is_active?: boolean;
}

export interface ReplenishmentRuleResponse {
  rule: ReplenishmentRule;
}

export interface ListReplenishmentRulesResponse {
  rules: ReplenishmentRule[];
}

export interface EvaluateReplenishmentRequest {
  warehouse_id: string;
  variant_ids?: string[];
}

export interface EvaluateReplenishmentResponse {
  recommendations: ReplenishmentRecommendation[];
  stock_positions: StockPosition[];
}

export interface ApproveRecommendationRequest {
  override_quantity?: number;
  approved_by?: string;
  notes?: string | null;
}

export interface ConvertRecommendationRequest {
  operator_id?: string;
  notes?: string | null;
}

export interface RecommendationResponse {
  recommendation: ReplenishmentRecommendation;
}

export interface ListRecommendationsResponse {
  recommendations: ReplenishmentRecommendation[];
}
