import { z } from 'zod';

export const SlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateTenantRequestSchema = z.object({
  name: z.string().trim().min(2, 'Tenant name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(SlugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  owner_email: z.string().trim().email('Invalid owner email address'),
  owner_full_name: z.string().trim().min(2, 'Owner full name is required').max(100),
  default_currency: z
    .string()
    .trim()
    .length(3, 'Currency code must be a 3-letter ISO code')
    .default('NGN')
    .transform((val) => val.toUpperCase()),
  initial_branch_name: z.string().trim().min(2).max(100).optional(),
  business_type: z.string().trim().max(100).optional(),
  plan_tier: z.enum(['starter', 'growth', 'enterprise']).optional(),
  initial_float_minor: z.union([z.number(), z.bigint(), z.string()]).optional(),
});

export const UpdateTenantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']),
});

export const VerifyStaffWorkspaceSchema = z.object({
  email: z.string().trim().email('Valid staff work email required'),
  slug: z.string().trim().toLowerCase().optional(),
  password: z.string().optional(),
});

export type ValidatedCreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;
export type ValidatedUpdateTenantStatus = z.infer<typeof UpdateTenantStatusSchema>;
export type ValidatedVerifyStaffWorkspace = z.infer<typeof VerifyStaffWorkspaceSchema>;

