import { describe, it, expect } from 'vitest';
import { InsightsService } from './insights.service.js';

const now = new Date().toISOString();
const variant = { id: 'v1', sku: 'TEA', attributes: {}, cost_price_minor: '600', selling_price_minor: '1000' };
const make = (events: any[] = []) => {
  const orders = { listSalesOrders: async () => [
    { id: 'o1', status: 'CONFIRMED', created_at: now, confirmed_at: now, lines: [{ variant_id: 'v1', product_name: 'Tea', sku: 'TEA', quantity: 3, line_total_minor: '3000', tax_minor: '0' }] },
    { id: 'o2', status: 'CONFIRMED', created_at: now, confirmed_at: now, lines: [{ variant_id: 'v1', product_name: 'Tea', sku: 'TEA', quantity: 2, line_total_minor: '2000', tax_minor: '0' }] },
    { id: 'o3', status: 'CANCELLED', created_at: now, lines: [{ variant_id: 'v1', product_name: 'Tea', sku: 'TEA', quantity: 9, line_total_minor: '9000', tax_minor: '0' }] },
  ] } as any;
  let saved: any = null;
  const variants = { getVariants: async () => [variant], getVariantById: async () => variant, updateVariant: async (_t: string, _id: string, r: any) => { saved = r; return variant; } } as any;
  const stock = { getBalances: async () => [{ variant_id: 'v1', on_hand_quantity: 4, available_to_promise: 4 }], getLedgerEntries: async () => [] } as any;
  const tickets = { listEvents: () => events } as any;
  const tenancy = { listStaff: () => [{ id: 'u1', name: 'Ada', role: 'CASHIER' }] } as any;
  const delivery = { listAllRuns: () => [] } as any;
  return { svc: new InsightsService(orders, variants, stock, tickets, tenancy, delivery), saved: () => saved };
};

describe('insights', () => {
  it('counts every confirmed sale for the owner and skips cancelled orders', async () => {
    const r = await make().svc.products('t1');
    expect(r.totals.today).toMatchObject({ units: 5, revenue_minor: 5000, profit_minor: 2000, margin_pct: 40 });
  });
  it("shows a seller only the products from their own till sales", async () => {
    const r = await make([{ tenant_id: 't1', user_id: 'u1', kind: 'SALE', order_id: 'o2', occurred_at: now }]).svc.myProducts('t1', 'u1');
    expect(r.totals.today.units).toBe(2);
  });
  it('flags products running low and values stock at cost', async () => {
    const s = await make().svc.stockSummary('t1');
    expect(s).toMatchObject({ running_low: 1, stock_value_minor: 2400 });
  });
  it('saves a price change with who made it and the new margin', async () => {
    const m = make();
    const r = await m.svc.updatePrice('t1', 'u1', 'v1', { selling_price_minor: 1200 });
    expect(m.saved()).toEqual({ selling_price_minor: '1200' });
    expect(r).toMatchObject({ changed_by: 'u1', old_selling_minor: 1000, new_selling_minor: 1200, margin_pct: 50 });
  });
  it('rejects a negative price', async () => {
    await expect(make().svc.updatePrice('t1', 'u1', 'v1', { selling_price_minor: -5 })).rejects.toThrow();
  });
  it("names each staff member on the manager's live board", async () => {
    const a = await make([{ tenant_id: 't1', user_id: 'u1', kind: 'SALE', reference: 'R1', quantity: 1, amount_minor: 3000, cash_minor: 3000, transfer_minor: 0, order_id: 'o1', occurred_at: now }]).svc.activity('t1');
    expect(a.staff[0]).toMatchObject({ name: 'Ada', sales: 1, sales_value_minor: 3000, active_now: true });
    expect(a.feed[0]).toMatchObject({ who: 'Ada', what: 'recorded a sale' });
  });
});
