import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  BusinessRuleResponse,
  CreateBusinessRuleRequest,
  UpdateBusinessRuleRequest,
  ApprovalRequestResponse,
  SubmitApprovalRequest,
  DecideApprovalRequest,
  EvaluateRulesRequest,
  RuleEvaluationResult,
  RuleEventTrigger,
  ConditionExpression,
  ApprovalRequestStatus,
} from '@stokrova/contracts';
import {
  evaluateConditionExpression,
  assertCanDecideApproval,
  assertDecisionReasonRequired,
  assertApproverAuthority,
} from '@stokrova/domain';

export interface StoredBusinessRule {
  id: string;
  tenant_id: string;
  name: string;
  event_trigger: RuleEventTrigger;
  condition_expression: ConditionExpression;
  action_type: BusinessRuleResponse['action_type'];
  action_parameters: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface StoredApprovalRequest {
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

@Injectable()
export class RulesService {
  private rulesStore = new DurableMap<StoredBusinessRule>('business_rules');
  private approvalsStore = new DurableMap<StoredApprovalRequest>('approval_requests');

  async createRule(
    tenantId: string,
    req: CreateBusinessRuleRequest,
  ): Promise<BusinessRuleResponse> {
    const id = `rule_${randomUUID().replace(/-/g, '')}`;
    const rule: StoredBusinessRule = {
      id,
      tenant_id: tenantId,
      name: req.name.trim(),
      event_trigger: req.event_trigger,
      condition_expression: req.condition_expression,
      action_type: req.action_type,
      action_parameters: req.action_parameters || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.rulesStore.set(id, rule);
    return rule;
  }

  async getRules(
    tenantId: string,
    trigger?: RuleEventTrigger,
  ): Promise<BusinessRuleResponse[]> {
    return Array.from(this.rulesStore.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (trigger && r.event_trigger !== trigger) return false;
      return true;
    });
  }

  async getRuleById(tenantId: string, id: string): Promise<BusinessRuleResponse> {
    const rule = this.rulesStore.get(id);
    if (!rule || rule.tenant_id !== tenantId) {
      throw new NotFoundException(`Business rule with ID '${id}' not found.`);
    }
    return rule;
  }

  async updateRule(
    tenantId: string,
    id: string,
    req: UpdateBusinessRuleRequest,
  ): Promise<BusinessRuleResponse> {
    const rule = await this.getRuleById(tenantId, id);

    const updated: StoredBusinessRule = {
      ...rule,
      name: req.name?.trim() || rule.name,
      is_active: req.is_active !== undefined ? req.is_active : rule.is_active,
      condition_expression: req.condition_expression || rule.condition_expression,
      action_parameters:
        req.action_parameters !== undefined
          ? (req.action_parameters ?? null)
          : (rule.action_parameters ?? null),
    };

    this.rulesStore.set(id, updated);
    return updated;
  }

  async evaluateRules(
    tenantId: string,
    req: EvaluateRulesRequest,
  ): Promise<RuleEvaluationResult> {
    const activeRules = Array.from(this.rulesStore.values()).filter(
      (r) => r.tenant_id === tenantId && r.is_active && r.event_trigger === req.event_trigger,
    );

    const matchedRules: RuleEvaluationResult['matched_rules'] = [];
    let requiresApproval = false;
    let approverRoleId: string | undefined;
    let approverUserId: string | undefined;
    let isBlocked = false;
    let blockMessage: string | undefined;

    for (const rule of activeRules) {
      const isMatched = evaluateConditionExpression(
        rule.condition_expression as any,
        req.context_payload,
      );

      if (isMatched) {
        matchedRules.push({
          id: rule.id,
          name: rule.name,
          action_type: rule.action_type,
          action_parameters: rule.action_parameters,
        });

        if (rule.action_type === 'REQUIRE_APPROVAL') {
          requiresApproval = true;
          approverRoleId =
            (rule.action_parameters?.['approver_role_id'] as string) || approverRoleId;
          approverUserId =
            (rule.action_parameters?.['approver_user_id'] as string) || approverUserId;
        }

        if (rule.action_type === 'BLOCK_ACTION') {
          isBlocked = true;
          blockMessage =
            (rule.action_parameters?.['rejection_message'] as string) ||
            'Operation blocked by business policy.';
        }
      }
    }

    return {
      triggered: matchedRules.length > 0,
      matched_rules: matchedRules,
      requires_approval: requiresApproval,
      approver_role_id: approverRoleId,
      approver_user_id: approverUserId,
      is_blocked: isBlocked,
      block_message: blockMessage,
    };
  }

  async submitApproval(
    tenantId: string,
    requestedByUserId: string,
    req: SubmitApprovalRequest,
  ): Promise<ApprovalRequestResponse> {
    const id = `appr_${randomUUID().replace(/-/g, '')}`;
    let ruleName: string | null = null;

    if (req.rule_id) {
      const rule = this.rulesStore.get(req.rule_id);
      if (rule && rule.tenant_id === tenantId) {
        ruleName = rule.name;
      }
    }

    const approval: StoredApprovalRequest = {
      id,
      tenant_id: tenantId,
      entity_type: req.entity_type,
      entity_id: req.entity_id,
      requested_by_user_id: requestedByUserId,
      approver_role_id: req.approver_role_id || null,
      approver_user_id: req.approver_user_id || null,
      status: 'PENDING',
      rule_id: req.rule_id || null,
      rule_name: ruleName,
      context_payload: req.context_payload || null,
      decision_reason: null,
      decided_by_user_id: null,
      occurred_at: new Date().toISOString(),
      decided_at: null,
    };

    this.approvalsStore.set(id, approval);
    return approval;
  }

  async getPendingApprovals(
    tenantId: string,
    filters: { roleId?: string; userId?: string } = {},
  ): Promise<ApprovalRequestResponse[]> {
    return Array.from(this.approvalsStore.values()).filter((a) => {
      if (a.tenant_id !== tenantId) return false;
      if (a.status !== 'PENDING') return false;
      if (filters.userId && a.approver_user_id && a.approver_user_id !== filters.userId) {
        return false;
      }
      if (filters.roleId && a.approver_role_id && a.approver_role_id !== filters.roleId) {
        return false;
      }
      return true;
    });
  }

  async getApprovalById(tenantId: string, id: string): Promise<StoredApprovalRequest> {
    const approval = this.approvalsStore.get(id);
    if (!approval || approval.tenant_id !== tenantId) {
      throw new NotFoundException(`Approval request with ID '${id}' not found.`);
    }
    return approval;
  }

  async decideApproval(
    tenantId: string,
    approvalId: string,
    userId: string,
    userRoleCodes: string[],
    req: DecideApprovalRequest,
  ): Promise<ApprovalRequestResponse> {
    const approval = await this.getApprovalById(tenantId, approvalId);

    try {
      assertCanDecideApproval(approval.status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot decide approval.';
      throw new ConflictException(msg);
    }

    try {
      assertDecisionReasonRequired(req.decision_reason);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid decision reason.';
      throw new BadRequestException(msg);
    }

    try {
      assertApproverAuthority(
        approval.approver_role_id,
        approval.approver_user_id,
        userRoleCodes,
        userId,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unauthorized approver.';
      throw new ForbiddenException(msg);
    }

    const updated: StoredApprovalRequest = {
      ...approval,
      status: req.decision,
      decision_reason: req.decision_reason.trim(),
      decided_by_user_id: userId,
      decided_at: new Date().toISOString(),
    };

    this.approvalsStore.set(approvalId, updated);
    return updated;
  }

  clearStore(): void {
    this.rulesStore.clear();
    this.approvalsStore.clear();
  }
}
