/**
 * STOKROVA POS Desktop — Hold / Park / Recall Ticket Manager
 * Multi-tab held orders (up to 10 slots) with timestamps, notes, and 1-click restore.
 */

import {
  type PosCartItem,
  calculatePosCartSummary,
  formatCurrencyMinor,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

export interface HeldTicketRecord {
  ticketId: string;
  customerName?: string;
  cashierNote?: string;
  heldAtIso: string;
  items: PosCartItem[];
  subtotalMinor: bigint;
  grandTotalMinor: bigint;
  currencyCode: string;
}

export class PosHeldTicketsModal {
  private heldTickets: Map<string, HeldTicketRecord> = new Map();
  private maxHeldSlots = 10;
  private currencyCode: string;

  constructor(currencyCode = 'USD', maxHeldSlots = 10) {
    this.currencyCode = currencyCode;
    this.maxHeldSlots = maxHeldSlots;
  }

  public parkTicket(
    items: PosCartItem[],
    customerName?: string,
    cashierNote?: string,
  ): HeldTicketRecord {
    if (items.length === 0) {
      throw new Error('Cannot park an empty cart');
    }
    if (this.heldTickets.size >= this.maxHeldSlots) {
      throw new Error(`Maximum held ticket limit reached (${this.maxHeldSlots} slots)`);
    }

    const summary = calculatePosCartSummary(items);
    const ticketId = `park_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const record: HeldTicketRecord = {
      ticketId,
      customerName,
      cashierNote,
      heldAtIso: new Date().toISOString(),
      items: items.map((i) => ({ ...i })),
      subtotalMinor: summary.subtotalMinor,
      grandTotalMinor: summary.grandTotalMinor,
      currencyCode: this.currencyCode,
    };

    this.heldTickets.set(ticketId, record);
    return record;
  }

  public recallTicket(ticketId: string): HeldTicketRecord {
    const record = this.heldTickets.get(ticketId);
    if (!record) {
      throw new Error(`Held ticket ${ticketId} not found`);
    }
    this.heldTickets.delete(ticketId);
    return { ...record, items: record.items.map((i) => ({ ...i })) };
  }

  public discardTicket(ticketId: string): void {
    if (!this.heldTickets.has(ticketId)) {
      throw new Error(`Held ticket ${ticketId} not found`);
    }
    this.heldTickets.delete(ticketId);
  }

  public getHeldTickets(): HeldTicketRecord[] {
    return Array.from(this.heldTickets.values());
  }

  public getHeldCount(): number {
    return this.heldTickets.size;
  }

  public renderHeldTicketsModalHtml(): string {
    const tokens = themeTokens.dark;
    const tickets = this.getHeldTickets();

    const ticketsListHtml = tickets
      .map(
        (t) => `
          <div class="held-ticket-row" data-id="${t.ticketId}" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">
                ${t.customerName ? t.customerName : 'Walk-in Customer'}
                <span style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono); margin-left: 8px;">(${t.ticketId})</span>
              </div>
              <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; margin-top: 2px;">
                ${t.items.length} items ${t.cashierNote ? `— "${t.cashierNote}"` : ''}
              </div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 2px;">
                Held: ${new Date(t.heldAtIso).toLocaleTimeString()}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 1.1rem; font-weight: 700; color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono);">
                ${formatCurrencyMinor(t.grandTotalMinor, t.currencyCode)}
              </div>
              <button class="btn-recall" data-id="${t.ticketId}" style="background: ${tokens.primary}; color: #000; font-weight: 700; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer;">
                Recall
              </button>
              <button class="btn-discard" data-id="${t.ticketId}" style="background: none; border: 1px solid ${tokens.border}; color: ${tokens.textMuted}; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                ✕
              </button>
            </div>
          </div>
        `.trim(),
      )
      .join('\n');

    return `
      <div class="pos-held-modal" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 20px; max-width: 600px; color: ${tokens.textPrimary};">
        <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${tokens.border}; padding-bottom: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0;">Parked & Held Tickets</h3>
          <span style="font-size: 0.85rem; color: ${tokens.textSecondary};">
            <strong>${tickets.length}</strong> / ${this.maxHeldSlots} slots in use
          </span>
        </header>

        <section class="held-list-viewport">
          ${ticketsListHtml || `<div style="text-align: center; color: ${tokens.textMuted}; padding: 32px 0;">No held tickets active</div>`}
        </section>
      </div>
    `.trim();
  }
}
