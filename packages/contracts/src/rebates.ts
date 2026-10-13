/**
 * ============================================================================
 * STOKROVA — Rebates & Commercial Incentive Agreements Contracts
 * Phase 8 Contracts
 * ============================================================================
 */

export type RebateType =
  | 'CUSTOMER_VOLUME'
  | 'CUSTOMER_SPEND'
  | 'SUPPLIER_VOLUME'
  | 'SUPPLIER_SPEND';

export type RebateCalculationMethod =
  | 'GRADUATED_TIERS'      // Each tier applied to its marginal bracket
  | 'RETROACTIVE_ALL_UNITS'; // Highest qualified tier applied to all units/spend

export type RebateStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export type RebateAccrualStatus =
  | 'ESTIMATE'
  | 'ACCRUED'
  | 'CLAIMED'
  | 'APPROVED'
  | 'SETTLED'
  | 'DISPUTED';

export interface RebateAgreement {
  id: string;
  tenant_id: string;
  agreement_number: string;
  name: string;
  rebate_type: RebateType;
  counterparty_type: 'CUSTOMER' | 'SUPPLIER';
  counterparty_id: string;
  currency_code: string;
  calculation_method: RebateCalculationMethod;
  settlement_frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  valid_from: string;
  valid_until: string;
  status: RebateStatus;
  created_at: string;
  updated_at: string;
}

export interface RebateTier {
  id: string;
  tenant_id: string;
  agreement_id: string;
  tier_number: number;
  threshold_quantity?: number | null;
  threshold_amount_minor?: string | null;
  rebate_rate_bp: number; // e.g. 500 = 5.0%
  fixed_rebate_per_unit_minor?: string | null;
  created_at: string;
}

export interface RebateAccrual {
  id: string;
  tenant_id: string;
  agreement_id: string;
  counterparty_id: string;
  period_identifier: string; // e.g. "2026-Q1"
  eligible_quantity: number;
  eligible_spend_minor: string;
  calculated_accrual_minor: string;
  status: RebateAccrualStatus;
  credit_note_reference?: string | null;
  settlement_reference?: string | null;
  operation_id?: string | null;
  last_recalculated_at: string;
  created_at: string;
}

export interface CreateRebateAgreementRequest {
  agreement_number: string;
  name: string;
  rebate_type: RebateType;
  counterparty_type: 'CUSTOMER' | 'SUPPLIER';
  counterparty_id: string;
  currency_code?: string;
  calculation_method?: RebateCalculationMethod;
  settlement_frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  valid_from: string;
  valid_until: string;
}

export interface AddRebateTierRequest {
  tier_number: number;
  threshold_quantity?: number;
  threshold_amount_minor?: string;
  rebate_rate_bp: number;
  fixed_rebate_per_unit_minor?: string;
}

export interface CalculateRebateAccrualRequest {
  agreement_id: string;
  period_identifier: string;
  eligible_quantity: number;
  eligible_spend_minor: string;
  operation_id?: string;
}

export interface SettleRebateRequest {
  accrual_id: string;
  settlement_reference: string;
  credit_note_reference?: string;
  settled_by: string;
  operation_id: string;
}
