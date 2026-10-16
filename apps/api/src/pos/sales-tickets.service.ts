import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_TICKET_HOLD_MINUTES, applyPick, canCancelTicket, canPayTicket, chargeableLines, isTicketHoldExpired,
  makeTicketCode, normalizeTicketCode, statusAfterPick, summarizeStaffDay, ticketTotalMinor, dayKey,
  type SalesTicketLine, type SalesTicketStatus, type StaffWorkEvent, type StaffWorkKind, type StaffDaySummary,
} from '@stokrova/domain';
import type { PosCheckoutRequest, PosCheckoutResponse } from '@stokrova/contracts';
import { DurableMap } from '../infrastructure/database/durable-map.js';
import { StockReservationsService } from '../inventory/stock-reservations.service.js';
import { PosCatalogService } from './pos-catalog.service.js';
import { PosCheckoutService } from './pos-checkout.service.js';

export interface SalesTicket {
  id: string;
  tenant_id: string;
  code: string;
  status: SalesTicketStatus;
  warehouse_id: string;
  customer_name: string | null;
  notes: string | null;
  lines: SalesTicketLine[];
  written_by: string;
  picked_by: string | null;
  paid_by: string | null;
  order_id: string | null;
  receipt_number: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketInput {
  warehouse_id: string;
  customer_name?: string | null;
  notes?: string | null;
  hold_minutes?: number;
  items: { variant_id: string; quantity: number }[];
}

export interface PayTicketInput {
  pos_session_id: string;
  pos_register_id: string;
  idempotency_key: string;
  customer_id?: string | null;
  tenders: PosCheckoutRequest['tenders'];
}

/**
 * Order taker -> picker -> cashier. Items are held (reserved) when the list is submitted, the
 * picker confirms what was found, and the cashier's payment goes through the normal till checkout,
 * which is where stock actually goes down.
 */
@Injectable()
export class SalesTicketsService {
  private readonly tickets = new DurableMap<SalesTicket>('sales_tickets');
  private readonly events = new DurableMap<StaffWorkEvent>('staff_work_events');
  private readonly checked = new Map<string, Set<string>>();

  constructor(
    private readonly reservations: StockReservationsService,
    private readonly catalog: PosCatalogService,
    private readonly checkout: PosCheckoutService,
  ) {}

  async create(tenantId: string, userId: string, input: CreateTicketInput): Promise<SalesTicket> {
    if (!input.warehouse_id) throw new BadRequestException('Choose the shop or store the items come from.');
    const items = (input.items || []).filter((i) => i && i.variant_id && Number.isInteger(i.quantity) && i.quantity > 0);
    if (!items.length) throw new BadRequestException('Add at least one item to the list.');
    const merged = new Map<string, number>();
    for (const i of items) merged.set(i.variant_id, (merged.get(i.variant_id) || 0) + i.quantity);

    const products = new Map((await this.catalog.listSellable(tenantId, { warehouse_id: input.warehouse_id })).map((p) => [p.variant_id, p]));
    const holdMinutes = Math.min(Math.max(input.hold_minutes || DEFAULT_TICKET_HOLD_MINUTES, 5), 24 * 60);
    const id = `tkt_${randomUUID().replace(/-/g, '')}`;
    const lines: SalesTicketLine[] = [];
    try {
      for (const [variantId, quantity] of merged) {
        const p = products.get(variantId);
        if (!p) throw new BadRequestException(`Product ${variantId} was not found.`);
        const r = await this.reservations.createReservation(tenantId, {
          variant_id: variantId, warehouse_id: input.warehouse_id, quantity,
          reference_type: 'SALES_ORDER', reference_id: id, ttl_seconds: holdMinutes * 60,
        } as never);
        lines.push({ variant_id: variantId, label: p.sku, quantity, unit_price_minor: Number(p.price_minor), picked_quantity: 0, missing: false, reservation_id: r.id });
      }
    } catch (e) {
      await this.releaseLines(tenantId, lines);
      throw e;
    }
    const now = new Date();
    const ticket: SalesTicket = {
      id, tenant_id: tenantId, code: this.uniqueCode(tenantId), status: 'OPEN', warehouse_id: input.warehouse_id,
      customer_name: input.customer_name?.trim() || null, notes: input.notes?.trim() || null, lines,
      written_by: userId, picked_by: null, paid_by: null, order_id: null, receipt_number: null,
      expires_at: new Date(now.getTime() + holdMinutes * 60_000).toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
    };
    this.tickets.set(id, ticket);
    this.log(tenantId, userId, 'TICKET_WRITTEN', ticket.code, lines.reduce((s, l) => s + l.quantity, 0), ticketTotalMinor(lines, false));
    return ticket;
  }

  async list(tenantId: string, status?: string): Promise<SalesTicket[]> {
    await this.expireDue(tenantId);
    return [...this.tickets.values()]
      .filter((t) => t.tenant_id === tenantId && (!status || status.split(',').includes(t.status)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getByCode(tenantId: string, rawCode: string): Promise<SalesTicket> {
    await this.expireDue(tenantId);
    const code = normalizeTicketCode(rawCode);
    const t = [...this.tickets.values()].find((x) => x.tenant_id === tenantId && x.code === code);
    if (!t) throw new NotFoundException(`No order ticket ${code}.`);
    return t;
  }

  /** Picker confirms how many of one item were found (0 = missing). */
  async pick(tenantId: string, userId: string, code: string, variantId: string, pickedQuantity: number): Promise<SalesTicket> {
    const t = await this.getByCode(tenantId, code);
    if (t.status !== 'OPEN' && t.status !== 'PICKING' && t.status !== 'READY') throw new ConflictException(`This ticket is ${t.status.toLowerCase()}.`);
    const idx = t.lines.findIndex((l) => l.variant_id === variantId);
    if (idx < 0) throw new BadRequestException('That item is not on this list.');
    try { t.lines[idx] = applyPick(t.lines[idx]!, pickedQuantity); } catch (e) { throw new BadRequestException((e as Error).message); }
    const checked = this.checked.get(t.id) || new Set(t.status === 'READY' ? t.lines.map((l) => l.variant_id) : []);
    checked.add(variantId);
    this.checked.set(t.id, checked);
    const wasReady = t.status === 'READY';
    t.status = statusAfterPick(t.lines, checked);
    t.picked_by = userId;
    t.updated_at = new Date().toISOString();
    this.tickets.set(t.id, t);
    if (t.status === 'READY' && !wasReady) {
      this.log(tenantId, userId, 'TICKET_PICKED', t.code, t.lines.reduce((s, l) => s + l.picked_quantity, 0), ticketTotalMinor(t.lines));
      const missing = t.lines.reduce((s, l) => s + (l.quantity - l.picked_quantity), 0);
      if (missing > 0) this.log(tenantId, userId, 'ITEM_MISSING', t.code, missing, 0);
    }
    return t;
  }

  /** Cashier records payment; the till checkout deducts stock and creates the order, invoice and receipt. */
  async pay(tenantId: string, userId: string, code: string, input: PayTicketInput): Promise<{ ticket: SalesTicket; checkout: PosCheckoutResponse }> {
    const t = await this.getByCode(tenantId, code);
    if (!canPayTicket(t.status)) {
      throw new ConflictException(t.status === 'PAID' ? 'This ticket is already paid.' : 'The picker has not finished this list yet.');
    }
    const items = chargeableLines(t.lines);
    if (!items.length) throw new BadRequestException('Nothing on this list was found, so there is nothing to charge.');
    // Release the hold so checkout can take the stock it was holding.
    await this.releaseLines(tenantId, t.lines);
    let result: PosCheckoutResponse;
    try {
      result = await this.checkout.processCheckout(tenantId, userId, {
        idempotency_key: input.idempotency_key || `ticket:${t.id}`, pos_session_id: input.pos_session_id, pos_register_id: input.pos_register_id,
        customer_id: input.customer_id ?? null, items, tenders: input.tenders, notes: `Order ticket ${t.code}`,
      } as PosCheckoutRequest);
    } catch (e) {
      await this.reHold(tenantId, t);
      throw e;
    }
    t.status = 'PAID';
    t.paid_by = userId;
    t.order_id = result.order_id;
    t.receipt_number = result.receipt_number;
    t.updated_at = new Date().toISOString();
    this.tickets.set(t.id, t);
    this.recordSale(tenantId, userId, result.receipt_number, Number(result.total_payable_minor), input.tenders, result.order_id);
    return { ticket: t, checkout: result };
  }

  async cancel(tenantId: string, userId: string, code: string): Promise<SalesTicket> {
    const t = await this.getByCode(tenantId, code);
    if (!canCancelTicket(t.status)) throw new ConflictException(`This ticket is ${t.status.toLowerCase()}.`);
    await this.releaseLines(tenantId, t.lines);
    t.status = 'CANCELLED';
    t.updated_at = new Date().toISOString();
    this.tickets.set(t.id, t);
    this.log(tenantId, userId, 'TICKET_CANCELLED', t.code, 0, 0);
    return t;
  }

  /** Called by the till after a direct (no ticket) sale so the cashier's day counts it too. */
  recordSale(tenantId: string, userId: string, reference: string, totalMinor: number, tenders: { tender_type: string; tendered_minor: string | number }[], orderId: string | null = null): void {
    // A retried checkout returns the same receipt; never count it twice.
    for (const e of this.events.values()) if (e.tenant_id === tenantId && e.kind === 'SALE' && e.reference === reference) return;
    let cash = 0;
    let transfer = 0;
    for (const td of tenders || []) {
      const amt = Number(td.tendered_minor) || 0;
      if (td.tender_type === 'CASH') cash += amt; else transfer += amt;
    }
    // Change given back comes out of the cash taken.
    const over = cash + transfer - totalMinor;
    if (over > 0) cash = Math.max(0, cash - over);
    this.log(tenantId, userId, 'SALE', reference, 1, totalMinor, cash, transfer, orderId);
  }

  myDay(tenantId: string, userId: string, date?: string, offsetMinutes = 60): StaffDaySummary & { recent: StaffWorkEvent[] } {
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayKey(new Date().toISOString(), offsetMinutes);
    const mine = [...this.events.values()].filter((e) => e.tenant_id === tenantId && e.user_id === userId);
    const summary = summarizeStaffDay(mine, day, offsetMinutes);
    const recent = mine.filter((e) => dayKey(e.occurred_at, offsetMinutes) === day).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 20);
    return { ...summary, recent };
  }

  /** Every staff member's work events for one business (manager's live board). */
  listEvents(tenantId: string): StaffWorkEvent[] {
    return [...this.events.values()].filter((e) => e.tenant_id === tenantId);
  }

  private async expireDue(tenantId: string): Promise<void> {
    const now = new Date();
    for (const t of this.tickets.values()) {
      if (t.tenant_id !== tenantId || !canCancelTicket(t.status) || !isTicketHoldExpired(t.expires_at, now)) continue;
      await this.releaseLines(tenantId, t.lines);
      t.status = 'EXPIRED';
      t.updated_at = now.toISOString();
      this.tickets.set(t.id, t);
    }
  }

  private async releaseLines(tenantId: string, lines: SalesTicketLine[]): Promise<void> {
    for (const l of lines) {
      if (!l.reservation_id) continue;
      try { await this.reservations.releaseReservation(tenantId, l.reservation_id); } catch { /* already released or expired */ }
      l.reservation_id = null;
    }
  }

  private async reHold(tenantId: string, t: SalesTicket): Promise<void> {
    for (const l of t.lines) {
      try {
        const r = await this.reservations.createReservation(tenantId, {
          variant_id: l.variant_id, warehouse_id: t.warehouse_id, quantity: l.quantity, reference_type: 'SALES_ORDER', reference_id: t.id,
          ttl_seconds: Math.max(60, Math.floor((new Date(t.expires_at).getTime() - Date.now()) / 1000)),
        } as never);
        l.reservation_id = r.id;
      } catch { /* stock moved meanwhile; cashier will see the error on retry */ }
    }
    this.tickets.set(t.id, t);
  }

  private uniqueCode(tenantId: string): string {
    const used = new Set([...this.tickets.values()].filter((t) => t.tenant_id === tenantId).map((t) => t.code));
    let c = makeTicketCode();
    while (used.has(c)) c = makeTicketCode();
    return c;
  }

  private log(tenantId: string, userId: string, kind: StaffWorkKind, reference: string, quantity: number, amount: number, cash = 0, transfer = 0, orderId: string | null = null): void {
    const e: StaffWorkEvent = {
      id: `swe_${randomUUID().replace(/-/g, '')}`, tenant_id: tenantId, user_id: userId, kind, reference,
      quantity, amount_minor: amount, cash_minor: cash, transfer_minor: transfer, order_id: orderId, occurred_at: new Date().toISOString(),
    };
    this.events.set(e.id, e);
  }
}
