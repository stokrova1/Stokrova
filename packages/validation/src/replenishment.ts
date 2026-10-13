import { z } from 'zod';

export const StockHealthStatusSchema = z.enum([
  'CRITICAL_STOCKOUT',
  'REORDER_TRIGGERED',
  'HEALTHY',
  'OVERSTOCKED',
]);

export const ReplenishmentStrategySchema = z.enum([
  'MIN_MAX',
  'REORDER_POINT_SAFETY_STOCK',
  'PERIODIC_REVIEW',
]);

export const SourcingMethodSchema = z.enum([
  'PURCHASE_ORDER',
  'INTERNAL_TRANSFER',
  'MANUFACTURING',
]);

export const RecommendationStatusSchema = z.enum([
  'PROPOSED',
  'APPROVED',
  'REJECTED',
  'CONVERTED',
  'CANCELLED',
]);

export const CreateReplenishmentRuleSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  strategy: ReplenishmentStrategySchema.optional().default('MIN_MAX'),
  min_quantity: z.number().int().nonnegative('Min quantity must be non-negative'),
  max_quantity: z.number().int().positive('Max quantity must be positive'),
  safety_stock: z.number().int().nonnegative().optional().default(0),
  reorder_point: z.number().int().nonnegative().optional().default(0),
  lead_time_days: z.number().int().nonnegative().optional().default(1),
  order_multiple: z.number().int().positive().optional().default(1),
  min_order_quantity: z.number().int().positive().optional().default(1),
  primary_vendor_id: z.string().nullable().optional(),
  upstream_warehouse_id: z.string().nullable().optional(),
  preferred_sourcing: SourcingMethodSchema.optional().default('PURCHASE_ORDER'),
  is_active: z.boolean().optional().default(true),
});

export const UpdateReplenishmentRuleSchema = z.object({
  strategy: ReplenishmentStrategySchema.optional(),
  min_quantity: z.number().int().nonnegative().optional(),
  max_quantity: z.number().int().positive().optional(),
  safety_stock: z.number().int().nonnegative().optional(),
  reorder_point: z.number().int().nonnegative().optional(),
  lead_time_days: z.number().int().nonnegative().optional(),
  order_multiple: z.number().int().positive().optional(),
  min_order_quantity: z.number().int().positive().optional(),
  primary_vendor_id: z.string().nullable().optional(),
  upstream_warehouse_id: z.string().nullable().optional(),
  preferred_sourcing: SourcingMethodSchema.optional(),
  is_active: z.boolean().optional(),
});

export const EvaluateReplenishmentSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  variant_ids: z.array(z.string().min(1)).optional(),
});

export const ApproveRecommendationSchema = z.object({
  override_quantity: z.number().int().positive().optional(),
  approved_by: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const ConvertRecommendationSchema = z.object({
  operator_id: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
