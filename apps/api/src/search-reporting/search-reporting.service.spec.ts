import { describe, expect, it, beforeEach } from 'vitest';
import { SearchService } from './search.service.js';
import { AuditForensicsService } from './audit-forensics.service.js';
import { DataExportService } from './data-export.service.js';
import { ReportingService } from './reporting.service.js';
import { ComplianceService } from './compliance.service.js';
import { NotFoundException } from '@nestjs/common';

describe('Phase 13: Search & Reporting API Services', () => {
  const tenantId = 'tenant-test-123';
  const otherTenantId = 'tenant-other-999';

  describe('SearchService', () => {
    let service: SearchService;

    beforeEach(() => {
      service = new SearchService();
    });

    it('should index and perform ranked multi-entity search', async () => {
      service.bulkIndexEntities(tenantId, [
        {
          id: 'idx-1',
          entity_type: 'PRODUCT',
          entity_id: 'p1',
          primary_text: 'Apple MacBook Pro M3',
          sku: 'MBP-M3-16GB',
          barcode: '190199123456',
        },
        {
          id: 'idx-2',
          entity_type: 'SALES_ORDER',
          entity_id: 'so1',
          primary_text: 'Sales Order SO-1002',
          reference_number: 'SO-1002',
        },
      ]);

      // Should find exact barcode match with top score
      const searchBarcode = await service.globalSearch(tenantId, {
        query: '190199123456',
        limit: 10,
      });
      expect(searchBarcode.total_matches).toBe(1);
      expect(searchBarcode.items[0]?.entity_id).toBe('p1');
      expect(searchBarcode.items[0]?.match_type).toBe('EXACT_MATCH');

      // Should isolate by tenant
      const otherTenantSearch = await service.globalSearch(otherTenantId, {
        query: '190199123456',
        limit: 10,
      });
      expect(otherTenantSearch.total_matches).toBe(0);

      // Should find fuzzy typo match
      const fuzzySearch = await service.globalSearch(tenantId, {
        query: 'MacBok',
        limit: 10,
      });
      expect(fuzzySearch.total_matches).toBe(1);
      expect(fuzzySearch.items[0]?.match_type).toBe('FUZZY_MATCH');
      expect(fuzzySearch.items[0]?.entity_id).toBe('p1');
    });
  });

  describe('AuditForensicsService', () => {
    let service: AuditForensicsService;

    beforeEach(() => {
      service = new AuditForensicsService();
    });

    it('should append blocks, mask sensitive data, and verify cryptographic chain', async () => {
      const block0 = await service.appendAuditBlock(
        tenantId,
        'usr-1',
        'LOGIN',
        'auth',
        'sess-1',
        { password: 'SensitivePassword123' }
      );
      expect(block0.index).toBe(0);

      const block1 = await service.appendAuditBlock(
        tenantId,
        'usr-1',
        'CHECKOUT',
        'orders',
        'ord-99',
        { card_number: '4111222233334444' }
      );
      expect(block1.index).toBe(1);
      expect(block1.previous_hash).toBe(block0.current_hash);

      const verification = await service.verifyAuditChain(tenantId);
      expect(verification.is_valid).toBe(true);
      expect(verification.total_blocks_verified).toBe(2);

      const blocks = await service.getAuditBlocks(tenantId);
      expect(blocks).toHaveLength(2);
    });
  });

  describe('DataExportService', () => {
    let service: DataExportService;

    beforeEach(() => {
      service = new DataExportService();
    });

    it('should create and download CSV export job', async () => {
      const job = await service.createExportJob(
        tenantId,
        {
          entity_type: 'PRODUCTS',
          format: 'CSV',
        },
        [
          { sku: 'SKU-1', name: 'Widget A', price: 1000 },
          { sku: 'SKU-2', name: 'Widget B', price: 2000 },
        ]
      );

      expect(job.status).toBe('COMPLETED');
      expect(job.row_count).toBe(2);

      const downloaded = await service.downloadExport(job.download_token);
      expect(downloaded.format).toBe('CSV');
      expect(downloaded.content).toContain('sku,name,price\n');
      expect(downloaded.content).toContain('SKU-1,Widget A,1000\n');
    });

    it('should throw NotFoundException on invalid token', async () => {
      await expect(service.downloadExport('invalid-token')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('ReportingService', () => {
    let service: ReportingService;

    beforeEach(() => {
      service = new ReportingService();
    });

    it('should run custom report and return formatted results', async () => {
      const result = await service.runReport(
        tenantId,
        {
          name: 'Annual Sales Summary',
          metrics: ['TOTAL_REVENUE', 'GROSS_PROFIT'],
          dimensions: ['BRANCH'],
        },
        [
          {
            dimensions: { BRANCH: 'Lagos Island' },
            metrics: { TOTAL_REVENUE: 5000000, GROSS_PROFIT: 2000000 },
          },
        ]
      );

      expect(result.report_name).toBe('Annual Sales Summary');
      expect(result.row_count).toBe(1);
      expect(result.rows[0]?.dimensions['BRANCH']).toBe('Lagos Island');
    });
  });

  describe('ComplianceService', () => {
    let auditService: AuditForensicsService;
    let complianceService: ComplianceService;

    beforeEach(() => {
      auditService = new AuditForensicsService();
      complianceService = new ComplianceService(auditService);
    });

    it('should process GDPR Right to Erasure while preserving financial ledger invariants (Rule 11)', async () => {
      const customerRecord = {
        customer_id: 'cust-eu-999',
        full_name: 'Helena Fischer',
        email: 'helena.fischer@example.de',
        phone: '+49-151-5550123',
        lifetime_spend_minor: 1250000,
        currency: 'EUR',
      };

      const result = await complianceService.processGdprErasure(
        tenantId,
        {
          subject_id: 'cust-eu-999',
          subject_type: 'CUSTOMER',
          pii_fields: ['full_name', 'email', 'phone'],
          dpo_approved_by: 'dpo-agent-007',
          notes: 'Customer exercised Art 17 right to erasure',
        },
        customerRecord
      );

      expect(result.request.status).toBe('PROCESSED');
      expect(result.request.pii_fields).toEqual(['full_name', 'email', 'phone']);
      expect(result.request.erasure_hash).toHaveLength(64);

      // PII masked
      expect(result.pseudonymizedRecord['full_name']).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);
      expect(result.pseudonymizedRecord['email']).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);
      expect(result.pseudonymizedRecord['phone']).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);

      // Financial history preserved
      expect(result.pseudonymizedRecord['customer_id']).toBe('cust-eu-999');
      expect(result.pseudonymizedRecord['lifetime_spend_minor']).toBe(1250000);
      expect(result.pseudonymizedRecord['currency']).toBe('EUR');

      // Audit block recorded
      const blocks = await auditService.getAuditBlocks(tenantId);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.action).toBe('GDPR_ERASURE_PROCESSED');
    });

    it('should enforce SOX 404 Segregation of Duties (SoD) against financial workflows', () => {
      // PO creator attempting to approve PO
      const checkBlocked = complianceService.evaluateSod(tenantId, {
        actor_id: 'usr-buyer-bob',
        requested_action: 'purchase_order.approve',
        performed_actions: ['purchase_order.create'],
      });
      expect(checkBlocked.allowed).toBe(false);
      expect(checkBlocked.violation_reason).toContain('Segregation of duties violation');

      // Non-conflicting action permitted
      const checkAllowed = complianceService.evaluateSod(tenantId, {
        actor_id: 'usr-approver-alice',
        requested_action: 'purchase_order.approve',
        performed_actions: ['supplier.view'],
      });
      expect(checkAllowed.allowed).toBe(true);
      expect(checkAllowed.violation_reason).toBeNull();
    });

    it('should generate a tamper-verified compliance report', async () => {
      // Seed audit block
      await auditService.appendAuditBlock(
        tenantId,
        'usr-cfo',
        'JOURNAL_POSTED',
        'finance',
        'je-1001',
        { amount: 50000 }
      );

      const now = new Date();
      const past = new Date(now.getTime() - 3600000).toISOString();
      const future = new Date(now.getTime() + 3600000).toISOString();

      const report = await complianceService.generateComplianceReport(tenantId, {
        standard: 'SOX',
        from_date: past,
        to_date: future,
      });

      expect(report.standard).toBe('SOX');
      expect(report.tamper_check_passed).toBe(true);
      expect(report.total_records).toBe(1);
      expect(report.records[0]?.['action']).toBe('JOURNAL_POSTED');
    });
  });
});

