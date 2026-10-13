/**
 * Tenancy Domain Rules & Invariants
 * Based on ARCHITECTURE.md (Rule 11: Multi-tenancy) and SECURITY.md
 */

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

/**
 * Sanitizes an arbitrary business name into a compliant lowercase URL slug.
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validates permitted tenant lifecycle transitions.
 * Invariant: ARCHIVED is terminal; SUSPENDED can be reactivated.
 */
export function canTransitionTenantStatus(
  current: TenantStatus,
  target: TenantStatus,
): boolean {
  if (current === target) return true;
  if (current === 'ARCHIVED') return false; // Terminal state
  if (current === 'ACTIVE' && (target === 'SUSPENDED' || target === 'ARCHIVED')) {
    return true;
  }
  if (current === 'SUSPENDED' && (target === 'ACTIVE' || target === 'ARCHIVED')) {
    return true;
  }
  return false;
}

/**
 * Enforces cross-tenant isolation invariant.
 * Rule: Actors can NEVER access or mutate entities from another tenant.
 */
export function assertTenantMatches(
  actorTenantId: string,
  entityTenantId: string,
): void {
  if (actorTenantId !== entityTenantId) {
    throw new Error(
      `Cross-tenant access violation: Actor from tenant '${actorTenantId}' attempted access to entity owned by '${entityTenantId}'`,
    );
  }
}
