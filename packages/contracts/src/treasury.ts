// ============================================================================
// STOKROVA — Advanced Treasury, Bank Feeds & Cash Positioning Contracts
// Benchmark: Kyriba, GTreasury, SAP Treasury Management
// ============================================================================

export type BankAccountStatus = 'ACTIVE' | 'INACTIVE' | 'FROZEN';
export type BankConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type BankProviderType = 'MANUAL' | 'PLAID' | 'OPEN_BANKING' | 'SANDBOX';
export type BankTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'FEE'
  | 'INTEREST'
  | 'TRANSFER'
  | 'OTHER';

export type BankMatchingStatus =
  | 'UNMATCHED'
  | 'MATCHED'
  | 'PARTIALLY_MATCHED'
  | 'REVIEW_REQUIRED';

export type CashTransferStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'INITIATED'
  | 'SETTLED'
  | 'REJECTED'
  | 'CANCELLED';

export interface BankAccount {
  id: string;
  tenant_id: string;
  company_id: string;
  bank_name: string;
  account_name: string;
  account_number_masked: string;
  currency: string;
  gl_account_id: string;
  current_balance_minor: string;
  statement_balance_minor: string;
  last_reconciled_at?: string | null;
  status: BankAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface BankConnection {
  id: string;
  tenant_id: string;
  company_id: string;
  provider_type: BankProviderType;
  provider_connection_id: string;
  status: BankConnectionStatus;
  last_sync_at?: string | null;
  sync_cursor?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  external_transaction_id: string;
  transaction_date: string;
  amount_minor: string; // Positive = credit/deposit, Negative = debit/withdrawal
  currency: string;
  transaction_type: BankTransactionType;
  description: string;
  matching_status: BankMatchingStatus;
  matched_journal_entry_id?: string | null;
  created_at: string;
}

export interface CashTransfer {
  id: string;
  tenant_id: string;
  transfer_number: string;
  operation_id: string;
  source_company_id: string;
  source_bank_account_id: string;
  destination_company_id: string;
  destination_bank_account_id: string;
  amount_minor: string;
  currency: string;
  is_intercompany: boolean;
  status: CashTransferStatus;
  requires_dual_approval: boolean;
  initiated_by: string;
  approved_by?: string | null;
  second_approved_by?: string | null;
  settled_at?: string | null;
  journal_entry_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashForecastItem {
  source_type: 'CUSTOMER_RECEIVABLE' | 'SUPPLIER_PAYABLE' | 'BANK_BALANCE' | 'SCHEDULED_TRANSFER';
  reference_id: string;
  expected_date: string;
  inflow_minor: string;
  outflow_minor: string;
  description: string;
}

export interface CashForecast {
  id: string;
  tenant_id: string;
  company_id: string;
  forecast_date: string;
  horizon_days: number;
  currency: string;
  opening_cash_minor: string;
  projected_inflows_minor: string;
  projected_outflows_minor: string;
  projected_closing_minor: string;
  items?: CashForecastItem[];
  created_at: string;
}

export interface CompanyCashPosition {
  company_id: string;
  total_bank_cash_minor: string;
  unreconciled_transactions_count: number;
  unreconciled_amount_minor: string;
  currency: string;
}

export interface GroupCashPositionReport {
  as_of_date: string;
  reporting_currency: string;
  companies: CompanyCashPosition[];
  total_group_cash_minor: string;
}

export interface CreateBankAccountRequest {
  company_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  currency?: string;
  gl_account_id: string;
}

export interface InitiateCashTransferRequest {
  source_company_id: string;
  source_bank_account_id: string;
  destination_company_id: string;
  destination_bank_account_id: string;
  amount_minor: string;
  currency?: string;
  operation_id: string;
  initiated_by: string;
}

export interface ApproveCashTransferRequest {
  approved_by: string;
}

export interface SettleCashTransferRequest {
  settled_by: string;
}

export interface SyncBankFeedRequest {
  bank_account_id: string;
  provider_type?: BankProviderType;
  transactions: {
    external_transaction_id: string;
    transaction_date: string;
    amount_minor: string;
    description: string;
    transaction_type?: BankTransactionType;
  }[];
}
