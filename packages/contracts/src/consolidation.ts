// ============================================================================
// STOKROVA — Multi-Entity Consolidation & Intercompany Accounting Contracts
// Benchmark: Oracle NetSuite OneWorld, SAP S/4HANA Group Reporting, Workday
// ============================================================================

import { AccountType, NormalBalance } from './finance.js';

export type ConsolidationRunStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'CONSOLIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUPERSEDED';

export type InclusionStatus = 'FULL' | 'EQUITY' | 'EXCLUDED';

export type ConsolidationAdjustmentType =
  | 'INTERCOMPANY_ELIMINATION'
  | 'CURRENCY_TRANSLATION'
  | 'EQUITY_ELIMINATION'
  | 'MANUAL_ADJUSTMENT';

export type IntercompanyRelationshipType =
  | 'PARENT'
  | 'SUBSIDIARY'
  | 'SISTER'
  | 'AFFILIATE';

export type IntercompanyTransactionType =
  | 'TRADE_SALE'
  | 'TRADE_PURCHASE'
  | 'SERVICE_CHARGE'
  | 'LOAN'
  | 'INTEREST'
  | 'CASH_TRANSFER';

export type IntercompanyTransactionStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'UNMATCHED'
  | 'DISPUTED'
  | 'ELIMINATED';

export type IntercompanyMatchStatus =
  | 'MATCHED'
  | 'PARTIAL'
  | 'UNMATCHED_DIFFERENCE';

export interface ConsolidationGroup {
  id: string;
  tenant_id: string;
  group_code: string;
  name: string;
  parent_company_id: string;
  reporting_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationGroupMember {
  id: string;
  tenant_id: string;
  group_id: string;
  company_id: string;
  book_id: string;
  ownership_percentage_basis_points: number; // 10000 = 100.00%
  effective_from: string;
  effective_to?: string | null;
  inclusion_status: InclusionStatus;
  functional_currency: string;
  created_at: string;
  updated_at: string;
}

export interface GroupAccount {
  id: string;
  tenant_id: string;
  group_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  is_elimination_target: boolean;
  created_at: string;
}

export interface EntityAccountMapping {
  id: string;
  tenant_id: string;
  group_id: string;
  company_id: string;
  source_account_code: string;
  group_account_code: string;
  is_active: boolean;
  created_at: string;
}

export interface ConsolidationRun {
  id: string;
  tenant_id: string;
  group_id: string;
  period_id: string;
  period_name: string;
  reporting_currency: string;
  status: ConsolidationRunStatus;
  operation_id: string;
  fx_rate_version: string;
  run_by: string;
  total_entities_included: number;
  total_eliminations_minor: string;
  consolidated_net_income_minor: string;
  is_balanced: boolean;
  notes?: string | null;
  finalized_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationRunEntity {
  id: string;
  tenant_id: string;
  run_id: string;
  company_id: string;
  book_id: string;
  source_currency: string;
  fx_rate_basis_points: number; // 10000 = 1.0000
  local_net_income_minor: string;
  translated_net_income_minor: string;
  created_at: string;
}

export interface ConsolidationAdjustment {
  id: string;
  tenant_id: string;
  run_id: string;
  adjustment_type: ConsolidationAdjustmentType;
  reference_type?: string | null;
  reference_id?: string | null;
  narration: string;
  total_debit_minor: string;
  total_credit_minor: string;
  lines?: ConsolidationAdjustmentLine[];
  created_at: string;
}

export interface ConsolidationAdjustmentLine {
  id: string;
  tenant_id: string;
  adjustment_id: string;
  company_id?: string | null;
  group_account_code: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount_minor: string;
  created_at: string;
}

export interface IntercompanyRelationship {
  id: string;
  tenant_id: string;
  primary_company_id: string;
  counterparty_company_id: string;
  relationship_type: IntercompanyRelationshipType;
  settlement_currency: string;
  is_active: boolean;
  created_at: string;
}

export interface IntercompanyTransaction {
  id: string;
  tenant_id: string;
  transaction_reference: string;
  from_company_id: string;
  to_company_id: string;
  transaction_type: IntercompanyTransactionType;
  source_document_type: string;
  source_document_id: string;
  currency: string;
  amount_minor: string;
  status: IntercompanyTransactionStatus;
  created_at: string;
}

export interface IntercompanyMatch {
  id: string;
  tenant_id: string;
  from_transaction_id: string;
  to_transaction_id?: string | null;
  match_status: IntercompanyMatchStatus;
  matched_amount_minor: string;
  discrepancy_minor: string;
  notes?: string | null;
  matched_at: string;
}

export interface EliminationRule {
  id: string;
  tenant_id: string;
  rule_code: string;
  name: string;
  transaction_type: string;
  debit_group_account_code: string;
  credit_group_account_code: string;
  is_active: boolean;
  created_at: string;
}

export interface ConsolidatedStatementLine {
  group_account_code: string;
  group_account_name: string;
  account_type: AccountType;
  entity_balances: Record<string, string>; // company_id -> translated_balance_minor
  gross_group_minor: string;
  eliminations_minor: string;
  consolidated_minor: string;
}

export interface ConsolidatedTrialBalance {
  group_id: string;
  period_id: string;
  reporting_currency: string;
  as_of_date: string;
  lines: ConsolidatedStatementLine[];
  total_debit_minor: string;
  total_credit_minor: string;
  is_balanced: boolean;
}

export interface ConsolidatedBalanceSheet {
  group_id: string;
  period_id: string;
  reporting_currency: string;
  as_of_date: string;
  total_assets_minor: string;
  total_liabilities_minor: string;
  total_equity_minor: string;
  consolidated_net_income_minor: string;
  is_balanced: boolean;
}

export interface ConsolidatedIncomeStatement {
  group_id: string;
  period_id: string;
  reporting_currency: string;
  total_revenue_minor: string;
  total_expense_minor: string;
  net_income_minor: string;
}

export interface CreateConsolidationGroupRequest {
  group_code: string;
  name: string;
  parent_company_id: string;
  reporting_currency?: string;
}

export interface AddGroupMemberRequest {
  company_id: string;
  book_id: string;
  ownership_percentage_basis_points?: number;
  effective_from: string;
  effective_to?: string | null;
  inclusion_status?: InclusionStatus;
  functional_currency?: string;
}

export interface MapEntityAccountRequest {
  company_id: string;
  source_account_code: string;
  group_account_code: string;
}

export interface ExecuteConsolidationRunRequest {
  group_id: string;
  period_id: string;
  operation_id: string;
  fx_rates?: Record<string, number>; // source_currency -> basis_points (e.g. EUR -> 10800 for 1.08)
  run_by: string;
  notes?: string;
}

export interface RecordIntercompanyTransactionRequest {
  transaction_reference: string;
  from_company_id: string;
  to_company_id: string;
  transaction_type: IntercompanyTransactionType;
  source_document_type: string;
  source_document_id: string;
  currency: string;
  amount_minor: string;
}
