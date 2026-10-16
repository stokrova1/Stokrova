import { describe, it, expect } from 'vitest';
import { BillingService } from './billing.service.js';
import { PlanPricingService } from './plan-pricing.service.js';
import { signupPlanTier } from './signup-plan.js';

const DAY = 86400000;

describe('Monthly plan renewals', () => {
  it('bills the next month at the price the founder set after sign-up', async () => {
    const pricing = new PlanPricingService();
    const billing = new BillingService(pricing);
    await billing.createSubscription({ tenant_id: 't1', tier: 'RETAIL_STARTER' }); // first month 4900
    await pricing.setPrice('RETAIL_STARTER', { monthly_price_minor: '7500' }, 'founder');
    const issued = await billing.renewDueSubscriptions(new Date(Date.now() + 31 * DAY));
    expect(issued).toHaveLength(1);
    expect(issued[0]!.total_minor).toBe('7500');
  });

  it('renews only once per period even when run repeatedly', async () => {
    const billing = new BillingService(new PlanPricingService());
    await billing.createSubscription({ tenant_id: 't2', tier: 'RETAIL_STARTER' });
    const later = new Date(Date.now() + 31 * DAY);
    await billing.renewDueSubscriptions(later);
    expect(await billing.renewDueSubscriptions(later)).toHaveLength(0);
    expect(await billing.listInvoices('t2')).toHaveLength(2);
  });

  it('does not invoice a free plan', async () => {
    const billing = new BillingService(new PlanPricingService());
    await billing.createSubscription({ tenant_id: 't3', tier: 'SOLO_TRADER' });
    expect(await billing.renewDueSubscriptions(new Date(Date.now() + 31 * DAY))).toHaveLength(0);
  });

  it('does not bill before the month has ended', async () => {
    const billing = new BillingService(new PlanPricingService());
    await billing.createSubscription({ tenant_id: 't4', tier: 'RETAIL_STARTER' });
    expect(await billing.renewDueSubscriptions(new Date(Date.now() + 10 * DAY))).toHaveLength(0);
  });
});

describe('Plan chosen at sign-up', () => {
  it('saves the website plan as the matching billing plan', () => {
    expect(signupPlanTier('starter')).toBe('RETAIL_STARTER');
    expect(signupPlanTier('growth')).toBe('WHOLESALE_GROWTH');
    expect(signupPlanTier('enterprise')).toBe('ENTERPRISE_LOGISTICS');
    expect(signupPlanTier(undefined)).toBe('RETAIL_STARTER');
  });
});
