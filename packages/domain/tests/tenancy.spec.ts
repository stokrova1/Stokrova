import { describe, it, expect } from 'vitest';
import { sanitizeSlug, canTransitionTenantStatus, assertTenantMatches } from '../src/tenancy.js';

describe('Tenancy Invariants', () => {
  it('sanitizes business names into valid URL slugs', () => {
    expect(sanitizeSlug('ABC Trading Ltd.')).toBe('abc-trading-ltd');
    expect(sanitizeSlug('   Musa & Sons Electronics!  ')).toBe('musa-sons-electronics');
    expect(sanitizeSlug('--leading-trailing--')).toBe('leading-trailing');
  });

  it('permits valid tenant status transitions', () => {
    expect(canTransitionTenantStatus('ACTIVE', 'SUSPENDED')).toBe(true);
    expect(canTransitionTenantStatus('SUSPENDED', 'ACTIVE')).toBe(true);
    expect(canTransitionTenantStatus('ACTIVE', 'ARCHIVED')).toBe(true);
    expect(canTransitionTenantStatus('SUSPENDED', 'ARCHIVED')).toBe(true);
  });

  it('prohibits transitioning out of ARCHIVED terminal status', () => {
    expect(canTransitionTenantStatus('ARCHIVED', 'ACTIVE')).toBe(false);
    expect(canTransitionTenantStatus('ARCHIVED', 'SUSPENDED')).toBe(false);
  });

  it('allows access when actor and entity tenant match', () => {
    expect(() => assertTenantMatches('tenant-1', 'tenant-1')).not.toThrow();
  });

  it('throws an error on cross-tenant access violation', () => {
    expect(() => assertTenantMatches('tenant-1', 'tenant-2')).toThrowError(
      /Cross-tenant access violation/,
    );
  });
});
