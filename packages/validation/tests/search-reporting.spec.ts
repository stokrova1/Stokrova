import { describe, expect, it } from 'vitest';
import {
  createDataExportSchema,
  globalSearchQuerySchema,
  runCustomReportSchema,
  verifyAuditChainSchema,
  gdprErasureRequestSchema,
  sodEvaluationRequestSchema,
  complianceReportQuerySchema,
} from '../src/search-reporting.js';

describe('Phase 13: Search & Reporting Validation Schemas', () => {
  describe('globalSearchQuerySchema', () => {
    it('should validate search query with defaults', () => {
      const result = globalSearchQuerySchema.safeParse({
        query: 'iPhone 15 Pro',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.entity_type).toBeUndefined();
      }
    });

    it('should reject empty search query', () => {
      const result = globalSearchQuerySchema.safeParse({ query: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyAuditChainSchema', () => {
    it('should validate audit block list', () => {
      const payload = {
        genesis_hash: '0'.repeat(64),
        blocks: [
          {
            index: 0,
            timestamp: '2026-10-11T12:00:00Z',
            tenant_id: '123e4567-e89b-12d3-a456-426614174000',
            actor_id: '123e4567-e89b-12d3-a456-426614174001',
            action: 'USER_LOGIN',
            resource: 'auth',
            resource_id: 'usr-1',
            payload_hash: 'a'.repeat(64),
            previous_hash: '0'.repeat(64),
            current_hash: 'b'.repeat(64),
          },
        ],
      };

      const result = verifyAuditChainSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('createDataExportSchema', () => {
    it('should validate data export creation request', () => {
      const result = createDataExportSchema.safeParse({
        entity_type: 'SALES_ORDER',
        format: 'JSONL',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('runCustomReportSchema', () => {
    it('should validate custom report execution request', () => {
      const result = runCustomReportSchema.safeParse({
        name: 'Quarterly Sales by Branch',
        metrics: ['TOTAL_REVENUE', 'GROSS_PROFIT'],
        dimensions: ['BRANCH', 'DATE_MONTH'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject when metrics or dimensions are empty', () => {
      expect(
        runCustomReportSchema.safeParse({
          name: 'Empty Report',
          metrics: [],
          dimensions: ['BRANCH'],
        }).success
      ).toBe(false);
    });
  });

  describe('Phase 21: Compliance & Regulatory Validation Schemas', () => {
    it('validates compliant GDPR erasure request', () => {
      const valid = {
        subject_id: 'cust-1001',
        subject_type: 'CUSTOMER',
        pii_fields: ['email', 'phone', 'full_name'],
        dpo_approved_by: 'dpo-usr-1',
        notes: 'Customer exercised Right to Erasure',
      };
      const parsed = gdprErasureRequestSchema.safeParse(valid);
      expect(parsed.success).toBe(true);

      const invalid = {
        subject_id: 'cust-1001',
        pii_fields: [], // empty pii_fields rejected
      };
      expect(gdprErasureRequestSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates Segregation of Duties (SoD) evaluation schema', () => {
      const valid = {
        actor_id: 'usr-buyer',
        requested_action: 'purchase_order.approve',
        performed_actions: ['purchase_order.create'],
      };
      const parsed = sodEvaluationRequestSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('validates compliance report query schema', () => {
      const valid = {
        standard: 'SOX',
        from_date: new Date().toISOString(),
        to_date: new Date().toISOString(),
        entity_type: 'JOURNAL_ENTRY',
      };
      const parsed = complianceReportQuerySchema.safeParse(valid);
      expect(parsed.success).toBe(true);

      const invalid = {
        standard: 'UNKNOWN_STANDARD',
        from_date: 'invalid-date',
        to_date: 'invalid-date',
      };
      expect(complianceReportQuerySchema.safeParse(invalid).success).toBe(false);
    });
  });
});

