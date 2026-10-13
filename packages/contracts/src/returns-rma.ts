// ============================================================================
// STOKROVA — Reverse Logistics, RMA, Quality Inspection & Restocking Contracts
// Benchmark: SAP EWM, Manhattan WMS, ERPNext, Odoo 18
// Rule 26: Pure integer pricing (cents), zero floats, basis points fees
// ============================================================================

export type RmaStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type RmaType =
  | 'CUSTOMER_RETURN'
  | 'VENDOR_RETURN'
  | 'INTERNAL_TRANSFER_RETURN';

export type ReturnReasonCode =
  | 'DEFECTIVE'
  | 'WRONG_ITEM_SHIPPED'
  | 'BUYER_REMORSE'
  | 'DAMAGED_IN_TRANSIT'
  | 'EXPIRED'
  | 'NOT_AS_DESCRIBED'
  | 'OTHER';

export type ResolutionPreference =
  | 'REFUND'
  | 'REPLACEMENT'
  | 'STORE_CREDIT'
  | 'REPAIR';

export interface ReturnLine {
  id: string;
  tenant_id: string;
  rma_id: string;
  order_id?: string | null;
  order_line_id?: string | null;
  variant_id: string;
  sku: string;
  item_name: string;
  quantity_authorized: number;
  quantity_received: number;
  unit_price_cents: number;
  currency: string;
  reason_code: ReturnReasonCode;
  customer_notes?: string | null;
  batch_id?: string | null;
  serial_numbers?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ReturnAuthorization {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  rma_number: string;
  type: RmaType;
  status: RmaStatus;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  original_order_id?: string | null;
  original_order_number?: string | null;
  resolution_preference: ResolutionPreference;
  restocking_fee_bp: number; // e.g. 1500 = 15.00%
  return_tracking_number?: string | null;
  carrier_code?: string | null;
  receiving_location_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  received_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  lines: ReturnLine[];
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Phase 7B: Quality Inspection & Grading Contracts
// ----------------------------------------------------------------------------

export type InspectionConditionGrade =
  | 'GRADE_A_NEW'
  | 'GRADE_B_OPEN_BOX'
  | 'GRADE_C_REFURBISHABLE'
  | 'GRADE_D_SALVAGE'
  | 'SCRAP_HAZMAT';

export type InspectionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'QUARANTINED';

export interface QualityInspectionItem {
  id: string;
  tenant_id: string;
  rma_id: string;
  return_line_id: string;
  variant_id: string;
  sku: string;
  quantity_inspected: number;
  condition_grade: InspectionConditionGrade;
  status: InspectionStatus;
  failure_reason_code?: string | null;
  inspector_id?: string | null;
  quarantine_location_id?: string | null;
  inspection_notes?: string | null;
  inspected_at: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Phase 7C: Restocking & Disposition Contracts
// ----------------------------------------------------------------------------

export type DispositionActionType =
  | 'RESTOCK_TO_PRIMARY'
  | 'TRANSFER_TO_REFURB'
  | 'RETURN_TO_VENDOR'
  | 'SCRAP_DISPOSAL';

export type DispositionStatus = 'PLANNED' | 'EXECUTED' | 'CANCELLED';

export interface DispositionRecord {
  id: string;
  tenant_id: string;
  rma_id: string;
  inspection_id?: string | null;
  variant_id: string;
  sku: string;
  quantity: number;
  action_type: DispositionActionType;
  destination_location_id: string;
  destination_location_code?: string | null;
  status: DispositionStatus;
  gross_refund_cents: number;
  restocking_fee_cents: number;
  net_refund_cents: number;
  currency: string;
  executed_by?: string | null;
  executed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// DTOs & Request/Response Types
// ----------------------------------------------------------------------------

export interface CreateReturnLineRequest {
  order_id?: string | null;
  order_line_id?: string | null;
  variant_id: string;
  sku: string;
  item_name: string;
  quantity_authorized: number;
  unit_price_cents: number;
  currency: string;
  reason_code: ReturnReasonCode;
  customer_notes?: string | null;
  batch_id?: string | null;
  serial_numbers?: string[] | null;
}

export interface CreateRmaRequest {
  warehouse_id: string;
  type: RmaType;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  original_order_id?: string | null;
  original_order_number?: string | null;
  resolution_preference?: ResolutionPreference;
  restocking_fee_bp?: number;
  return_tracking_number?: string | null;
  carrier_code?: string | null;
  notes?: string | null;
  lines: CreateReturnLineRequest[];
}

export interface UpdateRmaRequest {
  resolution_preference?: ResolutionPreference;
  restocking_fee_bp?: number;
  return_tracking_number?: string | null;
  carrier_code?: string | null;
  notes?: string | null;
}

export interface ApproveRmaRequest {
  approved_by: string;
  notes?: string | null;
}

export interface RejectRmaRequest {
  rejection_reason: string;
  rejected_by?: string | null;
}

export interface ReceiveRmaLineItem {
  line_id: string;
  quantity_received: number;
  batch_id?: string | null;
  serial_numbers?: string[] | null;
}

export interface ReceiveRmaRequest {
  receiving_location_id: string;
  lines: ReceiveRmaLineItem[];
  notes?: string | null;
}

export interface RmaResponse {
  rma: ReturnAuthorization;
}

export interface ListRmasResponse {
  rmas: ReturnAuthorization[];
}

export interface PerformQualityInspectionRequest {
  rma_id: string;
  return_line_id: string;
  quantity_inspected: number;
  condition_grade: InspectionConditionGrade;
  status: InspectionStatus;
  failure_reason_code?: string | null;
  inspector_id?: string | null;
  quarantine_location_id?: string | null;
  inspection_notes?: string | null;
}

export interface QualityInspectionResponse {
  inspection: QualityInspectionItem;
}

export interface ListQualityInspectionsResponse {
  inspections: QualityInspectionItem[];
}

export interface ExecuteDispositionRequest {
  rma_id: string;
  inspection_id?: string | null;
  variant_id: string;
  sku: string;
  quantity: number;
  action_type: DispositionActionType;
  destination_location_id: string;
  gross_unit_price_cents: number;
  restocking_fee_bp: number;
  currency: string;
  operator_id?: string | null;
  notes?: string | null;
}

export interface DispositionResponse {
  disposition: DispositionRecord;
}

export interface ListDispositionsResponse {
  dispositions: DispositionRecord[];
}
