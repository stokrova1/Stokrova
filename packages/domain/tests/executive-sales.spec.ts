import { describe, expect, it } from 'vitest';
import {
  buildExecutiveSalesSnapshot,
  parseAmountToMinor,
  parseSalesRows,
  summarizePeriod,
  type ExecutiveSaleRecord,
} from '../src/executive-sales.js';

const day = (saleDate: string, net: number, cogs: number | null): ExecutiveSaleRecord => ({
  saleDate,
  netSalesMinor: net,
  cogsMinor: cogs,
});

describe('executive sales snapshot', () => {
  it('refunds subtract from daily sales and profit', () => {
    const s = summarizePeriod([day('2026-10-15', 100_000, 60_000), day('2026-10-15', -20_000, -12_000)], '2026-10-15', '2026-10-15');
    expect(s.netSalesMinor).toBe(80_000);
    expect(s.grossProfitMinor).toBe(32_000);
    expect(s.marginPct).toBe(40);
  });

  it('weekly margin is weighted from totals, not averaged', () => {
    const snap = buildExecutiveSalesSnapshot(
      [day('2026-10-14', 100_000, 50_000), day('2026-10-15', 300_000, 240_000)],
      '2026-10-15',
    );
    // (400000 - 290000) / 400000 = 27.5%, while averaging 50% and 20% would give 35%
    expect(snap.week.marginPct).toBe(27.5);
  });

  it('reports margin unavailable when any cost is unknown', () => {
    const s = summarizePeriod([day('2026-10-15', 100_000, 60_000), day('2026-10-15', 50_000, null)], '2026-10-15', '2026-10-15');
    expect(s.grossProfitMinor).toBeNull();
    expect(s.marginPct).toBeNull();
  });

  it('compares week over week in percent and margin points', () => {
    const snap = buildExecutiveSalesSnapshot(
      [day('2026-10-08', 200_000, 120_000), day('2026-10-15', 250_000, 140_000)],
      '2026-10-15',
    );
    expect(snap.weeklyChange.salesChangePct).toBe(25);
    expect(snap.weeklyChange.marginPoints).toBe(4);
  });
});

describe('spreadsheet parsing', () => {
  it('converts amounts to minor units exactly', () => {
    expect(parseAmountToMinor('1,250.50')).toBe(125_050);
    expect(parseAmountToMinor('-30')).toBe(-3_000);
  });

  it('rejects duplicate references inside one file', () => {
    const { rows, errors } = parseSalesRows([
      { reference: 'R1', date: '2026-10-15', net_sales: '10', cost: '4' },
      { reference: 'R1', date: '2026-10-15', net_sales: '10', cost: '' },
    ]);
    expect(rows).toHaveLength(1);
    expect(errors[0]).toContain('duplicate');
  });
});
