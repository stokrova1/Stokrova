import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { SubscriptionTier } from '@stokrova/contracts';
import { TIER_ENTITLEMENT_DEFINITIONS, OFFERED_TIERS } from '@stokrova/domain';
import { DATABASE_POOL } from '../infrastructure/database/database.tokens.js';

export interface PlanPrice {
  tier: SubscriptionTier;
  name: string;
  monthly_price_minor: string;
  annual_price_minor: string;
  currency: string;
  updated_at: string | null;
  updated_by: string | null;
}

const MINOR = /^\d{1,12}$/;

/**
 * Single source of truth for what each plan costs. The founder sets prices in
 * platform_plan_prices; billing, the public plans list and the website all read from here,
 * so a change applies to the next invoice everywhere. Code defaults apply only until a price is saved.
 */
@Injectable()
export class PlanPricingService {
  private readonly logger = new Logger(PlanPricingService.name);
  private readonly overrides = new Map<string, PlanPrice>();

  constructor(@Optional() @Inject(DATABASE_POOL) private readonly pool?: any) {}

  /** Runs one statement as the platform (bypasses tenant isolation, like the founder console). */
  private async run(sql: string, params: unknown[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.is_platform_admin', 'true', true)");
      const res = await client.query(sql, params);
      await client.query('COMMIT');
      return res;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  static isTier(value: unknown): value is SubscriptionTier {
    // Only the plans that are sold (Starter, Growth, Enterprise); retired tiers are not selectable.
    return typeof value === 'string' && (OFFERED_TIERS as string[]).includes(value);
  }

  private defaults(tier: SubscriptionTier): PlanPrice {
    const d = TIER_ENTITLEMENT_DEFINITIONS[tier];
    return {
      tier,
      name: d.name,
      monthly_price_minor: d.monthly_price_minor,
      annual_price_minor: d.annual_price_minor,
      currency: 'NGN',
      updated_at: null,
      updated_by: null,
    };
  }

  private async refresh(): Promise<void> {
    if (!this.pool || typeof this.pool.connect !== 'function') return;
    try {
      const res = await this.run(
        'SELECT tier, name, monthly_price_minor, annual_price_minor, currency, updated_at, updated_by FROM public.platform_plan_prices',
      );
      for (const r of res.rows ?? []) {
        if (!PlanPricingService.isTier(r.tier)) continue;
        this.overrides.set(r.tier, {
          tier: r.tier,
          name: r.name,
          monthly_price_minor: String(r.monthly_price_minor),
          annual_price_minor: String(r.annual_price_minor),
          currency: r.currency,
          updated_at: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at ?? null,
          updated_by: r.updated_by ?? null,
        });
      }
    } catch (err) {
      this.logger.warn(`Plan prices could not be read; using last known prices. ${(err as Error).message}`);
    }
  }

  async list(): Promise<PlanPrice[]> {
    await this.refresh();
    return OFFERED_TIERS.map(
      (t) => this.overrides.get(t) ?? this.defaults(t),
    );
  }

  async get(tier: SubscriptionTier): Promise<PlanPrice> {
    await this.refresh();
    return this.overrides.get(tier) ?? this.defaults(tier);
  }

  async setPrice(
    tier: string,
    input: { monthly_price_minor?: unknown; annual_price_minor?: unknown },
    actorId: string,
  ): Promise<PlanPrice> {
    if (!PlanPricingService.isTier(tier)) throw new NotFoundException(`Unknown plan '${tier}'.`);
    const current = await this.get(tier);
    const monthly = input.monthly_price_minor === undefined ? current.monthly_price_minor : String(input.monthly_price_minor);
    const annual = input.annual_price_minor === undefined ? current.annual_price_minor : String(input.annual_price_minor);
    if (!MINOR.test(monthly) || !MINOR.test(annual)) {
      throw new BadRequestException('Prices must be whole numbers of cents (minor units), zero or more.');
    }
    const next: PlanPrice = { ...current, monthly_price_minor: monthly, annual_price_minor: annual, updated_at: new Date().toISOString(), updated_by: actorId };

    if (this.pool && typeof this.pool.connect === 'function') {
      await this.run(
        `INSERT INTO public.platform_plan_prices (tier, name, monthly_price_minor, annual_price_minor, currency, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (tier) DO UPDATE SET monthly_price_minor = EXCLUDED.monthly_price_minor,
           annual_price_minor = EXCLUDED.annual_price_minor, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [tier, next.name, monthly, annual, next.currency, actorId],
      );
    }
    this.overrides.set(tier, next);
    return next;
  }

  /** The plan saved on the business itself (tenants.subscription_tier), if a database is connected. */
  async tenantTier(tenantId: string): Promise<SubscriptionTier | null> {
    if (!this.pool || typeof this.pool.connect !== 'function') return null;
    try {
      const res = await this.run('SELECT subscription_tier FROM public.tenants WHERE id = $1', [tenantId]);
      const t = res.rows?.[0]?.subscription_tier;
      return PlanPricingService.isTier(t) ? t : null;
    } catch {
      return null;
    }
  }

  /** Active businesses that have no plan subscription yet (e.g. just signed up). */
  async tenantsWithoutSubscription(): Promise<string[]> {
    if (!this.pool || typeof this.pool.connect !== 'function') return [];
    try {
      const res = await this.run(
        `SELECT t.id FROM public.tenants t LEFT JOIN public.tenant_subscriptions s ON s.tenant_id = t.id
         WHERE s.id IS NULL AND t.status = 'ACTIVE' AND t.id != 'ten_platform_root'`,
      );
      return (res.rows ?? []).map((r: any) => String(r.id));
    } catch {
      return [];
    }
  }

  async saveTenantTier(tenantId: string, tier: SubscriptionTier): Promise<void> {
    if (!this.pool || typeof this.pool.connect !== 'function') return;
    await this.run('UPDATE public.tenants SET subscription_tier = $2, updated_at = NOW() WHERE id = $1', [tenantId, tier]);
  }
}
