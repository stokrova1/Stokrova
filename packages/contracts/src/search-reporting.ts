// ============================================================================
// STOKROVA — Global Multi-Entity Search, Audit Forensics & Reporting Contracts
// Benchmark: SAP S/4HANA Enterprise Search, Datadog Audit Trails, Stripe Reports
// Rule 26: Pure integer metrics, zero float math, immutable security verification
// ============================================================================

export type SearchEntityType =
  | 'PRODUCT'
  | 'VARIANT'
  | 'SKU_BARCODE'
  | 'SALES_ORDER'
  | 'INVOICE'
  | 'CUSTOMER'
  | 'BATCH_SERIAL'
  | 'JOURNAL_ENTRY';

export type SearchMatchRank =
  | 'EXACT_MATCH'
  | 'PREFIX_MATCH'
  | 'SUBSTRING_MATCH'
  | 'FUZZY_MATCH';

export interface SearchIndexEntry {
  id: string;
  entity_type: SearchEntityType;
  entity_id: string;
  primary_text: string;
  secondary_text?: string;
  barcode?: string;
  sku?: string;
  reference_number?: string;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResultItem {
  entity_type: SearchEntityType;
  entity_id: string;
  title: string;
  subtitle?: string;
  rank_score: number;
  match_type: SearchMatchRank;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResponse {
  query: string;
  total_matches: number;
  items: GlobalSearchResultItem[];
}

export interface AuditChainBlock {
  index: number;
  timestamp: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  resource: string;
  resource_id: string;
  payload_hash: string;
  previous_hash: string;
  current_hash: string;
}

export interface AuditChainVerificationResult {
  is_valid: boolean;
  total_blocks_verified: number;
  broken_block_index: number | null;
  error_reason: string | null;
}

export type DataExportFormat = 'CSV' | 'JSONL';

export type DataExportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export interface DataExportJob {
  id: string;
  tenant_id: string;
  entity_type: string;
  format: DataExportFormat;
  status: DataExportStatus;
  row_count: number;
  download_token: string;
  expires_at: string;
  created_at: string;
  completed_at?: string | null;
}

export type ReportMetric =
  | 'TOTAL_REVENUE'
  | 'TOTAL_COGS'
  | 'GROSS_PROFIT'
  | 'ITEM_COUNT'
  | 'QUANTITY_SOLD'
  | 'AVERAGE_ORDER_VALUE';

export type ReportDimension =
  | 'BRANCH'
  | 'CATEGORY'
  | 'WAREHOUSE'
  | 'CASHIER'
  | 'CUSTOMER'
  | 'DATE_DAY'
  | 'DATE_MONTH';

export interface CustomReportDefinition {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  metrics: ReportMetric[];
  dimensions: ReportDimension[];
  filters?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

export interface ReportExecutionResult {
  report_id?: string;
  report_name: string;
  generated_at: string;
  row_count: number;
  rows: ReportRow[];
}

// ============================================================================
// Phase 21: Merkle Audit Ledger & Regulatory Compliance Contracts
// ============================================================================

export interface MerkleAuditBlock extends AuditChainBlock {
  merkle_root?: string;
  mutation_count?: number;
}

export type GdprErasureStatus = 'PENDING' | 'PROCESSED' | 'REJECTED';

export interface GdprErasureRequest {
  id: string;
  tenant_id: string;
  subject_id: string;
  subject_type: string;
  requested_by_user_id: string;
  dpo_approved_by?: string | null;
  status: GdprErasureStatus;
  pii_fields: string[];
  records_affected_count: number;
  erasure_hash: string;
  requested_at: string;
  processed_at?: string | null;
  notes?: string | null;
}

export interface SegregationOfDutiesRule {
  id: string;
  name: string;
  action_a: string;
  action_b: string;
  description: string;
}

export interface SodEvaluationResult {
  allowed: boolean;
  actor_id: string;
  requested_action: string;
  conflicting_actions: string[];
  violation_reason?: string | null;
}

export type ComplianceStandard = 'GDPR' | 'SOX' | 'ISO27001';

export interface ComplianceReportQuery {
  standard: ComplianceStandard;
  from_date: string;
  to_date: string;
  actor_user_id?: string;
  entity_type?: string;
}

export interface ComplianceReportExport {
  standard: ComplianceStandard;
  generated_at: string;
  total_records: number;
  tamper_check_passed: boolean;
  summary: Record<string, unknown>;
  records: Record<string, unknown>[];
}

