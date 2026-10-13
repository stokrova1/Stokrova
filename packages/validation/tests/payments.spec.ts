import { describe, it, expect } from 'vitest';
import {
  CreateInvoiceRequestSchema,
  RecordPaymentRequestSchema,
  ConfirmPaymentRequestSchema,
  PrintReceiptRequestSchema,
} from '../src/payments.js';

describe('Payments & Receipts Validation Schemas', () => {
  it('validates invoice creation requests', () => {
    const valid = CreateInvoiceRequestSchema.safeParse({
      order_id: 'ord_1001',
      total_minor: 250000,
    });
    expect(valid.success).toBe(true);

    const zeroAmount = CreateInvoiceRequestSchema.safeParse({
      order_id: 'ord_1001',
      total_minor: 0,
    });
    expect(zeroAmount.success).toBe(false);
  });

  it('validates payment recording payloads for diverse payment methods', () => {
    const validCash = RecordPaymentRequestSchema.safeParse({
      order_id: 'ord_1001',
      amount_minor: 150000,
      payment_method: 'CASH',
      register_session_id: 'ses_123',
    });
    expect(validCash.success).toBe(true);

    const validTransfer = RecordPaymentRequestSchema.safeParse({
      order_id: 'ord_1001',
      amount_minor: 100000,
      payment_method: 'BANK_TRANSFER',
      provider_reference: 'NIP-TXN-987654321',
    });
    expect(validTransfer.success).toBe(true);

    const invalidMethod = RecordPaymentRequestSchema.safeParse({
      order_id: 'ord_1001',
      amount_minor: 50000,
      payment_method: 'CRYPTO_UNSUPPORTED',
    });
    expect(invalidMethod.success).toBe(false);
  });

  it('validates receipt print requests', () => {
    const valid = PrintReceiptRequestSchema.safeParse({
      order_id: 'ord_1001',
      payment_id: 'pay_001',
      register_id: 'reg_001',
    });
    expect(valid.success).toBe(true);
  });
});
