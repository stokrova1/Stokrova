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
import { tenants } from './tenants.js';
import { sales_orders } from './orders.js';
import { customers } from './customers.js';
import { product_variants } from './catalog.js';

export const sales_invoices = pgTable(
  'sales_invoices',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    invoice_number: text('invoice_number').notNull(),
    order_id: text('order_id').notNull().references(() => sales_orders.id, { onDelete: 'restrict' }),
    customer_id: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    customer_name: text('customer_name'),
    customer_email: text('customer_email'),
    customer_phone: text('customer_phone'),
    status: text('status').notNull().default('ISSUED'), // DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID, CREDITED
    currency_code: text('currency_code').notNull().default('USD'),
    total_minor: bigint('total_minor', { mode: 'bigint' }).notNull(),
    amount_paid_minor: bigint('amount_paid_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    balance_due_minor: bigint('balance_due_minor', { mode: 'bigint' }).notNull(),
    due_date: timestamp('due_date', { withTimezone: true }),
    notes: text('notes'),
    issued_at: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_sales_invoices_tenant_number').on(table.tenant_id, table.invoice_number),
    index('idx_sales_invoices_tenant_order').on(table.tenant_id, table.order_id),
    index('idx_sales_invoices_tenant_status').on(table.tenant_id, table.status),
    index('idx_sales_invoices_tenant_customer').on(table.tenant_id, table.customer_id),
  ],
);

export const sales_invoice_lines = pgTable(
  'sales_invoice_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    invoice_id: text('invoice_id').notNull().references(() => sales_invoices.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    sku: text('sku').notNull(),
    product_name: text('product_name').notNull(),
    quantity: integer('quantity').notNull(),
    unit_price_minor: bigint('unit_price_minor', { mode: 'bigint' }).notNull(),
    discount_minor: bigint('discount_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    tax_minor: bigint('tax_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    line_total_minor: bigint('line_total_minor', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    index('idx_sales_invoice_lines_invoice').on(table.invoice_id),
    index('idx_sales_invoice_lines_variant').on(table.variant_id),
  ],
);
