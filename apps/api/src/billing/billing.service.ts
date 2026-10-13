import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
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

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  // In-memory repositories for high-speed tenant subscription and billing state
  private subscriptionsStore = new Map<string, TenantSubscription>(); // tenant_id -> sub
  private invoicesStore = new Map<string, SaaSInvoice>(); // invoice_id -> invoice
  private usageStore = new Map<string, MeteredUsageRecord>(); // idempotency_key -> record
  private dunningAttemptsStore = new Map<string, number>(); // invoice_id -> failure_count

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
    const currency = (dto.currency ?? 'USD').toUpperCase();
    const now = new Date();

    const periodDays = cycle === 'ANNUAL' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    const trialEndsAt =
      dto.trial_days && dto.trial_days > 0
        ? new Date(now.getTime() + dto.trial_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const sub: TenantSubscription = {
      id: `sub_${randomUUID()}`,
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
    const priceMinor =
      cycle === 'ANNUAL' ? tierDef.annual_price_minor : tierDef.monthly_price_minor;

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
    const sub = this.subscriptionsStore.get(tenant_id);
    if (!sub) {
      // Default to Solo Trader if no explicit subscription exists yet (Rule 14, 15)
      return this.createSubscription({
        tenant_id,
        tier: 'SOLO_TRADER',
        billing_cycle: 'MONTHLY',
      });
    }
    return sub;
  }

  /**
   * Request a plan transition with proration quote
   */
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
    });
  }

  /**
   * Execute plan transition
   */
  async changePlan(
    tenant_id: string,
    targetTier: SubscriptionTier,
    effectiveImmediately = true,
  ): Promise<{
    subscription: TenantSubscription;
    prorationQuote: ProrationQuote;
    invoice: SaaSInvoice | null;
  }> {
    const sub = await this.getSubscription(tenant_id);
    const quote = await this.quotePlanChange(tenant_id, targetTier);

    if (effectiveImmediately) {
      sub.tier = targetTier;
      sub.updated_at = new Date().toISOString();
      this.subscriptionsStore.set(tenant_id, sub);

      let invoice: SaaSInvoice | null = null;
      if (BigInt(quote.net_prorated_amount_minor) > 0n) {
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
