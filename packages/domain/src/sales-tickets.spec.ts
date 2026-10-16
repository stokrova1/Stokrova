import { describe, it, expect } from 'vitest';
import {
  applyPick, chargeableLines, canPayTicket, makeTicketCode, normalizeTicketCode, statusAfterPick,
  summarizeStaffDay, ticketTotalMinor, isTicketHoldExpired, DEFAULT_TICKET_HOLD_MINUTES,
  type SalesTicketLine, type StaffWorkEvent,
} from './sales-tickets.js';

const line = (v: string, q: number, price = 1000): SalesTicketLine => ({
  variant_id: v, label: v, quantity: q, unit_price_minor: price, picked_quantity: 0, missing: false, reservation_id: 'r',
});

describe('shop-counter order tickets', () => {
  it('holds items for 4 hours by default when the customer never pays', () => {
    expect(DEFAULT_TICKET_HOLD_MINUTES).toBe(240);
    expect(isTicketHoldExpired('2026-01-01T10:00:00Z', new Date('2026-01-01T10:00:01Z'))).toBe(true);
    expect(isTicketHoldExpired('2026-01-01T10:00:00Z', new Date('2026-01-01T09:59:00Z'))).toBe(false);
  });

  it('slip code reads as TK- plus 6 characters, and scanned/typed codes match it', () => {
    expect(makeTicketCode()).toMatch(/^TK-[2-9A-HJ-NP-Z]{6}$/);
    expect(normalizeTicketCode(' tk-7g4qx2 ')).toBe('TK-7G4QX2');
    expect(normalizeTicketCode('7G4QX2')).toBe('TK-7G4QX2');
  });

  it('picker cannot pick more than was listed', () => {
    expect(() => applyPick(line('a', 2), 3)).toThrow();
  });

  it('a short pick is flagged as missing', () => {
    expect(applyPick(line('a', 3), 1).missing).toBe(true);
    expect(applyPick(line('a', 3), 3).missing).toBe(false);
  });

  it('cashier can only take payment once every item is checked', () => {
    const lines = [line('a', 1), line('b', 1)];
    expect(statusAfterPick(lines, new Set(['a']))).toBe('PICKING');
    expect(statusAfterPick(lines, new Set(['a', 'b']))).toBe('READY');
    expect(canPayTicket('PICKING')).toBe(false);
    expect(canPayTicket('READY')).toBe(true);
    expect(canPayTicket('PAID')).toBe(false);
  });

  it('customer is only charged for items actually picked', () => {
    const lines = [applyPick(line('a', 2, 500), 2), applyPick(line('b', 3, 1000), 1), applyPick(line('c', 1), 0)];
    expect(chargeableLines(lines)).toEqual([{ variant_id: 'a', quantity: 2 }, { variant_id: 'b', quantity: 1 }]);
    expect(ticketTotalMinor(lines)).toBe(2000);
  });
});

describe("each worker's own day", () => {
  const ev = (kind: StaffWorkEvent['kind'], at: string, extra: Partial<StaffWorkEvent> = {}): StaffWorkEvent => ({
    id: Math.random().toString(), tenant_id: 't', user_id: 'u', kind, reference: 'x', quantity: 0, amount_minor: 0, cash_minor: 0, transfer_minor: 0, occurred_at: at, ...extra,
  });

  it('totals tickets, picks, missing items and cash vs transfer for that day only (Lagos time)', () => {
    const s = summarizeStaffDay([
      ev('TICKET_WRITTEN', '2026-10-16T08:00:00Z', { amount_minor: 5000 }),
      ev('TICKET_PICKED', '2026-10-16T09:00:00Z', { quantity: 4 }),
      ev('ITEM_MISSING', '2026-10-16T09:00:00Z', { quantity: 1 }),
      ev('SALE', '2026-10-16T10:00:00Z', { amount_minor: 3000, cash_minor: 1000, transfer_minor: 2000 }),
      ev('SALE', '2026-10-15T23:30:00Z', { amount_minor: 999 }), // 00:30 on the 16th in Lagos
      ev('SALE', '2026-10-15T22:30:00Z', { amount_minor: 7 }), // 23:30 on the 15th in Lagos
    ], '2026-10-16');
    expect(s.tickets_written).toBe(1);
    expect(s.tickets_written_value_minor).toBe(5000);
    expect(s.items_picked).toBe(4);
    expect(s.items_missing).toBe(1);
    expect(s.sales).toBe(2);
    expect(s.sales_value_minor).toBe(3999);
    expect(s.cash_minor).toBe(1000);
    expect(s.transfer_minor).toBe(2000);
  });
});
