import { describe, it, expect } from 'vitest';
import {
  calculateTillSummary,
  calculateTillVarianceMinor,
  canTransitionRegisterSessionStatus,
  assertSessionIsOpen,
  assertCanOpenSession,
  assertNonNegativeMinor,
  assertPositiveMinor,
  CashMovementTypes,
  RegisterSessionStatuses,
} from '../src/registers.js';

describe('Registers & Till Balancing Invariants', () => {
  describe('calculateTillSummary', () => {
    it('returns opening float when no cash movements have occurred', () => {
      const summary = calculateTillSummary(50000n, []);
      expect(summary.opening_float_minor).toBe(50000n);
      expect(summary.total_cash_sales_minor).toBe(0n);
      expect(summary.total_cash_refunds_minor).toBe(0n);
      expect(summary.total_cash_in_minor).toBe(0n);
      expect(summary.total_cash_out_minor).toBe(0n);
      expect(summary.expected_closing_minor).toBe(50000n);
    });

    it('correctly aggregates sales, refunds, cash in, and cash out', () => {
      const movements = [
        { movement_type: CashMovementTypes.CASH_SALE, amount_minor: 120000n },
        { movement_type: CashMovementTypes.CASH_SALE, amount_minor: 80000n },
        { movement_type: CashMovementTypes.CASH_IN, amount_minor: 10000n }, // float addition
        { movement_type: CashMovementTypes.CASH_REFUND, amount_minor: 15000n }, // refund to customer
        { movement_type: CashMovementTypes.CASH_OUT, amount_minor: 50000n }, // cash drop to safe
      ];

      const summary = calculateTillSummary(20000n, movements);

      expect(summary.opening_float_minor).toBe(20000n);
      expect(summary.total_cash_sales_minor).toBe(200000n);
      expect(summary.total_cash_in_minor).toBe(10000n);
      expect(summary.total_cash_refunds_minor).toBe(15000n);
      expect(summary.total_cash_out_minor).toBe(50000n);

      // Expected = 20,000 + 200,000 + 10,000 - 15,000 - 50,000 = 165,000
      expect(summary.expected_closing_minor).toBe(165000n);
    });

    it('does not double count OPENING_FLOAT if present in movement entries', () => {
      const movements = [
        { movement_type: CashMovementTypes.OPENING_FLOAT, amount_minor: 25000n },
        { movement_type: CashMovementTypes.CASH_SALE, amount_minor: 50000n },
      ];

      const summary = calculateTillSummary(25000n, movements);
      // Expected should be 25,000 + 50,000 = 75,000 (NOT 100,000)
      expect(summary.expected_closing_minor).toBe(75000n);
    });
  });

  describe('calculateTillVarianceMinor', () => {
    it('calculates zero variance when actual physical count equals expected', () => {
      const variance = calculateTillVarianceMinor(100000n, 100000n);
      expect(variance).toBe(0n);
    });

    it('calculates positive variance (surplus) when actual count exceeds expected', () => {
      // Expected 100,000, counted 102,500 (+2,500 surplus)
      const variance = calculateTillVarianceMinor(102500n, 100000n);
      expect(variance).toBe(2500n);
    });

    it('calculates negative variance (shortage) when actual count is less than expected', () => {
      // Expected 100,000, counted 98,000 (-2,000 shortage)
      const variance = calculateTillVarianceMinor(98000n, 100000n);
      expect(variance).toBe(-2000n);
    });
  });

  describe('canTransitionRegisterSessionStatus', () => {
    it('allows transitioning from OPEN to CLOSED', () => {
      expect(canTransitionRegisterSessionStatus('OPEN', 'CLOSED')).toBe(true);
    });

    it('allows transitioning from CLOSED to RECONCILED', () => {
      expect(canTransitionRegisterSessionStatus('CLOSED', 'RECONCILED')).toBe(true);
    });

    it('disallows invalid transitions', () => {
      expect(canTransitionRegisterSessionStatus('OPEN', 'RECONCILED')).toBe(false);
      expect(canTransitionRegisterSessionStatus('CLOSED', 'OPEN')).toBe(false);
      expect(canTransitionRegisterSessionStatus('RECONCILED', 'OPEN')).toBe(false);
      expect(canTransitionRegisterSessionStatus('RECONCILED', 'CLOSED')).toBe(false);
    });
  });

  describe('Invariants Assertions', () => {
    it('assertSessionIsOpen passes for OPEN and throws for other statuses', () => {
      expect(() => assertSessionIsOpen(RegisterSessionStatuses.OPEN)).not.toThrow();
      expect(() => assertSessionIsOpen(RegisterSessionStatuses.CLOSED)).toThrow(
        /Session must be OPEN/,
      );
      expect(() => assertSessionIsOpen('UNKNOWN')).toThrow(/Session must be OPEN/);
    });

    it('assertCanOpenSession throws if an active session already exists', () => {
      expect(() => assertCanOpenSession(false)).not.toThrow();
      expect(() => assertCanOpenSession(true)).toThrow(/already has an active OPEN session/);
    });

    it('assertNonNegativeMinor validates non-negativity', () => {
      expect(() => assertNonNegativeMinor(0n)).not.toThrow();
      expect(() => assertNonNegativeMinor(100n)).not.toThrow();
      expect(() => assertNonNegativeMinor(-1n)).toThrow(/cannot be negative/);
    });

    it('assertPositiveMinor validates strictly positive amounts', () => {
      expect(() => assertPositiveMinor(1n)).not.toThrow();
      expect(() => assertPositiveMinor(500n)).not.toThrow();
      expect(() => assertPositiveMinor(0n)).toThrow(/must be strictly positive/);
      expect(() => assertPositiveMinor(-50n)).toThrow(/must be strictly positive/);
    });
  });
});
