import {
  pgTable,
  text,
  timestamp,
  doublePrecision,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { product_variants } from './catalog.js';
import { warehouses, storage_locations } from './warehouse.js';
import { stock_batches, stock_serials } from './tracking.js';

export const stock_ledger_entries = pgTable(
  'stock_ledger_entries',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    idempotency_key: text('idempotency_key').notNull(),
    movement_type: text('movement_type').notNull(),
    reference_type: text('reference_type').notNull(),
    reference_id: text('reference_id').notNull(),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'restrict' }),
    batch_id: text('batch_id').references(() => stock_batches.id, {
      onDelete: 'set null',
    }),
    serial_id: text('serial_id').references(() => stock_serials.id, {
      onDelete: 'set null',
    }),
    source_warehouse_id: text('source_warehouse_id').references(
      () => warehouses.id,
      { onDelete: 'set null' },
    ),
    source_location_id: text('source_location_id').references(
      () => storage_locations.id,
      { onDelete: 'set null' },
    ),
    destination_warehouse_id: text('destination_warehouse_id').references(
      () => warehouses.id,
      { onDelete: 'set null' },
    ),
    destination_location_id: text('destination_location_id').references(
      () => storage_locations.id,
      { onDelete: 'set null' },
    ),
    quantity: doublePrecision('quantity').notNull(),
    unit_cost_minor: text('unit_cost_minor').notNull(),
    total_cost_minor: text('total_cost_minor').notNull(),
    user_id: text('user_id').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_stock_ledger_tenant_idempotency').on(
      table.tenant_id,
      table.idempotency_key,
    ),
    index('idx_stock_ledger_tenant_variant_date').on(
      table.tenant_id,
      table.variant_id,
      table.created_at,
    ),
    index('idx_stock_ledger_reference').on(
      table.tenant_id,
      table.reference_type,
      table.reference_id,
    ),
  ],
);

export const stock_reservations = pgTable(
  'stock_reservations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    batch_id: text('batch_id').references(() => stock_batches.id, {
      onDelete: 'set null',
    }),
    serial_id: text('serial_id').references(() => stock_serials.id, {
      onDelete: 'set null',
    }),
    quantity: doublePrecision('quantity').notNull(),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, FULFILLED, RELEASED, EXPIRED
    reference_type: text('reference_type').notNull(),
    reference_id: text('reference_id').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    fulfilled_at: timestamp('fulfilled_at', { withTimezone: true }),
    released_at: timestamp('released_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_stock_reservations_tenant_lookup').on(
      table.tenant_id,
      table.variant_id,
      table.warehouse_id,
      table.status,
    ),
    index('idx_stock_reservations_expires').on(
      table.tenant_id,
      table.expires_at,
    ),
  ],
);

export const stock_balance_snapshots = pgTable(
  'stock_balance_snapshots',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    location_id: text('location_id').references(() => storage_locations.id, {
      onDelete: 'cascade',
    }),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'cascade' }),
    batch_id: text('batch_id').references(() => stock_batches.id, {
      onDelete: 'set null',
    }),
    on_hand_quantity: doublePrecision('on_hand_quantity').notNull().default(0),
    reserved_quantity: doublePrecision('reserved_quantity').notNull().default(0),
    available_to_promise: doublePrecision('available_to_promise')
      .notNull()
      .default(0),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_stock_balance_tenant_lookup').on(
      table.tenant_id,
      table.warehouse_id,
      table.variant_id,
    ),
  ],
);
