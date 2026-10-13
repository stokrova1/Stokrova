import { z } from 'zod';

export const SalesChannelTypes = ['POS', 'ECOMMERCE', 'B2B_WHOLESALE', 'MANUAL'] as const;

export const SalesOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'RESERVED',
  'PICKING',
  'PACKING',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
]);

export const OrderFulfillmentStatusSchema = z.enum([
  'UNFULFILLED',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
]);

const NonNegativeIntegerOrStringSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((val) => val.toString());

export const CreateSalesOrderLineSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity: z.number().int().positive('Quantity must be strictly positive'),
  unit_price_minor: NonNegativeIntegerOrStringSchema,
  discount_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  tax_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
});

export const CreateSalesOrderSchema = z.object({
  channel_type: z.enum(SalesChannelTypes),
  branch_id: z.string().min(1, 'branch_id is required'),
  warehouse_id: z.string().min(1, 'warehouse_id is required'),
  customer_id: z.string().trim().nullable().optional(),
  customer_name: z.string().trim().max(100).nullable().optional(),
  customer_email: z.string().trim().email().nullable().optional(),
  customer_phone: z.string().trim().max(30).nullable().optional(),
  shipping_address: z.string().trim().max(255).nullable().optional(),
  billing_address: z.string().trim().max(255).nullable().optional(),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  pos_session_id: z.string().trim().nullable().optional(),
  pos_register_id: z.string().trim().nullable().optional(),
  lines: z.array(CreateSalesOrderLineSchema).min(1, 'Order must contain at least one line item'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const FulfillOrderLinesSchema = z.object({
  fulfillment_items: z
    .array(
      z.object({
        line_id: z.string().min(1, 'line_id is required'),
        quantity_to_fulfill: z.number().int().positive('quantity_to_fulfill must be positive'),
      }),
    )
    .min(1, 'At least one line item must be fulfilled'),
  tracking_number: z.string().trim().max(100).nullable().optional(),
  carrier: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const DispatchSalesOrderSchema = z.object({
  tracking_number: z.string().trim().max(100).nullable().optional(),
  carrier: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type ValidatedCreateSalesOrder = z.infer<typeof CreateSalesOrderSchema>;
export type ValidatedFulfillOrderLines = z.infer<typeof FulfillOrderLinesSchema>;
export type ValidatedDispatchSalesOrder = z.infer<typeof DispatchSalesOrderSchema>;
