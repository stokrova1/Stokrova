import { describe, it, expect } from 'vitest';
import {
  translateBalanceToReportingCurrency,
  assertValidConsolidationStatusTransition,
  assertValidEliminationEntry,
  calculateIntercompanyDiscrepancy,
  identifyUnmappedAccounts,
  calculateConsolidatedLineTotal,
} from '../src/consolidation.js';
import {
  assertValidCashTransferTransition,
  calculateCashPosition,
  calculateCashForecast,
  assertValidBankTransactionImport,
} from '../src/treasury.js';
import {
  calculateTaxAmountFromBasisPoints,
  calculateNetTaxDue,
  assertValidTaxReturnStatusTransition,
  reconcileTaxWithGl,
} from '../src/tax.js';

describe('Phase 7 Domain Logic — Consolidation, Treasury & Tax', () => {
  describe('Consolidation Domain Logic', () => {
    it('translates balances to reporting currency using pure integer basis points', () => {
      // 100,000 minor units at 1.0800 FX rate (10800 basis points) = 108,000
      expect(translateBalanceToReportingCurrency('100000', 10800)).toBe('108000');
      // 250,550 minor units at 0.8500 FX rate (8500 basis points) = 212,967 (integer truncated)
      expect(translateBalanceToReportingCurrency('250550', 8500)).toBe('212967');
    });

    it('throws error for non-positive exchange rate basis points', () => {
      expect(() => translateBalanceToReportingCurrency('100000', 0)).toThrow(
        'Exchange rate basis points must be strictly positive',
      );
    });

    it('enforces consolidation run status transition rules', () => {
      expect(() =>
        assertValidConsolidationStatusTransition('DRAFT', 'VALIDATING'),
      ).not.toThrow();
      expect(() =>
        assertValidConsolidationStatusTransition('VALIDATING', 'READY'),
      ).not.toThrow();
      expect(() =>
        assertValidConsolidationStatusTransition('READY', 'CONSOLIDATING'),
      ).not.toThrow();
      expect(() =>
        assertValidConsolidationStatusTransition('CONSOLIDATING', 'COMPLETED'),
      ).not.toThrow();
      expect(() =>
        assertValidConsolidationStatusTransition('DRAFT', 'COMPLETED'),
      ).toThrow();
    });

    it('enforces balanced elimination entries', () => {
      expect(() =>
        assertValidEliminationEntry('500000', '500000'),
      ).not.toThrow();
      expect(() =>
        assertValidEliminationEntry('500000', '490000'),
      ).toThrow('Elimination entry is unbalanced');
    });

    it('calculates intercompany discrepancy and match status correctly', () => {
      // Exact match
      const exact = calculateIntercompanyDiscrepancy('100000', '100000');
      expect(exact.match_status).toBe('MATCHED');
      expect(exact.discrepancy_minor).toBe('0');

      // Partial within tolerance (tolerance = 100)
      const partial = calculateIntercompanyDiscrepancy('100050', '100000', '100');
      expect(partial.match_status).toBe('PARTIAL');
      expect(partial.discrepancy_minor).toBe('50');

      // Unmatched difference outside tolerance
      const diff = calculateIntercompanyDiscrepancy('105000', '100000', '100');
      expect(diff.match_status).toBe('UNMATCHED_DIFFERENCE');
      expect(diff.discrepancy_minor).toBe('5000');
    });

    it('identifies unmapped accounts correctly', () => {
      const source = ['1000', '1010', '1100', '9999'];
      const mapped = new Set(['1000', '1010', '1100']);
      const unmapped = identifyUnmappedAccounts(source, mapped);
      expect(unmapped).toEqual(['9999']);
    });

    it('calculates consolidated line total accurately', () => {
      // Company A = 50,000, Company B = 40,000, Elimination = 10,000 => Net = 80,000
      expect(calculateConsolidatedLineTotal(['50000', '40000'], '10000')).toBe('80000');
    });
  });

  describe('Treasury Domain Logic', () => {
    it('enforces cash transfer status transition and dual approval rules', () => {
      expect(() =>
        assertValidCashTransferTransition('DRAFT', 'AWAITING_APPROVAL'),
      ).not.toThrow();

      // Dual approval required but not dual approved
      expect(() =>
        assertValidCashTransferTransition('AWAITING_APPROVAL', 'APPROVED', true, false),
      ).toThrow('requires dual authorization');

      // Dual approval required and dual approved
      expect(() =>
        assertValidCashTransferTransition('AWAITING_APPROVAL', 'APPROVED', true, true),
      ).not.toThrow();

      // Illegal transition
      expect(() =>
        assertValidCashTransferTransition('DRAFT', 'SETTLED'),
      ).toThrow();
    });

    it('calculates aggregate cash position across multiple bank accounts', () => {
      const position = calculateCashPosition(['1500000', '2500000', '750000']);
      expect(position).toBe('4750000');
    });

    it('calculates cash forecast with net change and projected closing', () => {
      const forecast = calculateCashForecast(
        '1000000', // Opening: $10,000
        ['500000', '250000'], // Inflows: $7,500
        ['300000', '150000'], // Outflows: $4,500
      );
      expect(forecast.opening_cash_minor).toBe('1000000');
      expect(forecast.total_inflows_minor).toBe('750000');
      expect(forecast.total_outflows_minor).toBe('450000');
      expect(forecast.net_change_minor).toBe('300000');
      expect(forecast.projected_closing_minor).toBe('1300000');
    });

    it('validates bank transaction import integrity', () => {
      expect(() =>
        assertValidBankTransactionImport('5000', '2026-10-11T12:00:00Z'),
      ).not.toThrow();
      expect(() =>
        assertValidBankTransactionImport('0', '2026-10-11T12:00:00Z'),
      ).toThrow('Bank transaction amount cannot be zero');
      expect(() =>
        assertValidBankTransactionImport('5000', 'invalid-date'),
      ).toThrow('Invalid bank transaction date format');
    });
  });

  describe('Tax Compliance Domain Logic', () => {
    it('calculates tax amounts from basis points', () => {
      // 100,000 at 7.5% (750 bp) = 7,500
      expect(calculateTaxAmountFromBasisPoints('100000', 750)).toBe('7500');
      // 200,000 at 20% (2000 bp) = 40,000
      expect(calculateTaxAmountFromBasisPoints('200000', 2000)).toBe('40000');
    });

    it('calculates net tax due correctly', () => {
      // Output Tax 40,000, Recoverable Input Tax 15,000 = 25,000 Net Payable
      expect(calculateNetTaxDue('40000', '15000')).toBe('25000');
      // Output Tax 10,000, Recoverable Input Tax 15,000 = -5,000 Net Refundable
      expect(calculateNetTaxDue('10000', '15000')).toBe('-5000');
    });

    it('enforces tax return status transitions', () => {
      expect(() =>
        assertValidTaxReturnStatusTransition('DRAFT', 'PREPARED'),
      ).not.toThrow();
      expect(() =>
        assertValidTaxReturnStatusTransition('PREPARED', 'VALIDATED'),
      ).not.toThrow();
      expect(() =>
        assertValidTaxReturnStatusTransition('VALIDATED', 'APPROVED'),
      ).not.toThrow();
      expect(() =>
        assertValidTaxReturnStatusTransition('APPROVED', 'SUBMITTED'),
      ).not.toThrow();
      expect(() =>
        assertValidTaxReturnStatusTransition('DRAFT', 'SUBMITTED'),
      ).toThrow();
    });

    it('reconciles tax return calculations against GL control accounts', () => {
      // Balanced
      const balanced = reconcileTaxWithGl('25000', '25000');
      expect(balanced.is_balanced).toBe(true);
      expect(balanced.discrepancy_minor).toBe('0');

      // Discrepancy
      const discrepancy = reconcileTaxWithGl('25000', '24500');
      expect(discrepancy.is_balanced).toBe(false);
      expect(discrepancy.discrepancy_minor).toBe('500');
    });
  });
});
