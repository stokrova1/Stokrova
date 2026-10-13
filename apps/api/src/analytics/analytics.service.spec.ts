import { describe, expect, it, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service.js';
import { NotFoundException } from '@nestjs/common';
import type {
  CashierSessionDiscrepancyInput,
  DeadStockItemInput,
} from '@stokrova/contracts';

describe('Phase 12: AnalyticsService', () => {
  let service: AnalyticsService;
  const tenantId = 'tenant-test-123';
  const companyId = 'company-test-123';

  beforeEach(() => {
    service = new AnalyticsService();
  });

  describe('runAbcAnalysis & getAbcSnapshot', () => {
    it('should run ABC classification and store an auditable snapshot', async () => {
      const result = await service.runAbcAnalysis(tenantId, companyId, {
        criterion: 'REVENUE',
        items: [
          { variant_id: 'v1', sku: 'SKU-01', name: 'High Item', value: 8000 },
          { variant_id: 'v2', sku: 'SKU-02', name: 'Low Item', value: 2000 },
        ],
      });

      expect(result.total_items).toBe(2);
      expect(result.total_value).toBe(10000);
      expect(result.a_items_count).toBe(1);
      expect(result.items[0]?.abc_class).toBe('A');
    });

    it('should throw NotFoundException when snapshot does not exist', async () => {
      await expect(
        service.getAbcSnapshot(tenantId, 'non-existent-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeadStockReport', () => {
    it('should evaluate dead stock and calculate carrying costs', async () => {
      const items: DeadStockItemInput[] = [
        {
          variant_id: 'v1',
          sku: 'SKU-ACTIVE',
          warehouse_id: 'wh-1',
          on_hand_quantity: 10,
          unit_cost_minor_units: 1000,
          days_inactive: 15,
        },
        {
          variant_id: 'v2',
          sku: 'SKU-DEAD',
          warehouse_id: 'wh-1',
          on_hand_quantity: 20,
          unit_cost_minor_units: 6000,
          days_inactive: 210,
        },
      ];

      const report = await service.getDeadStockReport(
        tenantId,
        companyId,
        {
          inactivity_threshold_days: 180,
          holding_cost_annual_basis_points: 2000,
        },
        items
      );

      expect(report.total_items_analyzed).toBe(2);
      expect(report.total_dead_stock_items).toBe(1);
      expect(report.items[1]?.aging_tier).toBe('DEAD_STOCK');
      expect(report.items[1]?.recommended_action).toBe('WRITE_OFF_SCRAP');
    });
  });

  describe('generateDemandForecast', () => {
    it('should generate demand forecast using Simple Moving Average', async () => {
      const projection = await service.generateDemandForecast(tenantId, companyId, {
        variant_id: 'v1',
        method: 'SIMPLE_MOVING_AVERAGE',
        historical_demands: [50, 60, 70],
        forecast_horizon_periods: 2,
        lead_time_periods: 1,
        current_on_hand: 200,
      });

      expect(projection.method).toBe('SIMPLE_MOVING_AVERAGE');
      expect(projection.historical_mean).toBe(60);
      expect(projection.projected_demands).toEqual([60, 60]);
      expect(projection.stockout_risk_score).toBe(0);
    });

    it('should generate demand forecast using Exponential Smoothing', async () => {
      const projection = await service.generateDemandForecast(tenantId, companyId, {
        variant_id: 'v2',
        method: 'EXPONENTIAL_SMOOTHING',
        historical_demands: [100, 110, 120],
        alpha_basis_points: 2000,
        forecast_horizon_periods: 1,
        lead_time_periods: 1,
        current_on_hand: 200,
      });

      expect(projection.method).toBe('EXPONENTIAL_SMOOTHING');
      expect(projection.projected_demands).toHaveLength(1);
      expect(projection.projected_demands[0]).toBeGreaterThan(0);
    });
  });

  describe('getInventoryTurnover', () => {
    it('should compute turnover, DIO, and GMROI', async () => {
      const turnover = await service.getInventoryTurnover(tenantId, companyId, {
        annualized_cogs_minor_units: 3650000,
        average_inventory_value_minor_units: 1000000,
        gross_margin_minor_units: 1500000,
      });

      expect(turnover.turnover_ratio_basis_points).toBe(36500);
      expect(turnover.days_inventory_outstanding).toBe(100);
      expect(turnover.gmroi_basis_points).toBe(15000);
    });
  });

  describe('getCashierDiscrepancies', () => {
    it('should aggregate cashier sessions and compute discrepancy rate', async () => {
      const sessions: CashierSessionDiscrepancyInput[] = [
        {
          cashier_id: 'cashier-1',
          cashier_name: 'Bob',
          opening_float_minor_units: 10000,
          expected_closing_minor_units: 50000,
          actual_closing_minor_units: 49500, // -500
        },
        {
          cashier_id: 'cashier-1',
          cashier_name: 'Bob',
          opening_float_minor_units: 10000,
          expected_closing_minor_units: 30000,
          actual_closing_minor_units: 30000, // exact
        },
      ];

      const summaries = await service.getCashierDiscrepancies(
        tenantId,
        companyId,
        {},
        sessions
      );

      expect(summaries).toHaveLength(1);
      expect(summaries[0]?.sessions_count).toBe(2);
      expect(summaries[0]?.sessions_with_discrepancy).toBe(1);
      expect(summaries[0]?.discrepancy_rate_basis_points).toBe(5000); // 50%
      expect(summaries[0]?.total_short_minor_units).toBe(500);
    });
  });

  describe('getExecutiveDashboard', () => {
    it('should return aggregated executive KPIs', async () => {
      service.addDeadStockItems([
        {
          variant_id: 'v1',
          sku: 'SKU-01',
          warehouse_id: 'wh-1',
          on_hand_quantity: 10,
          unit_cost_minor_units: 2500,
          days_inactive: 10,
        },
      ]);

      const dashboard = await service.getExecutiveDashboard(tenantId, companyId, {});
      expect(dashboard.active_variants_count).toBe(1);
      expect(dashboard.total_inventory_valuation_minor_units).toBe(25000);
      expect(dashboard.critical_stockout_items_count).toBe(0);
      expect(dashboard.inventory_turnover_dio).toBe(45);
    });
  });
});
