import { describe, expect, it } from 'vitest';
import { agingBucket, agingReport, countVariance, expiringBatches, parseMoneyToMinor, parseProductImport, summaryDue } from '../src/business-operations.js';

describe('money owed aging', () => {
  it('puts not-yet-due and no-due-date in current, then 30/60/90 day buckets', () => {
    expect(agingBucket('2026-10-20', '2026-10-16')).toBe('CURRENT');
    expect(agingBucket(null, '2026-10-16')).toBe('CURRENT');
    expect(agingBucket('2026-10-15', '2026-10-16')).toBe('D1_30');
    expect(agingBucket('2026-09-01', '2026-10-16')).toBe('D31_60');
    expect(agingBucket('2026-07-20', '2026-10-16')).toBe('D61_90');
    expect(agingBucket('2026-01-01', '2026-10-16')).toBe('D90_PLUS');
  });
  it('totals unpaid balances per customer and ignores paid ones', () => {
    const r = agingReport([
      { id: '1', number: 'A', party_id: 'c1', party_name: 'Ada', due_date: '2026-10-01', balance_minor: 5000 },
      { id: '2', number: 'B', party_id: 'c1', party_name: 'Ada', due_date: '2026-11-01', balance_minor: 2000 },
      { id: '3', number: 'C', party_id: 'c2', party_name: 'Bayo', due_date: '2026-01-01', balance_minor: 0 },
    ], '2026-10-16');
    expect(r.total_minor).toBe(7000);
    expect(r.overdue_minor).toBe(5000);
    expect(r.parties).toHaveLength(1);
    expect(r.parties[0]!.oldest_days_late).toBe(15);
  });
});

describe('expiry alerts', () => {
  it('lists expired and soon-expiring batches only', () => {
    const r = expiringBatches([
      { id: 'a', variant_id: 'v', expiry_date: '2026-10-10' },
      { id: 'b', variant_id: 'v', expiry_date: '2026-11-01' },
      { id: 'c', variant_id: 'v', expiry_date: '2027-06-01' },
    ], '2026-10-16', 30);
    expect(r.map((b) => b.id)).toEqual(['a', 'b']);
    expect(r[0]!.expired).toBe(true);
  });
});

describe('stock count variance', () => {
  it('values shortages at cost and keeps unknown cost unknown', () => {
    const r = countVariance([
      { variant_id: 'a', label: 'A', expected: 10, counted: 7, unit_cost_minor: 100 },
      { variant_id: 'b', label: 'B', expected: 2, counted: 5, unit_cost_minor: null },
      { variant_id: 'c', label: 'C', expected: 4, counted: null, unit_cost_minor: 50 },
    ]);
    expect(r.missing_units).toBe(3);
    expect(r.missing_value_minor).toBe(300);
    expect(r.extra_units).toBe(3);
    expect(r.extra_value_minor).toBe(0);
    expect(r.lines_without_cost).toBe(1);
    expect(r.counted_lines).toBe(2);
  });
});

describe('product import', () => {
  it('reads naira amounts with commas into kobo', () => {
    expect(parseMoneyToMinor('1,250.50')).toBe(125050);
    expect(parseMoneyToMinor('abc')).toBeNull();
  });
  it('rejects duplicate SKUs, missing price and non-https photos', () => {
    const r = parseProductImport([
      { SKU: 'rice-5kg', Name: 'Rice 5kg', Cost: '4000', Price: '5,000', Quantity: '12' },
      { SKU: 'RICE-5KG', Name: 'Rice again', Price: '1' },
      { SKU: 'oil', Name: 'Oil', Price: '' },
      { SKU: 'beans', Name: 'Beans', Price: '900', Photo: 'http://x/y.jpg' },
    ]);
    expect(r.valid).toEqual([{ sku: 'RICE-5KG', name: 'Rice 5kg', barcode: null, cost_price_minor: 400000, selling_price_minor: 500000, opening_quantity: 12, image_url: null }]);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4]);
  });
});

describe('daily summary timing', () => {
  it('is due once per Lagos day after the chosen hour', () => {
    expect(summaryDue(20, null, '2026-10-16T19:30:00Z').due).toBe(true); // 20:30 Lagos
    expect(summaryDue(20, null, '2026-10-16T18:30:00Z').due).toBe(false);
    expect(summaryDue(20, '2026-10-16', '2026-10-16T21:00:00Z').due).toBe(false);
  });
});
