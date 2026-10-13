import { z } from 'zod';

export const PromotionTypeSchema = z.enum([
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'BUY_X_GET_Y',
  'BUNDLE_PRICE',
]);

export const PromotionStackingRuleSchema = z.enum([
  'EXCLUSIVE',
  'STACKABLE',
  'BEST_DEAL',
]);

export const CostBasisTypeSchema = z.enum([
  'INVENTORY_COST',
  'LANDED_COST',
  'CONFIGURED_COST',
]);

export const CreateCustomerContractSchema = z.object({
  contract_number: z.string().trim().min(1).max(50),
  customer_id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime().nullable().optional(),
});

export const AddContractItemSchema = z.object({
  variant_id: z.string().min(1),
  min_quantity: z.number().int().positive().optional().default(1),
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

export const CreatePromotionCampaignSchema = z.object({
  campaign_code: z.string().trim().min(1).max(50).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(255).optional(),
  promotion_type: PromotionTypeSchema,
  stacking_rule: PromotionStackingRuleSchema.optional().default('BEST_DEAL'),
  value_minor_or_bp: z
    .string()
    .regex(/^\d+$/, 'value_minor_or_bp must be an integer string'),
  buy_quantity: z.number().int().positive().optional(),
  get_quantity: z.number().int().positive().optional(),
  get_discount_percent_bp: z.number().int().min(0).max(10000).optional(),
  bundle_variant_ids: z.array(z.string().min(1)).optional(),
  bundle_fixed_price_minor: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  min_subtotal_minor: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  max_discount_minor: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  eligible_variant_ids: z.array(z.string().min(1)).optional(),
  eligible_customer_group: z.string().trim().max(50).optional(),
  eligible_channel: z.string().trim().max(50).optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  budget_limit_minor: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  usage_limit_total: z.number().int().positive().optional(),
  usage_limit_per_customer: z.number().int().positive().optional(),
  coupon_code: z.string().trim().max(50).toUpperCase().optional(),
  requires_coupon: z.boolean().optional().default(false),
});

export const RedeemPromotionSchema = z.object({
  campaign_id: z.string().min(1),
  coupon_code: z.string().trim().toUpperCase().optional(),
  order_id: z.string().min(1),
  customer_id: z.string().optional(),
  discount_amount_minor: z
    .string()
    .regex(/^\d+$/, 'discount_amount_minor must be an integer string'),
  operation_id: z.string().min(1),
});

export const CreateMarginPolicySchema = z.object({
  name: z.string().trim().min(1).max(100),
  min_margin_percent_bp: z.number().int().min(0).max(10000), // e.g. 1500 = 15%
  max_discount_percent_bp: z.number().int().min(0).max(10000), // e.g. 3000 = 30%
  cost_basis_type: CostBasisTypeSchema.optional().default('INVENTORY_COST'),
  requires_approval: z.boolean().optional().default(true),
});

export const RequestPriceOverrideSchema = z.object({
  order_id: z.string().optional(),
  variant_id: z.string().min(1),
  original_price_minor: z.string().regex(/^\d+$/),
  requested_price_minor: z.string().regex(/^\d+$/),
  cost_minor: z.string().regex(/^\d+$/),
  reason: z.string().trim().min(1).max(255),
  requested_by: z.string().min(1),
  operation_id: z.string().min(1),
});

export const DecidePriceOverrideSchema = z.object({
  override_id: z.string().min(1),
  decision: z.enum(['APPROVE', 'REJECT']),
  decided_by: z.string().min(1),
});

export const ResolvePriceItemInputSchema = z.object({
  variant_id: z.string().min(1),
  quantity: z.number().int().positive(),
  base_unit_price_minor: z.string().regex(/^\d+$/),
  unit_cost_minor: z.string().regex(/^\d+$/).optional(),
  customer_id: z.string().optional(),
  customer_group: z.string().optional(),
  channel: z.string().optional(),
  currency_code: z.string().length(3).optional(),
  tax_rate_ids: z.array(z.string().min(1)).optional(),
  coupon_code: z.string().optional(),
});
