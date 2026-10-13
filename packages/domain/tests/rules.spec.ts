import { describe, it, expect } from 'vitest';
import {
  getNestedProperty,
  evaluateConditionExpression,
  assertCanDecideApproval,
  assertDecisionReasonRequired,
  assertApproverAuthority,
  type DomainConditionExpression,
} from '../src/rules.js';

describe('Declarative Rules & Approval Domain Engine', () => {
  describe('getNestedProperty', () => {
    const context = {
      order: {
        total_minor: 1500000,
        customer: {
          tier: 'VIP',
          credit_limit_minor: 5000000,
        },
      },
      discount_percent: 15,
    };

    it('resolves flat and nested object properties safely', () => {
      expect(getNestedProperty(context, 'discount_percent')).toBe(15);
      expect(getNestedProperty(context, 'order.total_minor')).toBe(1500000);
      expect(getNestedProperty(context, 'order.customer.tier')).toBe('VIP');
    });

    it('returns undefined for non-existent paths without throwing', () => {
      expect(getNestedProperty(context, 'order.non_existent')).toBeUndefined();
      expect(getNestedProperty(context, 'ghost.path.here')).toBeUndefined();
    });
  });

  describe('evaluateConditionExpression', () => {
    it('evaluates numerical comparisons (GT, GTE, LT, LTE)', () => {
      const gtExpr: DomainConditionExpression = {
        field: 'order.total_minor',
        operator: 'GT',
        value: 1000000,
      };
      expect(evaluateConditionExpression(gtExpr, { order: { total_minor: 1200000 } })).toBe(true);
      expect(evaluateConditionExpression(gtExpr, { order: { total_minor: 900000 } })).toBe(false);

      const lteExpr: DomainConditionExpression = {
        field: 'discount_percent',
        operator: 'LTE',
        value: 10,
      };
      expect(evaluateConditionExpression(lteExpr, { discount_percent: 10 })).toBe(true);
      expect(evaluateConditionExpression(lteExpr, { discount_percent: 15 })).toBe(false);
    });

    it('evaluates set inclusion (IN, NOT_IN)', () => {
      const inExpr: DomainConditionExpression = {
        field: 'customer.tier',
        operator: 'IN',
        value: ['VIP', 'WHOLESALE_PLATINUM'],
      };
      expect(evaluateConditionExpression(inExpr, { customer: { tier: 'VIP' } })).toBe(true);
      expect(evaluateConditionExpression(inExpr, { customer: { tier: 'REGULAR' } })).toBe(false);
    });

    it('evaluates compound expressions with AND logic', () => {
      const andExpr: DomainConditionExpression = {
        logical_operator: 'AND',
        conditions: [
          { field: 'order.total_minor', operator: 'GT', value: 1000000 },
          { field: 'customer.is_credit', operator: 'EQ', value: true },
        ],
      };

      // Both true -> true
      expect(
        evaluateConditionExpression(andExpr, {
          order: { total_minor: 1500000 },
          customer: { is_credit: true },
        }),
      ).toBe(true);

      // One false -> false
      expect(
        evaluateConditionExpression(andExpr, {
          order: { total_minor: 1500000 },
          customer: { is_credit: false },
        }),
      ).toBe(false);
    });

    it('evaluates compound expressions with OR logic', () => {
      const orExpr: DomainConditionExpression = {
        logical_operator: 'OR',
        conditions: [
          { field: 'discount_percent', operator: 'GT', value: 20 },
          { field: 'order.total_minor', operator: 'GT', value: 5000000 },
        ],
      };

      // High discount alone triggers
      expect(
        evaluateConditionExpression(orExpr, {
          discount_percent: 25,
          order: { total_minor: 500000 },
        }),
      ).toBe(true);

      // Neither triggers -> false
      expect(
        evaluateConditionExpression(orExpr, {
          discount_percent: 5,
          order: { total_minor: 500000 },
        }),
      ).toBe(false);
    });
  });

  describe('Approval Invariants', () => {
    it('assertCanDecideApproval permits PENDING and rejects finalized status', () => {
      expect(() => assertCanDecideApproval('PENDING')).not.toThrow();
      expect(() => assertCanDecideApproval('APPROVED')).toThrow(/cannot be decided again/);
      expect(() => assertCanDecideApproval('REJECTED')).toThrow(/cannot be decided again/);
    });

    it('assertDecisionReasonRequired enforces non-empty rationale', () => {
      expect(() => assertDecisionReasonRequired('Approved per customer credit terms')).not.toThrow();
      expect(() => assertDecisionReasonRequired('')).toThrow(/non-empty decision rationale/);
      expect(() => assertDecisionReasonRequired('   ')).toThrow(/non-empty decision rationale/);
    });

    it('assertApproverAuthority enforces role or user authority', () => {
      // User has BRANCH_MANAGER role
      expect(() =>
        assertApproverAuthority('BRANCH_MANAGER', null, ['BRANCH_MANAGER'], 'usr_mgr_01'),
      ).not.toThrow();

      // BUSINESS_OWNER can approve any role request
      expect(() =>
        assertApproverAuthority('BRANCH_MANAGER', null, ['BUSINESS_OWNER'], 'usr_owner_01'),
      ).not.toThrow();

      // User lacking role is rejected
      expect(() =>
        assertApproverAuthority('BRANCH_MANAGER', null, ['CASHIER'], 'usr_cashier_01'),
      ).toThrow(/lacks required approver role 'BRANCH_MANAGER'/);

      // Targeted user must match
      expect(() =>
        assertApproverAuthority(null, 'usr_director_01', ['BRANCH_MANAGER'], 'usr_director_01'),
      ).not.toThrow();
      expect(() =>
        assertApproverAuthority(null, 'usr_director_01', ['BRANCH_MANAGER'], 'usr_other_02'),
      ).toThrow(/explicitly assigned to user 'usr_director_01'/);
    });
  });
});
