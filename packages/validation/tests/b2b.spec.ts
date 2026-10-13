import { describe, it, expect } from 'vitest';
import {
  B2bOrganizationRoleSchema,
  B2bCreditStatusSchema,
  RequisitionStatusSchema,
  CreateB2bOrganizationSchema,
  UpdateB2bCreditLimitSchema,
  SetB2bContractPriceSchema,
  EvaluateB2bPriceSchema,
  CheckCreditExposureSchema,
  CreateRequisitionSchema,
  ApproveRequisitionSchema,
  RejectRequisitionSchema,
} from '../src/b2b.js';

describe('B2B Customer Portal & Credit Limit Validation Schemas (Phase 16)', () => {
  describe('B2bOrganizationRoleSchema & Enums', () => {
    it('should validate valid roles and reject invalid roles', () => {
      expect(B2bOrganizationRoleSchema.safeParse('CORPORATE_HOLDING').success).toBe(true);
      expect(B2bOrganizationRoleSchema.safeParse('SUBSIDIARY').success).toBe(true);
      expect(B2bOrganizationRoleSchema.safeParse('BUYING_CENTER').success).toBe(true);
      expect(B2bOrganizationRoleSchema.safeParse('INVALID_ROLE').success).toBe(false);
    });

    it('should validate credit status values', () => {
      expect(B2bCreditStatusSchema.safeParse('ACTIVE').success).toBe(true);
      expect(B2bCreditStatusSchema.safeParse('CREDIT_HOLD').success).toBe(true);
      expect(B2bCreditStatusSchema.safeParse('SUSPENDED').success).toBe(true);
      expect(B2bCreditStatusSchema.safeParse('REVIEW_REQUIRED').success).toBe(true);
      expect(B2bCreditStatusSchema.safeParse('UNKNOWN').success).toBe(false);
    });

    it('should validate requisition status values', () => {
      expect(RequisitionStatusSchema.safeParse('DRAFT').success).toBe(true);
      expect(RequisitionStatusSchema.safeParse('PENDING_APPROVAL').success).toBe(true);
      expect(RequisitionStatusSchema.safeParse('APPROVED').success).toBe(true);
      expect(RequisitionStatusSchema.safeParse('REJECTED').success).toBe(true);
      expect(RequisitionStatusSchema.safeParse('CONVERTED_TO_ORDER').success).toBe(true);
      expect(RequisitionStatusSchema.safeParse('CANCELLED').success).toBe(true);
      expect(RequisitionStatusSchema.safeParse('COMPLETED').success).toBe(false);
    });
  });

  describe('CreateB2bOrganizationSchema', () => {
    it('should parse valid B2B organization input with defaults', () => {
      const result = CreateB2bOrganizationSchema.safeParse({
        name: 'Apex Global Logistics Holding',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Apex Global Logistics Holding');
        expect(result.data.org_type).toBe('SUBSIDIARY');
        expect(result.data.credit_limit_minor).toBe('0');
        expect(result.data.payment_terms_days).toBe(30);
        expect(result.data.currency).toBe('USD');
      }
    });

    it('should parse full valid organization input', () => {
      const result = CreateB2bOrganizationSchema.safeParse({
        name: 'Apex Germany GmbH',
        parent_org_id: 'org-root-123',
        tax_identifier: 'DE123456789',
        org_type: 'BUYING_CENTER',
        credit_limit_minor: '50000000',
        payment_terms_days: 60,
        currency: 'EUR',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid credit limit or payment terms', () => {
      const invalidCredit = CreateB2bOrganizationSchema.safeParse({
        name: 'Apex Bad Credit',
        credit_limit_minor: '-500',
      });
      expect(invalidCredit.success).toBe(false);

      const invalidTerms = CreateB2bOrganizationSchema.safeParse({
        name: 'Apex Bad Terms',
        payment_terms_days: 500,
      });
      expect(invalidTerms.success).toBe(false);
    });
  });

  describe('UpdateB2bCreditLimitSchema', () => {
    it('should parse valid credit update', () => {
      const result = UpdateB2bCreditLimitSchema.safeParse({
        credit_limit_minor: '100000000',
        status: 'ACTIVE',
      });
      expect(result.success).toBe(true);
    });

    it('should parse credit hold with reason', () => {
      const result = UpdateB2bCreditLimitSchema.safeParse({
        credit_limit_minor: '0',
        status: 'CREDIT_HOLD',
        hold_reason: 'Delinquent invoices over 60 days',
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-integer credit limit', () => {
      const result = UpdateB2bCreditLimitSchema.safeParse({
        credit_limit_minor: '100.50',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SetB2bContractPriceSchema', () => {
    it('should parse valid contract price', () => {
      const result = SetB2bContractPriceSchema.safeParse({
        sku: 'SKU-INDUSTRIAL-VALVE',
        custom_price_minor: '8500',
        currency: 'USD',
        min_quantity: 10,
        valid_from: '2026-01-01T00:00:00Z',
        valid_until: '2026-12-31T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative or empty price/sku', () => {
      expect(
        SetB2bContractPriceSchema.safeParse({
          sku: '',
          custom_price_minor: '8500',
        }).success,
      ).toBe(false);

      expect(
        SetB2bContractPriceSchema.safeParse({
          sku: 'SKU-VALID',
          custom_price_minor: 'not-a-number',
        }).success,
      ).toBe(false);
    });
  });

  describe('EvaluateB2bPriceSchema', () => {
    it('should parse valid price evaluation input with volume breaks', () => {
      const result = EvaluateB2bPriceSchema.safeParse({
        sku: 'SKU-FASTENER-BOX',
        quantity: 50,
        catalog_list_price_minor: '2000',
        volume_breaks: [
          { min_quantity: 10, discount_bp: 500 },
          { min_quantity: 50, discount_bp: 1500 },
        ],
        group_discount_bp: 300,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('CheckCreditExposureSchema', () => {
    it('should parse valid credit exposure check', () => {
      const result = CheckCreditExposureSchema.safeParse({
        organization_id: 'org-sub-1',
        unpaid_invoices_minor: '1500000',
        pending_orders_minor: '500000',
        overdue_days: 15,
        grace_period_days: 30,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid minor unit strings', () => {
      const result = CheckCreditExposureSchema.safeParse({
        organization_id: 'org-sub-1',
        unpaid_invoices_minor: '1500.00',
        pending_orders_minor: '500000',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateRequisitionSchema, Approve & Reject', () => {
    it('should parse valid requisition creation', () => {
      const result = CreateRequisitionSchema.safeParse({
        organization_id: 'org-sub-1',
        requester_user_id: 'user-line-buyer-99',
        currency: 'USD',
        items: [
          {
            sku: 'SKU-001',
            item_name: 'Motor Assembly',
            quantity: 5,
            unit_price_minor: '12000',
            total_minor: '60000',
          },
        ],
        requester_approval_limit_minor: '50000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject requisition with empty items', () => {
      const result = CreateRequisitionSchema.safeParse({
        organization_id: 'org-sub-1',
        requester_user_id: 'user-line-buyer-99',
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('should parse approve requisition request', () => {
      const result = ApproveRequisitionSchema.safeParse({
        approver_user_id: 'user-manager-1',
        notes: 'Approved for Q4 production maintenance run.',
      });
      expect(result.success).toBe(true);
    });

    it('should parse reject requisition request and require reason', () => {
      const valid = RejectRequisitionSchema.safeParse({
        approver_user_id: 'user-manager-1',
        rejection_reason: 'Exceeds department budget allocation.',
      });
      expect(valid.success).toBe(true);

      const invalid = RejectRequisitionSchema.safeParse({
        approver_user_id: 'user-manager-1',
        rejection_reason: '',
      });
      expect(invalid.success).toBe(false);
    });
  });
});
