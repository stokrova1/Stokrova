import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const audit_events = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    actor_user_id: text('actor_user_id'),
    device_id: text('device_id'),
    action: text('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    request_id: text('request_id'),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('idx_audit_tenant_occurred').on(table.tenant_id, table.occurred_at),
    index('idx_audit_tenant_entity').on(table.tenant_id, table.entity_type, table.entity_id),
  ],
);

export const security_events = pgTable(
  'security_events',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id'),
    event_type: text('event_type').notNull(), // AUTH_FAILURE, CROSS_TENANT_ATTEMPT, DEVICE_REVOKED
    severity: text('severity').notNull().default('INFO'), // INFO, WARN, CRITICAL
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    details: jsonb('details'),
  },
  (table) => [
    index('idx_security_occurred').on(table.occurred_at),
    index('idx_security_type').on(table.event_type),
  ],
);
