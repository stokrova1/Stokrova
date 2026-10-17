import { dayKey, type StaffWorkEvent } from './sales-tickets.js';

export type DailyWorkSessionStatus = 'ACTIVE' | 'CLOSED' | 'AUTO_CLOSED';

export interface DailyWorkSession {
  id: string;
  tenant_id: string;
  user_id: string;
  business_role: string;
  warehouse_id: string | null;
  session_date: string; // 'YYYY-MM-DD'
  status: DailyWorkSessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  idempotency_key: string;
  offline_origin: boolean;
  synced_at: string | null;

  // Financials & Throughput Metrics (Server-computed, signed minor units)
  total_sales_minor: number;
  total_cogs_minor: number | null; // null if unknown; never invented
  total_profit_minor: number | null;
  margin_basis_points: number | null; // e.g. 2840 = 28.4%
  cash_minor: number;
  transfer_minor: number;
  items_handled: number;
  transactions_count: number;
  tickets_written: number;
  tickets_picked: number;

  created_at: string;
  updated_at: string;
}

export interface StartWorkSessionInput {
  tenant_id: string;
  user_id: string;
  business_role: string;
  warehouse_id?: string | null;
  started_at?: string;
  idempotency_key?: string;
  offline_origin?: boolean;
  offset_minutes?: number;
}

export interface SessionMetrics {
  total_sales_minor: number;
  total_cogs_minor: number | null;
  total_profit_minor: number | null;
  margin_basis_points: number | null;
  cash_minor: number;
  transfer_minor: number;
  items_handled: number;
  transactions_count: number;
  tickets_written: number;
  tickets_picked: number;
}

/** Formats duration into human-readable industrial string e.g. "8h 44m" or "25m". */
export function formatSessionDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

/** Checks whether a worker can start a new session (prevents duplicate active sessions for same date). */
export function canStartWorkSession(existingSessions: DailyWorkSession[], userId: string, date: string): boolean {
  return !existingSessions.some(
    (s) => s.user_id === userId && s.session_date === date && s.status === 'ACTIVE',
  );
}

/** Pure factory to instantiate a new work session. */
export function createWorkSession(
  id: string,
  input: StartWorkSessionInput,
  now: Date = new Date(),
): DailyWorkSession {
  const offset = input.offset_minutes ?? 60; // Lagos/WAT default
  const startedAtIso = input.started_at && !isNaN(Date.parse(input.started_at))
    ? new Date(input.started_at).toISOString()
    : now.toISOString();
  const sessionDate = dayKey(startedAtIso, offset);
  const createdAtIso = now.toISOString();

  return {
    id,
    tenant_id: input.tenant_id,
    user_id: input.user_id,
    business_role: (input.business_role || 'OPERATOR').toUpperCase(),
    warehouse_id: input.warehouse_id ?? null,
    session_date: sessionDate,
    status: 'ACTIVE',
    started_at: startedAtIso,
    ended_at: null,
    duration_seconds: 0,
    idempotency_key: input.idempotency_key || `sess_${input.user_id}_${sessionDate}_${startedAtIso}`,
    offline_origin: Boolean(input.offline_origin),
    synced_at: input.offline_origin ? null : createdAtIso,
    total_sales_minor: 0,
    total_cogs_minor: null,
    total_profit_minor: null,
    margin_basis_points: null,
    cash_minor: 0,
    transfer_minor: 0,
    items_handled: 0,
    transactions_count: 0,
    tickets_written: 0,
    tickets_picked: 0,
    created_at: createdAtIso,
    updated_at: createdAtIso,
  };
}

/** Aggregates work events to compute pure session financial and throughput metrics. */
export function aggregateSessionMetrics(
  events: StaffWorkEvent[],
  itemCogsMap?: Map<string, number>, // Optional SKU -> cost minor
): SessionMetrics {
  let totalSalesMinor = 0;
  let cashMinor = 0;
  let transferMinor = 0;
  let transactionsCount = 0;
  let itemsHandled = 0;
  let ticketsWritten = 0;
  let ticketsPicked = 0;
  let totalCogsMinor: number | null = null;

  for (const e of events) {
    if (e.kind === 'SALE') {
      transactionsCount++;
      totalSalesMinor += Number(e.amount_minor || 0);
      cashMinor += Number(e.cash_minor || 0);
      transferMinor += Number(e.transfer_minor || 0);
      itemsHandled += Number(e.quantity || 1);
    } else if (e.kind === 'TICKET_WRITTEN') {
      ticketsWritten++;
      itemsHandled += Number(e.quantity || 0);
    } else if (e.kind === 'TICKET_PICKED') {
      ticketsPicked++;
      itemsHandled += Number(e.quantity || 0);
    }
  }

  // Calculate COGS if itemCogsMap provided and known for items
  if (itemCogsMap && itemCogsMap.size > 0) {
    let knownCogs = 0;
    let hasKnown = false;
    for (const e of events) {
      if (e.kind === 'SALE' && e.reference && itemCogsMap.has(e.reference)) {
        knownCogs += itemCogsMap.get(e.reference)! * (e.quantity || 1);
        hasKnown = true;
      }
    }
    if (hasKnown) totalCogsMinor = knownCogs;
  }

  let totalProfitMinor: number | null = null;
  let marginBasisPoints: number | null = null;

  if (totalCogsMinor !== null) {
    totalProfitMinor = totalSalesMinor - totalCogsMinor;
    if (totalSalesMinor > 0) {
      marginBasisPoints = Math.round((totalProfitMinor / totalSalesMinor) * 10000);
    } else {
      marginBasisPoints = 0;
    }
  }

  return {
    total_sales_minor: totalSalesMinor,
    total_cogs_minor: totalCogsMinor,
    total_profit_minor: totalProfitMinor,
    margin_basis_points: marginBasisPoints,
    cash_minor: cashMinor,
    transfer_minor: transferMinor,
    items_handled: itemsHandled,
    transactions_count: transactionsCount,
    tickets_written: ticketsWritten,
    tickets_picked: ticketsPicked,
  };
}

/** Concludes an active work session, computing duration and finalizing metrics. */
export function closeWorkSession(
  session: DailyWorkSession,
  sessionEvents: StaffWorkEvent[],
  endedAtIso: string = new Date().toISOString(),
  itemCogsMap?: Map<string, number>,
): DailyWorkSession {
  const startMs = new Date(session.started_at).getTime();
  const endMs = Math.max(startMs, new Date(endedAtIso).getTime());
  const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

  const metrics = aggregateSessionMetrics(sessionEvents, itemCogsMap);
  const nowIso = new Date().toISOString();

  return {
    ...session,
    status: 'CLOSED',
    ended_at: new Date(endMs).toISOString(),
    duration_seconds: durationSeconds,
    ...metrics,
    updated_at: nowIso,
  };
}
