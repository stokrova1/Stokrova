import { describe, it, expect } from 'vitest';
import {
  verifyDenominationsTally,
  calculatePosTillSummary,
  assertSufficientDrawerCash,
  evaluateTillVariance,
  evaluateSupervisorOverrideRequirement,
  canTransitionPosSessionStatus,
  PosSessionStatuses,
  PosCashMovementTypes,
  DenominationTallyMismatchError,
  InsufficientTillCashDomainError,
  SupervisorOverrideRequiredError,
  PosDomainError,
} from '../src/pos.js';

describe('POS Session & Till Balancing Domain Engine (Phase 3B)', () => {
  describe('Denomination Breakdown Verification', () => {
    it('verifies exact match for denominations tally', () => {
      // 5 x 10000 ($100), 10 x 5000 ($50), 20 x 1000 ($10) = 50000 + 50000 + 20000 = 120000 minor units
      const denominations = [
        { denomination_minor: 10000n, count: 5 },
        { denomination_minor: 5000n, count: 10 },
        { denomination_minor: 1000n, count: 20 },
      ];
      expect(() => verifyDenominationsTally(denominations, 120000n)).not.toThrow();
    });

    it('throws DenominationTallyMismatchError when sum does not match declared total', () => {
      const denominations = [
        { denomination_minor: 10000n, count: 5 }, // 50000
        { denomination_minor: 5000n, count: 2 },  // 10000
      ]; // total is 60000
      expect(() => verifyDenominationsTally(denominations, 65000n)).toThrow(
        DenominationTallyMismatchError,
      );
    });

    it('rejects negative counts or non-positive denomination amounts', () => {
      expect(() =>
        verifyDenominationsTally([{ denomination_minor: 100n, count: -1 }], 0n),
      ).toThrow(PosDomainError);

      expect(() =>
        verifyDenominationsTally([{ denomination_minor: 0n, count: 5 }], 0n),
      ).toThrow(PosDomainError);
    });
  });

  describe('Till Summary & Cash Balance Calculation', () => {
    it('accurately computes drawer balance including cash sales, refunds, ins, outs, and drops', () => {
      // Opening Float: 20,000 ($200)
      // Sales: +50,000 ($500)
      // Refund: -5,000 ($50)
      // Cash In: +10,000 ($100)
      // Cash Out: -4,000 ($40)
      // Safe Drop: -30,000 ($300)
      // Expected = 20000 + 50000 - 5000 + 10000 - 4000 - 30000 = 41,000 ($410)
      const opening = 20000n;
      const movements = [
        { movement_type: PosCashMovementTypes.CASH_SALE, amount_minor: 50000n },
        { movement_type: PosCashMovementTypes.CASH_REFUND, amount_minor: 5000n },
        { movement_type: PosCashMovementTypes.CASH_IN, amount_minor: 10000n },
        { movement_type: PosCashMovementTypes.CASH_OUT, amount_minor: 4000n },
        { movement_type: PosCashMovementTypes.CASH_DROP, amount_minor: 30000n },
      ];

      const summary = calculatePosTillSummary(opening, movements);

      expect(summary.opening_float_minor).toBe(20000n);
      expect(summary.total_cash_sales_minor).toBe(50000n);
      expect(summary.total_cash_refunds_minor).toBe(5000n);
      expect(summary.total_cash_in_minor).toBe(10000n);
      expect(summary.total_cash_out_minor).toBe(4000n);
      expect(summary.total_cash_drops_minor).toBe(30000n);
      expect(summary.current_drawer_balance_minor).toBe(41000n);
      expect(summary.expected_closing_minor).toBe(41000n);
    });
  });

  describe('Cash Drawer Underflow Protection', () => {
    it('allows deduction when drawer balance is sufficient', () => {
      expect(() => assertSufficientDrawerCash(15000n, 10000n, 'Cash Out')).not.toThrow();
      expect(() => assertSufficientDrawerCash(15000n, 15000n, 'Cash Drop')).not.toThrow();
    });

    it('throws InsufficientTillCashDomainError when deduction exceeds drawer balance', () => {
      expect(() => assertSufficientDrawerCash(10000n, 10001n, 'Cash Drop')).toThrow(
        InsufficientTillCashDomainError,
      );
    });

    it('rejects zero or negative deduction amounts', () => {
      expect(() => assertSufficientDrawerCash(10000n, 0n, 'Cash Out')).toThrow(PosDomainError);
      expect(() => assertSufficientDrawerCash(10000n, -500n, 'Cash Out')).toThrow(PosDomainError);
    });
  });

  describe('Variance Evaluation & Categorization', () => {
    it('categorizes zero variance as BALANCED', () => {
      const res = evaluateTillVariance(50000n, 50000n);
      expect(res.variance_minor).toBe(0n);
      expect(res.variance_category).toBe('BALANCED');
    });

    it('categorizes positive variance as SURPLUS', () => {
      const res = evaluateTillVariance(50500n, 50000n);
      expect(res.variance_minor).toBe(500n);
      expect(res.variance_category).toBe('SURPLUS');
    });

    it('categorizes negative variance as DEFICIT', () => {
      const res = evaluateTillVariance(49000n, 50000n);
      expect(res.variance_minor).toBe(-1000n);
      expect(res.variance_category).toBe('DEFICIT');
    });
  });

  describe('Supervisor Variance Threshold Enforcement', () => {
    it('allows variance within tolerance without supervisor approval', () => {
      // Variance = $5.00 (500 minor), Max Allowed = $10.00 (1000 minor)
      expect(() =>
        evaluateSupervisorOverrideRequirement(500n, 1000n, false),
      ).not.toThrow();

      // Negative variance within tolerance
      expect(() =>
        evaluateSupervisorOverrideRequirement(-800n, 1000n, false),
      ).not.toThrow();
    });

    it('throws SupervisorOverrideRequiredError when variance exceeds threshold without approval', () => {
      // Shortage of $15.00 with max tolerance of $10.00
      expect(() =>
        evaluateSupervisorOverrideRequirement(-1500n, 1000n, false),
      ).toThrow(SupervisorOverrideRequiredError);

      // Surplus of $12.00 with max tolerance of $10.00
      expect(() =>
        evaluateSupervisorOverrideRequirement(1200n, 1000n, false),
      ).toThrow(SupervisorOverrideRequiredError);
    });

    it('permits excessive variance when supervisor approval is provided', () => {
      expect(() =>
        evaluateSupervisorOverrideRequirement(-5000n, 1000n, true),
      ).not.toThrow();
    });
  });

  describe('Session State Transitions', () => {
    it('allows valid state transitions', () => {
      expect(canTransitionPosSessionStatus(PosSessionStatuses.OPEN, PosSessionStatuses.SUSPENDED)).toBe(true);
      expect(canTransitionPosSessionStatus(PosSessionStatuses.SUSPENDED, PosSessionStatuses.OPEN)).toBe(true);
      expect(canTransitionPosSessionStatus(PosSessionStatuses.OPEN, PosSessionStatuses.CLOSING)).toBe(true);
      expect(canTransitionPosSessionStatus(PosSessionStatuses.CLOSING, PosSessionStatuses.CLOSED)).toBe(true);
      expect(canTransitionPosSessionStatus(PosSessionStatuses.CLOSED, PosSessionStatuses.RECONCILED)).toBe(true);
    });

    it('disallows invalid state transitions', () => {
      expect(canTransitionPosSessionStatus(PosSessionStatuses.OPEN, PosSessionStatuses.RECONCILED)).toBe(false);
      expect(canTransitionPosSessionStatus(PosSessionStatuses.CLOSED, PosSessionStatuses.OPEN)).toBe(false);
      expect(canTransitionPosSessionStatus(PosSessionStatuses.RECONCILED, PosSessionStatuses.OPEN)).toBe(false);
    });
  });
});
