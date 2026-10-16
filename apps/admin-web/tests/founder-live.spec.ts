import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const live = readFileSync(join(__dirname, '..', 'founder-live.js'), 'utf8');
const controller = readFileSync(join(__dirname, '..', '..', 'api', 'src', 'platform-admin', 'platform-admin.controller.ts'), 'utf8');

describe('Founder console live panels', () => {
  it('only calls platform-admin addresses that exist on the server', () => {
    for (const route of ["'users'", "'users/:id/suspend'", "'users/:id/reactivate'", "'businesses'", "'businesses/:id/tier'", "'health'", "'audit'", "'plans'"]) {
      expect(controller).toContain(route);
    }
  });
  it('takes its plan list and prices from the server and can save a price', () => {
    expect(live).toContain("api('/plans')");
    expect(live).toContain("method: 'PATCH', body: JSON.stringify({ monthly_price_minor: m, annual_price_minor: a })");
    expect(controller).toContain("@Patch('plans/:tier')");
  });
  it('never calls the server without the signed-in founder pass', () => {
    expect(live).toMatch(/if \(!t\) return \{ signedOut: true \}/);
  });
});
