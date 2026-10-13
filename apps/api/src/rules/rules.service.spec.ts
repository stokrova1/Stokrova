import { describe, it, expect, beforeEach } from 'vitest';
import { RulesService } from './rules.service.js';

describe('RulesService (Declarative Rules & Approvals Engine)', () => {
  let service: RulesService;
  const tenantId = 'ten_retail_01';
  const clerkUserId = 'usr_clerk_01';
  const managerUserId = 'usr_manager_01';
  const cashierUserId = 'usr_cashier_01';

  beforeEach(() => {
    service = new RulesService();
  });

  describe('Business Rule Definition & Evaluation', () => {
    it('creates and evaluates an approval requirement rule for high value orders', async () => {
      await service.createRule(tenantId, {
        name: 'High Value Order Manager Approval',
        event_trigger: 'ORDER_SUBMITTED',
        condition_expression: {
          field: 'order.total_minor',
          operator: 'GT',
          value: 1000000, // ₦1,000,000 threshold
        },
        action_type: 'REQUIRE_APPROVAL',
        action_parameters: { approver_role_id: 'BRANCH_MANAGER' },
      });

      // Evaluation 1: Order total ₦1,500,000 (Triggered)
      const highValResult = await service.evaluateRules(tenantId, {
        event_trigger: 'ORDER_SUBMITTED',
        context_payload: { order: { total_minor: 1500000 } },
      });

      expect(highValResult.triggered).toBe(true);
      expect(highValResult.requires_approval).toBe(true);
      expect(highValResult.approver_role_id).toBe('BRANCH_MANAGER');
      expect(highValResult.is_blocked).toBe(false);

      // Evaluation 2: Order total ₦500,000 (Not triggered)
      const normalValResult = await service.evaluateRules(tenantId, {
        event_trigger: 'ORDER_SUBMITTED',
        context_payload: { order: { total_minor: 500000 } },
      });

      expect(normalValResult.triggered).toBe(false);
      expect(normalValResult.requires_approval).toBe(false);
    });

    it('creates and evaluates a hard blocking policy', async () => {
      await service.createRule(tenantId, {
        name: 'Excessive Discount Prohibition',
        event_trigger: 'DISCOUNT_APPLIED',
        condition_expression: {
          field: 'discount_percent',
          operator: 'GT',
          value: 30,
        },
        action_type: 'BLOCK_ACTION',
        action_parameters: {
          rejection_message: 'Discounts exceeding 30% are strictly prohibited by company policy.',
        },
      });

      const blockedResult = await service.evaluateRules(tenantId, {
        event_trigger: 'DISCOUNT_APPLIED',
        context_payload: { discount_percent: 35 },
      });

      expect(blockedResult.triggered).toBe(true);
      expect(blockedResult.is_blocked).toBe(true);
      expect(blockedResult.block_message).toMatch(/strictly prohibited/);
    });
  });

  describe('Approval Requests & Decision Invariants', () => {
    let approvalId: string;

    beforeEach(async () => {
      const appr = await service.submitApproval(tenantId, clerkUserId, {
        entity_type: 'SALE_ORDER',
        entity_id: 'so_9001',
        approver_role_id: 'BRANCH_MANAGER',
        context_payload: { total_minor: 2500000 },
        reason: 'Order exceeds auto-approval threshold',
      });
      approvalId = appr.id;
    });

    it('lists pending approval requests in the inbox', async () => {
      const inbox = await service.getPendingApprovals(tenantId, {
        roleId: 'BRANCH_MANAGER',
      });
      expect(inbox.length).toBe(1);
      expect(inbox[0]?.id).toBe(approvalId);
      expect(inbox[0]?.status).toBe('PENDING');
    });

    it('allows authorized manager to approve request with mandatory audit rationale', async () => {
      const decided = await service.decideApproval(
        tenantId,
        approvalId,
        managerUserId,
        ['BRANCH_MANAGER'],
        {
          decision: 'APPROVED',
          decision_reason: 'Verified customer bank guarantee and approved order.',
        },
      );

      expect(decided.status).toBe('APPROVED');
      expect(decided.decision_reason).toBe(
        'Verified customer bank guarantee and approved order.',
      );
      expect(decided.decided_by_user_id).toBe(managerUserId);
      expect(decided.decided_at).toBeDefined();

      // Ensure no longer in pending inbox
      const pending = await service.getPendingApprovals(tenantId);
      expect(pending.length).toBe(0);
    });

    it('rejects unauthorized user from deciding approval', async () => {
      await expect(
        service.decideApproval(
          tenantId,
          approvalId,
          cashierUserId,
          ['CASHIER'], // Cashier does not have BRANCH_MANAGER role
          {
            decision: 'APPROVED',
            decision_reason: 'Trying to approve',
          },
        ),
      ).rejects.toThrowError(/lacks required approver role 'BRANCH_MANAGER'/);
    });

    it('rejects deciding approval without a rationale', async () => {
      await expect(
        service.decideApproval(
          tenantId,
          approvalId,
          managerUserId,
          ['BRANCH_MANAGER'],
          {
            decision: 'REJECTED',
            decision_reason: '',
          },
        ),
      ).rejects.toThrowError(/non-empty decision rationale/);
    });

    it('rejects duplicate decisions on an already decided request', async () => {
      await service.decideApproval(
        tenantId,
        approvalId,
        managerUserId,
        ['BRANCH_MANAGER'],
        {
          decision: 'REJECTED',
          decision_reason: 'Customer credit limit exceeded',
        },
      );

      await expect(
        service.decideApproval(
          tenantId,
          approvalId,
          managerUserId,
          ['BRANCH_MANAGER'],
          {
            decision: 'APPROVED',
            decision_reason: 'Second decision attempt',
          },
        ),
      ).rejects.toThrowError(/cannot be decided again/);
    });
  });
});
