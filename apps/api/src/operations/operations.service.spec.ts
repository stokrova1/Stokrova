import { describe, expect, it, vi } from 'vitest';
import { OperationsService } from './operations.service.js';
import { configuredChannels, sendWhatsApp } from './notifier.js';

function make() {
  const reconcile = vi.fn(async () => ({ discrepancy: 0 }));
  const adjust = vi.fn(async () => ({}));
  const variants = [{ id: 'v1', sku: 'RICE', cost_price_minor: '400000', selling_price_minor: '500000', attributes: {} }, { id: 'v2', sku: 'OIL', cost_price_minor: '0', selling_price_minor: '9000', attributes: {} }];
  const svc = new OperationsService(
    { listInvoices: async () => [{ id: 'i1', invoice_number: 'INV-1', customer_id: 'c1', customer_name: 'Ada', status: 'ISSUED', due_date: '2020-01-01', balance_due_minor: '7000' }, { id: 'i2', invoice_number: 'INV-2', customer_id: 'c2', customer_name: 'Bayo', status: 'PAID', due_date: '2020-01-01', balance_due_minor: '0' }] } as any,
    { list: async () => [{ id: 'p1', invoice_number: 'PI-1', supplier_invoice_reference: 'SUP-9', supplier_id: 's1', status: 'APPROVED', due_date: '2020-01-01', total_minor: '10000', amount_paid_minor: '4000' }] } as any,
    { listSuppliers: async () => [{ id: 's1', name: 'Dangote' }] } as any,
    { getVariants: async () => variants, createVariant: vi.fn(async (_t: string, r: any) => ({ id: `new_${r.sku}` })), updateVariant: vi.fn(async () => ({})) } as any,
    { createTemplate: vi.fn(async () => ({ id: 'tpl' })) } as any,
    { getUoms: async () => [{ id: 'pc' }] } as any,
    { getBalances: async () => [{ warehouse_id: 'w1', variant_id: 'v1', on_hand_quantity: 10, available_to_promise: 3 }], reconcileStockCount: reconcile, adjustStock: adjust } as any,
    { getBatches: async () => [] } as any,
    { listEvents: () => [] } as any,
    { getTenantById: async () => ({ name: 'Ada Stores' }) } as any,
  );
  return { svc, reconcile, adjust };
}

describe('OperationsService', () => {
  it('customers who owe: only unpaid invoices, with names', async () => {
    const r = await make().svc.receivables('t1');
    expect(r.total_minor).toBe(7000);
    expect(r.parties[0]!.party_name).toBe('Ada');
  });

  it('what we owe suppliers is total minus already paid', async () => {
    const r = await make().svc.payables('t1');
    expect(r.overdue_minor).toBe(6000);
    expect(r.parties[0]!.party_name).toBe('Dangote');
  });

  it('a stock count only posts lines that were counted, then closes', async () => {
    const { svc, reconcile } = make();
    const c = await svc.startCount('t1', 'u1', 'w1');
    expect(c.lines.find((l) => l.variant_id === 'v1')!.expected).toBe(10);
    svc.recordCounts('t1', c.id, [{ variant_id: 'v1', counted: 8 }]);
    const done = await svc.postCount('t1', 'u1', c.id);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(done.status).toBe('POSTED');
    expect(done.summary.missing_value_minor).toBe(800000);
    await expect(svc.postCount('t1', 'u1', c.id)).rejects.toThrow('already closed');
  });

  it('refuses a second open count for the same location', async () => {
    const { svc } = make();
    await svc.startCount('t1', 'u1', 'w1');
    await expect(svc.startCount('t1', 'u1', 'w1')).rejects.toThrow('already open');
  });

  it('import skips existing SKUs and books opening stock', async () => {
    const { svc, adjust } = make();
    const r = await svc.importProducts('t1', 'u1', { warehouse_id: 'w1', rows: [{ sku: 'RICE', name: 'Rice', price: '5000' }, { sku: 'BEANS', name: 'Beans', price: '900', quantity: '4' }] });
    expect(r.created).toBe(1);
    expect(adjust).toHaveBeenCalledTimes(1);
    expect(r.errors[0]!.message).toContain('already exists');
  });

  it('low stock uses the business threshold', async () => {
    const d = await make().svc.digest('t1');
    expect(d.low_stock.map((l) => l.variant_id)).toEqual(['v1']);
    expect(d.out_of_stock).toBe(1);
  });

  it('rejects a WhatsApp number without country code', () => {
    expect(() => make().svc.saveSettings('t1', { whatsapp: '0801' })).toThrow('country code');
  });

  it('WhatsApp is never reported sent without its keys', async () => {
    expect(configuredChannels({}).whatsapp).toBe(false);
    expect((await sendWhatsApp('+2348000000000', 'hi', {})).ok).toBe(false);
  });
});
