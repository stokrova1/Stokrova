/**
 * STOKROVA plan catalogue: the single description of what each paid plan includes.
 * Built from the website's plan cards (Starter / Growth / Enterprise). The menu, the server lock on
 * every area, the "add staff / branch / till / warehouse" limits and billing all read from here.
 */
import type { SubscriptionTier } from './billing.js';

export type PlanKey = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type PlanLimitKey = 'max_branches' | 'max_active_registers' | 'max_users' | 'max_warehouses';

export interface PlanDefinition {
  key: PlanKey;
  tier: SubscriptionTier;
  name: string;
  rank: number;
  /** null = unlimited */
  limits: Record<PlanLimitKey, number | null>;
}

export const PLAN_CATALOG: Record<PlanKey, PlanDefinition> = {
  STARTER: { key: 'STARTER', tier: 'RETAIL_STARTER', name: 'Starter', rank: 1, limits: { max_branches: 1, max_active_registers: 1, max_users: 3, max_warehouses: 1 } },
  GROWTH: { key: 'GROWTH', tier: 'WHOLESALE_GROWTH', name: 'Growth', rank: 2, limits: { max_branches: 5, max_active_registers: null, max_users: null, max_warehouses: 5 } },
  ENTERPRISE: { key: 'ENTERPRISE', tier: 'ENTERPRISE_LOGISTICS', name: 'Enterprise', rank: 3, limits: { max_branches: null, max_active_registers: null, max_users: null, max_warehouses: null } },
};

/** The plans a business can buy, cheapest first. */
export const OFFERED_TIERS: SubscriptionTier[] = ['RETAIL_STARTER', 'WHOLESALE_GROWTH', 'ENTERPRISE_LOGISTICS'];

/** Billing tier -> plan. Retired tiers behave as the nearest offered plan. */
export function planForTier(tier: SubscriptionTier | string | null | undefined): PlanDefinition {
  switch (tier) {
    case 'WHOLESALE_GROWTH': return PLAN_CATALOG.GROWTH;
    case 'ENTERPRISE_LOGISTICS':
    case 'CUSTOM': return PLAN_CATALOG.ENTERPRISE;
    default: return PLAN_CATALOG.STARTER; // RETAIL_STARTER, retired SOLO_TRADER, unknown
  }
}

/** Workspace page -> the cheapest plan that includes it. Every menu page appears exactly once. */
export const PAGE_PLAN: Record<string, PlanKey> = {
  // Starter: a single shop
  dashboard: 'STARTER', pos: 'STARTER', 'cashier-desk': 'STARTER', registers: 'STARTER', orders: 'STARTER',
  invoices: 'STARTER', catalog: 'STARTER', availability: 'STARTER', ledger: 'STARTER', crm: 'STARTER',
  pricing: 'STARTER', suppliers: 'STARTER', po: 'STARTER', receiving: 'STARTER', org: 'STARTER',
  rbac: 'STARTER', rebranding: 'STARTER', devices: 'STARTER', billing: 'STARTER',
  // Growth: multi-store
  locations: 'GROWTH', dispatch: 'GROWTH', quotes: 'GROWTH', promotions: 'GROWTH', loyalty: 'GROWTH',
  gl: 'GROWTH', accountant: 'GROWTH', tax: 'GROWTH', treasury: 'GROWTH', abc: 'GROWTH', audit: 'GROWTH',
  // Enterprise
  picking: 'ENTERPRISE', fleet: 'ENTERPRISE', bom: 'ENTERPRISE', mo: 'ENTERPRISE', workflows: 'ENTERPRISE',
  integrations: 'ENTERPRISE', consolidation: 'ENTERPRISE', compliance: 'ENTERPRISE',
};

/**
 * Server areas that belong to a paid-up plan, as [path prefix, feature]. Paths are without '/v1'
 * and with '/tenants/<id>' written as '/tenants/:t'. The longest matching prefix wins; anything not
 * listed is part of Starter. Feature ids are page ids, plus a few features that have no page.
 */
export const FEATURE_PLAN: Record<string, PlanKey> = {
  ...PAGE_PLAN,
  lots: 'GROWTH', // batch & expiry (FEFO)
  transfers: 'GROWTH', // inter-store transfers & in transit
  replenishment: 'GROWTH',
  b2b: 'ENTERPRISE',
  edi: 'ENTERPRISE',
  enterprise: 'ENTERPRISE',
};

export const API_FEATURES: Array<[string, string]> = [
  ['/warehouses/locations', 'locations'], ['/warehouses/zones', 'locations'],
  ['/warehouses/pick-lists', 'picking'], ['/warehouses/waves', 'picking'],
  ['/logistics', 'dispatch'], ['/inventory/transfers', 'transfers'], ['/tracking', 'lots'],
  ['/replenishment', 'replenishment'],
  ['/quotations', 'quotes'], ['/crm/campaigns', 'promotions'], ['/customers/groups', 'loyalty'],
  ['/finance', 'gl'], ['/fiscal', 'tax'],
  ['/analytics/dead-stock', 'abc'], ['/analytics/turnover', 'abc'], ['/analytics/abc', 'abc'],
  ['/audit', 'audit'], ['/audit/security', 'compliance'],
  ['/delivery', 'fleet'], ['/insights/delivery', 'fleet'], ['/insights/abc', 'abc'], ['/tenants/:t/manufacturing', 'mo'],
  ['/workflows', 'workflows'], ['/integrations', 'integrations'],
  ['/integrations/holding-groups', 'consolidation'], ['/integrations/inter-company', 'consolidation'],
  ['/edi', 'edi'], ['/b2b', 'b2b'], ['/enterprise', 'enterprise'],
];

/** The feature a server path belongs to, or null when it is part of every plan. */
export function featureForPath(rawPath: string): string | null {
  let p = rawPath.split('?')[0] ?? '';
  p = p.replace(/^\/v1(?=\/|$)/, '').replace(/^\/tenants\/[^/]+/, '/tenants/:t');
  let best: [string, string] | null = null;
  for (const rule of API_FEATURES) {
    const [prefix] = rule;
    if ((p === prefix || p.startsWith(prefix + '/')) && (!best || prefix.length > best[0].length)) best = rule;
  }
  return best ? best[1] : null;
}

export interface PlanGrants {
  /** Extra features/pages the founder switched on for this business. */
  features?: string[];
  /** Limits the founder raised for this business (null = unlimited). */
  limits?: Partial<Record<PlanLimitKey, number | null>>;
}

export function planIncludes(plan: PlanDefinition, feature: string, grants?: PlanGrants | null): boolean {
  if (grants?.features?.includes(feature)) return true;
  const needed = FEATURE_PLAN[feature];
  return !needed || PLAN_CATALOG[needed].rank <= plan.rank;
}

export function effectiveLimits(plan: PlanDefinition, grants?: PlanGrants | null): Record<PlanLimitKey, number | null> {
  const out = { ...plan.limits };
  for (const [k, v] of Object.entries(grants?.limits ?? {})) {
    if (k in out && (v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0))) out[k as PlanLimitKey] = v as number | null;
  }
  return out;
}

export function pagesFor(plan: PlanDefinition, grants?: PlanGrants | null): string[] {
  return Object.keys(PAGE_PLAN).filter((page) => planIncludes(plan, page, grants));
}

/** The cheapest plan that includes a feature (for "upgrade to …" messages). */
export function requiredPlanFor(feature: string): PlanDefinition {
  return PLAN_CATALOG[FEATURE_PLAN[feature] ?? 'STARTER'];
}

/** Whether one more of `limit` may be added given current usage. */
export function canAdd(limit: number | null, used: number): boolean {
  return limit === null || used < limit;
}

/** Things a business must remove before it fits a smaller plan; empty when it fits. */
export function downgradeBlockers(target: PlanDefinition, usage: Partial<Record<PlanLimitKey, number>>, grants?: PlanGrants | null): string[] {
  const limits = effectiveLimits(target, grants);
  const label: Record<PlanLimitKey, string> = { max_branches: 'branches', max_active_registers: 'tills', max_users: 'staff', max_warehouses: 'warehouses' };
  const out: string[] = [];
  for (const k of Object.keys(limits) as PlanLimitKey[]) {
    const lim = limits[k];
    const used = usage[k] ?? 0;
    if (lim !== null && used > lim) out.push(`remove or deactivate ${used - lim} ${label[k]} (the ${target.name} plan allows ${lim})`);
  }
  return out;
}
