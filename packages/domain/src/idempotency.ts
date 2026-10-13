export type DomainIdempotencyStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';

/**
 * Normalizes an arbitrary JSON-serializable object into a deterministic canonical string.
 * Recursively sorts keys so identical objects produce identical hashes.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalizeJson(v)}`)
    .join(',')}}`;
}

/**
 * Computes a fast deterministic hash of a request payload.
 * Uses a 32-bit FNV-1a hash algorithm formatted as hex, requiring zero external dependencies.
 */
export function computePayloadHash(payload: unknown): string {
  const canonical = canonicalizeJson(payload);
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Verifies valid state transitions for an idempotency record.
 */
export function canTransitionIdempotencyStatus(
  current: DomainIdempotencyStatus,
  target: DomainIdempotencyStatus,
): boolean {
  if (current === target) return true;
  if (current === 'PENDING' && (target === 'RESOLVED' || target === 'REJECTED')) {
    return true;
  }
  // Once RESOLVED or REJECTED, an idempotency record is terminal
  return false;
}
