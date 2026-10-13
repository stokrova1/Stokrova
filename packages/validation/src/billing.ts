/**
 * STOKROVA — SaaS Billing, Usage Metering & Subscription Entitlements Validation Schemas
 * Rules 4, 8, 14, 21, 26: Pure minor unit string validation, strict tenant ID constraints,
 * idempotent usage recording.
 */

import { z } from 'zod';

export const SubscriptionTierSchema = z.enum([
  'SOLO_TRADER',
  'RETAIL_STARTER',
  'WHOLESALE_GROWTH',
  'ENTERPRISE_LOGISTICS',
  'CUSTOM',
]);

export const BillingCycleSchema = z.enum(['MONTHLY', 'ANNUAL']);

export const SubscriptionStatusSchema = z.enum([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'SUSPENDED',
]);

export const FeatureFlagKeySchema = z.enum([
  'manufacturing_enabled',
  'edi_enabled',
  'b2b_portal_enabled',
  'multi_currency_enabled',
  'offline_sync_enabled',
  'advanced_crm_enabled',
  'custom_webhooks_enabled',
  'automated_replenishment_enabled',
]);

export const CreateSubscriptionSchema = z.object({
  tenant_id: z.string().trim().min(1, 'Tenant ID is required'),
  tier: SubscriptionTierSchema,
  billing_cycle: BillingCycleSchema.default('MONTHLY'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be 3-letter ISO code')
    .default('USD')
    .transform((v) => v.toUpperCase()),
  trial_days: z.number().int().min(0).max(90).optional(),
});

export const ChangeSubscriptionPlanSchema = z.object({
  target_tier: SubscriptionTierSchema,
  effective_immediately: z.boolean().default(true),
});

export const UpdateSubscriptionStatusSchema = z.object({
  status: SubscriptionStatusSchema,
  reason: z.string().trim().max(255).optional(),
});

export const RecordMeteredUsageSchema = z.object({
  tenant_id: z.string().trim().min(1, 'Tenant ID is required'),
  metric: z.enum(['api_calls', 'orders', 'storage_bytes', 'webhook_deliveries']),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  idempotency_key: z
    .string()
    .trim()
    .min(8, 'Idempotency key must be at least 8 characters')
    .max(128),
});

export const ProcessInvoicePaymentSchema = z.object({
  invoice_id: z.string().trim().min(1, 'Invoice ID is required'),
  payment_gateway_reference: z
    .string()
    .trim()
    .min(1, 'Payment gateway reference is required'),
  amount_paid_minor: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Amount paid must be non-negative integer minor units'),
});

export type ValidatedCreateSubscription = z.infer<typeof CreateSubscriptionSchema>;
export type ValidatedChangeSubscriptionPlan = z.infer<typeof ChangeSubscriptionPlanSchema>;
export type ValidatedUpdateSubscriptionStatus = z.infer<typeof UpdateSubscriptionStatusSchema>;
export type ValidatedRecordMeteredUsage = z.infer<typeof RecordMeteredUsageSchema>;
export type ValidatedProcessInvoicePayment = z.infer<typeof ProcessInvoicePaymentSchema>;
