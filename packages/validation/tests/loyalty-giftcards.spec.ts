import { describe, it, expect } from 'vitest';
import {
  LoyaltyTierCodeSchema,
  GiftCardStatusSchema,
  CreateLoyaltyProgramSchema,
  EarnLoyaltyPointsSchema,
  RedeemLoyaltyPointsSchema,
  IssueGiftCardSchema,
  RedeemGiftCardSchema,
  ReloadGiftCardSchema,
} from '../src/loyalty-giftcards.js';

describe('Loyalty & Gift Cards Validation Schemas (Phase 17)', () => {
  describe('Enums & Basic Schemas', () => {
    it('validates loyalty tier codes', () => {
      expect(LoyaltyTierCodeSchema.safeParse('BRONZE').success).toBe(true);
      expect(LoyaltyTierCodeSchema.safeParse('PLATINUM').success).toBe(true);
      expect(LoyaltyTierCodeSchema.safeParse('DIAMOND').success).toBe(false);
    });

    it('validates gift card status values', () => {
      expect(GiftCardStatusSchema.safeParse('ACTIVE').success).toBe(true);
      expect(GiftCardStatusSchema.safeParse('DEPLETED').success).toBe(true);
      expect(GiftCardStatusSchema.safeParse('UNKNOWN').success).toBe(false);
    });
  });

  describe('CreateLoyaltyProgramSchema', () => {
    it('parses valid loyalty program with defaults', () => {
      const res = CreateLoyaltyProgramSchema.safeParse({
        name: 'STOKROVA VIP Rewards',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe('STOKROVA VIP Rewards');
        expect(res.data.points_per_currency_minor).toBe(100);
        expect(res.data.points_currency).toBe('USD');
        expect(res.data.redemption_ratio_bp).toBe(100);
        expect(res.data.max_redemption_percent_bp).toBe(5000);
        expect(res.data.points_validity_days).toBe(365);
      }
    });

    it('parses custom tiers', () => {
      const res = CreateLoyaltyProgramSchema.safeParse({
        name: 'Tiered Program',
        tiers: [
          {
            tier_code: 'BRONZE',
            tier_name: 'Bronze',
            min_spend_minor: '0',
            multiplier_bp: 10000,
            priority: 1,
          },
          {
            tier_code: 'GOLD',
            tier_name: 'Gold',
            min_spend_minor: '200000',
            multiplier_bp: 15000,
            priority: 2,
          },
        ],
      });
      expect(res.success).toBe(true);
    });
  });

  describe('EarnLoyaltyPointsSchema & RedeemLoyaltyPointsSchema', () => {
    it('validates earn loyalty points request', () => {
      const res = EarnLoyaltyPointsSchema.safeParse({
        customer_id: 'cust-123',
        spend_minor: '5000',
        order_id: 'order-999',
        operation_id: 'op-earn-1',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid minor units for spend', () => {
      const res = EarnLoyaltyPointsSchema.safeParse({
        customer_id: 'cust-123',
        spend_minor: '50.00',
        operation_id: 'op-earn-1',
      });
      expect(res.success).toBe(false);
    });

    it('validates redeem loyalty points request', () => {
      const res = RedeemLoyaltyPointsSchema.safeParse({
        customer_id: 'cust-123',
        points_to_redeem: 500,
        order_total_minor: '10000',
        operation_id: 'op-redeem-1',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Gift Card Operations Schemas', () => {
    it('validates issue gift card request', () => {
      const res = IssueGiftCardSchema.safeParse({
        initial_balance_minor: '5000',
        currency: 'USD',
        pin: '1234',
        operation_id: 'op-issue-1',
      });
      expect(res.success).toBe(true);
    });

    it('validates redeem gift card request', () => {
      const res = RedeemGiftCardSchema.safeParse({
        card_code: 'GFT-4921-9982-1234',
        pin: '1234',
        amount_minor: '2500',
        operation_id: 'op-redeem-card-1',
      });
      expect(res.success).toBe(true);
    });

    it('validates reload gift card request', () => {
      const res = ReloadGiftCardSchema.safeParse({
        card_code: 'GFT-4921-9982-1234',
        amount_minor: '10000',
        operation_id: 'op-reload-1',
      });
      expect(res.success).toBe(true);
    });
  });
});
