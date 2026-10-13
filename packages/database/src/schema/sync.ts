import { pgTable, text, timestamp, jsonb, bigserial, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { devices } from './devices.js';

export const sync_operations = pgTable(
  'sync_operations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    device_id: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
    operation_id: text('operation_id').notNull(),
    command_type: text('command_type').notNull(),
    entity_id: text('entity_id').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').notNull(), // APPLIED, ALREADY_APPLIED, REJECTED, CONFLICT, RETRY
    error_code: text('error_code'),
    error_message: text('error_message'),
    schema_version: integer('schema_version').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    processed_at: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_sync_ops_tenant_op_id').on(table.tenant_id, table.operation_id),
    index('idx_sync_ops_tenant_device_status').on(table.tenant_id, table.device_id, table.status),
  ],
);

export const sync_changes = pgTable(
  'sync_changes',
  {
    sequence: bigserial('sequence', { mode: 'number' }).primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    operation: text('operation').notNull(), // INSERT, UPDATE, DELETE, EVENT
    payload: jsonb('payload').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sync_changes_tenant_seq').on(table.tenant_id, table.sequence),
  ],
);
