import { pgTable, text, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const idempotency_records = pgTable(
  'idempotency_records',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    idempotency_key: text('idempotency_key').notNull(),
    request_path: text('request_path').notNull(),
    request_method: text('request_method').notNull(),
    request_hash: text('request_hash').notNull(), // SHA-256 hash of normalized payload
    status: text('status').notNull().default('PENDING'), // PENDING, RESOLVED, REJECTED
    response_code: integer('response_code'),
    response_body: jsonb('response_body'),
    locked_until: timestamp('locked_until', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_idempotency_tenant_key').on(table.tenant_id, table.idempotency_key),
    index('idx_idempotency_tenant_status').on(table.tenant_id, table.status),
    index('idx_idempotency_locked_until').on(table.locked_until),
  ],
);
