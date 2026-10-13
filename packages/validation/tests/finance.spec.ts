import { describe, it, expect } from 'vitest';
import {
  CreateAccountSchema,
  CreateJournalEntrySchema,
  ReverseJournalEntrySchema,
  CreateTaxGroupSchema,
  CalculateTaxSchema,
} from '../src/finance.js';

describe('Financial Accounting & General Ledger Validation Schemas (Phase 10)', () => {
  describe('CreateAccountSchema', () => {
    it('validates a valid account creation request', () => {
      const valid = {
        company_id: 'comp-1',
        code: '1010',
        name: 'Cash on Hand',
        type: 'ASSET',
        subtype: 'CASH',
        currency: 'USD',
        is_active: true,
      };
      const parsed = CreateAccountSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects an invalid account type', () => {
      const invalid = {
        company_id: 'comp-1',
        code: '1010',
        name: 'Cash on Hand',
        type: 'INVALID_TYPE',
        subtype: 'CASH',
      };
      const parsed = CreateAccountSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('CreateJournalEntrySchema', () => {
    it('validates a valid journal entry payload with balanced lines format', () => {
      const valid = {
        company_id: 'comp-1',
        posting_date: '2026-10-11T12:00:00Z',
        narration: 'Retail cash sales settlement',
        lines: [
          { account_id: 'acc-1', debit_minor: '10000', credit_minor: '0' },
          { account_id: 'acc-2', debit_minor: '0', credit_minor: '10000' },
        ],
      };
      const parsed = CreateJournalEntrySchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects journal entries with fewer than two lines', () => {
      const invalid = {
        company_id: 'comp-1',
        posting_date: '2026-10-11T12:00:00Z',
        narration: 'Single line attempt',
        lines: [
          { account_id: 'acc-1', debit_minor: '10000', credit_minor: '0' },
        ],
      };
      const parsed = CreateJournalEntrySchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects non-integer debit amounts', () => {
      const invalid = {
        company_id: 'comp-1',
        posting_date: '2026-10-11T12:00:00Z',
        narration: 'Decimal attempt',
        lines: [
          { account_id: 'acc-1', debit_minor: '10.50', credit_minor: '0' },
          { account_id: 'acc-2', debit_minor: '0', credit_minor: '10' },
        ],
      };
      const parsed = CreateJournalEntrySchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('ReverseJournalEntrySchema', () => {
    it('validates valid reversal parameters', () => {
      const valid = {
        reversal_date: '2026-10-12T10:00:00Z',
        narration: 'Correcting erroneous period entry',
      };
      const parsed = ReverseJournalEntrySchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });

  describe('CreateTaxGroupSchema & CalculateTaxSchema', () => {
    it('validates tax group creation', () => {
      const valid = {
        code: 'GROUP-STANDARD',
        name: 'Standard Retail Taxes',
        tax_rate_ids: ['tax-1', 'tax-2'],
      };
      const parsed = CreateTaxGroupSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('validates integer tax calculation request', () => {
      const valid = {
        amount_minor: '50000',
        tax_rate_ids: ['tax-1'],
        is_inclusive: false,
      };
      const parsed = CalculateTaxSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects decimal amount for tax calculation', () => {
      const invalid = {
        amount_minor: '500.25',
        tax_rate_ids: ['tax-1'],
      };
      const parsed = CalculateTaxSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });
});
