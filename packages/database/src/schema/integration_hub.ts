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

// 1. Tenant-Owned Integration Instances
export const integration_instances = pgTable(
  'integration_instances',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    connector_code: text('connector_code').notNull(),
    status: text('status').notNull().default('DRAFT'), // DRAFT, CONFIGURED, VALIDATING, ACTIVE, SUSPENDED, DISCONNECTED
    company_id: text('company_id'),
    branch_id: text('branch_id'),
    config_json: text('config_json').notNull().default('{}'),
    credential_id: text('credential_id'),
    last_sync_at: timestamp('last_sync_at', { withTimezone: true }),
    last_health_check_at: timestamp('last_health_check_at', { withTimezone: true }),
    is_healthy: boolean('is_healthy').notNull().default(true),
    health_message: text('health_message'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_int_instance_tenant_status').on(table.tenant_id, table.status),
    index('idx_int_instance_tenant_connector').on(table.tenant_id, table.connector_code),
  ],
);

// 2. Scoped Developer API Keys
export const developer_api_keys = pgTable(
  'developer_api_keys',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key_prefix: text('key_prefix').notNull(),
    masked_key: text('masked_key').notNull(),
    key_hash: text('key_hash').notNull(), // SHA-256 hash of plaintext secret
    scopes_json: text('scopes_json').notNull().default('[]'),
    rate_limit_per_minute: integer('rate_limit_per_minute').notNull().default(60),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    is_active: boolean('is_active').notNull().default(true),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_api_keys_hash').on(table.key_hash),
    index('idx_api_keys_tenant_active').on(table.tenant_id, table.is_active),
  ],
);

// 3. Integration Credential References (Zero Plaintext Secrets)
export const integration_credentials = pgTable(
  'integration_credentials',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    integration_instance_id: text('integration_instance_id').notNull().references(() => integration_instances.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    masked_secret: text('masked_secret').notNull(),
    secret_hash: text('secret_hash').notNull(),
    encrypted_secret: text('encrypted_secret'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    last_rotated_at: timestamp('last_rotated_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_int_cred_tenant_instance').on(table.tenant_id, table.integration_instance_id),
  ],
);

// 4. External Identity Mappings (Cross-System ID Map)
export const integration_entity_mappings = pgTable(
  'integration_entity_mappings',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    integration_instance_id: text('integration_instance_id').notNull().references(() => integration_instances.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(), // ORDER, CUSTOMER, PRODUCT, PAYMENT, SHIPMENT, JOURNAL_ENTRY
    external_id: text('external_id').notNull(),
    internal_id: text('internal_id').notNull(),
    sync_status: text('sync_status').notNull().default('SYNCED'),
    metadata_json: text('metadata_json'),
    last_synced_at: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_entity_mapping_unique').on(table.tenant_id, table.integration_instance_id, table.entity_type, table.external_id),
    index('idx_entity_mapping_internal').on(table.tenant_id, table.entity_type, table.internal_id),
  ],
);

// 5. Configurable Field Mappings
export const integration_field_mappings = pgTable(
  'integration_field_mappings',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    integration_instance_id: text('integration_instance_id').notNull().references(() => integration_instances.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    source_field: text('source_field').notNull(),
    target_field: text('target_field').notNull(),
    transform_type: text('transform_type').notNull().default('DIRECT'),
    transform_config_json: text('transform_config_json'),
    is_required: boolean('is_required').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_field_mapping_tenant_instance').on(table.tenant_id, table.integration_instance_id, table.entity_type),
  ],
);

// 6. Traceable Sync Runs & Cursors
export const integration_sync_runs = pgTable(
  'integration_sync_runs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    integration_instance_id: text('integration_instance_id').notNull().references(() => integration_instances.id, { onDelete: 'cascade' }),
    direction: text('direction').notNull().default('IMPORT'), // IMPORT, EXPORT, BIDIRECTIONAL
    status: text('status').notNull().default('RUNNING'), // PENDING, RUNNING, COMPLETED, PARTIALLY_FAILED, FAILED
    records_processed: integer('records_processed').notNull().default(0),
    records_accepted: integer('records_accepted').notNull().default(0),
    records_rejected: integer('records_rejected').notNull().default(0),
    records_skipped: integer('records_skipped').notNull().default(0),
    cursor_checkpoint: text('cursor_checkpoint'),
    error_message: text('error_message'),
    started_at: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_sync_runs_tenant_instance').on(table.tenant_id, table.integration_instance_id, table.status),
  ],
);

// 7. Deduplicated Inbound Webhook Receipts
export const inbound_webhook_receipts = pgTable(
  'inbound_webhook_receipts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    integration_instance_id: text('integration_instance_id'),
    provider: text('provider').notNull(),
    provider_event_id: text('provider_event_id').notNull(),
    event_type: text('event_type').notNull(),
    payload_hash: text('payload_hash').notNull(),
    status: text('status').notNull().default('RECEIVED'), // RECEIVED, PROCESSING, PROCESSED, DUPLICATE_IGNORED, REJECTED, FAILED
    error_message: text('error_message'),
    received_at: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processed_at: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_inbound_wh_dedup').on(table.tenant_id, table.provider, table.provider_event_id),
    index('idx_inbound_wh_tenant_status').on(table.tenant_id, table.status),
  ],
);

// 8. Reconciliation Records
export const integration_reconciliations = pgTable(
  'integration_reconciliations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    integration_instance_id: text('integration_instance_id').notNull().references(() => integration_instances.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    external_id: text('external_id').notNull(),
    internal_id: text('internal_id').notNull(),
    status: text('status').notNull().default('MATCHED'), // MATCHED, DISCREPANCY_DETECTED, RESOLVED
    discrepancy_details_json: text('discrepancy_details_json'),
    checked_at: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_reconciliation_tenant_instance').on(table.tenant_id, table.integration_instance_id, table.status),
  ],
);

// 9. Integration Audit Trail
export const integration_audit_logs = pgTable(
  'integration_audit_logs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    actor_id: text('actor_id'),
    details_json: text('details_json'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_int_audit_tenant_time').on(table.tenant_id, table.created_at),
  ],
);
