import { z } from 'zod';

export const RebateTypeSchema = z.enum([
  'CUSTOMER_VOLUME',
  'CUSTOMER_SPEND',
  'SUPPLIER_VOLUME',
  'SUPPLIER_SPEND',
]);

export const RebateCalculationMethodSchema = z.enum([
  'GRADUATED_TIERS',
  'RETROACTIVE_ALL_UNITS',
]);

export const CreateRebateAgreementSchema = z.object({
  agreement_number: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  rebate_type: RebateTypeSchema,
  counterparty_type: z.enum(['CUSTOMER', 'SUPPLIER']),
  counterparty_id: z.string().min(1),
  currency_code: z.string().trim().length(3).toUpperCase().optional().default('USD'),
  calculation_method: RebateCalculationMethodSchema.optional().default('GRADUATED_TIERS'),
  settlement_frequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).optional().default('QUARTERLY'),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
});

export const AddRebateTierSchema = z.object({
  tier_number: z.number().int().positive(),
  threshold_quantity: z.number().int().positive().optional(),
  threshold_amount_minor: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  rebate_rate_bp: z.number().int().min(0).max(10000), // e.g. 500 = 5.0%
  fixed_rebate_per_unit_minor: z
    .string()
    .regex(/^\d+$/)
    .optional(),
});

export const CalculateRebateAccrualSchema = z.object({
  agreement_id: z.string().min(1),
  period_identifier: z.string().trim().min(1).max(20),
  eligible_quantity: z.number().int().min(0),
  eligible_spend_minor: z.string().regex(/^\d+$/),
  operation_id: z.string().optional(),
});

export const SettleRebateSchema = z.object({
  accrual_id: z.string().min(1),
  settlement_reference: z.string().trim().min(1).max(100),
  credit_note_reference: z.string().trim().max(100).optional(),
  settled_by: z.string().min(1),
  operation_id: z.string().min(1),
});
