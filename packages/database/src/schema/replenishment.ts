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
import { warehouses } from './warehouse.js';

export const replenishment_rules = pgTable(
  'replenishment_rules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    strategy: text('strategy').notNull().default('MIN_MAX'), // MIN_MAX, REORDER_POINT_SAFETY_STOCK, PERIODIC_REVIEW
    min_quantity: integer('min_quantity').notNull(),
    max_quantity: integer('max_quantity').notNull(),
    safety_stock: integer('safety_stock').notNull().default(0),
    reorder_point: integer('reorder_point').notNull().default(0),
    lead_time_days: integer('lead_time_days').notNull().default(1),
    order_multiple: integer('order_multiple').notNull().default(1),
    min_order_quantity: integer('min_order_quantity').notNull().default(1),
    primary_vendor_id: text('primary_vendor_id'),
    upstream_warehouse_id: text('upstream_warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
    preferred_sourcing: text('preferred_sourcing').notNull().default('PURCHASE_ORDER'), // PURCHASE_ORDER, INTERNAL_TRANSFER, MANUFACTURING
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_replenish_rules_unique').on(table.tenant_id, table.warehouse_id, table.variant_id),
    index('idx_replenish_rules_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_replenish_rules_variant').on(table.tenant_id, table.variant_id),
    index('idx_replenish_rules_sku').on(table.tenant_id, table.sku),
  ],
);

export const replenishment_recommendations = pgTable(
  'replenishment_recommendations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    rule_id: text('rule_id').notNull().references(() => replenishment_rules.id, { onDelete: 'cascade' }),
    net_stock_position: integer('net_stock_position').notNull(),
    reorder_point: integer('reorder_point').notNull(),
    recommended_quantity: integer('recommended_quantity').notNull(),
    sourcing_method: text('sourcing_method').notNull(), // PURCHASE_ORDER, INTERNAL_TRANSFER, MANUFACTURING
    target_vendor_id: text('target_vendor_id'),
    source_warehouse_id: text('source_warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
    estimated_cost_cents: integer('estimated_cost_cents').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('PROPOSED'), // PROPOSED, APPROVED, REJECTED, CONVERTED, CANCELLED
    generated_order_id: text('generated_order_id'),
    approved_by: text('approved_by'),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_replenish_recs_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_replenish_recs_status').on(table.tenant_id, table.status),
    index('idx_replenish_recs_rule').on(table.tenant_id, table.rule_id),
  ],
);
