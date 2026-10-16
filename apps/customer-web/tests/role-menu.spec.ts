import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
// @ts-ignore plain browser module
import { PAGE_PERMISSIONS, PAGE_SOURCES, visiblePages } from '../workspace-live.js';
import { StandardPermissions, SystemRoleTemplates } from '@stokrova/domain';

const codes = new Set(Object.values(StandardPermissions) as string[]);
const apiSrc = join(__dirname, '../../api/src');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const getPerm = new Map<string, string>();
for (const f of walk(apiSrc).filter((f) => f.endsWith('.controller.ts'))) {
  const s = readFileSync(f, 'utf8');
  const cm = s.match(/@Controller\(\s*(?:'([^']*)')?\s*\)/); const c = cm ? (cm[1] ?? '') : undefined;
  if (c === undefined) continue;
  const cls = s.split('export class')[0].match(/@RequirePermission\(StandardPermissions\.(\w+)/)?.[1];
  for (const m of s.matchAll(/@Get\(\s*(?:'([^']*)')?\s*\)([\s\S]*?)\n\s+(?:async\s+)?[a-zA-Z]\w*\s*\(/g)) {
    const name = m[2].match(/@RequirePermission\(\s*StandardPermissions\.(\w+)/)?.[1] || cls;
    if (name) getPerm.set(('/' + [c, m[1]].filter(Boolean).join('/')).replace(':tenantId', '{tenant}'), (StandardPermissions as any)[name]);
  }
}
const sees = (role: keyof typeof SystemRoleTemplates) => visiblePages(SystemRoleTemplates[role].permissions);

describe('role-based workspace menu', () => {
  it('only uses permission codes that really exist', () => {
    expect(Object.values(PAGE_PERMISSIONS).flat().filter((c: any) => !codes.has(c))).toEqual([]);
  });
  it('a page is shown only to roles that can load at least one of its record lists', () => {
    const bad = Object.entries(PAGE_SOURCES).filter(([id, secs]: any) => {
      const need = secs.map(([, p]: any) => getPerm.get(p)).filter(Boolean);
      return need.length && !need.some((c: string) => PAGE_PERMISSIONS[id]?.includes(c));
    }).map(([id]) => id);
    expect(bad).toEqual([]);
  });
  it('cashiers see the till but not the general ledger or staff roles', () => {
    expect(sees('CASHIER')).toContain('pos');
    expect(sees('CASHIER')).not.toContain('gl');
    expect(sees('CASHIER')).not.toContain('rbac');
  });
  it('business owners see every page', () => {
    expect(sees('BUSINESS_OWNER').length).toBe(Object.keys(PAGE_PERMISSIONS).length);
  });
});

describe('Plan & Billing page', () => {
  it('shows only to staff who can manage billing', () => {
    expect(visiblePages(['billing.manage'])).toContain('billing');
    expect(visiblePages(['register.open', 'pos.checkout'])).not.toContain('billing');
  });
});
