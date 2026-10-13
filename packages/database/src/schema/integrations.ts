import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const holding_groups = pgTable(
  'holding_groups',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    parent_company_id: text('parent_company_id').notNull(),
    subsidiary_company_ids: text('subsidiary_company_ids').notNull(), // JSON array
    consolidation_currency: text('consolidation_currency').notNull().default('USD'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_holding_tenant_code').on(table.tenant_id, table.code),
    index('idx_holding_tenant_parent').on(table.tenant_id, table.parent_company_id),
  ],
);

export const inter_company_transfers = pgTable(
  'inter_company_transfers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    transfer_number: text('transfer_number').notNull(),
    source_company_id: text('source_company_id').notNull(),
    source_warehouse_id: text('source_warehouse_id').notNull(),
    destination_company_id: text('destination_company_id').notNull(),
    destination_warehouse_id: text('destination_warehouse_id').notNull(),
    status: text('status').notNull().default('PROPOSED'), // PROPOSED, APPROVED, IN_TRANSIT, COMPLETED, CANCELLED
    total_amount_minor: text('total_amount_minor').notNull(),
    currency: text('currency').notNull().default('USD'),
    items_json: text('items_json').notNull(),
    source_sales_order_id: text('source_sales_order_id'),
    destination_purchase_order_id: text('destination_purchase_order_id'),
    source_journal_entry_id: text('source_journal_entry_id'),
    destination_journal_entry_id: text('destination_journal_entry_id'),
    elimination_journal_entry_id: text('elimination_journal_entry_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_ict_tenant_number').on(table.tenant_id, table.transfer_number),
    index('idx_ict_tenant_status').on(table.tenant_id, table.status),
    index('idx_ict_tenant_source_comp').on(table.tenant_id, table.source_company_id),
    index('idx_ict_tenant_dest_comp').on(table.tenant_id, table.destination_company_id),
  ],
);

export const webhook_subscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    target_url: text('target_url').notNull(),
    secret_token: text('secret_token').notNull(),
    event_types: text('event_types').notNull(), // JSON array
    is_active: boolean('is_active').notNull().default(true),
    retry_limit: integer('retry_limit').notNull().default(5),
    failure_count: integer('failure_count').notNull().default(0),
    circuit_breaker_tripped_at: timestamp('circuit_breaker_tripped_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_webhooks_tenant_active').on(table.tenant_id, table.is_active),
  ],
);

export const webhook_delivery_attempts = pgTable(
  'webhook_delivery_attempts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    subscription_id: text('subscription_id').notNull().references(() => webhook_subscriptions.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(),
    payload_json: text('payload_json').notNull(),
    signature_header: text('signature_header').notNull(),
    attempt_number: integer('attempt_number').notNull().default(1),
    status: text('status').notNull().default('PENDING'), // PENDING, SUCCESS, FAILED, RETRYING, DEAD_LETTER
    http_status_code: integer('http_status_code'),
    response_body: text('response_body'),
    error_message: text('error_message'),
    next_retry_at: timestamp('next_retry_at', { withTimezone: true }),
    duration_ms: integer('duration_ms'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_wh_delivery_sub').on(table.tenant_id, table.subscription_id),
    index('idx_wh_delivery_status').on(table.tenant_id, table.status),
  ],
);

export const webhook_dead_letters = pgTable(
  'webhook_dead_letters',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    subscription_id: text('subscription_id').notNull().references(() => webhook_subscriptions.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(),
    payload_json: text('payload_json').notNull(),
    total_attempts: integer('total_attempts').notNull().default(1),
    last_error: text('last_error').notNull(),
    replayed_at: timestamp('replayed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_wh_dead_letter_sub').on(table.tenant_id, table.subscription_id),
    index('idx_wh_dead_letter_time').on(table.tenant_id, table.created_at),
  ],
);

export const document_render_logs = pgTable(
  'document_render_logs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    document_type: text('document_type').notNull(), // INVOICE, RECEIPT, PACKING_SLIP, BILL_OF_LADING, DELIVERY_MANIFEST, PURCHASE_ORDER
    entity_id: text('entity_id').notNull(),
    format: text('format').notNull().default('HTML'), // HTML, PDF, JSON, TEXT_RECEIPT
    is_reprint: boolean('is_reprint').notNull().default(false),
    reprint_count: integer('reprint_count').notNull().default(0),
    rendered_by: text('rendered_by'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_doc_render_entity').on(table.tenant_id, table.document_type, table.entity_id),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id'),
    channel: text('channel').notNull(), // IN_APP, EMAIL, SMS, WEBHOOK
    severity: text('severity').notNull().default('INFO'), // INFO, SUCCESS, WARNING, CRITICAL
    title: text('title').notNull(),
    message: text('message').notNull(),
    metadata_json: text('metadata_json'),
    is_read: boolean('is_read').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_notifications_user_read').on(table.tenant_id, table.user_id, table.is_read),
  ],
);
