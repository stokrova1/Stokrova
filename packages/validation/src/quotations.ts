import { z } from 'zod';

const NonNegativeIntegerOrStringSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((val) => val.toString());

export const QuotationStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'EXPIRED',
  'CANCELLED',
  'CONVERTED',
]);

export const CreateQuotationLineSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity: z.number().int().positive('Quantity must be strictly positive'),
  unit_price_minor: NonNegativeIntegerOrStringSchema.optional(),
  discount_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  tax_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
});

export const CreateQuotationSchema = z.object({
  customer_id: z.string().trim().nullable().optional(),
  customer_name: z.string().trim().max(100).nullable().optional(),
  customer_email: z.string().trim().email().nullable().optional(),
  customer_phone: z.string().trim().max(30).nullable().optional(),
  branch_id: z.string().min(1, 'branch_id is required'),
  warehouse_id: z.string().min(1, 'warehouse_id is required'),
  valid_until: z.string().datetime().nullable().optional(),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  lines: z.array(CreateQuotationLineSchema).min(1, 'Quotation must contain at least one line item'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const UpdateQuotationSchema = z.object({
  customer_id: z.string().trim().nullable().optional(),
  customer_name: z.string().trim().max(100).nullable().optional(),
  customer_email: z.string().trim().email().nullable().optional(),
  customer_phone: z.string().trim().max(30).nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  lines: z.array(CreateQuotationLineSchema).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const ConvertQuotationSchema = z.object({
  idempotency_key: z.string().trim().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type ValidatedCreateQuotation = z.infer<typeof CreateQuotationSchema>;
export type ValidatedUpdateQuotation = z.infer<typeof UpdateQuotationSchema>;
export type ValidatedConvertQuotation = z.infer<typeof ConvertQuotationSchema>;
