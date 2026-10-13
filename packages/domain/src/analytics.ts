// ============================================================================
// STOKROVA — Advanced Inventory Analytics & Intelligence Domain Logic
// Benchmark: SAP IBP, NetSuite Analytics Warehouse, Odoo Enterprise BI
// Rule 26: Pure integer arithmetic, zero float drift, basis points precision
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

/**
 * Calculates ABC Inventory Classification according to cumulative Pareto distribution.
 * Class A: Top 80% (<= 8000 bp)
 * Class B: Next 15% (8001 - 9500 bp)
 * Class C: Bottom 5% (> 9500 bp)
 */
export function calculateAbcClassification(
  items: AbcItemInput[],
  criterion: AbcAnalysisCriterion = 'REVENUE'
): AbcAnalysisResult {
  if (!items || items.length === 0) {
    return {
      criterion,
      total_items: 0,
      total_value: 0,
      a_items_count: 0,
      b_items_count: 0,
      c_items_count: 0,
      a_items_value: 0,
      b_items_value: 0,
      c_items_value: 0,
      items: [],
    };
  }

  // Validate values are non-negative integers
  for (const item of items) {
    if (item.value < 0 || !Number.isInteger(item.value)) {
      throw new Error(`Invalid item value for SKU ${item.sku}: must be a non-negative integer`);
    }
  }

  // Sort descending by value; tie-break by SKU ascending for deterministic ordering
  const sorted = [...items].sort((a, b) => {
    if (b.value !== a.value) {
      return b.value - a.value;
    }
    return a.sku.localeCompare(b.sku);
  });

  const total_value = sorted.reduce((sum: number, item: AbcItemInput) => sum + item.value, 0);

  let cumulative_value = 0;
  let a_count = 0;
  let b_count = 0;
  let c_count = 0;
  let a_val = 0;
  let b_val = 0;
  let c_val = 0;

  const classifiedItems: AbcItemClassification[] = sorted.map((item, index) => {
    cumulative_value += item.value;
    const rank = index + 1;

    let share_basis_points = 0;
    let cumulative_share_basis_points = 0;
    let abc_class: AbcClass = 'C';

    if (total_value > 0) {
      share_basis_points = Math.round((item.value * 10000) / total_value);
      cumulative_share_basis_points = Math.min(
        10000,
        Math.round((cumulative_value * 10000) / total_value)
      );

      if (cumulative_share_basis_points <= 8000) {
        abc_class = 'A';
      } else if (cumulative_share_basis_points <= 9500) {
        abc_class = 'B';
      } else {
        abc_class = 'C';
      }
    } else {
      // If all items have zero value, all belong to Class C
      abc_class = 'C';
      cumulative_share_basis_points = 10000;
    }

    if (abc_class === 'A') {
      a_count++;
      a_val += item.value;
    } else if (abc_class === 'B') {
      b_count++;
      b_val += item.value;
    } else {
      c_count++;
      c_val += item.value;
    }

    return {
      ...item,
      rank,
      cumulative_value,
      share_basis_points,
      cumulative_share_basis_points,
      abc_class,
    };
  });

  return {
    criterion,
    total_items: classifiedItems.length,
    total_value,
    a_items_count: a_count,
    b_items_count: b_count,
    c_items_count: c_count,
    a_items_value: a_val,
    b_items_value: b_val,
    c_items_value: c_val,
    items: classifiedItems,
  };
}

/**
 * Calculates Dead Stock Aging and carrying holding costs in integer minor units.
 */
export function calculateDeadStockAndCarryingCost(
  items: DeadStockItemInput[]
): DeadStockReport {
  if (!items || items.length === 0) {
    return {
      total_items_analyzed: 0,
      total_dead_stock_items: 0,
      total_tied_up_capital_minor_units: 0,
      total_annual_holding_cost_minor_units: 0,
      items: [],
    };
  }

  let total_dead_stock_items = 0;
  let total_tied_up_capital = 0;
  let total_annual_holding_cost = 0;

  const analyzedItems: DeadStockItem[] = items.map((item) => {
    if (item.on_hand_quantity < 0 || !Number.isInteger(item.on_hand_quantity)) {
      throw new Error(`Invalid on_hand_quantity for SKU ${item.sku}`);
    }
    if (item.unit_cost_minor_units < 0 || !Number.isInteger(item.unit_cost_minor_units)) {
      throw new Error(`Invalid unit_cost_minor_units for SKU ${item.sku}`);
    }
    if (item.days_inactive < 0 || !Number.isInteger(item.days_inactive)) {
      throw new Error(`Invalid days_inactive for SKU ${item.sku}`);
    }

    const tied_up_capital_minor_units =
      item.on_hand_quantity * item.unit_cost_minor_units;

    // Default holding rate: 2000 bp = 20.00% p.a.
    const holding_rate_bps = item.holding_cost_annual_basis_points ?? 2000;

    // Pro-rated holding cost = (tied_up_capital * holding_bps * days_inactive) / (365 * 10000)
    const holding_cost_minor_units =
      tied_up_capital_minor_units > 0 && item.days_inactive > 0
        ? Math.round(
            (tied_up_capital_minor_units * holding_rate_bps * item.days_inactive) /
              (365 * 10000)
          )
        : 0;

    let aging_tier: InventoryAgingTier = 'ACTIVE';
    let recommended_action: DeadStockAction = 'NONE';

    if (item.days_inactive < 30) {
      aging_tier = 'ACTIVE';
      recommended_action = 'NONE';
    } else if (item.days_inactive < 90) {
      aging_tier = 'SLOW_MOVING';
      recommended_action = 'PROMOTIONAL_MARKDOWN';
    } else if (item.days_inactive < 180) {
      aging_tier = 'STAGNANT';
      recommended_action = 'BUNDLE_LIQUIDATION';
    } else {
      aging_tier = 'DEAD_STOCK';
      total_dead_stock_items++;
      // High-capital dead stock (> 100,000 minor units) should consider write-off/scrap
      recommended_action =
        tied_up_capital_minor_units > 100000 ? 'WRITE_OFF_SCRAP' : 'BUNDLE_LIQUIDATION';
    }

    total_tied_up_capital += tied_up_capital_minor_units;
    total_annual_holding_cost += holding_cost_minor_units;

    return {
      variant_id: item.variant_id,
      sku: item.sku,
      warehouse_id: item.warehouse_id,
      on_hand_quantity: item.on_hand_quantity,
      unit_cost_minor_units: item.unit_cost_minor_units,
      tied_up_capital_minor_units,
      days_inactive: item.days_inactive,
      holding_cost_minor_units,
      aging_tier,
      recommended_action,
    };
  });

  return {
    total_items_analyzed: analyzedItems.length,
    total_dead_stock_items,
    total_tied_up_capital_minor_units: total_tied_up_capital,
    total_annual_holding_cost_minor_units: total_annual_holding_cost,
    items: analyzedItems,
  };
}

/**
 * Calculates Demand Forecasting using SMA, WMA, or Exponential Smoothing.
 */
export function calculateDemandForecast(
  input: DemandForecastInput
): DemandForecastProjection {
  const { historical_demands, method } = input;

  if (!historical_demands || historical_demands.length === 0) {
    throw new Error('Historical demand periods must contain at least 1 observation');
  }

  for (const demand of historical_demands) {
    if (demand < 0 || !Number.isInteger(demand)) {
      throw new Error('Historical demands must be non-negative integers');
    }
  }

  const horizon = input.forecast_horizon_periods ?? 1;
  if (horizon <= 0 || !Number.isInteger(horizon)) {
    throw new Error('Forecast horizon periods must be a positive integer');
  }

  const n = historical_demands.length;
  const sumDemands = historical_demands.reduce((sum: number, d: number) => sum + d, 0);
  const historical_mean = Math.round(sumDemands / n);

  let baselineNextPeriod = 0;
  const fits: number[] = [];

  if (method === 'SIMPLE_MOVING_AVERAGE') {
    baselineNextPeriod = historical_mean;
    // Fit is mean for all points
    for (let i = 0; i < n; i++) {
      fits.push(historical_mean);
    }
  } else if (method === 'WEIGHTED_MOVING_AVERAGE') {
    const rawWeights =
      input.weights ?? historical_demands.map((_: number, i: number) => i + 1);
    if (rawWeights.length !== n) {
      throw new Error(`Weights length (${rawWeights.length}) must match history length (${n})`);
    }
    const weightSum = rawWeights.reduce((sum: number, w: number) => sum + w, 0);
    if (weightSum <= 0) {
      throw new Error('Sum of weights must be positive');
    }

    const weightedSum = historical_demands.reduce(
      (sum: number, d: number, i: number) => sum + d * rawWeights[i]!,
      0
    );
    baselineNextPeriod = Math.round(weightedSum / weightSum);
    for (let i = 0; i < n; i++) {
      fits.push(baselineNextPeriod);
    }
  } else if (method === 'EXPONENTIAL_SMOOTHING') {
    const alphaBps = input.alpha_basis_points ?? 2000; // default 0.20
    if (alphaBps < 0 || alphaBps > 10000) {
      throw new Error('Alpha basis points must be between 0 and 10000');
    }

    let smoothed = historical_demands[0]!;
    fits.push(smoothed);

    for (let i = 1; i < n; i++) {
      const current = historical_demands[i]!;
      smoothed = Math.round((alphaBps * current + (10000 - alphaBps) * smoothed) / 10000);
      fits.push(smoothed);
    }
    baselineNextPeriod = smoothed;
  }

  // Generate projections for horizon periods
  const projected_demands: number[] = [];
  for (let h = 0; h < horizon; h++) {
    projected_demands.push(baselineNextPeriod);
  }

  // Calculate Mean Absolute Deviation (MAD) & Tracking Signal
  let sumAbsoluteError = 0;
  let cumulativeForecastError = 0;

  for (let i = 0; i < n; i++) {
    const actual = historical_demands[i]!;
    const fit = fits[i]!;
    const error = actual - fit;
    sumAbsoluteError += Math.abs(error);
    cumulativeForecastError += error;
  }

  const mean_absolute_deviation = Math.round(sumAbsoluteError / n);
  const tracking_signal =
    mean_absolute_deviation > 0
      ? Math.round((cumulativeForecastError * 100) / mean_absolute_deviation)
      : 0;

  // Stockout Risk Score (0 to 100)
  const leadTime = input.lead_time_periods ?? 1;
  const expectedLeadDemand = baselineNextPeriod * leadTime;
  const onHand = input.current_on_hand ?? 0;

  let stockout_risk_score = 0;
  if (onHand <= 0 && expectedLeadDemand > 0) {
    stockout_risk_score = 100;
  } else if (expectedLeadDemand === 0) {
    stockout_risk_score = 0;
  } else if (onHand < expectedLeadDemand) {
    const deficitBps = Math.round(((expectedLeadDemand - onHand) * 100) / expectedLeadDemand);
    stockout_risk_score = Math.min(100, Math.max(0, deficitBps));
  } else if (onHand < expectedLeadDemand * 2) {
    // Low buffer
    stockout_risk_score = 25;
  } else {
    // Safe stock
    stockout_risk_score = 0;
  }

  return {
    variant_id: input.variant_id,
    method,
    historical_mean,
    projected_demands,
    mean_absolute_deviation,
    tracking_signal,
    stockout_risk_score,
  };
}

/**
 * Calculates Inventory Turnover Ratio (ITR), Days Inventory Outstanding (DIO), and GMROI.
 */
export function calculateInventoryTurnoverAndDio(
  input: InventoryTurnoverInput
): InventoryTurnoverMetrics {
  const {
    annualized_cogs_minor_units,
    average_inventory_value_minor_units,
    gross_margin_minor_units,
  } = input;

  if (
    annualized_cogs_minor_units < 0 ||
    average_inventory_value_minor_units < 0
  ) {
    throw new Error('COGS and average inventory value must be non-negative integers');
  }

  if (average_inventory_value_minor_units === 0) {
    return {
      annualized_cogs_minor_units,
      average_inventory_value_minor_units,
      turnover_ratio_basis_points: 0,
      days_inventory_outstanding: 0,
      gross_margin_minor_units,
      gmroi_basis_points: 0,
    };
  }

  // Turnover ratio in bps = (COGS * 10000) / Average Inventory
  const turnover_ratio_basis_points = Math.round(
    (annualized_cogs_minor_units * 10000) / average_inventory_value_minor_units
  );

  // DIO = (365 * 10000) / Turnover ratio bps
  const days_inventory_outstanding =
    turnover_ratio_basis_points > 0
      ? Math.round((365 * 10000) / turnover_ratio_basis_points)
      : 999;

  // GMROI bps = (Gross Margin * 10000) / Average Inventory
  const gmroi_basis_points = Math.round(
    (gross_margin_minor_units * 10000) / average_inventory_value_minor_units
  );

  return {
    annualized_cogs_minor_units,
    average_inventory_value_minor_units,
    turnover_ratio_basis_points,
    days_inventory_outstanding,
    gross_margin_minor_units,
    gmroi_basis_points,
  };
}

/**
 * Aggregates till session discrepancy records by cashier.
 */
export function calculateCashierDiscrepancyMetrics(
  sessions: CashierSessionDiscrepancyInput[]
): CashierDiscrepancySummary[] {
  if (!sessions || sessions.length === 0) {
    return [];
  }

  const map = new Map<
    string,
    {
      cashier_id: string;
      cashier_name: string;
      sessions_count: number;
      sessions_with_discrepancy: number;
      total_over: number;
      total_short: number;
    }
  >();

  for (const session of sessions) {
    let entry = map.get(session.cashier_id);
    if (!entry) {
      entry = {
        cashier_id: session.cashier_id,
        cashier_name: session.cashier_name,
        sessions_count: 0,
        sessions_with_discrepancy: 0,
        total_over: 0,
        total_short: 0,
      };
      map.set(session.cashier_id, entry);
    }

    entry.sessions_count++;
    const variance =
      session.actual_closing_minor_units - session.expected_closing_minor_units;

    if (variance !== 0) {
      entry.sessions_with_discrepancy++;
      if (variance > 0) {
        entry.total_over += variance;
      } else {
        entry.total_short += Math.abs(variance);
      }
    }
  }

  return Array.from(map.values())
    .map((e) => {
      const discrepancy_rate_basis_points =
        e.sessions_count > 0
          ? Math.round((e.sessions_with_discrepancy * 10000) / e.sessions_count)
          : 0;

      return {
        cashier_id: e.cashier_id,
        cashier_name: e.cashier_name,
        sessions_count: e.sessions_count,
        sessions_with_discrepancy: e.sessions_with_discrepancy,
        total_over_minor_units: e.total_over,
        total_short_minor_units: e.total_short,
        net_variance_minor_units: e.total_over - e.total_short,
        discrepancy_rate_basis_points,
      };
    })
    .sort((a, b) => b.discrepancy_rate_basis_points - a.discrepancy_rate_basis_points);
}
