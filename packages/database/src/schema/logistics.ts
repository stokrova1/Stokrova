import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { warehouses } from './warehouse.js';
import { sales_orders, sales_order_lines } from './orders.js';
import { product_variants } from './catalog.js';
import { delivery_runs, delivery_stops } from './delivery.js';

export const fulfillments = pgTable(
  'fulfillments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    fulfillment_number: text('fulfillment_number').notNull(),
    order_id: text('order_id').notNull().references(() => sales_orders.id, { onDelete: 'restrict' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('PLANNED'), // PLANNED, ALLOCATED, PACKING, READY_FOR_DISPATCH, DISPATCHED, COMPLETED, HOLD, CANCELLED
    priority: text('priority').notNull().default('STANDARD'), // LOW, STANDARD, HIGH, URGENT
    delivery_window_start: text('delivery_window_start'),
    delivery_window_end: text('delivery_window_end'),
    hold_reason: text('hold_reason'),
    hold_approved_by: text('hold_approved_by'),
    released_at: timestamp('released_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_fulfillments_tenant_number').on(table.tenant_id, table.fulfillment_number),
    index('idx_fulfillments_tenant_order').on(table.tenant_id, table.order_id),
    index('idx_fulfillments_tenant_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_fulfillments_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const fulfillment_lines = pgTable(
  'fulfillment_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    fulfillment_id: text('fulfillment_id').notNull().references(() => fulfillments.id, { onDelete: 'cascade' }),
    order_line_id: text('order_line_id').notNull().references(() => sales_order_lines.id, { onDelete: 'restrict' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    sku: text('sku').notNull(),
    quantity_allocated: integer('quantity_allocated').notNull().default(0),
    quantity_packed: integer('quantity_packed').notNull().default(0),
    quantity_dispatched: integer('quantity_dispatched').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_fulfillment_lines_tenant_f').on(table.tenant_id, table.fulfillment_id),
    index('idx_fulfillment_lines_tenant_ol').on(table.tenant_id, table.order_line_id),
  ],
);

export const carriers = pgTable(
  'carriers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    carrier_code: text('carrier_code').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull().default('EXTERNAL_CARRIER'), // INTERNAL_FLEET, EXTERNAL_CARRIER, POSTAL, LOCAL_COURIER
    api_endpoint: text('api_endpoint'),
    is_active: boolean('is_active').notNull().default(true),
    settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_carriers_tenant_code').on(table.tenant_id, table.carrier_code),
    index('idx_carriers_tenant_active').on(table.tenant_id, table.is_active),
  ],
);

export const carrier_services = pgTable(
  'carrier_services',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    carrier_id: text('carrier_id').notNull().references(() => carriers.id, { onDelete: 'cascade' }),
    service_code: text('service_code').notNull(),
    name: text('name').notNull(),
    estimated_transit_days: integer('estimated_transit_days').notNull().default(1),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_carrier_services_tenant_code').on(table.tenant_id, table.carrier_id, table.service_code),
    index('idx_carrier_services_carrier').on(table.tenant_id, table.carrier_id),
  ],
);

export const shipping_quotes = pgTable(
  'shipping_quotes',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    quote_number: text('quote_number').notNull(),
    service_id: text('service_id').notNull().references(() => carrier_services.id, { onDelete: 'restrict' }),
    cost_minor: bigint('cost_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull().default('USD'),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    parameters: jsonb('parameters').notNull().default(sql`'{}'::jsonb`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_shipping_quotes_tenant_num').on(table.tenant_id, table.quote_number),
    index('idx_shipping_quotes_service').on(table.tenant_id, table.service_id),
  ],
);

export const shipments = pgTable(
  'shipments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    shipment_number: text('shipment_number').notNull(),
    order_id: text('order_id').notNull().references(() => sales_orders.id, { onDelete: 'restrict' }),
    fulfillment_id: text('fulfillment_id').notNull().references(() => fulfillments.id, { onDelete: 'restrict' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    carrier_id: text('carrier_id').references(() => carriers.id, { onDelete: 'set null' }),
    carrier_service_id: text('carrier_service_id').references(() => carrier_services.id, { onDelete: 'set null' }),
    run_id: text('run_id').references(() => delivery_runs.id, { onDelete: 'set null' }),
    stop_id: text('stop_id').references(() => delivery_stops.id, { onDelete: 'set null' }),
    tracking_number: text('tracking_number'),
    label_url: text('label_url'),
    status: text('status').notNull().default('DRAFT'), // DRAFT, READY_FOR_DISPATCH, DISPATCHED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED_ATTEMPT, EXCEPTION, RETURNED_TO_ORIGIN, CANCELLED
    dispatched_at: timestamp('dispatched_at', { withTimezone: true }),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_shipments_tenant_number').on(table.tenant_id, table.shipment_number),
    index('idx_shipments_tenant_order').on(table.tenant_id, table.order_id),
    index('idx_shipments_tenant_f').on(table.tenant_id, table.fulfillment_id),
    index('idx_shipments_tenant_status').on(table.tenant_id, table.status),
    index('idx_shipments_tenant_tracking').on(table.tenant_id, table.tracking_number),
  ],
);

export const shipment_lines = pgTable(
  'shipment_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    shipment_id: text('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
    fulfillment_line_id: text('fulfillment_line_id').notNull().references(() => fulfillment_lines.id, { onDelete: 'restrict' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    sku: text('sku').notNull(),
    quantity: integer('quantity').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_shipment_lines_shipment').on(table.tenant_id, table.shipment_id),
    index('idx_shipment_lines_fline').on(table.tenant_id, table.fulfillment_line_id),
  ],
);

export const shipment_packages = pgTable(
  'shipment_packages',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    shipment_id: text('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
    package_number: text('package_number').notNull(),
    tracking_number: text('tracking_number'),
    weight_grams: integer('weight_grams').notNull().default(0),
    length_cm: integer('length_cm'),
    width_cm: integer('width_cm'),
    height_cm: integer('height_cm'),
    packaging_type: text('packaging_type').notNull().default('BOX'), // BOX, PALLET, ENVELOPE, CRATE, TUBE
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_shipment_packages_num').on(table.tenant_id, table.shipment_id, table.package_number),
    index('idx_shipment_packages_track').on(table.tenant_id, table.tracking_number),
  ],
);

export const shipment_milestones = pgTable(
  'shipment_milestones',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    shipment_id: text('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    description: text('description').notNull(),
    location: text('location'),
    provider_event_id: text('provider_event_id'),
    recorded_at: timestamp('recorded_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_shipment_milestones_shipment').on(table.tenant_id, table.shipment_id),
    index('idx_shipment_milestones_provider').on(table.tenant_id, table.provider_event_id),
  ],
);

export const logistics_charges = pgTable(
  'logistics_charges',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    shipment_id: text('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
    charge_type: text('charge_type').notNull(), // CARRIER_FREIGHT, FUEL_SURCHARGE, HANDLING_FEE, CUSTOMER_DELIVERY_FEE
    provenance: text('provenance').notNull(), // ESTIMATED, QUOTED, CONFIRMED_ACTUAL
    amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull().default('USD'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_logistics_charges_shipment').on(table.tenant_id, table.shipment_id),
  ],
);

export const logistics_policies = pgTable(
  'logistics_policies',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    cutoff_time: text('cutoff_time'), // e.g. "17:00"
    max_delivery_attempts: integer('max_delivery_attempts').notNull().default(3),
    required_pod_method: text('required_pod_method').notNull().default('SIGNATURE'),
    allow_partial_delivery: boolean('allow_partial_delivery').notNull().default(true),
    auto_reschedule: boolean('auto_reschedule').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_logistics_policies_wh_name').on(table.tenant_id, table.warehouse_id, table.name),
  ],
);
