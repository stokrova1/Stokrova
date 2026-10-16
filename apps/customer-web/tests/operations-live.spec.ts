// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { code128Svg, parseCsv, renderAging } from '../operations-live.js';

describe('operations screens', () => {
  it('reads quoted CSV cells with commas', () => {
    expect(parseCsv('SKU,Name,Price\nRICE,"Rice, 5kg","5,000"\n')).toEqual([{ SKU: 'RICE', Name: 'Rice, 5kg', Price: '5,000' }]);
  });
  it('refuses barcode characters a label scanner cannot read', () => {
    expect(code128Svg('ABC-123')).toContain('<rect');
    expect(() => code128Svg('Ñ')).toThrow();
  });
  it('shows the server overdue total, never recalculating it', () => {
    const root = document.createElement('section');
    root.dataset.title = 'Customers who owe you';
    renderAging(root, { total_minor: 10000, overdue_minor: 2500, totals: { CURRENT: 7500, D1_30: 2500, D31_60: 0, D61_90: 0, D90_PLUS: 0 }, parties: [] }, 'Customer');
    expect(root.textContent).toContain('₦25.00');
    expect(root.textContent).toContain('all settled');
  });
});
