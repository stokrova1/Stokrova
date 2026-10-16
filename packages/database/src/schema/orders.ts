import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, branches } from './tenants.js';
import { warehouses } from './warehouse.js';
import { product_variants } from './catalog.js';
import { pos_registers, pos_sessions } from './pos.js';
import { customers } from './customers.js';
import { quotations } from './quotations.js';

export const sales_orders = pgTable(
  'sales_orders',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    order_number: text('order_number').notNull(),
    channel_type: text('channel_type').notNull(), // POS, ECOMMERCE, B2B_WHOLESALE, MANUAL
    branch_id: text('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    customer_id: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    quotation_id: text('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
    customer_name: text('customer_name'),
    customer_email: text('customer_email'),
    customer_phone: text('customer_phone'),
    shipping_address: text('shipping_address'),
    billing_address: text('billing_address'),
    currency_code: text('currency_code').notNull().default('USD'),
    status: text('status').notNull().default('DRAFT'), // DRAFT, CONFIRMED, RESERVED, PICKING, PACKING, DISPATCHED, DELIVERED, CANCELLED
    payment_status: text('payment_status').notNull().default('UNPAID'), // UNPAID, PARTIALLY_PAID, PAID, REFUNDED
    fulfillment_status: text('fulfillment_status').notNull().default('UNFULFILLED'), // UNFULFILLED, PARTIALLY_FULFILLED, FULFILLED
    pos_session_id: text('pos_session_id').references(() => pos_sessions.id, { onDelete: 'set null' }),
    pos_register_id: text('pos_register_id').references(() => pos_registers.id, { onDelete: 'set null' }),
    subtotal_minor: bigint('subtotal_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_discount_minor: bigint('total_discount_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_tax_minor: bigint('total_tax_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    grand_total_minor: bigint('grand_total_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    amount_paid_minor: bigint('amount_paid_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    confirmed_at: timestamp('confirmed_at', { withTimezone: true }),
    dispatched_at: timestamp('dispatched_at', { withTimezone: true }),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_sales_orders_tenant_number').on(table.tenant_id, table.order_number),
    index('idx_sales_orders_tenant_channel').on(table.tenant_id, table.channel_type),
    index('idx_sales_orders_status').on(table.status),
  ],
);

export const sales_order_lines = pgTable(
  'sales_order_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    order_id: text('order_id').notNull().references(() => sales_orders.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    sku: text('sku').notNull(),
    product_name: text('product_name').notNull(),
    quantity: integer('quantity').notNull(),
    fulfilled_quantity: integer('fulfilled_quantity').notNull().default(0),
    unit_price_minor: bigint('unit_price_minor', { mode: 'bigint' }).notNull(),
    discount_minor: bigint('discount_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    tax_minor: bigint('tax_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    line_total_minor: bigint('line_total_minor', { mode: 'bigint' }).notNull(),
    // Historical cost of goods for this line in minor units; null when unknown so margin is never invented.
    cogs_minor: bigint('cogs_minor', { mode: 'bigint' }),
  },
  (table) => [
    index('idx_sales_order_lines_order').on(table.order_id),
    index('idx_sales_order_lines_variant').on(table.variant_id),
  ],
);
