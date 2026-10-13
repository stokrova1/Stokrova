import { describe, it, expect } from 'vitest';
import {
  CreatePriceListSchema,
  CreatePriceListRuleSchema,
  CreateTaxRateSchema,
  CreateDiscountPromotionSchema,
  CalculateCartSchema,
} from '../src/pricing.js';

describe('Pricing Validation Schemas (Phase 3A)', () => {
  describe('CreatePriceListSchema', () => {
    it('validates price list creation payload', () => {
      const result = CreatePriceListSchema.safeParse({
        code: 'pl_vip',
        name: 'VIP Customer Pricelist',
        currency_code: 'usd',
        customer_group: 'VIP',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('PL_VIP');
        expect(result.data.currency_code).toBe('USD');
        expect(result.data.is_default).toBe(false);
      }
    });

    it('rejects invalid currency code length', () => {
      const result = CreatePriceListSchema.safeParse({
        code: 'PL_MAIN',
        name: 'Main',
        currency_code: 'USDD', // 4 letters
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreatePriceListRuleSchema', () => {
    it('validates volume tier rule with minor unit fixed price or discount bp', () => {
      const valid = CreatePriceListRuleSchema.safeParse({
        pricelist_id: 'pl_123',
        variant_id: 'var_456',
        min_quantity: 10,
        discount_percent_bp: 1500, // 15%
      });
      expect(valid.success).toBe(true);
    });

    it('rejects negative or floating point values', () => {
      const invalid = CreatePriceListRuleSchema.safeParse({
        pricelist_id: 'pl_123',
        variant_id: 'var_456',
        min_quantity: -1,
        fixed_price_minor: '12.50',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('CreateTaxRateSchema', () => {
    it('validates tax rate with inclusive and exclusive options', () => {
      const result = CreateTaxRateSchema.safeParse({
        code: 'vat_standard',
        name: 'Standard VAT 20%',
        rate_bp: 2000,
        inclusion_type: 'INCLUSIVE',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('VAT_STANDARD');
        expect(result.data.computation_type).toBe('PERCENTAGE');
      }
    });

    it('rejects negative basis points', () => {
      const result = CreateTaxRateSchema.safeParse({
        code: 'VAT_BAD',
        name: 'Bad VAT',
        rate_bp: -500,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateDiscountPromotionSchema', () => {
    it('validates coupon promotion payload', () => {
      const result = CreateDiscountPromotionSchema.safeParse({
        code: 'blackfriday',
        name: 'Black Friday 30%',
        discount_type: 'PERCENTAGE',
        value_minor_or_bp: '3000',
        max_discount_minor: '10000',
        min_subtotal_minor: '5000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('BLACKFRIDAY');
      }
    });
  });

  describe('CalculateCartSchema', () => {
    it('validates cart calculation payload with line items', () => {
      const result = CalculateCartSchema.safeParse({
        currency_code: 'USD',
        promo_code: 'save10',
        items: [
          {
            variant_id: 'var_1',
            quantity: 2,
            base_unit_price_minor: '5000',
            line_discount_percent_bp: 500,
            tax_rate_ids: ['tax_1'],
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.promo_code).toBe('SAVE10');
      }
    });

    it('rejects empty cart items array', () => {
      const result = CalculateCartSchema.safeParse({
        currency_code: 'USD',
        items: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
