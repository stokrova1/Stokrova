import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

// ----------------------------------------------------------------------------
// 1. Report Definitions (System & Custom Registry)
// ----------------------------------------------------------------------------

export const report_definitions = pgTable(
  'report_definitions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(), // SALES, INVENTORY, FINANCE, PROCUREMENT, MANUFACTURING, LOGISTICS, CRM, OPERATIONS
    description: text('description'),
    query_template: jsonb('query_template').notNull(),
    is_system: boolean('is_system').notNull().default(false),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_report_defs_tenant_code').on(table.tenant_id, table.code),
    index('idx_report_defs_tenant_cat').on(table.tenant_id, table.category),
    index('idx_report_defs_tenant_active').on(table.tenant_id, table.is_active),
  ],
);

// ----------------------------------------------------------------------------
// 2. Saved Reports (User & Shared Versioned Queries)
// ----------------------------------------------------------------------------

export const saved_reports = pgTable(
  'saved_reports',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    version: integer('version').notNull().default(1),
    query: jsonb('query').notNull(),
    sharing_scope: text('sharing_scope').notNull().default('PRIVATE'), // PRIVATE, TENANT_SHARED, ROLE_SCOPED
    allowed_roles: jsonb('allowed_roles').notNull().default('[]'),
    created_by: text('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_saved_reports_tenant').on(table.tenant_id),
    index('idx_saved_reports_tenant_creator').on(table.tenant_id, table.created_by),
    index('idx_saved_reports_tenant_scope').on(table.tenant_id, table.sharing_scope),
  ],
);

// ----------------------------------------------------------------------------
// 3. Report Schedules (Automated Scheduled Execution)
// ----------------------------------------------------------------------------

export const report_schedules = pgTable(
  'report_schedules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    saved_report_id: text('saved_report_id').notNull().references(() => saved_reports.id, { onDelete: 'cascade' }),
    schedule_name: text('schedule_name').notNull(),
    cron_expression: text('cron_expression').notNull(),
    export_format: text('export_format').notNull().default('CSV'), // CSV, JSONL
    recipients: jsonb('recipients').notNull().default('[]'),
    is_active: boolean('is_active').notNull().default(true),
    last_run_at: timestamp('last_run_at', { withTimezone: true }),
    last_run_status: text('last_run_status'), // SUCCESS, FAILED
    next_run_at: timestamp('next_run_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_report_schedules_tenant').on(table.tenant_id),
    index('idx_report_schedules_active_next').on(table.tenant_id, table.is_active, table.next_run_at),
  ],
);

// ----------------------------------------------------------------------------
// 4. Report Execution Logs (Append-Only Audit Trail)
// ----------------------------------------------------------------------------

export const report_execution_logs = pgTable(
  'report_execution_logs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    report_id: text('report_id'),
    schedule_id: text('schedule_id'),
    triggered_by: text('triggered_by').notNull(),
    execution_type: text('execution_type').notNull(), // AD_HOC, SCHEDULED, DASHBOARD, EXPORT
    status: text('status').notNull(), // SUCCESS, FAILED
    row_count: integer('row_count').notNull().default(0),
    duration_ms: integer('duration_ms').notNull().default(0),
    export_token: text('export_token'),
    error_message: text('error_message'),
    executed_at: timestamp('executed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_report_exec_logs_tenant').on(table.tenant_id),
    index('idx_report_exec_logs_executed_at').on(table.tenant_id, table.executed_at),
    index('idx_report_exec_logs_report').on(table.tenant_id, table.report_id),
  ],
);

// ----------------------------------------------------------------------------
// 5. Analytics Dashboards (Multi-Widget Layouts)
// ----------------------------------------------------------------------------

export const analytics_dashboards = pgTable(
  'analytics_dashboards',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    dashboard_family: text('dashboard_family').notNull(), // EXECUTIVE, INVENTORY, SALES, FINANCE, LOGISTICS, CUSTOM
    is_default: boolean('is_default').notNull().default(false),
    widgets: jsonb('widgets').notNull().default('[]'),
    created_by: text('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_analytics_dashboards_tenant').on(table.tenant_id),
    index('idx_analytics_dashboards_family').on(table.tenant_id, table.dashboard_family),
  ],
);

// ----------------------------------------------------------------------------
// 6. Reporting Projections (Incremental Materialized Snapshots)
// ----------------------------------------------------------------------------

export const reporting_projections = pgTable(
  'reporting_projections',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    projection_key: text('projection_key').notNull(),
    period_date: text('period_date').notNull(), // YYYY-MM-DD
    dimension_values: jsonb('dimension_values').notNull().default('{}'),
    metrics: jsonb('metrics').notNull().default('{}'),
    last_event_id: text('last_event_id').notNull(),
    version: integer('version').notNull().default(1),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_rep_proj_unique_key').on(
      table.tenant_id,
      table.projection_key,
      table.period_date,
    ),
    index('idx_rep_proj_tenant_key').on(table.tenant_id, table.projection_key),
  ],
);
