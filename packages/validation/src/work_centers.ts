import { z } from 'zod';

export const WorkCenterTypes = [
  'SALES',
  'PICKING',
  'VERIFICATION',
  'PACKING',
  'PAYMENT',
  'DISPATCH',
] as const;

export const RegisterStatuses = ['ACTIVE', 'INACTIVE'] as const;

export const RegisterSessionStatuses = ['OPEN', 'CLOSED', 'RECONCILED'] as const;

export const CashMovementTypes = [
  'OPENING_FLOAT',
  'CASH_SALE',
  'CASH_REFUND',
  'CASH_IN',
  'CASH_OUT',
] as const;

export const OperativeCashMovementTypes = [
  'CASH_SALE',
  'CASH_REFUND',
  'CASH_IN',
  'CASH_OUT',
] as const;

export const CreateBranchRequestSchema = z.object({
  company_id: z.string().min(1, 'company_id is required'),
  name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(100),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Branch code must be at least 2 characters')
    .max(20),
});

export const UpdateBranchRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().toUpperCase().min(2).max(20).optional(),
});

export const CreateWorkCenterRequestSchema = z.object({
  branch_id: z.string().min(1, 'branch_id is required'),
  name: z.string().trim().min(2, 'Work center name must be at least 2 characters').max(100),
  type: z.enum(WorkCenterTypes),
});

export const UpdateWorkCenterRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  type: z.enum(WorkCenterTypes).optional(),
});

export const CreateRegisterRequestSchema = z.object({
  branch_id: z.string().min(1, 'branch_id is required'),
  work_center_id: z.string().optional().nullable(),
  name: z.string().trim().min(2, 'Register name must be at least 2 characters').max(100),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Register code must be at least 2 characters')
    .max(30),
});

export const UpdateRegisterRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  work_center_id: z.string().optional().nullable(),
  status: z.enum(RegisterStatuses).optional(),
});

const NonNegativeMinorSchema = z.union([
  z.number().int().min(0, 'Amount must be greater than or equal to 0'),
  z.string().regex(/^\d+$/, 'Amount minor must be a non-negative integer representation'),
]);

const PositiveMinorSchema = z.union([
  z.number().int().positive('Movement amount must be greater than 0'),
  z.string().regex(/^[1-9]\d*$/, 'Movement amount minor must be a positive integer representation'),
]);

export const OpenSessionRequestSchema = z.object({
  register_id: z.string().min(1, 'register_id is required'),
  opening_float_minor: NonNegativeMinorSchema,
  currency_code: z.string().length(3).toUpperCase().optional().default('NGN'),
  notes: z.string().max(500).optional(),
});

export const CloseSessionRequestSchema = z.object({
  closing_actual_minor: NonNegativeMinorSchema,
  notes: z.string().max(500).optional(),
});

export const RecordCashMovementRequestSchema = z.object({
  movement_type: z.enum(OperativeCashMovementTypes),
  amount_minor: PositiveMinorSchema,
  currency_code: z.string().length(3).toUpperCase().optional().default('NGN'),
  source_type: z.string().max(50).optional(),
  source_id: z.string().max(100).optional(),
  reason: z.string().max(255).optional(),
});

export type ValidatedCreateBranchRequest = z.infer<typeof CreateBranchRequestSchema>;
export type ValidatedUpdateBranchRequest = z.infer<typeof UpdateBranchRequestSchema>;
export type ValidatedCreateWorkCenterRequest = z.infer<typeof CreateWorkCenterRequestSchema>;
export type ValidatedUpdateWorkCenterRequest = z.infer<typeof UpdateWorkCenterRequestSchema>;
export type ValidatedCreateRegisterRequest = z.infer<typeof CreateRegisterRequestSchema>;
export type ValidatedUpdateRegisterRequest = z.infer<typeof UpdateRegisterRequestSchema>;
export type ValidatedOpenSessionRequest = z.infer<typeof OpenSessionRequestSchema>;
export type ValidatedCloseSessionRequest = z.infer<typeof CloseSessionRequestSchema>;
export type ValidatedRecordCashMovementRequest = z.infer<typeof RecordCashMovementRequestSchema>;
