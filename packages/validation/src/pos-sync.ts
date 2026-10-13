/**
 * Offline POS Synchronization & Conflict Resolution Validation Schemas (Phase 3E)
 * Zero external runtime dependencies other than Zod.
 * Benchmarked against TetherPOS, QuickStock Sync, Odoo POS, and ERPNext (Rule 26).
 */

import { z } from 'zod';

export const OfflinePosTransactionTypes = ['SALE', 'RETURN', 'CASH_MOVEMENT'] as const;
export const OfflinePosTransactionTypeSchema = z.enum(OfflinePosTransactionTypes);

export const PosSyncResolutionStatuses = [
  'PROCESSED',
  'IDEMPOTENT_DUPLICATE',
  'CONFLICT_RECONCILED',
  'REJECTED',
] as const;
export const PosSyncResolutionStatusSchema = z.enum(PosSyncResolutionStatuses);

const NonNegativeIntegerOrStringSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((val) => val.toString());

export const OfflineSaleLineItemInputSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity: z.number().int().positive('Quantity must be strictly positive'),
  unit_price_minor: NonNegativeIntegerOrStringSchema,
  discount_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  tax_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
});

import { PaymentTenderTypes } from './payments.js';

export const OfflineSalePaymentInputSchema = z.object({
  tender_type: z.enum(PaymentTenderTypes),
  amount_minor: NonNegativeIntegerOrStringSchema,
  tender_reference: z.string().trim().max(100).nullable().optional(),
  card_auth_code: z.string().trim().max(100).nullable().optional(),
  idempotency_key: z.string().min(1, 'idempotency_key is required'),
});

export const OfflineSalePayloadSchema = z.object({
  customer_id: z.string().trim().nullable().optional(),
  customer_name: z.string().trim().max(100).nullable().optional(),
  lines: z.array(OfflineSaleLineItemInputSchema).min(1, 'At least one line item is required'),
  payments: z.array(OfflineSalePaymentInputSchema).min(1, 'At least one payment tender is required'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const OfflineCashMovementPayloadSchema = z.object({
  movement_type: z.enum(['CASH_IN', 'CASH_OUT', 'CASH_DROP']),
  amount_minor: NonNegativeIntegerOrStringSchema,
  reason: z.string().trim().min(1, 'Reason is required').max(255),
  idempotency_key: z.string().min(1, 'idempotency_key is required'),
});

export const OfflinePosTransactionEnvelopeSchema = z.object({
  client_tx_id: z.string().min(1, 'client_tx_id is required'),
  device_id: z.string().min(1, 'device_id is required'),
  pos_session_id: z.string().min(1, 'pos_session_id is required'),
  client_sequence: z.number().int().nonnegative('client_sequence must be non-negative'),
  client_timestamp: z.string().min(1, 'client_timestamp is required'),
  tx_type: OfflinePosTransactionTypeSchema,
  idempotency_key: z.string().min(1, 'idempotency_key is required'),
  sale_payload: OfflineSalePayloadSchema.nullable().optional(),
  cash_movement_payload: OfflineCashMovementPayloadSchema.nullable().optional(),
  signature: z.string().nullable().optional(),
});

export const PosSyncBatchRequestSchema = z.object({
  device_id: z.string().min(1, 'device_id is required'),
  pos_register_id: z.string().min(1, 'pos_register_id is required'),
  pos_session_id: z.string().min(1, 'pos_session_id is required'),
  transactions: z
    .array(OfflinePosTransactionEnvelopeSchema)
    .min(1, 'Batch must contain at least one transaction'),
});

export type ValidatedOfflinePosTransactionEnvelope = z.infer<
  typeof OfflinePosTransactionEnvelopeSchema
>;
export type ValidatedPosSyncBatchRequest = z.infer<typeof PosSyncBatchRequestSchema>;
