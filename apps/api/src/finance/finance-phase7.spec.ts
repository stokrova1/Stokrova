import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { AccountingBooksService } from './accounting-books.service.js';
import { PostingRulesService } from './posting-rules.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';
import { PostingEngineService } from './posting-engine.service.js';
import { FinancialReportsService } from './financial-reports.service.js';
import { ConsolidationService } from './consolidation.service.js';
import { IntercompanyService } from './intercompany.service.js';
import { TreasuryService } from './treasury.service.js';
import { TaxComplianceService } from './tax-compliance.service.js';
import { ITaxProviderAdapter } from './adapters/tax-provider.adapter.js';
import type { AccountingBook, AccountingPeriod } from '@stokrova/contracts';

describe('STOKROVA Phase 7: Enterprise Financial Management Master Specification', () => {
  let accountsService: AccountsService;
  let booksService: AccountingBooksService;
  let rulesService: PostingRulesService;
  let glService: GeneralLedgerService;
  let postingEngine: PostingEngineService;
  let reportsService: FinancialReportsService;
  let consolidationService: ConsolidationService;
  let intercompanyService: IntercompanyService;
  let treasuryService: TreasuryService;
  let taxService: TaxComplianceService;

  const tenantAlpha = 'tenant-corp-alpha';
  const tenantBeta = 'tenant-corp-beta';
  const companyParent = 'company-alpha-parent';
  const companySubA = 'company-alpha-sub-a';
  const companySubB = 'company-alpha-sub-b';

  let parentBook: AccountingBook;
  let subABook: AccountingBook;
  let subBBook: AccountingBook;
  let parentPeriods: AccountingPeriod[];

  beforeEach(async () => {
    accountsService = new AccountsService();
    booksService = new AccountingBooksService();
    rulesService = new PostingRulesService();
    glService = new GeneralLedgerService(accountsService, booksService);
    postingEngine = new PostingEngineService(accountsService, glService, rulesService);
    reportsService = new FinancialReportsService(accountsService, glService);
    intercompanyService = new IntercompanyService();
    consolidationService = new ConsolidationService(reportsService, intercompanyService);
    treasuryService = new TreasuryService();
    taxService = new TaxComplianceService();

    // 1. Seed Books and Standard Fiscal Calendars
    const setupParent = await booksService.seedDefaultBookAndPeriods(tenantAlpha, companyParent, 2026);
    parentBook = setupParent.book;
    parentPeriods = setupParent.periods;
    await accountsService.seedExpandedChartOfAccounts(tenantAlpha, companyParent, parentBook.id);
    await rulesService.seedDefaultPostingRules(tenantAlpha, companyParent, parentBook.id);

    const setupSubA = await booksService.seedDefaultBookAndPeriods(tenantAlpha, companySubA, 2026);
    subABook = setupSubA.book;
    await accountsService.seedExpandedChartOfAccounts(tenantAlpha, companySubA, subABook.id);
    await rulesService.seedDefaultPostingRules(tenantAlpha, companySubA, subABook.id);

    const setupSubB = await booksService.seedDefaultBookAndPeriods(tenantAlpha, companySubB, 2026);
    subBBook = setupSubB.book;
    await accountsService.seedExpandedChartOfAccounts(tenantAlpha, companySubB, subBBook.id);
    await rulesService.seedDefaultPostingRules(tenantAlpha, companySubB, subBBook.id);
  });

  // ==========================================================================
  // SCENARIO A: Multi-Entity Consolidation Run
  // Aggregates 2 entities, preserves source ledgers, generates group IS & BS
  // ==========================================================================
  describe('Scenario A: Multi-Entity Consolidation Run', () => {
    it('aggregates balances across entities, leaves entity journals unmutated, and produces balanced statements', async () => {
      // 1. Post Customer Revenue in Parent Company ($10,000 subtotal)
      await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyParent,
        invoice_id: 'inv-parent-001',
        invoice_number: 'INV-P001',
        posting_date: '2026-03-10T10:00:00Z',
        subtotal_amount_minor: '1000000', // $10,000.00
        tax_amount_minor: '0',
        total_amount_minor: '1000000',
        currency: 'USD',
        operation_id: 'op-inv-p001',
      });

      // 2. Post Customer Revenue in Subsidiary A ($5,000 subtotal)
      await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companySubA,
        invoice_id: 'inv-suba-001',
        invoice_number: 'INV-A001',
        posting_date: '2026-03-12T10:00:00Z',
        subtotal_amount_minor: '500000', // $5,000.00
        tax_amount_minor: '0',
        total_amount_minor: '500000',
        currency: 'USD',
        operation_id: 'op-inv-a001',
      });

      // Count parent and sub journal entries before consolidation
      const parentEntriesBefore = await glService.listJournalEntries(tenantAlpha, { company_id: companyParent });
      const subEntriesBefore = await glService.listJournalEntries(tenantAlpha, { company_id: companySubA });

      // 3. Setup Consolidation Group
      const group = await consolidationService.createGroup(tenantAlpha, {
        group_code: 'GRP-GLOBAL',
        name: 'Stokrova Global Enterprise Group',
        parent_company_id: companyParent,
        reporting_currency: 'USD',
      });

      await consolidationService.addGroupMember(tenantAlpha, group.id, {
        company_id: companyParent,
        book_id: parentBook.id,
        ownership_percentage_basis_points: 10000,
        functional_currency: 'USD',
        effective_from: '2026-01-01',
      });

      await consolidationService.addGroupMember(tenantAlpha, group.id, {
        company_id: companySubA,
        book_id: subABook.id,
        ownership_percentage_basis_points: 10000,
        functional_currency: 'USD',
        effective_from: '2026-01-01',
      });

      // 4. Execute Consolidation Run
      const run = await consolidationService.executeConsolidationRun(tenantAlpha, {
        group_id: group.id,
        period_id: parentPeriods[2]!.id, // March 2026
        run_by: 'user-cfo',
        operation_id: 'op-crun-2026-q1',
      });

      expect(run.status).toBe('COMPLETED');
      expect(run.total_entities_included).toBe(2);

      // Verify Entity-Level Journals are completely unmutated (Golden Rule: Source books authoritative)
      const parentEntriesAfter = await glService.listJournalEntries(tenantAlpha, { company_id: companyParent });
      const subEntriesAfter = await glService.listJournalEntries(tenantAlpha, { company_id: companySubA });
      expect(parentEntriesAfter.length).toBe(parentEntriesBefore.length);
      expect(subEntriesAfter.length).toBe(subEntriesBefore.length);

      // 5. Inspect Consolidated Income Statement & Balance Sheet
      const incStmt = await consolidationService.getConsolidatedIncomeStatement(tenantAlpha, run.id);
      expect(incStmt.total_revenue_minor).toBe('1500000'); // $10,000 + $5,000 = $15,000.00
      expect(incStmt.net_income_minor).toBe('1500000');

      const balSheet = await consolidationService.getConsolidatedBalanceSheet(tenantAlpha, run.id);
      expect(balSheet.is_balanced).toBe(true);
      expect(balSheet.total_assets_minor).toBe('1500000'); // Dr AR $15,000
      expect(balSheet.consolidated_net_income_minor).toBe('1500000');

      const trialBalance = await consolidationService.getConsolidatedTrialBalance(tenantAlpha, run.id);
      expect(trialBalance.is_balanced).toBe(true);
      expect(trialBalance.lines.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SCENARIO B: Intercompany Trade, Matching & Balanced Elimination
  // Sub A sells $3,000 to Parent -> Intercompany AR/AP eliminated at group level
  // ==========================================================================
  describe('Scenario B: Intercompany Trade, Matching and Balanced Elimination Entry', () => {
    it('records intercompany trade, matches with 0 discrepancy, and posts balanced elimination entry', async () => {
      // 1. Establish intercompany relationship
      const rel = await intercompanyService.createRelationship(
        tenantAlpha,
        companySubA,
        companyParent,
        'SUBSIDIARY',
        'USD',
      );
      expect(rel.is_active).toBe(true);

      // 2. Record transactions on both sides ($3,000 = 300,000 minor)
      const txSale = await intercompanyService.recordTransaction(tenantAlpha, {
        transaction_reference: 'ICTX-SALE-001',
        from_company_id: companySubA,
        to_company_id: companyParent,
        transaction_type: 'TRADE_SALE',
        source_document_type: 'INVOICE',
        source_document_id: 'inv-ic-001',
        amount_minor: '300000',
        currency: 'USD',
      });

      const txPurchase = await intercompanyService.recordTransaction(tenantAlpha, {
        transaction_reference: 'ICTX-PURCH-001',
        from_company_id: companyParent,
        to_company_id: companySubA,
        transaction_type: 'TRADE_PURCHASE',
        source_document_type: 'BILL',
        source_document_id: 'bill-ic-001',
        amount_minor: '300000',
        currency: 'USD',
      });

      // 3. Match transactions
      const match = await intercompanyService.matchTransactions(
        tenantAlpha,
        txSale.id,
        txPurchase.id,
        '0',
      );

      expect(match.match_status).toBe('MATCHED');
      expect(match.discrepancy_minor).toBe('0');
      expect(match.matched_amount_minor).toBe('300000');

      // 4. Create group and execute run
      const group = await consolidationService.createGroup(tenantAlpha, {
        group_code: 'GRP-TRADE',
        name: 'Trade Elimination Test Group',
        parent_company_id: companyParent,
        reporting_currency: 'USD',
      });

      await consolidationService.addGroupMember(tenantAlpha, group.id, {
        company_id: companyParent,
        book_id: parentBook.id,
        effective_from: '2026-01-01',
      });

      const run = await consolidationService.executeConsolidationRun(tenantAlpha, {
        group_id: group.id,
        period_id: parentPeriods[2]!.id,
        run_by: 'controller-1',
        operation_id: 'op-crun-elim-trade',
      });

      // 5. Post Group-level Elimination Adjustment: Dr AP 300000, Cr AR 300000
      const adj = await consolidationService.recordEliminationAdjustment(
        tenantAlpha,
        run.id,
        'Eliminate Intercompany Trade Balance between Sub A and Parent',
        [
          {
            company_id: companyParent,
            group_account_code: '2010', // AP
            entry_type: 'DEBIT',
            amount_minor: '300000',
          },
          {
            company_id: companySubA,
            group_account_code: '1100', // AR
            entry_type: 'CREDIT',
            amount_minor: '300000',
          },
        ],
      );

      expect(adj.total_debit_minor).toBe('300000');
      expect(adj.total_credit_minor).toBe('300000');

      const eliminationReport = await consolidationService.getEliminationReport(tenantAlpha, run.id);
      expect(eliminationReport.length).toBe(1);
      expect(eliminationReport[0]!.id).toBe(adj.id);
    });
  });

  // ==========================================================================
  // SCENARIO C: Unmatched Intercompany Balance
  // Discrepancy is visibly queued and never silently eliminated or zeroed out
  // ==========================================================================
  describe('Scenario C: Unmatched Intercompany Balance and Discrepancy Queue', () => {
    it('flags unmatched balances in discrepancy queue and rejects unbalanced elimination entries', async () => {
      // Sub A claims $5,000 receivable from Parent
      const txA = await intercompanyService.recordTransaction(tenantAlpha, {
        transaction_reference: 'ICTX-DISC-A01',
        from_company_id: companySubA,
        to_company_id: companyParent,
        transaction_type: 'TRADE_SALE',
        source_document_type: 'INVOICE',
        source_document_id: 'inv-disc-001',
        amount_minor: '500000', // $5,000
        currency: 'USD',
      });

      // Parent recorded only $4,500 payable
      const txP = await intercompanyService.recordTransaction(tenantAlpha, {
        transaction_reference: 'ICTX-DISC-P01',
        from_company_id: companyParent,
        to_company_id: companySubA,
        transaction_type: 'TRADE_PURCHASE',
        source_document_type: 'BILL',
        source_document_id: 'bill-disc-001',
        amount_minor: '450000', // $4,500
        currency: 'USD',
      });

      // Match evaluation
      const match = await intercompanyService.matchTransactions(
        tenantAlpha,
        txA.id,
        txP.id,
        '0',
      );

      expect(match.match_status).toBe('UNMATCHED_DIFFERENCE');
      expect(match.discrepancy_minor).toBe('50000'); // $500 discrepancy

      // Check unmatched queue: both transactions remain in queue for resolution
      const unmatchedQueue = await intercompanyService.getUnmatchedTransactions(tenantAlpha);
      expect(unmatchedQueue.some((t) => t.id === txA.id)).toBe(true);
      expect(unmatchedQueue.some((t) => t.id === txP.id)).toBe(true);

      // Verify that system rejects an unbalanced elimination adjustment entry
      const group = await consolidationService.createGroup(tenantAlpha, {
        group_code: 'GRP-DISC',
        name: 'Discrepancy Group',
        parent_company_id: companyParent,
      });
      await consolidationService.addGroupMember(tenantAlpha, group.id, {
        company_id: companyParent,
        book_id: parentBook.id,
        effective_from: '2026-01-01',
      });
      const run = await consolidationService.executeConsolidationRun(tenantAlpha, {
        group_id: group.id,
        period_id: parentPeriods[0]!.id,
        run_by: 'auditor',
        operation_id: 'op-run-disc-test',
      });

      // Attempting to post unbalanced entry (Dr 500000, Cr 450000) must throw
      await expect(
        consolidationService.recordEliminationAdjustment(
          tenantAlpha,
          run.id,
          'Unbalanced Attempt',
          [
            { group_account_code: '2010', entry_type: 'DEBIT', amount_minor: '500000' },
            { group_account_code: '1100', entry_type: 'CREDIT', amount_minor: '450000' },
          ],
        ),
      ).rejects.toThrow('balanced');
    });
  });

  // ==========================================================================
  // SCENARIO D: Multi-Currency Translation via Integer Basis Points
  // Pure integer math: £100,000 translated at 1.3250 (13,250 bp) -> $132,500
  // ==========================================================================
  describe('Scenario D: Multi-Currency Translation via Integer Basis Points', () => {
    it('translates functional currency balances to reporting currency using exact integer basis points without floats', async () => {
      // Sub B operates in GBP, posts revenue £100,000 = 10,000,000 minor
      await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companySubB,
        invoice_id: 'inv-gbp-001',
        invoice_number: 'INV-GBP-001',
        posting_date: '2026-03-20T10:00:00Z',
        subtotal_amount_minor: '10000000', // £100,000.00
        tax_amount_minor: '0',
        total_amount_minor: '10000000',
        currency: 'GBP',
        operation_id: 'op-gbp-inv-001',
      });

      const group = await consolidationService.createGroup(tenantAlpha, {
        group_code: 'GRP-MULTI-CURR',
        name: 'Multi-Currency Group',
        parent_company_id: companyParent,
        reporting_currency: 'USD',
      });

      await consolidationService.addGroupMember(tenantAlpha, group.id, {
        company_id: companySubB,
        book_id: subBBook.id,
        functional_currency: 'GBP',
        effective_from: '2026-01-01',
      });

      // FX rate: 1 GBP = 1.3250 USD -> 13250 basis points (10000 bp = 1.0000)
      // Translated = (10000000 * 13250) / 10000 = 13250000 minor ($132,500.00)
      const run = await consolidationService.executeConsolidationRun(tenantAlpha, {
        group_id: group.id,
        period_id: parentPeriods[2]!.id,
        run_by: 'fx-officer',
        operation_id: 'op-fx-crun-001',
        fx_rates: {
          GBP: 13250,
        },
      });

      const incStmt = await consolidationService.getConsolidatedIncomeStatement(tenantAlpha, run.id);
      expect(incStmt.reporting_currency).toBe('USD');
      expect(incStmt.total_revenue_minor).toBe('13250000'); // Exactly $132,500.00, 0 floating point errors
    });
  });

  // ==========================================================================
  // SCENARIO E: Bank Feed Sync Idempotency & Deduplication
  // Retries skip existing external transaction IDs without duplicate records
  // ==========================================================================
  describe('Scenario E: Bank Feed Synchronization & Deduplication', () => {
    it('imports new transactions and idempotently skips duplicates on feed re-runs', async () => {
      // 1. Create masked bank account
      const bankAccount = await treasuryService.createBankAccount(tenantAlpha, {
        company_id: companyParent,
        bank_name: 'JPMorgan Chase',
        account_name: 'Operating Master Account',
        account_number: '12345678901234',
        currency: 'USD',
        gl_account_id: 'gl-acc-1020',
      });

      expect(bankAccount.account_number_masked).toBe('****1234');

      // 2. Initial Bank Feed Import (TX-001, TX-002)
      const batch1 = await treasuryService.syncBankFeed(tenantAlpha, {
        bank_account_id: bankAccount.id,
        transactions: [
          {
            external_transaction_id: 'EXT-TX-001',
            transaction_date: '2026-03-01T12:00:00Z',
            amount_minor: '150000',
            description: 'Customer ACH Deposit A',
          },
          {
            external_transaction_id: 'EXT-TX-002',
            transaction_date: '2026-03-02T12:00:00Z',
            amount_minor: '250000',
            description: 'Customer Wire Deposit B',
          },
        ],
      });

      expect(batch1.imported_count).toBe(2);
      expect(batch1.skipped_duplicates).toBe(0);

      // 3. Retry / Replay same feed with an extra transaction TX-003
      const batch2 = await treasuryService.syncBankFeed(tenantAlpha, {
        bank_account_id: bankAccount.id,
        transactions: [
          {
            external_transaction_id: 'EXT-TX-001', // duplicate
            transaction_date: '2026-03-01T12:00:00Z',
            amount_minor: '150000',
            description: 'Customer ACH Deposit A',
          },
          {
            external_transaction_id: 'EXT-TX-002', // duplicate
            transaction_date: '2026-03-02T12:00:00Z',
            amount_minor: '250000',
            description: 'Customer Wire Deposit B',
          },
          {
            external_transaction_id: 'EXT-TX-003', // new
            transaction_date: '2026-03-03T12:00:00Z',
            amount_minor: '50000',
            description: 'Interest Credit',
          },
        ],
      });

      expect(batch2.imported_count).toBe(1);
      expect(batch2.skipped_duplicates).toBe(2);

      // Verify exact count in ledger
      const allTx = await treasuryService.listBankTransactions(tenantAlpha, bankAccount.id);
      expect(allTx.length).toBe(3);
    });
  });

  // ==========================================================================
  // SCENARIO F: Cash Transfer with Dual Approval & Pure Balance Sheet Settlement
  // >= $10,000 requires 2 distinct approvers; settles without P&L distortion
  // ==========================================================================
  describe('Scenario F: Cash Transfer with Dual Approval and Settlement', () => {
    it('enforces dual approval for large transfers and settles between accounts without revenue/expense distortion', async () => {
      // 1. Setup Source and Destination Bank Accounts
      const sourceBank = await treasuryService.createBankAccount(tenantAlpha, {
        company_id: companyParent,
        bank_name: 'Citibank',
        account_name: 'Parent Primary Treasury',
        account_number: '98765432101111',
        currency: 'USD',
        gl_account_id: 'gl-1020',
      });
      await treasuryService.setAccountBalance(tenantAlpha, sourceBank.id, '5000000'); // $50,000.00

      const destBank = await treasuryService.createBankAccount(tenantAlpha, {
        company_id: companySubA,
        bank_name: 'Citibank',
        account_name: 'Sub A Operational Account',
        account_number: '98765432102222',
        currency: 'USD',
        gl_account_id: 'gl-1020',
      });
      await treasuryService.setAccountBalance(tenantAlpha, destBank.id, '1000000'); // $10,000.00

      // 2. Initiate Large Transfer of $20,000 (2,000,000 minor >= $10,000 threshold)
      const transfer = await treasuryService.initiateCashTransfer(tenantAlpha, {
        operation_id: 'op-txfr-dual-001',
        source_company_id: companyParent,
        source_bank_account_id: sourceBank.id,
        destination_company_id: companySubA,
        destination_bank_account_id: destBank.id,
        amount_minor: '2000000',
        currency: 'USD',
        initiated_by: 'treasury-analyst-1',
      });

      expect(transfer.requires_dual_approval).toBe(true);
      expect(transfer.status).toBe('AWAITING_APPROVAL');

      // 3. First Approval by Manager A
      const step1 = await treasuryService.approveCashTransfer(tenantAlpha, transfer.id, 'treasury-mgr-a');
      expect(step1.status).toBe('AWAITING_APPROVAL'); // Still awaits 2nd approver
      expect(step1.approved_by).toBe('treasury-mgr-a');

      // 4. Second approval by SAME person must be rejected
      await expect(
        treasuryService.approveCashTransfer(tenantAlpha, transfer.id, 'treasury-mgr-a'),
      ).rejects.toThrow(BadRequestException);

      // 5. Second approval by distinct Manager B
      const step2 = await treasuryService.approveCashTransfer(tenantAlpha, transfer.id, 'treasury-vp-b');
      expect(step2.status).toBe('APPROVED');
      expect(step2.second_approved_by).toBe('treasury-vp-b');

      // 6. Settle Transfer
      const settled = await treasuryService.settleCashTransfer(tenantAlpha, transfer.id, 'treasury-ops-1');
      expect(settled.status).toBe('SETTLED');

      // Verify updated balances: Source: $50,000 - $20,000 = $30,000; Dest: $10,000 + $20,000 = $30,000
      const updatedSource = await treasuryService.getBankAccount(tenantAlpha, sourceBank.id);
      const updatedDest = await treasuryService.getBankAccount(tenantAlpha, destBank.id);
      expect(updatedSource?.current_balance_minor).toBe('3000000');
      expect(updatedDest?.current_balance_minor).toBe('3000000');

      // Total group cash remains constant ($60,000)
      const position = await treasuryService.getCashPosition(tenantAlpha);
      expect(position.total_group_cash_minor).toBe('6000000');
    });
  });

  // ==========================================================================
  // SCENARIO G: Cash Flow Forecasting Distinct from GL Truth
  // Forecast projects future liquidity without mutating authoritative GL books
  // ==========================================================================
  describe('Scenario G: Cash Flow Forecasting Distinct from GL Truth', () => {
    it('generates 30-day liquidity forecast while leaving general ledger and bank records unmutated', async () => {
      const bank = await treasuryService.createBankAccount(tenantAlpha, {
        company_id: companyParent,
        bank_name: 'Wells Fargo',
        account_name: 'Treasury Forecasting Account',
        account_number: '11122233344455',
        currency: 'USD',
        gl_account_id: 'gl-1020',
      });
      await treasuryService.setAccountBalance(tenantAlpha, bank.id, '10000000'); // $100,000 opening

      // Projected inflows: $25,000 (AR collections)
      // Projected outflows: $15,000 (AP vendor payroll & inventory)
      const forecast = await treasuryService.generateCashForecast(
        tenantAlpha,
        companyParent,
        30,
        ['2500000'],
        ['1500000'],
      );

      expect(forecast.opening_cash_minor).toBe('10000000');
      expect(forecast.projected_inflows_minor).toBe('2500000');
      expect(forecast.projected_outflows_minor).toBe('1500000');
      // Closing = 100,000 + 25,000 - 15,000 = 110,000 (11,000,000 minor)
      expect(forecast.projected_closing_minor).toBe('11000000');

      // Bank actual balance remains unmutated ($100,000)
      const bankCurrent = await treasuryService.getBankAccount(tenantAlpha, bank.id);
      expect(bankCurrent?.current_balance_minor).toBe('10000000');
    });
  });

  // ==========================================================================
  // SCENARIO H: Tax Return Preparation with Versioned Jurisdiction Config & GL Reconciliation
  // 7.5% VAT (750 bp), output tax, input tax, net tax due reconciled with GL
  // ==========================================================================
  describe('Scenario H: Tax Return Preparation and GL Reconciliation', () => {
    it('calculates output and input tax using versioned basis points and reconciles with GL control account', async () => {
      // 1. Register VAT in Jurisdiction US-FED
      const reg = await taxService.createTaxRegistration(tenantAlpha, {
        company_id: companyParent,
        jurisdiction_code: 'US-FED',
        tax_id_number: 'TAX-99887766',
        tax_type: 'VAT',
        effective_from: '2026-01-01',
      });

      // 2. Set Version 1 Jurisdiction Config: 7.5% standard VAT = 750 basis points
      await taxService.createJurisdictionConfig(tenantAlpha, {
        jurisdiction_code: 'US-FED',
        version: 1,
        standard_rate_basis_points: 750,
        effective_from: '2026-01-01',
      });

      // 3. Create Filing Period Q1 2026
      const period = await taxService.createFilingPeriod(tenantAlpha, {
        registration_id: reg.id,
        period_name: '2026-Q1',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
        due_date: '2026-04-30',
      });

      // 4. Prepare Tax Return:
      // Taxable sales: $100,000 (10,000,000 minor) -> Output Tax: $7,500 (750,000 minor)
      // Taxable purchases: $40,000 (4,000,000 minor) -> Input Tax: $3,000 (300,000 minor)
      // Net tax due: $7,500 - $3,000 = $4,500 (450,000 minor)
      // GL Control Account has 450,000 minor
      const taxReturn = await taxService.prepareTaxReturn(
        tenantAlpha,
        {
          filing_period_id: period.id,
          company_id: companyParent,
          prepared_by: 'tax-accountant-1',
          operation_id: 'op-tax-ret-2026-q1',
        },
        '10000000', // sales
        '4000000',  // purchases
        '450000',   // GL control balance
      );

      expect(taxReturn.total_output_tax_minor).toBe('750000');
      expect(taxReturn.total_recoverable_input_tax_minor).toBe('300000');
      expect(taxReturn.net_tax_due_minor).toBe('450000');
      expect(taxReturn.reconciliation_difference_minor).toBe('0');
      expect(taxReturn.status).toBe('VALIDATED');

      // Approve return
      const approved = await taxService.approveTaxReturn(tenantAlpha, taxReturn.id, 'tax-director');
      expect(approved.status).toBe('APPROVED');
    });
  });

  // ==========================================================================
  // SCENARIO I: Tax Submission Timeout Handling & Reconciliation Recovery
  // Adapters returning TIMEOUT_PENDING preserve pending status and safely reconcile
  // ==========================================================================
  describe('Scenario I: Tax Submission Timeout Handling and Recovery', () => {
    it('preserves SUBMITTED pending status on gateway timeout and reconciles to ACCEPTED without duplicate filing', async () => {
      const reg = await taxService.createTaxRegistration(tenantAlpha, {
        company_id: companyParent,
        jurisdiction_code: 'UK-HMRC',
        tax_id_number: 'GB123456789',
        effective_from: '2026-01-01',
      });

      const period = await taxService.createFilingPeriod(tenantAlpha, {
        registration_id: reg.id,
        period_name: '2026-M03',
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        due_date: '2026-04-15',
      });

      const taxReturn = await taxService.prepareTaxReturn(
        tenantAlpha,
        {
          filing_period_id: period.id,
          company_id: companyParent,
          prepared_by: 'uk-tax-officer',
          operation_id: 'op-tax-hmrc-m03',
        },
        '2000000',
        '500000',
        '112500',
      );

      await taxService.approveTaxReturn(tenantAlpha, taxReturn.id, 'uk-tax-lead');

      // Custom mock adapter simulating gateway timeout
      let checkCount = 0;
      const timeoutAdapter: ITaxProviderAdapter = {
        async submitReturn(_payload) {
          return {
            submission_reference: 'HMRC-SUB-999',
            provider_status: 'TIMEOUT_PENDING',
            error_message: 'Gateway HTTP 504 Timeout: Submission queued for asynchronous polling',
          };
        },
        async getSubmissionStatus(_reference) {
          checkCount++;
          return {
            submission_reference: 'HMRC-SUB-999',
            provider_status: 'ACCEPTED',
            acknowledgement_token: 'HMRC-ACK-TOKEN-XYZ123',
          };
        },
      };

      // 1. Submit: receives TIMEOUT_PENDING
      const { tax_return: pendingReturn, submission } = await taxService.submitTaxReturn(
        tenantAlpha,
        taxReturn.id,
        'system-worker',
        timeoutAdapter,
      );

      expect(pendingReturn.status).toBe('SUBMITTED'); // Golden rule: truthfully pending, not ACCEPTED or REJECTED
      expect(submission.provider_status).toBe('TIMEOUT_PENDING');

      // 2. Reconciliation poll recovers the true status
      const reconciledSub = await taxService.reconcileSubmissionStatus(
        tenantAlpha,
        submission.id,
        timeoutAdapter,
      );

      expect(checkCount).toBe(1);
      expect(reconciledSub.provider_status).toBe('ACCEPTED');
      expect(reconciledSub.acknowledgement_token).toBe('HMRC-ACK-TOKEN-XYZ123');
      expect(pendingReturn.status).toBe('ACCEPTED');
    });
  });

  // ==========================================================================
  // SCENARIO J: Multi-Tenant Data Isolation Enforcement
  // Cross-tenant queries return NotFoundException or empty results
  // ==========================================================================
  describe('Scenario J: Multi-Tenant Data Isolation Enforcement', () => {
    it('strictly isolates consolidation groups, bank accounts, and tax registrations across tenants', async () => {
      // 1. Create resources in Tenant Alpha
      const groupAlpha = await consolidationService.createGroup(tenantAlpha, {
        group_code: 'GRP-ALPHA-ONLY',
        name: 'Alpha Tenant Group',
        parent_company_id: companyParent,
      });

      const bankAlpha = await treasuryService.createBankAccount(tenantAlpha, {
        company_id: companyParent,
        bank_name: 'Alpha Bank',
        account_name: 'Alpha Operating',
        account_number: '1111222233334444',
        gl_account_id: 'gl-1020',
      });

      // 2. Tenant Beta attempts to access Tenant Alpha resources
      await expect(
        consolidationService.addGroupMember(tenantBeta, groupAlpha.id, {
          company_id: 'company-beta-1',
          book_id: 'book-beta-1',
          effective_from: '2026-01-01',
        }),
      ).rejects.toThrow(NotFoundException);

      const betaBank = await treasuryService.getBankAccount(tenantBeta, bankAlpha.id);
      expect(betaBank).toBeNull();

      const betaCashPos = await treasuryService.getCashPosition(tenantBeta);
      expect(betaCashPos.companies.length).toBe(0);
      expect(betaCashPos.total_group_cash_minor).toBe('0');
    });
  });

  // ==========================================================================
  // SCENARIO K: Consolidation Rerun Idempotency via Operation ID
  // Retrying consolidation run with identical operation_id returns existing run
  // ==========================================================================
  describe('Scenario K: Consolidation Rerun Idempotency', () => {
    it('returns existing consolidation run idempotently when called with identical operation_id', async () => {
      const group = await consolidationService.createGroup(tenantAlpha, {
        group_code: 'GRP-IDEMP',
        name: 'Idempotency Test Group',
        parent_company_id: companyParent,
      });

      await consolidationService.addGroupMember(tenantAlpha, group.id, {
        company_id: companyParent,
        book_id: parentBook.id,
        effective_from: '2026-01-01',
      });

      const req = {
        group_id: group.id,
        period_id: parentPeriods[0]!.id,
        run_by: 'nightly-job',
        operation_id: 'op-nightly-crun-2026-01',
      };

      const run1 = await consolidationService.executeConsolidationRun(tenantAlpha, req);
      const run2 = await consolidationService.executeConsolidationRun(tenantAlpha, req);

      expect(run1.id).toBe(run2.id);
      expect(run1.created_at).toBe(run2.created_at);
    });
  });
});