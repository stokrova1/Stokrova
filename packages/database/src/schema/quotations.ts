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
import { customers } from './customers.js';

export const quotations = pgTable(
  'quotations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    quotation_number: text('quotation_number').notNull(),
    customer_id: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    customer_name: text('customer_name'),
    customer_email: text('customer_email'),
    customer_phone: text('customer_phone'),
    branch_id: text('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('DRAFT'), // DRAFT, SENT, ACCEPTED, EXPIRED, CANCELLED, CONVERTED
    converted_sales_order_id: text('converted_sales_order_id'),
    currency_code: text('currency_code').notNull().default('USD'),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    subtotal_minor: bigint('subtotal_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_discount_minor: bigint('total_discount_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_tax_minor: bigint('total_tax_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    grand_total_minor: bigint('grand_total_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    converted_at: timestamp('converted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_quotations_tenant_number').on(table.tenant_id, table.quotation_number),
    index('idx_quotations_tenant_status').on(table.tenant_id, table.status),
    index('idx_quotations_tenant_customer').on(table.tenant_id, table.customer_id),
  ],
);

export const quotation_lines = pgTable(
  'quotation_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    quotation_id: text('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
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
    index('idx_quotation_lines_quotation').on(table.quotation_id),
    index('idx_quotation_lines_variant').on(table.variant_id),
  ],
);
