import { describe, it, expect } from 'vitest';
import {
  CreateConsolidationGroupSchema,
  AddGroupMemberSchema,
  MapEntityAccountSchema,
  ExecuteConsolidationRunSchema,
  RecordIntercompanyTransactionSchema,
  CreateEliminationRuleSchema,
} from '../src/consolidation.js';
import {
  CreateBankAccountSchema,
  InitiateCashTransferSchema,
  SyncBankFeedSchema,
  GenerateCashForecastSchema,
} from '../src/treasury.js';
import {
  CreateTaxRegistrationSchema,
  CreateTaxJurisdictionConfigSchema,
  CreateTaxFilingPeriodSchema,
  PrepareTaxReturnSchema,
} from '../src/tax.js';

describe('Phase 7 Validation Schemas', () => {
  describe('Consolidation & Intercompany Schemas', () => {
    it('validates CreateConsolidationGroupSchema correctly', () => {
      const valid = {
        group_code: 'GRP_HOLDING',
        name: 'Stokrova Group Holdings',
        parent_company_id: 'comp_holding',
        reporting_currency: 'USD',
      };
      expect(CreateConsolidationGroupSchema.safeParse(valid).success).toBe(true);

      const invalid = { group_code: '', name: '' };
      expect(CreateConsolidationGroupSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates AddGroupMemberSchema correctly', () => {
      const valid = {
        company_id: 'comp_sub1',
        book_id: 'book_sub1',
        ownership_percentage_basis_points: 10000,
        effective_from: new Date().toISOString(),
        inclusion_status: 'FULL',
        functional_currency: 'USD',
      };
      expect(AddGroupMemberSchema.safeParse(valid).success).toBe(true);
    });

    it('validates ExecuteConsolidationRunSchema correctly', () => {
      const valid = {
        group_id: 'grp_1',
        period_id: 'period_2026_q3',
        operation_id: 'op_consol_run_1',
        run_by: 'usr_controller',
        fx_rates: { EUR: 10800, GBP: 12500 },
      };
      expect(ExecuteConsolidationRunSchema.safeParse(valid).success).toBe(true);
    });

    it('validates RecordIntercompanyTransactionSchema correctly', () => {
      const valid = {
        transaction_reference: 'ICTX-2026-001',
        from_company_id: 'comp_seller',
        to_company_id: 'comp_buyer',
        transaction_type: 'TRADE_SALE',
        source_document_type: 'INVOICE',
        source_document_id: 'inv_123',
        amount_minor: '1500000',
      };
      expect(RecordIntercompanyTransactionSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Treasury Schemas', () => {
    it('validates CreateBankAccountSchema correctly', () => {
      const valid = {
        company_id: 'comp_1',
        bank_name: 'JPMorgan Chase',
        account_name: 'Operating Checking',
        account_number: '1234567890',
        gl_account_id: 'acc_1020',
      };
      expect(CreateBankAccountSchema.safeParse(valid).success).toBe(true);
    });

    it('validates InitiateCashTransferSchema correctly', () => {
      const valid = {
        source_company_id: 'comp_1',
        source_bank_account_id: 'bank_acc_1',
        destination_company_id: 'comp_2',
        destination_bank_account_id: 'bank_acc_2',
        amount_minor: '500000',
        operation_id: 'op_transfer_001',
        initiated_by: 'usr_treasurer',
      };
      expect(InitiateCashTransferSchema.safeParse(valid).success).toBe(true);

      // Negative or zero amount should fail
      const invalid = { ...valid, amount_minor: '0' };
      expect(InitiateCashTransferSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates SyncBankFeedSchema correctly', () => {
      const valid = {
        bank_account_id: 'bank_acc_1',
        provider_type: 'SANDBOX',
        transactions: [
          {
            external_transaction_id: 'tx_ext_001',
            transaction_date: new Date().toISOString(),
            amount_minor: '5000',
            description: 'Vendor Wire In',
            transaction_type: 'DEPOSIT',
          },
        ],
      };
      expect(SyncBankFeedSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Tax Compliance Schemas', () => {
    it('validates CreateTaxRegistrationSchema correctly', () => {
      const valid = {
        company_id: 'comp_1',
        jurisdiction_code: 'US_CA',
        tax_id_number: 'CA-987654321',
        tax_type: 'SALES_TAX',
        filing_frequency: 'MONTHLY',
        effective_from: new Date().toISOString(),
      };
      expect(CreateTaxRegistrationSchema.safeParse(valid).success).toBe(true);
    });

    it('validates CreateTaxJurisdictionConfigSchema correctly', () => {
      const valid = {
        jurisdiction_code: 'US_CA',
        version: 1,
        standard_rate_basis_points: 725,
        effective_from: new Date().toISOString(),
      };
      expect(CreateTaxJurisdictionConfigSchema.safeParse(valid).success).toBe(true);
    });

    it('validates PrepareTaxReturnSchema correctly', () => {
      const valid = {
        filing_period_id: 'period_tax_01',
        company_id: 'comp_1',
        operation_id: 'op_tax_prep_001',
        prepared_by: 'usr_tax_mgr',
      };
      expect(PrepareTaxReturnSchema.safeParse(valid).success).toBe(true);
    });
  });
});
