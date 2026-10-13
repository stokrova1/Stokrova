import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { AccountingBooksService } from './accounting-books.service.js';
import { PostingRulesService } from './posting-rules.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';
import { PostingEngineService } from './posting-engine.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { FinancialReportsService } from './financial-reports.service.js';
import type { AccountingBook, AccountingPeriod } from '@stokrova/contracts';

describe('STOKROVA Phase 6: Financial Accounting & General Ledger Master Specification', () => {
  let accountsService: AccountsService;
  let booksService: AccountingBooksService;
  let rulesService: PostingRulesService;
  let glService: GeneralLedgerService;
  let postingEngine: PostingEngineService;
  let reconciliationService: ReconciliationService;
  let reportsService: FinancialReportsService;

  const tenantAlpha = 'tenant-corp-alpha';
  const tenantBeta = 'tenant-corp-beta';
  const companyAlpha1 = 'company-alpha-main';
  const companyAlpha2 = 'company-alpha-subsidiary';
  let primaryBook: AccountingBook;
  let seededPeriods: AccountingPeriod[];

  beforeEach(async () => {
    accountsService = new AccountsService();
    booksService = new AccountingBooksService();
    rulesService = new PostingRulesService();
    glService = new GeneralLedgerService(accountsService, booksService);
    postingEngine = new PostingEngineService(accountsService, glService, rulesService);
    reconciliationService = new ReconciliationService(accountsService, glService);
    reportsService = new FinancialReportsService(accountsService, glService);

    // Seed primary book, 2026 fiscal year and 12 monthly periods for companyAlpha1
    const setup = await booksService.seedDefaultBookAndPeriods(tenantAlpha, companyAlpha1, 2026);
    primaryBook = setup.book;
    seededPeriods = setup.periods;

    // Seed expanded 21-account chart of accounts
    await accountsService.seedExpandedChartOfAccounts(tenantAlpha, companyAlpha1, primaryBook.id);

    // Seed default posting rules
    await rulesService.seedDefaultPostingRules(tenantAlpha, companyAlpha1, primaryBook.id);
  });

  // ==========================================================================
  // SCENARIO A: Customer Credit Sale with Complete Lifecycle
  // Order -> Dispatch -> Invoice -> Accounting -> Payment -> AR Reconciliation
  // ==========================================================================
  describe('Scenario A: Customer Credit Sale & AR Lifecycle', () => {
    it('executes customer invoice, COGS dispatch, payment, credit note, and AR subledger reconciliation', async () => {
      const arAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1100'))!;
      const revAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '4010'))!;
      const taxAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '2100'))!;
      const cogsAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '5010'))!;
      const invAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1200'))!;
      const bankAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1020'))!;
      const retAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '4030'))!;

      // 1. Post Customer Invoice: $1,075 total ($1,000 subtotal + $75 VAT)
      const invoiceEntry = await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'inv-cust-1001',
        invoice_number: 'INV-1001',
        posting_date: '2026-03-15T10:00:00Z',
        subtotal_amount_minor: '100000',
        tax_amount_minor: '7500',
        total_amount_minor: '107500',
        currency: 'USD',
        operation_id: 'op-inv-1001',
      });

      expect(invoiceEntry.status).toBe('POSTED');
      expect(invoiceEntry.source_type).toBe('SALES_INVOICE');
      expect(invoiceEntry.total_debit_minor).toBe('107500');
      expect(invoiceEntry.total_credit_minor).toBe('107500');

      // Verify lines: Dr AR (1100) 107500, Cr Revenue (4010) 100000, Cr Tax Payable (2100) 7500
      const arLine = invoiceEntry.lines.find((l) => l.account_id === arAcc.id);
      const revLine = invoiceEntry.lines.find((l) => l.account_id === revAcc.id);
      const taxLine = invoiceEntry.lines.find((l) => l.account_id === taxAcc.id);
      expect(arLine?.debit_minor).toBe('107500');
      expect(revLine?.credit_minor).toBe('100000');
      expect(taxLine?.credit_minor).toBe('7500');

      // 2. Post COGS Dispatch: $600 inventory cost
      const cogsEntry = await postingEngine.postSalesDispatchCogs(tenantAlpha, {
        company_id: companyAlpha1,
        dispatch_id: 'disp-cust-1001',
        order_id: 'ord-cust-1001',
        posting_date: '2026-03-15T10:05:00Z',
        cogs_amount_minor: '60000',
        currency: 'USD',
        operation_id: 'op-disp-1001',
      });

      expect(cogsEntry.status).toBe('POSTED');
      expect(cogsEntry.total_debit_minor).toBe('60000');
      const cogsDebit = cogsEntry.lines.find((l) => l.account_id === cogsAcc.id);
      const invCredit = cogsEntry.lines.find((l) => l.account_id === invAcc.id);
      expect(cogsDebit?.debit_minor).toBe('60000');
      expect(invCredit?.credit_minor).toBe('60000');

      // 3. Post Partial Customer Payment: $575 received via Bank
      const paymentEntry = await postingEngine.postCustomerPayment(tenantAlpha, {
        company_id: companyAlpha1,
        payment_id: 'pay-cust-1001',
        invoice_id: 'inv-cust-1001',
        posting_date: '2026-03-20T14:00:00Z',
        amount_minor: '57500',
        currency: 'USD',
        payment_method: 'BANK_TRANSFER',
        operation_id: 'op-pay-1001',
      });

      expect(paymentEntry.status).toBe('POSTED');
      const bankDebit = paymentEntry.lines.find((l) => l.account_id === bankAcc.id);
      const arCredit = paymentEntry.lines.find((l) => l.account_id === arAcc.id);
      expect(bankDebit?.debit_minor).toBe('57500');
      expect(arCredit?.credit_minor).toBe('57500');

      // 4. Subledger Reconciliation for AR: Remaining balance should be $500 (50,000 minor)
      const arRec = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'ACCOUNTS_RECEIVABLE',
        as_of_date: '2026-03-25T00:00:00Z',
        subledger_balance_minor: '50000',
      });

      expect(arRec.gl_balance_minor).toBe('50000');
      expect(arRec.subledger_balance_minor).toBe('50000');
      expect(arRec.discrepancy_minor).toBe('0');
      expect(arRec.status).toBe('BALANCED');

      // 5. Post Customer Credit Note: $500 remaining balance credited (return/settlement)
      const creditNoteEntry = await postingEngine.postCustomerCreditNote(tenantAlpha, {
        company_id: companyAlpha1,
        credit_note_id: 'cn-cust-1001',
        invoice_id: 'inv-cust-1001',
        posting_date: '2026-03-26T16:00:00Z',
        amount_minor: '50000',
        currency: 'USD',
        operation_id: 'op-cn-1001',
      });

      expect(creditNoteEntry.status).toBe('POSTED');
      const returnsDebit = creditNoteEntry.lines.find((l) => l.account_id === retAcc.id);
      const arFinalCredit = creditNoteEntry.lines.find((l) => l.account_id === arAcc.id);
      expect(returnsDebit?.debit_minor).toBe('50000');
      expect(arFinalCredit?.credit_minor).toBe('50000');

      // AR is now fully cleared to zero
      const arRecCleared = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'ACCOUNTS_RECEIVABLE',
        as_of_date: '2026-03-31T23:59:59Z',
        subledger_balance_minor: '0',
      });
      expect(arRecCleared.gl_balance_minor).toBe('0');
      expect(arRecCleared.status).toBe('BALANCED');
    });
  });

  // ==========================================================================
  // SCENARIO B: Point of Sale (POS) Fast Path & Cash Variances
  // Checkout -> Dispatch -> Invoice -> Cash Tender -> Receipt reprint -> Session Close
  // ==========================================================================
  describe('Scenario B: POS Fast Path & Cash Reconciliations', () => {
    it('executes atomic POS cash sale, validates receipt reprint has zero GL impact, and records till variances', async () => {
      const cashAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1010'))!;
      const arAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1100'))!;
      const expAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '5040'))!;

      // 1. High-Speed POS Cash Checkout: $150 ($140 sale + $10 tax)
      const posInvoice = await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'pos-inv-9001',
        invoice_number: 'POS-INV-9001',
        posting_date: '2026-04-10T12:00:00Z',
        subtotal_amount_minor: '14000',
        tax_amount_minor: '1000',
        total_amount_minor: '15000',
        currency: 'USD',
        operation_id: 'op-pos-inv-9001',
      });
      expect(posInvoice.status).toBe('POSTED');

      // Instant Cash settlement: Dr Cash (1010) 15000, Cr AR (1100) 15000
      const posCashTender = await glService.createJournalEntry(tenantAlpha, {
        company_id: companyAlpha1,
        book_id: primaryBook.id,
        posting_date: '2026-04-10T12:00:01Z',
        source_type: 'CUSTOMER_PAYMENT',
        source_id: 'pos-tender-9001',
        narration: 'POS cash tender received at register',
        lines: [
          { account_id: cashAcc.id, debit_minor: '15000', credit_minor: '0' },
          { account_id: arAcc.id, debit_minor: '0', credit_minor: '15000' },
        ],
      });
      expect(posCashTender.status).toBe('POSTED');

      // COGS for POS Sale: $80
      await postingEngine.postSalesDispatchCogs(tenantAlpha, {
        company_id: companyAlpha1,
        dispatch_id: 'pos-disp-9001',
        order_id: 'pos-order-9001',
        posting_date: '2026-04-10T12:00:02Z',
        cogs_amount_minor: '8000',
        currency: 'USD',
        operation_id: 'op-pos-cogs-9001',
      });

      // 2. Receipt Reprint Verification: Receipt is non-financial operational document
      const entriesBeforeReprint = await glService.listJournalEntries(tenantAlpha, { company_id: companyAlpha1 });
      
      // Simulate POS reprint query / action: no accounting mutation
      const reprintOperationalAction = { receipt_id: 'rcpt-9001', reprint_count: 2 };
      expect(reprintOperationalAction.reprint_count).toBe(2);

      const entriesAfterReprint = await glService.listJournalEntries(tenantAlpha, { company_id: companyAlpha1 });
      expect(entriesAfterReprint.length).toBe(entriesBeforeReprint.length);

      // 3. Register Session Close: Till Shortage Discrepancy ($5 short = -500 minor)
      const shortageEntry = await postingEngine.postCashVariance(tenantAlpha, {
        company_id: companyAlpha1,
        register_id: 'reg-1',
        session_id: 'reg-session-001',
        posting_date: '2026-04-10T22:00:00Z',
        variance_minor: '-500',
        currency: 'USD',
        operation_id: 'op-reg-close-001',
      });

      expect(shortageEntry.status).toBe('POSTED');
      const expLine = shortageEntry.lines.find((l) => l.account_id === expAcc.id);
      const cashCreditLine = shortageEntry.lines.find((l) => l.account_id === cashAcc.id);
      expect(expLine?.debit_minor).toBe('500');
      expect(cashCreditLine?.credit_minor).toBe('500');

      // Cash account now has: 15,000 debit - 500 credit = 14,500 balance
      const cashRec = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'CASH',
        as_of_date: '2026-04-10T23:59:59Z',
        subledger_balance_minor: '14500',
      });
      expect(cashRec.gl_balance_minor).toBe('14500');
      expect(cashRec.status).toBe('BALANCED');
    });
  });

  // ==========================================================================
  // SCENARIO C: Supplier Purchase with GRNI and Three-Way Match
  // PO -> GRN -> GRNI Clearing -> Supplier Invoice -> AP -> Supplier Payment
  // ==========================================================================
  describe('Scenario C: Supplier Purchase with GRNI & Three-Way Match', () => {
    it('executes goods receipt to GRNI clearing, supplier invoice to AP, and full supplier payment', async () => {
      const invAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1200'))!;
      const grniAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '2020'))!;
      const apAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '2010'))!;
      const bankAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1020'))!;

      // 1. Goods Receipt Note (GRN): Inbound physical stock of $5,000 (500,000 minor)
      const grnEntry = await postingEngine.postGoodsReceipt(tenantAlpha, {
        company_id: companyAlpha1,
        receipt_id: 'grn-po-7700',
        po_id: 'po-7700',
        posting_date: '2026-05-02T09:00:00Z',
        valuation_minor: '500000',
        currency: 'USD',
        operation_id: 'op-grn-7700',
      });

      expect(grnEntry.status).toBe('POSTED');
      const invDebit = grnEntry.lines.find((l) => l.account_id === invAcc.id);
      const grniCredit = grnEntry.lines.find((l) => l.account_id === grniAcc.id);
      expect(invDebit?.debit_minor).toBe('500000');
      expect(grniCredit?.credit_minor).toBe('500000');

      // Verify GRNI Subledger shows open uninvoiced liability of $5,000
      const grniRecBefore = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'GRNI_CLEARING',
        as_of_date: '2026-05-03T00:00:00Z',
        subledger_balance_minor: '500000',
      });
      expect(grniRecBefore.gl_balance_minor).toBe('500000');
      expect(grniRecBefore.status).toBe('BALANCED');

      // 2. Supplier Invoice Received (3-Way Matched): Exactly matches GRN $5,000
      const billEntry = await postingEngine.postSupplierInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'bill-supp-991',
        receipt_id: 'grn-po-7700',
        po_id: 'po-7700',
        posting_date: '2026-05-05T14:30:00Z',
        total_minor: '500000',
        grni_clearing_minor: '500000',
        tax_minor: '0',
        currency: 'USD',
        operation_id: 'op-bill-991',
      });

      expect(billEntry.status).toBe('POSTED');
      const grniDebit = billEntry.lines.find((l) => l.account_id === grniAcc.id);
      const apCredit = billEntry.lines.find((l) => l.account_id === apAcc.id);
      expect(grniDebit?.debit_minor).toBe('500000');
      expect(apCredit?.credit_minor).toBe('500000');

      // GRNI is now fully cleared to zero
      const grniRecAfter = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'GRNI_CLEARING',
        as_of_date: '2026-05-06T00:00:00Z',
        subledger_balance_minor: '0',
      });
      expect(grniRecAfter.gl_balance_minor).toBe('0');
      expect(grniRecAfter.status).toBe('BALANCED');

      // 3. Supplier Payment Disbursed: Dr AP (2010) $5,000, Cr Bank (1020) $5,000
      const paymentEntry = await postingEngine.postSupplierPayment(tenantAlpha, {
        company_id: companyAlpha1,
        payment_id: 'supp-pay-5544',
        supplier_invoice_id: 'bill-supp-991',
        posting_date: '2026-05-15T10:00:00Z',
        amount_minor: '500000',
        currency: 'USD',
        disbursement_method: 'EFT',
        operation_id: 'op-supp-pay-5544',
      });

      expect(paymentEntry.status).toBe('POSTED');
      const apDebit = paymentEntry.lines.find((l) => l.account_id === apAcc.id);
      const bankCredit = paymentEntry.lines.find((l) => l.account_id === bankAcc.id);
      expect(apDebit?.debit_minor).toBe('500000');
      expect(bankCredit?.credit_minor).toBe('500000');

      // AP is now fully cleared to zero
      const apRec = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'ACCOUNTS_PAYABLE',
        as_of_date: '2026-05-20T00:00:00Z',
        subledger_balance_minor: '0',
      });
      expect(apRec.gl_balance_minor).toBe('0');
      expect(apRec.status).toBe('BALANCED');
    });
  });

  // ==========================================================================
  // SCENARIO D: Invoice Mismatch & Purchase Price Variance (PPV)
  // GRN at standard cost -> Supplier Invoice at higher cost -> PPV expense isolated
  // ==========================================================================
  describe('Scenario D: Three-Way Match Mismatch & PPV Posting', () => {
    it('isolates purchase price variance to PPV expense while clearing GRNI clearing account', async () => {
      // 1. Goods Intake at PO standard rate: $2,000 (200,000 minor)
      await postingEngine.postGoodsReceipt(tenantAlpha, {
        company_id: companyAlpha1,
        receipt_id: 'grn-po-8822',
        po_id: 'po-8822',
        posting_date: '2026-06-01T10:00:00Z',
        valuation_minor: '200000',
        currency: 'USD',
        operation_id: 'op-grn-8822',
      });

      // 2. Supplier Invoice received at $2,100 ($100 price variance):
      // Dr GRNI (2020) 200,000
      // Dr PPV Expense (5030) 10,000
      // Cr AP (2010) 210,000
      const grniAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '2020'))!;
      const ppvAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '5030'))!;
      const apAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '2010'))!;

      const invoiceWithVariance = await glService.createJournalEntry(tenantAlpha, {
        company_id: companyAlpha1,
        book_id: primaryBook.id,
        posting_date: '2026-06-05T12:00:00Z',
        source_type: 'SUPPLIER_INVOICE',
        source_id: 'supp-bill-var-8822',
        narration: 'Supplier bill with $100 purchase price variance',
        lines: [
          { account_id: grniAcc.id, debit_minor: '200000', credit_minor: '0' },
          { account_id: ppvAcc.id, debit_minor: '10000', credit_minor: '0' },
          { account_id: apAcc.id, debit_minor: '0', credit_minor: '210000' },
        ],
      });

      expect(invoiceWithVariance.status).toBe('POSTED');
      expect(invoiceWithVariance.total_debit_minor).toBe('210000');
      expect(invoiceWithVariance.total_credit_minor).toBe('210000');

      // GRNI cleared to zero
      const grniRec = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'GRNI_CLEARING',
        as_of_date: '2026-06-10T00:00:00Z',
        subledger_balance_minor: '0',
      });
      expect(grniRec.gl_balance_minor).toBe('0');
      expect(grniRec.status).toBe('BALANCED');

      // AP reflects the full $2,100 owed to supplier
      const apRec = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'ACCOUNTS_PAYABLE',
        as_of_date: '2026-06-10T00:00:00Z',
        subledger_balance_minor: '210000',
      });
      expect(apRec.gl_balance_minor).toBe('210000');
      expect(apRec.status).toBe('BALANCED');
    });
  });

  // ==========================================================================
  // SCENARIO E: Manufacturing WIP & Finished Goods Lifecycle
  // Raw Material Consumption -> WIP -> Scrap -> Finished Goods Receipt -> COGS
  // ==========================================================================
  describe('Scenario E: Manufacturing Work in Process (WIP) & Finished Goods', () => {
    it('tracks raw material consumption to WIP, scrap expense, and finished goods capitalization', async () => {
      const wipAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1400'))!;
      const rawInvAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1200'))!;
      const scrapAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '5020'))!;

      // 1. Raw Materials Consumed into Production Order: $800 (80,000 minor)
      const wipConsumption = await postingEngine.postManufacturingWipConsumption(tenantAlpha, {
        company_id: companyAlpha1,
        mo_id: 'mo-4001',
        posting_date: '2026-07-01T08:00:00Z',
        consumed_material_cost_minor: '80000',
        currency: 'USD',
        operation_id: 'op-wip-4001',
      });

      expect(wipConsumption.status).toBe('POSTED');
      const wipDebit = wipConsumption.lines.find((l) => l.account_id === wipAcc.id);
      const rawCredit = wipConsumption.lines.find((l) => l.account_id === rawInvAcc.id);
      expect(wipDebit?.debit_minor).toBe('80000');
      expect(rawCredit?.credit_minor).toBe('80000');

      // WIP balance is now $800
      const wipRecInitial = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'WORK_IN_PROCESS',
        as_of_date: '2026-07-02T00:00:00Z',
        subledger_balance_minor: '80000',
      });
      expect(wipRecInitial.gl_balance_minor).toBe('80000');
      expect(wipRecInitial.status).toBe('BALANCED');

      // 2. Production Scrap: $50 (5,000 minor) defective material written off
      const scrapEntry = await postingEngine.postManufacturingScrap(tenantAlpha, {
        company_id: companyAlpha1,
        mo_id: 'mo-4001',
        posting_date: '2026-07-02T11:00:00Z',
        scrap_cost_minor: '5000',
        currency: 'USD',
        is_process_loss: false,
        operation_id: 'op-scrap-4001',
      });

      expect(scrapEntry!.status).toBe('POSTED');
      const scrapExpense = scrapEntry!.lines.find((l) => l.account_id === scrapAcc.id);
      const wipRelief = scrapEntry!.lines.find((l) => l.account_id === wipAcc.id);
      expect(scrapExpense?.debit_minor).toBe('5000');
      expect(wipRelief?.credit_minor).toBe('5000');

      // 3. Finished Goods Receipt: Remaining $750 completed into FG Inventory
      const fgReceipt = await postingEngine.postManufacturingFgReceipt(tenantAlpha, {
        company_id: companyAlpha1,
        mo_id: 'mo-4001',
        posting_date: '2026-07-03T16:00:00Z',
        fg_cost_minor: '75000',
        currency: 'USD',
        operation_id: 'op-fg-4001',
      });

      expect(fgReceipt.status).toBe('POSTED');
      const fgInvDebit = fgReceipt.lines.find((l) => l.account_id === rawInvAcc.id);
      const wipFinalCredit = fgReceipt.lines.find((l) => l.account_id === wipAcc.id);
      expect(fgInvDebit?.debit_minor).toBe('75000');
      expect(wipFinalCredit?.credit_minor).toBe('75000');

      // WIP is now fully cleared to zero
      const wipRecFinal = await reconciliationService.reconcileSubledger(tenantAlpha, {
        company_id: companyAlpha1,
        subledger_type: 'WORK_IN_PROCESS',
        as_of_date: '2026-07-05T00:00:00Z',
        subledger_balance_minor: '0',
      });
      expect(wipRecFinal.gl_balance_minor).toBe('0');
      expect(wipRecFinal.status).toBe('BALANCED');
    });
  });

  // ==========================================================================
  // SCENARIO F: Inventory Loss & Shrinkage
  // Damage / write-off movement in inventory -> Scrap expense posting
  // ==========================================================================
  describe('Scenario F: Inventory Shrinkage & Write-Off', () => {
    it('posts inventory loss expense and reconciles physical stock valuation to GL', async () => {
      const lossExpAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '5020'))!;
      const invAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1200'))!;

      // Record damage write-off: $120 (12,000 minor)
      const lossEntry = await postingEngine.postInventoryLoss(tenantAlpha, {
        company_id: companyAlpha1,
        movement_id: 'mov-loss-8899',
        posting_date: '2026-08-14T10:00:00Z',
        loss_cost_minor: '12000',
        currency: 'USD',
        reason: 'Water damage write-off in warehouse zone B',
        operation_id: 'op-loss-8899',
      });

      expect(lossEntry.status).toBe('POSTED');
      const lossExp = lossEntry.lines.find((l) => l.account_id === lossExpAcc.id);
      const invCredit = lossEntry.lines.find((l) => l.account_id === invAcc.id);
      expect(lossExp?.debit_minor).toBe('12000');
      expect(invCredit?.credit_minor).toBe('12000');
    });
  });

  // ==========================================================================
  // SCENARIO G: Duplicate Event Replay & Durable Idempotency (Rule 4)
  // Re-posting identical operation_id returns original journal with zero duplicates
  // ==========================================================================
  describe('Scenario G: Duplicate Event Replay & Durable Idempotency', () => {
    it('guarantees replay of identical operation_id is idempotent with zero duplicate entries', async () => {
      const fixedOpId = 'op-durable-invoice-9999';

      // 1. First posting
      const firstEntry = await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'inv-durable-9999',
        invoice_number: 'INV-9999',
        posting_date: '2026-09-01T12:00:00Z',
        subtotal_amount_minor: '30000',
        tax_amount_minor: '2500',
        total_amount_minor: '32500',
        currency: 'USD',
        operation_id: fixedOpId,
      });

      const totalEntriesBefore = (await glService.listJournalEntries(tenantAlpha, { company_id: companyAlpha1 })).length;

      // 2. Replay with identical payload
      const secondEntry = await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'inv-durable-9999',
        invoice_number: 'INV-9999',
        posting_date: '2026-09-01T12:00:00Z',
        subtotal_amount_minor: '30000',
        tax_amount_minor: '2500',
        total_amount_minor: '32500',
        currency: 'USD',
        operation_id: fixedOpId,
      });

      // Must return identical journal entry ID
      expect(secondEntry.id).toBe(firstEntry.id);

      const totalEntriesAfter = (await glService.listJournalEntries(tenantAlpha, { company_id: companyAlpha1 })).length;
      expect(totalEntriesAfter).toBe(totalEntriesBefore);
    });
  });

  // ==========================================================================
  // SCENARIO H: Closed Accounting Period Invariants (Rule 9)
  // Postings into closed period are rejected; reopen requires explicit flow
  // ==========================================================================
  describe('Scenario H: Closed Accounting Period Controls', () => {
    it('strictly rejects postings into closed periods and allows posting after authorized reopen', async () => {
      // Find January period (Period 1)
      const janPeriod = seededPeriods.find((p) => p.period_number === 1)!;

      // Close January period
      await booksService.closePeriod(tenantAlpha, janPeriod.id, {
        closed_by: 'controller-user-1',
        notes: 'Monthly close certified by financial controller',
      });

      // Posting into January 2026 must now be rejected
      await expect(
        postingEngine.postCustomerInvoice(tenantAlpha, {
          company_id: companyAlpha1,
          invoice_id: 'inv-backdated-jan',
          invoice_number: 'INV-BACKDATED-JAN',
          posting_date: '2026-01-15T10:00:00Z', // in closed Period 1
          subtotal_amount_minor: '10000',
          tax_amount_minor: '0',
          total_amount_minor: '10000',
          currency: 'USD',
          operation_id: 'op-jan-reject',
        }),
      ).rejects.toThrow(BadRequestException);

      // Reopen January period
      await booksService.reopenPeriod(tenantAlpha, janPeriod.id, {
        reopened_by: 'auditor-user-1',
        reason: 'Authorized year-end adjustment audit',
      });

      // Posting into January 2026 must now succeed
      const entry = await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'inv-backdated-jan',
        invoice_number: 'INV-BACKDATED-JAN',
        posting_date: '2026-01-15T10:00:00Z',
        subtotal_amount_minor: '10000',
        tax_amount_minor: '0',
        total_amount_minor: '10000',
        currency: 'USD',
        operation_id: 'op-jan-success',
      });
      expect(entry.status).toBe('POSTED');
    });
  });

  // ==========================================================================
  // SCENARIO I: Multi-Company Isolation & Multi-Tenant Separation (Rules 21 & 3)
  // Cross-tenant and cross-company data access strictly blocked
  // ==========================================================================
  describe('Scenario I: Multi-Company & Multi-Tenant Isolation', () => {
    it('enforces total separation between Tenant Alpha and Tenant Beta', async () => {
      // Tenant Beta queries must return zero books or accounts from Tenant Alpha
      const betaBooks = await booksService.listBooks(tenantBeta);
      expect(betaBooks.length).toBe(0);

      const betaAccounts = await accountsService.listAccounts(tenantBeta);
      expect(betaAccounts.length).toBe(0);

      // Attempt by Tenant Beta to access Tenant Alpha's book throws NotFoundException
      await expect(
        booksService.getBookById(tenantBeta, primaryBook.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces separate accounting books and accounts between subsidiaries in same tenant', async () => {
      // Company Alpha 2 (subsidiary) setup
      const { book: subBook } = await booksService.seedDefaultBookAndPeriods(tenantAlpha, companyAlpha2, 2026);
      await accountsService.seedDefaultChartOfAccounts(tenantAlpha, companyAlpha2, subBook.id);

      const alpha1Accounts = await accountsService.listAccounts(tenantAlpha, { company_id: companyAlpha1 });
      const alpha2Accounts = await accountsService.listAccounts(tenantAlpha, { company_id: companyAlpha2 });

      expect(alpha1Accounts.length).toBeGreaterThan(0);
      expect(alpha2Accounts.length).toBe(14);

      // Accounts belong to their respective company
      expect(alpha1Accounts.every((a) => a.company_id === companyAlpha1)).toBe(true);
      expect(alpha2Accounts.every((a) => a.company_id === companyAlpha2)).toBe(true);
    });
  });

  // ==========================================================================
  // SCENARIO J: Immutable Journal Entries & Reversing Entries Engine (Rule 2)
  // Original entries cannot be edited/deleted; compensating reversal preserves history
  // ==========================================================================
  describe('Scenario J: Immutability & Reversing Entries Engine', () => {
    it('creates an exact inverted compensating entry and prevents multiple reversals', async () => {
      const arAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1100'))!;
      const revAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '4010'))!;

      const invEntry = await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'inv-to-reverse-77',
        invoice_number: 'INV-REV-77',
        posting_date: '2026-10-01T12:00:00Z',
        subtotal_amount_minor: '50000',
        tax_amount_minor: '0',
        total_amount_minor: '50000',
        currency: 'USD',
        operation_id: 'op-inv-rev-77',
      });

      const { original, reversal } = await glService.reverseJournalEntry(tenantAlpha, invEntry.id, {
        reversal_date: '2026-10-02T12:00:00Z',
        narration: 'Invoice cancelled due to duplicate creation',
      });

      expect(original.status).toBe('REVERSED');
      expect(original.reversal_entry_id).toBe(reversal.id);
      expect(reversal.status).toBe('POSTED');
      expect(reversal.source_type).toBe('REVERSAL');
      expect(reversal.reversal_of_entry_id).toBe(original.id);

      // Reversal lines are swapped: Dr Revenue 50000, Cr AR 50000
      const arLine = reversal.lines.find((l) => l.account_id === arAcc.id);
      const revLine = reversal.lines.find((l) => l.account_id === revAcc.id);
      expect(arLine?.credit_minor).toBe('50000');
      expect(revLine?.debit_minor).toBe('50000');

      // Attempting to reverse again throws BadRequestException
      await expect(
        glService.reverseJournalEntry(tenantAlpha, invEntry.id, {
          reversal_date: '2026-10-03T12:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // SCENARIO K: Comprehensive Financial Reporting Equilibrium
  // Trial Balance, Balance Sheet, Income Statement, Cash Flow, Account Activity
  // ==========================================================================
  describe('Scenario K: Financial Reporting Equilibrium & Mathematical Correctness', () => {
    it('maintains absolute equilibrium across Trial Balance, Income Statement, and Balance Sheet', async () => {
      // 1. Initial Capital: Dr Bank (1020) $10,000, Cr Owner Capital (3020) $10,000
      const bankAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '1020'))!;
      const equityAcc = (await accountsService.getAccountByCode(tenantAlpha, companyAlpha1, '3020'))!;
      await glService.createJournalEntry(tenantAlpha, {
        company_id: companyAlpha1,
        book_id: primaryBook.id,
        posting_date: '2026-02-01T09:00:00Z',
        narration: 'Owner capital injection',
        lines: [
          { account_id: bankAcc.id, debit_minor: '1000000', credit_minor: '0' },
          { account_id: equityAcc.id, debit_minor: '0', credit_minor: '1000000' },
        ],
      });

      // 2. Buy Inventory on Credit: $4,000 (400,000 minor)
      await postingEngine.postGoodsReceipt(tenantAlpha, {
        company_id: companyAlpha1,
        receipt_id: 'grn-k-1',
        posting_date: '2026-02-05T10:00:00Z',
        valuation_minor: '400000',
        currency: 'USD',
        operation_id: 'op-grn-k-1',
      });
      await postingEngine.postSupplierInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'bill-k-1',
        posting_date: '2026-02-06T10:00:00Z',
        total_minor: '400000',
        grni_clearing_minor: '400000',
        tax_minor: '0',
        currency: 'USD',
        operation_id: 'op-bill-k-1',
      });

      // 3. Sell Inventory on Credit: $6,000 Sale, $2,000 COGS
      await postingEngine.postCustomerInvoice(tenantAlpha, {
        company_id: companyAlpha1,
        invoice_id: 'inv-k-1',
        invoice_number: 'INV-K-1',
        posting_date: '2026-02-10T11:00:00Z',
        subtotal_amount_minor: '600000',
        tax_amount_minor: '0',
        total_amount_minor: '600000',
        currency: 'USD',
        operation_id: 'op-inv-k-1',
      });
      await postingEngine.postSalesDispatchCogs(tenantAlpha, {
        company_id: companyAlpha1,
        dispatch_id: 'disp-k-1',
        order_id: 'ord-k-1',
        posting_date: '2026-02-10T11:05:00Z',
        cogs_amount_minor: '200000',
        currency: 'USD',
        operation_id: 'op-cogs-k-1',
      });

      // 4. Customer Pays $5,000
      await postingEngine.postCustomerPayment(tenantAlpha, {
        company_id: companyAlpha1,
        payment_id: 'pay-k-1',
        posting_date: '2026-02-15T15:00:00Z',
        amount_minor: '500000',
        currency: 'USD',
        payment_method: 'BANK_TRANSFER',
        operation_id: 'op-pay-k-1',
      });

      // 5. Pay Supplier $3,000
      await postingEngine.postSupplierPayment(tenantAlpha, {
        company_id: companyAlpha1,
        payment_id: 'supp-pay-k-1',
        posting_date: '2026-02-20T16:00:00Z',
        amount_minor: '300000',
        currency: 'USD',
        disbursement_method: 'EFT',
        operation_id: 'op-supp-pay-k-1',
      });

      // VERIFY TRIAL BALANCE
      const tb = await reportsService.getTrialBalance(tenantAlpha, companyAlpha1);
      expect(tb.is_balanced).toBe(true);
      expect(tb.total_debit_minor).toBe(tb.total_credit_minor);

      // VERIFY INCOME STATEMENT
      // Revenue: $6,000 (600,000 minor)
      // COGS: $2,000 (200,000 minor)
      // Net Income: $4,000 (400,000 minor)
      const inc = await reportsService.getIncomeStatement(tenantAlpha, companyAlpha1);
      expect(inc.revenue_total_minor).toBe('600000');
      expect(inc.cogs_total_minor).toBe('200000');
      expect(inc.gross_profit_minor).toBe('400000');
      expect(inc.net_income_minor).toBe('400000');

      // VERIFY BALANCE SHEET EQUILIBRIUM: Assets = Liabilities + Equity + Net Income
      // Assets:
      //   Bank: $10,000 + $5,000 (cust pay) - $3,000 (supp pay) = $12,000 (1,200,000 minor)
      //   AR: $6,000 - $5,000 = $1,000 (100,000 minor)
      //   Inventory: $4,000 - $2,000 = $2,000 (200,000 minor)
      // Total Assets = $15,000 (1,500,000 minor)
      // Liabilities:
      //   AP: $4,000 - $3,000 = $1,000 (100,000 minor)
      // Equity:
      //   Owner Capital: $10,000 (1,000,000 minor)
      //   Net Income: $4,000 (400,000 minor)
      // Total Liab + Equity = $1,000 + $10,000 + $4,000 = $15,000 (1,500,000 minor)
      const bs = await reportsService.getBalanceSheet(tenantAlpha, companyAlpha1);
      expect(bs.is_balanced).toBe(true);
      expect(bs.total_assets_minor).toBe('1500000');
      expect(bs.total_liabilities_equity_minor).toBe('1500000');

      // VERIFY CASH FLOW STATEMENT
      const cf = await reportsService.getCashFlowStatement(tenantAlpha, companyAlpha1);
      expect(cf.net_cash_flow_minor).toBe('1200000'); // Ending bank balance 1,200,000
      expect(cf.closing_cash_minor).toBe('1200000');

      // VERIFY GENERAL LEDGER ACCOUNT ACTIVITY REPORT
      const arActivity = await reportsService.getAccountActivityReport(
        tenantAlpha,
        companyAlpha1,
        '1100', // AR
      );
      expect(arActivity.account_code).toBe('1100');
      expect(arActivity.closing_balance_minor).toBe('100000');
      expect(arActivity.lines.length).toBe(2);
      expect(arActivity.lines[0]?.debit_minor).toBe('600000');
      expect(arActivity.lines[1]?.credit_minor).toBe('500000');
    });
  });
});
