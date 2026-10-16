import { describe, it, expect } from 'vitest';
import { barcodeSvg } from '../tickets-live.js';
import { ticketToCart, isTicketCode } from '../pos-live.js';

describe('order slips at the till', () => {
  it('cashier is charged only for what the picker found', () => {
    const cart = ticketToCart({ lines: [
      { variant_id: 'a', label: 'RICE-5KG', unit_price_minor: 500000, quantity: 2, picked_quantity: 2 },
      { variant_id: 'b', label: 'OIL-1L', unit_price_minor: 200000, quantity: 1, picked_quantity: 0 },
    ] });
    expect(cart).toEqual([{ variant_id: 'a', sku: 'RICE-5KG', price_minor: 500000, quantity: 2 }]);
  });

  it('recognises scanned slip codes but not product barcodes', () => {
    expect(isTicketCode('TK-7G4QX2')).toBe(true);
    expect(isTicketCode('tk-7g4qx2')).toBe(true);
    expect(isTicketCode('027242923485')).toBe(false);
  });

  it('slip barcode encodes start/stop plus every character (Code 39)', () => {
    const svg = barcodeSvg('TK-7G4QX2');
    expect((svg.match(/<rect x=/g) || []).length).toBe(11 * 5); // 9 chars + 2 stars, 5 bars each
    expect(() => barcodeSvg('tk_1')).toThrow();
  });
});
