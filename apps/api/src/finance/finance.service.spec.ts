import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';
import { FinancialReportsService } from './financial-reports.service.js';

describe('Financial Accounting & General Ledger Service Suite (Phase 10)', () => {
  let accountsService: AccountsService;
  let glService: GeneralLedgerService;
  let reportsService: FinancialReportsService;

  const tenantAId = 'tenant-alpha';
  const tenantBId = 'tenant-beta';
  const companyAId = 'comp-alpha-1';

  beforeEach(() => {
    accountsService = new AccountsService();
    glService = new GeneralLedgerService(accountsService);
    reportsService = new FinancialReportsService(accountsService, glService);
  });

  // ==========================================================================
  // 1. Chart of Accounts Management & Seeding
  // ==========================================================================
  describe('Chart of Accounts', () => {
    it('creates an account with proper normal balance mapping', async () => {
      const acc = await accountsService.createAccount(tenantAId, {
        company_id: companyAId,
        code: '1010',
        name: 'Cash on Hand',
        type: 'ASSET',
        subtype: 'CASH',
      });

      expect(acc.id).toBeDefined();
      expect(acc.code).toBe('1010');
      expect(acc.normal_balance).toBe('DEBIT');
      expect(acc.is_active).toBe(true);
    });

    it('rejects duplicate account code within the same company', async () => {
      await accountsService.createAccount(tenantAId, {
        company_id: companyAId,
        code: '1010',
        name: 'Cash on Hand',
        type: 'ASSET',
        subtype: 'CASH',
      });

      await expect(
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '1010',
          name: 'Duplicate Cash Account',
          type: 'ASSET',
          subtype: 'CASH',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('seeds the full standard 14-account chart of accounts cleanly', async () => {
      const seeded = await accountsService.seedDefaultChartOfAccounts(tenantAId, companyAId);
      expect(seeded.length).toBe(14);

      const accounts = await accountsService.listAccounts(tenantAId, { company_id: companyAId });
      expect(accounts.length).toBe(14);

      // Verify key accounts exist
      const cash = accounts.find((a) => a.code === '1010');
      expect(cash?.name).toContain('Cash on Hand');
      const cogs = accounts.find((a) => a.code === '5010');
      expect(cogs?.normal_balance).toBe('DEBIT');
      const sales = accounts.find((a) => a.code === '4010');
      expect(sales?.normal_balance).toBe('CREDIT');
    });
  });

  // ==========================================================================
  // 2. Journal Entry Validation & Balanced Posting
  // ==========================================================================
  describe('Journal Entries & Double-Entry Invariants', () => {
    it('creates and posts a balanced journal entry successfully', async () => {
      const [cash, rev] = await Promise.all([
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '1010',
          name: 'Cash',
          type: 'ASSET',
          subtype: 'CASH',
        }),
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '4010',
          name: 'Sales',
          type: 'REVENUE',
          subtype: 'SALES_REVENUE',
        }),
      ]);

      const entry = await glService.createJournalEntry(tenantAId, {
        company_id: companyAId,
        posting_date: '2026-10-11T12:00:00Z',
        narration: 'Cash sale received',
        lines: [
          { account_id: cash.id, debit_minor: '25000', credit_minor: '0' },
          { account_id: rev.id, debit_minor: '0', credit_minor: '25000' },
        ],
      });

      expect(entry.id).toBeDefined();
      expect(entry.status).toBe('POSTED');
      expect(entry.total_debit_minor).toBe('25000');
      expect(entry.total_credit_minor).toBe('25000');
      expect(entry.lines.length).toBe(2);
    });

    it('rejects an out-of-balance journal entry with descriptive variance', async () => {
      const [cash, rev] = await Promise.all([
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '1010',
          name: 'Cash',
          type: 'ASSET',
          subtype: 'CASH',
        }),
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '4010',
          name: 'Sales',
          type: 'REVENUE',
          subtype: 'SALES_REVENUE',
        }),
      ]);

      await expect(
        glService.createJournalEntry(tenantAId, {
          company_id: companyAId,
          posting_date: '2026-10-11T12:00:00Z',
          narration: 'Unbalanced sale attempt',
          lines: [
            { account_id: cash.id, debit_minor: '30000', credit_minor: '0' },
            { account_id: rev.id, debit_minor: '0', credit_minor: '25000' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects posting to an inactive account', async () => {
      const [cash, rev] = await Promise.all([
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '1010',
          name: 'Cash',
          type: 'ASSET',
          subtype: 'CASH',
        }),
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '4010',
          name: 'Sales',
          type: 'REVENUE',
          subtype: 'SALES_REVENUE',
          is_active: false,
        }),
      ]);

      await expect(
        glService.createJournalEntry(tenantAId, {
          company_id: companyAId,
          posting_date: '2026-10-11T12:00:00Z',
          narration: 'Sale with inactive account',
          lines: [
            { account_id: cash.id, debit_minor: '10000', credit_minor: '0' },
            { account_id: rev.id, debit_minor: '0', credit_minor: '10000' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // 3. Reversing Entries Engine (Rule 11: Never Delete Financial History)
  // ==========================================================================
  describe('Reversing Entries Engine', () => {
    it('creates an exact inverted compensating entry and marks original as REVERSED', async () => {
      const [cash, rev] = await Promise.all([
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '1010',
          name: 'Cash',
          type: 'ASSET',
          subtype: 'CASH',
        }),
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '4010',
          name: 'Sales',
          type: 'REVENUE',
          subtype: 'SALES_REVENUE',
        }),
      ]);

      const original = await glService.createJournalEntry(tenantAId, {
        company_id: companyAId,
        posting_date: '2026-10-11T12:00:00Z',
        narration: 'Original sale to reverse',
        lines: [
          { account_id: cash.id, debit_minor: '50000', credit_minor: '0' },
          { account_id: rev.id, debit_minor: '0', credit_minor: '50000' },
        ],
      });

      const { original: updatedOriginal, reversal } = await glService.reverseJournalEntry(
        tenantAId,
        original.id,
        {
          reversal_date: '2026-10-12T12:00:00Z',
          narration: 'Customer return reversal',
        },
        'user-admin',
      );

      // Verify original status transition
      expect(updatedOriginal.status).toBe('REVERSED');
      expect(updatedOriginal.reversal_entry_id).toBe(reversal.id);

      // Verify reversal entry
      expect(reversal.status).toBe('POSTED');
      expect(reversal.source_type).toBe('REVERSAL');
      expect(reversal.reversal_of_entry_id).toBe(original.id);
      expect(reversal.total_debit_minor).toBe('50000');
      expect(reversal.total_credit_minor).toBe('50000');

      // Verify inverted lines
      const revCashLine = reversal.lines.find((l) => l.account_id === cash.id);
      expect(revCashLine?.credit_minor).toBe('50000');
      expect(revCashLine?.debit_minor).toBe('0');

      const revRevLine = reversal.lines.find((l) => l.account_id === rev.id);
      expect(revRevLine?.debit_minor).toBe('50000');
      expect(revRevLine?.credit_minor).toBe('0');
    });

    it('rejects reversing an already reversed journal entry', async () => {
      const [cash, rev] = await Promise.all([
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '1010',
          name: 'Cash',
          type: 'ASSET',
          subtype: 'CASH',
        }),
        accountsService.createAccount(tenantAId, {
          company_id: companyAId,
          code: '4010',
          name: 'Sales',
          type: 'REVENUE',
          subtype: 'SALES_REVENUE',
        }),
      ]);

      const original = await glService.createJournalEntry(tenantAId, {
        company_id: companyAId,
        posting_date: '2026-10-11T12:00:00Z',
        narration: 'Sale',
        lines: [
          { account_id: cash.id, debit_minor: '10000', credit_minor: '0' },
          { account_id: rev.id, debit_minor: '0', credit_minor: '10000' },
        ],
      });

      await glService.reverseJournalEntry(tenantAId, original.id, {
        reversal_date: '2026-10-12T12:00:00Z',
      });

      // Second reversal attempt must fail
      await expect(
        glService.reverseJournalEntry(tenantAId, original.id, {
          reversal_date: '2026-10-13T12:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // 4. Automated Posting Adapters
  // ==========================================================================
  describe('Automated Sub-Ledger Postings', () => {
    it('executes automated commercial POS sale posting with COGS and tax', async () => {
      const seeded = await accountsService.seedDefaultChartOfAccounts(tenantAId, companyAId);
      const cashAcc = seeded.find((a) => a.code === '1010')!;
      const revAcc = seeded.find((a) => a.code === '4010')!;
      const taxAcc = seeded.find((a) => a.code === '2100')!;
      const cogsAcc = seeded.find((a) => a.code === '5010')!;
      const invAcc = seeded.find((a) => a.code === '1200')!;

      // Sale of $107.50 ($100 sale + $7.50 tax), COGS $60.00
      const saleEntry = await glService.postCommercialSale(tenantAId, {
        companyId: companyAId,
        saleId: 'order-9988',
        cashAccountId: cashAcc.id,
        revenueAccountId: revAcc.id,
        cogsAccountId: cogsAcc.id,
        inventoryAssetAccountId: invAcc.id,
        grossSaleMinor: '10750',
        cogsMinor: '6000',
        taxLiabilityAccountId: taxAcc.id,
        taxMinor: '750',
      });

      expect(saleEntry.status).toBe('POSTED');
      expect(saleEntry.source_type).toBe('POS_SALE');
      // Total Debits: 10750 (Cash) + 6000 (COGS) = 16750
      expect(saleEntry.total_debit_minor).toBe('16750');
      expect(saleEntry.total_credit_minor).toBe('16750');
      expect(saleEntry.lines.length).toBe(5);
    });

    it('executes automated purchase order inventory intake posting', async () => {
      const seeded = await accountsService.seedDefaultChartOfAccounts(tenantAId, companyAId);
      const invAcc = seeded.find((a) => a.code === '1200')!;
      const apAcc = seeded.find((a) => a.code === '2010')!;

      const grnEntry = await glService.postInventoryIntake(tenantAId, {
        companyId: companyAId,
        poId: 'po-7711',
        inventoryAssetAccountId: invAcc.id,
        apAccountId: apAcc.id,
        totalIntakeMinor: '250000', // $2,500.00 inventory intake
      });

      expect(grnEntry.status).toBe('POSTED');
      expect(grnEntry.source_type).toBe('PO_RECEIPT');
      expect(grnEntry.total_debit_minor).toBe('250000');
      expect(grnEntry.total_credit_minor).toBe('250000');
    });
  });

  // ==========================================================================
  // 5. Financial Statements Engine
  // ==========================================================================
  describe('Financial Statements Engine', () => {
    it('generates fully balanced Trial Balance, Balance Sheet, and Income Statement', async () => {
      const seeded = await accountsService.seedDefaultChartOfAccounts(tenantAId, companyAId);
      const cashAcc = seeded.find((a) => a.code === '1010')!;
      const revAcc = seeded.find((a) => a.code === '4010')!;
      const cogsAcc = seeded.find((a) => a.code === '5010')!;
      const invAcc = seeded.find((a) => a.code === '1200')!;
      const apAcc = seeded.find((a) => a.code === '2010')!;

      // 1. Inbound Inventory Purchase: $1,000 Inventory Asset, $1,000 AP
      await glService.postInventoryIntake(tenantAId, {
        companyId: companyAId,
        poId: 'po-1',
        inventoryAssetAccountId: invAcc.id,
        apAccountId: apAcc.id,
        totalIntakeMinor: '100000',
      });

      // 2. Retail Sale: $600 Cash, $600 Revenue, $300 COGS, $300 Inventory
      await glService.postCommercialSale(tenantAId, {
        companyId: companyAId,
        saleId: 'sale-1',
        cashAccountId: cashAcc.id,
        revenueAccountId: revAcc.id,
        cogsAccountId: cogsAcc.id,
        inventoryAssetAccountId: invAcc.id,
        grossSaleMinor: '60000',
        cogsMinor: '30000',
      });

      // Trial Balance
      const tb = await reportsService.getTrialBalance(tenantAId, companyAId);
      expect(tb.is_balanced).toBe(true);
      expect(tb.total_debit_minor).toBe('190000');
      expect(tb.total_credit_minor).toBe('190000');

      // Income Statement: Revenue $600 - COGS $300 = Net Income $300 (30,000 minor)
      const is = await reportsService.getIncomeStatement(tenantAId, companyAId);
      expect(is.revenue_total_minor).toBe('60000');
      expect(is.cogs_total_minor).toBe('30000');
      expect(is.gross_profit_minor).toBe('30000');
      expect(is.net_income_minor).toBe('30000');

      // Balance Sheet: Assets = Cash (60000) + Inventory (100000 - 30000 = 70000) = 130000
      // Liabilities & Equity = AP (100000) + Net Income (30000) = 130000
      const bs = await reportsService.getBalanceSheet(tenantAId, companyAId);
      expect(bs.is_balanced).toBe(true);
      expect(bs.total_assets_minor).toBe('130000');
      expect(bs.total_liabilities_equity_minor).toBe('130000');
    });
  });

  // ==========================================================================
  // 6. Strict Multi-Tenant Isolation
  // ==========================================================================
  describe('Multi-Tenant Isolation', () => {
    it('guarantees tenant A accounts and ledgers are completely isolated from tenant B', async () => {
      const seededA = await accountsService.seedDefaultChartOfAccounts(tenantAId, companyAId);
      expect(seededA.length).toBe(14);

      // Tenant B queries must return 0 accounts
      const accountsB = await accountsService.listAccounts(tenantBId, { company_id: companyAId });
      expect(accountsB.length).toBe(0);

      // Tenant B accessing Tenant A account directly throws NotFoundException
      await expect(
        accountsService.getAccountById(tenantBId, seededA[0]!.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
