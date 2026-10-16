import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PlanPricingService } from './plan-pricing.service.js';
import { FREE_TRIAL_DAYS, accessState, effectivePriceMinor, validateOverride, type AccessState, type BillingOverride } from './billing-rules.js';
import { DurableMap } from '../infrastructure/database/durable-map.js';
import { randomUUID } from 'node:crypto';
import type {
  SubscriptionTier,
  BillingCycle,
  SubscriptionStatus,
  FeatureFlagKey,
  TenantSubscription,
  MeteredUsageMetric,
  MeteredUsageRecord,
  SaaSInvoice,
  ProrationQuote,
  QuotaEvaluationResult,
} from '@stokrova/contracts';
import {
  TIER_ENTITLEMENT_DEFINITIONS,
  canTransitionSubscriptionStatus,
  isFeatureEnabled,
  getEffectiveLimit,
  evaluateTenantQuota,
  calculateProratedBilling,
  calculateNextDunningRetry,
} from '@stokrova/domain';

type Sub = TenantSubscription & { billing_override?: BillingOverride | null };

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  // In-memory repositories for high-speed tenant subscription and billing state
  // Saved to tenant_subscriptions / saas_invoices and reloaded at startup (ALWAYS_HYDRATE).
  // Subscriptions are keyed by tenant_id while running; their id is `sub_<tenant_id>`, which is the key after a reload.
  private subscriptionsStore = new DurableMap<TenantSubscription>('tenant_subscriptions'); // tenant_id -> sub
  private invoicesStore = new DurableMap<SaaSInvoice>('saas_invoices'); // invoice_id -> invoice
  /** Every plan change: who, from what, to what, when (plan_change_history). */
  private planHistoryStore = new DurableMap<{ id: string; tenant_id: string; from_tier: string; to_tier: string; changed_by: string; source: string; created_at: string }>('plan_change_history');
  private usageStore = new Map<string, MeteredUsageRecord>(); // idempotency_key -> record
  private dunningAttemptsStore = new Map<string, number>(); // invoice_id -> failure_count

  constructor(@Optional() private readonly pricing: PlanPricingService = new PlanPricingService()) {}

  /** Price charged for a plan right now (founder-set price, else the built-in default). */
  private async priceFor(tier: SubscriptionTier, cycle: BillingCycle): Promise<string> {
    const p = await this.pricing.get(tier);
    return cycle === 'ANNUAL' ? p.annual_price_minor : p.monthly_price_minor;
  }

  /**
   * Provision or initialize tenant subscription
   */
  async createSubscription(dto: {
    tenant_id: string;
    tier: SubscriptionTier;
    billing_cycle?: BillingCycle;
    currency?: string;
    trial_days?: number;
  }): Promise<TenantSubscription> {
    const cycle = dto.billing_cycle ?? 'MONTHLY';
    const currency = (dto.currency ?? 'NGN').toUpperCase();
    const now = new Date();

    const periodDays = cycle === 'ANNUAL' ? 365 : 30;
    const trialEndsAt =
      dto.trial_days && dto.trial_days > 0
        ? new Date(now.getTime() + dto.trial_days * 24 * 60 * 60 * 1000).toISOString()
        : null;
    // During the free trial the first period is the trial itself; the first invoice comes when it ends.
    const periodEnd = trialEndsAt ? new Date(trialEndsAt) : new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    const sub: TenantSubscription = {
      id: `sub_${dto.tenant_id}`,
      tenant_id: dto.tenant_id,
      tier: dto.tier,
      status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
      billing_cycle: cycle,
      currency,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      canceled_at: null,
      trial_ends_at: trialEndsAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.subscriptionsStore.set(dto.tenant_id, sub);

    // If active paid tier without trial, generate initial invoice
    const tierDef = TIER_ENTITLEMENT_DEFINITIONS[dto.tier];
    const priceMinor = await this.priceFor(dto.tier, cycle);

    if (priceMinor !== '0' && !trialEndsAt) {
      await this.generateInvoice({
        tenant_id: dto.tenant_id,
        subscription_id: sub.id,
        period_start: sub.current_period_start,
        period_end: sub.current_period_end,
        subtotal_minor: priceMinor,
        tax_minor: '0',
        currency,
        description: `STOKROVA ${tierDef.name} Plan (${cycle})`,
      });
    }

    return sub;
  }

  /**
   * Fetch current subscription for a tenant
   */
  async getSubscription(tenant_id: string): Promise<TenantSubscription> {
    const sub = this.subscriptionsStore.get(tenant_id) ?? this.subscriptionsStore.get(`sub_${tenant_id}`);
    if (!sub) {
      // Default to Solo Trader if no explicit subscription exists yet (Rule 14, 15)
      // Use the plan saved on the business (set by the founder or at sign-up), else Solo Trader.
      const savedTier = await this.pricing.tenantTier(tenant_id);
      return this.createSubscription({
        tenant_id,
        tier: savedTier && savedTier !== 'SOLO_TRADER' ? savedTier : 'RETAIL_STARTER',
        billing_cycle: 'MONTHLY',
        trial_days: FREE_TRIAL_DAYS, // every new business: one month free, whatever plan it picked
      });
    }
    return sub;
  }

  /** Whether the business may use its workspace (trial, paid, founder-waived, or closed for an unpaid invoice). */
  async access(tenant_id: string, now: Date = new Date()): Promise<{ state: AccessState; trial_ends_at: string | null; trial_days_left: number; open_invoices: number; override: BillingOverride | null }> {
    const sub = (await this.getSubscription(tenant_id)) as Sub;
    const invoices = await this.listInvoices(tenant_id);
    const left = sub.trial_ends_at ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - now.getTime()) / 86400000)) : 0;
    return {
      state: accessState(sub, invoices, now),
      trial_ends_at: sub.trial_ends_at,
      trial_days_left: left,
      open_invoices: invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOID').length,
      override: sub.billing_override ?? null,
    };
  }

  /** Same check without creating anything; used on every workspace request. */
  accessNow(tenant_id: string, now: Date = new Date()): AccessState {
    const sub = (this.subscriptionsStore.get(tenant_id) ?? this.subscriptionsStore.get(`sub_${tenant_id}`)) as Sub | undefined;
    const invoices = Array.from(this.invoicesStore.values()).filter((i) => i.tenant_id === tenant_id);
    return accessState(sub ?? null, invoices, now);
  }

  /** Founder: run free, discount, fixed price, or back to normal. Applies from the next invoice. */
  async setBillingOverride(tenant_id: string, input: { mode?: unknown; value?: unknown; note?: unknown }, actorId: string): Promise<TenantSubscription> {
    let o: BillingOverride;
    try { o = validateOverride(input); } catch (e) { throw new BadRequestException((e as Error).message); }
    const sub = (await this.getSubscription(tenant_id)) as Sub;
    sub.billing_override = o.mode === 'NONE' ? null : { ...o, note: input.note ? String(input.note).slice(0, 300) : null, set_by: actorId, set_at: new Date().toISOString() };
    sub.updated_at = new Date().toISOString();
    this.subscriptionsStore.set(tenant_id, sub);
    return sub;
  }

  /** Founder: give extra free days (extends the trial, or adds a free trial from today). */
  async extendTrial(tenant_id: string, days: number): Promise<TenantSubscription> {
    if (!Number.isInteger(days) || days < 1 || days > 365) throw new BadRequestException('Extra days must be a whole number from 1 to 365.');
    const sub = await this.getSubscription(tenant_id);
    const base = Math.max(Date.now(), sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0, new Date(sub.current_period_end).getTime() > Date.now() && sub.status === 'TRIALING' ? new Date(sub.current_period_end).getTime() : 0);
    const end = new Date(base + days * 86400000).toISOString();
    sub.trial_ends_at = end;
    sub.status = 'TRIALING';
    if (new Date(sub.current_period_end) < new Date(end)) sub.current_period_end = end;
    sub.updated_at = new Date().toISOString();
    this.subscriptionsStore.set(tenant_id, sub);
    return sub;
  }

  /** Founder: record that an invoice was paid outside a payment provider (e.g. bank transfer to Stokrova). */
  async markInvoicePaid(tenant_id: string, invoice_id: string, reference: string): Promise<SaaSInvoice> {
    const inv = this.invoicesStore.get(invoice_id);
    if (!inv || inv.tenant_id !== tenant_id) throw new NotFoundException('Invoice not found for this business.');
    if (inv.status === 'PAID') return inv;
    return (await this.processPaymentWebhook({ invoice_id, payment_gateway_reference: reference || 'founder-recorded', amount_paid_minor: inv.total_minor, status: 'SUCCEEDED' })).invoice;
  }

  /** A business's plan invoices, newest first. */
  /** Any invoice by id (webhooks know only the payment reference). */
  invoiceById(invoice_id: string): SaaSInvoice | undefined {
    return this.invoicesStore.get(invoice_id);
  }

  async listInvoices(tenant_id: string): Promise<SaaSInvoice[]> {
    return Array.from(this.invoicesStore.values())
      .filter((i) => i.tenant_id === tenant_id)
      .sort((a, b) => b.period_start.localeCompare(a.period_start));
  }

  /**
   * Starts the next billing period for every subscription whose period has ended and issues its
   * invoice at the plan's price right now (the founder-set price). Free plans roll over without an invoice.
   * Safe to run repeatedly: a period is only renewed once because its end date moves forward.
   */
  async renewDueSubscriptions(now: Date = new Date()): Promise<SaaSInvoice[]> {
    const issued: SaaSInvoice[] = [];
    const seen = new Set<string>();
    for (const sub of Array.from(this.subscriptionsStore.values())) {
      if (seen.has(sub.tenant_id)) continue;
      seen.add(sub.tenant_id);
      if (sub.status === 'CANCELED') continue;
      if (sub.status === 'TRIALING' && sub.trial_ends_at && new Date(sub.trial_ends_at) > now) continue;
      let guard = 0;
      while (new Date(sub.current_period_end) <= now && guard++ < 24) {
        if (sub.cancel_at_period_end) {
          sub.status = 'CANCELED';
          sub.canceled_at = now.toISOString();
          break;
        }
        const start = new Date(sub.current_period_end);
        const end = new Date(start.getTime() + (sub.billing_cycle === 'ANNUAL' ? 365 : 30) * 86400000);
        sub.current_period_start = start.toISOString();
        sub.current_period_end = end.toISOString();
        if (sub.status === 'TRIALING') sub.status = 'ACTIVE';
        const price = effectivePriceMinor(await this.priceFor(sub.tier, sub.billing_cycle), (sub as Sub).billing_override);
        if (price !== '0') {
          issued.push(
            await this.generateInvoice({
              tenant_id: sub.tenant_id,
              subscription_id: sub.id,
              period_start: sub.current_period_start,
              period_end: sub.current_period_end,
              subtotal_minor: price,
              tax_minor: '0',
              currency: sub.currency,
              description: `STOKROVA ${TIER_ENTITLEMENT_DEFINITIONS[sub.tier].name} Plan (${sub.billing_cycle})`,
            }),
          );
        }
      }
      sub.updated_at = now.toISOString();
      this.subscriptionsStore.set(sub.tenant_id, sub);
    }
    return issued;
  }

  /**
   * Request a plan transition with proration quote
   */
  /** Founder grants on top of the plan (extra features, raised limits). Pass empty to clear. */
  async setPlanGrants(tenant_id: string, grants: { features?: unknown; limits?: unknown }): Promise<TenantSubscription> {
    const sub = await this.getSubscription(tenant_id);
    const features = Array.isArray(grants?.features) ? grants.features.filter((f): f is string => typeof f === 'string' && /^[a-z-]{2,40}$/.test(f)) : [];
    const limits: Record<string, number | null> = {};
    const raw = grants?.limits && typeof grants.limits === 'object' ? (grants.limits as Record<string, unknown>) : {};
    for (const k of ['max_branches', 'max_active_registers', 'max_users', 'max_warehouses']) {
      const v = raw[k];
      if (v === null) limits[k] = null;
      else if (v !== undefined && v !== '') {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 100000) throw new BadRequestException(`${k} must be a whole number of 0 or more, or empty for the plan's normal limit.`);
        limits[k] = n;
      }
    }
    sub.plan_grants = { features: [...new Set(features)], limits };
    sub.updated_at = new Date().toISOString();
    this.subscriptionsStore.set(tenant_id, sub);
    return sub;
  }

  async planHistory(tenant_id: string) {
    return [...this.planHistoryStore.values()].filter((h) => h.tenant_id === tenant_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async quotePlanChange(tenant_id: string, targetTier: SubscriptionTier): Promise<ProrationQuote> {
    const sub = await this.getSubscription(tenant_id);
    return calculateProratedBilling({
      tenantId: tenant_id,
      currentTier: sub.tier,
      targetTier,
      cycle: sub.billing_cycle,
      periodStart: sub.current_period_start,
      periodEnd: sub.current_period_end,
      effectiveDate: new Date(),
      prices: Object.fromEntries((await this.pricing.list()).map((p) => [p.tier, p])),
    });
  }

  /**
   * Execute plan transition
   */
  async changePlan(
    tenant_id: string,
    targetTier: SubscriptionTier,
    effectiveImmediately = true,
    changedBy: { actor_id: string; source: 'OWNER' | 'FOUNDER' | 'SYSTEM' } = { actor_id: 'system', source: 'SYSTEM' },
  ): Promise<{
    subscription: TenantSubscription;
    prorationQuote: ProrationQuote;
    invoice: SaaSInvoice | null;
  }> {
    const sub = await this.getSubscription(tenant_id);
    const quote = await this.quotePlanChange(tenant_id, targetTier);

    if (sub.tier !== targetTier) {
      const id = `pch_${randomUUID().replace(/-/g, '')}`;
      this.planHistoryStore.set(id, { id, tenant_id, from_tier: sub.tier, to_tier: targetTier, changed_by: changedBy.actor_id, source: changedBy.source, created_at: new Date().toISOString() });
    }
    if (effectiveImmediately) {
      sub.tier = targetTier;
      sub.updated_at = new Date().toISOString();
      this.subscriptionsStore.set(tenant_id, sub);
      await this.pricing.saveTenantTier(tenant_id, targetTier);

      let invoice: SaaSInvoice | null = null;
      const inTrial = !!sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date();
      if (!inTrial && BigInt(quote.net_prorated_amount_minor) > 0n) {
        invoice = await this.generateInvoice({
          tenant_id,
          subscription_id: sub.id,
          period_start: quote.effective_date,
          period_end: sub.current_period_end,
          subtotal_minor: quote.net_prorated_amount_minor,
          tax_minor: '0',
          currency: sub.currency,
          description: `Prorated upgrade to ${TIER_ENTITLEMENT_DEFINITIONS[targetTier].name}`,
          is_proration: true,
        });
      }

      return {
        subscription: sub,
        prorationQuote: quote,
        invoice,
      };
    }

    // Schedule for period end
    sub.cancel_at_period_end = false;
    await this.pricing.saveTenantTier(tenant_id, targetTier);
    sub.updated_at = new Date().toISOString();
    return {
      subscription: sub,
      prorationQuote: quote,
      invoice: null,
    };
  }

  /**
   * Update subscription status with state machine enforcement
   */
  async updateStatus(
    tenant_id: string,
    targetStatus: SubscriptionStatus,
  ): Promise<TenantSubscription> {
    const sub = await this.getSubscription(tenant_id);
    if (!canTransitionSubscriptionStatus(sub.status, targetStatus)) {
      throw new BadRequestException(
        `Cannot transition subscription from ${sub.status} to ${targetStatus}`,
      );
    }

    sub.status = targetStatus;
    sub.updated_at = new Date().toISOString();
    this.subscriptionsStore.set(tenant_id, sub);
    return sub;
  }

  /**
   * Feature entitlement guard
   */
  async checkFeatureEntitlement(
    tenant_id: string,
    flag: FeatureFlagKey,
  ): Promise<{ enabled: boolean; tier: SubscriptionTier }> {
    const sub = await this.getSubscription(tenant_id);
    const enabled = isFeatureEnabled(sub, flag);
    return { enabled, tier: sub.tier };
  }

  /**
   * Assert feature entitlement; throws ForbiddenException if disabled
   */
  async assertFeatureEnabled(tenant_id: string, flag: FeatureFlagKey): Promise<void> {
    const { enabled, tier } = await this.checkFeatureEntitlement(tenant_id, flag);
    if (!enabled) {
      throw new ForbiddenException(
        `Feature '${flag}' is not enabled on the '${tier}' plan for tenant '${tenant_id}'. Please upgrade your subscription.`,
      );
    }
  }

  /**
   * Quota evaluation
   */
  async checkQuota(
    tenant_id: string,
    metric:
      | 'max_branches'
      | 'max_active_registers'
      | 'max_warehouses'
      | 'max_skus'
      | 'max_monthly_orders'
      | 'max_users',
    currentUsage: number,
  ): Promise<QuotaEvaluationResult> {
    const sub = await this.getSubscription(tenant_id);
    const limit = getEffectiveLimit(sub, metric);
    return evaluateTenantQuota(metric, currentUsage, limit);
  }

  /**
   * Record metered usage with idempotency
   */
  async recordMeteredUsage(dto: {
    tenant_id: string;
    metric: MeteredUsageMetric;
    quantity: number;
    idempotency_key: string;
  }): Promise<MeteredUsageRecord> {
    const existing = this.usageStore.get(dto.idempotency_key);
    if (existing) {
      return existing; // Idempotent return (Rule 19)
    }

    const sub = await this.getSubscription(dto.tenant_id);
    const record: MeteredUsageRecord = {
      id: `usage_${randomUUID()}`,
      tenant_id: dto.tenant_id,
      subscription_id: sub.id,
      metric: dto.metric,
      quantity: dto.quantity.toString(),
      recorded_at: new Date().toISOString(),
      idempotency_key: dto.idempotency_key,
    };

    this.usageStore.set(dto.idempotency_key, record);
    return record;
  }

  /**
   * Get metered usage summary for current period
   */
  async getUsageSummary(tenant_id: string): Promise<Record<MeteredUsageMetric, number>> {
    const summary: Record<MeteredUsageMetric, number> = {
      api_calls: 0,
      orders: 0,
      storage_bytes: 0,
      webhook_deliveries: 0,
    };

    for (const r of this.usageStore.values()) {
      if (r.tenant_id === tenant_id) {
        summary[r.metric] += Number(r.quantity);
      }
    }

    return summary;
  }

  /**
   * Process incoming payment gateway webhook (Paystack / Stripe / Flutterwave)
   */
  async processPaymentWebhook(event: {
    invoice_id: string;
    payment_gateway_reference: string;
    amount_paid_minor: string;
    status: 'SUCCEEDED' | 'FAILED';
    failure_reason?: string;
  }): Promise<{ invoice: SaaSInvoice; subscription: TenantSubscription }> {
    const invoice = this.invoicesStore.get(event.invoice_id);
    if (!invoice) {
      throw new NotFoundException(`SaaS Invoice ${event.invoice_id} not found`);
    }

    const sub = await this.getSubscription(invoice.tenant_id);

    if (event.status === 'SUCCEEDED') {
      invoice.status = 'PAID';
      invoice.paid_at = new Date().toISOString();
      invoice.payment_gateway_reference = event.payment_gateway_reference;
      this.invoicesStore.set(invoice.id, invoice);

      // Restore active status and clear dunning counters
      sub.status = 'ACTIVE';
      sub.updated_at = new Date().toISOString();
      this.subscriptionsStore.set(sub.tenant_id, sub);
      this.dunningAttemptsStore.delete(invoice.id);

      return { invoice, subscription: sub };
    }

    // Payment failed -> evaluate dunning policy
    const attempts = (this.dunningAttemptsStore.get(invoice.id) ?? 0) + 1;
    this.dunningAttemptsStore.set(invoice.id, attempts);

    const retryPolicy = calculateNextDunningRetry(attempts, new Date());
    if (retryPolicy.shouldSuspend) {
      sub.status = 'SUSPENDED';
      invoice.status = 'UNCOLLECTIBLE';
      this.logger.warn(`Tenant ${sub.tenant_id} suspended due to repeated payment failure`);
    } else {
      sub.status = 'PAST_DUE';
    }

    sub.updated_at = new Date().toISOString();
    this.subscriptionsStore.set(sub.tenant_id, sub);
    this.invoicesStore.set(invoice.id, invoice);

    return { invoice, subscription: sub };
  }

  /**
   * Helper: Generate an immutable SaaS invoice
   */
  private async generateInvoice(params: {
    tenant_id: string;
    subscription_id: string;
    period_start: string;
    period_end: string;
    subtotal_minor: string;
    tax_minor: string;
    currency: string;
    description: string;
    is_proration?: boolean;
  }): Promise<SaaSInvoice> {
    const totalMinor = (
      BigInt(params.subtotal_minor) + BigInt(params.tax_minor)
    ).toString();

    const invoice: SaaSInvoice = {
      id: `inv_${randomUUID()}`,
      tenant_id: params.tenant_id,
      subscription_id: params.subscription_id,
      invoice_number: `INV-SAAS-${Date.now().toString(36).toUpperCase()}`,
      period_start: params.period_start,
      period_end: params.period_end,
      subtotal_minor: params.subtotal_minor,
      tax_minor: params.tax_minor,
      total_minor: totalMinor,
      currency: params.currency,
      status: 'OPEN',
      lines: [
        {
          id: `line_${randomUUID()}`,
          description: params.description,
          unit_price_minor: params.subtotal_minor,
          quantity: 1,
          amount_minor: params.subtotal_minor,
          is_proration: Boolean(params.is_proration),
        },
      ],
      payment_gateway_reference: null,
      paid_at: null,
      created_at: new Date().toISOString(),
    };

    this.invoicesStore.set(invoice.id, invoice);
    return invoice;
  }
}
