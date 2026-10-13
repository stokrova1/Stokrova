import { z } from 'zod';

export const RuleEventTriggers = [
  'ORDER_SUBMITTED',
  'DISCOUNT_APPLIED',
  'REFUND_REQUESTED',
  'CREDIT_LIMIT_CHECK',
] as const;

export const RuleActionTypes = [
  'REQUIRE_APPROVAL',
  'ROUTE_WORKFLOW',
  'BLOCK_ACTION',
] as const;

export const RuleOperators = [
  'EQ',
  'NEQ',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IN',
  'NOT_IN',
] as const;

export const SimpleConditionSchema = z.object({
  field: z.string().trim().min(1, 'Field is required'),
  operator: z.enum(RuleOperators),
  value: z.unknown(),
});

export const ConditionExpressionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    SimpleConditionSchema,
    z.object({
      logical_operator: z.enum(['AND', 'OR']),
      conditions: z.array(ConditionExpressionSchema).min(1, 'Group must have at least one condition'),
    }),
  ]),
);

export const CreateBusinessRuleRequestSchema = z.object({
  name: z.string().trim().min(2, 'Rule name must be at least 2 characters').max(100),
  event_trigger: z.enum(RuleEventTriggers),
  condition_expression: ConditionExpressionSchema,
  action_type: z.enum(RuleActionTypes),
  action_parameters: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateBusinessRuleRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  is_active: z.boolean().optional(),
  condition_expression: ConditionExpressionSchema.optional(),
  action_parameters: z.record(z.string(), z.unknown()).optional(),
});

export const SubmitApprovalRequestSchema = z.object({
  entity_type: z.string().min(1, 'entity_type is required'),
  entity_id: z.string().min(1, 'entity_id is required'),
  approver_role_id: z.string().optional(),
  approver_user_id: z.string().optional(),
  rule_id: z.string().optional(),
  context_payload: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().max(500).optional(),
});

export const DecideApprovalRequestSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  decision_reason: z
    .string()
    .trim()
    .min(2, 'Decision reason is required for audit trail')
    .max(500),
});

export const EvaluateRulesRequestSchema = z.object({
  event_trigger: z.enum(RuleEventTriggers),
  context_payload: z.record(z.string(), z.unknown()),
});

export type ValidatedCreateBusinessRuleRequest = z.infer<typeof CreateBusinessRuleRequestSchema>;
export type ValidatedUpdateBusinessRuleRequest = z.infer<typeof UpdateBusinessRuleRequestSchema>;
export type ValidatedSubmitApprovalRequest = z.infer<typeof SubmitApprovalRequestSchema>;
export type ValidatedDecideApprovalRequest = z.infer<typeof DecideApprovalRequestSchema>;
export type ValidatedEvaluateRulesRequest = z.infer<typeof EvaluateRulesRequestSchema>;
