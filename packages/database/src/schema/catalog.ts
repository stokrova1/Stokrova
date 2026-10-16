import { pgTable, text, timestamp, boolean, doublePrecision, integer, bigint, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';

export const units_of_measure = pgTable(
  'units_of_measure',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(), // COUNT, MASS, VOLUME, LENGTH, AREA
    is_base_unit: boolean('is_base_unit').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_uom_tenant_code').on(table.tenant_id, table.code),
    index('idx_uom_tenant_category').on(table.tenant_id, table.category),
  ],
);

export const unit_conversions = pgTable(
  'unit_conversions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    from_uom_id: text('from_uom_id').notNull().references(() => units_of_measure.id, { onDelete: 'cascade' }),
    to_uom_id: text('to_uom_id').notNull().references(() => units_of_measure.id, { onDelete: 'cascade' }),
    multiplier: doublePrecision('multiplier').notNull(),
    divisor: doublePrecision('divisor').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_uom_conv_tenant_pair').on(table.tenant_id, table.from_uom_id, table.to_uom_id),
    index('idx_uom_conv_from').on(table.from_uom_id),
    index('idx_uom_conv_to').on(table.to_uom_id),
  ],
);

export const product_categories = pgTable(
  'product_categories',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    parent_id: text('parent_id'),
    code: text('code').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    path: text('path').notNull(),
    level: integer('level').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_categories_tenant_code').on(table.tenant_id, table.code),
    index('idx_categories_tenant_path').on(table.tenant_id, table.path),
    index('idx_categories_tenant_parent').on(table.tenant_id, table.parent_id),
    index('idx_categories_tenant_slug').on(table.tenant_id, table.slug),
  ],
);

export const brands = pgTable(
  'brands',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    origin_country: text('origin_country'),
    logo_url: text('logo_url'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_brands_tenant_code').on(table.tenant_id, table.code),
    index('idx_brands_tenant_slug').on(table.tenant_id, table.slug),
    index('idx_brands_tenant_active').on(table.tenant_id, table.is_active),
  ],
);

export const product_templates = pgTable(
  'product_templates',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(), // STANDARD, VARIANT_PARENT, KIT_BUNDLE, SERVICE, COMPOSITE, DIGITAL
    category_id: text('category_id').references(() => product_categories.id, { onDelete: 'set null' }),
    brand_id: text('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    base_uom_id: text('base_uom_id').notNull().references(() => units_of_measure.id),
    tracking_policy: text('tracking_policy').notNull().default('NONE'), // NONE, BATCH, SERIAL, BATCH_AND_SERIAL
    is_expirable: boolean('is_expirable').notNull().default(false),
    tax_category_code: text('tax_category_code'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_templates_tenant_code').on(table.tenant_id, table.code),
    index('idx_templates_tenant_category').on(table.tenant_id, table.category_id),
    index('idx_templates_tenant_brand').on(table.tenant_id, table.brand_id),
    index('idx_templates_tenant_type').on(table.tenant_id, table.type),
  ],
);

export const attribute_dimensions = pgTable(
  'attribute_dimensions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_dimensions_tenant_code').on(table.tenant_id, table.code),
  ],
);

export const attribute_values = pgTable(
  'attribute_values',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    dimension_id: text('dimension_id').notNull().references(() => attribute_dimensions.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    hex_color: text('hex_color'),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_attr_values_tenant_dim_code').on(table.tenant_id, table.dimension_id, table.code),
    index('idx_attr_values_dim').on(table.dimension_id),
  ],
);

export const product_variants = pgTable(
  'product_variants',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    template_id: text('template_id').notNull().references(() => product_templates.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    barcode: text('barcode'),
    cost_price_minor: bigint('cost_price_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    selling_price_minor: bigint('selling_price_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    attributes: jsonb('attributes').notNull().default('{}'),
    weight_grams: doublePrecision('weight_grams'),
    volume_cm3: doublePrecision('volume_cm3'),
    image_url: text('image_url'),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, DISCONTINUED, DRAFT
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_variants_tenant_sku').on(table.tenant_id, table.sku),
    index('idx_variants_tenant_template').on(table.tenant_id, table.template_id),
    index('idx_variants_tenant_barcode').on(table.tenant_id, table.barcode),
    index('idx_variants_tenant_status').on(table.tenant_id, table.status),
  ],
);
