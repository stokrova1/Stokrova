import { z } from 'zod';

export const RoleCodeRegex = /^[A-Z0-9_]{3,50}$/;

export const CreateCustomRoleRequestSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(80),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(RoleCodeRegex, 'Role code must be 3-50 uppercase alphanumeric characters or underscores'),
  description: z.string().trim().max(255).optional(),
  permission_codes: z.array(z.string().min(1)).min(1, 'Role must contain at least one permission'),
});

export const ScopeTargetSchema = z.object({
  company_id: z.string().optional(),
  branch_id: z.string().optional(),
  warehouse_id: z.string().optional(),
  register_id: z.string().optional(),
  work_center_id: z.string().optional(),
});

export const AssignRoleRequestSchema = z.object({
  user_id: z.string().min(1, 'user_id is required'),
  role_id: z.string().min(1, 'role_id is required'),
  scope: ScopeTargetSchema.optional(),
});

export const InviteStaffRequestSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  role_id: z.string().min(1, 'role_id is required'),
  scope: ScopeTargetSchema.optional(),
  delivery_channel: z.enum(['EMAIL', 'SHAREABLE_LINK']).optional(),
});

export const AcceptStaffInvitationRequestSchema = z.object({
  invite_token: z.string().min(1, 'invite_token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  cashier_pin: z.string().regex(/^\d{4,6}$/, 'Cashier PIN must be 4 to 6 numeric digits').optional(),
});

export type ValidatedCreateCustomRoleRequest = z.infer<typeof CreateCustomRoleRequestSchema>;
export type ValidatedAssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>;
export type ValidatedInviteStaffRequest = z.infer<typeof InviteStaffRequestSchema>;
export type ValidatedAcceptStaffInvitationRequest = z.infer<typeof AcceptStaffInvitationRequestSchema>;

