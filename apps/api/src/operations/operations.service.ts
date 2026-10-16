import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  agingReport, countVariance, dailySummaryText, dayKey, expiringBatches, parseProductImport, stockLevel,
  type CountLine, type OpenDocument,
} from '@stokrova/domain';
import { DurableMap } from '../infrastructure/database/durable-map.js';
import { InvoicingService } from '../invoicing/invoicing.service.js';
import { PurchaseInvoicesService } from '../procurement/purchase-invoices.service.js';
import { SuppliersService } from '../procurement/suppliers.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { UomService } from '../catalog/uom.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { BatchesService } from '../tracking/batches.service.js';
import { SalesTicketsService } from '../pos/sales-tickets.service.js';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { configuredChannels, sendEmail, sendWhatsApp } from './notifier.js';

const OFFSET = 60; // Lagos time

export interface StockCountSession {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  status: 'OPEN' | 'POSTED' | 'CANCELLED';
  started_by: string;
  posted_by: string | null;
  lines: CountLine[];
  created_at: string;
  posted_at: string | null;
}

export interface AlertSettings {
  id: string; // = tenant_id
  tenant_id: string;
  email: string | null;
  whatsapp: string | null;
  send_hour: number;
  low_stock_at: number;
  expiry_days: number;
  enabled: boolean;
  last_sent_day: string | null;
  updated_at: string;
}

const variantLabel = (v: { sku: string; attributes?: Record<string, string> }) => {
  const a = Object.values(v.attributes || {}).filter(Boolean).join(' / ');
  return a ? `${v.sku} · ${a}` : v.sku;
};

/** Money owed, stock counts, product import, low-stock / expiry alerts and the daily summary. */
@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);
  private readonly counts = new DurableMap<StockCountSession>('stock_count_sessions');
  private readonly alerts = new DurableMap<AlertSettings>('alert_settings');

  constructor(
    private readonly invoices: InvoicingService,
    private readonly purchaseInvoices: PurchaseInvoicesService,
    private readonly suppliers: SuppliersService,
    private readonly variants: VariantsService,
    private readonly templates: TemplatesService,
    private readonly uoms: UomService,
    private readonly stock: StockLedgerService,
    private readonly batches: BatchesService,
    private readonly tickets: SalesTicketsService,
    private readonly tenancy: TenancyService,
  ) {}

  today(now = new Date()) { return dayKey(now.toISOString(), OFFSET); }

  // ---------------- Money owed ----------------
  async receivables(tenantId: string) {
    const list = await this.invoices.listInvoices(tenantId);
    const docs: OpenDocument[] = list
      .filter((i) => !['VOID', 'DRAFT', 'PAID', 'CREDITED'].includes(String(i.status)))
      .map((i) => ({ id: i.id, number: i.invoice_number, party_id: i.customer_id, party_name: i.customer_name || 'Walk-in customer', due_date: i.due_date, balance_minor: Number(i.balance_due_minor) || 0 }));
    return agingReport(docs, this.today());
  }

  async payables(tenantId: string) {
    const [list, sups] = await Promise.all([this.purchaseInvoices.list(tenantId), this.suppliers.listSuppliers(tenantId as never).catch(() => [] as any[])]);
    const names = new Map(((sups as any)?.data ?? sups ?? []).map((s: any) => [s.id, s.name]));
    const docs: OpenDocument[] = list
      .filter((p) => !['PAID', 'CANCELLED', 'VOID', 'DRAFT'].includes(String(p.status)))
      .map((p) => ({ id: p.id, number: p.supplier_invoice_reference || p.invoice_number, party_id: p.supplier_id, party_name: String(names.get(p.supplier_id) ?? `Supplier ${p.supplier_id.slice(-4)}`), due_date: p.due_date, balance_minor: (Number(p.total_minor) || 0) - (Number(p.amount_paid_minor) || 0) }));
    return agingReport(docs, this.today());
  }

  // ---------------- Stock counts ----------------
  listCounts(tenantId: string) {
    return [...this.counts.values()].filter((c) => c.tenant_id === tenantId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((c) => this.withVariance(c));
  }

  private withVariance(c: StockCountSession) { return { ...c, summary: countVariance(c.lines) }; }

  private getCount(tenantId: string, id: string) {
    const c = this.counts.get(id);
    if (!c || c.tenant_id !== tenantId) throw new NotFoundException('Stock count not found.');
    return c;
  }

  /** Snapshots what the system expects on the shelf for one warehouse. */
  async startCount(tenantId: string, userId: string, warehouseId: string) {
    if (!warehouseId) throw new BadRequestException('Choose the warehouse or shop to count.');
    if ([...this.counts.values()].some((c) => c.tenant_id === tenantId && c.warehouse_id === warehouseId && c.status === 'OPEN')) {
      throw new BadRequestException('A count is already open for this location. Finish or cancel it first.');
    }
    const [balances, variants] = await Promise.all([this.stock.getBalances(tenantId), this.variants.getVariants(tenantId)]);
    const onHand = new Map<string, number>();
    for (const b of balances) if (b.warehouse_id === warehouseId) onHand.set(b.variant_id, (onHand.get(b.variant_id) ?? 0) + b.on_hand_quantity);
    const lines: CountLine[] = variants.map((v) => ({ variant_id: v.id, label: variantLabel(v), expected: onHand.get(v.id) ?? 0, counted: null, unit_cost_minor: Number(v.cost_price_minor) || null }));
    const c: StockCountSession = { id: `cnt_${randomUUID().replace(/-/g, '')}`, tenant_id: tenantId, warehouse_id: warehouseId, status: 'OPEN', started_by: userId, posted_by: null, lines, created_at: new Date().toISOString(), posted_at: null };
    this.counts.set(c.id, c);
    return this.withVariance(c);
  }

  recordCounts(tenantId: string, id: string, entries: { variant_id: string; counted: unknown }[]) {
    const c = this.getCount(tenantId, id);
    if (c.status !== 'OPEN') throw new BadRequestException('This count is already closed.');
    for (const e of entries || []) {
      const line = c.lines.find((l) => l.variant_id === e.variant_id);
      if (!line) throw new BadRequestException('That product is not on this count.');
      if (e.counted === null || e.counted === '') { line.counted = null; continue; }
      const n = Number(e.counted);
      if (!Number.isInteger(n) || n < 0) throw new BadRequestException(`${line.label}: counted quantity must be a whole number, 0 or more.`);
      line.counted = n;
    }
    this.counts.set(c.id, c);
    return this.withVariance(c);
  }

  /** Posts every counted difference to the stock ledger (uncounted lines are left alone). */
  async postCount(tenantId: string, userId: string, id: string) {
    const c = this.getCount(tenantId, id);
    if (c.status !== 'OPEN') throw new BadRequestException('This count is already closed.');
    const counted = c.lines.filter((l) => l.counted !== null);
    if (!counted.length) throw new BadRequestException('Enter at least one counted quantity before posting.');
    for (const l of counted) {
      await this.stock.reconcileStockCount(tenantId, userId, { idempotency_key: `${c.id}:${l.variant_id}`, warehouse_id: c.warehouse_id, variant_id: l.variant_id, counted_quantity: l.counted as number, notes: `Stock count ${c.id}` } as never);
    }
    c.status = 'POSTED'; c.posted_by = userId; c.posted_at = new Date().toISOString();
    this.counts.set(c.id, c);
    return this.withVariance(c);
  }

  cancelCount(tenantId: string, id: string) {
    const c = this.getCount(tenantId, id);
    if (c.status !== 'OPEN') throw new BadRequestException('This count is already closed.');
    c.status = 'CANCELLED';
    this.counts.set(c.id, c);
    return this.withVariance(c);
  }

  // ---------------- Product import ----------------
  async importProducts(tenantId: string, userId: string, body: { rows?: Record<string, unknown>[]; warehouse_id?: string; dry_run?: boolean }) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) throw new BadRequestException('The file has no product rows.');
    if (rows.length > 2000) throw new BadRequestException('Import up to 2,000 products at a time.');
    const { valid, errors } = parseProductImport(rows);
    const existing = new Set((await this.variants.getVariants(tenantId)).map((v) => v.sku));
    const fresh = valid.filter((r) => { if (existing.has(r.sku)) { errors.push({ row: 0, message: `${r.sku} already exists — skipped.` }); return false; } return true; });
    if (fresh.some((r) => r.opening_quantity > 0) && !body.warehouse_id) throw new BadRequestException('Choose which warehouse or shop receives the opening stock.');
    if (body.dry_run) return { ready: fresh.length, created: 0, errors };
    const uom = (await this.uoms.getUoms(tenantId))[0];
    if (!uom) throw new BadRequestException('Add a unit of measure (for example "Piece") in the catalog first.');
    let created = 0;
    for (const r of fresh) {
      try {
        const t = await this.templates.createTemplate(tenantId, { code: r.sku, name: r.name, type: 'STANDARD', base_uom_id: uom.id } as never);
        const v = await this.variants.createVariant(tenantId, { template_id: t.id, sku: r.sku, barcode: r.barcode, cost_price_minor: String(r.cost_price_minor), selling_price_minor: String(r.selling_price_minor), attributes: { name: r.name } });
        if (r.image_url) await this.variants.updateVariant(tenantId, v.id, { image_url: r.image_url } as never);
        if (r.opening_quantity > 0) {
          await this.stock.adjustStock(tenantId, userId, { idempotency_key: `import:${v.id}`, warehouse_id: body.warehouse_id as string, variant_id: v.id, delta_quantity: r.opening_quantity, reason_code: 'OTHER', unit_cost_minor: String(r.cost_price_minor), notes: 'Opening stock from product import' });
        }
        created++;
      } catch (e) {
        errors.push({ row: 0, message: `${r.sku}: ${(e as Error).message}` });
      }
    }
    return { ready: fresh.length, created, errors };
  }

  async setImage(tenantId: string, variantId: string, url: unknown) {
    const s = typeof url === 'string' ? url.trim() : '';
    if (s && !/^https:\/\//i.test(s)) throw new BadRequestException('The photo must be an https:// link.');
    return this.variants.updateVariant(tenantId, variantId, { image_url: s || null } as never);
  }

  // ---------------- Alerts & daily summary ----------------
  getSettings(tenantId: string): AlertSettings {
    return this.alerts.get(tenantId) ?? { id: tenantId, tenant_id: tenantId, email: null, whatsapp: null, send_hour: 20, low_stock_at: 5, expiry_days: 30, enabled: false, last_sent_day: null, updated_at: new Date().toISOString() };
  }

  saveSettings(tenantId: string, body: Partial<AlertSettings>) {
    const cur = this.getSettings(tenantId);
    const email = body.email === undefined ? cur.email : (String(body.email || '').trim() || null);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email address.');
    const whatsapp = body.whatsapp === undefined ? cur.whatsapp : (String(body.whatsapp || '').replace(/[^\d+]/g, '') || null);
    if (whatsapp && !/^\+?\d{10,15}$/.test(whatsapp)) throw new BadRequestException('Enter the WhatsApp number with country code, e.g. +2348012345678.');
    const int = (v: unknown, d: number, min: number, max: number, what: string) => {
      if (v === undefined) return d;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${what} must be between ${min} and ${max}.`);
      return n;
    };
    const next: AlertSettings = {
      ...cur, email, whatsapp,
      send_hour: int(body.send_hour, cur.send_hour, 0, 23, 'Send time'),
      low_stock_at: int(body.low_stock_at, cur.low_stock_at, 0, 100000, 'Low-stock level'),
      expiry_days: int(body.expiry_days, cur.expiry_days, 1, 365, 'Expiry warning days'),
      enabled: body.enabled === undefined ? cur.enabled : Boolean(body.enabled),
      updated_at: new Date().toISOString(),
    };
    this.alerts.set(tenantId, next);
    return { ...next, channels: configuredChannels() };
  }

  /** Everything the owner should act on today: low stock, expiring batches, overdue money, today's takings. */
  async digest(tenantId: string) {
    const settings = this.getSettings(tenantId);
    const today = this.today();
    const [variants, balances, batches, recv, pay] = await Promise.all([
      this.variants.getVariants(tenantId), this.stock.getBalances(tenantId), this.batches.getBatches(tenantId), this.receivables(tenantId), this.payables(tenantId),
    ]);
    const avail = new Map<string, number>();
    for (const b of balances) avail.set(b.variant_id, (avail.get(b.variant_id) ?? 0) + b.available_to_promise);
    const label = new Map(variants.map((v) => [v.id, variantLabel(v)]));
    const low: { variant_id: string; label: string; available: number }[] = [];
    let out = 0;
    for (const v of variants) {
      const a = avail.get(v.id) ?? 0;
      const lvl = stockLevel(a, settings.low_stock_at);
      if (lvl === 'OUT') out++; else if (lvl === 'LOW') low.push({ variant_id: v.id, label: label.get(v.id)!, available: a });
    }
    low.sort((a, b) => a.available - b.available);
    const expiring = expiringBatches(batches as any[], today, settings.expiry_days).map((b: any) => ({ batch_id: b.id, batch_number: b.batch_number, label: label.get(b.variant_id) ?? b.variant_id, expiry_date: b.expiry_date, days_left: b.days_left, expired: b.expired }));
    const sales = this.tickets.listEvents(tenantId).filter((e) => e.kind === 'SALE' && dayKey(e.occurred_at, OFFSET) === today);
    const tenant = await this.tenancy.getTenantById(tenantId).catch(() => null);
    const summary = {
      business: (tenant as any)?.name ?? 'Your business', date: today,
      sales_minor: sales.reduce((s, e) => s + e.amount_minor, 0), sales_count: sales.length,
      cash_minor: sales.reduce((s, e) => s + e.cash_minor, 0), transfer_minor: sales.reduce((s, e) => s + e.transfer_minor, 0),
      low_stock: low, out_of_stock: out, expiring,
      overdue_receivables_minor: recv.overdue_minor, overdue_payables_minor: pay.overdue_minor,
    };
    return { ...summary, message: dailySummaryText(summary), settings, channels: configuredChannels() };
  }

  async sendSummary(tenantId: string) {
    const d = await this.digest(tenantId);
    const s = d.settings;
    if (!s.email && !s.whatsapp) throw new BadRequestException('Add an email address or WhatsApp number first.');
    const results: { channel: string; ok: boolean; detail: string }[] = [];
    if (s.email) results.push({ channel: 'EMAIL', ...(await sendEmail(s.email, `${d.business}: daily summary ${d.date}`, d.message)) });
    if (s.whatsapp) results.push({ channel: 'WHATSAPP', ...(await sendWhatsApp(s.whatsapp, d.message)) });
    if (results.some((r) => r.ok)) this.alerts.set(tenantId, { ...s, last_sent_day: d.date });
    return { date: d.date, results };
  }

  /** Called hourly: sends each business's summary once a day at its chosen hour. */
  async runScheduled(now = new Date()) {
    const { summaryDue } = await import('@stokrova/domain');
    let sent = 0;
    for (const s of this.alerts.values()) {
      if (!s.enabled || (!s.email && !s.whatsapp)) continue;
      if (!summaryDue(s.send_hour, s.last_sent_day, now.toISOString(), OFFSET).due) continue;
      try { const r = await this.sendSummary(s.tenant_id); if (r.results.some((x) => x.ok)) sent++; }
      catch (e) { this.logger.warn(`Daily summary for ${s.tenant_id} not sent: ${(e as Error).message}`); }
    }
    return sent;
  }
}
