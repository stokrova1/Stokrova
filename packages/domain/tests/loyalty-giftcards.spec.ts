import { describe, it, expect } from 'vitest';
import {
  calculateEarnedLoyaltyPoints,
  evaluateTierProgression,
  calculatePointsRedemptionDiscount,
  generateGiftCardCode,
  hashGiftCardPin,
  verifyGiftCardPin,
  applyGiftCardRedemption,
  applyGiftCardReload,
  LoyaltyDomainError,
  type LoyaltyTierDef,
} from '../src/loyalty-giftcards.js';

describe('Customer Loyalty, Rewards & Gift Cards Domain Engine (Phase 17)', () => {
  // ==========================================================================
  // 1. Points Accrual & Tier Multiplier
  // ==========================================================================
  describe('calculateEarnedLoyaltyPoints', () => {
    it('calculates base points with 1 point per $1.00 (100 cents)', () => {
      // $50.00 spend -> 5,000 cents / 100 = 50 points
      const points = calculateEarnedLoyaltyPoints('5000', 100, 10000);
      expect(points).toBe(50);
    });

    it('returns 0 points for zero, negative, or fractional spend below 1 currency unit', () => {
      expect(calculateEarnedLoyaltyPoints('0', 100)).toBe(0);
      expect(calculateEarnedLoyaltyPoints('-500', 100)).toBe(0);
      expect(calculateEarnedLoyaltyPoints('75', 100)).toBe(0); // 75 cents < $1.00
    });

    it('applies tier multipliers in basis points (15,000 bp = 1.5x, 20,000 bp = 2.0x)', () => {
      // $100.00 (10,000 cents) at 1.5x -> 150 points
      const goldPoints = calculateEarnedLoyaltyPoints('10000', 100, 15000);
      expect(goldPoints).toBe(150);

      // $250.00 (25,000 cents) at 2.0x -> 500 points
      const platPoints = calculateEarnedLoyaltyPoints('25000', 100, 20000);
      expect(platPoints).toBe(500);
    });
  });

  // ==========================================================================
  // 2. Loyalty Tier Progression Engine
  // ==========================================================================
  describe('evaluateTierProgression', () => {
    const tiers: LoyaltyTierDef[] = [
      {
        tier_code: 'BRONZE',
        tier_name: 'Bronze Member',
        min_spend_minor: '0',
        multiplier_bp: 10000,
        priority: 1,
      },
      {
        tier_code: 'SILVER',
        tier_name: 'Silver Member',
        min_spend_minor: '50000', // $500.00
        multiplier_bp: 12500,
        priority: 2,
      },
      {
        tier_code: 'GOLD',
        tier_name: 'Gold Elite',
        min_spend_minor: '200000', // $2,000.00
        multiplier_bp: 15000,
        priority: 3,
      },
      {
        tier_code: 'PLATINUM',
        tier_name: 'Platinum VIP',
        min_spend_minor: '500000', // $5,000.00
        multiplier_bp: 20000,
        priority: 4,
      },
    ];

    it('progresses customer tier according to cumulative spend', () => {
      expect(evaluateTierProgression('0', tiers)).toBe('BRONZE');
      expect(evaluateTierProgression('25000', tiers)).toBe('BRONZE'); // $250
      expect(evaluateTierProgression('50000', tiers)).toBe('SILVER'); // $500
      expect(evaluateTierProgression('150000', tiers)).toBe('SILVER'); // $1,500
      expect(evaluateTierProgression('200000', tiers)).toBe('GOLD'); // $2,000
      expect(evaluateTierProgression('499999', tiers)).toBe('GOLD');
      expect(evaluateTierProgression('500000', tiers)).toBe('PLATINUM'); // $5,000
      expect(evaluateTierProgression('1000000', tiers)).toBe('PLATINUM');
    });

    it('defaults to BRONZE if tiers list is empty', () => {
      expect(evaluateTierProgression('100000', [])).toBe('BRONZE');
    });
  });

  // ==========================================================================
  // 3. Points Redemption & Order Discount Calculation
  // ==========================================================================
  describe('calculatePointsRedemptionDiscount', () => {
    it('calculates full points discount when within 50% cap', () => {
      // Order: $100.00 (10,000 cents). Max cap 50% = $50.00 (5,000 cents)
      // Customer has 1,000 points. 1 point = 1 cent (ratio 100 bp).
      // Discount = $10.00 (1,000 cents). Remaining points: 1,000 - 1,000 = 0.
      const result = calculatePointsRedemptionDiscount({
        pointsToRedeem: 1000,
        availablePointsBalance: 1000,
        redemptionRatioBp: 100,
        orderTotalMinor: '10000',
        maxRedemptionPercentBp: 5000,
      });

      expect(result.discount_minor).toBe('1000'); // $10.00
      expect(result.points_used).toBe(1000);
      expect(result.remaining_points).toBe(0);
      expect(result.net_order_total_minor).toBe('9000'); // $90.00
    });

    it('clamps discount and points used when requested discount exceeds order cap', () => {
      // Order: $100.00 (10,000 cents). Max cap 50% = $50.00 (5,000 cents).
      // Customer attempts to redeem 8,000 points ($80.00 discount).
      // Clamped to $50.00 (5,000 cents) -> 5,000 points used, 3,000 remaining.
      const result = calculatePointsRedemptionDiscount({
        pointsToRedeem: 8000,
        availablePointsBalance: 8000,
        redemptionRatioBp: 100,
        orderTotalMinor: '10000',
        maxRedemptionPercentBp: 5000,
      });

      expect(result.discount_minor).toBe('5000');
      expect(result.points_used).toBe(5000);
      expect(result.remaining_points).toBe(3000);
      expect(result.net_order_total_minor).toBe('5000');
    });

    it('handles zero or negative points redemption safely', () => {
      const result = calculatePointsRedemptionDiscount({
        pointsToRedeem: 0,
        availablePointsBalance: 500,
        redemptionRatioBp: 100,
        orderTotalMinor: '5000',
      });

      expect(result.discount_minor).toBe('0');
      expect(result.points_used).toBe(0);
      expect(result.remaining_points).toBe(500);
      expect(result.net_order_total_minor).toBe('5000');
    });
  });

  // ==========================================================================
  // 4. Stored-Value Gift Cards & PIN Verification
  // ==========================================================================
  describe('Stored-Value Gift Cards', () => {
    it('generates unambiguous formatted gift card codes', () => {
      const code1 = generateGiftCardCode('GFT', 'seed-1');
      const code2 = generateGiftCardCode('GFT', 'seed-2');

      expect(code1).toMatch(/^GFT-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
      expect(code2).toMatch(/^GFT-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
      expect(code1).not.toBe(code2);
    });

    it('hashes and securely verifies gift card PIN', () => {
      const pin = '4829';
      const salt = 'salt_random_123';
      const hash = hashGiftCardPin(pin, salt);

      expect(hash).toBeDefined();
      expect(verifyGiftCardPin('4829', hash, salt)).toBe(true);
      expect(verifyGiftCardPin('0000', hash, salt)).toBe(false);
      expect(verifyGiftCardPin('', hash, salt)).toBe(false);
    });

    it('applies gift card redemption deducting balance and updating status', () => {
      // Balance: $100.00 (10,000 cents). Redeem: $35.00 (3,500 cents).
      const res = applyGiftCardRedemption('10000', '3500');

      expect(res.new_balance_minor).toBe('6500');
      expect(res.actual_deducted_minor).toBe('3500');
      expect(res.status).toBe('ACTIVE');

      // Full balance redemption leaves DEPLETED status
      const fullRes = applyGiftCardRedemption('6500', '6500');
      expect(fullRes.new_balance_minor).toBe('0');
      expect(fullRes.status).toBe('DEPLETED');
    });

    it('throws error when redemption exceeds available gift card balance', () => {
      expect(() => applyGiftCardRedemption('2000', '5000')).toThrow(
        LoyaltyDomainError,
      );
    });

    it('applies gift card reload and restores ACTIVE status', () => {
      const res = applyGiftCardReload('0', '5000'); // Reload $50.00
      expect(res.new_balance_minor).toBe('5000');
      expect(res.status).toBe('ACTIVE');
    });
  });
});
