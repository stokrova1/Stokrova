import { z } from 'zod';

export const TaxInclusionTypeSchema = z.enum(['INCLUSIVE', 'EXCLUSIVE']);

export const TaxComputationTypeSchema = z.enum(['PERCENTAGE', 'FIXED_PER_UNIT']);

export const DiscountTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);

export const CreatePriceListSchema = z.object({
  code: z.string().trim().min(1).max(30).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  currency_code: z.string().trim().length(3).toUpperCase(),
  is_default: z.boolean().optional().default(false),
  customer_group: z.string().trim().max(50).nullable().optional(),
  valid_from: z.string().datetime().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
});

export const CreatePriceListRuleSchema = z.object({
  pricelist_id: z.string().min(1),
  variant_id: z.string().min(1),
  min_quantity: z.number().int().positive().default(1),
  fixed_price_minor: z
    .string()
    .regex(/^\d+$/, 'fixed_price_minor must be an integer string')
    .nullable()
    .optional(),
  discount_percent_bp: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .nullable()
    .optional(),
});

export const CreateTaxRateSchema = z.object({
  code: z.string().trim().min(1).max(30).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  rate_bp: z.number().int().min(0).max(100000), // Up to 1000%
  computation_type: TaxComputationTypeSchema.optional().default('PERCENTAGE'),
  inclusion_type: TaxInclusionTypeSchema.optional().default('EXCLUSIVE'),
});

export const CreateDiscountPromotionSchema = z.object({
  code: z.string().trim().min(1).max(30).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  discount_type: DiscountTypeSchema,
  value_minor_or_bp: z
    .string()
    .regex(/^\d+$/, 'value_minor_or_bp must be an integer string'),
  max_discount_minor: z
    .string()
    .regex(/^\d+$/, 'max_discount_minor must be an integer string')
    .nullable()
    .optional(),
  min_subtotal_minor: z
    .string()
    .regex(/^\d+$/, 'min_subtotal_minor must be an integer string')
    .nullable()
    .optional(),
  valid_from: z.string().datetime().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
});

export const CalculateCartItemInputSchema = z.object({
  variant_id: z.string().min(1),
  quantity: z.number().positive(),
  base_unit_price_minor: z
    .string()
    .regex(/^\d+$/, 'base_unit_price_minor must be an integer string'),
  custom_unit_price_minor: z
    .string()
    .regex(/^\d+$/, 'custom_unit_price_minor must be an integer string')
    .nullable()
    .optional(),
  line_discount_percent_bp: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .nullable()
    .optional(),
  tax_rate_ids: z.array(z.string()).optional(),
});

export const CalculateCartSchema = z.object({
  currency_code: z.string().trim().length(3).toUpperCase(),
  pricelist_id: z.string().nullable().optional(),
  promo_code: z.string().trim().toUpperCase().nullable().optional(),
  items: z.array(CalculateCartItemInputSchema).min(1),
});
