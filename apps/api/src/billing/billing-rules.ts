/**
 * Stokrova's own plan rules (what a business pays Stokrova), kept pure so they are easy to test.
 * - Every new business gets a 30-day free trial whatever plan it picks; no card is asked for.
 * - After the trial the chosen plan is billed; an unpaid plan invoice closes the workspace until it is paid.
 * - The founder can let a business run free, give a % discount, or set a fixed price.
 */
export const FREE_TRIAL_DAYS = 30;

export type BillingOverrideMode = 'NONE' | 'FREE' | 'DISCOUNT_PERCENT' | 'FIXED_PRICE';

export interface BillingOverride {
  mode: BillingOverrideMode;
  /** DISCOUNT_PERCENT: 1-100. FIXED_PRICE: price in minor units. */
  value?: string | null;
  note?: string | null;
  set_by?: string | null;
  set_at?: string | null;
}

/** What this business is charged for a period, given the plan's list price. */
export function effectivePriceMinor(listPriceMinor: string, override?: BillingOverride | null): string {
  const list = BigInt(listPriceMinor);
  switch (override?.mode) {
    case 'FREE':
      return '0';
    case 'DISCOUNT_PERCENT': {
      const pct = BigInt(Math.min(100, Math.max(0, Number(override.value ?? 0))));
      return ((list * (100n - pct)) / 100n).toString();
    }
    case 'FIXED_PRICE':
      return BigInt(override.value ?? '0').toString();
    default:
      return list.toString();
  }
}

export function validateOverride(o: { mode?: unknown; value?: unknown }): BillingOverride {
  const mode = String(o.mode ?? 'NONE') as BillingOverrideMode;
  if (!['NONE', 'FREE', 'DISCOUNT_PERCENT', 'FIXED_PRICE'].includes(mode)) throw new Error('Unknown billing option.');
  if (mode === 'DISCOUNT_PERCENT') {
    const n = Number(o.value);
    if (!Number.isInteger(n) || n < 1 || n > 100) throw new Error('Discount must be a whole percentage from 1 to 100.');
    return { mode, value: String(n) };
  }
  if (mode === 'FIXED_PRICE') {
    if (!/^\d{1,12}$/.test(String(o.value ?? ''))) throw new Error('Fixed price must be a whole number of cents, zero or more.');
    return { mode, value: String(o.value) };
  }
  return { mode, value: null };
}

export type AccessState = 'TRIAL' | 'OPEN' | 'FREE' | 'CLOSED';

/**
 * Whether the business can use its workspace right now.
 * CLOSED = trial over and a plan invoice for a period that has started is still unpaid.
 */
export function accessState(
  sub: { status: string; trial_ends_at: string | null; billing_override?: BillingOverride | null } | null,
  invoices: Array<{ status: string; total_minor: string; period_start: string }>,
  now: Date = new Date(),
): AccessState {
  if (!sub) return 'TRIAL';
  if (sub.billing_override?.mode === 'FREE') return 'FREE';
  if (sub.trial_ends_at && new Date(sub.trial_ends_at) > now) return 'TRIAL';
  const unpaid = invoices.some(
    (i) => (i.status === 'OPEN' || i.status === 'PAST_DUE' || i.status === 'UNCOLLECTIBLE') && BigInt(i.total_minor) > 0n && new Date(i.period_start) <= now,
  );
  return unpaid ? 'CLOSED' : 'OPEN';
}
