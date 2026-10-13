/**
 * Point of Sale (POS) Sessions, Registers, and Till Balancing Contracts
 * Benchmarked against Odoo POS, TetherPOS, and ERPNext to surpass reference systems (Rule 26).
 */

export type PosSessionStatus = 'OPEN' | 'SUSPENDED' | 'CLOSING' | 'CLOSED' | 'RECONCILED';

export type PosCashMovementType =
  | 'OPENING_FLOAT'
  | 'CASH_SALE'
  | 'CASH_REFUND'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'CASH_DROP';

export type TillVarianceCategory = 'BALANCED' | 'SURPLUS' | 'DEFICIT';

export interface CashDenominationCount {
  denomination_minor: string;
  count: number;
}

export interface PosRegisterConfig {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  code: string;
  warehouse_id: string;
  default_price_list_id?: string | null;
  blind_closing_enabled: boolean;
  max_cash_limit_minor: string;
  max_allowed_variance_minor: string;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  open_cash_drawer_on_sale: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePosRegisterConfigRequest {
  branch_id: string;
  name: string;
  code: string;
  warehouse_id: string;
  default_price_list_id?: string | null;
  blind_closing_enabled?: boolean;
  max_cash_limit_minor?: string | number;
  max_allowed_variance_minor?: string | number;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  open_cash_drawer_on_sale?: boolean;
}

export interface UpdatePosRegisterConfigRequest {
  name?: string;
  warehouse_id?: string;
  default_price_list_id?: string | null;
  blind_closing_enabled?: boolean;
  max_cash_limit_minor?: string | number;
  max_allowed_variance_minor?: string | number;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  open_cash_drawer_on_sale?: boolean;
}

export interface PosSessionResponse {
  id: string;
  tenant_id: string;
  branch_id: string;
  register_id: string;
  cashier_user_id: string;
  closed_by_user_id?: string | null;
  status: PosSessionStatus;
  opening_float_minor: string;
  opening_denominations?: CashDenominationCount[] | null;
  closing_expected_minor?: string | null;
  closing_actual_minor?: string | null;
  closing_denominations?: CashDenominationCount[] | null;
  variance_minor?: string | null;
  variance_category?: TillVarianceCategory | null;
  supervisor_user_id?: string | null;
  supervisor_override_reason?: string | null;
  opened_at: string;
  closed_at?: string | null;
  reconciled_at?: string | null;
  notes?: string | null;
}

export interface PosCashMovementResponse {
  id: string;
  tenant_id: string;
  session_id: string;
  movement_type: PosCashMovementType;
  amount_minor: string;
  currency_code: string;
  drawer_balance_after_minor: string;
  source_type?: string | null;
  source_id?: string | null;
  reason?: string | null;
  safe_drop_envelope?: string | null;
  authorized_by_user_id?: string | null;
  performed_by_user_id: string;
  created_at: string;
}

export interface OpenPosSessionRequest {
  register_id: string;
  opening_float_minor: string | number;
  currency_code?: string;
  denominations?: CashDenominationCount[];
  notes?: string;
}

export interface RecordPosCashInRequest {
  amount_minor: string | number;
  currency_code?: string;
  reason: string;
}

export interface RecordPosCashOutRequest {
  amount_minor: string | number;
  currency_code?: string;
  reason: string;
  authorized_by_user_id?: string;
}

export interface RecordPosCashDropRequest {
  amount_minor: string | number;
  currency_code?: string;
  safe_drop_envelope: string;
  reason?: string;
  authorized_by_user_id?: string;
}

export interface ClosePosSessionRequest {
  closing_actual_minor: string | number;
  denominations?: CashDenominationCount[];
  supervisor_user_id?: string;
  supervisor_override_reason?: string;
  notes?: string;
}

export interface ReconcilePosSessionRequest {
  supervisor_user_id: string;
  notes?: string;
}

export interface PosSessionSummaryResponse {
  session: PosSessionResponse;
  current_drawer_balance_minor: string;
  total_cash_sales_minor: string;
  total_cash_refunds_minor: string;
  total_cash_in_minor: string;
  total_cash_out_minor: string;
  total_cash_drops_minor: string;
  expected_closing_minor: string;
  exceeds_max_cash_limit: boolean;
  movements: PosCashMovementResponse[];
}

export interface PosCheckoutLineItemInput {
  variant_id: string;
  quantity: number;
  custom_unit_price_minor?: string;
  line_discount_percent_bp?: number;
  tax_rate_ids?: string[];
}

export interface PosCheckoutTenderInput {
  tender_type: string;
  tendered_minor: string;
  idempotency_key: string;
  provider_reference?: string;
  terminal_id?: string;
}

export interface PosCheckoutRequest {
  idempotency_key: string;
  pos_session_id: string;
  pos_register_id: string;
  customer_id?: string | null;
  items: PosCheckoutLineItemInput[];
  tenders: PosCheckoutTenderInput[];
  promo_code?: string | null;
  notes?: string | null;
}

export interface PosCheckoutResponse {
  order_id: string;
  order_number: string;
  invoice_id: string;
  invoice_number: string;
  checkout_id: string;
  receipt_id: string;
  receipt_number: string;
  total_payable_minor: string;
  total_tendered_minor: string;
  change_due_minor: string;
  is_fully_paid: boolean;
  status: 'COMPLETED';
  dispatched_at: string;
}
