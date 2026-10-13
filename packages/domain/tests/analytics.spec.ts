import { describe, expect, it } from 'vitest';
import {
  calculateAbcClassification,
  calculateCashierDiscrepancyMetrics,
  calculateDeadStockAndCarryingCost,
  calculateDemandForecast,
  calculateInventoryTurnoverAndDio,
} from '../src/analytics.js';
import type {
  AbcItemInput,
  CashierSessionDiscrepancyInput,
  DeadStockItemInput,
  DemandForecastInput,
  InventoryTurnoverInput,
} from '@stokrova/contracts';

describe('Phase 12: Advanced Inventory Analytics & Intelligence Domain Engine', () => {
  describe('Phase 12A: ABC Inventory & Velocity Classification', () => {
    it('should return empty result for empty items array', () => {
      const result = calculateAbcClassification([], 'REVENUE');
      expect(result.total_items).toBe(0);
      expect(result.total_value).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should correctly classify items into A, B, and C tiers according to Pareto distribution', () => {
      const items: AbcItemInput[] = [
        { variant_id: 'v1', sku: 'SKU-TOP-1', name: 'High Value 1', value: 7000 },
        { variant_id: 'v2', sku: 'SKU-TOP-2', name: 'High Value 2', value: 1000 },
        { variant_id: 'v3', sku: 'SKU-MID-1', name: 'Medium Value 1', value: 1000 },
        { variant_id: 'v4', sku: 'SKU-LOW-1', name: 'Low Value 1', value: 500 },
        { variant_id: 'v5', sku: 'SKU-LOW-2', name: 'Low Value 2', value: 500 },
      ]; // Total: 10,000

      const result = calculateAbcClassification(items, 'REVENUE');
      expect(result.total_value).toBe(10000);
      expect(result.total_items).toBe(5);

      // Rank 1: SKU-TOP-1 (7000 / 10000 = 70% <= 80%) -> Class A
      expect(result.items[0]?.sku).toBe('SKU-TOP-1');
      expect(result.items[0]?.abc_class).toBe('A');
      expect(result.items[0]?.cumulative_share_basis_points).toBe(7000);

      // Rank 2: SKU-TOP-2 (cumulative: 8000 / 10000 = 80% <= 80%) -> Class A
      expect(result.items[1]?.sku).toBe('SKU-MID-1'); // Tie break by SKU alphabetical: SKU-MID-1 vs SKU-TOP-2
      expect(result.items[1]?.abc_class).toBe('A');
      expect(result.items[1]?.cumulative_share_basis_points).toBe(8000);

      // Rank 3: SKU-TOP-2 (cumulative: 9000 / 10000 = 90% <= 95%) -> Class B
      expect(result.items[2]?.sku).toBe('SKU-TOP-2');
      expect(result.items[2]?.abc_class).toBe('B');

      // Rank 4 & 5: Bottom items -> Class C
      expect(result.items[3]?.abc_class).toBe('B'); // 9500 bp <= 9500 -> Class B
      expect(result.items[4]?.abc_class).toBe('C'); // 10000 bp > 9500 -> Class C
    });

    it('should assign class C to all items when total value is zero', () => {
      const items: AbcItemInput[] = [
        { variant_id: 'v1', sku: 'SKU-ZERO-1', name: 'Zero 1', value: 0 },
        { variant_id: 'v2', sku: 'SKU-ZERO-2', name: 'Zero 2', value: 0 },
      ];

      const result = calculateAbcClassification(items, 'QUANTITY_VELOCITY');
      expect(result.total_value).toBe(0);
      expect(result.c_items_count).toBe(2);
      expect(result.items.every((i) => i.abc_class === 'C')).toBe(true);
    });

    it('should throw an error for negative or non-integer values', () => {
      const invalid: AbcItemInput[] = [
        { variant_id: 'v1', sku: 'SKU-BAD', name: 'Bad', value: -100 },
      ];
      expect(() => calculateAbcClassification(invalid)).toThrow('non-negative integer');
    });
  });

  describe('Phase 12B: Dead Stock & Carrying Cost Pipeline', () => {
    it('should return empty report when items array is empty', () => {
      const report = calculateDeadStockAndCarryingCost([]);
      expect(report.total_items_analyzed).toBe(0);
      expect(report.total_dead_stock_items).toBe(0);
      expect(report.total_tied_up_capital_minor_units).toBe(0);
    });

    it('should classify aging tiers and compute integer holding costs', () => {
      const items: DeadStockItemInput[] = [
        {
          variant_id: 'v1',
          sku: 'SKU-ACT',
          warehouse_id: 'wh-1',
          on_hand_quantity: 10,
          unit_cost_minor_units: 1000, // Tied up: 10,000 cents ($100)
          days_inactive: 10,
          holding_cost_annual_basis_points: 2000, // 20%
        },
        {
          variant_id: 'v2',
          sku: 'SKU-SLOW',
          warehouse_id: 'wh-1',
          on_hand_quantity: 5,
          unit_cost_minor_units: 2000, // Tied up: 10,000 cents ($100)
          days_inactive: 45,
          holding_cost_annual_basis_points: 2000,
        },
        {
          variant_id: 'v3',
          sku: 'SKU-STAG',
          warehouse_id: 'wh-1',
          on_hand_quantity: 20,
          unit_cost_minor_units: 500, // Tied up: 10,000 cents ($100)
          days_inactive: 120,
          holding_cost_annual_basis_points: 2000,
        },
        {
          variant_id: 'v4',
          sku: 'SKU-DEAD',
          warehouse_id: 'wh-1',
          on_hand_quantity: 15,
          unit_cost_minor_units: 8000, // Tied up: 120,000 cents ($1,200)
          days_inactive: 200,
          holding_cost_annual_basis_points: 2000,
        },
      ];

      const report = calculateDeadStockAndCarryingCost(items);
      expect(report.total_items_analyzed).toBe(4);
      expect(report.total_dead_stock_items).toBe(1);
      expect(report.total_tied_up_capital_minor_units).toBe(150000);

      // SKU-ACT: < 30 days -> ACTIVE, NONE
      expect(report.items[0]?.aging_tier).toBe('ACTIVE');
      expect(report.items[0]?.recommended_action).toBe('NONE');

      // SKU-SLOW: 45 days -> SLOW_MOVING, PROMOTIONAL_MARKDOWN
      expect(report.items[1]?.aging_tier).toBe('SLOW_MOVING');
      expect(report.items[1]?.recommended_action).toBe('PROMOTIONAL_MARKDOWN');

      // SKU-STAG: 120 days -> STAGNANT, BUNDLE_LIQUIDATION
      expect(report.items[2]?.aging_tier).toBe('STAGNANT');
      expect(report.items[2]?.recommended_action).toBe('BUNDLE_LIQUIDATION');

      // SKU-DEAD: 200 days, capital > 100,000 -> DEAD_STOCK, WRITE_OFF_SCRAP
      expect(report.items[3]?.aging_tier).toBe('DEAD_STOCK');
      expect(report.items[3]?.recommended_action).toBe('WRITE_OFF_SCRAP');
      expect(report.items[3]?.holding_cost_minor_units).toBeGreaterThan(0);
    });

    it('should throw when quantities or unit costs are negative', () => {
      const invalid: DeadStockItemInput[] = [
        {
          variant_id: 'v1',
          sku: 'SKU-INV',
          warehouse_id: 'wh-1',
          on_hand_quantity: -5,
          unit_cost_minor_units: 100,
          days_inactive: 10,
        },
      ];
      expect(() => calculateDeadStockAndCarryingCost(invalid)).toThrow('on_hand_quantity');
    });
  });

  describe('Phase 12C: Demand Forecasting Engine', () => {
    it('should accurately calculate Simple Moving Average and error metrics', () => {
      const input: DemandForecastInput = {
        variant_id: 'var-1',
        historical_demands: [10, 20, 30, 40],
        method: 'SIMPLE_MOVING_AVERAGE',
        forecast_horizon_periods: 2,
        lead_time_periods: 1,
        current_on_hand: 50,
      };

      const forecast = calculateDemandForecast(input);
      expect(forecast.method).toBe('SIMPLE_MOVING_AVERAGE');
      expect(forecast.historical_mean).toBe(25);
      expect(forecast.projected_demands).toEqual([25, 25]);
      expect(forecast.mean_absolute_deviation).toBeGreaterThan(0);
      expect(forecast.stockout_risk_score).toBe(0); // 50 on hand >= 25 * 2
    });

    it('should calculate Weighted Moving Average prioritizing recent demand', () => {
      const input: DemandForecastInput = {
        variant_id: 'var-1',
        historical_demands: [10, 20, 30],
        method: 'WEIGHTED_MOVING_AVERAGE',
        weights: [1, 2, 3], // total weights = 6. Weighted sum: 10*1 + 20*2 + 30*3 = 140. 140/6 = 23.33 -> 23
        forecast_horizon_periods: 1,
      };

      const forecast = calculateDemandForecast(input);
      expect(forecast.method).toBe('WEIGHTED_MOVING_AVERAGE');
      expect(forecast.projected_demands[0]).toBe(23);
    });

    it('should calculate Single Exponential Smoothing with specified alpha basis points', () => {
      const input: DemandForecastInput = {
        variant_id: 'var-1',
        historical_demands: [100, 120, 150],
        method: 'EXPONENTIAL_SMOOTHING',
        alpha_basis_points: 3000, // 0.30
        forecast_horizon_periods: 1,
      };

      const forecast = calculateDemandForecast(input);
      expect(forecast.method).toBe('EXPONENTIAL_SMOOTHING');
      expect(forecast.projected_demands).toHaveLength(1);
      // t=0: S_0 = 100
      // t=1: S_1 = round((3000*120 + 7000*100) / 10000) = 106
      // t=2: S_2 = round((3000*150 + 7000*106) / 10000) = round((450000 + 742000) / 10000) = 119
      expect(forecast.projected_demands[0]).toBe(119);
    });

    it('should compute critical stockout risk when on hand is zero', () => {
      const input: DemandForecastInput = {
        variant_id: 'var-1',
        historical_demands: [20, 20],
        method: 'SIMPLE_MOVING_AVERAGE',
        current_on_hand: 0,
        lead_time_periods: 2,
      };

      const forecast = calculateDemandForecast(input);
      expect(forecast.stockout_risk_score).toBe(100);
    });
  });

  describe('Phase 12D: Inventory Turnover, DIO & Cashier Discrepancies', () => {
    it('should compute inventory turnover ratio, DIO, and GMROI accurately in integer math', () => {
      const input: InventoryTurnoverInput = {
        annualized_cogs_minor_units: 4000000, // $40,000
        average_inventory_value_minor_units: 1000000, // $10,000
        gross_margin_minor_units: 2000000, // $20,000
      };

      const metrics = calculateInventoryTurnoverAndDio(input);
      // Turnover = 40,000 / 10,000 = 4.00x = 40000 bp
      expect(metrics.turnover_ratio_basis_points).toBe(40000);
      // DIO = (365 * 10000) / 40000 = 91 days
      expect(metrics.days_inventory_outstanding).toBe(91);
      // GMROI = 20,000 / 10,000 = 2.00x = 20000 bp
      expect(metrics.gmroi_basis_points).toBe(20000);
    });

    it('should handle zero average inventory cleanly without divide-by-zero error', () => {
      const input: InventoryTurnoverInput = {
        annualized_cogs_minor_units: 100000,
        average_inventory_value_minor_units: 0,
        gross_margin_minor_units: 50000,
      };

      const metrics = calculateInventoryTurnoverAndDio(input);
      expect(metrics.turnover_ratio_basis_points).toBe(0);
      expect(metrics.days_inventory_outstanding).toBe(0);
      expect(metrics.gmroi_basis_points).toBe(0);
    });

    it('should aggregate cashier session discrepancies correctly', () => {
      const sessions: CashierSessionDiscrepancyInput[] = [
        {
          cashier_id: 'c1',
          cashier_name: 'Alice',
          opening_float_minor_units: 5000,
          expected_closing_minor_units: 20000,
          actual_closing_minor_units: 20500, // +500 over
        },
        {
          cashier_id: 'c1',
          cashier_name: 'Alice',
          opening_float_minor_units: 5000,
          expected_closing_minor_units: 15000,
          actual_closing_minor_units: 14700, // -300 short
        },
        {
          cashier_id: 'c2',
          cashier_name: 'Bob',
          opening_float_minor_units: 5000,
          expected_closing_minor_units: 10000,
          actual_closing_minor_units: 10000, // exact match
        },
      ];

      const summaries = calculateCashierDiscrepancyMetrics(sessions);
      expect(summaries).toHaveLength(2);

      // Alice had 2 sessions, both with discrepancy -> 100% discrepancy rate (10000 bp)
      const alice = summaries.find((s) => s.cashier_id === 'c1');
      expect(alice).toBeDefined();
      expect(alice?.sessions_count).toBe(2);
      expect(alice?.sessions_with_discrepancy).toBe(2);
      expect(alice?.total_over_minor_units).toBe(500);
      expect(alice?.total_short_minor_units).toBe(300);
      expect(alice?.net_variance_minor_units).toBe(200);
      expect(alice?.discrepancy_rate_basis_points).toBe(10000);

      // Bob had 1 session, zero discrepancy -> 0 bp
      const bob = summaries.find((s) => s.cashier_id === 'c2');
      expect(bob).toBeDefined();
      expect(bob?.sessions_count).toBe(1);
      expect(bob?.sessions_with_discrepancy).toBe(0);
      expect(bob?.net_variance_minor_units).toBe(0);
      expect(bob?.discrepancy_rate_basis_points).toBe(0);
    });
  });
});
