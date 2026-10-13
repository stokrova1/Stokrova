import {
  pgTable,
  text,
  timestamp,
  boolean,
  bigint,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, branches } from './tenants.js';
import { users } from './users.js';
import { warehouses } from './warehouse.js';
import { price_lists } from './pricing.js';
import { work_centers } from './work_centers.js';

export const pos_registers = pgTable(
  'pos_registers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    work_center_id: text('work_center_id').references(() => work_centers.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    default_price_list_id: text('default_price_list_id').references(() => price_lists.id, { onDelete: 'set null' }),
    blind_closing_enabled: boolean('blind_closing_enabled').notNull().default(true),
    max_cash_limit_minor: bigint('max_cash_limit_minor', { mode: 'bigint' }).notNull().default(sql`1000000`),
    max_allowed_variance_minor: bigint('max_allowed_variance_minor', { mode: 'bigint' }).notNull().default(sql`1000`),
    receipt_header: text('receipt_header'),
    receipt_footer: text('receipt_footer'),
    open_cash_drawer_on_sale: boolean('open_cash_drawer_on_sale').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_pos_registers_tenant_code').on(table.tenant_id, table.code),
    index('idx_pos_registers_tenant_branch').on(table.tenant_id, table.branch_id),
  ],
);

export const pos_sessions = pgTable(
  'pos_sessions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    register_id: text('register_id').notNull().references(() => pos_registers.id, { onDelete: 'cascade' }),
    cashier_user_id: text('cashier_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('OPEN'), // OPEN, SUSPENDED, CLOSING, CLOSED, RECONCILED
    opening_float_minor: bigint('opening_float_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    opening_denominations: jsonb('opening_denominations'),
    closing_expected_minor: bigint('closing_expected_minor', { mode: 'bigint' }),
    closing_actual_minor: bigint('closing_actual_minor', { mode: 'bigint' }),
    closing_denominations: jsonb('closing_denominations'),
    variance_minor: bigint('variance_minor', { mode: 'bigint' }),
    variance_category: text('variance_category'), // BALANCED, SURPLUS, DEFICIT
    supervisor_user_id: text('supervisor_user_id').references(() => users.id, { onDelete: 'set null' }),
    supervisor_override_reason: text('supervisor_override_reason'),
    notes: text('notes'),
    opened_at: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closed_at: timestamp('closed_at', { withTimezone: true }),
    reconciled_at: timestamp('reconciled_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_pos_sessions_tenant_register').on(table.tenant_id, table.register_id),
    index('idx_pos_sessions_status').on(table.status),
  ],
);

export const pos_cash_movements = pgTable(
  'pos_cash_movements',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: text('session_id').notNull().references(() => pos_sessions.id, { onDelete: 'cascade' }),
    movement_type: text('movement_type').notNull(), // OPENING_FLOAT, CASH_SALE, CASH_REFUND, CASH_IN, CASH_OUT, CASH_DROP
    amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency_code: text('currency_code').notNull().default('USD'),
    drawer_balance_after_minor: bigint('drawer_balance_after_minor', { mode: 'bigint' }).notNull(),
    source_type: text('source_type'),
    source_id: text('source_id'),
    reason: text('reason'),
    safe_drop_envelope: text('safe_drop_envelope'),
    authorized_by_user_id: text('authorized_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    performed_by_user_id: text('performed_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pos_cash_movements_tenant_session').on(table.tenant_id, table.session_id),
  ],
);
