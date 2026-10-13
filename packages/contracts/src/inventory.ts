/**
 * STOKROVA Deep Inventory Core & Immutable Ledger Contracts (Phase 2E)
 *
 * Surpassing ERPNext, Odoo, InvenTree, and OpenBoxes:
 * - Double-entry append-only immutable stock ledger
 * - Decoupled physical on-hand vs. commercial reservations with TTL
 * - Real-time Available to Promise (ATP) = On-Hand - Reserved + Inbound
 * - High-performance materialized stock balance snapshots
 * - Idempotent movement postings with strict tenant isolation
 */

export type StockMovementType =
  | 'OPENING_BALANCE'
  | 'PURCHASE_RECEIPT'
  | 'SALE_ISSUE'
  | 'SALES_DISPATCH'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'INTERNAL_TRANSFER'
  | 'DAMAGE'
  | 'SCRAP_DAMAGED'
  | 'EXPIRY'
  | 'ADJUSTMENT'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_COUNT_ADJUSTMENT'
  | 'QUARANTINE_MOVE'
  | 'QUARANTINE_RELEASE'
  | 'QUARANTINE_REJECT'
  | 'MANUFACTURING_CONSUMPTION'
  | 'MANUFACTURING_RECEIPT'
  | 'MANUFACTURING_SCRAP';

export type MovementReferenceType =
  | 'SALES_ORDER'
  | 'PURCHASE_ORDER'
  | 'STOCK_TRANSFER'
  | 'CYCLE_COUNT'
  | 'MANUAL_ADJUSTMENT'
  | 'SYSTEM_INITIALIZATION'
  | 'QUALITY_INSPECTION'
  | 'SCRAP_WRITE_OFF'
  | 'CUSTOMER_RETURN_RMA'
  | 'MANUFACTURING_ORDER'
  | 'PRODUCTION_ORDER';

export type ReservationStatus =
  | 'ACTIVE'
  | 'FULFILLED'
  | 'RELEASED'
  | 'EXPIRED';

export interface StockLedgerEntry {
  id: string;
  tenant_id: string;
  idempotency_key: string;
  movement_type: StockMovementType;
  reference_type: MovementReferenceType;
  reference_id: string;
  variant_id: string;
  batch_id: string | null;
  serial_id: string | null;
  source_warehouse_id: string | null;
  source_location_id: string | null;
  destination_warehouse_id: string | null;
  destination_location_id: string | null;
  quantity: number; // Positive quantity moved
  unit_cost_minor: string; // BigInt serialized as string
  total_cost_minor: string;
  user_id: string;
  notes: string | null;
  created_at: string;
}

export interface StockReservation {
  id: string;
  tenant_id: string;
  variant_id: string;
  warehouse_id: string;
  batch_id: string | null;
  serial_id: string | null;
  quantity: number;
  status: ReservationStatus;
  reference_type: string;
  reference_id: string;
  expires_at: string;
  fulfilled_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockBalanceSnapshot {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  location_id: string | null;
  variant_id: string;
  batch_id: string | null;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_to_promise: number; // on_hand - reserved
  updated_at: string;
}

// ----------------------------------------------------------------------------
// DTOs: Requests & Responses
// ----------------------------------------------------------------------------

export interface PostStockMovementRequest {
  idempotency_key: string;
  movement_type: StockMovementType;
  reference_type: MovementReferenceType;
  reference_id: string;
  variant_id: string;
  batch_id?: string | null;
  serial_id?: string | null;
  source_warehouse_id?: string | null;
  source_location_id?: string | null;
  destination_warehouse_id?: string | null;
  destination_location_id?: string | null;
  quantity: number;
  unit_cost_minor: string;
  notes?: string | null;
}

export interface CreateStockReservationRequest {
  variant_id: string;
  warehouse_id: string;
  batch_id?: string | null;
  serial_id?: string | null;
  quantity: number;
  reference_type: string;
  reference_id: string;
  ttl_seconds?: number; // Default 900 (15 min)
}

export interface StockMovementResponse {
  entry: StockLedgerEntry;
  source_balance?: StockBalanceSnapshot | null;
  destination_balance?: StockBalanceSnapshot | null;
}

export interface ListStockLedgerResponse {
  entries: StockLedgerEntry[];
}

export interface StockReservationResponse {
  reservation: StockReservation;
}

export interface ListStockReservationsResponse {
  reservations: StockReservation[];
}

export interface StockBalanceResponse {
  balance: StockBalanceSnapshot;
}

export interface ListStockBalancesResponse {
  balances: StockBalanceSnapshot[];
}

export interface OpeningBalanceRequest {
  idempotency_key: string;
  warehouse_id: string;
  location_id?: string | null;
  variant_id: string;
  quantity: number;
  unit_cost_minor: string;
  batch_number?: string | null;
  expiration_date?: string | null;
  serial_numbers?: string[] | null;
  notes?: string | null;
}

export interface StockAdjustmentRequest {
  idempotency_key: string;
  warehouse_id: string;
  location_id?: string | null;
  variant_id: string;
  delta_quantity: number;
  reason_code: 'DAMAGED' | 'EXPIRED' | 'CYCLE_COUNT_CORRECTION' | 'SCRAP' | 'OTHER';
  unit_cost_minor?: string;
  batch_id?: string | null;
  serial_id?: string | null;
  notes?: string | null;
}

export interface StockTransferRequest {
  idempotency_key: string;
  source_warehouse_id: string;
  source_location_id?: string | null;
  destination_warehouse_id: string;
  destination_location_id?: string | null;
  variant_id: string;
  quantity: number;
  batch_id?: string | null;
  serial_id?: string | null;
  unit_cost_minor?: string;
  notes?: string | null;
}

export interface StockWriteOffRequest {
  idempotency_key: string;
  warehouse_id: string;
  location_id?: string | null;
  variant_id: string;
  quantity: number;
  write_off_type: 'DAMAGE' | 'EXPIRY' | 'THEFT' | 'OBSOLETE';
  batch_id?: string | null;
  serial_id?: string | null;
  notes?: string | null;
}

export interface StockCountDiscrepancyRequest {
  idempotency_key: string;
  warehouse_id: string;
  location_id?: string | null;
  variant_id: string;
  counted_quantity: number;
  batch_id?: string | null;
  notes?: string | null;
}

export interface BalanceReconciliationResult {
  tenant_id: string;
  warehouse_id: string;
  location_id: string | null;
  variant_id: string;
  batch_id: string | null;
  previous_snapshot_on_hand: number;
  calculated_ledger_on_hand: number;
  drift_detected: boolean;
  reconciled_at: string;
}

export interface ReconcileBalancesRequest {
  warehouse_id?: string;
  variant_id?: string;
}

export interface ReconcileBalancesResponse {
  total_reconciled: number;
  discrepancies_corrected: number;
  details: BalanceReconciliationResult[];
}

export interface FefoRecommendationRequest {
  variant_id: string;
  warehouse_id: string;
  quantity: number;
}

export interface FefoAllocationItem {
  batch_id: string;
  batch_number: string;
  expiry_date: string | null;
  allocated_quantity: number;
  available_in_batch: number;
}

export interface FefoRecommendationResponse {
  variant_id: string;
  requested_quantity: number;
  total_allocated: number;
  allocations: FefoAllocationItem[];
  shortage: number;
}

export interface BarcodeLookupResponse {
  found: boolean;
  variant?: {
    id: string;
    template_id: string;
    sku: string;
    barcode: string | null;
    template_name: string;
    cost_price_minor: string;
    selling_price_minor: string;
    base_uom_name: string;
  } | null;
}
