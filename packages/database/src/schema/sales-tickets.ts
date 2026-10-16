import { pgTable, text, timestamp, integer, bigint, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/** Shop-counter order tickets (order taker -> picker -> cashier). */
export const sales_tickets = pgTable(
  'sales_tickets',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    status: text('status').notNull(),
    warehouse_id: text('warehouse_id').notNull(),
    customer_name: text('customer_name'),
    notes: text('notes'),
    lines: jsonb('lines').notNull(),
    written_by: text('written_by').notNull(),
    picked_by: text('picked_by'),
    paid_by: text('paid_by'),
    order_id: text('order_id'),
    receipt_number: text('receipt_number'),
    expires_at: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('idx_sales_tickets_tenant_code').on(t.tenant_id, t.code), index('idx_sales_tickets_tenant_status').on(t.tenant_id, t.status)],
);

/** One row per piece of work a staff member did; "My day" totals these. */
export const staff_work_events = pgTable(
  'staff_work_events',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id').notNull(),
    kind: text('kind').notNull(),
    reference: text('reference').notNull(),
    quantity: integer('quantity').notNull().default(0),
    amount_minor: bigint('amount_minor', { mode: 'number' }).notNull().default(0),
    cash_minor: bigint('cash_minor', { mode: 'number' }).notNull().default(0),
    transfer_minor: bigint('transfer_minor', { mode: 'number' }).notNull().default(0),
    /** The sales order a till sale created, so each seller's products and profit can be counted. */
    order_id: text('order_id'),
    occurred_at: timestamp('occurred_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('idx_staff_work_events_user_day').on(t.tenant_id, t.user_id, t.occurred_at)],
);

/** Every cost or selling price change: who changed it, from what, to what, and when. */
export const product_price_changes = pgTable(
  'product_price_changes',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull(),
    changed_by: text('changed_by').notNull(),
    old_cost_minor: bigint('old_cost_minor', { mode: 'number' }),
    new_cost_minor: bigint('new_cost_minor', { mode: 'number' }),
    old_selling_minor: bigint('old_selling_minor', { mode: 'number' }).notNull(),
    new_selling_minor: bigint('new_selling_minor', { mode: 'number' }).notNull(),
    changed_at: timestamp('changed_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('idx_product_price_changes_variant').on(t.tenant_id, t.variant_id, t.changed_at)],
);

/** Guided stock counts: what the system expected vs. what staff counted. */
export const stock_count_sessions = pgTable(
  'stock_count_sessions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull(),
    status: text('status').notNull(),
    started_by: text('started_by').notNull(),
    posted_by: text('posted_by'),
    lines: jsonb('lines').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    posted_at: timestamp('posted_at', { withTimezone: true, mode: 'string' }),
  },
  (t) => [index('idx_stock_count_sessions_tenant').on(t.tenant_id, t.status)],
);

/** Where and when each business receives its daily summary and alerts. */
export const alert_settings = pgTable('alert_settings', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email'),
  whatsapp: text('whatsapp'),
  send_hour: integer('send_hour').notNull().default(20),
  low_stock_at: integer('low_stock_at').notNull().default(5),
  expiry_days: integer('expiry_days').notNull().default(30),
  enabled: boolean('enabled').notNull().default(false),
  last_sent_day: text('last_sent_day'),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
