import { z } from 'zod';

// ==========================================
// 1. Metric Dictionary Schemas
// ==========================================

export const MetricCategorySchema = z.enum([
  'SALES',
  'INVENTORY',
  'FINANCE',
  'PROCUREMENT',
  'MANUFACTURING',
  'LOGISTICS',
  'CRM',
  'OPERATIONS',
]);

export const MetricAggregationTypeSchema = z.enum([
  'SUM',
  'COUNT',
  'AVERAGE',
  'RATIO',
  'MIN',
  'MAX',
]);

export const MetricDataTypeSchema = z.enum([
  'CURRENCY_MINOR',
  'QUANTITY_INTEGER',
  'BASIS_POINTS',
  'COUNT',
  'DURATION_SECONDS',
]);

export const MetricValueProvenanceSchema = z.enum([
  'ACTUAL',
  'ESTIMATED',
  'FORECAST',
  'DERIVED',
]);

export const MetricDefinitionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  category: MetricCategorySchema,
  description: z.string().max(1000),
  owner_domain: z.string().min(1).max(100),
  source_service: z.string().min(1).max(100),
  data_type: MetricDataTypeSchema,
  aggregation_type: MetricAggregationTypeSchema,
  provenance: MetricValueProvenanceSchema,
  inclusion_rules: z.string().max(1000),
  exclusion_rules: z.string().max(1000),
  required_permission: z.string().min(1).max(100),
  is_currency_sensitive: z.boolean(),
  version: z.number().int().min(1),
});

// ==========================================
// 2. Safe Declarative Query Model Schemas
// ==========================================

export const ReportFilterOperatorSchema = z.enum([
  'EQ',
  'NEQ',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IN',
  'BETWEEN',
]);

export const ReportFilterSchema = z.object({
  field: z.string().min(1).max(100),
  operator: ReportFilterOperatorSchema,
  value: z.unknown(),
});

export const ReportQueryDefinitionSchema = z.object({
  source: z.string().min(1).max(100),
  metrics: z.array(z.string().min(1).max(100)).min(1),
  dimensions: z.array(z.string().min(1).max(100)),
  filters: z.array(ReportFilterSchema).optional(),
  start_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  end_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  currency_code: z.string().min(3).max(3).optional(),
  limit: z.number().int().min(1).max(10000).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  order_by: z.string().min(1).max(100).optional(),
  order_direction: z.enum(['ASC', 'DESC']).optional().default('ASC'),
});

// ==========================================
// 3. Saved Reports & Report Definitions
// ==========================================

export const ReportSharingScopeSchema = z.enum([
  'PRIVATE',
  'ORGANIZATION',
  'SPECIFIC_ROLES',
]);

export const CreateReportDefinitionSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  category: MetricCategorySchema,
  query_definition: ReportQueryDefinitionSchema,
  required_permission: z.string().min(1).max(100).optional().nullable(),
  is_system: z.boolean().optional().default(false),
});

export const UpdateReportDefinitionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  category: MetricCategorySchema.optional(),
  query_definition: ReportQueryDefinitionSchema.optional(),
  required_permission: z.string().min(1).max(100).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const CreateSavedReportSchema = z.object({
  report_definition_id: z.string().min(1).optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  query_definition: ReportQueryDefinitionSchema,
  sharing_scope: ReportSharingScopeSchema.default('PRIVATE'),
  shared_roles: z.array(z.string()).optional().default([]),
});

export const UpdateSavedReportSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  query_definition: ReportQueryDefinitionSchema.optional(),
  sharing_scope: ReportSharingScopeSchema.optional(),
  shared_roles: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const ExecuteReportQuerySchema = z.object({
  saved_report_id: z.string().min(1).optional(),
  query_override: ReportQueryDefinitionSchema.optional(),
  page: z.number().int().min(1).optional().default(1),
  page_size: z.number().int().min(1).max(1000).optional().default(50),
});

// ==========================================
// 4. Dashboards & Widgets
// ==========================================

export const DashboardWidgetTypeSchema = z.enum([
  'KPI_CARD',
  'LINE_CHART',
  'BAR_CHART',
  'PIE_CHART',
  'DATA_TABLE',
  'HEATMAP',
]);

export const DashboardWidgetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(255),
  widget_type: DashboardWidgetTypeSchema,
  metric_id: z.string().min(1).max(100),
  query_definition: ReportQueryDefinitionSchema,
  grid_position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(12),
  }),
  refresh_interval_seconds: z.number().int().min(10).optional().default(300),
});

export const CreateAnalyticsDashboardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  is_default: z.boolean().optional().default(false),
  sharing_scope: ReportSharingScopeSchema.default('PRIVATE'),
  shared_roles: z.array(z.string()).optional().default([]),
  widgets: z.array(DashboardWidgetSchema).optional().default([]),
  layout_config: z.record(z.unknown()).optional().default({}),
});

export const UpdateAnalyticsDashboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  is_default: z.boolean().optional(),
  sharing_scope: ReportSharingScopeSchema.optional(),
  shared_roles: z.array(z.string()).optional(),
  widgets: z.array(DashboardWidgetSchema).optional(),
  layout_config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

// ==========================================
// 5. Schedules & Export
// ==========================================

export const ScheduleCadenceSchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'CRON',
]);

export const ScheduleDeliveryChannelSchema = z.enum([
  'EMAIL',
  'WEBHOOK',
  'STORAGE',
]);

export const ExportReportFormatSchema = z.enum([
  'CSV',
  'JSON',
  'EXCEL',
  'PDF',
]);

export const CreateReportScheduleSchema = z.object({
  saved_report_id: z.string().min(1),
  name: z.string().min(1).max(255),
  cadence: ScheduleCadenceSchema,
  cron_expression: z.string().max(100).optional().nullable(),
  delivery_channel: ScheduleDeliveryChannelSchema.default('EMAIL'),
  recipients: z.array(z.string().email().or(z.string().url())).min(1),
  export_format: ExportReportFormatSchema.default('CSV'),
  is_active: z.boolean().optional().default(true),
});

export const UpdateReportScheduleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  cadence: ScheduleCadenceSchema.optional(),
  cron_expression: z.string().max(100).optional().nullable(),
  delivery_channel: ScheduleDeliveryChannelSchema.optional(),
  recipients: z.array(z.string().email().or(z.string().url())).optional(),
  export_format: ExportReportFormatSchema.optional(),
  is_active: z.boolean().optional(),
});

export const ReportExportRequestSchema = z.object({
  saved_report_id: z.string().min(1).optional(),
  query_definition: ReportQueryDefinitionSchema.optional(),
  format: ExportReportFormatSchema.default('CSV'),
  file_name: z.string().max(255).optional(),
});

// ==========================================
// 6. Projections Rebuild
// ==========================================

export const RebuildProjectionSchema = z.object({
  projection_type: z.string().min(1).max(100),
  as_of_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  branch_id: z.string().optional().nullable(),
  dimension_key: z.string().optional().nullable(),
});
