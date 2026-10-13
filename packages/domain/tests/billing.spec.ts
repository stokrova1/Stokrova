import { describe, it, expect } from 'vitest';
import {
  TIER_ENTITLEMENT_DEFINITIONS,
  canTransitionSubscriptionStatus,
  isFeatureEnabled,
  getEffectiveLimit,
  evaluateTenantQuota,
  calculateProratedBilling,
  calculateMeteredOverage,
  calculateNextDunningRetry,
  type TenantSubscription,
} from '../src/billing.js';

describe('Phase 24 @stokrova/domain — SaaS Billing & Platform Orchestration Domain Engine', () => {
  const baseSubscription: TenantSubscription = {
    id: 'sub_test_01',
    tenant_id: 'tenant_omega_99',
    tier: 'RETAIL_STARTER',
    status: 'ACTIVE',
    billing_cycle: 'MONTHLY',
    currency: 'USD',
    current_period_start: '2026-10-01T00:00:00.000Z',
    current_period_end: '2026-10-31T00:00:00.000Z',
    cancel_at_period_end: false,
    canceled_at: null,
    trial_ends_at: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  };

  describe('Tier Entitlement Architecture (Rule 14, 15, 16)', () => {
    it('provides progressive tiers without forcing enterprise complexity on solo traders', () => {
      const solo = TIER_ENTITLEMENT_DEFINITIONS.SOLO_TRADER;
      expect(solo.monthly_price_minor).toBe('0');
      expect(solo.max_branches).toBe(1);
      expect(solo.max_active_registers).toBe(1);
      expect(solo.feature_flags.offline_sync_enabled).toBe(true);
      expect(solo.feature_flags.manufacturing_enabled).toBe(false);

      const enterprise = TIER_ENTITLEMENT_DEFINITIONS.ENTERPRISE_LOGISTICS;
      expect(enterprise.max_warehouses).toBe(50);
      expect(enterprise.max_monthly_orders).toBe(1000000);
      expect(enterprise.feature_flags.edi_enabled).toBe(true);
      expect(enterprise.feature_flags.manufacturing_enabled).toBe(true);
    });
  });

  describe('Subscription Status State Machine', () => {
    it('validates permitted status transitions', () => {
      expect(canTransitionSubscriptionStatus('TRIALING', 'ACTIVE')).toBe(true);
      expect(canTransitionSubscriptionStatus('ACTIVE', 'PAST_DUE')).toBe(true);
      expect(canTransitionSubscriptionStatus('PAST_DUE', 'ACTIVE')).toBe(true);
      expect(canTransitionSubscriptionStatus('ACTIVE', 'SUSPENDED')).toBe(true);
      expect(canTransitionSubscriptionStatus('SUSPENDED', 'ACTIVE')).toBe(true);
      expect(canTransitionSubscriptionStatus('SUSPENDED', 'CANCELED')).toBe(true);
      expect(canTransitionSubscriptionStatus('CANCELED', 'ACTIVE')).toBe(true);
    });

    it('rejects illegal status transitions', () => {
      expect(canTransitionSubscriptionStatus('SUSPENDED', 'PAST_DUE')).toBe(false);
      expect(canTransitionSubscriptionStatus('SUSPENDED', 'TRIALING')).toBe(false);
    });
  });

  describe('Dynamic Feature Flags & Limit Gating (Rule 4, 5)', () => {
    it('evaluates base tier feature flags accurately', () => {
      expect(isFeatureEnabled(baseSubscription, 'multi_currency_enabled')).toBe(true);
      expect(isFeatureEnabled(baseSubscription, 'manufacturing_enabled')).toBe(false);
    });

    it('honors tenant-specific feature overrides without schema modifications', () => {
      const customSub: TenantSubscription = {
        ...baseSubscription,
        feature_flag_overrides: {
          manufacturing_enabled: true, // Retail starter with custom manufacturing add-on
        },
      };
      expect(isFeatureEnabled(customSub, 'manufacturing_enabled')).toBe(true);
    });

    it('revokes all feature access when tenant is suspended or canceled', () => {
      const suspendedSub: TenantSubscription = {
        ...baseSubscription,
        status: 'SUSPENDED',
      };
      expect(isFeatureEnabled(suspendedSub, 'multi_currency_enabled')).toBe(false);
      expect(isFeatureEnabled(suspendedSub, 'offline_sync_enabled')).toBe(false);
    });

    it('resolves effective operational limits with overrides', () => {
      expect(getEffectiveLimit(baseSubscription, 'max_branches')).toBe(3);

      const customLimitSub: TenantSubscription = {
        ...baseSubscription,
        limit_overrides: {
          max_branches: 7,
        },
      };
      expect(getEffectiveLimit(customLimitSub, 'max_branches')).toBe(7);
    });
  });

  describe('Quota Evaluation Engine', () => {
    it('calculates quota basis points and detects thresholds', () => {
      // Normal usage (50%)
      const q1 = evaluateTenantQuota('orders', 500, 1000);
      expect(q1.is_exceeded).toBe(false);
      expect(q1.is_warning).toBe(false);
      expect(q1.percentage_used_bp).toBe(5000);

      // Warning usage (92%)
      const q2 = evaluateTenantQuota('orders', 920, 1000);
      expect(q2.is_exceeded).toBe(false);
      expect(q2.is_warning).toBe(true);
      expect(q2.percentage_used_bp).toBe(9200);

      // Exceeded usage (105%)
      const q3 = evaluateTenantQuota('orders', 1050, 1000);
      expect(q3.is_exceeded).toBe(true);
      expect(q3.is_warning).toBe(true);
      expect(q3.percentage_used_bp).toBe(10500);
    });
  });

  describe('Pure Integer Proration Engine (Rule 26)', () => {
    it('calculates mid-cycle upgrade proration with exact integer minor units', () => {
      const quote = calculateProratedBilling({
        tenantId: 'tenant_omega_99',
        currentTier: 'RETAIL_STARTER', // $49.00 = 4900 minor
        targetTier: 'WHOLESALE_GROWTH', // $199.00 = 19900 minor
        cycle: 'MONTHLY',
        periodStart: '2026-10-01T00:00:00.000Z',
        periodEnd: '2026-10-31T00:00:00.000Z',
        effectiveDate: '2026-10-16T00:00:00.000Z', // Exactly half cycle (15 of 30 days)
      });

      expect(quote.total_days_in_cycle).toBe(30);
      expect(quote.remaining_days).toBe(15);
      expect(quote.proration_factor_bp).toBe(5000); // 50%
      expect(quote.unused_credit_minor).toBe('2450'); // 50% of 4900
      expect(quote.new_tier_charge_minor).toBe('9950'); // 50% of 19900
      expect(quote.net_prorated_amount_minor).toBe('7500'); // 9950 - 2450 = 7500 ($75.00)
    });
  });

  describe('Metered Overage Calculation', () => {
    it('returns zero overage when usage is within included quota', () => {
      const overage = calculateMeteredOverage({
        unitsConsumed: 800n,
        includedUnits: 1000n,
        ratePerBlockMinor: 500n, // $5.00 per 1000 units
        blockSize: 1000n,
      });
      expect(overage.overageUnits).toBe(0n);
      expect(overage.billableBlocks).toBe(0n);
      expect(overage.totalOverageMinor).toBe(0n);
    });

    it('calculates block-based overage fees when exceeding quota', () => {
      const overage = calculateMeteredOverage({
        unitsConsumed: 2450n,
        includedUnits: 1000n,
        ratePerBlockMinor: 500n, // $5.00 per 1000 units
        blockSize: 1000n,
      });
      // 2450 - 1000 = 1450 overage units -> 2 blocks of 1000
      expect(overage.overageUnits).toBe(1450n);
      expect(overage.billableBlocks).toBe(2n);
      expect(overage.totalOverageMinor).toBe(1000n); // $10.00
    });
  });

  describe('Dunning Retry Policy (Rule 8, 19)', () => {
    it('schedules retry intervals for failed attempts and initiates suspension on exhaustion', () => {
      const now = '2026-10-01T12:00:00.000Z';

      const r1 = calculateNextDunningRetry(1, now);
      expect(r1.shouldSuspend).toBe(false);
      expect(r1.nextRetryAt).toBe('2026-10-03T12:00:00.000Z'); // +2 days

      const r2 = calculateNextDunningRetry(2, now);
      expect(r2.shouldSuspend).toBe(false);
      expect(r2.nextRetryAt).toBe('2026-10-04T12:00:00.000Z'); // +3 days

      const r3 = calculateNextDunningRetry(3, now);
      expect(r3.shouldSuspend).toBe(false);
      expect(r3.nextRetryAt).toBe('2026-10-03T12:00:00.000Z'); // +2 days

      const r4 = calculateNextDunningRetry(4, now);
      expect(r4.shouldSuspend).toBe(true);
      expect(r4.nextRetryAt).toBeNull();
    });
  });
});
