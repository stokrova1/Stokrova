import { describe, it, expect } from 'vitest';
import {
  assertRmaTransition,
  assertReturnQuantityInvariants,
  evaluateRmaReceiptStatus,
  calculateNetRefund,
  determineDispositionRoute,
  ReturnsDomainError,
  type DomainRmaStatus,
} from '../src/returns-rma.js';

describe('Reverse Logistics & RMA Domain Engine (Phase 7)', () => {
  // ==========================================================================
  // 1. RMA State Machine Transitions
  // ==========================================================================
  describe('assertRmaTransition', () => {
    it('allows valid progressive lifecycle transitions', () => {
      const validPath: DomainRmaStatus[] = [
        'DRAFT',
        'REQUESTED',
        'APPROVED',
        'PARTIALLY_RECEIVED',
        'RECEIVED',
        'COMPLETED',
      ];

      for (let i = 0; i < validPath.length - 1; i++) {
        expect(() =>
          assertRmaTransition(validPath[i]!, validPath[i + 1]!),
        ).not.toThrow();
      }
    });

    it('allows direct approval from DRAFT and cancellation at allowed stages', () => {
      expect(() => assertRmaTransition('DRAFT', 'APPROVED')).not.toThrow();
      expect(() => assertRmaTransition('DRAFT', 'CANCELLED')).not.toThrow();
      expect(() => assertRmaTransition('REQUESTED', 'REJECTED')).not.toThrow();
      expect(() => assertRmaTransition('APPROVED', 'CANCELLED')).not.toThrow();
      expect(() => assertRmaTransition('PARTIALLY_RECEIVED', 'CANCELLED')).not.toThrow();
    });

    it('no-op when transitioning to the same state', () => {
      expect(() => assertRmaTransition('APPROVED', 'APPROVED')).not.toThrow();
    });

    it('rejects illegal state jumps or transitions from terminal states', () => {
      expect(() => assertRmaTransition('DRAFT', 'COMPLETED')).toThrow(
        ReturnsDomainError,
      );
      expect(() => assertRmaTransition('COMPLETED', 'APPROVED')).toThrow(
        ReturnsDomainError,
      );
      expect(() => assertRmaTransition('REJECTED', 'RECEIVED')).toThrow(
        ReturnsDomainError,
      );
      expect(() => assertRmaTransition('CANCELLED', 'DRAFT')).toThrow(
        ReturnsDomainError,
      );
    });
  });

  // ==========================================================================
  // 2. Return Authorization Quantity Invariants
  // ==========================================================================
  describe('assertReturnQuantityInvariants', () => {
    it('passes for valid quantities within original fulfillment bounds', () => {
      expect(() =>
        assertReturnQuantityInvariants({
          quantity_authorized: 5,
          quantity_received: 3,
          original_fulfilled_quantity: 10,
          previously_returned_quantity: 2,
        }),
      ).not.toThrow();
    });

    it('rejects non-positive authorized return quantity', () => {
      expect(() =>
        assertReturnQuantityInvariants({
          quantity_authorized: 0,
        }),
      ).toThrowError(/greater than zero/);

      expect(() =>
        assertReturnQuantityInvariants({
          quantity_authorized: -2,
        }),
      ).toThrowError(/greater than zero/);
    });

    it('rejects negative received quantity', () => {
      expect(() =>
        assertReturnQuantityInvariants({
          quantity_authorized: 5,
          quantity_received: -1,
        }),
      ).toThrowError(/cannot be negative/);
    });

    it('rejects over-receipt beyond authorized quantity', () => {
      expect(() =>
        assertReturnQuantityInvariants({
          quantity_authorized: 5,
          quantity_received: 6,
        }),
      ).toThrowError(/cannot exceed authorized quantity/);
    });

    it('rejects authorization exceeding remaining fulfilled quantity', () => {
      expect(() =>
        assertReturnQuantityInvariants({
          quantity_authorized: 8,
          original_fulfilled_quantity: 10,
          previously_returned_quantity: 4, // 10 - 4 = 6 max returnable
        }),
      ).toThrowError(/exceeds available returnable quantity/);
    });
  });

  // ==========================================================================
  // 3. RMA Receipt Status Evaluator
  // ==========================================================================
  describe('evaluateRmaReceiptStatus', () => {
    it('returns APPROVED when no items have been received', () => {
      const status = evaluateRmaReceiptStatus([
        { quantity_authorized: 10, quantity_received: 0 },
        { quantity_authorized: 5, quantity_received: 0 },
      ]);
      expect(status).toBe('APPROVED');
    });

    it('returns PARTIALLY_RECEIVED when some but not all items are received', () => {
      const status = evaluateRmaReceiptStatus([
        { quantity_authorized: 10, quantity_received: 5 },
        { quantity_authorized: 5, quantity_received: 0 },
      ]);
      expect(status).toBe('PARTIALLY_RECEIVED');
    });

    it('returns RECEIVED when all authorized items have been received', () => {
      const status = evaluateRmaReceiptStatus([
        { quantity_authorized: 10, quantity_received: 10 },
        { quantity_authorized: 5, quantity_received: 5 },
      ]);
      expect(status).toBe('RECEIVED');
    });
  });

  // ==========================================================================
  // 4. Financial Restocking Fee & Refund Engine (Rule 26)
  // ==========================================================================
  describe('calculateNetRefund', () => {
    it('calculates 100% refund when restocking fee is 0 bp', () => {
      const res = calculateNetRefund(15000, 0); // $150.00
      expect(res.gross_refund_cents).toBe(15000);
      expect(res.restocking_fee_cents).toBe(0);
      expect(res.net_refund_cents).toBe(15000);
    });

    it('calculates 15% restocking fee with integer rounding', () => {
      // $100.00 (10,000 cents) at 15.00% (1,500 bp) -> $15.00 (1,500 cents) fee
      const res = calculateNetRefund(10000, 1500);
      expect(res.restocking_fee_cents).toBe(1500);
      expect(res.net_refund_cents).toBe(8500);

      // $33.33 (3333 cents) at 15.00% (1500 bp)
      // (3333 * 1500 + 5000) / 10000 = (4999500 + 5000) / 10000 = 5004500 / 10000 = 500 cents
      const resOdd = calculateNetRefund(3333, 1500);
      expect(resOdd.restocking_fee_cents).toBe(500);
      expect(resOdd.net_refund_cents).toBe(2833);
    });

    it('rejects invalid restocking fee basis points (> 10000 or < 0)', () => {
      expect(() => calculateNetRefund(10000, 10001)).toThrowError(
        /must be between 0 and 10000/,
      );
      expect(() => calculateNetRefund(10000, -50)).toThrowError(
        /must be between 0 and 10000/,
      );
    });

    it('rejects negative gross refund amounts', () => {
      expect(() => calculateNetRefund(-100, 500)).toThrowError(
        /cannot be negative/,
      );
    });
  });

  // ==========================================================================
  // 5. Quality Grading & Disposition Routing Engine
  // ==========================================================================
  describe('determineDispositionRoute', () => {
    it('routes pristine Grade A and Grade B units to primary restock', () => {
      expect(
        determineDispositionRoute({ condition_grade: 'GRADE_A_NEW' }),
      ).toBe('RESTOCK_TO_PRIMARY');

      expect(
        determineDispositionRoute({ condition_grade: 'GRADE_B_OPEN_BOX' }),
      ).toBe('RESTOCK_TO_PRIMARY');
    });

    it('routes repairable or salvage units to refurb work centers', () => {
      expect(
        determineDispositionRoute({ condition_grade: 'GRADE_C_REFURBISHABLE' }),
      ).toBe('TRANSFER_TO_REFURB');

      expect(
        determineDispositionRoute({ condition_grade: 'GRADE_D_SALVAGE' }),
      ).toBe('TRANSFER_TO_REFURB');
    });

    it('routes hazardous or destroyed items to scrap disposal', () => {
      expect(
        determineDispositionRoute({ condition_grade: 'SCRAP_HAZMAT' }),
      ).toBe('SCRAP_DISPOSAL');
    });

    it('routes vendor defective items to Return-to-Vendor (RTV) regardless of grade', () => {
      expect(
        determineDispositionRoute({
          condition_grade: 'GRADE_A_NEW',
          is_vendor_defect: true,
        }),
      ).toBe('RETURN_TO_VENDOR');

      expect(
        determineDispositionRoute({
          condition_grade: 'GRADE_C_REFURBISHABLE',
          is_vendor_defect: true,
        }),
      ).toBe('RETURN_TO_VENDOR');
    });
  });
});
