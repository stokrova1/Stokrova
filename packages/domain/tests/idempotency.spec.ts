import { describe, it, expect } from 'vitest';
import {
  canonicalizeJson,
  computePayloadHash,
  canTransitionIdempotencyStatus,
} from '../src/idempotency.js';

describe('Idempotency Domain Logic (Section 13)', () => {
  it('canonicalizes JSON objects with sorted keys regardless of initial key ordering', () => {
    const objA = { b: 2, a: 1, c: { y: 'two', x: 'one' } };
    const objB = { a: 1, c: { x: 'one', y: 'two' }, b: 2 };

    expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
    expect(computePayloadHash(objA)).toBe(computePayloadHash(objB));
  });

  it('generates different hashes for different payloads', () => {
    const hash1 = computePayloadHash({ amount: 100 });
    const hash2 = computePayloadHash({ amount: 200 });

    expect(hash1).not.toBe(hash2);
  });

  it('validates idempotency status transition lifecycle', () => {
    expect(canTransitionIdempotencyStatus('PENDING', 'RESOLVED')).toBe(true);
    expect(canTransitionIdempotencyStatus('PENDING', 'REJECTED')).toBe(true);
    expect(canTransitionIdempotencyStatus('RESOLVED', 'PENDING')).toBe(false);
    expect(canTransitionIdempotencyStatus('RESOLVED', 'RESOLVED')).toBe(true);
    expect(canTransitionIdempotencyStatus('REJECTED', 'RESOLVED')).toBe(false);
  });
});
