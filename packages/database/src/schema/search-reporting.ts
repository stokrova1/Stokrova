import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const search_index_entries = pgTable(
  'search_index_entries',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    primary_text: text('primary_text').notNull(),
    secondary_text: text('secondary_text'),
    barcode: text('barcode'),
    sku: text('sku'),
    reference_number: text('reference_number'),
    metadata_json: text('metadata_json'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_search_tenant_entity').on(table.tenant_id, table.entity_type),
    index('idx_search_tenant_barcode').on(table.tenant_id, table.barcode),
    index('idx_search_tenant_sku').on(table.tenant_id, table.sku),
    index('idx_search_tenant_ref').on(table.tenant_id, table.reference_number),
  ],
);

export const audit_chain_blocks = pgTable(
  'audit_chain_blocks',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    block_index: integer('block_index').notNull(),
    actor_id: text('actor_id').notNull(),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    resource_id: text('resource_id').notNull(),
    payload_hash: text('payload_hash').notNull(),
    previous_hash: text('previous_hash').notNull(),
    current_hash: text('current_hash').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_audit_chain_tenant_index').on(table.tenant_id, table.block_index),
    index('idx_audit_chain_tenant_created').on(table.tenant_id, table.created_at),
  ],
);

export const data_export_jobs = pgTable(
  'data_export_jobs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    format: text('format').notNull().default('CSV'),
    status: text('status').notNull().default('PENDING'),
    row_count: integer('row_count').notNull().default(0),
    download_token: text('download_token').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_export_tenant_status').on(table.tenant_id, table.status),
    uniqueIndex('idx_export_download_token').on(table.download_token),
  ],
);

export const custom_report_definitions = pgTable(
  'custom_report_definitions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    metrics_json: text('metrics_json').notNull(),
    dimensions_json: text('dimensions_json').notNull(),
    filters_json: text('filters_json'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_report_def_tenant').on(table.tenant_id, table.name),
  ],
);

export const gdpr_erasure_requests = pgTable(
  'gdpr_erasure_requests',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    subject_id: text('subject_id').notNull(),
    subject_type: text('subject_type').notNull().default('CUSTOMER'),
    requested_by_user_id: text('requested_by_user_id').notNull(),
    dpo_approved_by: text('dpo_approved_by'),
    status: text('status').notNull().default('PENDING'),
    pii_fields_json: text('pii_fields_json').notNull(),
    records_affected_count: integer('records_affected_count').notNull().default(0),
    erasure_hash: text('erasure_hash').notNull(),
    requested_at: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    notes: text('notes'),
  },
  (table) => [
    index('idx_gdpr_tenant_subject').on(table.tenant_id, table.subject_id),
    index('idx_gdpr_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const compliance_audit_logs = pgTable(
  'compliance_audit_logs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    standard: text('standard').notNull(), // GDPR, SOX, ISO27001
    actor_id: text('actor_id').notNull(),
    event_type: text('event_type').notNull(),
    target_resource: text('target_resource').notNull(),
    target_id: text('target_id').notNull(),
    verification_hash: text('verification_hash').notNull(),
    details_json: text('details_json'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_compliance_tenant_standard').on(table.tenant_id, table.standard),
    index('idx_compliance_tenant_created').on(table.tenant_id, table.created_at),
  ],
);

