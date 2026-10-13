/**
 * Offline POS Synchronization & Conflict Resolution Contracts (Phase 3E)
 * Benchmarked against TetherPOS, QuickStock Sync, Odoo POS, and ERPNext (Rule 26).
 *
 * Guarantees:
 * - Rule 8: Never allow payment retries to duplicate payments
 * - Rule 10: Never use global last-write-wins for business-critical conflicts
 * - Rule 19: Always make critical commands idempotent
 * - Rule 24: Always make offline behavior explicit
 */

import type { PaymentTenderType } from './payments.js';

export type OfflinePosTransactionType = 'SALE' | 'RETURN' | 'CASH_MOVEMENT';

export type PosSyncResolutionStatus =
  | 'PROCESSED'
  | 'IDEMPOTENT_DUPLICATE'
  | 'CONFLICT_RECONCILED'
  | 'REJECTED';

export interface OfflineSaleLineItemInput {
  variant_id: string;
  quantity: number;
  unit_price_minor: string | number;
  discount_minor?: string | number;
  tax_minor?: string | number;
}

export interface OfflineSalePaymentInput {
  tender_type: PaymentTenderType;
  amount_minor: string | number;
  tender_reference?: string | null;
  card_auth_code?: string | null;
  idempotency_key: string;
}

export interface OfflineSalePayload {
  customer_id?: string | null;
  customer_name?: string | null;
  lines: OfflineSaleLineItemInput[];
  payments: OfflineSalePaymentInput[];
  notes?: string | null;
}

export interface OfflineCashMovementPayload {
  movement_type: 'CASH_IN' | 'CASH_OUT' | 'CASH_DROP';
  amount_minor: string | number;
  reason: string;
  idempotency_key: string;
}

export interface OfflinePosTransactionEnvelope {
  client_tx_id: string;
  device_id: string;
  pos_session_id: string;
  client_sequence: number;
  client_timestamp: string;
  tx_type: OfflinePosTransactionType;
  idempotency_key: string;
  sale_payload?: OfflineSalePayload | null;
  cash_movement_payload?: OfflineCashMovementPayload | null;
  signature?: string | null;
}

export interface PosSyncBatchRequest {
  device_id: string;
  pos_register_id: string;
  pos_session_id: string;
  transactions: OfflinePosTransactionEnvelope[];
}

export interface PosSyncTransactionResolution {
  client_tx_id: string;
  status: PosSyncResolutionStatus;
  server_order_id?: string | null;
  server_sequence: number;
  conflict_reason?: string | null;
  reconciliation_note?: string | null;
}

export interface PosSyncBatchResponse {
  batch_id: string;
  device_id: string;
  pos_session_id: string;
  total_submitted: number;
  processed_count: number;
  duplicate_count: number;
  conflict_count: number;
  rejected_count: number;
  resolutions: PosSyncTransactionResolution[];
  server_timestamp: string;
}

export interface DeviceSyncStatusResponse {
  device_id: string;
  last_acknowledged_sequence: number;
  server_timestamp: string;
}
