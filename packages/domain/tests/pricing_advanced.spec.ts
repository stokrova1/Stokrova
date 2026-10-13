import { describe, it, expect } from 'vitest';
import {
  resolvePriceWithPrecedence,
  evaluateBuyXGetYDiscount,
  evaluatePromotionStacking,
  assertPriceMeetsMarginPolicy,
  calculateLoyaltyReturnReversal,
} from '../src/pricing-advanced.js';
import {
  calculateGraduatedRebate,
  calculateRetroactiveRebate,
  assertValidRebateStatusTransition,
} from '../src/rebates.js';

describe('STOKROVA Phase 8: Advanced Pricing & Rebates Pure Domain Specification', () => {
  // --------------------------------------------------------------------------
  // 1. Deterministic Precedence Resolution
  // --------------------------------------------------------------------------
  describe('Precedence Price Resolution Engine', () => {
    const variantId = 'var-iphone-15';
    const basePriceMinor = '100000'; // $1,000.00 base

    it('prioritizes Customer Contract over all other price lists', () => {
      const res = resolvePriceWithPrecedence({
        variant_id: variantId,
        quantity: 5,
        base_price_minor: basePriceMinor,
        contractRules: [
          {
            id: 'cr-1',
            contract_number: 'CNT-VIP-001',
            variant_id: variantId,
            min_quantity: 1,
            fixed_price_minor: '70000', // $700 contract
            discount_percent_bp: null,
          },
        ],
        customerRules: [
          {
            id: 'cpr-1',
            pricelist_name: 'Customer Direct PL',
            variant_id: variantId,
            min_quantity: 1,
            fixed_price_minor: '75000', // $750 customer PL
            discount_percent_bp: null,
          },
        ],
        defaultRules: [
          {
            id: 'dpr-1',
            pricelist_name: 'Retail Default',
            variant_id: variantId,
            min_quantity: 1,
            fixed_price_minor: '90000',
            discount_percent_bp: null,
          },
        ],
      });

      expect(res.winner_rule_tier).toBe('CUSTOMER_CONTRACT');
      expect(res.resolved_unit_price_minor).toBe('70000');
    });

    it('falls back through precedence hierarchy to Base Price when no tier rules match', () => {
      const res = resolvePriceWithPrecedence({
        variant_id: variantId,
        quantity: 1,
        base_price_minor: basePriceMinor,
      });

      expect(res.winner_rule_tier).toBe('BASE_PRICE');
      expect(res.resolved_unit_price_minor).toBe('100000');
    });

    it('selects the highest qualifying volume break within the winning tier', () => {
      const res = resolvePriceWithPrecedence({
        variant_id: variantId,
        quantity: 25,
        base_price_minor: basePriceMinor,
        customerGroupRules: [
          {
            id: 'g-tier-1',
            pricelist_name: 'Wholesale Tier 1',
            variant_id: variantId,
            min_quantity: 1,
            fixed_price_minor: '90000',
            discount_percent_bp: null,
          },
          {
            id: 'g-tier-2',
            pricelist_name: 'Wholesale Tier 2',
            variant_id: variantId,
            min_quantity: 10,
            fixed_price_minor: '85000',
            discount_percent_bp: null,
          },
          {
            id: 'g-tier-3',
            pricelist_name: 'Wholesale Tier 3',
            variant_id: variantId,
            min_quantity: 20,
            fixed_price_minor: '80000', // Best qualifying volume tier for qty 25
            discount_percent_bp: null,
          },
          {
            id: 'g-tier-4',
            pricelist_name: 'Wholesale Tier 4',
            variant_id: variantId,
            min_quantity: 50,
            fixed_price_minor: '70000', // Not qualified
            discount_percent_bp: null,
          },
        ],
      });

      expect(res.winner_rule_tier).toBe('CUSTOMER_GROUP_PRICELIST');
      expect(res.resolved_unit_price_minor).toBe('80000');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Buy-X-Get-Y (BXGY) Promotions
  // --------------------------------------------------------------------------
  describe('Buy-X-Get-Y Promotions', () => {
    it('calculates Buy 2 Get 1 Free (100% off)', () => {
      // 3 units at $20.00 each -> 1 unit free ($20.00 discount)
      const res = evaluateBuyXGetYDiscount({
        quantity: 3,
        unitPriceMinor: '2000',
        buyQuantity: 2,
        getQuantity: 1,
        getDiscountPercentBp: 10000, // 100%
      });

      expect(res.discounted_units).toBe(1);
      expect(res.discount_minor).toBe('2000');
    });

    it('calculates Buy 3 Get 1 at 50% discount with 7 units', () => {
      // Bundle size: 4. Complete bundles in 7 units: 1 bundle.
      // 1 discounted unit at 50% off $40.00 ($4000) = $20.00 ($2000)
      const res = evaluateBuyXGetYDiscount({
        quantity: 7,
        unitPriceMinor: '4000',
        buyQuantity: 3,
        getQuantity: 1,
        getDiscountPercentBp: 5000, // 50%
      });

      expect(res.discounted_units).toBe(1);
      expect(res.discount_minor).toBe('2000');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Promotion Stacking Policies
  // --------------------------------------------------------------------------
  describe('Promotion Stacking & Conflict Policies', () => {
    it('applies exclusive promotion alone when it provides greater savings than combined stackables', () => {
      const res = evaluatePromotionStacking('10000', [
        {
          campaign_id: 'c-exc',
          campaign_code: 'SUPER-BLACK-FRIDAY',
          campaign_name: 'Super Black Friday 40% Off',
          stacking_rule: 'EXCLUSIVE',
          discount_minor: '4000', // $40.00
        },
        {
          campaign_id: 'c-stk-1',
          campaign_code: 'SUMMER-10',
          campaign_name: 'Summer 10%',
          stacking_rule: 'STACKABLE',
          discount_minor: '1000',
        },
        {
          campaign_id: 'c-stk-2',
          campaign_code: 'VIP-5',
          campaign_name: 'VIP 5%',
          stacking_rule: 'STACKABLE',
          discount_minor: '500',
        },
      ]);

      expect(res.applied_promotions.length).toBe(1);
      expect(res.applied_promotions[0]?.campaign_code).toBe('SUPER-BLACK-FRIDAY');
      expect(res.total_discount_minor).toBe('4000');
    });

    it('combines stackable promotions and caps at subtotal', () => {
      const res = evaluatePromotionStacking('5000', [
        {
          campaign_id: 'c-1',
          campaign_code: 'COUPON-A',
          campaign_name: 'Coupon A $30',
          stacking_rule: 'STACKABLE',
          discount_minor: '3000',
        },
        {
          campaign_id: 'c-2',
          campaign_code: 'COUPON-B',
          campaign_name: 'Coupon B $30',
          stacking_rule: 'STACKABLE',
          discount_minor: '3000',
        },
      ]);

      // Total discount cannot exceed subtotal $50.00 (5000 minor)
      expect(res.total_discount_minor).toBe('5000');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Margin Protection & Discount Governance
  // --------------------------------------------------------------------------
  describe('Margin Protection Governance', () => {
    it('flags violations when price drops below required margin floor', () => {
      // Cost: $80.00 (8000), Base: $100.00 (10000), Proposed: $85.00 (8500)
      // Profit: $5.00 -> Margin: 500 / 8500 = 5.88% (588 bp) < 15% floor (1500 bp)
      const res = assertPriceMeetsMarginPolicy({
        unitPriceMinor: '8500',
        costMinor: '8000',
        basePriceMinor: '10000',
        minMarginPercentBp: 1500, // 15%
        maxDiscountPercentBp: 2000, // 20%
      });

      expect(res.meets_policy).toBe(false);
      expect(res.violations.some((v) => v.includes('below the required minimum'))).toBe(true);
    });

    it('passes when margin is healthy and discount is within limit', () => {
      // Cost: $60.00 (6000), Base: $100.00 (10000), Proposed: $90.00 (9000)
      // Profit: $30.00 -> Margin: 3000 / 9000 = 33.33% (3333 bp) > 15% floor
      // Discount: $10.00 -> 10% (1000 bp) < 20% limit
      const res = assertPriceMeetsMarginPolicy({
        unitPriceMinor: '9000',
        costMinor: '6000',
        basePriceMinor: '10000',
        minMarginPercentBp: 1500,
        maxDiscountPercentBp: 2000,
      });

      expect(res.meets_policy).toBe(true);
      expect(res.violations.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Loyalty Return Pro-Rata Reversal
  // --------------------------------------------------------------------------
  describe('Loyalty Return Pro-Rata Reversals', () => {
    it('calculates exact pro-rata points deduction and points restoration upon partial return', () => {
      // Original Order: $100.00 (10000 minor)
      // Customer earned: 100 points
      // Customer redeemed: 200 points
      // Return: $40.00 (4000 minor) = 40% of order
      // Deduct: 40% of 100 = 40 points
      // Restore: 40% of 200 = 80 points
      const res = calculateLoyaltyReturnReversal({
        originalOrderTotalMinor: '10000',
        returnAmountMinor: '4000',
        originalPointsEarned: 100,
        originalPointsRedeemed: 200,
      });

      expect(res.points_to_deduct).toBe(40);
      expect(res.points_to_restore).toBe(80);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Rebates Engine
  // --------------------------------------------------------------------------
  describe('Rebate Agreements Engine', () => {
    const tiers = [
      {
        tier_number: 1,
        threshold_amount_minor: '1000000', // $10,000 threshold
        rebate_rate_bp: 200, // 2.0%
      },
      {
        tier_number: 2,
        threshold_amount_minor: '5000000', // $50,000 threshold
        rebate_rate_bp: 500, // 5.0%
      },
    ];

    it('calculates graduated spend rebates across marginal brackets', () => {
      // Total Spend: $60,000 (6,000,000 minor)
      // Bracket 1: $0 to $10,000 ($10,000) @ 2.0% = $200 (20,000 minor)
      // Bracket 2: $10,000 to $50,000 ($40,000) @ 5.0% = $2,000 (200,000 minor)
      // Bracket 3: $50,000 to $60,000 ($10,000) @ 5.0% = $500 (50,000 minor)
      // Total = $2,700 (270,000 minor)
      const rebate = calculateGraduatedRebate({
        isSpendBased: true,
        totalQuantity: 0,
        totalSpendMinor: '6000000',
        tiers,
      });

      expect(rebate).toBe('270000');
    });

    it('calculates retroactive rebates applied to 100% of qualified spend', () => {
      // Total Spend: $60,000 (6,000,000 minor)
      // Qualifies for Tier 2 (>= $50,000) @ 5.0% across all $60,000:
      // $60,000 * 5.0% = $3,000 (300,000 minor)
      const res = calculateRetroactiveRebate({
        isSpendBased: true,
        totalQuantity: 0,
        totalSpendMinor: '6000000',
        tiers,
      });

      expect(res.qualifying_tier_number).toBe(2);
      expect(res.rebate_minor).toBe('300000');
    });

    it('enforces valid status transitions for rebate lifecycle', () => {
      expect(() =>
        assertValidRebateStatusTransition('ACCRUED', 'CLAIMED'),
      ).not.toThrow();

      expect(() =>
        assertValidRebateStatusTransition('CLAIMED', 'APPROVED'),
      ).not.toThrow();

      expect(() =>
        assertValidRebateStatusTransition('APPROVED', 'SETTLED'),
      ).not.toThrow();

      // Skipping approval directly to settled must throw
      expect(() =>
        assertValidRebateStatusTransition('CLAIMED', 'SETTLED'),
      ).toThrow();
    });
  });
});
