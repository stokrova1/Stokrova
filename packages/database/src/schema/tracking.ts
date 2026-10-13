import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { product_variants } from './catalog.js';
import { warehouses, storage_locations } from './warehouse.js';

export const stock_batches = pgTable(
  'stock_batches',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'cascade' }),
    batch_number: text('batch_number').notNull(),
    supplier_lot_number: text('supplier_lot_number'),
    status: text('status').notNull().default('AVAILABLE'), // AVAILABLE, QUARANTINED, EXPIRED, RECALLED, DEPLETED
    manufacture_date: timestamp('manufacture_date', { withTimezone: true }),
    expiry_date: timestamp('expiry_date', { withTimezone: true }),
    retest_date: timestamp('retest_date', { withTimezone: true }),
    certificate_of_analysis_url: text('certificate_of_analysis_url'),
    quarantine_reason: text('quarantine_reason'),
    quarantine_notes: text('quarantine_notes'),
    quarantined_at: timestamp('quarantined_at', { withTimezone: true }),
    released_at: timestamp('released_at', { withTimezone: true }),
    released_by: text('released_by'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_stock_batches_tenant_variant_code').on(
      table.tenant_id,
      table.variant_id,
      table.batch_number,
    ),
    index('idx_stock_batches_status').on(table.tenant_id, table.status),
    index('idx_stock_batches_expiry').on(table.tenant_id, table.expiry_date),
  ],
);

export const stock_serials = pgTable(
  'stock_serials',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'cascade' }),
    batch_id: text('batch_id').references(() => stock_batches.id, {
      onDelete: 'set null',
    }),
    serial_number: text('serial_number').notNull(),
    warehouse_id: text('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    location_id: text('location_id').references(() => storage_locations.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('AVAILABLE'), // AVAILABLE, RESERVED, QUARANTINED, DAMAGED, DISPATCHED, CONSUMED, RETURNED
    quarantine_reason: text('quarantine_reason'),
    quarantine_notes: text('quarantine_notes'),
    quarantined_at: timestamp('quarantined_at', { withTimezone: true }),
    released_at: timestamp('released_at', { withTimezone: true }),
    released_by: text('released_by'),
    warranty_start_date: timestamp('warranty_start_date', { withTimezone: true }),
    warranty_end_date: timestamp('warranty_end_date', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_stock_serials_tenant_variant_sn').on(
      table.tenant_id,
      table.variant_id,
      table.serial_number,
    ),
    index('idx_stock_serials_wh_status').on(
      table.tenant_id,
      table.warehouse_id,
      table.status,
    ),
    index('idx_stock_serials_location').on(table.tenant_id, table.location_id),
    index('idx_stock_serials_batch').on(table.tenant_id, table.batch_id),
  ],
);
