import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  addDays, assertValidPrice, calculateAbcClassification, dayKey, priceMargin, productPerformance, stockFlow, stockLevel, summarizeStaffDay,
  type SoldLine,
} from '@stokrova/domain';
import { DurableMap } from '../infrastructure/database/durable-map.js';
import { OrdersService } from '../orders/orders.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { SalesTicketsService } from '../pos/sales-tickets.service.js';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { DeliveryRoutingService } from '../delivery/delivery-routing.service.js';

export interface PriceChange {
  id: string;
  tenant_id: string;
  variant_id: string;
  changed_by: string;
  old_cost_minor: number | null;
  new_cost_minor: number | null;
  old_selling_minor: number;
  new_selling_minor: number;
  changed_at: string;
}

const OFFSET = 60; // Lagos time, same as "My day".
const COUNTED = new Set(['CONFIRMED', 'RESERVED', 'PICKING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'COMPLETED']);
const variantLabel = (v: { sku: string; attributes?: Record<string, string> }) => {
  const a = Object.values(v.attributes || {}).filter(Boolean).join(' / ');
  return a ? `${v.sku} · ${a}` : v.sku;
};

/**
 * Server-calculated figures for: prices & margin, product profit (whole business or one seller),
 * the manager's live activity board, stock in/out and delivery runs.
 */
@Injectable()
export class InsightsService {
  private readonly priceChanges = new DurableMap<PriceChange>('product_price_changes');

  constructor(
    private readonly orders: OrdersService,
    private readonly variants: VariantsService,
    private readonly stock: StockLedgerService,
    private readonly tickets: SalesTicketsService,
    private readonly tenancy: TenancyService,
    private readonly delivery: DeliveryRoutingService,
  ) {}

  private today() { return dayKey(new Date().toISOString(), OFFSET); }

  async prices(tenantId: string) {
    const [variants, balances] = await Promise.all([this.variants.getVariants(tenantId), this.stock.getBalances(tenantId)]);
    const avail = new Map<string, number>();
    for (const b of balances) avail.set(b.variant_id, (avail.get(b.variant_id) ?? 0) + b.available_to_promise);
    return variants.map((v) => {
      const cost = Number(v.cost_price_minor) || 0;
      const sell = Number(v.selling_price_minor) || 0;
      const available = avail.get(v.id) ?? 0;
      return {
        variant_id: v.id, label: variantLabel(v), sku: v.sku, cost_price_minor: cost || null, selling_price_minor: sell,
        ...priceMargin(cost, sell), available_quantity: available, stock_level: stockLevel(available),
        last_change: [...this.priceChanges.values()].filter((c) => c.tenant_id === tenantId && c.variant_id === v.id).sort((a, b) => b.changed_at.localeCompare(a.changed_at))[0] ?? null,
      };
    });
  }

  async updatePrice(tenantId: string, userId: string, variantId: string, body: { cost_price_minor?: unknown; selling_price_minor?: unknown }) {
    const v = await this.variants.getVariantById(tenantId, variantId);
    let cost: number | undefined;
    let sell: number | undefined;
    try {
      if (body.cost_price_minor !== undefined && body.cost_price_minor !== null && body.cost_price_minor !== '') cost = assertValidPrice('Cost price', body.cost_price_minor);
      if (body.selling_price_minor !== undefined && body.selling_price_minor !== null && body.selling_price_minor !== '') sell = assertValidPrice('Selling price', body.selling_price_minor);
    } catch (e) { throw new BadRequestException((e as Error).message); }
    if (cost === undefined && sell === undefined) throw new BadRequestException('Enter a new cost price or selling price.');
    const change: PriceChange = {
      id: `ppc_${randomUUID().replace(/-/g, '')}`, tenant_id: tenantId, variant_id: variantId, changed_by: userId,
      old_cost_minor: Number(v.cost_price_minor) || null, new_cost_minor: cost ?? (Number(v.cost_price_minor) || null),
      old_selling_minor: Number(v.selling_price_minor) || 0, new_selling_minor: sell ?? (Number(v.selling_price_minor) || 0),
      changed_at: new Date().toISOString(),
    };
    await this.variants.updateVariant(tenantId, variantId, {
      ...(cost !== undefined ? { cost_price_minor: String(cost) } : {}),
      ...(sell !== undefined ? { selling_price_minor: String(sell) } : {}),
    } as never);
    this.priceChanges.set(change.id, change);
    return { ...change, ...priceMargin(change.new_cost_minor, change.new_selling_minor) };
  }

  priceHistory(tenantId: string, variantId: string) {
    return [...this.priceChanges.values()].filter((c) => c.tenant_id === tenantId && c.variant_id === variantId).sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  }

  /** Sold lines from confirmed sales orders (till and manual), optionally only the given orders. */
  private async soldLines(tenantId: string, onlyOrders?: Set<string>): Promise<SoldLine[]> {
    const [orders, variants] = await Promise.all([this.orders.listSalesOrders(tenantId), this.variants.getVariants(tenantId)]);
    const cost = new Map(variants.map((v) => [v.id, Number(v.cost_price_minor) || null]));
    const out: SoldLine[] = [];
    for (const o of orders as any[]) {
      if (!COUNTED.has(o.status)) continue;
      if (onlyOrders && !onlyOrders.has(o.id)) continue;
      const at = o.confirmed_at || o.created_at;
      for (const l of o.lines || []) {
        out.push({
          variant_id: l.variant_id, label: l.product_name || l.sku, quantity: Number(l.quantity) || 0,
          revenue_minor: (Number(l.line_total_minor) || 0) - (Number(l.tax_minor) || 0),
          unit_cost_minor: cost.get(l.variant_id) ?? null, sold_at: at,
        });
      }
    }
    return out;
  }

  /** ABC: which products bring most of the money in the last 90 days (A = top 80%). */
  async abc(tenantId: string) {
    const from = addDays(this.today(), -89);
    const by = new Map<string, { variant_id: string; sku: string; name: string; value: number }>();
    for (const l of await this.soldLines(tenantId)) {
      if (dayKey(l.sold_at, OFFSET) < from) continue;
      const r = by.get(l.variant_id) ?? { variant_id: l.variant_id, sku: l.label, name: l.label, value: 0 };
      r.value += Math.max(0, Math.round(l.revenue_minor));
      by.set(l.variant_id, r);
    }
    return { from, to: this.today(), ...calculateAbcClassification([...by.values()].filter((r) => r.value > 0), 'REVENUE') };
  }

  async products(tenantId: string) {
    return productPerformance(await this.soldLines(tenantId), this.today(), OFFSET);
  }

  /** Only the products this staff member sold at the till. */
  async myProducts(tenantId: string, userId: string) {
    const mine = new Set(this.tickets.listEvents(tenantId).filter((e) => e.user_id === userId && e.kind === 'SALE' && e.order_id).map((e) => e.order_id as string));
    return productPerformance(await this.soldLines(tenantId, mine), this.today(), OFFSET);
  }

  /** Manager's live board: who is working, what each person did today, and the latest actions. */
  async activity(tenantId: string) {
    const today = this.today();
    const names = new Map(this.tenancy.listStaff(tenantId).map((s) => [s.id, { name: s.name, role: s.role }]));
    const who = (id: string) => names.get(id)?.name || `Staff ${id.slice(-4)}`;
    const events = this.tickets.listEvents(tenantId);
    const ledger = await this.stock.getLedgerEntries(tenantId);
    const byUser = new Map<string, typeof events>();
    for (const e of events) { const a = byUser.get(e.user_id) ?? []; a.push(e); byUser.set(e.user_id, a); }
    for (const m of ledger) if (dayKey(m.created_at, OFFSET) === today && !byUser.has(m.user_id) && m.user_id) byUser.set(m.user_id, []);
    const now = Date.now();
    const staff = [...byUser.entries()].map(([id, evs]) => {
      const s = summarizeStaffDay(evs, today, OFFSET);
      const moves = ledger.filter((m) => m.user_id === id && dayKey(m.created_at, OFFSET) === today);
      const last = [s.last_activity_at, ...moves.map((m) => m.created_at)].filter(Boolean).sort().pop() ?? null;
      return {
        user_id: id, name: who(id), role: names.get(id)?.role ?? null, ...s, stock_moves: moves.length,
        last_activity_at: last, active_now: last ? now - new Date(last).getTime() < 15 * 60_000 : false,
      };
    }).filter((s) => s.last_activity_at && dayKey(s.last_activity_at, OFFSET) === today)
      .sort((a, b) => (b.sales_value_minor - a.sales_value_minor) || String(b.last_activity_at).localeCompare(String(a.last_activity_at)));
    const LABEL: Record<string, string> = { TICKET_WRITTEN: 'wrote an order slip', TICKET_PICKED: 'picked a slip', ITEM_MISSING: 'flagged a missing item', SALE: 'recorded a sale', TICKET_CANCELLED: 'cancelled a slip' };
    const feed = [
      ...events.map((e) => ({ at: e.occurred_at, who: who(e.user_id), what: LABEL[e.kind] ?? e.kind, reference: e.reference, amount_minor: e.kind === 'SALE' || e.kind === 'TICKET_WRITTEN' ? e.amount_minor : null, cash_minor: e.cash_minor || null, transfer_minor: e.transfer_minor || null, quantity: null as number | null })),
      ...ledger.map((m) => ({ at: m.created_at, who: who(m.user_id), what: `stock ${m.movement_type.toLowerCase().replace(/_/g, ' ')}`, reference: m.reference_id, amount_minor: null, cash_minor: null, transfer_minor: null, quantity: m.destination_warehouse_id && !m.source_warehouse_id ? m.quantity : m.source_warehouse_id && !m.destination_warehouse_id ? -m.quantity : m.quantity })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
    const totals = staff.reduce((t, s) => ({ sales: t.sales + s.sales, sales_value_minor: t.sales_value_minor + s.sales_value_minor, cash_minor: t.cash_minor + s.cash_minor, transfer_minor: t.transfer_minor + s.transfer_minor }), { sales: 0, sales_value_minor: 0, cash_minor: 0, transfer_minor: 0 });
    return { date: today, active_now: staff.filter((s) => s.active_now).length, totals, staff, feed };
  }

  async stockSummary(tenantId: string) {
    const today = this.today();
    const [ledger, balances, variants] = await Promise.all([this.stock.getLedgerEntries(tenantId), this.stock.getBalances(tenantId), this.variants.getVariants(tenantId)]);
    const flow = stockFlow(ledger.filter((m) => dayKey(m.created_at, OFFSET) >= addDays(today, -6)), today, OFFSET);
    const avail = new Map<string, { on: number; atp: number }>();
    for (const b of balances) { const a = avail.get(b.variant_id) ?? { on: 0, atp: 0 }; a.on += b.on_hand_quantity; a.atp += b.available_to_promise; avail.set(b.variant_id, a); }
    let stockValue = 0;
    let unknownCost = 0;
    const attention: { variant_id: string; label: string; available: number; level: string }[] = [];
    for (const v of variants) {
      const a = avail.get(v.id) ?? { on: 0, atp: 0 };
      const cost = Number(v.cost_price_minor) || 0;
      if (cost > 0) stockValue += cost * a.on; else if (a.on > 0) unknownCost++;
      const level = stockLevel(a.atp);
      if (level !== 'OK') attention.push({ variant_id: v.id, label: variantLabel(v), available: a.atp, level });
    }
    attention.sort((x, y) => x.available - y.available);
    return { date: today, ...flow, products: variants.length, stock_value_minor: stockValue, products_without_cost: unknownCost, out_of_stock: attention.filter((a) => a.level === 'OUT').length, running_low: attention.filter((a) => a.level === 'LOW').length, attention: attention.slice(0, 15) };
  }

  deliverySummary(tenantId: string) {
    const today = this.today();
    const runs = this.delivery.listAllRuns(tenantId);
    const count = (s: string[]) => runs.filter((r) => s.includes(String(r.status))).length;
    const onRoad = runs.filter((r) => ['DISPATCHED', 'IN_TRANSIT'].includes(String(r.status)));
    const daily = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return { date, completed: runs.filter((r) => r.completed_at && dayKey(r.completed_at, OFFSET) === date).length, dispatched: runs.filter((r) => r.dispatched_at && dayKey(r.dispatched_at, OFFSET) === date).length };
    });
    return {
      date: today, total_runs: runs.length, planned: count(['PLANNED', 'DRAFT', 'OPTIMIZED']), on_the_road: onRoad.length,
      completed_today: daily[6]!.completed, cancelled: count(['CANCELLED']),
      stops_on_road: onRoad.reduce((s, r) => s + r.total_stops, 0), stops_done_on_road: onRoad.reduce((s, r) => s + r.completed_stops, 0),
      daily,
      runs_on_road: onRoad.slice(0, 10).map((r) => ({ run_number: r.run_number, driver: r.driver_name ?? null, vehicle: r.vehicle_code ?? null, stops: r.total_stops, done: r.completed_stops, dispatched_at: r.dispatched_at ?? null })),
    };
  }
}
