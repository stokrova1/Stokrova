import { describe, it, expect } from 'vitest';
import {
  validatePosSyncSequence,
  advanceVectorClock,
  evaluateOfflineInventoryReconciliation,
  calculateBatchSummary,
  PosSyncDomainError,
} from '../src/pos-sync.js';

describe('Offline POS Sync & Conflict Resolution Domain Engine (Phase 3E)', () => {
  describe('Sequence Progression & Gap Detection', () => {
    it('identifies strictly contiguous sequences', () => {
      const res1 = validatePosSyncSequence(0, 1);
      expect(res1.isContiguous).toBe(true);
      expect(res1.isGap).toBe(false);
      expect(res1.isDuplicateOrRegressed).toBe(false);

      const res2 = validatePosSyncSequence(42, 43);
      expect(res2.isContiguous).toBe(true);
      expect(res2.isGap).toBe(false);
      expect(res2.isDuplicateOrRegressed).toBe(false);
    });

    it('detects sequence gaps when transactions arrive out of order', () => {
      const res = validatePosSyncSequence(10, 12);
      expect(res.isContiguous).toBe(false);
      expect(res.isGap).toBe(true);
      expect(res.isDuplicateOrRegressed).toBe(false);
    });

    it('detects duplicate or regressed sequences', () => {
      const duplicateRes = validatePosSyncSequence(10, 10);
      expect(duplicateRes.isContiguous).toBe(false);
      expect(duplicateRes.isGap).toBe(false);
      expect(duplicateRes.isDuplicateOrRegressed).toBe(true);

      const regressedRes = validatePosSyncSequence(10, 8);
      expect(regressedRes.isContiguous).toBe(false);
      expect(regressedRes.isGap).toBe(false);
      expect(regressedRes.isDuplicateOrRegressed).toBe(true);
    });
  });

  describe('Vector Clock Progression', () => {
    it('advances distributed vector clock monotonically', () => {
      let clock: Record<string, number> = {};

      clock = advanceVectorClock(clock, 'dev_term_1', 1);
      expect(clock['dev_term_1']).toBe(1);

      clock = advanceVectorClock(clock, 'dev_term_2', 1);
      expect(clock['dev_term_1']).toBe(1);
      expect(clock['dev_term_2']).toBe(1);

      clock = advanceVectorClock(clock, 'dev_term_1', 2);
      expect(clock['dev_term_1']).toBe(2);

      // Regressed or stale sequence does not decrement clock
      clock = advanceVectorClock(clock, 'dev_term_1', 1);
      expect(clock['dev_term_1']).toBe(2);
    });
  });

  describe('Offline Stock Reconciliation (Rule 7, 10, 24)', () => {
    it('authorizes direct debit when physical on-hand stock is sufficient', () => {
      const res = evaluateOfflineInventoryReconciliation(50, 10);
      expect(res.canDirectDebit).toBe(true);
      expect(res.fulfillableQty).toBe(10);
      expect(res.discrepancyQty).toBe(0);
      expect(res.resolutionStatus).toBe('PROCESSED');
      expect(res.reconciliationNote).toBeNull();
    });

    it('reconciles gracefully when stock was depleted by another channel during offline period', () => {
      // Customer already took 10 units at offline POS till, but only 4 units remain on server
      const res = evaluateOfflineInventoryReconciliation(4, 10);
      expect(res.canDirectDebit).toBe(false);
      expect(res.fulfillableQty).toBe(4);
      expect(res.discrepancyQty).toBe(6);
      expect(res.resolutionStatus).toBe('CONFLICT_RECONCILED');
      expect(res.reconciliationNote).toContain('Physical inventory deficit of 6 units');
    });

    it('handles zero stock gracefully without rejecting physical offline customer sale', () => {
      const res = evaluateOfflineInventoryReconciliation(0, 5);
      expect(res.canDirectDebit).toBe(false);
      expect(res.fulfillableQty).toBe(0);
      expect(res.discrepancyQty).toBe(5);
      expect(res.resolutionStatus).toBe('CONFLICT_RECONCILED');
    });

    it('rejects invalid non-positive requested quantity with PosSyncDomainError', () => {
      expect(() => evaluateOfflineInventoryReconciliation(10, 0)).toThrow(PosSyncDomainError);
      expect(() => evaluateOfflineInventoryReconciliation(10, -5)).toThrow(PosSyncDomainError);
    });
  });

  describe('Batch Summary Aggregation', () => {
    it('accurately calculates resolution metrics', () => {
      const summary = calculateBatchSummary([
        { status: 'PROCESSED' },
        { status: 'PROCESSED' },
        { status: 'IDEMPOTENT_DUPLICATE' },
        { status: 'CONFLICT_RECONCILED' },
        { status: 'REJECTED' },
      ]);

      expect(summary.total_submitted).toBe(5);
      expect(summary.processed_count).toBe(2);
      expect(summary.duplicate_count).toBe(1);
      expect(summary.conflict_count).toBe(1);
      expect(summary.rejected_count).toBe(1);
    });
  });
});
