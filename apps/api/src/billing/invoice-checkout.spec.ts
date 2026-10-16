import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { chargeSettles, invoiceIdFromReference, makeReference, paystackSignatureOk, flutterwaveHashOk, configuredProviders, startCheckout } from './invoice-checkout.js';

const inv = { total_minor: '4900000', currency: 'NGN' };

describe('owner invoice payment', () => {
  it('settles only a successful charge for the full amount in naira', () => {
    expect(chargeSettles({ paid: true, amount_minor: '4900000', currency: 'NGN' }, inv)).toBe(true);
    expect(chargeSettles({ paid: true, amount_minor: '4899999', currency: 'NGN' }, inv)).toBe(false);
    expect(chargeSettles({ paid: true, amount_minor: '4900000', currency: 'USD' }, inv)).toBe(false);
    expect(chargeSettles({ paid: false, amount_minor: '4900000', currency: 'NGN' }, inv)).toBe(false);
  });
  it('finds the invoice from the payment reference', () => {
    expect(invoiceIdFromReference(makeReference('inv_ab_1', 123))).toBe('inv_ab_1');
    expect(invoiceIdFromReference('random')).toBeNull();
  });
  it('accepts only genuinely signed Paystack and Flutterwave notices', () => {
    const raw = Buffer.from('{"event":"charge.success"}');
    const sig = createHmac('sha512', 'sk_test').update(raw).digest('hex');
    expect(paystackSignatureOk('sk_test', raw, sig)).toBe(true);
    expect(paystackSignatureOk('sk_test', raw, sig.replace(/.$/, '0'))).toBe(sig.endsWith('0'));
    expect(paystackSignatureOk(undefined, raw, sig)).toBe(false);
    expect(flutterwaveHashOk('hash123', 'hash123')).toBe(true);
    expect(flutterwaveHashOk('hash123', 'nope')).toBe(false);
  });
  it('offers only providers whose keys are set', () => {
    expect(configuredProviders({ PAYSTACK_SECRET_KEY: 'x' })).toEqual(['PAYSTACK']);
    expect(configuredProviders({})).toEqual([]);
  });
  it('sends Flutterwave the amount in naira, not kobo', async () => {
    let sent: any;
    const f = (async (_u: string, o: any) => { sent = JSON.parse(o.body); return new Response(JSON.stringify({ data: { link: 'https://pay' } })); }) as any;
    await startCheckout('FLUTTERWAVE', { reference: 'r', amount_minor: '4900000', currency: 'NGN', email: 'a@b.c', redirect_url: 'https://x', invoice_number: 'I1' }, { FLUTTERWAVE_SECRET_KEY: 'k' }, f);
    expect(sent.amount).toBe('49000.00');
  });
});
