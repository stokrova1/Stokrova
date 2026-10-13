import { describe, it, expect } from 'vitest';
import {
  CreateReplenishmentRuleSchema,
  UpdateReplenishmentRuleSchema,
  EvaluateReplenishmentSchema,
  ApproveRecommendationSchema,
  ConvertRecommendationSchema,
} from '../src/replenishment.js';

describe('Replenishment & Reorder Validation Schemas (Phase 8)', () => {
  describe('CreateReplenishmentRuleSchema', () => {
    it('validates a complete replenishment rule payload', () => {
      const valid = {
        warehouse_id: 'wh_main_01',
        variant_id: 'var_sku_101',
        sku: 'SKU-WIDGET-PRO',
        strategy: 'REORDER_POINT_SAFETY_STOCK',
        min_quantity: 20,
        max_quantity: 200,
        safety_stock: 30,
        reorder_point: 60,
        lead_time_days: 5,
        order_multiple: 12,
        min_order_quantity: 24,
        primary_vendor_id: 'vend_apex_1',
        preferred_sourcing: 'PURCHASE_ORDER',
        is_active: true,
      };

      const parsed = CreateReplenishmentRuleSchema.parse(valid);
      expect(parsed.warehouse_id).toBe('wh_main_01');
      expect(parsed.order_multiple).toBe(12);
      expect(parsed.preferred_sourcing).toBe('PURCHASE_ORDER');
    });

    it('applies standard defaults when optional fields omitted', () => {
      const minimal = {
        warehouse_id: 'wh_main_01',
        variant_id: 'var_sku_102',
        sku: 'SKU-BASIC',
        min_quantity: 5,
        max_quantity: 50,
      };

      const parsed = CreateReplenishmentRuleSchema.parse(minimal);
      expect(parsed.strategy).toBe('MIN_MAX');
      expect(parsed.safety_stock).toBe(0);
      expect(parsed.order_multiple).toBe(1);
      expect(parsed.preferred_sourcing).toBe('PURCHASE_ORDER');
      expect(parsed.is_active).toBe(true);
    });

    it('rejects non-positive max quantity', () => {
      const invalid = {
        warehouse_id: 'wh_main_01',
        variant_id: 'var_1',
        sku: 'SKU-1',
        min_quantity: 0,
        max_quantity: 0,
      };
      expect(() => CreateReplenishmentRuleSchema.parse(invalid)).toThrow();
    });
  });

  describe('UpdateReplenishmentRuleSchema', () => {
    it('validates partial update payloads', () => {
      const valid = {
        safety_stock: 45,
        reorder_point: 90,
        is_active: false,
      };
      const parsed = UpdateReplenishmentRuleSchema.parse(valid);
      expect(parsed.safety_stock).toBe(45);
      expect(parsed.is_active).toBe(false);
    });
  });

  describe('EvaluateReplenishmentSchema', () => {
    it('validates evaluation requests', () => {
      expect(
        EvaluateReplenishmentSchema.parse({
          warehouse_id: 'wh_1',
          variant_ids: ['var_1', 'var_2'],
        }),
      ).toBeDefined();

      expect(
        EvaluateReplenishmentSchema.parse({
          warehouse_id: 'wh_1',
        }),
      ).toBeDefined();

      expect(() => EvaluateReplenishmentSchema.parse({ warehouse_id: '' })).toThrow();
    });
  });

  describe('ApproveRecommendationSchema and ConvertRecommendationSchema', () => {
    it('validates approval and conversion payloads', () => {
      expect(
        ApproveRecommendationSchema.parse({
          override_quantity: 150,
          approved_by: 'usr_buyer_1',
          notes: 'Increasing batch for holiday promotions',
        }),
      ).toBeDefined();

      expect(
        ConvertRecommendationSchema.parse({
          operator_id: 'usr_ops_1',
          notes: 'Converting directly to PO',
        }),
      ).toBeDefined();
    });
  });
});
