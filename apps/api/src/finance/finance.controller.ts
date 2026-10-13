import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';
import { FinancialReportsService } from './financial-reports.service.js';
import { AccountingBooksService } from './accounting-books.service.js';
import { PostingRulesService } from './posting-rules.service.js';
import { PostingEngineService } from './posting-engine.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateAccountSchema,
  UpdateAccountSchema,
  CreateJournalEntrySchema,
  ReverseJournalEntrySchema,
  CreateAccountingBookSchema,
  UpdateAccountingBookSchema,
  CreateFiscalYearSchema,
  CreateAccountingPeriodSchema,
  CloseAccountingPeriodSchema,
  ReopenAccountingPeriodSchema,
  CreatePostingRuleSchema,
  UpdatePostingRuleSchema,
  PerformReconciliationSchema,
} from '@stokrova/validation';
import type {
  Account,
  JournalEntry,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateJournalEntryRequest,
  ReverseJournalEntryRequest,
  TrialBalanceReport,
  BalanceSheetReport,
  IncomeStatementReport,
  CashFlowReport,
  GeneralLedgerActivityReport,
  AccountType,
  JournalEntryStatus,
  JournalSourceType,
  AccountingBook,
  CreateAccountingBookRequest,
  UpdateAccountingBookRequest,
  FiscalYear,
  CreateFiscalYearRequest,
  AccountingPeriod,
  CreateAccountingPeriodRequest,
  CloseAccountingPeriodRequest,
  ReopenAccountingPeriodRequest,
  AccountingPostingRule,
  CreatePostingRuleRequest,
  UpdatePostingRuleRequest,
  ReconciliationRecord,
  ReconciliationType,
  PerformReconciliationRequest,
  PostCustomerInvoiceAccountingRequest,
  PostCustomerPaymentAccountingRequest,
  PostCustomerCreditNoteAccountingRequest,
  PostGoodsReceiptAccountingRequest,
  PostSupplierInvoiceAccountingRequest,
  PostSupplierPaymentAccountingRequest,
  PostLandedCostAccountingRequest,
  PostSalesDispatchCogsAccountingRequest,
  PostManufacturingWipAccountingRequest,
  PostManufacturingFgReceiptAccountingRequest,
  PostManufacturingScrapAccountingRequest,
  PostInventoryLossAccountingRequest,
  PostCashVarianceAccountingRequest,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('finance')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class FinanceController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly glService: GeneralLedgerService,
    private readonly reportsService: FinancialReportsService,
    private readonly booksService: AccountingBooksService,
    private readonly postingRulesService: PostingRulesService,
    private readonly postingEngineService: PostingEngineService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  // ==========================================================================
  // Accounting Books & Fiscal Calendars
  // ==========================================================================

  @Post('books')
  @RequirePermission(StandardPermissions.ACCOUNTING_BOOKS_MANAGE)
  async createBook(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateAccountingBookRequest,
  ): Promise<AccountingBook> {
    CreateAccountingBookSchema.parse(body);
    return this.booksService.createBook(tenantId, body);
  }

  @Patch('books/:id')
  @RequirePermission(StandardPermissions.ACCOUNTING_BOOKS_MANAGE)
  async updateBook(
    @CurrentTenant() tenantId: string,
    @Param('id') bookId: string,
    @Body() body: UpdateAccountingBookRequest,
  ): Promise<AccountingBook> {
    UpdateAccountingBookSchema.parse(body);
    return this.booksService.updateBook(tenantId, bookId, body);
  }

  @Get('books/:id')
  @RequirePermission(StandardPermissions.ACCOUNTING_BOOKS_VIEW)
  async getBookById(
    @CurrentTenant() tenantId: string,
    @Param('id') bookId: string,
  ): Promise<AccountingBook> {
    return this.booksService.getBookById(tenantId, bookId);
  }

  @Get('books')
  @RequirePermission(StandardPermissions.ACCOUNTING_BOOKS_VIEW)
  async listBooks(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId?: string,
    @Query('is_active') isActive?: string,
  ): Promise<AccountingBook[]> {
    return this.booksService.listBooks(tenantId, {
      company_id: companyId,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Post('fiscal-years')
  @RequirePermission(StandardPermissions.ACCOUNTING_PERIODS_MANAGE)
  async createFiscalYear(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateFiscalYearRequest,
  ): Promise<FiscalYear> {
    CreateFiscalYearSchema.parse(body);
    return this.booksService.createFiscalYear(tenantId, body);
  }

  @Post('periods')
  @RequirePermission(StandardPermissions.ACCOUNTING_PERIODS_MANAGE)
  async createPeriod(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateAccountingPeriodRequest,
  ): Promise<AccountingPeriod> {
    CreateAccountingPeriodSchema.parse(body);
    return this.booksService.createPeriod(tenantId, body);
  }

  @Post('periods/:id/close')
  @RequirePermission(StandardPermissions.ACCOUNTING_PERIODS_CLOSE)
  async closePeriod(
    @CurrentTenant() tenantId: string,
    @Param('id') periodId: string,
    @Body() body: CloseAccountingPeriodRequest,
  ): Promise<AccountingPeriod> {
    CloseAccountingPeriodSchema.parse(body);
    return this.booksService.closePeriod(tenantId, periodId, body);
  }

  @Post('periods/:id/reopen')
  @RequirePermission(StandardPermissions.ACCOUNTING_PERIODS_REOPEN)
  async reopenPeriod(
    @CurrentTenant() tenantId: string,
    @Param('id') periodId: string,
    @Body() body: ReopenAccountingPeriodRequest,
  ): Promise<AccountingPeriod> {
    ReopenAccountingPeriodSchema.parse(body);
    return this.booksService.reopenPeriod(tenantId, periodId, body);
  }

  // ==========================================================================
  // Accounts (Chart of Accounts)
  // ==========================================================================

  @Post('accounts')
  @RequirePermission(StandardPermissions.ACCOUNTING_ACCOUNTS_MANAGE)
  async createAccount(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateAccountRequest,
  ): Promise<Account> {
    CreateAccountSchema.parse(body);
    return this.accountsService.createAccount(tenantId, body);
  }

  @Post('accounts/seed-defaults')
  @RequirePermission(StandardPermissions.ACCOUNTING_ACCOUNTS_MANAGE)
  async seedDefaultAccounts(
    @CurrentTenant() tenantId: string,
    @Body('company_id') companyId: string,
    @Body('book_id') bookId?: string,
  ): Promise<Account[]> {
    return this.accountsService.seedDefaultChartOfAccounts(tenantId, companyId, bookId);
  }

  @Patch('accounts/:id')
  @RequirePermission(StandardPermissions.ACCOUNTING_ACCOUNTS_MANAGE)
  async updateAccount(
    @CurrentTenant() tenantId: string,
    @Param('id') accountId: string,
    @Body() body: UpdateAccountRequest,
  ): Promise<Account> {
    UpdateAccountSchema.parse(body);
    return this.accountsService.updateAccount(tenantId, accountId, body);
  }

  @Get('accounts')
  @RequirePermission(StandardPermissions.ACCOUNTING_ACCOUNTS_VIEW)
  async listAccounts(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId?: string,
    @Query('book_id') bookId?: string,
    @Query('type') type?: AccountType,
    @Query('is_active') isActive?: string,
  ): Promise<Account[]> {
    return this.accountsService.listAccounts(tenantId, {
      company_id: companyId,
      book_id: bookId,
      type,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('accounts/:id')
  @RequirePermission(StandardPermissions.ACCOUNTING_ACCOUNTS_VIEW)
  async getAccountById(
    @CurrentTenant() tenantId: string,
    @Param('id') accountId: string,
  ): Promise<Account> {
    return this.accountsService.getAccountById(tenantId, accountId);
  }

  // ==========================================================================
  // Posting Rules
  // ==========================================================================

  @Post('posting-rules')
  @RequirePermission(StandardPermissions.ACCOUNTING_POSTING_RULES_MANAGE)
  async createPostingRule(
    @CurrentTenant() tenantId: string,
    @Body() body: CreatePostingRuleRequest,
  ): Promise<AccountingPostingRule> {
    CreatePostingRuleSchema.parse(body);
    return this.postingRulesService.createPostingRule(tenantId, body);
  }

  @Patch('posting-rules/:id')
  @RequirePermission(StandardPermissions.ACCOUNTING_POSTING_RULES_MANAGE)
  async updatePostingRule(
    @CurrentTenant() tenantId: string,
    @Param('id') ruleId: string,
    @Body() body: UpdatePostingRuleRequest,
  ): Promise<AccountingPostingRule> {
    UpdatePostingRuleSchema.parse(body);
    return this.postingRulesService.updatePostingRule(tenantId, ruleId, body);
  }

  @Get('posting-rules')
  @RequirePermission(StandardPermissions.ACCOUNTING_POSTING_RULES_VIEW)
  async listPostingRules(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId?: string,
    @Query('event_type') eventType?: string,
  ): Promise<AccountingPostingRule[]> {
    return this.postingRulesService.listPostingRules(tenantId, companyId, eventType);
  }

  @Post('posting-rules/seed-defaults')
  @RequirePermission(StandardPermissions.ACCOUNTING_POSTING_RULES_MANAGE)
  async seedDefaultPostingRules(
    @CurrentTenant() tenantId: string,
    @Body('company_id') companyId: string,
    @Body('book_id') bookId: string,
  ): Promise<AccountingPostingRule[]> {
    return this.postingRulesService.seedDefaultPostingRules(tenantId, companyId, bookId);
  }

  // ==========================================================================
  // Journal Entries
  // ==========================================================================

  @Post('journal-entries')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_CREATE)
  async createJournalEntry(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateJournalEntryRequest,
  ): Promise<JournalEntry> {
    CreateJournalEntrySchema.parse(body);
    return this.glService.createJournalEntry(tenantId, body);
  }

  @Post('journal-entries/:id/post')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postJournalEntry(
    @CurrentTenant() tenantId: string,
    @Param('id') entryId: string,
  ): Promise<JournalEntry> {
    return this.glService.postJournalEntry(tenantId, entryId);
  }

  @Post('journal-entries/:id/reverse')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_REVERSE)
  async reverseJournalEntry(
    @CurrentTenant() tenantId: string,
    @Param('id') entryId: string,
    @Body() body: ReverseJournalEntryRequest,
  ): Promise<{ original: JournalEntry; reversal: JournalEntry }> {
    ReverseJournalEntrySchema.parse(body);
    return this.glService.reverseJournalEntry(tenantId, entryId, body);
  }

  @Get('journal-entries')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_VIEW)
  async listJournalEntries(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId?: string,
    @Query('book_id') bookId?: string,
    @Query('period_id') periodId?: string,
    @Query('status') status?: JournalEntryStatus,
    @Query('source_type') sourceType?: JournalSourceType,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<JournalEntry[]> {
    return this.glService.listJournalEntries(tenantId, {
      company_id: companyId,
      book_id: bookId,
      period_id: periodId,
      status,
      source_type: sourceType,
      start_date: startDate,
      end_date: endDate,
    });
  }

  @Get('journal-entries/:id')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_VIEW)
  async getJournalEntryById(
    @CurrentTenant() tenantId: string,
    @Param('id') entryId: string,
  ): Promise<JournalEntry> {
    return this.glService.getJournalEntryById(tenantId, entryId);
  }

  // ==========================================================================
  // Financial Statements & Reports
  // ==========================================================================

  @Get('reports/trial-balance')
  @RequirePermission(StandardPermissions.ACCOUNTING_REPORTS_VIEW)
  async getTrialBalance(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId: string,
    @Query('as_of_date') asOfDate?: string,
  ): Promise<TrialBalanceReport> {
    return this.reportsService.getTrialBalance(tenantId, companyId, asOfDate);
  }

  @Get('reports/balance-sheet')
  @RequirePermission(StandardPermissions.ACCOUNTING_REPORTS_VIEW)
  async getBalanceSheet(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId: string,
    @Query('as_of_date') asOfDate?: string,
  ): Promise<BalanceSheetReport> {
    return this.reportsService.getBalanceSheet(tenantId, companyId, asOfDate);
  }

  @Get('reports/income-statement')
  @RequirePermission(StandardPermissions.ACCOUNTING_REPORTS_VIEW)
  async getIncomeStatement(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<IncomeStatementReport> {
    return this.reportsService.getIncomeStatement(tenantId, companyId, startDate, endDate);
  }

  @Get('reports/cash-flow')
  @RequirePermission(StandardPermissions.ACCOUNTING_REPORTS_VIEW)
  async getCashFlow(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<CashFlowReport> {
    return this.reportsService.getCashFlowStatement(tenantId, companyId, startDate, endDate);
  }

  @Get('reports/account-activity')
  @RequirePermission(StandardPermissions.ACCOUNTING_REPORTS_VIEW)
  async getAccountActivity(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId: string,
    @Query('account_id') accountId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<GeneralLedgerActivityReport> {
    return this.reportsService.getGeneralLedgerActivity(tenantId, companyId, accountId, startDate, endDate);
  }

  // ==========================================================================
  // Reconciliations
  // ==========================================================================

  @Post('reconciliations')
  @RequirePermission(StandardPermissions.ACCOUNTING_RECONCILIATION_MANAGE)
  async performReconciliation(
    @CurrentTenant() tenantId: string,
    @Body() body: PerformReconciliationRequest & { subledger_balance_minor: string },
  ): Promise<ReconciliationRecord> {
    PerformReconciliationSchema.parse(body);
    return this.reconciliationService.reconcileSubledger(
      tenantId,
      body.company_id,
      body.book_id,
      body.reconciliation_type,
      body.subledger_balance_minor,
      body.performed_by,
      body.as_of_date,
      body.notes,
    );
  }

  @Get('reconciliations')
  @RequirePermission(StandardPermissions.ACCOUNTING_RECONCILIATION_VIEW)
  async listReconciliations(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId?: string,
    @Query('type') type?: ReconciliationType,
  ): Promise<ReconciliationRecord[]> {
    return this.reconciliationService.listReconciliations(tenantId, companyId, type);
  }

  // ==========================================================================
  // Operational Posting Adapters
  // ==========================================================================

  @Post('operations/sales-invoice')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postCustomerInvoice(
    @CurrentTenant() tenantId: string,
    @Body() body: PostCustomerInvoiceAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postCustomerInvoice(tenantId, body);
  }

  @Post('operations/customer-payment')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postCustomerPayment(
    @CurrentTenant() tenantId: string,
    @Body() body: PostCustomerPaymentAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postCustomerPayment(tenantId, body);
  }

  @Post('operations/customer-credit-note')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postCustomerCreditNote(
    @CurrentTenant() tenantId: string,
    @Body() body: PostCustomerCreditNoteAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postCustomerCreditNote(tenantId, body);
  }

  @Post('operations/goods-receipt')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postGoodsReceipt(
    @CurrentTenant() tenantId: string,
    @Body() body: PostGoodsReceiptAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postGoodsReceipt(tenantId, body);
  }

  @Post('operations/supplier-invoice')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postSupplierInvoice(
    @CurrentTenant() tenantId: string,
    @Body() body: PostSupplierInvoiceAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postSupplierInvoice(tenantId, body);
  }

  @Post('operations/supplier-payment')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postSupplierPayment(
    @CurrentTenant() tenantId: string,
    @Body() body: PostSupplierPaymentAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postSupplierPayment(tenantId, body);
  }

  @Post('operations/landed-cost')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postLandedCost(
    @CurrentTenant() tenantId: string,
    @Body() body: PostLandedCostAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postLandedCost(tenantId, body);
  }

  @Post('operations/sales-dispatch-cogs')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postSalesDispatchCogs(
    @CurrentTenant() tenantId: string,
    @Body() body: PostSalesDispatchCogsAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postSalesDispatchCogs(tenantId, body);
  }

  @Post('operations/manufacturing-wip-consumption')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postManufacturingWipConsumption(
    @CurrentTenant() tenantId: string,
    @Body() body: PostManufacturingWipAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postManufacturingWipConsumption(tenantId, body);
  }

  @Post('operations/manufacturing-fg-receipt')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postManufacturingFgReceipt(
    @CurrentTenant() tenantId: string,
    @Body() body: PostManufacturingFgReceiptAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postManufacturingFgReceipt(tenantId, body);
  }

  @Post('operations/manufacturing-scrap')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postManufacturingScrap(
    @CurrentTenant() tenantId: string,
    @Body() body: PostManufacturingScrapAccountingRequest,
  ): Promise<JournalEntry | null> {
    return this.postingEngineService.postManufacturingScrap(tenantId, body);
  }

  @Post('operations/inventory-loss')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postInventoryLoss(
    @CurrentTenant() tenantId: string,
    @Body() body: PostInventoryLossAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postInventoryLoss(tenantId, body);
  }

  @Post('operations/cash-variance')
  @RequirePermission(StandardPermissions.ACCOUNTING_JOURNALS_POST)
  async postCashVariance(
    @CurrentTenant() tenantId: string,
    @Body() body: PostCashVarianceAccountingRequest,
  ): Promise<JournalEntry> {
    return this.postingEngineService.postCashVariance(tenantId, body);
  }
}
