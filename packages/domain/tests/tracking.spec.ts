import { describe, it, expect } from 'vitest';
import {
  calculateShelfLifeMetrics,
  fefoSort,
  assertAllocatableStock,
  validateSerialNumber,
  assertTrackingStrategyCompliance,
  TrackingDomainError,
} from '../src/tracking.js';

describe('Tracking Domain Engine & Invariants (Phase 2D)', () => {
  describe('Shelf Life & Expiration Calculation', () => {
    it('returns NOT_APPLICABLE when no expiry date is set', () => {
      const metrics = calculateShelfLifeMetrics(null);
      expect(metrics.status).toBe('NOT_APPLICABLE');
      expect(metrics.is_expired).toBe(false);
      expect(metrics.remaining_days).toBe(Infinity);
    });

    it('calculates accurate remaining days and healthy status', () => {
      const manufacture = '2026-01-01T00:00:00.000Z';
      const expiry = '2026-12-31T00:00:00.000Z'; // 364 days total
      const asOf = '2026-06-01T00:00:00.000Z'; // ~213 days remaining

      const metrics = calculateShelfLifeMetrics(expiry, manufacture, asOf);
      expect(metrics.is_expired).toBe(false);
      expect(metrics.remaining_days).toBeGreaterThan(200);
      expect(metrics.status).toBe('HEALTHY');
      expect(metrics.total_shelf_life_days).toBe(364);
      expect(metrics.percentage_remaining).toBeGreaterThan(50);
    });

    it('identifies WARNING and CRITICAL expiration horizons', () => {
      const manufacture = '2026-01-01T00:00:00.000Z';
      const expiry = '2026-06-01T00:00:00.000Z';

      // 40 days remaining -> WARNING
      const warningAsOf = '2026-04-22T00:00:00.000Z';
      const warningMetrics = calculateShelfLifeMetrics(expiry, manufacture, warningAsOf);
      expect(warningMetrics.status).toBe('WARNING');

      // 10 days remaining -> CRITICAL
      const criticalAsOf = '2026-05-22T00:00:00.000Z';
      const criticalMetrics = calculateShelfLifeMetrics(expiry, manufacture, criticalAsOf);
      expect(criticalMetrics.status).toBe('CRITICAL');
    });

    it('detects expired items and enforces non-negative remaining percent', () => {
      const manufacture = '2026-01-01T00:00:00.000Z';
      const expiry = '2026-06-01T00:00:00.000Z';
      const pastAsOf = '2026-06-10T00:00:00.000Z';

      const metrics = calculateShelfLifeMetrics(expiry, manufacture, pastAsOf);
      expect(metrics.is_expired).toBe(true);
      expect(metrics.status).toBe('EXPIRED');
      expect(metrics.percentage_remaining).toBe(0);
      expect(metrics.remaining_days).toBeLessThanOrEqual(0);
    });

    it('rejects invalid dates or manufacture subsequent to expiry', () => {
      expect(() =>
        calculateShelfLifeMetrics('invalid-date'),
      ).toThrow(TrackingDomainError);

      expect(() =>
        calculateShelfLifeMetrics(
          '2026-01-01T00:00:00.000Z',
          '2026-06-01T00:00:00.000Z', // manufacture after expiry
        ),
      ).toThrow(TrackingDomainError);
    });
  });

  describe('FEFO (First-Expired, First-Out) Sorter', () => {
    it('prioritizes earlier expiration dates and preserves FIFO for non-expiring stock', () => {
      const items = [
        { id: 'item_3', expiry_date: null, created_at: '2026-01-03T00:00:00.000Z' },
        { id: 'item_1', expiry_date: '2026-08-01T00:00:00.000Z', created_at: '2026-01-05T00:00:00.000Z' },
        { id: 'item_2', expiry_date: '2026-05-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'item_4', expiry_date: null, created_at: '2026-01-01T00:00:00.000Z' },
      ];

      const sorted = fefoSort(items);

      // item_2 expires May 2026 (earliest)
      expect(sorted[0]?.id).toBe('item_2');
      // item_1 expires August 2026
      expect(sorted[1]?.id).toBe('item_1');
      // non-expiring items ordered by created_at (FIFO)
      expect(sorted[2]?.id).toBe('item_4');
      expect(sorted[3]?.id).toBe('item_3');
    });
  });

  describe('Allocatability & Quarantine Partition Invariants', () => {
    it('permits allocation only for AVAILABLE, non-expired stock', () => {
      expect(() =>
        assertAllocatableStock({
          status: 'AVAILABLE',
          expiry_date: '2026-12-31T00:00:00.000Z',
          asOfDateStr: '2026-06-01T00:00:00.000Z',
        }),
      ).not.toThrow();
    });

    it('strictly forbids allocation of quarantined stock', () => {
      expect(() =>
        assertAllocatableStock({
          status: 'QUARANTINED',
          quarantine_reason: 'QA_INSPECTION_PENDING',
        }),
      ).toThrow(/under QUARANTINE hold \(QA_INSPECTION_PENDING\)/);
    });

    it('strictly forbids allocation of expired, damaged, recalled or depleted stock', () => {
      expect(() =>
        assertAllocatableStock({ status: 'EXPIRED' }),
      ).toThrow(/EXPIRED/);

      expect(() =>
        assertAllocatableStock({ status: 'DAMAGED' }),
      ).toThrow(/DAMAGED/);

      expect(() =>
        assertAllocatableStock({ status: 'RECALLED' }),
      ).toThrow(/RECALLED/);

      expect(() =>
        assertAllocatableStock({ status: 'DEPLETED' }),
      ).toThrow(/not in stock/);

      // Status says AVAILABLE but physical date has passed
      expect(() =>
        assertAllocatableStock({
          status: 'AVAILABLE',
          expiry_date: '2026-01-01T00:00:00.000Z',
          asOfDateStr: '2026-06-01T00:00:00.000Z',
        }),
      ).toThrow(/expired on 2026-01-01/);
    });
  });

  describe('Serial Number Validation', () => {
    it('validates clean alphanumeric serial numbers', () => {
      expect(validateSerialNumber('SN-2026-0001')).toBe('SN-2026-0001');
      expect(validateSerialNumber('SN_992.A/B')).toBe('SN_992.A/B');
    });

    it('rejects empty or whitespace serials', () => {
      expect(() => validateSerialNumber('')).toThrow(TrackingDomainError);
      expect(() => validateSerialNumber('   ')).toThrow(TrackingDomainError);
    });

    it('rejects forbidden special characters or oversized strings', () => {
      expect(() => validateSerialNumber('SN#12345')).toThrow(TrackingDomainError);
      expect(() => validateSerialNumber('SN@ABC')).toThrow(TrackingDomainError);
      expect(() => validateSerialNumber('A'.repeat(65))).toThrow(TrackingDomainError);
    });
  });

  describe('Tracking Strategy Compliance', () => {
    it('enforces NONE strategy: no serials allowed', () => {
      expect(() =>
        assertTrackingStrategyCompliance('NONE', false, false),
      ).not.toThrow();
      expect(() =>
        assertTrackingStrategyCompliance('NONE', false, true),
      ).toThrow(/serial numbers are not permitted/);
    });

    it('enforces BATCH strategy: batch required, no serials', () => {
      expect(() =>
        assertTrackingStrategyCompliance('BATCH', true, false),
      ).not.toThrow();
      expect(() =>
        assertTrackingStrategyCompliance('BATCH', false, false),
      ).toThrow(/batch identifier is required/);
      expect(() =>
        assertTrackingStrategyCompliance('BATCH', true, true),
      ).toThrow(/serial numbers are not permitted/);
    });

    it('enforces SERIAL strategy: serial required', () => {
      expect(() =>
        assertTrackingStrategyCompliance('SERIAL', false, true),
      ).not.toThrow();
      expect(() =>
        assertTrackingStrategyCompliance('SERIAL', false, false),
      ).toThrow(/serial number is required/);
    });

    it('enforces BATCH_AND_SERIAL strategy: both batch and serial required', () => {
      expect(() =>
        assertTrackingStrategyCompliance('BATCH_AND_SERIAL', true, true),
      ).not.toThrow();
      expect(() =>
        assertTrackingStrategyCompliance('BATCH_AND_SERIAL', false, true),
      ).toThrow(/batch identifier is required/);
      expect(() =>
        assertTrackingStrategyCompliance('BATCH_AND_SERIAL', true, false),
      ).toThrow(/serial number is required/);
    });
  });
});
