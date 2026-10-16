/**
 * Executive sales math — pure functions shared by the API snapshot, the dashboard and the AI analyst.
 * All amounts are signed integer minor units (refunds are negative). A null cost means "unknown":
 * profit and margin are then reported as unavailable rather than invented.
 */

export interface ExecutiveSaleRecord {
  /** Business date in the company's timezone, YYYY-MM-DD. */
  saleDate: string;
  netSalesMinor: number;
  cogsMinor: number | null;
}

export interface ExecutivePeriodSummary {
  from: string;
  to: string;
  transactions: number;
  netSalesMinor: number;
  cogsMinor: number | null;
  grossProfitMinor: number | null;
  /** Percentage, one decimal, weighted from totals (never an average of daily margins). */
  marginPct: number | null;
}

export interface ExecutiveComparison {
  salesChangePct: number | null;
  marginPoints: number | null;
}

export interface ExecutiveDay {
  date: string;
  netSalesMinor: number;
  grossProfitMinor: number | null;
  cogsMinor: number | null;
}

export interface ExecutiveSalesSnapshot {
  asOf: string;
  today: ExecutivePeriodSummary;
  sameDayLastWeek: ExecutivePeriodSummary;
  week: ExecutivePeriodSummary;
  previousWeek: ExecutivePeriodSummary;
  dailyChange: ExecutiveComparison;
  weeklyChange: ExecutiveComparison;
  days: ExecutiveDay[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function shiftIsoDate(date: string, days: number): string {
  if (!ISO_DATE.test(date)) throw new Error(`Invalid date: ${date}`);
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${date}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Business date for an instant in an IANA timezone (e.g. Africa/Lagos). */
export function businessDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function summarizePeriod(
  records: ExecutiveSaleRecord[],
  from: string,
  to: string,
): ExecutivePeriodSummary {
  const inRange = records.filter((r) => r.saleDate >= from && r.saleDate <= to);
  const netSalesMinor = inRange.reduce((s, r) => s + r.netSalesMinor, 0);
  const costKnown = inRange.every((r) => r.cogsMinor !== null);
  const cogsMinor = inRange.length && costKnown ? inRange.reduce((s, r) => s + (r.cogsMinor ?? 0), 0) : null;
  const grossProfitMinor = cogsMinor === null ? null : netSalesMinor - cogsMinor;
  const marginPct =
    grossProfitMinor === null || netSalesMinor === 0
      ? null
      : Math.round((grossProfitMinor / netSalesMinor) * 1000) / 10;
  return { from, to, transactions: inRange.length, netSalesMinor, cogsMinor, grossProfitMinor, marginPct };
}

export function compareSummaries(
  current: ExecutivePeriodSummary,
  previous: ExecutivePeriodSummary,
): ExecutiveComparison {
  const salesChangePct =
    previous.netSalesMinor === 0
      ? null
      : Math.round(((current.netSalesMinor - previous.netSalesMinor) / Math.abs(previous.netSalesMinor)) * 1000) / 10;
  const marginPoints =
    current.marginPct === null || previous.marginPct === null
      ? null
      : Math.round((current.marginPct - previous.marginPct) * 10) / 10;
  return { salesChangePct, marginPoints };
}

export function buildExecutiveSalesSnapshot(records: ExecutiveSaleRecord[], asOf: string): ExecutiveSalesSnapshot {
  const today = summarizePeriod(records, asOf, asOf);
  const lastWeekDay = shiftIsoDate(asOf, -7);
  const sameDayLastWeek = summarizePeriod(records, lastWeekDay, lastWeekDay);
  const weekFrom = shiftIsoDate(asOf, -6);
  const week = summarizePeriod(records, weekFrom, asOf);
  const previousWeek = summarizePeriod(records, shiftIsoDate(asOf, -13), shiftIsoDate(asOf, -7));
  const days: ExecutiveDay[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = shiftIsoDate(asOf, -i);
    const s = summarizePeriod(records, date, date);
    days.push({ date, netSalesMinor: s.netSalesMinor, grossProfitMinor: s.grossProfitMinor, cogsMinor: s.cogsMinor });
  }
  return {
    asOf,
    today,
    sameDayLastWeek,
    week,
    previousWeek,
    dailyChange: compareSummaries(today, sameDayLastWeek),
    weeklyChange: compareSummaries(week, previousWeek),
    days,
  };
}

export interface ParsedSalesRow {
  reference: string;
  saleDate: string;
  netSalesMinor: number;
  cogsMinor: number | null;
}

/** Parses a decimal amount like "1,250.50" or "-30" into minor units without float drift. */
export function parseAmountToMinor(raw: string, decimals = 2): number {
  const clean = raw.replace(/[\s,]/g, '').replace(/^[^\d\-+.]+/, '');
  if (!/^[-+]?\d+(\.\d+)?$/.test(clean)) throw new Error(`Invalid amount: ${raw}`);
  const negative = clean.startsWith('-');
  const [whole, frac = ''] = clean.replace(/^[-+]/, '').split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const value = Number(whole) * 10 ** decimals + Number(fracPadded || '0');
  if (!Number.isSafeInteger(value) || value > 1e12) throw new Error(`Amount out of range: ${raw}`);
  return negative ? -value : value;
}

/**
 * Validates spreadsheet rows (reference, date, net sales, optional cost).
 * Duplicate references inside one file are rejected so a single upload can't double count.
 */
export function parseSalesRows(rows: Record<string, string>[]): { rows: ParsedSalesRow[]; errors: string[] } {
  const out: ParsedSalesRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const pick = (row: Record<string, string>, names: string[]) => {
    for (const key of Object.keys(row)) {
      if (names.includes(key.trim().toLowerCase().replace(/[\s-]+/g, '_'))) return (row[key] ?? '').trim();
    }
    return '';
  };
  rows.forEach((row, i) => {
    const line = i + 2;
    try {
      const reference = pick(row, ['reference', 'ref', 'order_number', 'receipt', 'invoice']);
      const saleDate = pick(row, ['date', 'sale_date', 'business_date']);
      const sales = pick(row, ['net_sales', 'sales', 'amount', 'total']);
      const cost = pick(row, ['cost', 'cogs', 'product_cost']);
      if (!reference) throw new Error('missing reference');
      if (reference.length > 120) throw new Error('reference too long');
      if (!ISO_DATE.test(saleDate)) throw new Error('date must be YYYY-MM-DD');
      shiftIsoDate(saleDate, 0);
      if (seen.has(reference)) throw new Error(`duplicate reference ${reference}`);
      seen.add(reference);
      out.push({
        reference,
        saleDate,
        netSalesMinor: parseAmountToMinor(sales),
        cogsMinor: cost === '' ? null : parseAmountToMinor(cost),
      });
    } catch (e) {
      errors.push(`Row ${line}: ${(e as Error).message}`);
    }
  });
  return { rows: out, errors };
}
