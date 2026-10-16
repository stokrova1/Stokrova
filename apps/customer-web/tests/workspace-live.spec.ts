import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
// @ts-ignore plain browser module
import { PAGE_SOURCES, CREATE_FORMS, formBody, toRows, renderRows } from '../workspace-live.js';

const apiSrc = join(__dirname, '../../api/src');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const routes = new Set<string>();
const posts = new Set<string>();
for (const f of walk(apiSrc).filter((f) => f.endsWith('.controller.ts'))) {
  const s = readFileSync(f, 'utf8');
  const cm = s.match(/@Controller\(\s*(?:'([^']*)')?\s*\)/); const c = cm ? (cm[1] ?? '') : undefined;
  if (c === undefined) continue;
  for (const m of s.matchAll(/@Post\(\s*(?:'([^']*)')?\s*\)/g)) posts.add(('/' + [c, m[1]].filter(Boolean).join('/')).replace(':tenantId', '{tenant}').replace(/:\w+/g, (x) => (x === ':id' ? x : ':id')));
  for (const m of s.matchAll(/@Get\(\s*(?:'([^']*)')?\s*\)/g)) routes.add(('/' + [c, m[1]].filter(Boolean).join('/')).replace(':tenantId', '{tenant}'));
}

describe('owner workspace live pages', () => {
  it('every page loads from a server address that really exists', () => {
    const missing = Object.values(PAGE_SOURCES).flat().map(([, p]: any) => p).filter((p: string) => !routes.has(p));
    expect(missing).toEqual([]);
  });
  it('every add form saves to a server address that really exists', () => {
    const targets = Object.entries(CREATE_FORMS).flatMap(([p, f]: any) => [].concat(f).map((x: any) => (x.post || p).replace('{id}', ':id')));
    expect(targets.filter((p) => !posts.has(p))).toEqual([]);
  });
  it('refuses to save when a required box is blank and never invents values', () => {
    expect(formBody(CREATE_FORMS['/customers'], { customer_code: 'C1', display_name: ' ' }).error).toBeTruthy();
    expect(formBody(CREATE_FORMS['/customers'], { customer_code: 'C1', display_name: 'Ada', email: '' }).body).toEqual({ customer_code: 'C1', display_name: 'Ada' });
  });
  it('every dropdown in a form lists records from a server address that really exists', () => {
    const picks = Object.values(CREATE_FORMS).flatMap((f: any) => [].concat(f)).flatMap((f: any) => [...f.fields.map((x: any) => x[3]), f.lines ? 'pick:/catalog/variants' : null]);
    expect(picks.filter((k: any) => typeof k === 'string' && k.startsWith('pick:') && !routes.has(k.slice(5)))).toEqual([]);
  });
  it('order lines turn 12.50 into 1250 minor units and need at least one line', () => {
    const f = CREATE_FORMS['/orders'];
    const ok = formBody(f, { branch_id: 'b1', warehouse_id: 'w1', lines: [{ variant_id: 'v1', quantity: '2', price: '12.50' }] });
    expect(ok.body).toEqual({ channel_type: 'MANUAL', branch_id: 'b1', warehouse_id: 'w1', lines: [{ variant_id: 'v1', quantity: 2, unit_price_minor: '1250' }] });
    expect(formBody(f, { branch_id: 'b1', warehouse_id: 'w1', lines: [] }).error).toBeTruthy();
    expect(formBody(f, { branch_id: 'b1', warehouse_id: 'w1', lines: [{ variant_id: 'v1', quantity: '1.5', price: '3' }] }).error).toBeTruthy();
  });
  it('a refund with a blank amount refunds in full (no amount is sent)', () => {
    const refund = CREATE_FORMS['/payments'][1];
    expect(formBody(refund, { id: 'pay_1', amount_minor: '' }).body).toEqual({ id: 'pay_1' });
  });
  it('shows an honest empty state instead of sample data when a company has no records', () => {
    expect(renderRows(toRows({ data: [] }))).toContain('No records yet');
  });
});
