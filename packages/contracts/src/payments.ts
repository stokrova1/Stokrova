/**
 * Payments, Receipts & Financial Truth Contracts
 * Based on ARCHITECTURE.md, ADR-006, and Phase 1F specification
 */

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'STORE_CREDIT';

export type PaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export type InvoiceStatus =
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export interface InvoiceResponse {
  id: string;
  tenant_id: string;
  order_id: string;
  invoice_number: string;
  total_minor: string;
  amount_paid_minor: string;
  balance_due_minor: string;
  currency_code: string;
  status: InvoiceStatus;
  created_at: string;
  due_date?: string | null;
}

export interface CreateInvoiceRequest {
  order_id: string;
  total_minor: string | number;
  currency_code?: string;
  due_date?: string;
}

export interface PaymentResponse {
  id: string;
  tenant_id: string;
  order_id?: string | null;
  invoice_id?: string | null;
  register_session_id?: string | null;
  amount_minor: string;
  currency_code: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  provider_reference?: string | null;
  captured_by_user_id: string;
  operation_id?: string | null;
  occurred_at: string;
}

export interface RecordPaymentRequest {
  invoice_id?: string;
  order_id?: string;
  register_session_id?: string;
  amount_minor: string | number;
  currency_code?: string;
  payment_method: PaymentMethod;
  provider_reference?: string;
  operation_id?: string;
}

export interface ConfirmPaymentRequest {
  verification_reference?: string;
  notes?: string;
}

export interface ReceiptPrintResponse {
  id: string;
  tenant_id: string;
  order_id: string;
  payment_id?: string | null;
  receipt_number: string;
  printed_by_user_id: string;
  register_id?: string | null;
  print_count: number;
  is_reprint: boolean;
  occurred_at: string;
}

export interface PrintReceiptRequest {
  order_id: string;
  payment_id?: string;
  register_id?: string;
}

export interface RegisterSettlementReport {
  register_id: string;
  session_id: string;
  opened_at: string;
  closed_at?: string | null;
  opening_float_minor: string;
  total_cash_payments_minor: string;
  total_card_payments_minor: string;
  total_transfer_payments_minor: string;
  total_refunds_minor: string;
  expected_cash_in_drawer_minor: string;
  actual_cash_in_drawer_minor?: string | null;
  variance_minor?: string | null;
  payments_count: number;
  receipts_printed_count: number;
}

export type PaymentTenderType =
  | 'CASH'
  | 'CARD'
  | 'STORE_CREDIT'
  | 'GIFT_CARD'
  | 'LOYALTY_POINTS'
  | 'BANK_TRANSFER';

export interface PaymentTenderInput {
  idempotency_key: string;
  tender_type: PaymentTenderType;
  amount_minor: string | number;
  currency_code?: string;
  provider_reference?: string;
  terminal_id?: string;
  customer_account_id?: string;
  gift_card_code?: string;
  notes?: string;
}

export interface AllocatedTender {
  id: string;
  idempotency_key: string;
  tender_type: PaymentTenderType;
  tendered_minor: string;
  allocated_minor: string;
  change_returned_minor: string;
  provider_reference?: string | null;
  captured_at: string;
}

export interface ProcessMultiTenderCheckoutRequest {
  order_id: string;
  total_payable_minor: string | number;
  currency_code?: string;
  pos_session_id?: string;
  tenders: PaymentTenderInput[];
}

export interface ProcessMultiTenderCheckoutResponse {
  checkout_id: string;
  order_id: string;
  total_payable_minor: string;
  total_tendered_minor: string;
  total_allocated_minor: string;
  change_due_minor: string;
  remaining_balance_minor: string;
  is_fully_paid: boolean;
  allocated_tenders: AllocatedTender[];
  pos_cash_movement_id?: string | null;
}
