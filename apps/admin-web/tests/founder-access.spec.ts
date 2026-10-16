import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '..', 'build-static.mjs'), 'utf8');
const line = src.split('\n').find((l) => l.includes('const isFounderAccount ='))!;
const isFounderAccount = new Function(`${line.trim()} return isFounderAccount;`)() as (u: unknown) => boolean;

describe('Founder console access', () => {
  it('opens only for accounts the server marks as platform admin', () => {
    expect(isFounderAccount({ email: 'x@y.com', app_metadata: { is_platform_admin: true } })).toBe(true);
  });
  it('does not open for the founder email alone', () => {
    expect(isFounderAccount({ email: 'stokrova1@gmail.com', app_metadata: {} })).toBe(false);
  });
  it('does not open for a self-edited profile role', () => {
    expect(isFounderAccount({ email: 'a@b.com', app_metadata: {}, user_metadata: { role: 'PLATFORM_SUPER_ADMIN' } })).toBe(false);
  });
  it('has no offline password shortcut', () => {
    expect(src).not.toMatch(/password\.length\s*>=\s*6/);
  });
});
