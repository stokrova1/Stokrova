import { z } from 'zod';

export const B2bOrganizationRoleSchema = z.enum([
  'CORPORATE_HOLDING',
  'SUBSIDIARY',
  'BUYING_CENTER',
]);

export const B2bCreditStatusSchema = z.enum([
  'ACTIVE',
  'CREDIT_HOLD',
  'SUSPENDED',
  'REVIEW_REQUIRED',
]);

export const RequisitionStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CONVERTED_TO_ORDER',
  'CANCELLED',
]);

export const CreateB2bOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(255),
  parent_org_id: z.string().trim().optional().nullable(),
  tax_identifier: z.string().trim().optional().nullable(),
  org_type: B2bOrganizationRoleSchema.default('SUBSIDIARY'),
  credit_limit_minor: z
    .string()
    .regex(/^\d+$/, 'Credit limit must be an integer minor units string')
    .default('0'),
  payment_terms_days: z.number().int().min(0).max(365).default(30),
  currency: z.string().trim().length(3).default('USD'),
});

export const UpdateB2bCreditLimitSchema = z.object({
  credit_limit_minor: z
    .string()
    .regex(/^\d+$/, 'Credit limit must be an integer minor units string'),
  status: B2bCreditStatusSchema.optional(),
  hold_reason: z.string().trim().optional().nullable(),
});

export const SetB2bContractPriceSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  custom_price_minor: z
    .string()
    .regex(/^\d+$/, 'Custom price must be an integer minor units string'),
  currency: z.string().trim().length(3).default('USD'),
  min_quantity: z.number().int().positive().default(1),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
});

export const VolumeTierBreakSchema = z.object({
  min_quantity: z.number().int().positive(),
  discount_bp: z.number().int().min(0).max(10000).optional(),
  unit_price_minor: z.string().regex(/^\d+$/).optional(),
});

export const EvaluateB2bPriceSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  quantity: z.number().int().positive().default(1),
  catalog_list_price_minor: z
    .string()
    .regex(/^\d+$/, 'Catalog list price must be an integer minor units string'),
  contract_price_minor: z.string().regex(/^\d+$/).optional(),
  volume_breaks: z.array(VolumeTierBreakSchema).optional(),
  group_discount_bp: z.number().int().min(0).max(10000).optional(),
});

export const CheckCreditExposureSchema = z.object({
  organization_id: z.string().trim().min(1, 'Organization ID is required'),
  unpaid_invoices_minor: z.string().regex(/^\d+$/),
  pending_orders_minor: z.string().regex(/^\d+$/),
  overdue_days: z.number().int().min(0).default(0).optional(),
  grace_period_days: z.number().int().min(0).default(30).optional(),
});

export const B2bRequisitionItemSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  item_name: z.string().trim().min(1, 'Item name is required'),
  quantity: z.number().int().positive(),
  unit_price_minor: z.string().regex(/^\d+$/),
  total_minor: z.string().regex(/^\d+$/),
});

export const CreateRequisitionSchema = z.object({
  organization_id: z.string().trim().min(1, 'Organization ID is required'),
  requester_user_id: z.string().trim().min(1, 'Requester ID is required'),
  currency: z.string().trim().length(3).default('USD'),
  items: z.array(B2bRequisitionItemSchema).min(1, 'At least one item is required'),
  requester_approval_limit_minor: z.string().regex(/^\d+$/).optional(),
});

export const ApproveRequisitionSchema = z.object({
  approver_user_id: z.string().trim().min(1, 'Approver ID is required'),
  notes: z.string().trim().max(1000).optional(),
});

export const RejectRequisitionSchema = z.object({
  approver_user_id: z.string().trim().min(1, 'Approver ID is required'),
  rejection_reason: z.string().trim().min(1, 'Rejection reason is required').max(1000),
});
