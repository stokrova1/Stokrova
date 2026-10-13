import { z } from 'zod';

export const PosSessionStatusSchema = z.enum([
  'OPEN',
  'SUSPENDED',
  'CLOSING',
  'CLOSED',
  'RECONCILED',
]);

export const PosCashMovementTypeSchema = z.enum([
  'OPENING_FLOAT',
  'CASH_SALE',
  'CASH_REFUND',
  'CASH_IN',
  'CASH_OUT',
  'CASH_DROP',
]);

export const TillVarianceCategorySchema = z.enum(['BALANCED', 'SURPLUS', 'DEFICIT']);

export const CashDenominationCountSchema = z.object({
  denomination_minor: z
    .string()
    .regex(/^\d+$/, 'denomination_minor must be a positive integer string')
    .refine((v) => BigInt(v) > 0n, 'denomination_minor must be strictly positive'),
  count: z.number().int().min(0, 'count cannot be negative'),
});

export const CreatePosRegisterConfigSchema = z.object({
  branch_id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(30).toUpperCase(),
  warehouse_id: z.string().min(1),
  default_price_list_id: z.string().min(1).nullable().optional(),
  blind_closing_enabled: z.boolean().optional().default(true),
  max_cash_limit_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .transform((val) => val.toString())
    .optional()
    .default('1000000'), // Default $10,000 threshold for drop alert
  max_allowed_variance_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .transform((val) => val.toString())
    .optional()
    .default('1000'), // Default $10.00 variance before supervisor required
  receipt_header: z.string().max(255).nullable().optional(),
  receipt_footer: z.string().max(255).nullable().optional(),
  open_cash_drawer_on_sale: z.boolean().optional().default(true),
});

export const UpdatePosRegisterConfigSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  warehouse_id: z.string().min(1).optional(),
  default_price_list_id: z.string().min(1).nullable().optional(),
  blind_closing_enabled: z.boolean().optional(),
  max_cash_limit_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .transform((val) => val.toString())
    .optional(),
  max_allowed_variance_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .transform((val) => val.toString())
    .optional(),
  receipt_header: z.string().max(255).nullable().optional(),
  receipt_footer: z.string().max(255).nullable().optional(),
  open_cash_drawer_on_sale: z.boolean().optional(),
});

export const OpenPosSessionSchema = z.object({
  register_id: z.string().min(1),
  opening_float_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .transform((val) => val.toString()),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  denominations: z.array(CashDenominationCountSchema).optional(),
  notes: z.string().max(500).optional(),
});

export const RecordPosCashInSchema = z.object({
  amount_minor: z
    .union([z.string().regex(/^[1-9]\d*$/), z.number().int().positive()])
    .transform((val) => val.toString()),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  reason: z.string().trim().min(1).max(255),
});

export const RecordPosCashOutSchema = z.object({
  amount_minor: z
    .union([z.string().regex(/^[1-9]\d*$/), z.number().int().positive()])
    .transform((val) => val.toString()),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  reason: z.string().trim().min(1).max(255),
  authorized_by_user_id: z.string().min(1).optional(),
});

export const RecordPosCashDropSchema = z.object({
  amount_minor: z
    .union([z.string().regex(/^[1-9]\d*$/), z.number().int().positive()])
    .transform((val) => val.toString()),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  safe_drop_envelope: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(255).optional(),
  authorized_by_user_id: z.string().min(1).optional(),
});

export const ClosePosSessionSchema = z.object({
  closing_actual_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .transform((val) => val.toString()),
  denominations: z.array(CashDenominationCountSchema).optional(),
  supervisor_user_id: z.string().min(1).optional(),
  supervisor_override_reason: z.string().trim().max(255).optional(),
  notes: z.string().max(500).optional(),
});

export const ReconcilePosSessionSchema = z.object({
  supervisor_user_id: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const PosCheckoutLineItemSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity: z.number().int().positive('Quantity must be strictly positive'),
  custom_unit_price_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .transform((val) => val.toString())
    .optional(),
  line_discount_percent_bp: z.number().int().min(0).max(10000).optional().default(0),
  tax_rate_ids: z.array(z.string().min(1)).optional(),
});

export const PosCheckoutTenderSchema = z.object({
  tender_type: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'STORE_CREDIT', 'GIFT_CARD', 'LOYALTY_POINTS']),
  tendered_minor: z
    .union([z.string().regex(/^\d+$/), z.number().int().positive()])
    .transform((val) => val.toString()),
  idempotency_key: z.string().min(1, 'idempotency_key is required for tender'),
  provider_reference: z.string().trim().max(100).optional(),
  terminal_id: z.string().trim().max(50).optional(),
});

export const PosCheckoutSchema = z.object({
  idempotency_key: z.string().min(1, 'idempotency_key is required for checkout'),
  pos_session_id: z.string().min(1, 'pos_session_id is required'),
  pos_register_id: z.string().min(1, 'pos_register_id is required'),
  customer_id: z.string().trim().nullable().optional(),
  items: z.array(PosCheckoutLineItemSchema).min(1, 'Checkout must contain at least one item'),
  tenders: z.array(PosCheckoutTenderSchema).min(1, 'At least one tender is required'),
  promo_code: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type ValidatedPosCheckout = z.infer<typeof PosCheckoutSchema>;
