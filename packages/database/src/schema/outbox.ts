import { pgTable, text, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const outbox_events = pgTable(
  'outbox_events',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    event_id: text('event_id').notNull(),
    event_type: text('event_type').notNull(),
    aggregate_type: text('aggregate_type').notNull(),
    aggregate_id: text('aggregate_id').notNull(),
    operation_id: text('operation_id'),
    payload: jsonb('payload').notNull(),
    metadata: jsonb('metadata'),
    status: text('status').notNull().default('PENDING'), // PENDING, PUBLISHED, FAILED
    attempts: integer('attempts').notNull().default(0),
    last_error: text('last_error'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    published_at: timestamp('published_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_outbox_event_id').on(table.event_id),
    index('idx_outbox_tenant_status').on(table.tenant_id, table.status, table.occurred_at),
    index('idx_outbox_aggregate').on(table.tenant_id, table.aggregate_type, table.aggregate_id),
  ],
);
