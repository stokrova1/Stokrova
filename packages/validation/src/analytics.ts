// ============================================================================
// STOKROVA — Advanced Inventory Analytics & Intelligence Validation Schemas
// Benchmark: SAP IBP, NetSuite Analytics Warehouse, Odoo Enterprise BI
// ============================================================================

import { z } from 'zod';

export const runAbcAnalysisSchema = z.object({
  criterion: z
    .enum(['REVENUE', 'QUANTITY_VELOCITY', 'PROFIT_MARGIN'])
    .default('REVENUE'),
  items: z.array(
    z.object({
      variant_id: z.string().min(1, 'variant_id is required'),
      sku: z.string().min(1, 'sku is required'),
      name: z.string().min(1, 'name is required'),
      value: z.number().int().nonnegative('value must be a non-negative integer'),
    })
  ),
});

export const getDeadStockQuerySchema = z.object({
  warehouse_id: z.string().uuid().optional(),
  inactivity_threshold_days: z.coerce.number().int().positive().default(180),
  holding_cost_annual_basis_points: z.coerce.number().int().min(0).max(10000).default(2000),
});

export const generateDemandForecastSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  method: z.enum([
    'SIMPLE_MOVING_AVERAGE',
    'WEIGHTED_MOVING_AVERAGE',
    'EXPONENTIAL_SMOOTHING',
  ]),
  historical_demands: z
    .array(z.number().int().nonnegative('Historical demand must be non-negative'))
    .min(1, 'At least 1 historical observation is required'),
  weights: z.array(z.number().int().positive()).optional(),
  alpha_basis_points: z.number().int().min(0).max(10000).optional(),
  forecast_horizon_periods: z.number().int().positive().max(52).default(1),
  lead_time_periods: z.number().int().positive().default(1),
  current_on_hand: z.number().int().nonnegative().default(0),
});

export const getTurnoverMetricsQuerySchema = z.object({
  annualized_cogs_minor_units: z.coerce.number().int().nonnegative(),
  average_inventory_value_minor_units: z.coerce.number().int().nonnegative(),
  gross_margin_minor_units: z.coerce.number().int(),
});

export const getCashierDiscrepancyQuerySchema = z.object({
  branch_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const getExecutiveDashboardQuerySchema = z.object({
  company_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
});

export type RunAbcAnalysisDto = z.infer<typeof runAbcAnalysisSchema>;
export type GetDeadStockQueryDto = z.infer<typeof getDeadStockQuerySchema>;
export type GenerateDemandForecastDto = z.infer<typeof generateDemandForecastSchema>;
export type GetTurnoverMetricsQueryDto = z.infer<typeof getTurnoverMetricsQuerySchema>;
export type GetCashierDiscrepancyQueryDto = z.infer<typeof getCashierDiscrepancyQuerySchema>;
export type GetExecutiveDashboardQueryDto = z.infer<typeof getExecutiveDashboardQuerySchema>;
