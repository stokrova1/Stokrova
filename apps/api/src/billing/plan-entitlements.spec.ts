import { describe, it, expect } from 'vitest';
import { BillingService } from './billing.service.js';
import { PlanEntitlementsService } from './plan-entitlements.service.js';

async function setup(tier: 'RETAIL_STARTER' | 'WHOLESALE_GROWTH' | 'ENTERPRISE_LOGISTICS') {
  const billing = new BillingService();
  const plans = new PlanEntitlementsService(billing);
  const tenant = `ten_${Math.random().toString(36).slice(2)}`;
  await billing.createSubscription({ tenant_id: tenant, tier, trial_days: 30 });
  return { billing, plans, tenant };
}

describe('plans are enforced', () => {
  it('Starter refuses a 4th staff member', async () => {
    const { plans, tenant } = await setup('RETAIL_STARTER');
    await expect(plans.assertCanAdd(tenant, 'max_users', 2)).resolves.toBeUndefined();
    await expect(plans.assertCanAdd(tenant, 'max_users', 3)).rejects.toMatchObject({ status: 403 });
  });
  it('Starter refuses a 2nd branch and a 2nd till', async () => {
    const { plans, tenant } = await setup('RETAIL_STARTER');
    await expect(plans.assertCanAdd(tenant, 'max_branches', 1)).rejects.toMatchObject({ status: 403 });
    await expect(plans.assertCanAdd(tenant, 'max_active_registers', 1)).rejects.toMatchObject({ status: 403 });
  });
  it('Starter cannot open Manufacturing or Workflows', async () => {
    const { plans, tenant } = await setup('RETAIL_STARTER');
    await expect(plans.assertFeature(tenant, 'mo')).rejects.toMatchObject({ status: 403 });
    await expect(plans.assertFeature(tenant, 'workflows')).rejects.toMatchObject({ status: 403 });
  });
  it('Growth: 6th branch refused, staff unlimited', async () => {
    const { plans, tenant } = await setup('WHOLESALE_GROWTH');
    await expect(plans.assertCanAdd(tenant, 'max_branches', 4)).resolves.toBeUndefined();
    await expect(plans.assertCanAdd(tenant, 'max_branches', 5)).rejects.toMatchObject({ status: 403 });
    await expect(plans.assertCanAdd(tenant, 'max_users', 500)).resolves.toBeUndefined();
  });
  it('upgrading unlocks pages straight away', async () => {
    const { billing, plans, tenant } = await setup('RETAIL_STARTER');
    expect((await plans.entitlements(tenant)).pages).not.toContain('mo');
    await billing.changePlan(tenant, 'ENTERPRISE_LOGISTICS');
    expect((await plans.entitlements(tenant)).pages).toContain('mo');
    expect((await billing.planHistory(tenant))[0]).toMatchObject({ from_tier: 'RETAIL_STARTER', to_tier: 'ENTERPRISE_LOGISTICS' });
  });
  it('downgrade blocked when over the smaller plan', async () => {
    const { plans, tenant } = await setup('WHOLESALE_GROWTH');
    plans.registerCounter('max_users', async () => 6);
    expect((await plans.downgradeBlockers(tenant, 'RETAIL_STARTER')).length).toBe(1);
  });
  it('founder grant lets a Starter business have 5 staff', async () => {
    const { billing, plans, tenant } = await setup('RETAIL_STARTER');
    await billing.setPlanGrants(tenant, { limits: { max_users: 5 } });
    await expect(plans.assertCanAdd(tenant, 'max_users', 4)).resolves.toBeUndefined();
    await expect(plans.assertCanAdd(tenant, 'max_users', 5)).rejects.toMatchObject({ status: 403 });
  });
  it('a business with no plan chosen starts on Starter', async () => {
    const billing = new BillingService();
    expect((await billing.getSubscription('ten_none')).tier).toBe('RETAIL_STARTER');
  });
});
