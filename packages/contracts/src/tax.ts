// ============================================================================
// STOKROVA — Tax Compliance, Returns & Multi-Jurisdiction Contracts
// Benchmark: Avalara, Vertex, Thomson Reuters ONESOURCE
// ============================================================================
import { TaxType } from './finance.js';

export type TaxFilingFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type TaxRegistrationStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TaxFilingPeriodStatus =
  | 'OPEN'
  | 'PREPARED'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'CLOSED';

export type TaxReturnStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'VALIDATED'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED';

export type TaxSubmissionStatus =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'TIMEOUT_PENDING';

export interface TaxRegistration {
  id: string;
  tenant_id: string;
  company_id: string;
  jurisdiction_code: string;
  tax_id_number: string;
  tax_type: TaxType;
  filing_frequency: TaxFilingFrequency;
  effective_from: string;
  effective_to?: string | null;
  status: TaxRegistrationStatus;
  created_at: string;
  updated_at: string;
}

export interface TaxJurisdictionConfig {
  id: string;
  tenant_id: string;
  jurisdiction_code: string;
  version: number;
  standard_rate_basis_points: number; // 750 = 7.5%, 2000 = 20%
  reduced_rate_basis_points: number;
  zero_rate_basis_points: number;
  output_tax_account_code: string;
  input_tax_account_code: string;
  effective_from: string;
  is_active: boolean;
  created_at: string;
}

export interface TaxFilingPeriod {
  id: string;
  tenant_id: string;
  registration_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  due_date: string;
  status: TaxFilingPeriodStatus;
  created_at: string;
  updated_at: string;
}

export interface TaxReturn {
  id: string;
  tenant_id: string;
  filing_period_id: string;
  company_id: string;
  operation_id: string;
  reporting_currency: string;
  total_taxable_sales_minor: string;
  total_output_tax_minor: string;
  total_taxable_purchases_minor: string;
  total_recoverable_input_tax_minor: string;
  net_tax_due_minor: string;
  gl_control_account_balance_minor: string;
  reconciliation_difference_minor: string;
  status: TaxReturnStatus;
  prepared_by: string;
  approved_by?: string | null;
  submitted_at?: string | null;
  filing_reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxFilingSubmission {
  id: string;
  tenant_id: string;
  tax_return_id: string;
  submission_attempt: number;
  provider_type: string;
  submission_reference: string;
  provider_status: TaxSubmissionStatus;
  acknowledgement_token?: string | null;
  error_message?: string | null;
  submitted_payload_hash: string;
  created_at: string;
}

export interface CreateTaxRegistrationRequest {
  company_id: string;
  jurisdiction_code: string;
  tax_id_number: string;
  tax_type?: TaxType;
  filing_frequency?: TaxFilingFrequency;
  effective_from: string;
  effective_to?: string | null;
}

export interface CreateTaxJurisdictionConfigRequest {
  jurisdiction_code: string;
  version?: number;
  standard_rate_basis_points: number;
  reduced_rate_basis_points?: number;
  zero_rate_basis_points?: number;
  output_tax_account_code?: string;
  input_tax_account_code?: string;
  effective_from: string;
}

export interface CreateTaxFilingPeriodRequest {
  registration_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  due_date: string;
}

export interface PrepareTaxReturnRequest {
  filing_period_id: string;
  company_id: string;
  operation_id: string;
  prepared_by: string;
}

export interface SubmitTaxReturnRequest {
  tax_return_id: string;
  submitted_by: string;
  provider_type?: string;
}
