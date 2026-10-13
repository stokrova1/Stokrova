/**
 * Declarative Rules & Approval Engine Contracts
 * Based on ARCHITECTURE.md, ADR-016, and Phase 1E specification
 */

export type RuleEventTrigger =
  | 'ORDER_SUBMITTED'
  | 'DISCOUNT_APPLIED'
  | 'REFUND_REQUESTED'
  | 'CREDIT_LIMIT_CHECK';

export type RuleActionType =
  | 'REQUIRE_APPROVAL'
  | 'ROUTE_WORKFLOW'
  | 'BLOCK_ACTION';

export type RuleOperator =
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'NOT_IN';

export interface SimpleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

export interface CompoundCondition {
  logical_operator: 'AND' | 'OR';
  conditions: (SimpleCondition | CompoundCondition)[];
}

export type ConditionExpression = SimpleCondition | CompoundCondition;

export interface BusinessRuleResponse {
  id: string;
  tenant_id: string;
  name: string;
  event_trigger: RuleEventTrigger;
  condition_expression: ConditionExpression;
  action_type: RuleActionType;
  action_parameters?: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateBusinessRuleRequest {
  name: string;
  event_trigger: RuleEventTrigger;
  condition_expression: ConditionExpression;
  action_type: RuleActionType;
  action_parameters?: Record<string, unknown>;
}

export interface UpdateBusinessRuleRequest {
  name?: string;
  is_active?: boolean;
  condition_expression?: ConditionExpression;
  action_parameters?: Record<string, unknown>;
}

export type ApprovalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequestResponse {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  requested_by_user_id: string;
  approver_role_id: string | null;
  approver_user_id: string | null;
  status: ApprovalRequestStatus;
  rule_id: string | null;
  rule_name: string | null;
  context_payload: Record<string, unknown> | null;
  decision_reason: string | null;
  decided_by_user_id: string | null;
  occurred_at: string;
  decided_at: string | null;
}

export interface SubmitApprovalRequest {
  entity_type: string;
  entity_id: string;
  approver_role_id?: string;
  approver_user_id?: string;
  rule_id?: string;
  context_payload?: Record<string, unknown>;
  reason?: string;
}

export interface DecideApprovalRequest {
  decision: 'APPROVED' | 'REJECTED';
  decision_reason: string;
}

export interface EvaluateRulesRequest {
  event_trigger: RuleEventTrigger;
  context_payload: Record<string, unknown>;
}

export interface MatchedRuleSummary {
  id: string;
  name: string;
  action_type: RuleActionType;
  action_parameters?: Record<string, unknown> | null;
}

export interface RuleEvaluationResult {
  triggered: boolean;
  matched_rules: MatchedRuleSummary[];
  requires_approval: boolean;
  approver_role_id?: string;
  approver_user_id?: string;
  is_blocked: boolean;
  block_message?: string;
}
