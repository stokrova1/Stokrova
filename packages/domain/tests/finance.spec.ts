import { describe, it, expect } from 'vitest';
import {
  getNormalBalanceForAccountType,
  assertJournalEntryBalanced,
  assertValidJournalEntryTransition,
  createReversingJournalEntryLines,
  calculateTaxAmounts,
  calculateTrialBalance,
  FinanceDomainError,
} from '../src/finance.js';

describe('Financial Accounting & General Ledger Domain Engine (Phase 10)', () => {
  // ==========================================================================
  // 1. Normal Balance Mappings
  // ==========================================================================
  describe('getNormalBalanceForAccountType', () => {
    it('returns DEBIT for ASSET and EXPENSE accounts', () => {
      expect(getNormalBalanceForAccountType('ASSET')).toBe('DEBIT');
      expect(getNormalBalanceForAccountType('EXPENSE')).toBe('DEBIT');
    });

    it('returns CREDIT for LIABILITY, EQUITY, and REVENUE accounts', () => {
      expect(getNormalBalanceForAccountType('LIABILITY')).toBe('CREDIT');
      expect(getNormalBalanceForAccountType('EQUITY')).toBe('CREDIT');
      expect(getNormalBalanceForAccountType('REVENUE')).toBe('CREDIT');
    });
  });

  // ==========================================================================
  // 2. Journal Entry Balance & Invariant Verification
  // ==========================================================================
  describe('assertJournalEntryBalanced', () => {
    it('passes for a perfectly balanced simple 2-line journal entry', () => {
      const lines = [
        { account_id: 'acc-1', debit_minor: '10000', credit_minor: '0' },
        { account_id: 'acc-2', debit_minor: '0', credit_minor: '10000' },
      ];
      const result = assertJournalEntryBalanced(lines);
      expect(result.total_debit_minor).toBe('10000');
      expect(result.total_credit_minor).toBe('10000');
    });

    it('passes for a balanced compound multi-line journal entry', () => {
      const lines = [
        { account_id: 'acc-cash', debit_minor: '10000', credit_minor: '0' },
        { account_id: 'acc-revenue', debit_minor: '0', credit_minor: '7500' },
        { account_id: 'acc-tax', debit_minor: '0', credit_minor: '2500' },
      ];
      const result = assertJournalEntryBalanced(lines);
      expect(result.total_debit_minor).toBe('10000');
      expect(result.total_credit_minor).toBe('10000');
    });

    it('throws when lines have fewer than two items', () => {
      const lines = [{ account_id: 'acc-1', debit_minor: '1000', credit_minor: '0' }];
      expect(() => assertJournalEntryBalanced(lines)).toThrowError(
        /must contain at least two lines/,
      );
    });

    it('throws when amounts contain non-integer strings', () => {
      const lines = [
        { account_id: 'acc-1', debit_minor: '100.50', credit_minor: '0' },
        { account_id: 'acc-2', debit_minor: '0', credit_minor: '100' },
      ];
      expect(() => assertJournalEntryBalanced(lines)).toThrowError(
        /must be non-negative integer minor unit strings/,
      );
    });

    it('throws when a line has both debit and credit amounts', () => {
      const lines = [
        { account_id: 'acc-1', debit_minor: '500', credit_minor: '200' },
        { account_id: 'acc-2', debit_minor: '0', credit_minor: '300' },
      ];
      expect(() => assertJournalEntryBalanced(lines)).toThrowError(
        /cannot specify both a debit/,
      );
    });

    it('throws when a line has zero debit and zero credit', () => {
      const lines = [
        { account_id: 'acc-1', debit_minor: '1000', credit_minor: '0' },
        { account_id: 'acc-2', debit_minor: '0', credit_minor: '0' },
      ];
      expect(() => assertJournalEntryBalanced(lines)).toThrowError(
        /must specify either a non-zero debit or a non-zero credit/,
      );
    });

    it('throws JOURNAL_ENTRY_UNBALANCED when total debits do not equal credits', () => {
      const lines = [
        { account_id: 'acc-1', debit_minor: '10000', credit_minor: '0' },
        { account_id: 'acc-2', debit_minor: '0', credit_minor: '9500' },
      ];
      try {
        assertJournalEntryBalanced(lines);
        expect.unreachable('Should have thrown unbalanced error');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(FinanceDomainError);
        const fErr = err as FinanceDomainError;
        expect(fErr.code).toBe('JOURNAL_ENTRY_UNBALANCED');
        expect(fErr.details?.variance_minor).toBe('500');
      }
    });
  });

  // ==========================================================================
  // 3. Journal Entry State Machine (Rule 11)
  // ==========================================================================
  describe('assertValidJournalEntryTransition', () => {
    it('allows valid DRAFT to POSTED transition', () => {
      expect(() => assertValidJournalEntryTransition('DRAFT', 'POSTED')).not.toThrow();
    });

    it('allows valid POSTED to REVERSED transition', () => {
      expect(() => assertValidJournalEntryTransition('POSTED', 'REVERSED')).not.toThrow();
    });

    it('allows same-state self transitions idempotently', () => {
      expect(() => assertValidJournalEntryTransition('POSTED', 'POSTED')).not.toThrow();
    });

    it('rejects transitioning directly from DRAFT to REVERSED', () => {
      expect(() => assertValidJournalEntryTransition('DRAFT', 'REVERSED')).toThrowError(
        /Cannot transition journal entry from DRAFT to REVERSED/,
      );
    });

    it('rejects transitioning a REVERSED entry back to POSTED', () => {
      expect(() => assertValidJournalEntryTransition('REVERSED', 'POSTED')).toThrowError(
        /Cannot transition journal entry from REVERSED to POSTED/,
      );
    });
  });

  // ==========================================================================
  // 4. Reversing Entries Engine (Rule 11)
  // ==========================================================================
  describe('createReversingJournalEntryLines', () => {
    it('inverts debits and credits and attaches prefix', () => {
      const originalLines = [
        {
          account_id: 'acc-asset',
          debit_minor: '50000',
          credit_minor: '0',
          currency: 'USD',
          description: 'Inbound equipment purchase',
          reference_entity_type: 'PO',
          reference_entity_id: 'po-101',
        },
        {
          account_id: 'acc-payable',
          debit_minor: '0',
          credit_minor: '50000',
          currency: 'USD',
          description: 'Supplier AP liability',
          reference_entity_type: 'PO',
          reference_entity_id: 'po-101',
        },
      ];

      const reversingLines = createReversingJournalEntryLines(originalLines);

      expect(reversingLines).toHaveLength(2);
      expect(reversingLines[0]).toEqual({
        account_id: 'acc-asset',
        debit_minor: '0',
        credit_minor: '50000',
        currency: 'USD',
        description: '[REVERSAL] Inbound equipment purchase',
        reference_entity_type: 'PO',
        reference_entity_id: 'po-101',
      });
      expect(reversingLines[1]).toEqual({
        account_id: 'acc-payable',
        debit_minor: '50000',
        credit_minor: '0',
        currency: 'USD',
        description: '[REVERSAL] Supplier AP liability',
        reference_entity_type: 'PO',
        reference_entity_id: 'po-101',
      });
    });

    it('throws when provided an empty array', () => {
      expect(() => createReversingJournalEntryLines([])).toThrowError(
        /Cannot generate reversing lines for an empty journal entry/,
      );
    });
  });

  // ==========================================================================
  // 5. Configurable Integer Tax Engine (Zero Float Drift)
  // ==========================================================================
  describe('calculateTaxAmounts', () => {
    const vat75 = {
      id: 'tax-vat75',
      code: 'VAT75',
      rate_bp: 750, // 7.5%
      is_inclusive: false,
      liability_account_id: 'acc-vat-liability',
    };

    it('calculates tax-exclusive amounts with integer basis point precision', () => {
      const result = calculateTaxAmounts('10000', [vat75], false); // $100.00
      expect(result.subtotal_minor).toBe('10000');
      expect(result.tax_total_minor).toBe('750'); // $7.50
      expect(result.total_minor).toBe('10750'); // $107.50
      expect(result.breakdowns).toHaveLength(1);
      expect(result.breakdowns[0].tax_amount_minor).toBe('750');
    });

    it('calculates tax-inclusive amounts extracting net subtotal and tax cleanly', () => {
      const vat10 = {
        id: 'tax-vat10',
        code: 'VAT10',
        rate_bp: 1000, // 10%
        is_inclusive: true,
        liability_account_id: 'acc-vat-liability',
      };
      // Base inclusive amount 11000 ($110.00) -> subtotal $100.00, tax $10.00
      const result = calculateTaxAmounts('11000', [vat10], true);
      expect(result.subtotal_minor).toBe('10000');
      expect(result.tax_total_minor).toBe('1000');
      expect(result.total_minor).toBe('11000');
    });

    it('handles empty taxes cleanly returning zero tax', () => {
      const result = calculateTaxAmounts('25000', []);
      expect(result.subtotal_minor).toBe('25000');
      expect(result.tax_total_minor).toBe('0');
      expect(result.total_minor).toBe('25000');
      expect(result.breakdowns).toHaveLength(0);
    });

    it('rejects invalid non-integer string amounts', () => {
      expect(() => calculateTaxAmounts('100.99', [vat75])).toThrowError(
        /Base amount must be a positive integer minor unit string/,
      );
    });
  });

  // ==========================================================================
  // 6. Trial Balance Aggregator & Ledger Equilibrium
  // ==========================================================================
  describe('calculateTrialBalance', () => {
    const accounts = [
      { id: '1', code: '1010', name: 'Cash on Hand', type: 'ASSET' as const, normal_balance: 'DEBIT' as const },
      { id: '2', code: '1200', name: 'Inventory Asset', type: 'ASSET' as const, normal_balance: 'DEBIT' as const },
      { id: '3', code: '2010', name: 'Accounts Payable', type: 'LIABILITY' as const, normal_balance: 'CREDIT' as const },
      { id: '4', code: '4010', name: 'Sales Revenue', type: 'REVENUE' as const, normal_balance: 'CREDIT' as const },
    ];

    it('computes balanced debits, credits, and net balances per account normal balance', () => {
      const lines = [
        // Cash Sale $100: Dr Cash 10000, Cr Revenue 10000
        { account_id: '1', debit_minor: '10000', credit_minor: '0' },
        { account_id: '4', debit_minor: '0', credit_minor: '10000' },
        // Inventory Purchase on Credit $50: Dr Inventory 5000, Cr AP 5000
        { account_id: '2', debit_minor: '5000', credit_minor: '0' },
        { account_id: '3', debit_minor: '0', credit_minor: '5000' },
      ];

      const report = calculateTrialBalance(accounts, lines);

      expect(report.is_balanced).toBe(true);
      expect(report.total_debit_minor).toBe('15000');
      expect(report.total_credit_minor).toBe('15000');
      expect(report.rows).toHaveLength(4);

      // Verify net balances respect normal balance sign
      const cashRow = report.rows.find((r) => r.account_code === '1010');
      expect(cashRow?.net_balance_minor).toBe('10000'); // Positive Debit

      const revenueRow = report.rows.find((r) => r.account_code === '4010');
      expect(revenueRow?.net_balance_minor).toBe('10000'); // Positive Credit

      const apRow = report.rows.find((r) => r.account_code === '2010');
      expect(apRow?.net_balance_minor).toBe('5000'); // Positive Credit
    });
  });
});
