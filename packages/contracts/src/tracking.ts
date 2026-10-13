/**
 * STOKROVA Tracking & Quarantine Contracts (Phase 2D)
 *
 * Surpassing ERPNext, Odoo, InvenTree, and OpenBoxes:
 * - Unified tracking strategies (NONE, BATCH, SERIAL, BATCH_AND_SERIAL)
 * - Strict quarantine partitions with explicit reason codes and release audit
 * - Dual dates: manufacture, expiry, retest, and warranty windows
 * - FEFO (First-Expired, First-Out) metadata and remaining shelf-life metrics
 */

export type TrackingStrategy = 'NONE' | 'BATCH' | 'SERIAL' | 'BATCH_AND_SERIAL';

export type BatchStatus =
  | 'AVAILABLE'
  | 'QUARANTINED'
  | 'EXPIRED'
  | 'RECALLED'
  | 'DEPLETED';

export type SerialStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'QUARANTINED'
  | 'DAMAGED'
  | 'DISPATCHED'
  | 'CONSUMED'
  | 'RETURNED';

export type QuarantineReasonCode =
  | 'QA_INSPECTION_PENDING'
  | 'DAMAGED_IN_TRANSIT'
  | 'SUPPLIER_RECALL'
  | 'TEMPERATURE_EXCURSION'
  | 'CUSTOMER_RETURN_INSPECTION'
  | 'AUDIT_HOLD'
  | 'OTHER';

export interface StockBatch {
  id: string;
  tenant_id: string;
  variant_id: string;
  batch_number: string;
  supplier_lot_number: string | null;
  status: BatchStatus;
  manufacture_date: string | null;
  expiry_date: string | null;
  retest_date: string | null;
  certificate_of_analysis_url: string | null;
  quarantine_reason: QuarantineReasonCode | null;
  quarantine_notes: string | null;
  quarantined_at: string | null;
  released_at: string | null;
  released_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockSerial {
  id: string;
  tenant_id: string;
  variant_id: string;
  batch_id: string | null;
  serial_number: string;
  warehouse_id: string;
  location_id: string | null;
  status: SerialStatus;
  quarantine_reason: QuarantineReasonCode | null;
  quarantine_notes: string | null;
  quarantined_at: string | null;
  released_at: string | null;
  released_by: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShelfLifeMetrics {
  total_shelf_life_days: number | null;
  remaining_days: number;
  percentage_remaining: number | null;
  is_expired: boolean;
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'NOT_APPLICABLE';
}

// ----------------------------------------------------------------------------
// DTOs: Requests & Responses
// ----------------------------------------------------------------------------

export interface CreateBatchRequest {
  variant_id: string;
  batch_number: string;
  supplier_lot_number?: string | null;
  manufacture_date?: string | null;
  expiry_date?: string | null;
  retest_date?: string | null;
  certificate_of_analysis_url?: string | null;
}

export interface UpdateBatchRequest {
  supplier_lot_number?: string | null;
  manufacture_date?: string | null;
  expiry_date?: string | null;
  retest_date?: string | null;
  certificate_of_analysis_url?: string | null;
}

export interface QuarantineHoldRequest {
  reason: QuarantineReasonCode;
  notes?: string;
}

export interface QuarantineReleaseRequest {
  notes?: string;
}

export interface CreateSerialRequest {
  variant_id: string;
  batch_id?: string | null;
  serial_number: string;
  warehouse_id: string;
  location_id?: string | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
}

export interface BatchRegisterSerialsRequest {
  variant_id: string;
  batch_id?: string | null;
  warehouse_id: string;
  location_id?: string | null;
  serial_numbers: string[];
}

export interface UpdateSerialLocationRequest {
  warehouse_id: string;
  location_id?: string | null;
}

export interface BatchResponse {
  batch: StockBatch;
  shelf_life?: ShelfLifeMetrics;
}

export interface ListBatchesResponse {
  batches: StockBatch[];
}

export interface SerialResponse {
  serial: StockSerial;
}

export interface ListSerialsResponse {
  serials: StockSerial[];
}
