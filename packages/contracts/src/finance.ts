// ============================================================================
// STOKROVA — Double-Entry Financial Accounting, General Ledger & Tax Contracts
// Benchmark: SAP S/4HANA Finance, NetSuite, Odoo Accounting
// Rules 7, 8, 11, 26: Strict balance sum(dr) == sum(cr), immutable history,
// zero floats, pure integer minor units (cents, kobo)
// ============================================================================

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE';

export type AccountSubtype =
  // Assets
  | 'CASH'
  | 'BANK'
  | 'ACCOUNTS_RECEIVABLE'
  | 'INVENTORY'
  | 'CURRENT_ASSET'
  | 'FIXED_ASSET'
  | 'WORK_IN_PROCESS'
  // Liabilities
  | 'ACCOUNTS_PAYABLE'
  | 'GRNI_CLEARING'
  | 'TAX_PAYABLE'
  | 'CUSTOMER_DEPOSIT'
  | 'CURRENT_LIABILITY'
  | 'LONG_TERM_LIABILITY'
  // Equity
  | 'RETAINED_EARNINGS'
  | 'OWNER_EQUITY'
  | 'CAPITAL'
  // Revenue
  | 'OPERATING_REVENUE'
  | 'SALES_REVENUE'
  | 'OTHER_REVENUE'
  // Expenses
  | 'COST_OF_GOODS_SOLD'
  | 'OPERATING_EXPENSE'
  | 'PAYROLL_EXPENSE'
  | 'TAX_EXPENSE'
  | 'DEPRECIATION_EXPENSE'
  | 'CASH_VARIANCE_EXPENSE'
  | 'SCRAP_EXPENSE'
  | 'PURCHASE_VARIANCE';

export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface AccountingBook {
  id: string;
  tenant_id: string;
  company_id: string;
  code: string;
  name: string;
  functional_currency: string;
  fiscal_year_start_month: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiscalYear {
  id: string;
  tenant_id: string;
  company_id: string;
  book_id: string;
  year_code: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export type PeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export interface AccountingPeriod {
  id: string;
  tenant_id: string;
  company_id: string;
  book_id: string;
  fiscal_year_id: string;
  period_number: number;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  tenant_id: string;
  company_id: string;
  book_id?: string | null;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  normal_balance: NormalBalance;
  parent_account_id?: string | null;
  currency: string;
  is_active: boolean;
  is_reconciled: boolean;
  created_at: string;
  updated_at: string;
}

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

export type JournalSourceType =
  | 'MANUAL'
  | 'POS_SALE'
  | 'SALES_INVOICE'
  | 'INVOICE_ISSUANCE'
  | 'CUSTOMER_PAYMENT'
  | 'PAYMENT_SETTLEMENT'
  | 'CUSTOMER_CREDIT_NOTE'
  | 'CUSTOMER_REFUND'
  | 'PO_RECEIPT'
  | 'GRN_RECEIPT'
  | 'SUPPLIER_INVOICE'
  | 'SUPPLIER_PAYMENT'
  | 'SUPPLIER_CREDIT_NOTE'
  | 'LANDED_COST'
  | 'SALES_DISPATCH_COGS'
  | 'MANUFACTURING_WIP_CONSUMPTION'
  | 'MANUFACTURING_FG_RECEIPT'
  | 'MANUFACTURING_SCRAP'
  | 'INVENTORY_LOSS'
  | 'INVENTORY_ADJUSTMENT'
  | 'CASH_VARIANCE'
  | 'CASH_RECONCILIATION'
  | 'REVERSAL';

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_minor: string;
  credit_minor: string;
  currency: string;
  description?: string | null;
  reference_entity_type?: string | null;
  reference_entity_id?: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  company_id: string;
  book_id?: string | null;
  period_id?: string | null;
  entry_number: string;
  status: JournalEntryStatus;
  source_type: JournalSourceType;
  source_id?: string | null;
  reversal_of_entry_id?: string | null;
  reversal_entry_id?: string | null;
  narration: string;
  posting_date: string;
  total_debit_minor: string;
  total_credit_minor: string;
  currency: string;
  lines: JournalEntryLine[];
  posted_at?: string | null;
  posted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingPostingRule {
  id: string;
  tenant_id: string;
  company_id: string;
  book_id: string;
  event_type: string;
  rule_code: string;
  description?: string | null;
  debit_account_code: string;
  credit_account_code: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export type SourceEventProcessingStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'QUARANTINED';

export interface AccountingSourceEventRecord {
  id: string;
  tenant_id: string;
  company_id: string;
  book_id: string;
  source_module: string;
  event_type: string;
  source_event_id: string;
  operation_id: string;
  journal_entry_id?: string | null;
  status: SourceEventProcessingStatus;
  error_details?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReconciliationType =
  | 'AR'
  | 'AP'
  | 'INVENTORY'
  | 'GRNI'
  | 'CASH'
  | 'WIP';

export interface ReconciliationRecord {
  id: string;
  tenant_id: string;
  company_id: string;
  book_id: string;
  reconciliation_type: ReconciliationType;
  as_of_date: string;
  gl_account_id: string;
  gl_balance_minor: string;
  subledger_balance_minor: string;
  discrepancy_minor: string;
  status: 'MATCHED' | 'BALANCED' | 'DISCREPANCY' | 'ADJUSTED';
  performed_by: string;
  notes?: string | null;
  created_at: string;
}

export type TaxType = 'VAT' | 'SALES_TAX' | 'WITHHOLDING' | 'COMPOUND';

export interface TaxGroup {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  tax_rate_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxLineBreakdown {
  tax_rate_id: string;
  tax_code: string;
  rate_basis_points: number;
  tax_amount_minor: string;
  liability_account_id: string;
}

export interface TaxCalculationResult {
  subtotal_minor: string;
  tax_total_minor: string;
  total_minor: string;
  breakdowns: TaxLineBreakdown[];
}

export interface TrialBalanceAccountRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  debit_minor: string;
  credit_minor: string;
  net_balance_minor: string;
}

export interface TrialBalanceReport {
  tenant_id: string;
  company_id: string;
  as_of_date: string;
  total_debit_minor: string;
  total_credit_minor: string;
  is_balanced: boolean;
  rows: TrialBalanceAccountRow[];
}

export interface BalanceSheetSection {
  type: AccountType;
  total_minor: string;
  accounts: {
    account_id: string;
    code: string;
    name: string;
    balance_minor: string;
  }[];
}

export interface BalanceSheetReport {
  tenant_id: string;
  company_id: string;
  as_of_date: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  total_assets_minor: string;
  total_liabilities_equity_minor: string;
  is_balanced: boolean;
}

export interface IncomeStatementReport {
  tenant_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  revenue_total_minor: string;
  cogs_total_minor: string;
  gross_profit_minor: string;
  expenses_total_minor: string;
  net_income_minor: string;
  revenue_accounts: { code: string; name: string; amount_minor: string }[];
  cogs_accounts: { code: string; name: string; amount_minor: string }[];
  expense_accounts: { code: string; name: string; amount_minor: string }[];
}

export interface GeneralLedgerActivityLine {
  entry_id: string;
  entry_number: string;
  posting_date: string;
  narration: string;
  debit_minor: string;
  credit_minor: string;
  running_balance_minor: string;
  source_type: string;
  source_id?: string | null;
}

export interface GeneralLedgerActivityReport {
  tenant_id: string;
  company_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  start_date: string;
  end_date: string;
  opening_balance_minor: string;
  closing_balance_minor: string;
  total_debit_minor?: string;
  total_credit_minor?: string;
  lines: GeneralLedgerActivityLine[];
  entries?: GeneralLedgerActivityLine[];
}

export interface CashFlowReport {
  tenant_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  operating_activities_minor: string;
  investing_activities_minor: string;
  financing_activities_minor: string;
  net_cash_flow_minor: string;
  opening_cash_minor: string;
  closing_cash_minor: string;
  ending_cash_minor?: string;
}

// ============================================================================
// DTOs & Request Interfaces
// ============================================================================

export interface CreateAccountingBookRequest {
  company_id: string;
  code: string;
  name: string;
  functional_currency?: string;
  fiscal_year_start_month?: number;
}

export interface UpdateAccountingBookRequest {
  name?: string;
  is_active?: boolean;
}

export interface CreateFiscalYearRequest {
  company_id: string;
  book_id: string;
  year_code: string;
  start_date: string;
  end_date: string;
}

export interface CreateAccountingPeriodRequest {
  company_id: string;
  book_id: string;
  fiscal_year_id: string;
  period_number: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface CloseAccountingPeriodRequest {
  closed_by: string;
  notes?: string;
}

export interface ReopenAccountingPeriodRequest {
  reopened_by: string;
  reason: string;
}

export interface CreateAccountRequest {
  company_id: string;
  book_id?: string | null;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  parent_account_id?: string | null;
  currency?: string;
  is_active?: boolean;
}

export interface UpdateAccountRequest {
  name?: string;
  subtype?: AccountSubtype;
  parent_account_id?: string | null;
  is_active?: boolean;
}

export interface CreateJournalEntryLineRequest {
  account_id: string;
  debit_minor?: string;
  credit_minor?: string;
  currency?: string;
  description?: string | null;
  reference_entity_type?: string | null;
  reference_entity_id?: string | null;
}

export interface CreateJournalEntryRequest {
  company_id: string;
  book_id?: string | null;
  period_id?: string | null;
  posting_date: string;
  narration: string;
  currency?: string;
  source_type?: JournalSourceType;
  source_id?: string | null;
  operation_id?: string | null; // Idempotency key
  lines: CreateJournalEntryLineRequest[];
}

export interface ReverseJournalEntryRequest {
  reversal_date: string;
  narration?: string;
}

export interface CreatePostingRuleRequest {
  company_id: string;
  book_id: string;
  event_type: string;
  rule_code: string;
  description?: string;
  debit_account_code: string;
  credit_account_code: string;
}

export interface UpdatePostingRuleRequest {
  description?: string;
  debit_account_code?: string;
  credit_account_code?: string;
  is_active?: boolean;
}

export interface PerformReconciliationRequest {
  company_id: string;
  book_id: string;
  reconciliation_type: ReconciliationType;
  as_of_date: string;
  performed_by: string;
  notes?: string;
}

export interface CalculateTaxRequest {
  amount_minor: string;
  tax_rate_ids: string[];
  is_inclusive?: boolean;
}

export interface GetAccountsFilter {
  company_id?: string;
  book_id?: string;
  type?: AccountType;
  is_active?: boolean;
}

export interface GetJournalEntriesFilter {
  company_id?: string;
  book_id?: string;
  period_id?: string;
  status?: JournalEntryStatus;
  source_type?: JournalSourceType;
  start_date?: string;
  end_date?: string;
}

export interface GetFinancialReportFilter {
  company_id: string;
  book_id?: string;
  as_of_date?: string;
  start_date?: string;
  end_date?: string;
}

// Operational Domain Posting Requests
export interface PostCustomerInvoiceAccountingRequest {
  company_id: string;
  invoice_id: string;
  invoice_number: string;
  posting_date: string;
  total_amount_minor: string;
  subtotal_amount_minor: string;
  tax_amount_minor: string;
  currency: string;
  operation_id: string;
}

export interface PostCustomerPaymentAccountingRequest {
  company_id: string;
  payment_id: string;
  invoice_id?: string | null;
  posting_date: string;
  amount_minor: string;
  currency: string;
  payment_method: string;
  operation_id: string;
}

export interface PostCustomerCreditNoteAccountingRequest {
  company_id: string;
  credit_note_id: string;
  invoice_id: string;
  posting_date: string;
  amount_minor: string;
  tax_amount_minor?: string;
  currency: string;
  operation_id: string;
}

export interface PostGoodsReceiptAccountingRequest {
  company_id: string;
  receipt_id: string;
  po_id?: string | null;
  posting_date: string;
  valuation_minor: string;
  currency: string;
  operation_id: string;
}

export interface PostSupplierInvoiceAccountingRequest {
  company_id: string;
  invoice_id: string;
  receipt_id?: string | null;
  po_id?: string | null;
  posting_date: string;
  total_minor: string;
  grni_clearing_minor: string;
  tax_minor: string;
  price_variance_minor?: string;
  currency: string;
  operation_id: string;
}

export interface PostSupplierPaymentAccountingRequest {
  company_id: string;
  payment_id: string;
  supplier_invoice_id?: string | null;
  posting_date: string;
  amount_minor: string;
  currency: string;
  disbursement_method: string;
  operation_id: string;
}

export interface PostLandedCostAccountingRequest {
  company_id: string;
  voucher_id: string;
  posting_date: string;
  total_cost_minor: string;
  currency: string;
  is_capitalized: boolean;
  operation_id: string;
}

export interface PostSalesDispatchCogsAccountingRequest {
  company_id: string;
  dispatch_id: string;
  order_id: string;
  posting_date: string;
  cogs_amount_minor: string;
  currency: string;
  operation_id: string;
}

export interface PostManufacturingWipAccountingRequest {
  company_id: string;
  mo_id: string;
  execution_run_id?: string | null;
  posting_date: string;
  consumed_material_cost_minor: string;
  currency: string;
  operation_id: string;
  narration?: string;
}

export interface PostManufacturingFgReceiptAccountingRequest {
  company_id: string;
  mo_id: string;
  posting_date: string;
  fg_cost_minor: string;
  currency: string;
  operation_id: string;
  narration?: string;
}

export interface PostManufacturingScrapAccountingRequest {
  company_id: string;
  mo_id: string;
  posting_date: string;
  scrap_cost_minor: string;
  currency: string;
  is_process_loss: boolean;
  operation_id: string;
  narration?: string;
}

export interface PostInventoryLossAccountingRequest {
  company_id: string;
  movement_id: string;
  posting_date: string;
  loss_cost_minor: string;
  currency: string;
  reason: string;
  operation_id: string;
}

export interface PostCashVarianceAccountingRequest {
  company_id: string;
  register_id: string;
  session_id: string;
  posting_date: string;
  variance_minor: string; // Positive = overage (credit revenue), Negative = shortage (debit expense)
  currency: string;
  operation_id: string;
}
