import { z } from 'zod';

export const LoyaltyTierCodeSchema = z.enum([
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
]);

export const LoyaltyTransactionTypeSchema = z.enum([
  'EARN',
  'REDEEM',
  'EXPIRE',
  'REVERSAL',
  'MANUAL_ADJUSTMENT',
]);

export const GiftCardStatusSchema = z.enum([
  'INACTIVE',
  'ACTIVE',
  'DEPLETED',
  'EXPIRED',
  'FROZEN',
]);

export const GiftCardTransactionTypeSchema = z.enum([
  'ISSUE',
  'RELOAD',
  'REDEEM',
  'REFUND',
  'ESCHEATMENT_FORFEIT',
]);

export const LoyaltyTierDefSchema = z.object({
  tier_code: LoyaltyTierCodeSchema,
  tier_name: z.string().trim().min(1).max(100),
  min_spend_minor: z.string().regex(/^\d+$/, 'min_spend_minor must be an integer minor units string'),
  multiplier_bp: z.number().int().min(1000).max(100000), // 0.1x to 10.0x
  priority: z.number().int().min(1).max(10),
});

export const CreateLoyaltyProgramSchema = z.object({
  name: z.string().trim().min(1, 'Program name is required').max(255),
  points_per_currency_minor: z.number().int().positive().default(100),
  points_currency: z.string().trim().length(3).default('USD'),
  redemption_ratio_bp: z.number().int().min(1).max(10000).default(100),
  max_redemption_percent_bp: z.number().int().min(1).max(10000).default(5000),
  points_validity_days: z.number().int().min(1).max(3650).default(365),
  tiers: z.array(LoyaltyTierDefSchema).optional(),
});

export const EarnLoyaltyPointsSchema = z.object({
  customer_id: z.string().trim().min(1, 'Customer ID is required'),
  spend_minor: z.string().regex(/^\d+$/, 'Spend must be an integer minor units string'),
  order_id: z.string().trim().optional(),
  operation_id: z.string().trim().min(1, 'Idempotency operation_id is required'),
});

export const RedeemLoyaltyPointsSchema = z.object({
  customer_id: z.string().trim().min(1, 'Customer ID is required'),
  points_to_redeem: z.number().int().positive('points_to_redeem must be strictly positive'),
  order_total_minor: z.string().regex(/^\d+$/, 'order_total_minor must be an integer minor units string'),
  order_id: z.string().trim().optional(),
  operation_id: z.string().trim().min(1, 'Idempotency operation_id is required'),
});

export const IssueGiftCardSchema = z.object({
  initial_balance_minor: z.string().regex(/^\d+$/, 'initial_balance_minor must be an integer minor units string'),
  currency: z.string().trim().length(3).default('USD'),
  pin: z.string().trim().min(4).max(8).optional(),
  customer_id: z.string().trim().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  operation_id: z.string().trim().min(1, 'Idempotency operation_id is required'),
});

export const RedeemGiftCardSchema = z.object({
  card_code: z.string().trim().min(1, 'Card code is required'),
  pin: z.string().trim().min(1).optional(),
  amount_minor: z.string().regex(/^\d+$/, 'Redemption amount must be an integer minor units string'),
  order_id: z.string().trim().optional(),
  operation_id: z.string().trim().min(1, 'Idempotency operation_id is required'),
});

export const ReloadGiftCardSchema = z.object({
  card_code: z.string().trim().min(1, 'Card code is required'),
  amount_minor: z.string().regex(/^\d+$/, 'Reload amount must be an integer minor units string'),
  operation_id: z.string().trim().min(1, 'Idempotency operation_id is required'),
});

export const InquireGiftCardSchema = z.object({
  card_code: z.string().trim().min(1, 'Card code is required'),
  pin: z.string().trim().optional(),
});
