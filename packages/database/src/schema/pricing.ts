import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { product_variants } from './catalog.js';

export const price_lists = pgTable(
  'price_lists',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    currency_code: text('currency_code').notNull(),
    is_default: boolean('is_default').notNull().default(false),
    customer_group: text('customer_group'),
    is_active: boolean('is_active').notNull().default(true),
    valid_from: timestamp('valid_from', { withTimezone: true }),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_price_lists_tenant_code').on(table.tenant_id, table.code),
    index('idx_price_lists_tenant_default').on(
      table.tenant_id,
      table.is_default,
    ),
  ],
);

export const price_list_rules = pgTable(
  'price_list_rules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pricelist_id: text('pricelist_id')
      .notNull()
      .references(() => price_lists.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'cascade' }),
    min_quantity: integer('min_quantity').notNull().default(1),
    fixed_price_minor: text('fixed_price_minor'),
    discount_percent_bp: integer('discount_percent_bp'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_price_list_rules_unique').on(
      table.tenant_id,
      table.pricelist_id,
      table.variant_id,
      table.min_quantity,
    ),
    index('idx_price_list_rules_variant').on(
      table.tenant_id,
      table.variant_id,
    ),
  ],
);

export const tax_rates = pgTable(
  'tax_rates',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    rate_bp: integer('rate_bp').notNull(),
    computation_type: text('computation_type').notNull().default('PERCENTAGE'),
    inclusion_type: text('inclusion_type').notNull().default('EXCLUSIVE'),
    liability_account_id: text('liability_account_id'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_tax_rates_tenant_code').on(table.tenant_id, table.code),
    index('idx_tax_rates_tenant_active').on(table.tenant_id, table.is_active),
  ],
);

export const discount_promotions = pgTable(
  'discount_promotions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    discount_type: text('discount_type').notNull(),
    value_minor_or_bp: text('value_minor_or_bp').notNull(),
    max_discount_minor: text('max_discount_minor'),
    min_subtotal_minor: text('min_subtotal_minor'),
    valid_from: timestamp('valid_from', { withTimezone: true }),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    usage_limit: integer('usage_limit'),
    usage_count: integer('usage_count').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_discount_promotions_tenant_code').on(
      table.tenant_id,
      table.code,
    ),
    index('idx_discount_promotions_active').on(
      table.tenant_id,
      table.is_active,
    ),
  ],
);
