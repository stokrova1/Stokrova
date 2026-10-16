/**
 * Money owed (receivables / payables aging), expiry and low-stock alerts, stock-count variances,
 * product spreadsheet import rows and the daily owner summary. Pure functions, minor units only.
 */

export type AgingBucket = 'CURRENT' | 'D1_30' | 'D31_60' | 'D61_90' | 'D90_PLUS';
export const AGING_BUCKETS: AgingBucket[] = ['CURRENT', 'D1_30', 'D31_60', 'D61_90', 'D90_PLUS'];

export interface OpenDocument {
  id: string;
  number: string;
  party_id: string | null;
  party_name: string;
  due_date: string | null; // YYYY-MM-DD or ISO
  balance_minor: number;
}

const toDay = (d: string) => d.slice(0, 10);
export function daysBetween(fromDay: string, toDayKey: string): number {
  return Math.round((Date.parse(`${toDay(toDayKey)}T00:00:00Z`) - Date.parse(`${toDay(fromDay)}T00:00:00Z`)) / 86_400_000);
}

/** Days past due -> bucket. Not yet due (or no due date) is CURRENT. */
export function agingBucket(dueDate: string | null, today: string): AgingBucket {
  if (!dueDate) return 'CURRENT';
  const late = daysBetween(dueDate, today);
  if (late <= 0) return 'CURRENT';
  if (late <= 30) return 'D1_30';
  if (late <= 60) return 'D31_60';
  if (late <= 90) return 'D61_90';
  return 'D90_PLUS';
}

export interface AgingReport {
  totals: Record<AgingBucket, number>;
  total_minor: number;
  overdue_minor: number;
  parties: { party_id: string | null; party_name: string; total_minor: number; overdue_minor: number; oldest_days_late: number; buckets: Record<AgingBucket, number>; documents: number }[];
  documents: (OpenDocument & { bucket: AgingBucket; days_late: number })[];
}

const emptyBuckets = (): Record<AgingBucket, number> => ({ CURRENT: 0, D1_30: 0, D31_60: 0, D61_90: 0, D90_PLUS: 0 });

/** Groups unpaid documents by how late they are; fully paid documents are ignored. */
export function agingReport(docs: OpenDocument[], today: string): AgingReport {
  const totals = emptyBuckets();
  const parties = new Map<string, AgingReport['parties'][number]>();
  const out: AgingReport['documents'] = [];
  for (const d of docs) {
    if (!(d.balance_minor > 0)) continue;
    const bucket = agingBucket(d.due_date, today);
    const days_late = d.due_date ? Math.max(0, daysBetween(d.due_date, today)) : 0;
    totals[bucket] += d.balance_minor;
    const key = d.party_id ?? `name:${d.party_name}`;
    const p = parties.get(key) ?? { party_id: d.party_id, party_name: d.party_name, total_minor: 0, overdue_minor: 0, oldest_days_late: 0, buckets: emptyBuckets(), documents: 0 };
    p.total_minor += d.balance_minor;
    if (bucket !== 'CURRENT') p.overdue_minor += d.balance_minor;
    p.oldest_days_late = Math.max(p.oldest_days_late, days_late);
    p.buckets[bucket] += d.balance_minor;
    p.documents++;
    parties.set(key, p);
    out.push({ ...d, bucket, days_late });
  }
  const total_minor = AGING_BUCKETS.reduce((s, b) => s + totals[b], 0);
  return {
    totals, total_minor, overdue_minor: total_minor - totals.CURRENT,
    parties: [...parties.values()].sort((a, b) => b.overdue_minor - a.overdue_minor || b.total_minor - a.total_minor),
    documents: out.sort((a, b) => b.days_late - a.days_late),
  };
}

export interface BatchLike { id: string; variant_id: string; batch_number?: string; expiry_date: string | null; quantity?: number; status?: string }

/** Batches already expired or expiring within `withinDays`. */
export function expiringBatches<T extends BatchLike>(batches: T[], today: string, withinDays = 30): (T & { days_left: number; expired: boolean })[] {
  return batches
    .filter((b) => b.expiry_date && b.status !== 'CONSUMED' && b.status !== 'DISPOSED')
    .map((b) => { const days_left = daysBetween(today, b.expiry_date as string); return { ...b, days_left, expired: days_left < 0 }; })
    .filter((b) => b.days_left <= withinDays)
    .sort((a, b) => a.days_left - b.days_left);
}

export interface CountLine { variant_id: string; label: string; expected: number; counted: number | null; unit_cost_minor: number | null }

/** Shortage/surplus per line and in money (unknown cost stays unknown). */
export function countVariance(lines: CountLine[]) {
  let counted = 0, shortUnits = 0, surplusUnits = 0, shortValue = 0, surplusValue = 0, unknownCost = 0;
  const rows = lines.map((l) => {
    const diff = l.counted === null ? null : l.counted - l.expected;
    if (diff !== null) {
      counted++;
      if (diff < 0) shortUnits += -diff; else surplusUnits += diff;
      if (diff !== 0) {
        if (l.unit_cost_minor && l.unit_cost_minor > 0) { if (diff < 0) shortValue += -diff * l.unit_cost_minor; else surplusValue += diff * l.unit_cost_minor; }
        else unknownCost++;
      }
    }
    return { ...l, difference: diff, value_minor: diff !== null && l.unit_cost_minor ? diff * l.unit_cost_minor : null };
  });
  return {
    lines: rows, total_lines: lines.length, counted_lines: counted,
    missing_units: shortUnits, extra_units: surplusUnits, missing_value_minor: shortValue, extra_value_minor: surplusValue,
    net_value_minor: surplusValue - shortValue, lines_without_cost: unknownCost,
  };
}

export interface ImportRow { sku: string; name: string; barcode: string | null; cost_price_minor: number; selling_price_minor: number; opening_quantity: number; image_url: string | null }

const MONEY = /^\d+(\.\d{1,2})?$/;
/** Spreadsheet money (e.g. "1,250.50") -> minor units; blank -> 0. */
export function parseMoneyToMinor(raw: unknown): number | null {
  const s = String(raw ?? '').replace(/[,\s₦$]/g, '');
  if (!s) return 0;
  if (!MONEY.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Validates spreadsheet rows. Returns clean rows and per-row error messages (1-based row numbers). */
export function parseProductImport(rows: Record<string, unknown>[]): { valid: ImportRow[]; errors: { row: number; message: string }[] } {
  const valid: ImportRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const seen = new Set<string>();
  const pick = (r: Record<string, unknown>, ...keys: string[]) => {
    for (const k of Object.keys(r)) if (keys.includes(k.trim().toLowerCase().replace(/[\s-]+/g, '_'))) return r[k];
    return undefined;
  };
  rows.forEach((r, i) => {
    const row = i + 1;
    const sku = String(pick(r, 'sku', 'code', 'product_code') ?? '').trim().toUpperCase();
    const name = String(pick(r, 'name', 'product', 'product_name') ?? '').trim();
    if (!sku && !name) return; // blank line
    if (!sku) return void errors.push({ row, message: 'SKU is missing.' });
    if (!name) return void errors.push({ row, message: `${sku}: name is missing.` });
    if (seen.has(sku)) return void errors.push({ row, message: `${sku} appears twice in the file.` });
    const cost = parseMoneyToMinor(pick(r, 'cost', 'cost_price'));
    const sell = parseMoneyToMinor(pick(r, 'price', 'selling_price', 'sell_price'));
    if (cost === null) return void errors.push({ row, message: `${sku}: cost price is not a number.` });
    if (sell === null || sell <= 0) return void errors.push({ row, message: `${sku}: selling price must be more than 0.` });
    const qRaw = String(pick(r, 'quantity', 'qty', 'stock', 'opening_stock') ?? '').trim();
    const qty = qRaw === '' ? 0 : Number(qRaw);
    if (!Number.isInteger(qty) || qty < 0) return void errors.push({ row, message: `${sku}: quantity must be a whole number, 0 or more.` });
    const barcode = String(pick(r, 'barcode', 'ean', 'upc') ?? '').trim() || null;
    const image = String(pick(r, 'image', 'image_url', 'photo') ?? '').trim() || null;
    if (image && !/^https:\/\//i.test(image)) return void errors.push({ row, message: `${sku}: photo must be an https:// link.` });
    seen.add(sku);
    valid.push({ sku, name, barcode, cost_price_minor: cost, selling_price_minor: sell, opening_quantity: qty, image_url: image });
  });
  return { valid, errors };
}

export interface DailySummaryInput {
  business: string;
  date: string;
  sales_minor: number;
  sales_count: number;
  cash_minor: number;
  transfer_minor: number;
  low_stock: { label: string; available: number }[];
  out_of_stock: number;
  expiring: { label: string; days_left: number }[];
  overdue_receivables_minor: number;
  overdue_payables_minor: number;
  currency?: string;
}

/** Plain-text message for email or WhatsApp. */
export function dailySummaryText(s: DailySummaryInput): string {
  const m = (v: number) => `${s.currency ?? '₦'}${(v / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lines = [
    `${s.business} — daily summary for ${s.date}`,
    `Sales: ${m(s.sales_minor)} from ${s.sales_count} sale${s.sales_count === 1 ? '' : 's'} (cash ${m(s.cash_minor)}, transfer ${m(s.transfer_minor)})`,
    `Out of stock: ${s.out_of_stock}. Running low: ${s.low_stock.length}`,
  ];
  if (s.low_stock.length) lines.push(`Reorder soon: ${s.low_stock.slice(0, 8).map((l) => `${l.label} (${l.available} left)`).join(', ')}`);
  if (s.expiring.length) lines.push(`Expiring: ${s.expiring.slice(0, 8).map((e) => `${e.label} (${e.days_left < 0 ? 'expired' : `${e.days_left} days`})`).join(', ')}`);
  if (s.overdue_receivables_minor > 0) lines.push(`Customers owe you (overdue): ${m(s.overdue_receivables_minor)}`);
  if (s.overdue_payables_minor > 0) lines.push(`You owe suppliers (overdue): ${m(s.overdue_payables_minor)}`);
  return lines.join('\n');
}

/** Whether the daily summary is due now (Lagos hour reached and not yet sent today). */
export function summaryDue(sendHour: number, lastSentDay: string | null, nowIso: string, offsetMinutes = 60): { due: boolean; day: string } {
  const local = new Date(Date.parse(nowIso) + offsetMinutes * 60_000);
  const day = local.toISOString().slice(0, 10);
  return { due: local.getUTCHours() >= sendHour && lastSentDay !== day, day };
}
