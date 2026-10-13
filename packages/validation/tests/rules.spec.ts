import { describe, it, expect } from 'vitest';
import {
  CreateBusinessRuleRequestSchema,
  SubmitApprovalRequestSchema,
  DecideApprovalRequestSchema,
  EvaluateRulesRequestSchema,
} from '../src/rules.js';

describe('Rules & Approvals Validation Schemas', () => {
  it('validates business rule creation requests', () => {
    const valid = CreateBusinessRuleRequestSchema.safeParse({
      name: 'High Value Order Manager Approval',
      event_trigger: 'ORDER_SUBMITTED',
      condition_expression: {
        field: 'order.total_minor',
        operator: 'GT',
        value: 1000000,
      },
      action_type: 'REQUIRE_APPROVAL',
      action_parameters: { approver_role_id: 'BRANCH_MANAGER' },
    });
    expect(valid.success).toBe(true);

    const invalid = CreateBusinessRuleRequestSchema.safeParse({
      name: 'Bad Rule',
      event_trigger: 'NON_EXISTENT_TRIGGER',
      condition_expression: { field: '', operator: 'EQ', value: 10 },
      action_type: 'REQUIRE_APPROVAL',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates approval submission and decision payloads', () => {
    const validSubmit = SubmitApprovalRequestSchema.safeParse({
      entity_type: 'SALE_ORDER',
      entity_id: 'so_1001',
      approver_role_id: 'BRANCH_MANAGER',
      context_payload: { total_minor: 2500000 },
      reason: 'Order exceeds auto-approval threshold',
    });
    expect(validSubmit.success).toBe(true);

    const validDecision = DecideApprovalRequestSchema.safeParse({
      decision: 'APPROVED',
      decision_reason: 'Approved after verifying bank transfer reference',
    });
    expect(validDecision.success).toBe(true);

    const emptyReason = DecideApprovalRequestSchema.safeParse({
      decision: 'APPROVED',
      decision_reason: '',
    });
    expect(emptyReason.success).toBe(false);
  });

  it('validates rule evaluation requests', () => {
    const valid = EvaluateRulesRequestSchema.safeParse({
      event_trigger: 'DISCOUNT_APPLIED',
      context_payload: { discount_percent: 25 },
    });
    expect(valid.success).toBe(true);
  });
});
