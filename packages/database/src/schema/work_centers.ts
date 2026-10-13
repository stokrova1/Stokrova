import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, bigint, index } from 'drizzle-orm/pg-core';
import { tenants, branches } from './tenants.js';
import { users } from './users.js';

export const work_centers = pgTable(
  'work_centers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(), // SALES, PICKING, VERIFICATION, PACKING, PAYMENT, DISPATCH
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_work_centers_tenant_branch').on(table.tenant_id, table.branch_id),
  ],
);

export const registers = pgTable(
  'registers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    work_center_id: text('work_center_id').references(() => work_centers.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, INACTIVE
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_registers_tenant_branch').on(table.tenant_id, table.branch_id),
  ],
);

export const register_sessions = pgTable(
  'register_sessions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    register_id: text('register_id').notNull().references(() => registers.id, { onDelete: 'cascade' }),
    opened_by_user_id: text('opened_by_user_id').notNull().references(() => users.id),
    closed_by_user_id: text('closed_by_user_id').references(() => users.id),
    opening_float_minor: bigint('opening_float_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    closing_expected_minor: bigint('closing_expected_minor', { mode: 'bigint' }),
    closing_actual_minor: bigint('closing_actual_minor', { mode: 'bigint' }),
    variance_minor: bigint('variance_minor', { mode: 'bigint' }), // closing_actual - closing_expected
    status: text('status').notNull().default('OPEN'), // OPEN, CLOSED, RECONCILED
    opened_at: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closed_at: timestamp('closed_at', { withTimezone: true }),
    notes: text('notes'),
  },
  (table) => [
    index('idx_reg_sessions_tenant_reg').on(table.tenant_id, table.register_id),
    index('idx_reg_sessions_status').on(table.status),
  ],
);

export const cash_movements = pgTable(
  'cash_movements',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    register_session_id: text('register_session_id').notNull().references(() => register_sessions.id, { onDelete: 'cascade' }),
    movement_type: text('movement_type').notNull(), // OPENING_FLOAT, CASH_SALE, CASH_REFUND, CASH_IN, CASH_OUT
    amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency_code: text('currency_code').notNull().default('NGN'),
    source_type: text('source_type'), // SALE, REFUND, MANUAL_DROP, FLOAT_ADJUSTMENT
    source_id: text('source_id'),
    reason: text('reason'),
    created_by_user_id: text('created_by_user_id').notNull().references(() => users.id),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cash_mov_session').on(table.register_session_id),
  ],
);
