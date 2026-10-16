import { describe, it, expect } from 'vitest';
import { PlanPricingService } from './plan-pricing.service.js';
import { BillingService } from './billing.service.js';
import { PlatformAdminService } from '../platform-admin/platform-admin.service.js';

describe('Founder-set plan prices', () => {
  it('charges the new monthly price on the next invoice after the founder changes it', async () => {
    const pricing = new PlanPricingService();
    await pricing.setPrice('RETAIL_STARTER', { monthly_price_minor: '7500' }, 'founder');
    const billing = new BillingService(pricing);
    await billing.createSubscription({ tenant_id: 't1', tier: 'RETAIL_STARTER' });
    const invoices = await (billing as any).listInvoices?.('t1') ?? Array.from((billing as any).invoicesStore.values());
    expect(invoices[0].subtotal_minor ?? invoices[0].total_minor).toBe('7500');
  });

  it('rejects a negative or non-whole price', async () => {
    const pricing = new PlanPricingService();
    await expect(pricing.setPrice('RETAIL_STARTER', { monthly_price_minor: '-1' }, 'f')).rejects.toThrow();
    await expect(pricing.setPrice('RETAIL_STARTER', { monthly_price_minor: '49.5' }, 'f')).rejects.toThrow();
  });

  it('rejects an unknown plan', async () => {
    await expect(new PlanPricingService().setPrice('GOLD', { monthly_price_minor: '1' }, 'f')).rejects.toThrow();
  });

  it('moving a business in the founder console switches its billing plan', async () => {
    const pricing = new PlanPricingService();
    const billing = new BillingService(pricing);
    const admin = new PlatformAdminService(undefined, true, pricing, billing);
    const id = (await admin.listBusinesses({})).items[0]!.id;
    await admin.updateBusinessTier(id, { tier: 'ENTERPRISE_LOGISTICS' });
    expect((await billing.getSubscription(id)).tier).toBe('ENTERPRISE_LOGISTICS');
    expect((await admin.listBusinesses({})).items.find((b) => b.id === id)?.subscriptionTier).toBe('ENTERPRISE_LOGISTICS');
  });

  it('refuses a plan name billing does not know', async () => {
    const admin = new PlatformAdminService(undefined, true);
    const id = (await admin.listBusinesses({})).items[0]!.id;
    await expect(admin.updateBusinessTier(id, { tier: 'COMMERCE_PRO' as any })).rejects.toThrow();
  });
});
