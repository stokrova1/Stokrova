// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderPrices, renderProducts } from '../insights-live.js';

describe('prices & margin page', () => {
  it('saves typed prices as minor units (₦12.50 -> 1250)', async () => {
    const root = document.createElement('div');
    const sent: any[] = [];
    renderPrices(root, [{ variant_id: 'v1', label: 'Tea', cost_price_minor: 600, selling_price_minor: 1000, margin_minor: 400, margin_pct: 40, loss: false, cost_known: true, available_quantity: 3, stock_level: 'LOW', last_change: null }], async (m: string, p: string, b: any) => { sent.push([m, p, b]); return {}; }, () => {});
    (root.querySelector('[name=sell]') as HTMLInputElement).value = '12.50';
    (root.querySelector('[data-save]') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(sent[0]).toEqual(['POST', '/insights/prices/v1', { cost_price_minor: 600, selling_price_minor: 1250 }]);
  });
});

describe('product performance', () => {
  it('says "Cost not set" instead of inventing a profit', () => {
    const root = document.createElement('div');
    const period = (units: number, rev: number, profit: number | null) => ({ units, revenue_minor: rev, profit_minor: profit, margin_pct: null });
    const daily = [{ date: '2026-10-16', units: 1, revenue_minor: 1000, profit_minor: null }];
    renderProducts(root, { date: '2026-10-16', products: [{ variant_id: 'v', label: 'Tea', today: period(1, 1000, null), yesterday: period(0, 0, 0), week: period(1, 1000, null), previous_week: period(0, 0, 0), daily, units_change_pct: null }], totals: { today: period(1, 1000, null), yesterday: period(0, 0, 0), week: period(1, 1000, null), previous_week: period(0, 0, 0), daily } }, false);
    expect(root.textContent).toContain('Cost not set');
  });
});
