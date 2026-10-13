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

// ============================================================================
// 6. Phase 12: Integration Hub, External Connectors & Developer Platform
// ============================================================================

export type ConnectorType =
  | 'ECOMMERCE_SHOPIFY'
  | 'ECOMMERCE_WOOCOMMERCE'
  | 'ECOMMERCE_GENERIC'
  | 'PAYMENT_STRIPE'
  | 'PAYMENT_GENERIC'
  | 'CARRIER_FEDEX'
  | 'CARRIER_GENERIC'
  | 'ACCOUNTING_QUICKBOOKS'
  | 'ERP_GENERIC'
  | 'CUSTOM_WEBHOOK';

export type ConnectorCategory =
  | 'ECOMMERCE'
  | 'PAYMENT'
  | 'CARRIER'
  | 'ACCOUNTING'
  | 'ERP'
  | 'WEBHOOK';

export type ConnectorCapability =
  | 'HEALTH_CHECK'
  | 'AUTH_VALIDATION'
  | 'ORDER_IMPORT'
  | 'CATALOG_EXPORT'
  | 'STOCK_SYNC'
  | 'PAYMENT_VERIFY'
  | 'PAYMENT_REFUND'
  | 'SHIPMENT_TRACK'
  | 'INBOUND_WEBHOOK'
  | 'OUTBOUND_WEBHOOK'
  | 'RECONCILE';

export interface ConnectorDefinition {
  code: ConnectorType;
  name: string;
  category: ConnectorCategory;
  version: string;
  capabilities: ConnectorCapability[];
  config_schema_json?: string;
  supports_webhooks: boolean;
  is_active: boolean;
}

export type IntegrationInstanceStatus =
  | 'DRAFT'
  | 'CONFIGURED'
  | 'VALIDATING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DISCONNECTED';

export interface IntegrationInstance {
  id: string;
  tenant_id: string;
  name: string;
  connector_code: ConnectorType;
  status: IntegrationInstanceStatus;
  company_id?: string | null;
  branch_id?: string | null;
  config: Record<string, unknown>;
  credential_id?: string | null;
  last_sync_at?: string | null;
  last_health_check_at?: string | null;
  is_healthy: boolean;
  health_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeveloperApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  masked_key: string;
  key_hash: string;
  scopes: string[];
  rate_limit_per_minute: number;
  expires_at?: string | null;
  is_active: boolean;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDeveloperApiKeyRequest {
  name: string;
  scopes: string[];
  rate_limit_per_minute?: number;
  expires_in_days?: number;
}

export interface CreateDeveloperApiKeyResponse {
  apiKey: DeveloperApiKey;
  raw_api_key: string; // Plaintext returned ONLY ONCE upon creation
}

export interface IntegrationCredential {
  id: string;
  tenant_id: string;
  integration_instance_id: string;
  name: string;
  masked_secret: string;
  secret_hash: string;
  encrypted_secret?: string;
  expires_at?: string | null;
  last_rotated_at: string;
  created_at: string;
}

export type IntegrationEntityType =
  | 'ORDER'
  | 'CUSTOMER'
  | 'PRODUCT'
  | 'PAYMENT'
  | 'SHIPMENT'
  | 'JOURNAL_ENTRY';

export type ExternalMappingSyncStatus =
  | 'SYNCED'
  | 'PENDING'
  | 'CONFLICT'
  | 'FAILED';

export interface ExternalIdentityMapping {
  id: string;
  tenant_id: string;
  integration_instance_id: string;
  entity_type: IntegrationEntityType;
  external_id: string;
  internal_id: string;
  sync_status: ExternalMappingSyncStatus;
  last_synced_at: string;
  metadata?: Record<string, unknown>;
}

export type IntegrationSyncDirection = 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL';

export type ConflictResolutionPolicy =
  | 'STOKROVA_WINS'
  | 'EXTERNAL_WINS'
  | 'MANUAL_REVIEW'
  | 'NEWEST_VERSION';

export type FieldTransformType =
  | 'DIRECT'
  | 'ENUM_MAP'
  | 'DATE_FORMAT'
  | 'CURRENCY_MINOR'
  | 'BASIS_POINTS'
  | 'DEFAULT_VALUE';

export interface IntegrationFieldMapping {
  id: string;
  tenant_id: string;
  integration_instance_id: string;
  entity_type: IntegrationEntityType;
  source_field: string;
  target_field: string;
  transform_type?: FieldTransformType;
  transform_config?: Record<string, unknown>;
  is_required: boolean;
}

export type IntegrationSyncRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIALLY_FAILED'
  | 'FAILED';

export interface IntegrationSyncRun {
  id: string;
  tenant_id: string;
  integration_instance_id: string;
  direction: IntegrationSyncDirection;
  status: IntegrationSyncRunStatus;
  records_processed: number;
  records_accepted: number;
  records_rejected: number;
  records_skipped: number;
  cursor_checkpoint?: string | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export type InboundWebhookReceiptStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'DUPLICATE_IGNORED'
  | 'REJECTED'
  | 'FAILED';

export interface InboundWebhookReceipt {
  id: string;
  tenant_id: string;
  integration_instance_id?: string | null;
  provider: string;
  provider_event_id: string;
  event_type: string;
  payload_hash: string;
  status: InboundWebhookReceiptStatus;
  received_at: string;
  processed_at?: string | null;
  error_message?: string | null;
}

export type IntegrationReconciliationStatus =
  | 'MATCHED'
  | 'DISCREPANCY_DETECTED'
  | 'RESOLVED';

export interface IntegrationReconciliation {
  id: string;
  tenant_id: string;
  integration_instance_id: string;
  entity_type: IntegrationEntityType;
  external_id: string;
  internal_id: string;
  status: IntegrationReconciliationStatus;
  discrepancy_details?: Record<string, unknown>;
  checked_at: string;
  resolved_at?: string | null;
}

export interface IntegrationAuditEvent {
  id: string;
  tenant_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
}

// Request DTOs
export interface CreateIntegrationInstanceRequest {
  name: string;
  connector_code: ConnectorType;
  company_id?: string | null;
  branch_id?: string | null;
  config?: Record<string, unknown>;
}

export interface UpdateIntegrationInstanceRequest {
  name?: string;
  config?: Record<string, unknown>;
  status?: IntegrationInstanceStatus;
}

export interface StoreIntegrationCredentialRequest {
  name: string;
  secret: string;
  expires_at?: string | null;
}

export interface CreateEntityMappingRequest {
  entity_type: IntegrationEntityType;
  external_id: string;
  internal_id: string;
  metadata?: Record<string, unknown>;
}

export interface CreateFieldMappingRequest {
  entity_type: IntegrationEntityType;
  source_field: string;
  target_field: string;
  transform_type?: FieldTransformType;
  transform_config?: Record<string, unknown>;
  is_required?: boolean;
}

export interface TriggerSyncRunRequest {
  direction?: IntegrationSyncDirection;
  cursor_checkpoint?: string | null;
}

export interface InboundWebhookPayload {
  provider: string;
  provider_event_id: string;
  event_type: string;
  timestamp?: number;
  payload: Record<string, unknown>;
  signature?: string;
}
