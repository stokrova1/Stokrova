/**
 * ============================================================================
 * STOKROVA — Enterprise B2B Customer Portal & Credit Limit Engine Contracts
 * Phase 16: Enterprise B2B Customer Portal, Self-Service & Credit Underwriting
 * ============================================================================
 */

export type B2bOrganizationRole = 'CORPORATE_HOLDING' | 'SUBSIDIARY' | 'BUYING_CENTER';

export type B2bUserRole =
  | 'CORPORATE_ADMIN'
  | 'BILLING_OFFICER'
  | 'PURCHASING_MANAGER'
  | 'LINE_BUYER';

export type B2bCreditStatus =
  | 'ACTIVE'
  | 'CREDIT_HOLD'
  | 'SUSPENDED'
  | 'REVIEW_REQUIRED';

export type RequisitionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_ORDER'
  | 'CANCELLED';

export interface B2bOrganization {
  id: string;
  tenant_id: string;
  parent_org_id?: string | null;
  name: string;
  tax_identifier?: string | null;
  org_type: B2bOrganizationRole;
  credit_limit_minor: string;
  payment_terms_days: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface B2bCreditAccount {
  id: string;
  tenant_id: string;
  organization_id: string;
  credit_limit_minor: string;
  used_exposure_minor: string;
  available_credit_minor: string;
  status: B2bCreditStatus;
  hold_reason?: string | null;
  last_evaluated_at: string;
}

export interface CreditExposureBreakdown {
  credit_limit_minor: string;
  unpaid_invoices_minor: string;
  pending_orders_minor: string;
  total_exposure_minor: string;
  available_credit_minor: string;
  is_over_limit: boolean;
  is_overdue_hold: boolean;
  status: B2bCreditStatus;
}

export interface VolumeTierBreak {
  min_quantity: number;
  discount_bp?: number;       // Basis points discount off list price
  unit_price_minor?: string;  // Explicit override price in minor units
}

export interface B2bContractPriceItem {
  id: string;
  tenant_id: string;
  organization_id: string;
  sku: string;
  custom_price_minor: string;
  currency: string;
  min_quantity: number;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface ResolvedB2bPrice {
  sku: string;
  unit_price_minor: string;
  total_line_minor: string;
  applied_rule: 'CONTRACT_PRICE' | 'VOLUME_TIER' | 'CUSTOMER_GROUP' | 'CATALOG_LIST';
  original_list_price_minor: string;
  discount_amount_minor: string;
  effective_discount_bp: number;
}

export interface B2bRequisitionItem {
  sku: string;
  item_name: string;
  quantity: number;
  unit_price_minor: string;
  total_minor: string;
}

export interface B2bRequisition {
  id: string;
  tenant_id: string;
  organization_id: string;
  requisition_number: string;
  requester_user_id: string;
  approver_user_id?: string | null;
  status: RequisitionStatus;
  total_amount_minor: string;
  currency: string;
  items: B2bRequisitionItem[];
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PunchoutSetupRequest {
  buyer_cookie: string;
  from_identity: string;
  to_identity: string;
  sender_identity: string;
  shared_secret: string;
  browser_form_post_url: string;
}

export interface PunchoutOrderMessageItem {
  line_number: number;
  sku: string;
  description: string;
  quantity: number;
  unit_price_minor: string;
  uom: string;
}

export interface PunchoutOrderMessage {
  buyer_cookie: string;
  currency: string;
  total_amount_minor: string;
  items: PunchoutOrderMessageItem[];
}

// ============================================================================
// DTOs & Request Interfaces
// ============================================================================

export interface CreateB2bOrganizationRequest {
  parent_org_id?: string | null;
  name: string;
  tax_identifier?: string | null;
  org_type?: B2bOrganizationRole;
  credit_limit_minor?: string;
  payment_terms_days?: number;
  currency?: string;
}

export interface UpdateB2bCreditLimitRequest {
  credit_limit_minor: string;
  status?: B2bCreditStatus;
  hold_reason?: string | null;
}

export interface SetB2bContractPriceRequest {
  sku: string;
  custom_price_minor: string;
  currency?: string;
  min_quantity?: number;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface EvaluateB2bPriceRequest {
  sku: string;
  quantity: number;
  catalog_list_price_minor: string;
  contract_price_minor?: string;
  volume_breaks?: VolumeTierBreak[];
  group_discount_bp?: number;
}

export interface CheckCreditExposureRequest {
  organization_id: string;
  unpaid_invoices_minor: string;
  pending_orders_minor: string;
  overdue_days?: number;
  grace_period_days?: number;
}

export interface CreateRequisitionRequest {
  organization_id: string;
  requester_user_id: string;
  currency?: string;
  items: B2bRequisitionItem[];
  requester_approval_limit_minor?: string;
}

export interface ApproveRequisitionRequest {
  approver_user_id: string;
  notes?: string;
}

export interface RejectRequisitionRequest {
  approver_user_id: string;
  rejection_reason: string;
}
