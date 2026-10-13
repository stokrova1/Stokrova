import { describe, it, expect } from 'vitest';
import {
  canTransitionOutbox,
  assertValidOutboxTransition,
  calculateNextRetryDelay,
  evaluateInboxDeduplication,
  generateNextSequence,
  validateCursorAdvancement,
  isAppendOnlyCommand,
  resolveConflictPolicy,
  compareVectorClocks,
  mergeVectorClocks,
  incrementVectorClock,
  resolveMasterEntityConflict,
  detectSequenceGaps,
} from '../src/sync.js';
import {
  generateUuidV7,
  isValidUuidV7,
  extractTimestampFromUuidV7,
} from '../src/uuid.js';

describe('Sync Domain Engine', () => {
  describe('Outbox State Machine', () => {
    it('allows valid state transitions', () => {
      expect(canTransitionOutbox('PENDING', 'SENDING')).toBe(true);
      expect(canTransitionOutbox('SENDING', 'ACKED')).toBe(true);
      expect(canTransitionOutbox('SENDING', 'FAILED_RETRYABLE')).toBe(true);
      expect(canTransitionOutbox('SENDING', 'FAILED_PERMANENT')).toBe(true);
      expect(canTransitionOutbox('SENDING', 'CONFLICT')).toBe(true);
      expect(canTransitionOutbox('FAILED_RETRYABLE', 'SENDING')).toBe(true);
      expect(canTransitionOutbox('FAILED_RETRYABLE', 'FAILED_PERMANENT')).toBe(true);
      expect(canTransitionOutbox('PENDING', 'PENDING')).toBe(true);
    });

    it('rejects invalid state transitions', () => {
      expect(canTransitionOutbox('ACKED', 'PENDING')).toBe(false);
      expect(canTransitionOutbox('ACKED', 'SENDING')).toBe(false);
      expect(canTransitionOutbox('FAILED_PERMANENT', 'SENDING')).toBe(false);
      expect(canTransitionOutbox('PENDING', 'ACKED')).toBe(false);

      expect(() => assertValidOutboxTransition('ACKED', 'PENDING')).toThrowError(
        /Invalid outbox operation transition/,
      );
    });
  });

  describe('Exponential Backoff Calculation', () => {
    it('calculates bounded delays with exponential increase', () => {
      const delay0 = calculateNextRetryDelay(0, 1000, 60000, 0);
      const delay1 = calculateNextRetryDelay(1, 1000, 60000, 0);
      const delay2 = calculateNextRetryDelay(2, 1000, 60000, 0);
      const delayMax = calculateNextRetryDelay(10, 1000, 60000, 0);

      expect(delay0).toBe(1000);
      expect(delay1).toBe(2000);
      expect(delay2).toBe(4000);
      expect(delayMax).toBe(60000); // capped at maxDelayMs
    });

    it('disallows negative attempt count', () => {
      expect(() => calculateNextRetryDelay(-1)).toThrowError(/negative/);
    });
  });

  describe('Inbox Deduplication', () => {
    it('evaluates non-duplicate operation as eligible for execution', () => {
      const result = evaluateInboxDeduplication('op_1001', null);
      expect(result.isDuplicate).toBe(false);
      expect(result.statusToProcess).toBe('PENDING');
      expect(result.cachedResult).toBeUndefined();
    });

    it('identifies duplicate operation and provides cached response', () => {
      const cached = {
        status: 'APPLIED' as const,
        server_sequence: 1842,
      };
      const result = evaluateInboxDeduplication('op_1001', cached);
      expect(result.isDuplicate).toBe(true);
      expect(result.statusToProcess).toBe('ALREADY_APPLIED');
      expect(result.cachedResult?.server_sequence).toBe(1842);
    });

    it('requires a non-empty operation_id', () => {
      expect(() => evaluateInboxDeduplication('', null)).toThrowError(/required/);
    });
  });

  describe('Monotonic Sequence Generation & Cursor Advancement', () => {
    it('increments sequence strictly monotonically', () => {
      expect(generateNextSequence(0)).toBe(1);
      expect(generateNextSequence(100)).toBe(101);
      expect(generateNextSequence(999)).toBe(1000);
    });

    it('validates pull cursor bounds', () => {
      expect(validateCursorAdvancement(50, 0)).toBe(true);
      expect(validateCursorAdvancement(50, 25)).toBe(true);
      expect(validateCursorAdvancement(50, 50)).toBe(true);
      expect(validateCursorAdvancement(50, 51)).toBe(false); // cannot ask for cursor ahead of server
      expect(validateCursorAdvancement(50, -1)).toBe(false); // negative invalid
    });
  });

  describe('Conflict Resolution Policy', () => {
    it('recognizes append-only ledger commands', () => {
      expect(isAppendOnlyCommand('sales.create')).toBe(true);
      expect(isAppendOnlyCommand('payments.record')).toBe(true);
      expect(isAppendOnlyCommand('inventory.movement')).toBe(true);
      expect(isAppendOnlyCommand('receipt.print')).toBe(true);
      expect(isAppendOnlyCommand('catalog.product.update')).toBe(false);
    });

    it('applies IMMUTABLE_APPEND policy to ledger commands', () => {
      expect(resolveConflictPolicy('sales.create', true)).toBe('IMMUTABLE_APPEND');
      expect(resolveConflictPolicy('payments.record', true)).toBe('IMMUTABLE_APPEND');
      expect(resolveConflictPolicy('inventory.movement', true)).toBe('IMMUTABLE_APPEND');
    });

    it('applies SERVER_WINS policy when server is ahead on master data', () => {
      expect(resolveConflictPolicy('catalog.product.update', true)).toBe('SERVER_WINS');
      expect(resolveConflictPolicy('catalog.product.update', false)).toBe('CLIENT_WINS');
    });

    it('routes high-risk or arbitrary updates to exception workflow', () => {
      expect(resolveConflictPolicy('pricing.approval.override', false)).toBe('EXCEPTION_WORKFLOW');
    });
  });

  describe('RFC 9562 UUIDv7 Generator & Validator', () => {
    it('generates valid UUIDv7 strings conforming to RFC 9562', () => {
      const id = generateUuidV7();
      expect(isValidUuidV7(id)).toBe(true);
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates monotonic time-ordered UUIDv7s', () => {
      const now = Date.now();
      const id1 = generateUuidV7(now);
      const id2 = generateUuidV7(now + 10);
      expect(id1 < id2).toBe(true);
      expect(isValidUuidV7(id1)).toBe(true);
      expect(isValidUuidV7(id2)).toBe(true);
    });

    it('extracts correct timestamp from UUIDv7', () => {
      const targetTs = Date.now() + 5000;
      const id = generateUuidV7(targetTs);
      const extracted = extractTimestampFromUuidV7(id);
      expect(extracted).toBe(targetTs);
    });

    it('rejects invalid UUID formats', () => {
      expect(isValidUuidV7('not-a-uuid')).toBe(false);
      expect(isValidUuidV7('c9bf9e57-1685-4c89-bafb-ff5af830be8a')).toBe(false); // v4 UUID
      expect(() => extractTimestampFromUuidV7('invalid-uuid')).toThrowError(/Invalid UUIDv7/);
    });
  });

  describe('Vector Clock Engine', () => {
    it('compares vector clocks accurately', () => {
      const clockA = { 'node-1': 2, 'node-2': 1 };
      const clockB = { 'node-1': 2, 'node-2': 1 };
      expect(compareVectorClocks(clockA, clockB)).toBe('EQUAL');

      const clockAhead = { 'node-1': 3, 'node-2': 1 };
      expect(compareVectorClocks(clockAhead, clockB)).toBe('AFTER');
      expect(compareVectorClocks(clockB, clockAhead)).toBe('BEFORE');

      const clockConcurrent = { 'node-1': 1, 'node-2': 2 };
      expect(compareVectorClocks(clockA, clockConcurrent)).toBe('CONCURRENT');
    });

    it('merges vector clocks by taking maximum version per node', () => {
      const v1 = { 'node-1': 2, 'node-2': 5, 'node-3': 1 };
      const v2 = { 'node-1': 4, 'node-2': 3, 'node-4': 2 };
      const merged = mergeVectorClocks(v1, v2);

      expect(merged).toEqual({
        'node-1': 4,
        'node-2': 5,
        'node-3': 1,
        'node-4': 2,
      });
    });

    it('increments vector clock node counter', () => {
      const clock = { 'node-1': 1 };
      const inc = incrementVectorClock(clock, 'node-1');
      expect(inc['node-1']).toBe(2);

      const newClock = incrementVectorClock(clock, 'node-2');
      expect(newClock['node-2']).toBe(1);
    });
  });

  describe('Multi-Master Conflict Resolution Engine (Rule 10)', () => {
    it('preserves immutable append-only ledger commands without conflict', () => {
      const result = resolveMasterEntityConflict('payments.record', {
        version: 1,
        payload: { amount_minor: 5000, reference: 'TX-100' },
      }, {
        version: 2,
        payload: { amount_minor: 9000, reference: 'TX-99' },
      });

      expect(result.strategy).toBe('IMMUTABLE_APPEND');
      expect(result.isConflict).toBe(false);
      expect(result.winningPayload).toEqual({ amount_minor: 5000, reference: 'TX-100' });
    });

    it('resolves master entity conflicts when client vector clock is strictly after', () => {
      const client = {
        version: 2,
        clock: { 'pos-1': 2, 'server': 1 },
        payload: { name: 'Updated Item' },
      };
      const server = {
        version: 1,
        clock: { 'pos-1': 1, 'server': 1 },
        payload: { name: 'Original Item' },
      };

      const result = resolveMasterEntityConflict('catalog.item.update', client, server);
      expect(result.strategy).toBe('CLIENT_WINS');
      expect(result.isConflict).toBe(false);
      expect(result.winningPayload).toEqual({ name: 'Updated Item' });
    });

    it('resolves master entity conflicts when server vector clock is ahead or equal', () => {
      const client = {
        version: 1,
        clock: { 'pos-1': 1, 'server': 1 },
        payload: { name: 'Stale Item' },
      };
      const server = {
        version: 2,
        clock: { 'pos-1': 1, 'server': 2 },
        payload: { name: 'Fresh Item' },
      };

      const result = resolveMasterEntityConflict('catalog.item.update', client, server);
      expect(result.strategy).toBe('SERVER_WINS');
      expect(result.isConflict).toBe(false);
      expect(result.winningPayload).toEqual({ name: 'Fresh Item' });
    });

    it('routes concurrent vector clock collisions to EXCEPTION_WORKFLOW (Rule 10)', () => {
      const client = {
        version: 2,
        clock: { 'pos-1': 2, 'server': 1 },
        payload: { name: 'Client Title' },
      };
      const server = {
        version: 2,
        clock: { 'pos-1': 1, 'server': 2 },
        payload: { name: 'Server Title' },
      };

      const result = resolveMasterEntityConflict('catalog.item.update', client, server);
      expect(result.strategy).toBe('EXCEPTION_WORKFLOW');
      expect(result.isConflict).toBe(true);
      expect(result.reason).toContain('Concurrent modifications');
    });

    it('handles fallback version collision with divergent content', () => {
      const client = {
        version: 5,
        payload: { price: 2000 },
      };
      const server = {
        version: 5,
        payload: { price: 3000 },
      };

      const result = resolveMasterEntityConflict('catalog.item.update', client, server);
      expect(result.strategy).toBe('EXCEPTION_WORKFLOW');
      expect(result.isConflict).toBe(true);
    });
  });

  describe('Sequence Gap Detection', () => {
    it('detects missing sequence numbers in out-of-order streams', () => {
      const gaps = detectSequenceGaps([1, 2, 5, 8]);
      expect(gaps.hasGaps).toBe(true);
      expect(gaps.missingSequences).toEqual([3, 4, 6, 7]);
    });

    it('identifies continuous streams without gaps', () => {
      const gaps = detectSequenceGaps([10, 11, 12, 13]);
      expect(gaps.hasGaps).toBe(false);
      expect(gaps.missingSequences).toEqual([]);
    });

    it('handles empty or single-element sequence sets', () => {
      expect(detectSequenceGaps([]).hasGaps).toBe(false);
      expect(detectSequenceGaps([42]).hasGaps).toBe(false);
    });
  });
});

