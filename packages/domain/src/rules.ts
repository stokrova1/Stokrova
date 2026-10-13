/**
 * Declarative Rules & Approval Evaluation Engine
 * Pure mathematical & predicate evaluation without arbitrary code execution.
 * Based on ARCHITECTURE.md, ADR-016, and Phase 1E specification.
 */

export type DomainRuleOperator =
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'NOT_IN';

export interface DomainSimpleCondition {
  field: string;
  operator: DomainRuleOperator;
  value: unknown;
}

export interface DomainCompoundCondition {
  logical_operator: 'AND' | 'OR';
  conditions: (DomainSimpleCondition | DomainCompoundCondition)[];
}

export type DomainConditionExpression =
  | DomainSimpleCondition
  | DomainCompoundCondition;

/**
 * Safely extracts a nested property value using dot-notation.
 * e.g., 'order.total_minor' => obj.order.total_minor
 */
export function getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Evaluates a single predicate condition against context data.
 */
export function evaluateSimpleCondition(
  condition: DomainSimpleCondition,
  context: Record<string, unknown>,
): boolean {
  const actual = getNestedProperty(context, condition.field);

  switch (condition.operator) {
    case 'EQ':
      return actual === condition.value;
    case 'NEQ':
      return actual !== condition.value;
    case 'GT':
      return Number(actual) > Number(condition.value);
    case 'GTE':
      return Number(actual) >= Number(condition.value);
    case 'LT':
      return Number(actual) < Number(condition.value);
    case 'LTE':
      return Number(actual) <= Number(condition.value);
    case 'IN':
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case 'NOT_IN':
      return Array.isArray(condition.value) && !condition.value.includes(actual);
    default:
      return false;
  }
}

/**
 * Evaluates a simple or recursively compound condition expression against context data.
 */
export function evaluateConditionExpression(
  expression: DomainConditionExpression,
  context: Record<string, unknown>,
): boolean {
  if ('field' in expression) {
    return evaluateSimpleCondition(expression, context);
  }

  if ('logical_operator' in expression) {
    const compound = expression as DomainCompoundCondition;
    if (!compound.conditions || compound.conditions.length === 0) {
      return true;
    }

    if (compound.logical_operator === 'AND') {
      return compound.conditions.every((c) =>
        evaluateConditionExpression(c, context),
      );
    }

    if (compound.logical_operator === 'OR') {
      return compound.conditions.some((c) =>
        evaluateConditionExpression(c, context),
      );
    }
  }

  return false;
}

/**
 * Invariants on Approvals
 */
export function assertCanDecideApproval(status: string): void {
  if (status !== 'PENDING') {
    throw new Error(
      `Approval request has already been finalized with status '${status}' and cannot be decided again.`,
    );
  }
}

export function assertDecisionReasonRequired(reason: string): void {
  if (!reason || reason.trim().length === 0) {
    throw new Error('A non-empty decision rationale is required for the audit trail.');
  }
}

export function assertApproverAuthority(
  requestApproverRoleId?: string | null,
  requestApproverUserId?: string | null,
  userRoleCodes: string[] = [],
  userId?: string,
): void {
  // If request targeted a specific user:
  if (requestApproverUserId) {
    if (requestApproverUserId !== userId) {
      throw new Error(`This approval is explicitly assigned to user '${requestApproverUserId}'.`);
    }
    return;
  }

  // If request targeted a specific role:
  if (requestApproverRoleId) {
    const hasRole =
      userRoleCodes.includes(requestApproverRoleId) ||
      userRoleCodes.includes('BUSINESS_OWNER'); // Owner has universal override

    if (!hasRole) {
      throw new Error(
        `User lacks required approver role '${requestApproverRoleId}' to decide this request.`,
      );
    }
  }
}
