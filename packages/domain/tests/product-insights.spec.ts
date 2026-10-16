import { describe, it, expect } from 'vitest';
import { priceMargin, productPerformance, stockFlow, stockLevel, assertValidPrice } from '../src/product-insights.js';

describe('price margin', () => {
  it('works out margin and markup from cost and selling price', () => {
    expect(priceMargin(600, 1000)).toMatchObject({ margin_minor: 400, margin_pct: 40, markup_pct: 66.7, loss: false });
  });
  it('flags selling below cost', () => {
    expect(priceMargin(1200, 1000).loss).toBe(true);
  });
  it('never invents a margin when cost is not set', () => {
    expect(priceMargin(0, 1000)).toMatchObject({ margin_minor: null, cost_known: false });
  });
  it('rejects negative or fractional prices', () => {
    expect(() => assertValidPrice('Selling price', -1)).toThrow();
    expect(() => assertValidPrice('Selling price', 1.5)).toThrow();
  });
});

describe('product performance', () => {
  const line = (sold_at: string, quantity: number, cost: number | null = 600) => ({ variant_id: 'tea', label: 'Tea', quantity, revenue_minor: 1000 * quantity, unit_cost_minor: cost, sold_at });
  it('counts units sold and profit for today, and compares with the same day last week', () => {
    const r = productPerformance([line('2026-10-16T09:00:00Z', 3), line('2026-10-09T09:00:00Z', 2)], '2026-10-16');
    const tea = r.products[0]!;
    expect(tea.today).toMatchObject({ units: 3, revenue_minor: 3000, profit_minor: 1200, margin_pct: 40 });
    expect(tea.previous_week.units).toBe(2);
    expect(tea.units_change_pct).toBe(50);
  });
  it('shows profit as unknown when any sold unit has no cost', () => {
    const r = productPerformance([line('2026-10-16T09:00:00Z', 1), line('2026-10-16T10:00:00Z', 1, null)], '2026-10-16');
    expect(r.products[0]!.today.profit_minor).toBeNull();
  });
  it('counts refunds (negative quantities) against the day', () => {
    const r = productPerformance([line('2026-10-16T09:00:00Z', 3), line('2026-10-16T11:00:00Z', -1)], '2026-10-16');
    expect(r.totals.today.units).toBe(2);
  });
});

describe('stock flow', () => {
  it('splits units into coming in, going out and moved between stores', () => {
    const f = stockFlow([
      { quantity: 10, source_warehouse_id: null, destination_warehouse_id: 'w1', created_at: '2026-10-16T08:00:00Z' },
      { quantity: 4, source_warehouse_id: 'w1', destination_warehouse_id: null, created_at: '2026-10-16T09:00:00Z' },
      { quantity: 2, source_warehouse_id: 'w1', destination_warehouse_id: 'w2', created_at: '2026-10-16T10:00:00Z' },
    ], '2026-10-16');
    expect(f.today).toMatchObject({ in: 10, out: 4, moved: 2 });
  });
  it('labels stock out at 0 and low at 5 or fewer', () => {
    expect(stockLevel(0)).toBe('OUT');
    expect(stockLevel(5)).toBe('LOW');
    expect(stockLevel(6)).toBe('OK');
  });
});
