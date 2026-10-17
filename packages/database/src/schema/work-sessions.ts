import { pgTable, text, timestamp, integer, bigint, index, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const daily_work_sessions = pgTable(
  'daily_work_sessions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id').notNull(),
    business_role: text('business_role').notNull().default('OPERATOR'),
    warehouse_id: text('warehouse_id'),
    session_date: text('session_date').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    started_at: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    ended_at: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    duration_seconds: integer('duration_seconds').notNull().default(0),
    idempotency_key: text('idempotency_key').notNull(),
    offline_origin: boolean('offline_origin').notNull().default(false),
    synced_at: timestamp('synced_at', { withTimezone: true, mode: 'string' }),
    total_sales_minor: bigint('total_sales_minor', { mode: 'number' }).notNull().default(0),
    total_cogs_minor: bigint('total_cogs_minor', { mode: 'number' }),
    total_profit_minor: bigint('total_profit_minor', { mode: 'number' }),
    margin_basis_points: integer('margin_basis_points'),
    cash_minor: bigint('cash_minor', { mode: 'number' }).notNull().default(0),
    transfer_minor: bigint('transfer_minor', { mode: 'number' }).notNull().default(0),
    items_handled: integer('items_handled').notNull().default(0),
    transactions_count: integer('transactions_count').notNull().default(0),
    tickets_written: integer('tickets_written').notNull().default(0),
    tickets_picked: integer('tickets_picked').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_daily_work_sessions_idempotency').on(t.tenant_id, t.idempotency_key),
    index('idx_daily_work_sessions_user_date').on(t.tenant_id, t.user_id, t.session_date),
    index('idx_daily_work_sessions_tenant_status').on(t.tenant_id, t.status),
  ],
);
