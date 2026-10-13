// ============================================================================
// STOKROVA — Advanced Inventory Analytics, ABC Velocity & Intelligence Contracts
// Benchmark: SAP IBP, NetSuite Analytics Warehouse, Odoo Enterprise BI
// Rule 26: Pure integer arithmetic (cents minor units, basis points 1 bp = 0.01%)
// ============================================================================

export type AbcClass = 'A' | 'B' | 'C';

export type AbcAnalysisCriterion =
  | 'REVENUE'
  | 'QUANTITY_VELOCITY'
  | 'PROFIT_MARGIN';

export interface AbcItemInput {
  variant_id: string;
  sku: string;
  name: string;
  value: number; // minor units for REVENUE/PROFIT, unit quantity for QUANTITY_VELOCITY
}

export interface AbcItemClassification extends AbcItemInput {
  rank: number;
  cumulative_value: number;
  share_basis_points: number;
  cumulative_share_basis_points: number;
  abc_class: AbcClass;
}

export interface AbcAnalysisResult {
  criterion: AbcAnalysisCriterion;
  total_items: number;
  total_value: number;
  a_items_count: number;
  b_items_count: number;
  c_items_count: number;
  a_items_value: number;
  b_items_value: number;
  c_items_value: number;
  items: AbcItemClassification[];
}

export type InventoryAgingTier =
  | 'ACTIVE'
  | 'SLOW_MOVING'
  | 'STAGNANT'
  | 'DEAD_STOCK';

export type DeadStockAction =
  | 'NONE'
  | 'PROMOTIONAL_MARKDOWN'
  | 'BUNDLE_LIQUIDATION'
  | 'WRITE_OFF_SCRAP';

export interface DeadStockItemInput {
  variant_id: string;
  sku: string;
  warehouse_id: string;
  on_hand_quantity: number;
  unit_cost_minor_units: number;
  days_inactive: number;
  holding_cost_annual_basis_points?: number; // default 2000 bp = 20.00%
}

export interface DeadStockItem {
  variant_id: string;
  sku: string;
  warehouse_id: string;
  on_hand_quantity: number;
  unit_cost_minor_units: number;
  tied_up_capital_minor_units: number;
  days_inactive: number;
  holding_cost_minor_units: number;
  aging_tier: InventoryAgingTier;
  recommended_action: DeadStockAction;
}

export interface DeadStockReport {
  total_items_analyzed: number;
  total_dead_stock_items: number;
  total_tied_up_capital_minor_units: number;
  total_annual_holding_cost_minor_units: number;
  items: DeadStockItem[];
}

export type DemandForecastMethod =
  | 'SIMPLE_MOVING_AVERAGE'
  | 'WEIGHTED_MOVING_AVERAGE'
  | 'EXPONENTIAL_SMOOTHING';

export interface DemandForecastInput {
  variant_id: string;
  historical_demands: number[]; // non-negative integers
  method: DemandForecastMethod;
  weights?: number[]; // positive integers for weighted moving average
  alpha_basis_points?: number; // e.g. 2000 bp = 0.20 for exponential smoothing
  forecast_horizon_periods?: number; // default 1
  lead_time_periods?: number; // default 1
  current_on_hand?: number; // default 0
}

export interface DemandForecastProjection {
  variant_id: string;
  method: DemandForecastMethod;
  historical_mean: number;
  projected_demands: number[];
  mean_absolute_deviation: number;
  tracking_signal: number;
  stockout_risk_score: number; // 0 to 100
}

export interface InventoryTurnoverInput {
  annualized_cogs_minor_units: number;
  average_inventory_value_minor_units: number;
  gross_margin_minor_units: number;
}

export interface InventoryTurnoverMetrics {
  annualized_cogs_minor_units: number;
  average_inventory_value_minor_units: number;
  turnover_ratio_basis_points: number;
  days_inventory_outstanding: number;
  gross_margin_minor_units: number;
  gmroi_basis_points: number;
}

export interface BranchProfitabilityMetrics {
  branch_id: string;
  branch_name: string;
  total_revenue_minor_units: number;
  total_cogs_minor_units: number;
  gross_profit_minor_units: number;
  gross_margin_basis_points: number;
}

export interface CashierSessionDiscrepancyInput {
  cashier_id: string;
  cashier_name: string;
  opening_float_minor_units: number;
  expected_closing_minor_units: number;
  actual_closing_minor_units: number;
}

export interface CashierDiscrepancySummary {
  cashier_id: string;
  cashier_name: string;
  sessions_count: number;
  sessions_with_discrepancy: number;
  total_over_minor_units: number;
  total_short_minor_units: number;
  net_variance_minor_units: number;
  discrepancy_rate_basis_points: number;
}

export interface ExecutiveDashboardSummary {
  total_inventory_valuation_minor_units: number;
  active_variants_count: number;
  critical_stockout_items_count: number;
  dead_stock_capital_minor_units: number;
  today_revenue_minor_units: number;
  open_orders_count: number;
  active_registers_count: number;
  inventory_turnover_dio: number;
}
