import { z } from 'zod';

export const PaymentMethods = [
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'STORE_CREDIT',
] as const;

export const PaymentStatuses = [
  'PENDING',
  'CONFIRMED',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
] as const;

export const InvoiceStatuses = [
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
] as const;

const PositiveMinorSchema = z.union([
  z.number().int().positive('Amount must be strictly positive'),
  z.string().regex(/^[1-9]\d*$/, 'Amount minor must be a positive integer representation'),
]);

export const CreateInvoiceRequestSchema = z.object({
  order_id: z.string().min(1, 'order_id is required'),
  total_minor: PositiveMinorSchema,
  currency_code: z.string().length(3).toUpperCase().optional().default('NGN'),
  due_date: z.string().datetime().optional(),
});

export const RecordPaymentRequestSchema = z.object({
  invoice_id: z.string().optional(),
  order_id: z.string().optional(),
  register_session_id: z.string().optional(),
  amount_minor: PositiveMinorSchema,
  currency_code: z.string().length(3).toUpperCase().optional().default('NGN'),
  payment_method: z.enum(PaymentMethods),
  provider_reference: z.string().max(100).optional(),
  operation_id: z.string().max(100).optional(),
});

export const ConfirmPaymentRequestSchema = z.object({
  verification_reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const PrintReceiptRequestSchema = z.object({
  order_id: z.string().min(1, 'order_id is required'),
  payment_id: z.string().optional(),
  register_id: z.string().optional(),
});

export type ValidatedCreateInvoiceRequest = z.infer<typeof CreateInvoiceRequestSchema>;
export type ValidatedRecordPaymentRequest = z.infer<typeof RecordPaymentRequestSchema>;
export type ValidatedConfirmPaymentRequest = z.infer<typeof ConfirmPaymentRequestSchema>;
export type ValidatedPrintReceiptRequest = z.infer<typeof PrintReceiptRequestSchema>;

export const PaymentTenderTypes = [
  'CASH',
  'CARD',
  'STORE_CREDIT',
  'GIFT_CARD',
  'LOYALTY_POINTS',
  'BANK_TRANSFER',
] as const;

export const PaymentTenderInputSchema = z.object({
  idempotency_key: z.string().trim().min(1).max(128),
  tender_type: z.enum(PaymentTenderTypes),
  amount_minor: PositiveMinorSchema.transform((val) => val.toString()),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  provider_reference: z.string().trim().max(100).optional(),
  terminal_id: z.string().trim().max(100).optional(),
  customer_account_id: z.string().trim().optional(),
  gift_card_code: z.string().trim().optional(),
  notes: z.string().trim().max(255).optional(),
});

export const ProcessMultiTenderCheckoutSchema = z.object({
  order_id: z.string().min(1, 'order_id is required'),
  total_payable_minor: PositiveMinorSchema.transform((val) => val.toString()),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  pos_session_id: z.string().optional(),
  tenders: z.array(PaymentTenderInputSchema).min(1, 'At least one payment tender must be provided'),
});

export type ValidatedProcessMultiTenderCheckout = z.infer<typeof ProcessMultiTenderCheckoutSchema>;
