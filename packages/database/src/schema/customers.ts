import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { price_lists } from './pricing.js';

export const customer_groups = pgTable(
  'customer_groups',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    default_discount_percent_bp: integer('default_discount_percent_bp').notNull().default(0),
    credit_limit_minor: bigint('credit_limit_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    payment_terms_days: integer('payment_terms_days').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_customer_groups_tenant_code').on(table.tenant_id, table.code),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    customer_code: text('customer_code').notNull(),
    display_name: text('display_name').notNull(),
    legal_name: text('legal_name'),
    email: text('email'),
    phone: text('phone'),
    tax_id: text('tax_id'),
    customer_group_id: text('customer_group_id').references(() => customer_groups.id, { onDelete: 'set null' }),
    price_list_id: text('price_list_id').references(() => price_lists.id, { onDelete: 'set null' }),
    credit_limit_minor: bigint('credit_limit_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    outstanding_balance_minor: bigint('outstanding_balance_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    payment_terms: text('payment_terms').notNull().default('IMMEDIATE'), // IMMEDIATE, NET_15, NET_30, NET_60
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, INACTIVE, SUSPENDED
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_customers_tenant_code').on(table.tenant_id, table.customer_code),
    index('idx_customers_tenant_email').on(table.tenant_id, table.email),
    index('idx_customers_tenant_phone').on(table.tenant_id, table.phone),
    index('idx_customers_tenant_group').on(table.tenant_id, table.customer_group_id),
  ],
);

export const customer_addresses = pgTable(
  'customer_addresses',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    address_type: text('address_type').notNull().default('BOTH'), // BILLING, SHIPPING, BOTH
    is_default: boolean('is_default').notNull().default(false),
    street_line_1: text('street_line_1').notNull(),
    street_line_2: text('street_line_2'),
    city: text('city').notNull(),
    state_province: text('state_province'),
    postal_code: text('postal_code'),
    country_code: text('country_code').notNull().default('US'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_customer_addresses_customer').on(table.customer_id),
    index('idx_customer_addresses_tenant').on(table.tenant_id),
  ],
);
