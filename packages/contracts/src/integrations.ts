// ============================================================================
// STOKROVA — Multi-Company Consolidation, Inter-Company & Integrations Contracts
// Benchmark: SAP S/4HANA Corporate, NetSuite OneWorld, Stripe Webhooks
// Rules 7, 11, 26: Pure integer currency consolidation, automated elimination,
// HMAC-SHA256 signed webhooks, reprint tracking
// ============================================================================

import type { AccountType } from './finance.js';

// ============================================================================
// 1. Multi-Company Holding Hierarchies
// ============================================================================

export interface HoldingGroup {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  parent_company_id: string;
  subsidiary_company_ids: string[];
  consolidation_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConsolidatedTrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  total_debit_minor: string;
  total_credit_minor: string;
  elimination_debit_minor: string;
  elimination_credit_minor: string;
  net_consolidated_minor: string;
}

export interface ConsolidatedTrialBalanceReport {
  tenant_id: string;
  holding_group_id: string;
  as_of_date: string;
  consolidation_currency: string;
  rows: ConsolidatedTrialBalanceRow[];
  total_debit_minor: string;
  total_credit_minor: string;
  total_eliminations_minor: string;
  is_balanced: boolean;
}

// ============================================================================
// 2. Inter-Company Transactions (ICT)
// ============================================================================

export type InterCompanyStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface InterCompanyTransferItem {
  id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  unit_transfer_price_minor: string;
  subtotal_minor: string;
}

export interface InterCompanyTransfer {
  id: string;
  tenant_id: string;
  transfer_number: string;
  source_company_id: string;
  source_warehouse_id: string;
  destination_company_id: string;
  destination_warehouse_id: string;
  status: InterCompanyStatus;
  total_amount_minor: string;
  currency: string;
  items: InterCompanyTransferItem[];
  source_sales_order_id?: string | null;
  destination_purchase_order_id?: string | null;
  source_journal_entry_id?: string | null;
  destination_journal_entry_id?: string | null;
  elimination_journal_entry_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 3. Outbound Developer Webhooks
// ============================================================================

export type WebhookEventType =
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_PAID'
  | 'ORDER_FULFILLED'
  | 'INVENTORY_STOCK_LOW'
  | 'INVENTORY_MOVEMENT'
  | 'PAYMENT_SETTLED'
  | 'PAYMENT_FAILED'
  | 'SHIPMENT_DISPATCHED'
  | 'DELIVERY_COMPLETED'
  | 'FINANCE_JOURNAL_POSTED'
  | 'B2B_CREDIT_HOLD'
  | 'EDI_DOCUMENT_RECEIVED'
  | 'LOYALTY_TIER_UPGRADED';

export interface WebhookSubscription {
  id: string;
  tenant_id: string;
  name: string;
  target_url: string;
  secret_token: string;
  event_types: WebhookEventType[];
  is_active: boolean;
  retry_limit: number;
  failure_count?: number;
  circuit_breaker_tripped_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type WebhookDeliveryStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTER';

export interface WebhookDeliveryAttempt {
  id: string;
  tenant_id: string;
  subscription_id: string;
  event_type: WebhookEventType;
  payload_json: string;
  signature_header: string;
  attempt_number: number;
  status: WebhookDeliveryStatus;
  http_status_code?: number | null;
  response_body?: string | null;
  error_message?: string | null;
  next_retry_at?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

// ============================================================================
// 4. Enterprise Document Engine & Reprint Tracking
// ============================================================================

export type DocumentType =
  | 'INVOICE'
  | 'RECEIPT'
  | 'PACKING_SLIP'
  | 'BILL_OF_LADING'
  | 'DELIVERY_MANIFEST'
  | 'PURCHASE_ORDER';

export type DocumentRenderFormat = 'HTML' | 'PDF' | 'JSON' | 'TEXT_RECEIPT';

export interface RenderedDocument {
  document_id: string;
  document_type: DocumentType;
  entity_id: string;
  format: DocumentRenderFormat;
  content: string;
  rendered_at: string;
  is_reprint: boolean;
  reprint_count: number;
}

// ============================================================================
// 5. Multi-Channel Notifications
// ============================================================================

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WEBHOOK';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface NotificationMessage {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateHoldingGroupRequest {
  code: string;
  name: string;
  parent_company_id: string;
  subsidiary_company_ids: string[];
  consolidation_currency?: string;
  is_active?: boolean;
}

export interface UpdateHoldingGroupRequest {
  name?: string;
  subsidiary_company_ids?: string[];
  is_active?: boolean;
}

export interface CreateInterCompanyTransferItemRequest {
  variant_id: string;
  sku: string;
  quantity: number;
  unit_transfer_price_minor: string;
}

export interface CreateInterCompanyTransferRequest {
  source_company_id: string;
  source_warehouse_id: string;
  destination_company_id: string;
  destination_warehouse_id: string;
  currency?: string;
  items: CreateInterCompanyTransferItemRequest[];
}

export interface CreateWebhookSubscriptionRequest {
  name: string;
  target_url: string;
  event_types: WebhookEventType[];
  secret_token?: string;
  retry_limit?: number;
  is_active?: boolean;
}

export interface UpdateWebhookSubscriptionRequest {
  name?: string;
  target_url?: string;
  event_types?: WebhookEventType[];
  is_active?: boolean;
  retry_limit?: number;
}

export interface RenderDocumentRequest {
  document_type: DocumentType;
  entity_id: string;
  format?: DocumentRenderFormat;
  custom_notes?: string | null;
}

export interface SendNotificationRequest {
  user_id?: string | null;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}
