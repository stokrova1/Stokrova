/**
 * Product profit, price margins and stock flow. Pure rules shared by the owner dashboard,
 * the manager's live board and each seller's own page. Money is in minor units (kobo/cents).
 * A cost of 0 or missing is treated as "not set", so profit is never invented.
 */
import { dayKey } from './sales-tickets.js';

export interface PriceMargin {
  margin_minor: number | null;
  /** Profit as a share of the selling price. */
  margin_pct: number | null;
  /** Profit as a share of the cost price. */
  markup_pct: number | null;
  /** Selling below cost. */
  loss: boolean;
  cost_known: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function priceMargin(costMinor: number | null | undefined, sellMinor: number): PriceMargin {
  const cost = costMinor && costMinor > 0 ? costMinor : null;
  if (cost === null) return { margin_minor: null, margin_pct: null, markup_pct: null, loss: false, cost_known: false };
  const m = sellMinor - cost;
  return {
    margin_minor: m,
    margin_pct: sellMinor > 0 ? round1((m / sellMinor) * 100) : null,
    markup_pct: round1((m / cost) * 100),
    loss: m < 0,
    cost_known: true,
  };
}

/** Checks a price edit: whole minor units, zero or more. */
export function assertValidPrice(label: string, v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label} must be a whole amount of 0 or more.`);
  return n;
}

export interface SoldLine {
  variant_id: string;
  label: string;
  quantity: number;
  revenue_minor: number;
  /** Cost of one unit; null/0 = not set. */
  unit_cost_minor: number | null;
  sold_at: string;
}

export interface ProductPeriod {
  units: number;
  revenue_minor: number;
  profit_minor: number | null;
  margin_pct: number | null;
}

export interface ProductDay { date: string; units: number; revenue_minor: number; profit_minor: number | null }

export interface ProductPerformanceRow {
  variant_id: string;
  label: string;
  today: ProductPeriod;
  yesterday: ProductPeriod;
  week: ProductPeriod;
  previous_week: ProductPeriod;
  /** Oldest first, 7 days ending today. */
  daily: ProductDay[];
  /** Units change today vs the same day last week, in %; null when there's nothing to compare. */
  units_change_pct: number | null;
}

export interface ProductPerformance {
  date: string;
  products: ProductPerformanceRow[];
  totals: { today: ProductPeriod; yesterday: ProductPeriod; week: ProductPeriod; previous_week: ProductPeriod; daily: ProductDay[] };
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type Acc = { units: number; revenue: number; profit: number; unknown: boolean };
const emptyAcc = (): Acc => ({ units: 0, revenue: 0, profit: 0, unknown: false });
const add = (a: Acc, l: SoldLine) => {
  a.units += l.quantity;
  a.revenue += l.revenue_minor;
  if (l.unit_cost_minor && l.unit_cost_minor > 0) a.profit += l.revenue_minor - l.unit_cost_minor * l.quantity;
  else if (l.quantity !== 0) a.unknown = true;
};
const toPeriod = (a: Acc): ProductPeriod => {
  const profit = a.unknown ? null : a.profit;
  return { units: a.units, revenue_minor: a.revenue, profit_minor: profit, margin_pct: profit === null || a.revenue === 0 ? null : round1((profit / a.revenue) * 100) };
};

/** Units, money taken and profit per product for today, yesterday, this week and last week. */
export function productPerformance(lines: SoldLine[], today: string, offsetMinutes = 60): ProductPerformance {
  const weekStart = addDays(today, -6);
  const prevStart = addDays(today, -13);
  const yesterday = addDays(today, -1);
  const sameDayLastWeek = addDays(today, -7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  type P = { label: string; t: Acc; y: Acc; w: Acc; pw: Acc; lw: Acc; d: Map<string, Acc> };
  const byProduct = new Map<string, P>();
  const total: P = { label: 'All products', t: emptyAcc(), y: emptyAcc(), w: emptyAcc(), pw: emptyAcc(), lw: emptyAcc(), d: new Map() };
  for (const l of lines) {
    const k = dayKey(l.sold_at, offsetMinutes);
    if (k < prevStart || k > today) continue;
    let p = byProduct.get(l.variant_id);
    if (!p) { p = { label: l.label, t: emptyAcc(), y: emptyAcc(), w: emptyAcc(), pw: emptyAcc(), lw: emptyAcc(), d: new Map() }; byProduct.set(l.variant_id, p); }
    for (const x of [p, total]) {
      if (k === today) add(x.t, l);
      if (k === yesterday) add(x.y, l);
      if (k === sameDayLastWeek) add(x.lw, l);
      if (k >= weekStart) { add(x.w, l); const a = x.d.get(k) ?? emptyAcc(); add(a, l); x.d.set(k, a); }
      else add(x.pw, l);
    }
  }
  const daily = (x: P): ProductDay[] => days.map((date) => { const p = toPeriod(x.d.get(date) ?? emptyAcc()); return { date, units: p.units, revenue_minor: p.revenue_minor, profit_minor: p.profit_minor }; });
  const products = [...byProduct.entries()].map(([variant_id, p]) => ({
    variant_id, label: p.label,
    today: toPeriod(p.t), yesterday: toPeriod(p.y), week: toPeriod(p.w), previous_week: toPeriod(p.pw),
    daily: daily(p),
    units_change_pct: p.lw.units === 0 ? null : round1(((p.t.units - p.lw.units) / p.lw.units) * 100),
  })).sort((a, b) => b.today.revenue_minor - a.today.revenue_minor || b.week.revenue_minor - a.week.revenue_minor);
  return { date: today, products, totals: { today: toPeriod(total.t), yesterday: toPeriod(total.y), week: toPeriod(total.w), previous_week: toPeriod(total.pw), daily: daily(total) } };
}

export interface StockMove {
  quantity: number;
  source_warehouse_id: string | null;
  destination_warehouse_id: string | null;
  created_at: string;
}

/** Direction of a stock movement: into a store, out of a store, or moved between stores. */
export function moveDirection(m: StockMove): 'IN' | 'OUT' | 'MOVE' {
  if (m.destination_warehouse_id && !m.source_warehouse_id) return 'IN';
  if (m.source_warehouse_id && !m.destination_warehouse_id) return 'OUT';
  return 'MOVE';
}

export interface StockFlowDay { date: string; in: number; out: number; moved: number }

/** Units coming in, going out and moved between stores, per day for the last 7 days. */
export function stockFlow(moves: StockMove[], today: string, offsetMinutes = 60): { today: StockFlowDay; week: StockFlowDay; daily: StockFlowDay[] } {
  const start = addDays(today, -6);
  const daily = Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), in: 0, out: 0, moved: 0 }));
  for (const m of moves) {
    const k = dayKey(m.created_at, offsetMinutes);
    const d = daily.find((x) => x.date === k);
    if (!d) continue;
    const dir = moveDirection(m);
    if (dir === 'IN') d.in += m.quantity; else if (dir === 'OUT') d.out += m.quantity; else d.moved += m.quantity;
  }
  const week = daily.reduce((s, d) => ({ date: start, in: s.in + d.in, out: s.out + d.out, moved: s.moved + d.moved }), { date: start, in: 0, out: 0, moved: 0 });
  return { today: daily[6]!, week, daily };
}

/** Stock level label. "Low" is 5 units or fewer available unless the business sets its own level. */
export function stockLevel(available: number, lowAt = 5): 'OUT' | 'LOW' | 'OK' {
  if (available <= 0) return 'OUT';
  return available <= lowAt ? 'LOW' : 'OK';
}
