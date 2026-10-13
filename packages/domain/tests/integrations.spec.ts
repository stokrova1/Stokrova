import { describe, it, expect } from 'vitest';
import {
  assertValidHoldingGroupHierarchy,
  assertValidInterCompanyTransfer,
  assertInterCompanyTransition,
  generateInterCompanyMirrorJournalLines,
  isSignatureValidConstantTime,
  calculateWebhookRetryBackoffSeconds,
  calculateConsolidatedTrialBalance,
  IntegrationsDomainError,
} from '../src/integrations.js';

describe('Multi-Company Consolidation & Integrations Domain Engine (Phase 11)', () => {
  // ==========================================================================
  // 1. Holding Group Hierarchy Validation
  // ==========================================================================
  describe('assertValidHoldingGroupHierarchy', () => {
    it('passes for a valid parent holding entity and child subsidiaries', () => {
      expect(() =>
        assertValidHoldingGroupHierarchy('comp-parent', ['comp-sub-1', 'comp-sub-2']),
      ).not.toThrow();
    });

    it('rejects when parent company is listed as its own subsidiary', () => {
      expect(() =>
        assertValidHoldingGroupHierarchy('comp-parent', ['comp-parent', 'comp-sub-1']),
      ).toThrowError(/cannot be listed as its own subsidiary/);
    });

    it('rejects when subsidiaries array contains duplicates', () => {
      expect(() =>
        assertValidHoldingGroupHierarchy('comp-parent', ['comp-sub-1', 'comp-sub-1']),
      ).toThrowError(/Duplicate subsidiary companies/);
    });

    it('rejects empty subsidiaries', () => {
      expect(() => assertValidHoldingGroupHierarchy('comp-parent', [])).toThrowError(
        /At least one subsidiary company is required/,
      );
    });
  });

  // ==========================================================================
  // 2. Inter-Company Transfer Validation & Math
  // ==========================================================================
  describe('assertValidInterCompanyTransfer', () => {
    it('computes total transfer amount in integer minor units correctly', () => {
      const items = [
        { variant_id: 'v-1', sku: 'SKU-1', quantity: 10, unit_transfer_price_minor: '5000' }, // 50,000
        { variant_id: 'v-2', sku: 'SKU-2', quantity: 5, unit_transfer_price_minor: '12000' }, // 60,000
      ];
      const result = assertValidInterCompanyTransfer('comp-a', 'comp-b', items);
      expect(result.total_amount_minor).toBe('110000');
    });

    it('rejects transfer when source and destination are the same company', () => {
      expect(() =>
        assertValidInterCompanyTransfer('comp-a', 'comp-a', [
          { variant_id: 'v-1', sku: 'SKU-1', quantity: 5, unit_transfer_price_minor: '1000' },
        ]),
      ).toThrowError(/must be distinct legal entities/);
    });

    it('rejects transfer with zero or negative item quantities', () => {
      expect(() =>
        assertValidInterCompanyTransfer('comp-a', 'comp-b', [
          { variant_id: 'v-1', sku: 'SKU-1', quantity: 0, unit_transfer_price_minor: '1000' },
        ]),
      ).toThrowError(/Quantity must be greater than zero/);
    });
  });

  // ==========================================================================
  // 3. Inter-Company State Machine
  // ==========================================================================
  describe('assertInterCompanyTransition', () => {
    it('allows valid progressive lifecycle transitions', () => {
      expect(() => assertInterCompanyTransition('PROPOSED', 'APPROVED')).not.toThrow();
      expect(() => assertInterCompanyTransition('APPROVED', 'IN_TRANSIT')).not.toThrow();
      expect(() => assertInterCompanyTransition('IN_TRANSIT', 'COMPLETED')).not.toThrow();
    });

    it('allows cancellation from PROPOSED or APPROVED states', () => {
      expect(() => assertInterCompanyTransition('PROPOSED', 'CANCELLED')).not.toThrow();
      expect(() => assertInterCompanyTransition('APPROVED', 'CANCELLED')).not.toThrow();
    });

    it('rejects invalid or backwards transitions', () => {
      expect(() => assertInterCompanyTransition('COMPLETED', 'IN_TRANSIT')).toThrowError(
        /Cannot transition inter-company transfer/,
      );
      expect(() => assertInterCompanyTransition('PROPOSED', 'COMPLETED')).toThrowError(
        /Cannot transition inter-company transfer/,
      );
    });
  });

  // ==========================================================================
  // 4. Paired Mirror Journal Entries & Automated Elimination
  // ==========================================================================
  describe('generateInterCompanyMirrorJournalLines', () => {
    it('generates seller, buyer, and elimination lines with balancing invariant', () => {
      const result = generateInterCompanyMirrorJournalLines({
        transferAmountMinor: '85000',
        sellerReceivableAccountId: 'acc-seller-ar',
        sellerRevenueAccountId: 'acc-seller-rev',
        buyerAssetAccountId: 'acc-buyer-inv',
        buyerPayableAccountId: 'acc-buyer-ap',
        eliminationPayableAccountId: 'acc-elim-ap',
        eliminationReceivableAccountId: 'acc-elim-ar',
        transferNumber: 'ICT-101',
      });

      // Seller: Dr AR 85000, Cr Rev 85000
      expect(result.sellerLines).toHaveLength(2);
      expect(result.sellerLines[0].debit_minor).toBe('85000');
      expect(result.sellerLines[1].credit_minor).toBe('85000');

      // Buyer: Dr Inv 85000, Cr AP 85000
      expect(result.buyerLines).toHaveLength(2);
      expect(result.buyerLines[0].debit_minor).toBe('85000');
      expect(result.buyerLines[1].credit_minor).toBe('85000');

      // Elimination: Dr AP 85000, Cr AR 85000
      expect(result.eliminationLines).toHaveLength(2);
      expect(result.eliminationLines[0].debit_minor).toBe('85000');
      expect(result.eliminationLines[1].credit_minor).toBe('85000');
    });
  });

  // ==========================================================================
  // 5. HMAC-SHA256 Cryptographic Webhook Signing & Backoff
  // ==========================================================================
  describe('Webhook Security & Backoff', () => {
    it('verifies valid identical signatures in constant time', () => {
      const sig1 = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
      const sig2 = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
      expect(isSignatureValidConstantTime(sig1, sig2)).toBe(true);
    });

    it('rejects tampered or mismatched signatures in constant time', () => {
      const sig1 = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
      const tampered = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef1';
      expect(isSignatureValidConstantTime(sig1, tampered)).toBe(false);
      expect(isSignatureValidConstantTime(sig1, 'shorter')).toBe(false);
    });

    it('computes exponential retry intervals correctly', () => {
      expect(calculateWebhookRetryBackoffSeconds(1)).toBe(60);
      expect(calculateWebhookRetryBackoffSeconds(2)).toBe(300);
      expect(calculateWebhookRetryBackoffSeconds(3)).toBe(900);
      expect(calculateWebhookRetryBackoffSeconds(4)).toBe(3600);
      expect(calculateWebhookRetryBackoffSeconds(5)).toBe(14400);
    });
  });

  // ==========================================================================
  // 6. Consolidated Trial Balance & Elimination Engine
  // ==========================================================================
  describe('calculateConsolidatedTrialBalance', () => {
    it('aggregates subsidiary accounts and eliminates inter-company clearing accounts', () => {
      const comp1 = {
        companyId: 'comp-1',
        rows: [
          { account_code: '1010', account_name: 'Cash', account_type: 'ASSET' as const, debit_minor: '100000', credit_minor: '0', net_balance_minor: '100000' },
          { account_code: '1150', account_name: 'IC Receivable', account_type: 'ASSET' as const, debit_minor: '30000', credit_minor: '0', net_balance_minor: '30000' },
          { account_code: '4010', account_name: 'Revenue', account_type: 'REVENUE' as const, debit_minor: '0', credit_minor: '130000', net_balance_minor: '130000' },
        ],
      };

      const comp2 = {
        companyId: 'comp-2',
        rows: [
          { account_code: '1200', account_name: 'Inventory', account_type: 'ASSET' as const, debit_minor: '30000', credit_minor: '0', net_balance_minor: '30000' },
          { account_code: '2150', account_name: 'IC Payable', account_type: 'LIABILITY' as const, debit_minor: '0', credit_minor: '30000', net_balance_minor: '30000' },
        ],
      };

      // Elimination: Eliminate IC Receivable and IC Payable
      const eliminations = [
        { account_code: '1150', debit_minor: '30000', credit_minor: '0' },
        { account_code: '2150', debit_minor: '0', credit_minor: '30000' },
      ];

      const report = calculateConsolidatedTrialBalance([comp1, comp2], eliminations);

      expect(report.is_balanced).toBe(true);
      expect(report.total_eliminations_minor).toBe('60000');

      // Verify that IC accounts net to 0 after elimination
      const icRec = report.rows.find((r) => r.account_code === '1150');
      expect(icRec?.elimination_debit_minor).toBe('30000');
      expect(icRec?.net_consolidated_minor).toBe('0');

      const icPay = report.rows.find((r) => r.account_code === '2150');
      expect(icPay?.elimination_credit_minor).toBe('30000');
      expect(icPay?.net_consolidated_minor).toBe('0');
    });
  });
});
