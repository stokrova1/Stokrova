import { describe, it, expect } from 'vitest';
import {
  createWorkSession,
  canStartWorkSession,
  closeWorkSession,
  aggregateSessionMetrics,
  formatSessionDuration,
  type DailyWorkSession,
} from '../src/work-sessions.js';
import type { StaffWorkEvent } from '../src/sales-tickets.js';


describe('Daily Work Sessions (Domain)', () => {
  const ev = (
    kind: StaffWorkEvent['kind'],
    at: string,
    extra: Partial<StaffWorkEvent> = {},
  ): StaffWorkEvent => ({
    id: `ev_${Math.random()}`,
    tenant_id: 'ten_test',
    user_id: 'usr_cashier_1',
    kind,
    reference: 'REF-001',
    quantity: 1,
    amount_minor: 0,
    cash_minor: 0,
    transfer_minor: 0,
    occurred_at: at,
    ...extra,
  });

  it('creates an active session for the user with Lagos date key by default', () => {
    const s = createWorkSession('dws_123', {
      tenant_id: 'ten_test',
      user_id: 'usr_1',
      business_role: 'cashier',
      started_at: '2026-10-17T08:00:00Z',
    });

    expect(s.id).toBe('dws_123');
    expect(s.status).toBe('ACTIVE');
    expect(s.business_role).toBe('CASHIER');
    expect(s.session_date).toBe('2026-10-17');
    expect(s.ended_at).toBeNull();
    expect(s.total_sales_minor).toBe(0);
    expect(s.total_cogs_minor).toBeNull(); // Never invent margin
  });

  it('prevents starting multiple active sessions for the same user on the same day', () => {
    const active: DailyWorkSession = createWorkSession('dws_1', {
      tenant_id: 'ten_test',
      user_id: 'usr_1',
      business_role: 'sales',
      started_at: '2026-10-17T08:00:00Z',
    });

    expect(canStartWorkSession([active], 'usr_1', '2026-10-17')).toBe(false);
    expect(canStartWorkSession([active], 'usr_2', '2026-10-17')).toBe(true);
    expect(canStartWorkSession([active], 'usr_1', '2026-10-18')).toBe(true);
  });

  it('formats session durations cleanly into human-readable industrial units', () => {
    expect(formatSessionDuration(0)).toBe('0m');
    expect(formatSessionDuration(125)).toBe('2m');
    expect(formatSessionDuration(3600)).toBe('1h 0m');
    expect(formatSessionDuration(31440)).toBe('8h 44m');
  });

  it('aggregates sales and tenders without inventing margin when cost is unknown', () => {
    const events: StaffWorkEvent[] = [
      ev('SALE', '2026-10-17T09:00:00Z', {
        amount_minor: 10000,
        cash_minor: 4000,
        transfer_minor: 6000,
        quantity: 2,
      }),
      ev('SALE', '2026-10-17T11:00:00Z', {
        amount_minor: 5000,
        cash_minor: 5000,
        transfer_minor: 0,
        quantity: 1,
      }),
      ev('TICKET_WRITTEN', '2026-10-17T12:00:00Z', { quantity: 3 }),
      ev('TICKET_PICKED', '2026-10-17T12:30:00Z', { quantity: 3 }),
    ];

    const metrics = aggregateSessionMetrics(events);
    expect(metrics.total_sales_minor).toBe(15000);
    expect(metrics.cash_minor).toBe(9000);
    expect(metrics.transfer_minor).toBe(6000);
    expect(metrics.transactions_count).toBe(2);
    expect(metrics.items_handled).toBe(9); // 3 sold + 3 written + 3 picked
    expect(metrics.tickets_written).toBe(1);
    expect(metrics.tickets_picked).toBe(1);
    expect(metrics.total_cogs_minor).toBeNull();
    expect(metrics.total_profit_minor).toBeNull();
  });

  it('computes exact profit and margin percentage when item COGS is provided', () => {
    const events: StaffWorkEvent[] = [
      ev('SALE', '2026-10-17T14:00:00Z', {
        reference: 'SKU-BOLT',
        amount_minor: 10000, // $100.00 sale
        cash_minor: 10000,
        quantity: 2,
      }),
    ];
    const cogs = new Map<string, number>([['SKU-BOLT', 3500]]); // Cost = 2 * 3500 = 7000 ($70)

    const metrics = aggregateSessionMetrics(events, cogs);
    expect(metrics.total_sales_minor).toBe(10000);
    expect(metrics.total_cogs_minor).toBe(7000);
    expect(metrics.total_profit_minor).toBe(3000); // $30 profit
    expect(metrics.margin_basis_points).toBe(3000); // 30.00%
  });

  it('concludes a session, computes duration, and locks status to CLOSED', () => {
    const session = createWorkSession('dws_1', {
      tenant_id: 'ten_test',
      user_id: 'usr_1',
      business_role: 'CASHIER',
      started_at: '2026-10-17T08:00:00Z',
    });

    const events: StaffWorkEvent[] = [
      ev('SALE', '2026-10-17T10:00:00Z', {
        amount_minor: 5000,
        cash_minor: 5000,
        quantity: 1,
      }),
    ];

    const closed = closeWorkSession(session, events, '2026-10-17T16:30:00Z');
    expect(closed.status).toBe('CLOSED');
    expect(closed.ended_at).toBe('2026-10-17T16:30:00.000Z');
    expect(closed.duration_seconds).toBe(30600); // 8.5 hours
    expect(closed.total_sales_minor).toBe(5000);
    expect(closed.cash_minor).toBe(5000);
    expect(closed.transactions_count).toBe(1);
  });
});
