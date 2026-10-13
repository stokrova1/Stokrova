/**
 * STOKROVA Phase 11 — Enterprise Reporting, Analytics & Business Intelligence Contracts
 *
 * Provides typed specifications for:
 * - Centralized Metric Dictionary & Provenance Definitions
 * - Safe Declarative Report Queries & Execution Results
 * - Multi-Widget Dashboards & Layouts
 * - Versioned Saved Reports & Sharing Boundaries
 * - Automated Report Scheduling & Execution Audit Trails
 * - Analytical Projections & Incremental Snapshots
 * - Secure Data Export Jobs & Cell-Escaped Payloads
 */

// ----------------------------------------------------------------------------
// 1. Metric Dictionary Contracts
// ----------------------------------------------------------------------------

export type MetricCategory =
  | 'SALES'
  | 'INVENTORY'
  | 'FINANCE'
  | 'PROCUREMENT'
  | 'MANUFACTURING'
  | 'LOGISTICS'
  | 'CRM'
  | 'OPERATIONS';

export type MetricAggregationType =
  | 'SUM'
  | 'COUNT'
  | 'AVERAGE'
  | 'RATIO'
  | 'MIN'
  | 'MAX';

export type MetricDataType =
  | 'CURRENCY_MINOR'
  | 'QUANTITY_INTEGER'
  | 'BASIS_POINTS'
  | 'COUNT'
  | 'DURATION_SECONDS';

export type MetricValueProvenance =
  | 'ACTUAL'
  | 'ESTIMATED'
  | 'FORECAST'
  | 'DERIVED';

export interface MetricDefinition {
  id: string;
  name: string;
  category: MetricCategory;
  description: string;
  owner_domain: string;
  source_service: string;
  data_type: MetricDataType;
  aggregation_type: MetricAggregationType;
  provenance: MetricValueProvenance;
  inclusion_rules: string;
  exclusion_rules: string;
  required_permission: string;
  is_currency_sensitive: boolean;
  version: number;
}

export interface MetricDictionaryResponse {
  metrics: MetricDefinition[];
  total_count: number;
}

// ----------------------------------------------------------------------------
// 2. Safe Declarative Query Model Contracts
// ----------------------------------------------------------------------------

export type ReportFilterOperator =
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'BETWEEN';

export interface ReportFilter {
  field: string;
  operator: ReportFilterOperator;
  value: unknown;
}

export type StandardReportDimension =
  | 'BRANCH'
  | 'WAREHOUSE'
  | 'CHANNEL'
  | 'CATEGORY'
  | 'PRODUCT'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'CARRIER'
  | 'DATE_DAY'
  | 'DATE_MONTH'
  | 'DATE_YEAR';

export interface ReportQueryDefinition {
  source: string;
  metrics: string[];
  dimensions: string[];
  filters?: ReportFilter[];
  start_date?: string;
  end_date?: string;
  currency_code?: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
}

export interface ReportExecutionRow {
  dimensions: Record<string, string>;
  metrics: Record<string, string | number>;
}

export interface EnterpriseReportExecutionResult {
  report_id?: string;
  report_name: string;
  query_definition: ReportQueryDefinition;
  executed_at: string;
  row_count: number;
  total_rows: number;
  page: number;
  limit: number;
  rows: ReportExecutionRow[];
  freshness_timestamp: string;
  is_stale: boolean;
}

// ----------------------------------------------------------------------------
// 3. Dashboards & Configurable Widgets
// ----------------------------------------------------------------------------

export type DashboardFamily =
  | 'EXECUTIVE'
  | 'INVENTORY'
  | 'SALES'
  | 'FINANCE'
  | 'LOGISTICS'
  | 'CUSTOM';

export type DashboardWidgetType =
  | 'METRIC_CARD'
  | 'KPI_CARD'
  | 'BAR_CHART'
  | 'LINE_CHART'
  | 'TABLE'
  | 'DATA_TABLE'
  | 'DONUT_CHART'
  | 'PIE_CHART'
  | 'HEATMAP';

export interface DashboardWidget {
  id: string;
  title: string;
  widget_type: DashboardWidgetType;
  query?: ReportQueryDefinition;
  query_definition?: ReportQueryDefinition;
  metric_id?: string;
  grid_position?: { x: number; y: number; width: number; height: number };
  refresh_interval_seconds?: number;
  width?: number;
  height?: number;
  position_x?: number;
  position_y?: number;
}

export interface Dashboard {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  dashboard_family?: DashboardFamily;
  is_default: boolean;
  sharing_scope?: ReportSharingScope;
  shared_roles?: string[];
  widgets: DashboardWidget[];
  layout_config?: Record<string, unknown>;
  is_active?: boolean;
  version?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDashboardRequest {
  name: string;
  description?: string | null;
  dashboard_family?: DashboardFamily;
  is_default?: boolean;
  sharing_scope?: ReportSharingScope;
  shared_roles?: string[];
  widgets?: DashboardWidget[] | Omit<DashboardWidget, 'id'>[];
  layout_config?: Record<string, unknown>;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string | null;
  dashboard_family?: DashboardFamily;
  is_default?: boolean;
  sharing_scope?: ReportSharingScope;
  shared_roles?: string[];
  widgets?: DashboardWidget[];
  layout_config?: Record<string, unknown>;
  is_active?: boolean;
}

/// ----------------------------------------------------------------------------
// 4. Saved Reports & Versioning
// ----------------------------------------------------------------------------

export type ReportSharingScope =
  | 'PRIVATE'
  | 'TENANT_SHARED'
  | 'ROLE_SCOPED'
  | 'ORGANIZATION'
  | 'SPECIFIC_ROLES';

export interface ReportDefinition {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string | null;
  category: MetricCategory;
  query_definition: ReportQueryDefinition;
  required_permission?: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedReport {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  version: number;
  query: ReportQueryDefinition;
  query_definition?: ReportQueryDefinition;
  sharing_scope: ReportSharingScope;
  allowed_roles?: string[];
  shared_roles?: string[];
  report_definition_id?: string | null;
  is_active?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedReportRequest {
  name: string;
  description?: string | null;
  query?: ReportQueryDefinition;
  query_definition?: ReportQueryDefinition;
  report_definition_id?: string | null;
  sharing_scope: ReportSharingScope;
  allowed_roles?: string[];
  shared_roles?: string[];
}

export interface UpdateSavedReportRequest {
  name?: string;
  description?: string | null;
  query?: ReportQueryDefinition;
  query_definition?: ReportQueryDefinition;
  sharing_scope?: ReportSharingScope;
  allowed_roles?: string[];
  shared_roles?: string[];
  is_active?: boolean;
}

// ----------------------------------------------------------------------------
// 5. Automated Report Scheduling
// ----------------------------------------------------------------------------

export type ScheduleCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CRON';
export type ScheduleDeliveryChannel = 'EMAIL' | 'WEBHOOK' | 'STORAGE';
export type ExportReportFormat = 'CSV' | 'JSON' | 'JSONL' | 'EXCEL' | 'PDF';

export interface ReportSchedule {
  id: string;
  tenant_id: string;
  saved_report_id: string;
  schedule_name?: string;
  name?: string;
  cadence?: ScheduleCadence;
  cron_expression?: string | null;
  delivery_channel?: ScheduleDeliveryChannel;
  export_format: ExportReportFormat;
  recipients: string[];
  is_active: boolean;
  last_run_at?: string | null;
  last_run_status?: 'SUCCESS' | 'FAILED' | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReportScheduleRequest {
  saved_report_id: string;
  schedule_name?: string;
  name?: string;
  cadence?: ScheduleCadence;
  cron_expression?: string | null;
  delivery_channel?: ScheduleDeliveryChannel;
  export_format: ExportReportFormat;
  recipients: string[];
  is_active?: boolean;
}

export interface UpdateReportScheduleRequest {
  schedule_name?: string;
  name?: string;
  cadence?: ScheduleCadence;
  cron_expression?: string | null;
  delivery_channel?: ScheduleDeliveryChannel;
  export_format?: ExportReportFormat;
  recipients?: string[];
  is_active?: boolean;
}

export interface ScheduledExecutionRecord {
  id: string;
  schedule_id: string;
  tenant_id: string;
  saved_report_id?: string;
  triggered_by?: string;
  executed_at: string;
  status: 'SUCCESS' | 'FAILED';
  duration_ms?: number;
  row_count: number;
  export_format?: ExportReportFormat;
  recipient_count?: number;
  export_token?: string | null;
  error_message?: string | null;
}

export type ReportExecutionLog = ScheduledExecutionRecord;

// ----------------------------------------------------------------------------
// 6. Analytical Projections & Incremental Snapshots
// ----------------------------------------------------------------------------

export interface ReportingProjection {
  id: string;
  tenant_id: string;
  projection_key?: string;
  projection_type?: string;
  dimension_key?: string;
  period_date?: string;
  period_start?: string;
  period_end?: string;
  dimension_values?: Record<string, string>;
  metric_values?: Record<string, string | number>;
  metrics?: Record<string, string | number>;
  last_event_id?: string;
  version?: number;
  snapshot_version?: number;
  is_consistent?: boolean;
  updated_at: string;
}

export interface RebuildProjectionRequest {
  projection_key?: string;
  projection_type?: string;
  dimension_key?: string;
  start_date?: string;
  end_date?: string;
}

export interface ProjectionVariance {
  metric: string;
  projected: bigint;
  authoritative: bigint;
  variance: bigint;
}

export interface ProjectionReconciliationResult {
  is_consistent: boolean;
  drift_detected: boolean;
  differences: ProjectionVariance[];
  reconciled_at: string;
}

// ----------------------------------------------------------------------------
// 7. Secure Data Export Jobs
// ----------------------------------------------------------------------------

export interface CreateReportingExportRequest {
  report_name: string;
  query: ReportQueryDefinition;
  format: ExportReportFormat;
  max_rows?: number;
}

export interface ReportExportRequest {
  saved_report_id?: string;
  query_definition?: ReportQueryDefinition;
  format?: ExportReportFormat;
  file_name?: string;
}

export interface ReportExportResponse {
  file_name: string;
  format: string;
  content_type: string;
  data: string | Uint8Array;
  row_count: number;
  byte_size: number;
}

// Aliases for dashboard
export type AnalyticsDashboard = Dashboard;
export type CreateAnalyticsDashboardRequest = CreateDashboardRequest;
export type UpdateAnalyticsDashboardRequest = UpdateDashboardRequest;
