import { describe, it, expect } from 'vitest';
// @ts-ignore plain JS module
import { PAGE_PERMISSIONS, menuPages, visiblePages, usageLine } from '../workspace-live.js';
import { PAGE_PLAN, PLAN_CATALOG, pagesFor } from '../../../packages/domain/src/plan-catalog.js';

describe('workspace menu respects the plan', () => {
  it('every menu page belongs to exactly one plan', () => {
    expect(Object.keys(PAGE_PERMISSIONS).sort()).toEqual(Object.keys(PAGE_PLAN).sort());
  });
  it('a Starter owner sees no Growth or Enterprise pages', () => {
    const pages = menuPages(visiblePages(['*']), pagesFor(PLAN_CATALOG.STARTER));
    for (const p of ['mo', 'bom', 'workflows', 'integrations', 'gl', 'quotes', 'picking']) expect(pages).not.toContain(p);
    expect(pages).toContain('pos');
  });
  it('the plan never adds pages the role cannot open', () => {
    expect(menuPages(['pos'], pagesFor(PLAN_CATALOG.ENTERPRISE))).toEqual(['pos']);
  });
  it('usage reads "Staff 2 of 3" and unlimited', () => {
    expect(usageLine('max_users', 2, 3)).toBe('Staff: 2 of 3');
    expect(usageLine('max_users', 9, null)).toBe('Staff: 9 of unlimited');
  });
});
