import { describe, expect, it } from 'vitest';
// @ts-ignore plain browser module
import { toMinor, cartTotalMinor, addToCart, validateTenders, buildCheckout, offlineSale, settleQueue } from '../pos-live.js';

const tea = { variant_id: 'v1', sku: 'TEA', price_minor: '1250' };
const state = { session: { id: 's1' }, register: { id: 'r1' }, deviceId: 'd1', cart: addToCart(addToCart([], tea), tea) };

describe('till', () => {
  it('scanning the same product twice adds to its quantity; total is 2 × 12.50', () => {
    expect(state.cart).toHaveLength(1);
    expect(cartTotalMinor(state.cart)).toBe(2500);
  });
  it('typed amounts become exact minor units', () => {
    expect(toMinor('12.50')).toBe(1250);
    expect(toMinor('1,000')).toBe(100000);
    expect(toMinor('-3')).toBeNull();
  });
  it('payment must cover the total; cash may give change, card may not overpay', () => {
    expect(validateTenders(state.cart, [{ tender_type: 'CASH', amount_minor: 2000 }])).toMatch(/short/);
    expect(validateTenders(state.cart, [{ tender_type: 'CASH', amount_minor: 3000 }])).toBeNull();
    expect(validateTenders(state.cart, [{ tender_type: 'CARD', amount_minor: 3000 }])).toMatch(/cannot be more/);
    expect(validateTenders(state.cart, [{ tender_type: 'CARD', amount_minor: 1000 }, { tender_type: 'CASH', amount_minor: 1500 }])).toBeNull();
  });
  it('online and offline versions of a sale share one key so the server never counts it twice', () => {
    const t = [{ tender_type: 'CASH', amount_minor: 2500 }];
    expect(buildCheckout(state, t, 'k1').idempotency_key).toBe('k1');
    expect(offlineSale(state, t, 'k1', 1).idempotency_key).toBe('k1');
  });
  it('accepted offline sales leave the queue; rejected ones stay for review', () => {
    const q = [{ client_tx_id: 'a' }, { client_tx_id: 'b' }, { client_tx_id: 'c' }];
    expect(settleQueue(q, [{ client_tx_id: 'a', status: 'PROCESSED' }, { client_tx_id: 'b', status: 'IDEMPOTENT_DUPLICATE' }, { client_tx_id: 'c', status: 'REJECTED' }])).toEqual([{ client_tx_id: 'c' }]);
  });
});
