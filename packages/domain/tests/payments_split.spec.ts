import { describe, it, expect } from 'vitest';
import {
  calculateMultiTenderAllocation,
  DomainPaymentTenderTypes,
  NonCashOverTenderDomainError,
  DuplicateTenderIdempotencyKeyError,
  PaymentDomainError,
} from '../src/payments.js';

describe('Split & Multi-Tender Payments Domain Engine (Phase 3C)', () => {
  it('correctly allocates single cash payment with change return', () => {
    // Total payable: $45.00 (4500 minor)
    // Tender: $50.00 cash (5000 minor)
    const tenders = [
      {
        idempotency_key: 'idem_c1',
        tender_type: DomainPaymentTenderTypes.CASH,
        amount_minor: 5000n,
      },
    ];

    const res = calculateMultiTenderAllocation(4500n, tenders);

    expect(res.total_payable_minor).toBe(4500n);
    expect(res.total_tendered_minor).toBe(5000n);
    expect(res.total_allocated_minor).toBe(4500n);
    expect(res.change_due_minor).toBe(500n);
    expect(res.remaining_balance_minor).toBe(0n);
    expect(res.is_fully_paid).toBe(true);
    expect(res.cash_sale_total_minor).toBe(4500n); // Net cash collected in drawer
    expect(res.allocated_tenders).toEqual([
      {
        idempotency_key: 'idem_c1',
        tender_type: DomainPaymentTenderTypes.CASH,
        tendered_minor: 5000n,
        allocated_minor: 4500n,
        change_returned_minor: 500n,
      },
    ]);
  });

  it('handles multi-tender split across Card, Store Credit, and Cash with change', () => {
    // Total: $120.00 (12000 minor)
    // Tender 1: $50.00 Store Credit (5000) -> Remaining $70.00
    // Tender 2: $40.00 Card (4000) -> Remaining $30.00
    // Tender 3: $50.00 Cash (5000) -> Change $20.00 (2000), Remaining $0
    const tenders = [
      {
        idempotency_key: 'idem_sc_1',
        tender_type: DomainPaymentTenderTypes.STORE_CREDIT,
        amount_minor: 5000n,
      },
      {
        idempotency_key: 'idem_card_1',
        tender_type: DomainPaymentTenderTypes.CARD,
        amount_minor: 4000n,
      },
      {
        idempotency_key: 'idem_cash_1',
        tender_type: DomainPaymentTenderTypes.CASH,
        amount_minor: 5000n,
      },
    ];

    const res = calculateMultiTenderAllocation(12000n, tenders);

    expect(res.total_payable_minor).toBe(12000n);
    expect(res.total_tendered_minor).toBe(14000n);
    expect(res.total_allocated_minor).toBe(12000n);
    expect(res.change_due_minor).toBe(2000n);
    expect(res.remaining_balance_minor).toBe(0n);
    expect(res.is_fully_paid).toBe(true);
    expect(res.cash_sale_total_minor).toBe(3000n);
    expect(res.allocated_tenders).toHaveLength(3);
    expect(res.allocated_tenders[0].allocated_minor).toBe(5000n);
    expect(res.allocated_tenders[1].allocated_minor).toBe(4000n);
    expect(res.allocated_tenders[2].allocated_minor).toBe(3000n);
    expect(res.allocated_tenders[2].change_returned_minor).toBe(2000n);
  });

  it('calculates partial payment correctly when tender does not cover full total', () => {
    // Total: $100.00 (10000 minor)
    // Tender: $60.00 Card (6000 minor)
    const tenders = [
      {
        idempotency_key: 'idem_part_1',
        tender_type: DomainPaymentTenderTypes.CARD,
        amount_minor: 6000n,
      },
    ];

    const res = calculateMultiTenderAllocation(10000n, tenders);

    expect(res.total_allocated_minor).toBe(6000n);
    expect(res.remaining_balance_minor).toBe(4000n);
    expect(res.change_due_minor).toBe(0n);
    expect(res.is_fully_paid).toBe(false);
  });

  it('rejects non-cash over-tendering (Rule 7/26: cannot over-charge cards to give cash change)', () => {
    // Total: $50.00 (5000 minor)
    // Tender: $60.00 Card (6000 minor) -> Throws NonCashOverTenderDomainError
    const tenders = [
      {
        idempotency_key: 'idem_card_over',
        tender_type: DomainPaymentTenderTypes.CARD,
        amount_minor: 6000n,
      },
    ];

    expect(() => calculateMultiTenderAllocation(5000n, tenders)).toThrow(
      NonCashOverTenderDomainError,
    );
  });

  it('rejects duplicate idempotency keys within the same split request (Rule 19)', () => {
    const tenders = [
      {
        idempotency_key: 'idem_dup',
        tender_type: DomainPaymentTenderTypes.CASH,
        amount_minor: 2000n,
      },
      {
        idempotency_key: 'idem_dup',
        tender_type: DomainPaymentTenderTypes.CARD,
        amount_minor: 3000n,
      },
    ];

    expect(() => calculateMultiTenderAllocation(5000n, tenders)).toThrow(
      DuplicateTenderIdempotencyKeyError,
    );
  });

  it('rejects zero or negative tender amounts', () => {
    expect(() =>
      calculateMultiTenderAllocation(5000n, [
        {
          idempotency_key: 'idem_zero',
          tender_type: DomainPaymentTenderTypes.CASH,
          amount_minor: 0n,
        },
      ]),
    ).toThrow(PaymentDomainError);

    expect(() =>
      calculateMultiTenderAllocation(5000n, [
        {
          idempotency_key: 'idem_neg',
          tender_type: DomainPaymentTenderTypes.CASH,
          amount_minor: -100n,
        },
      ]),
    ).toThrow(PaymentDomainError);
  });
});
