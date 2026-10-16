import { describe, it, expect } from 'vitest';
import { PLAN_CATALOG, PAGE_PLAN, planForTier, planIncludes, pagesFor, featureForPath, canAdd, effectiveLimits, downgradeBlockers, API_FEATURES, FEATURE_PLAN } from '../src/plan-catalog.js';

const S = PLAN_CATALOG.STARTER, G = PLAN_CATALOG.GROWTH, E = PLAN_CATALOG.ENTERPRISE;

describe('plan catalogue (website plan cards)', () => {
  it('Starter: 1 branch, 1 till, 3 staff, 1 warehouse', () => {
    expect(S.limits).toEqual({ max_branches: 1, max_active_registers: 1, max_users: 3, max_warehouses: 1 });
  });
  it('Growth: 5 branches, unlimited staff and tills', () => {
    expect(G.limits.max_branches).toBe(5);
    expect(G.limits.max_users).toBeNull();
    expect(G.limits.max_active_registers).toBeNull();
  });
  it('Enterprise has no limits', () => {
    expect(Object.values(E.limits).every((v) => v === null)).toBe(true);
  });
  it('Starter cannot add a 4th staff member, a 2nd branch or a 2nd till', () => {
    expect(canAdd(S.limits.max_users, 3)).toBe(false);
    expect(canAdd(S.limits.max_users, 2)).toBe(true);
    expect(canAdd(S.limits.max_branches, 1)).toBe(false);
    expect(canAdd(S.limits.max_active_registers, 1)).toBe(false);
  });
  it('Growth can add a 5th branch but not a 6th', () => {
    expect(canAdd(G.limits.max_branches, 4)).toBe(true);
    expect(canAdd(G.limits.max_branches, 5)).toBe(false);
    expect(canAdd(G.limits.max_users, 10_000)).toBe(true);
  });
  it('Starter menu has no Growth or Enterprise pages', () => {
    const pages = pagesFor(S);
    for (const p of ['manufacturing', 'mo', 'bom', 'workflows', 'integrations', 'gl', 'quotes', 'locations']) expect(pages).not.toContain(p);
    expect(pages).toContain('pos');
  });
  it('Growth unlocks accounting but not manufacturing; Enterprise unlocks everything', () => {
    expect(planIncludes(G, 'gl')).toBe(true);
    expect(planIncludes(G, 'mo')).toBe(false);
    expect(pagesFor(E)).toEqual(Object.keys(PAGE_PLAN));
  });
  it('server areas: Starter is locked out of manufacturing and workflows', () => {
    expect(featureForPath('/v1/tenants/ten_1/manufacturing/orders')).toBe('mo');
    expect(featureForPath('/v1/workflows/tasks/queue')).toBe('workflows');
    expect(planIncludes(S, featureForPath('/v1/workflows')!)).toBe(false);
    expect(featureForPath('/v1/audit/security')).toBe('compliance');
    expect(featureForPath('/v1/orders')).toBeNull();
    expect(featureForPath('/v1/analytics/executive/snapshot')).toBeNull();
  });
  it('every locked server area belongs to a known plan feature', () => {
    for (const [, f] of API_FEATURES) expect(FEATURE_PLAN[f]).toBeDefined();
  });
  it('founder grants raise limits and add features', () => {
    expect(effectiveLimits(S, { limits: { max_users: 5 } }).max_users).toBe(5);
    expect(planIncludes(S, 'workflows', { features: ['workflows'] })).toBe(true);
  });
  it('downgrade is blocked when over the smaller plan', () => {
    expect(downgradeBlockers(S, { max_users: 5, max_branches: 1 })).toHaveLength(1);
    expect(downgradeBlockers(S, { max_users: 3, max_branches: 1 })).toEqual([]);
  });
  it('retired tiers behave as sold plans', () => {
    expect(planForTier('SOLO_TRADER').key).toBe('STARTER');
    expect(planForTier('CUSTOM').key).toBe('ENTERPRISE');
  });
});
