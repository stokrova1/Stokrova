/**
 * Shop-counter order tickets: order taker lists items -> items are held -> picker ticks each
 * item -> cashier scans the slip barcode and records payment -> stock goes down.
 * Pure rules only; the API service applies them.
 */

export type SalesTicketStatus = 'OPEN' | 'PICKING' | 'READY' | 'PAID' | 'CANCELLED' | 'EXPIRED';

export interface SalesTicketLine {
  variant_id: string;
  label: string;
  quantity: number;
  /** Price per unit when the list was written, minor units (display only; checkout re-prices). */
  unit_price_minor: number;
  picked_quantity: number;
  missing: boolean;
  reservation_id: string | null;
}

/** How long items stay held when the customer never pays (default 4 hours). */
export const DEFAULT_TICKET_HOLD_MINUTES = 240;

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Short code printed as the slip barcode, e.g. "TK-7G4QX2". No 0/O/1/I so it reads cleanly. */
export function makeTicketCode(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `TK-${s}`;
}

export function normalizeTicketCode(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, '');
  return s.startsWith('TK-') ? s : `TK-${s.replace(/^TK/, '')}`;
}

/** Records what the picker found for one line. Picked can never exceed what was listed. */
export function applyPick(line: SalesTicketLine, pickedQuantity: number): SalesTicketLine {
  if (!Number.isInteger(pickedQuantity) || pickedQuantity < 0) throw new Error('Picked quantity must be a whole number of 0 or more.');
  if (pickedQuantity > line.quantity) throw new Error(`Only ${line.quantity} of ${line.label} were listed.`);
  return { ...line, picked_quantity: pickedQuantity, missing: pickedQuantity < line.quantity };
}

/** Status after the picker updates lines: READY once every line is checked. */
export function statusAfterPick(lines: SalesTicketLine[], checked: Set<string>): SalesTicketStatus {
  return lines.every((l) => checked.has(l.variant_id)) ? 'READY' : 'PICKING';
}

/** What the cashier charges: only items actually picked. */
export function chargeableLines(lines: SalesTicketLine[]): { variant_id: string; quantity: number }[] {
  return lines.filter((l) => l.picked_quantity > 0).map((l) => ({ variant_id: l.variant_id, quantity: l.picked_quantity }));
}

export function ticketTotalMinor(lines: SalesTicketLine[], picked = true): number {
  return lines.reduce((s, l) => s + l.unit_price_minor * (picked ? l.picked_quantity : l.quantity), 0);
}

export function canPayTicket(status: SalesTicketStatus): boolean {
  return status === 'READY';
}

export function canCancelTicket(status: SalesTicketStatus): boolean {
  return status === 'OPEN' || status === 'PICKING' || status === 'READY';
}

export function isTicketHoldExpired(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

// ---------- "My day": every worker's own daily count ----------

export type StaffWorkKind =
  | 'TICKET_WRITTEN'
  | 'TICKET_PICKED'
  | 'ITEM_MISSING'
  | 'SALE'
  | 'TICKET_CANCELLED';

export interface StaffWorkEvent {
  id: string;
  tenant_id: string;
  user_id: string;
  kind: StaffWorkKind;
  reference: string;
  quantity: number;
  amount_minor: number;
  cash_minor: number;
  transfer_minor: number;
  /** Sales order a till sale created (null for other work). */
  order_id?: string | null;
  occurred_at: string;
}

export interface StaffDaySummary {
  date: string;
  tickets_written: number;
  tickets_written_value_minor: number;
  tickets_picked: number;
  items_picked: number;
  items_missing: number;
  sales: number;
  sales_value_minor: number;
  cash_minor: number;
  transfer_minor: number;
  tickets_cancelled: number;
  first_activity_at: string | null;
  last_activity_at: string | null;
}

/** Calendar day (YYYY-MM-DD) of a moment in the business's time zone offset (minutes east of UTC). */
export function dayKey(iso: string, offsetMinutes = 60): string {
  return new Date(new Date(iso).getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** Totals one worker's events for one day. */
export function summarizeStaffDay(events: StaffWorkEvent[], date: string, offsetMinutes = 60): StaffDaySummary {
  const s: StaffDaySummary = {
    date, tickets_written: 0, tickets_written_value_minor: 0, tickets_picked: 0, items_picked: 0, items_missing: 0,
    sales: 0, sales_value_minor: 0, cash_minor: 0, transfer_minor: 0, tickets_cancelled: 0,
    first_activity_at: null, last_activity_at: null,
  };
  const day = events.filter((e) => dayKey(e.occurred_at, offsetMinutes) === date).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  for (const e of day) {
    if (e.kind === 'TICKET_WRITTEN') { s.tickets_written++; s.tickets_written_value_minor += e.amount_minor; }
    else if (e.kind === 'TICKET_PICKED') { s.tickets_picked++; s.items_picked += e.quantity; }
    else if (e.kind === 'ITEM_MISSING') s.items_missing += e.quantity;
    else if (e.kind === 'SALE') { s.sales++; s.sales_value_minor += e.amount_minor; s.cash_minor += e.cash_minor; s.transfer_minor += e.transfer_minor; }
    else if (e.kind === 'TICKET_CANCELLED') s.tickets_cancelled++;
  }
  s.first_activity_at = day[0]?.occurred_at ?? null;
  s.last_activity_at = day[day.length - 1]?.occurred_at ?? null;
  return s;
}
