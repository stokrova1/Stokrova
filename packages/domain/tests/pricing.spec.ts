import { describe, it, expect } from 'vitest';
import {
  calculateBasisPointsAmount,
  calculateTaxAmount,
  resolveEffectiveUnitPrice,
  evaluatePromotionDiscount,
  calculateCart,
  DomainTaxRate,
  DomainPriceListRule,
  DomainDiscountPromotion,
  DomainCartItemInput,
} from '../src/pricing.js';

describe('Pricing & Cart Calculation Domain Engine (Phase 3A)', () => {
  describe('Basis Points & Tax Calculations', () => {
    it('calculates basis points amounts with half-up rounding', () => {
      // $100.00 (10000 minor) * 7.5% (750 bp) = $7.50 (750 minor)
      expect(calculateBasisPointsAmount(10000n, 750)).toBe(750n);

      // $33.33 (3333 minor) * 10% (1000 bp) = 333.3 -> rounds to 333
      expect(calculateBasisPointsAmount(3333n, 1000)).toBe(333n);

      // Zero or negative basis points returns 0n
      expect(calculateBasisPointsAmount(5000n, 0)).toBe(0n);
      expect(calculateBasisPointsAmount(5000n, -50)).toBe(0n);
    });

    it('calculates exclusive and inclusive percentage taxes accurately', () => {
      const exclusiveVat: DomainTaxRate = {
        id: 'tax_1',
        code: 'VAT20_EXCL',
        name: 'VAT 20% Exclusive',
        rate_bp: 2000,
        computation_type: 'PERCENTAGE',
        inclusion_type: 'EXCLUSIVE',
      };

      const inclusiveVat: DomainTaxRate = {
        id: 'tax_2',
        code: 'VAT20_INCL',
        name: 'VAT 20% Inclusive',
        rate_bp: 2000,
        computation_type: 'PERCENTAGE',
        inclusion_type: 'INCLUSIVE',
      };

      // Base: $100.00 (10000 minor)
      // Exclusive tax = $20.00 (2000 minor)
      expect(calculateTaxAmount(10000n, exclusiveVat)).toBe(2000n);

      // Gross: $120.00 (12000 minor) which includes 20% VAT
      // Net = 12000 * 10000 / 12000 = 10000
      // Embedded Tax = 12000 - 10000 = 2000 ($20.00)
      expect(calculateTaxAmount(12000n, inclusiveVat)).toBe(2000n);
    });

    it('calculates fixed fee per unit tax', () => {
      const ecoFee: DomainTaxRate = {
        id: 'tax_3',
        code: 'ECO_FEE',
        name: 'E-Waste Recycling Fee',
        rate_bp: 150, // $1.50 per unit
        computation_type: 'FIXED_PER_UNIT',
        inclusion_type: 'EXCLUSIVE',
      };

      // 4 units * $1.50 = $6.00 (600 minor)
      expect(calculateTaxAmount(0n, ecoFee, 4)).toBe(600n);
    });
  });

  describe('Tiered Volume Pricelist Rules', () => {
    const rules: DomainPriceListRule[] = [
      {
        variant_id: 'var_widget',
        min_quantity: 10,
        fixed_price_minor: null,
        discount_percent_bp: 1000, // 10% off for 10-49 units
      },
      {
        variant_id: 'var_widget',
        min_quantity: 50,
        fixed_price_minor: '7500', // $75.00 fixed for 50+ units
        discount_percent_bp: null,
      },
    ];

    const basePrice = 10000n; // $100.00

    it('applies standard base price when volume threshold is not met', () => {
      expect(resolveEffectiveUnitPrice(basePrice, 1, rules)).toBe(10000n);
      expect(resolveEffectiveUnitPrice(basePrice, 9, rules)).toBe(10000n);
    });

    it('applies volume discount percentage when first tier is met', () => {
      // 10 units -> 10% off $100.00 = $90.00 (9000 minor)
      expect(resolveEffectiveUnitPrice(basePrice, 10, rules)).toBe(9000n);
      expect(resolveEffectiveUnitPrice(basePrice, 49, rules)).toBe(9000n);
    });

    it('applies volume fixed price when top tier is met', () => {
      // 50 units -> $75.00 fixed (7500 minor)
      expect(resolveEffectiveUnitPrice(basePrice, 50, rules)).toBe(7500n);
      expect(resolveEffectiveUnitPrice(basePrice, 100, rules)).toBe(7500n);
    });
  });

  describe('Promotional Coupon Evaluation', () => {
    it('applies percentage coupon with maximum discount cap', () => {
      const promo: DomainDiscountPromotion = {
        code: 'SUMMER20',
        discount_type: 'PERCENTAGE',
        value_minor_or_bp: '2000', // 20%
        max_discount_minor: '5000', // max $50.00
        min_subtotal_minor: '10000', // min $100.00
      };

      // Below min subtotal ($50) -> $0 discount
      expect(evaluatePromotionDiscount(5000n, promo)).toBe(0n);

      // Qualifies: $200.00 subtotal -> 20% is $40.00 (below cap of $50)
      expect(evaluatePromotionDiscount(20000n, promo)).toBe(4000n);

      // Qualifies: $500.00 subtotal -> 20% is $100.00, but capped at $50.00 (5000 minor)
      expect(evaluatePromotionDiscount(50000n, promo)).toBe(5000n);
    });

    it('applies fixed amount discount capped at cart subtotal', () => {
      const fixedPromo: DomainDiscountPromotion = {
        code: 'SAVE15',
        discount_type: 'FIXED_AMOUNT',
        value_minor_or_bp: '1500', // $15.00
        max_discount_minor: null,
        min_subtotal_minor: null,
      };

      expect(evaluatePromotionDiscount(10000n, fixedPromo)).toBe(1500n);
      // If subtotal is only $10.00, discount cannot exceed subtotal
      expect(evaluatePromotionDiscount(1000n, fixedPromo)).toBe(1000n);
    });
  });

  describe('Cart Pipeline Processor (calculateCart)', () => {
    it('calculates complex multi-item cart with taxes, discounts, and volume tiers', () => {
      const salesTax: DomainTaxRate = {
        id: 'tax_sales',
        code: 'ST_8',
        name: 'Sales Tax 8%',
        rate_bp: 800,
        computation_type: 'PERCENTAGE',
        inclusion_type: 'EXCLUSIVE',
      };

      const rules: DomainPriceListRule[] = [
        {
          variant_id: 'var_laptop',
          min_quantity: 5,
          fixed_price_minor: '90000', // $900 instead of $1000
          discount_percent_bp: null,
        },
      ];

      const promo: DomainDiscountPromotion = {
        code: 'CART50',
        discount_type: 'FIXED_AMOUNT',
        value_minor_or_bp: '5000', // $50 off
        max_discount_minor: null,
        min_subtotal_minor: '100000', // min $1000
      };

      const items: DomainCartItemInput[] = [
        {
          // 5 Laptops @ $1000 base -> volume rule triggers $900 unit price
          variant_id: 'var_laptop',
          quantity: 5,
          base_unit_price_minor: '100000',
          taxes: [salesTax],
        },
        {
          // 2 Mice @ $50 each with 10% line discount
          variant_id: 'var_mouse',
          quantity: 2,
          base_unit_price_minor: '5000',
          line_discount_percent_bp: 1000,
          taxes: [salesTax],
        },
      ];

      const summary = calculateCart(items, rules, promo);

      // Line 1: 5 * $900 = $4500.00 (450000 minor)
      expect(summary.items[0]?.effective_unit_price_minor).toBe('90000');
      expect(summary.items[0]?.gross_subtotal_minor).toBe('450000');
      // Tax: 8% on $4500 = $360.00 (36000 minor)
      expect(summary.items[0]?.tax_amount_minor).toBe('36000');

      // Line 2: 2 * $50 = $100.00 (10000 minor). Line discount 10% = $10.00 (1000 minor)
      expect(summary.items[1]?.gross_subtotal_minor).toBe('10000');
      expect(summary.items[1]?.discount_amount_minor).toBe('1000');
      // Tax on line 2: 8% on $90 ($100 - $10) = $7.20 (720 minor)
      expect(summary.items[1]?.tax_amount_minor).toBe('720');

      // Subtotal before discounts: $4500 + $100 = $4600.00 (460000 minor)
      expect(summary.subtotal_minor).toBe('460000');

      // Total discounts: $10.00 (line discount) + $50.00 (promo) = $60.00 (6000 minor)
      expect(summary.discount_total_minor).toBe('6000');

      // Total taxes: $360.00 + $7.20 = $367.20 (36720 minor)
      expect(summary.tax_total_minor).toBe('36720');

      // Grand total = subtotal ($4600.00) - discounts ($60.00) + exclusive tax ($367.20)
      // = $4907.20 (490720 minor)
      expect(summary.grand_total_minor).toBe('490720');
    });
  });
});
