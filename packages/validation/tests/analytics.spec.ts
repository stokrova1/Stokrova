import { describe, expect, it } from 'vitest';
import {
  generateDemandForecastSchema,
  getCashierDiscrepancyQuerySchema,
  getDeadStockQuerySchema,
  getExecutiveDashboardQuerySchema,
  getTurnoverMetricsQuerySchema,
  runAbcAnalysisSchema,
} from '../src/analytics.js';

describe('Phase 12: Analytics Validation Schemas', () => {
  describe('runAbcAnalysisSchema', () => {
    it('should validate valid ABC analysis payload', () => {
      const payload = {
        criterion: 'REVENUE',
        items: [
          {
            variant_id: 'var-1',
            sku: 'SKU-001',
            name: 'Item 1',
            value: 5000,
          },
        ],
      };

      const result = runAbcAnalysisSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject negative value or missing SKU', () => {
      const payload = {
        criterion: 'REVENUE',
        items: [
          {
            variant_id: 'var-1',
            sku: '',
            name: 'Item 1',
            value: -50,
          },
        ],
      };

      const result = runAbcAnalysisSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('generateDemandForecastSchema', () => {
    it('should validate valid demand forecasting inputs with defaults', () => {
      const payload = {
        variant_id: 'var-123',
        method: 'EXPONENTIAL_SMOOTHING',
        historical_demands: [10, 20, 30],
        alpha_basis_points: 2500,
      };

      const result = generateDemandForecastSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forecast_horizon_periods).toBe(1);
        expect(result.data.lead_time_periods).toBe(1);
        expect(result.data.current_on_hand).toBe(0);
      }
    });

    it('should reject empty historical demands', () => {
      const payload = {
        variant_id: 'var-123',
        method: 'SIMPLE_MOVING_AVERAGE',
        historical_demands: [],
      };

      const result = generateDemandForecastSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('getDeadStockQuerySchema', () => {
    it('should apply defaults for dead stock queries', () => {
      const result = getDeadStockQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inactivity_threshold_days).toBe(180);
        expect(result.data.holding_cost_annual_basis_points).toBe(2000);
      }
    });
  });

  describe('getTurnoverMetricsQuerySchema', () => {
    it('should validate non-negative turnover parameters', () => {
      const payload = {
        annualized_cogs_minor_units: 500000,
        average_inventory_value_minor_units: 100000,
        gross_margin_minor_units: 250000,
      };

      const result = getTurnoverMetricsQuerySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject negative COGS or average inventory', () => {
      const payload = {
        annualized_cogs_minor_units: -10,
        average_inventory_value_minor_units: 100000,
        gross_margin_minor_units: 0,
      };

      const result = getTurnoverMetricsQuerySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('getExecutiveDashboardQuerySchema', () => {
    it('should allow optional valid uuid filters', () => {
      const valid = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(getExecutiveDashboardQuerySchema.safeParse(valid).success).toBe(true);
      expect(getExecutiveDashboardQuerySchema.safeParse({}).success).toBe(true);
    });
  });
});
