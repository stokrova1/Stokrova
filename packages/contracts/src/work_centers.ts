/**
 * Work Centers, Registers, and Till Balancing Contracts
 * Based on ARCHITECTURE.md, ADR-014, and Phase 1C specification
 */

export interface CreateBranchRequest {
  company_id?: string;
  name: string;
  code: string;
}


export interface UpdateBranchRequest {
  name?: string;
  code?: string;
}

export type WorkCenterType =
  | 'SALES'
  | 'PICKING'
  | 'VERIFICATION'
  | 'PACKING'
  | 'PAYMENT'
  | 'DISPATCH';

export interface WorkCenterResponse {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  type: WorkCenterType;
  created_at: string;
}

export interface CreateWorkCenterRequest {
  branch_id: string;
  name: string;
  type: WorkCenterType;
}

export interface UpdateWorkCenterRequest {
  name?: string;
  type?: WorkCenterType;
}

export type RegisterStatus = 'ACTIVE' | 'INACTIVE';

export interface RegisterResponse {
  id: string;
  tenant_id: string;
  branch_id: string;
  work_center_id: string | null;
  name: string;
  code: string;
  status: RegisterStatus;
  created_at: string;
}

export interface CreateRegisterRequest {
  branch_id: string;
  work_center_id?: string | null;
  name: string;
  code: string;
}

export interface UpdateRegisterRequest {
  name?: string;
  work_center_id?: string | null;
  status?: RegisterStatus;
}

export type RegisterSessionStatus = 'OPEN' | 'CLOSED' | 'RECONCILED';

export interface RegisterSessionResponse {
  id: string;
  tenant_id: string;
  register_id: string;
  opened_by_user_id: string;
  closed_by_user_id?: string | null;
  opening_float_minor: string;
  closing_expected_minor?: string | null;
  closing_actual_minor?: string | null;
  variance_minor?: string | null;
  status: RegisterSessionStatus;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
}

export type CashMovementType =
  | 'OPENING_FLOAT'
  | 'CASH_SALE'
  | 'CASH_REFUND'
  | 'CASH_IN'
  | 'CASH_OUT';

export interface CashMovementResponse {
  id: string;
  tenant_id: string;
  register_session_id: string;
  movement_type: CashMovementType;
  amount_minor: string;
  currency_code: string;
  source_type?: string | null;
  source_id?: string | null;
  reason?: string | null;
  created_by_user_id: string;
  occurred_at: string;
}

export interface OpenSessionRequest {
  register_id: string;
  opening_float_minor: string | number;
  currency_code?: string;
  notes?: string;
}

export interface CloseSessionRequest {
  closing_actual_minor: string | number;
  notes?: string;
}

export interface RecordCashMovementRequest {
  movement_type: 'CASH_SALE' | 'CASH_REFUND' | 'CASH_IN' | 'CASH_OUT';
  amount_minor: string | number;
  currency_code?: string;
  source_type?: string;
  source_id?: string;
  reason?: string;
}

export interface SessionSummaryResponse {
  session: RegisterSessionResponse;
  total_cash_sales_minor: string;
  total_cash_refunds_minor: string;
  total_cash_in_minor: string;
  total_cash_out_minor: string;
  expected_closing_minor: string;
  movements: CashMovementResponse[];
}
