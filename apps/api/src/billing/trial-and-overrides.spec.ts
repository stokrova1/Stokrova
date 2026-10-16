import { describe, it, expect } from 'vitest';
import { BillingService } from './billing.service.js';
import { PlanPricingService } from './plan-pricing.service.js';
import { BillingAccessGuard } from './billing-access.guard.js';
import { effectivePriceMinor, FREE_TRIAL_DAYS } from './billing-rules.js';

const DAY = 86400000;
const later = (d: number) => new Date(Date.now() + d * DAY);
const ctx = (tenant: string, path = '/v1/orders') =>
  ({ getType: () => 'http', switchToHttp: () => ({ getRequest: () => ({ path, headers: { 'x-tenant-id': tenant } }) }) }) as any;

async function newBusiness(tier: 'RETAIL_STARTER' | 'WHOLESALE_GROWTH' = 'WHOLESALE_GROWTH') {
  const pricing = new PlanPricingService();
  const billing = new BillingService(pricing);
  (pricing as any).tenantTier = async () => tier;
  await billing.getSubscription('t1'); // what happens when a business first appears
  return billing;
}

describe('30-day free trial', () => {
  it('lasts 30 days for every new business, whatever plan it picked', async () => {
    expect(FREE_TRIAL_DAYS).toBe(30);
    const billing = await newBusiness();
    const sub = await billing.getSubscription('t1');
    expect(sub.status).toBe('TRIALING');
    expect(Math.round((new Date(sub.trial_ends_at!).getTime() - Date.now()) / DAY)).toBe(30);
    expect(await billing.listInvoices('t1')).toHaveLength(0);
  });

  it('bills the chosen plan for the next month when the trial ends', async () => {
    const billing = await newBusiness('WHOLESALE_GROWTH');
    expect(await billing.renewDueSubscriptions(later(29))).toHaveLength(0);
    const issued = await billing.renewDueSubscriptions(later(31));
    expect(issued).toHaveLength(1);
    expect(issued[0]!.total_minor).toBe('14900'); // Growth $149
  });

  it('closes the workspace after the trial while the invoice is unpaid, and reopens it once paid', async () => {
    const billing = await newBusiness();
    const guard = new BillingAccessGuard(billing);
    expect(guard.canActivate(ctx('t1'))).toBe(true); // in trial
    const [inv] = await billing.renewDueSubscriptions(later(31));
    expect(billing.accessNow('t1', later(31))).toBe('CLOSED');
    await billing.markInvoicePaid('t1', inv!.id, 'bank transfer 123');
    expect(billing.accessNow('t1', later(31))).toBe('OPEN');
  });

  it('keeps the billing page reachable when the workspace is closed', async () => {
    const billing = await newBusiness();
    await billing.renewDueSubscriptions(later(31));
    (billing as any).accessNow = () => 'CLOSED';
    const guard = new BillingAccessGuard(billing);
    expect(guard.canActivate(ctx('t1', '/v1/billing/invoices'))).toBe(true);
    expect(() => guard.canActivate(ctx('t1', '/v1/orders'))).toThrow();
  });
});

describe('Founder billing options', () => {
  it('prices: free = 0, 25% off, custom price', () => {
    expect(effectivePriceMinor('19900', { mode: 'FREE' })).toBe('0');
    expect(effectivePriceMinor('20000', { mode: 'DISCOUNT_PERCENT', value: '25' })).toBe('15000');
    expect(effectivePriceMinor('19900', { mode: 'FIXED_PRICE', value: '5000' })).toBe('5000');
  });

  it('a business set to run free is never billed and never closed', async () => {
    const billing = await newBusiness();
    await billing.setBillingOverride('t1', { mode: 'FREE', note: 'partner' }, 'founder');
    expect(await billing.renewDueSubscriptions(later(31))).toHaveLength(0);
    expect(billing.accessNow('t1', later(31))).toBe('FREE');
  });

  it('a discount applies to the next invoice', async () => {
    const billing = await newBusiness('WHOLESALE_GROWTH');
    await billing.setBillingOverride('t1', { mode: 'DISCOUNT_PERCENT', value: 50, note: 'launch' }, 'founder');
    const [inv] = await billing.renewDueSubscriptions(later(31));
    expect(inv!.total_minor).toBe('7450'); // 50% of $149
  });

  it('extra free days push the first invoice back', async () => {
    const billing = await newBusiness();
    await billing.extendTrial('t1', 15);
    expect(await billing.renewDueSubscriptions(later(40))).toHaveLength(0);
    expect(await billing.renewDueSubscriptions(later(46))).toHaveLength(1);
  });

  it('rejects a discount over 100%', async () => {
    const billing = await newBusiness();
    await expect(billing.setBillingOverride('t1', { mode: 'DISCOUNT_PERCENT', value: 150 }, 'f')).rejects.toThrow();
  });
});
