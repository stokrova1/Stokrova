import { describe, it, expect, beforeEach } from 'vitest';
import { LoyaltyService } from './loyalty.service.js';
import { GiftCardService } from './giftcard.service.js';
import { UnauthorizedException } from '@nestjs/common';
import { LoyaltyDomainError } from '@stokrova/domain';

describe('Loyalty & Gift Cards API Services (Phase 17)', () => {
  let loyaltyService: LoyaltyService;
  let giftCardService: GiftCardService;
  const tenantId = 'tenant-loyalty-test';

  beforeEach(() => {
    loyaltyService = new LoyaltyService();
    giftCardService = new GiftCardService();
  });

  describe('LoyaltyService', () => {
    it('creates program, earns points and progresses customer tiers', async () => {
      const prog = await loyaltyService.createProgram(tenantId, {
        name: 'STOKROVA Elite Rewards',
      });
      expect(prog.id).toBeDefined();

      // Customer earns points on $250.00 purchase (25,000 cents) -> 250 points at Bronze (1.0x)
      const res1 = await loyaltyService.earnPoints(tenantId, {
        customer_id: 'cust-alice',
        spend_minor: '25000',
        order_id: 'ord-101',
        operation_id: 'op-earn-1',
      });
      expect(res1.pointsEarned).toBe(250);
      expect(res1.account.points_balance).toBe(250);
      expect(res1.account.current_tier_code).toBe('BRONZE');

      // Customer spends another $300.00 (30,000 cents). Total lifetime spend: $550.00 (55,000 cents).
      // Reaches SILVER tier ($500.00 threshold) with 1.25x multiplier!
      const res2 = await loyaltyService.earnPoints(tenantId, {
        customer_id: 'cust-alice',
        spend_minor: '30000',
        order_id: 'ord-102',
        operation_id: 'op-earn-2',
      });
      expect(res2.account.current_tier_code).toBe('SILVER');
      expect(res2.account.lifetime_spend_minor).toBe('55000');
    });

    it('enforces idempotency on points accrual (Rule 19)', async () => {
      await loyaltyService.createProgram(tenantId, { name: 'Prog 1' });

      // First execution
      const r1 = await loyaltyService.earnPoints(tenantId, {
        customer_id: 'cust-bob',
        spend_minor: '10000',
        operation_id: 'op-idem-1',
      });
      expect(r1.pointsEarned).toBe(100);
      expect(r1.account.points_balance).toBe(100);

      // Duplicate retry with same operation_id
      const r2 = await loyaltyService.earnPoints(tenantId, {
        customer_id: 'cust-bob',
        spend_minor: '10000',
        operation_id: 'op-idem-1',
      });
      expect(r2.pointsEarned).toBe(0);
      expect(r2.account.points_balance).toBe(100); // Not doubled!
    });

    it('calculates and executes points redemption within order cap', async () => {
      await loyaltyService.createProgram(tenantId, { name: 'Prog 2' });

      // Earn 2,000 points
      await loyaltyService.earnPoints(tenantId, {
        customer_id: 'cust-charlie',
        spend_minor: '200000',
        operation_id: 'op-earn-charlie',
      });

      // Calculate redemption: Order $100.00 (10,000 cents). Max cap 50% ($50.00 / 5,000 cents).
      // Customer requests to redeem 800 points ($8.00 discount)
      const calc = await loyaltyService.calculateRedemptionDiscount(
        tenantId,
        'cust-charlie',
        800,
        '10000',
      );
      expect(calc.discount_minor).toBe('800');
      expect(calc.points_used).toBe(800);
      expect(calc.net_order_total_minor).toBe('9200');

      // Execute redemption
      const redeemed = await loyaltyService.redeemPoints(tenantId, {
        customer_id: 'cust-charlie',
        points_to_redeem: 800,
        order_total_minor: '10000',
        order_id: 'ord-redeem-1',
        operation_id: 'op-redeem-charlie-1',
      });
      expect(redeemed.discountMinor).toBe('800');
      expect(redeemed.account.points_balance).toBe(1200); // 2000 - 800
    });

    it('rejects points redemption when requested exceeds customer balance', async () => {
      await loyaltyService.createProgram(tenantId, { name: 'Prog 3' });

      await expect(
        loyaltyService.redeemPoints(tenantId, {
          customer_id: 'cust-empty',
          points_to_redeem: 500,
          order_total_minor: '5000',
          operation_id: 'op-fail-1',
        }),
      ).rejects.toThrow(LoyaltyDomainError);
    });
  });

  describe('GiftCardService', () => {
    it('issues gift card, inquires balance and verifies PIN', async () => {
      const card = await giftCardService.issueGiftCard(tenantId, {
        initial_balance_minor: '10000', // $100.00
        pin: '1234',
        operation_id: 'op-gft-issue-1',
      });

      expect(card.card_code).toMatch(/^GFT-/);
      expect(card.current_balance_minor).toBe('10000');
      expect(card.status).toBe('ACTIVE');

      // Successful inquiry with correct PIN
      const inq = await giftCardService.inquireBalance(tenantId, {
        card_code: card.card_code,
        pin: '1234',
      });
      expect(inq.balance_minor).toBe('10000');
      expect(inq.status).toBe('ACTIVE');

      // Unauthorized inquiry with wrong PIN
      await expect(
        giftCardService.inquireBalance(tenantId, {
          card_code: card.card_code,
          pin: '9999',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('redeems gift card balance, reloads and handles idempotency', async () => {
      const card = await giftCardService.issueGiftCard(tenantId, {
        initial_balance_minor: '5000', // $50.00
        pin: '5555',
        operation_id: 'op-issue-card-2',
      });

      // Partial redemption of $20.00 (2,000 cents)
      const red1 = await giftCardService.redeemGiftCard(tenantId, {
        card_code: card.card_code,
        pin: '5555',
        amount_minor: '2000',
        order_id: 'ord-gc-1',
        operation_id: 'op-redeem-gc-1',
      });
      expect(red1.amountDeductedMinor).toBe('2000');
      expect(red1.card.current_balance_minor).toBe('3000');
      expect(red1.card.status).toBe('ACTIVE');

      // Duplicate redemption retry with same operation_id (Rule 19)
      const redRetry = await giftCardService.redeemGiftCard(tenantId, {
        card_code: card.card_code,
        pin: '5555',
        amount_minor: '2000',
        operation_id: 'op-redeem-gc-1',
      });
      expect(redRetry.amountDeductedMinor).toBe('0');
      expect(redRetry.card.current_balance_minor).toBe('3000'); // Untouched

      // Reload $25.00 (2,500 cents)
      const reloaded = await giftCardService.reloadGiftCard(tenantId, {
        card_code: card.card_code,
        amount_minor: '2500',
        operation_id: 'op-reload-gc-1',
      });
      expect(reloaded.current_balance_minor).toBe('5500'); // 3000 + 2500
    });

    it('depletes card upon full redemption', async () => {
      const card = await giftCardService.issueGiftCard(tenantId, {
        initial_balance_minor: '1500',
        operation_id: 'op-issue-deplete',
      });

      const res = await giftCardService.redeemGiftCard(tenantId, {
        card_code: card.card_code,
        amount_minor: '1500',
        operation_id: 'op-redeem-deplete',
      });

      expect(res.card.current_balance_minor).toBe('0');
      expect(res.card.status).toBe('DEPLETED');
    });
  });
});
