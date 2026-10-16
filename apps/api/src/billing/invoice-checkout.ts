import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Owners pay their Stokrova plan invoice through Paystack or Flutterwave.
 * An invoice is only marked paid after Stokrova itself asks the provider "did this reference succeed,
 * for this exact amount and currency?" — a browser redirect or webhook alone never marks it paid.
 */
export type PayProvider = 'PAYSTACK' | 'FLUTTERWAVE';

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

export function configuredProviders(env: Env = process.env): PayProvider[] {
  const list: PayProvider[] = [];
  if (env['PAYSTACK_SECRET_KEY']) list.push('PAYSTACK');
  if (env['FLUTTERWAVE_SECRET_KEY']) list.push('FLUTTERWAVE');
  return list;
}

export function parseProvider(v: unknown): PayProvider | null {
  const s = String(v ?? '').toUpperCase();
  return s === 'PAYSTACK' || s === 'FLUTTERWAVE' ? s : null;
}

/** Reference carries the invoice id so a webhook can find it: stk_<invoiceId>_<time>. */
export const makeReference = (invoiceId: string, now = Date.now()) => `stk_${invoiceId}_${now}`;
export function invoiceIdFromReference(ref: string): string | null {
  const m = /^stk_(.+)_\d+$/.exec(ref || '');
  return m ? m[1]! : null;
}

export async function startCheckout(
  provider: PayProvider,
  p: { reference: string; amount_minor: string; currency: string; email: string; redirect_url: string; invoice_number: string },
  env: Env = process.env,
  f: Fetch = fetch,
): Promise<{ checkout_url: string; reference: string }> {
  if (provider === 'PAYSTACK') {
    const key = env['PAYSTACK_SECRET_KEY'];
    if (!key) throw new Error('Paystack is not set up on this server yet.');
    const res = await f('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: p.email, amount: Number(p.amount_minor), currency: p.currency, reference: p.reference, callback_url: p.redirect_url, metadata: { invoice_number: p.invoice_number } }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || !body?.data?.authorization_url) throw new Error(body?.message || `Paystack refused the payment (${res.status}).`);
    return { checkout_url: body.data.authorization_url, reference: p.reference };
  }
  const key = env['FLUTTERWAVE_SECRET_KEY'];
  if (!key) throw new Error('Flutterwave is not set up on this server yet.');
  const res = await f('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx_ref: p.reference, amount: (Number(p.amount_minor) / 100).toFixed(2), currency: p.currency, redirect_url: p.redirect_url, customer: { email: p.email }, customizations: { title: 'Stokrova', description: `Invoice ${p.invoice_number}` } }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body?.data?.link) throw new Error(body?.message || `Flutterwave refused the payment (${res.status}).`);
  return { checkout_url: body.data.link, reference: p.reference };
}

/** Asks the provider what really happened to a reference. Amount comes back in minor units. */
export async function verifyCharge(
  provider: PayProvider,
  reference: string,
  env: Env = process.env,
  f: Fetch = fetch,
): Promise<{ paid: boolean; amount_minor: string; currency: string; provider_id: string }> {
  if (provider === 'PAYSTACK') {
    const res = await f(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${env['PAYSTACK_SECRET_KEY']}` } });
    const d: any = ((await res.json().catch(() => ({}))) as any)?.data ?? {};
    return { paid: res.ok && d.status === 'success', amount_minor: String(d.amount ?? 0), currency: String(d.currency ?? ''), provider_id: String(d.id ?? reference) };
  }
  const res = await f(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${env['FLUTTERWAVE_SECRET_KEY']}` } });
  const d: any = ((await res.json().catch(() => ({}))) as any)?.data ?? {};
  return { paid: res.ok && d.status === 'successful', amount_minor: String(Math.round(Number(d.amount ?? 0) * 100)), currency: String(d.currency ?? ''), provider_id: String(d.id ?? reference) };
}

/** The charge settles the invoice only if it succeeded for at least the full amount in the invoice currency. */
export function chargeSettles(charge: { paid: boolean; amount_minor: string; currency: string }, invoice: { total_minor: string; currency: string }): boolean {
  return charge.paid && charge.currency.toUpperCase() === invoice.currency.toUpperCase() && BigInt(charge.amount_minor || '0') >= BigInt(invoice.total_minor || '0');
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function paystackSignatureOk(secret: string | undefined, raw: Buffer | undefined, header: string | undefined): boolean {
  if (!secret || !raw || !header) return false;
  const expected = createHmac('sha512', secret).update(raw).digest('hex');
  return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/** Flutterwave sends the "secret hash" you set in its dashboard in the verif-hash header. */
export function flutterwaveHashOk(secretHash: string | undefined, header: string | undefined): boolean {
  if (!secretHash || !header || header.length !== secretHash.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(secretHash));
}
