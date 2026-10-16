import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import {
  PLAN_CATALOG,
  OFFERED_TIERS,
  planForTier,
  planIncludes,
  effectiveLimits,
  pagesFor,
  requiredPlanFor,
  canAdd,
  downgradeBlockers,
  type PlanLimitKey,
  type PlanGrants,
} from '@stokrova/domain';
import { BillingService } from './billing.service.js';

export type UsageCounter = (tenantId: string) => Promise<number>;

const LIMIT_LABEL: Record<PlanLimitKey, string> = {
  max_branches: 'branches',
  max_active_registers: 'tills',
  max_users: 'staff members',
  max_warehouses: 'warehouses',
};

/**
 * What a business's plan lets it see and do: pages, features, hard limits and live usage.
 * Areas register a usage counter (branches, tills, staff, warehouses) so billing never imports them.
 */
@Injectable()
export class PlanEntitlementsService {
  private readonly counters = new Map<PlanLimitKey, UsageCounter>();

  constructor(@Optional() private readonly billing: BillingService = new BillingService()) {}

  registerCounter(limit: PlanLimitKey, counter: UsageCounter): void {
    this.counters.set(limit, counter);
  }

  private async planOf(tenantId: string) {
    const sub = await this.billing.getSubscription(tenantId);
    return { sub, plan: planForTier(sub.tier), grants: (sub.plan_grants ?? null) as PlanGrants | null };
  }

  async usage(tenantId: string): Promise<Partial<Record<PlanLimitKey, number>>> {
    const out: Partial<Record<PlanLimitKey, number>> = {};
    await Promise.all([...this.counters].map(async ([k, fn]) => { out[k] = await fn(tenantId).catch(() => 0); }));
    return out;
  }

  async entitlements(tenantId: string) {
    const { sub, plan, grants } = await this.planOf(tenantId);
    const limits = effectiveLimits(plan, grants);
    const usage = await this.usage(tenantId);
    return {
      tier: sub.tier,
      plan: plan.key,
      plan_name: plan.name,
      status: sub.status,
      trial_ends_at: sub.trial_ends_at,
      pages: pagesFor(plan, grants),
      limits,
      usage,
      grants: grants ?? { features: [], limits: {} },
      upgrades: Object.values(PLAN_CATALOG).filter((p) => p.rank > plan.rank).map((p) => ({ plan: p.key, tier: p.tier, name: p.name })),
      offered_tiers: OFFERED_TIERS,
    };
  }

  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const { plan, grants } = await this.planOf(tenantId);
    return planIncludes(plan, feature, grants);
  }

  /** Throws 403 PLAN_FEATURE_LOCKED when the business's plan does not include a feature. */
  async assertFeature(tenantId: string, feature: string): Promise<void> {
    if (await this.hasFeature(tenantId, feature)) return;
    const needed = requiredPlanFor(feature);
    throw new ForbiddenException({
      error: {
        code: 'PLAN_FEATURE_LOCKED',
        required_plan: needed.key,
        message: `This is part of the ${needed.name} plan. Upgrade in Plan & Billing to use it.`,
      },
    });
  }

  /** Throws 403 PLAN_LIMIT_REACHED when adding one more would go over the plan's limit. */
  async assertCanAdd(tenantId: string, limit: PlanLimitKey, currentUsage?: number): Promise<void> {
    const { plan, grants } = await this.planOf(tenantId);
    const max = effectiveLimits(plan, grants)[limit];
    if (max === null) return;
    const used = currentUsage ?? (await this.counters.get(limit)?.(tenantId)) ?? 0;
    if (canAdd(max, used)) return;
    const next = Object.values(PLAN_CATALOG).find((p) => p.rank > plan.rank);
    throw new ForbiddenException({
      error: {
        code: 'PLAN_LIMIT_REACHED',
        limit,
        allowed: max,
        used,
        required_plan: next?.key ?? null,
        message: `Your ${plan.name} plan allows ${max} ${LIMIT_LABEL[limit]}. ${next ? `Upgrade to ${next.name} in Plan & Billing to add more.` : ''}`.trim(),
      },
    });
  }

  /** Things to remove before moving to a smaller plan; empty when the business fits. */
  async downgradeBlockers(tenantId: string, targetTier: string): Promise<string[]> {
    const { plan, grants } = await this.planOf(tenantId);
    const target = planForTier(targetTier);
    if (target.rank >= plan.rank) return [];
    return downgradeBlockers(target, await this.usage(tenantId), grants);
  }
}
