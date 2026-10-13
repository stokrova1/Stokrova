import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceBalance,
  canTransitionPaymentStatus,
  assertValidPaymentAmount,
  assertNoOverpayment,
  calculateNextReceiptPrint,
  DomainPaymentStatuses,
  DomainInvoiceStatuses,
} from '../src/payments.js';

describe('Payments, Receipts & Financial Truth Invariants', () => {
  describe('calculateInvoiceBalance', () => {
    it('sets status to ISSUED when no payments have been applied', () => {
      const res = calculateInvoiceBalance(500000n, 0n);
      expect(res.status).toBe(DomainInvoiceStatuses.ISSUED);
      expect(res.balanceDueMinor).toBe(500000n);
    });

    it('sets status to PARTIALLY_PAID when payment is less than total', () => {
      const res = calculateInvoiceBalance(500000n, 200000n);
      expect(res.status).toBe(DomainInvoiceStatuses.PARTIALLY_PAID);
      expect(res.balanceDueMinor).toBe(300000n);
    });

    it('sets status to PAID when total is fully settled', () => {
      const res = calculateInvoiceBalance(500000n, 500000n);
      expect(res.status).toBe(DomainInvoiceStatuses.PAID);
      expect(res.balanceDueMinor).toBe(0n);
    });

    it('clamps balance due to 0 when payment exceeds total', () => {
      const res = calculateInvoiceBalance(500000n, 550000n);
      expect(res.status).toBe(DomainInvoiceStatuses.PAID);
      expect(res.balanceDueMinor).toBe(0n);
    });
  });

  describe('canTransitionPaymentStatus', () => {
    it('allows valid lifecycle transitions', () => {
      expect(
        canTransitionPaymentStatus(
          DomainPaymentStatuses.PENDING,
          DomainPaymentStatuses.CONFIRMED,
        ),
      ).toBe(true);
      expect(
        canTransitionPaymentStatus(
          DomainPaymentStatuses.CONFIRMED,
          DomainPaymentStatuses.REFUNDED,
        ),
      ).toBe(true);
      expect(
        canTransitionPaymentStatus(
          DomainPaymentStatuses.CAPTURED,
          DomainPaymentStatuses.REFUNDED,
        ),
      ).toBe(true);
    });

    it('disallows invalid transitions', () => {
      expect(
        canTransitionPaymentStatus(
          DomainPaymentStatuses.FAILED,
          DomainPaymentStatuses.CONFIRMED,
        ),
      ).toBe(false);
      expect(
        canTransitionPaymentStatus(
          DomainPaymentStatuses.REFUNDED,
          DomainPaymentStatuses.PENDING,
        ),
      ).toBe(false);
    });
  });

  describe('Overpayment & Amount Assertions', () => {
    it('assertValidPaymentAmount strictly requires positive amounts', () => {
      expect(() => assertValidPaymentAmount(100n)).not.toThrow();
      expect(() => assertValidPaymentAmount(0n)).toThrow(/must be strictly positive/);
      expect(() => assertValidPaymentAmount(-50n)).toThrow(/must be strictly positive/);
    });

    it('assertNoOverpayment rejects amounts exceeding balance due', () => {
      expect(() => assertNoOverpayment(30000n, 50000n)).not.toThrow();
      expect(() => assertNoOverpayment(50000n, 50000n)).not.toThrow();
      expect(() => assertNoOverpayment(60000n, 50000n)).toThrow(
        /exceeds remaining balance due/,
      );
    });
  });

  describe('calculateNextReceiptPrint (Immutable Receipt Event Auditing)', () => {
    it('initial print has count 1 and isReprint false', () => {
      const first = calculateNextReceiptPrint(0);
      expect(first.nextPrintCount).toBe(1);
      expect(first.isReprint).toBe(false);
    });

    it('subsequent prints increment print count and set isReprint true', () => {
      const second = calculateNextReceiptPrint(1);
      expect(second.nextPrintCount).toBe(2);
      expect(second.isReprint).toBe(true);

      const third = calculateNextReceiptPrint(2);
      expect(third.nextPrintCount).toBe(3);
      expect(third.isReprint).toBe(true);
    });
  });
});
