import {
  pgTable,
  text,
  timestamp,
  boolean,
  doublePrecision,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants, branches } from './tenants.js';

export const warehouses = pgTable(
  'warehouses',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    address: text('address'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_warehouses_tenant_code').on(table.tenant_id, table.code),
    index('idx_warehouses_tenant_branch').on(table.tenant_id, table.branch_id),
  ],
);

export const storage_zones = pgTable(
  'storage_zones',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    zone_type: text('zone_type').notNull(), // BULK_STORAGE, PICKING, COLD_CHAIN, HAZMAT, STAGING, CROSS_DOCK
    temperature_class: text('temperature_class').notNull().default('AMBIENT'), // AMBIENT, CONTROLLED_ROOM_TEMP, COLD_STORAGE, FROZEN, ULTRA_LOW
    hazmat_class: text('hazmat_class').notNull().default('NONE'), // NONE, FLAMMABLE, CORROSIVE, TOXIC, OXIDIZER, EXPLOSIVE, RADIOACTIVE
    is_active: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_storage_zones_wh_code').on(table.tenant_id, table.warehouse_id, table.code),
    index('idx_storage_zones_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_storage_zones_type').on(table.tenant_id, table.zone_type),
  ],
);

export const storage_locations = pgTable(
  'storage_locations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    zone_id: text('zone_id').references(() => storage_zones.id, { onDelete: 'set null' }),
    parent_id: text('parent_id'),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(), // RECEIVING, INTERNAL_STORAGE, PICKING_FACE, STAGING, DISPATCH, QUARANTINE, DAMAGED, SCRAP, CUSTOMER, SUPPLIER, TRANSIT
    materialized_path: text('materialized_path').notNull(),
    level: integer('level').notNull().default(0),
    mix_policy: text('mix_policy').notNull().default('MULTI_SKU'), // SINGLE_SKU, MULTI_SKU, SINGLE_BATCH
    max_weight_kg: doublePrecision('max_weight_kg'),
    max_volume_cm3: doublePrecision('max_volume_cm3'),
    velocity_class: text('velocity_class'), // CLASS_A_FAST_MOVING, CLASS_B_MEDIUM_MOVING, CLASS_C_SLOW_MOVING
    is_pickable: boolean('is_pickable').notNull().default(true),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_storage_locations_wh_code').on(table.tenant_id, table.warehouse_id, table.code),
    index('idx_storage_locations_path').on(table.tenant_id, table.warehouse_id, table.materialized_path),
    index('idx_storage_locations_parent').on(table.tenant_id, table.parent_id),
    index('idx_storage_locations_type').on(table.tenant_id, table.type),
    index('idx_storage_locations_zone').on(table.tenant_id, table.zone_id),
  ],
);

export const put_away_rules = pgTable(
  'put_away_rules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priority: integer('priority').notNull().default(100),
    strategy: text('strategy').notNull(), // FASTEST_PICK_PROXIMITY, SAME_SKU_CONSOLIDATION, MAX_FILL_RATE, VELOCITY_MATCHED
    filter_category_id: text('filter_category_id'),
    filter_temperature_class: text('filter_temperature_class'),
    filter_hazmat_class: text('filter_hazmat_class'),
    filter_velocity_class: text('filter_velocity_class'),
    destination_zone_id: text('destination_zone_id').references(() => storage_zones.id, { onDelete: 'set null' }),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_put_away_rules_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_put_away_rules_priority').on(table.tenant_id, table.warehouse_id, table.priority),
  ],
);

export const pick_waves = pgTable(
  'pick_waves',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    wave_number: text('wave_number').notNull(),
    status: text('status').notNull().default('PLANNING'), // PLANNING, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
    strategy: text('strategy').notNull(), // DISCRETE, BATCH, WAVE, ZONE
    criteria: jsonb('criteria'),
    total_orders: integer('total_orders').notNull().default(0),
    total_lines: integer('total_lines').notNull().default(0),
    released_at: timestamp('released_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_pick_waves_number').on(table.tenant_id, table.warehouse_id, table.wave_number),
    index('idx_pick_waves_wh_status').on(table.tenant_id, table.warehouse_id, table.status),
  ],
);

export const pick_lists = pgTable(
  'pick_lists',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    wave_id: text('wave_id').references(() => pick_waves.id, { onDelete: 'set null' }),
    pick_list_number: text('pick_list_number').notNull(),
    strategy: text('strategy').notNull(), // DISCRETE, BATCH, WAVE, ZONE
    status: text('status').notNull().default('DRAFT'), // DRAFT, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
    picker_id: text('picker_id'),
    zone_id: text('zone_id').references(() => storage_zones.id, { onDelete: 'set null' }),
    staging_location_id: text('staging_location_id').references(() => storage_locations.id, { onDelete: 'set null' }),
    order_ids: jsonb('order_ids').notNull().$type<string[]>(),
    started_at: timestamp('started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_pick_lists_number').on(table.tenant_id, table.warehouse_id, table.pick_list_number),
    index('idx_pick_lists_wave').on(table.tenant_id, table.wave_id),
    index('idx_pick_lists_status').on(table.tenant_id, table.status),
  ],
);

export const pick_list_lines = pgTable(
  'pick_list_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    pick_list_id: text('pick_list_id').notNull().references(() => pick_lists.id, { onDelete: 'cascade' }),
    order_id: text('order_id').notNull(),
    order_line_id: text('order_line_id').notNull(),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    batch_id: text('batch_id'),
    source_location_id: text('source_location_id').notNull().references(() => storage_locations.id, { onDelete: 'restrict' }),
    source_location_code: text('source_location_code').notNull(),
    zone_id: text('zone_id').references(() => storage_zones.id, { onDelete: 'set null' }),
    aisle: integer('aisle'),
    rack: integer('rack'),
    shelf: integer('shelf'),
    bin_position: integer('bin_position'),
    pick_sequence: integer('pick_sequence').notNull().default(1),
    quantity_requested: integer('quantity_requested').notNull(),
    quantity_picked: integer('quantity_picked').notNull().default(0),
    quantity_short: integer('quantity_short').notNull().default(0),
    status: text('status').notNull().default('PENDING'), // PENDING, PICKED, SHORT_PICKED, CANCELLED
    short_reason: text('short_reason'),
    picked_at: timestamp('picked_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pick_list_lines_list').on(table.tenant_id, table.pick_list_id),
    index('idx_pick_list_lines_seq').on(table.tenant_id, table.pick_list_id, table.pick_sequence),
    index('idx_pick_list_lines_status').on(table.tenant_id, table.status),
  ],
);

// ----------------------------------------------------------------------------
// Phase 6C: Packing Stations, Containerization & Shipping Manifests Tables
// ----------------------------------------------------------------------------

export const packing_stations = pgTable(
  'packing_stations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    station_code: text('station_code').notNull(),
    station_name: text('station_name').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    default_staging_location_id: text('default_staging_location_id'),
    scale_device_id: text('scale_device_id'),
    printer_device_id: text('printer_device_id'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_packing_stations_tenant_code').on(table.tenant_id, table.warehouse_id, table.station_code),
    index('idx_packing_stations_status').on(table.tenant_id, table.status),
  ],
);

export const packaging_boxes = pgTable(
  'packaging_boxes',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    length_mm: integer('length_mm').notNull(),
    width_mm: integer('width_mm').notNull(),
    height_mm: integer('height_mm').notNull(),
    max_weight_grams: integer('max_weight_grams').notNull(),
    tare_weight_grams: integer('tare_weight_grams').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_packaging_boxes_tenant_code').on(table.tenant_id, table.code),
    index('idx_packaging_boxes_active').on(table.tenant_id, table.is_active),
  ],
);

export const shipping_manifests = pgTable(
  'shipping_manifests',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    manifest_number: text('manifest_number').notNull(),
    carrier_id: text('carrier_id').notNull(),
    carrier_name: text('carrier_name').notNull(),
    status: text('status').notNull().default('DRAFT'),
    vehicle_reference: text('vehicle_reference'),
    driver_name: text('driver_name'),
    driver_phone: text('driver_phone'),
    total_containers: integer('total_containers').notNull().default(0),
    total_gross_weight_grams: integer('total_gross_weight_grams').notNull().default(0),
    sealed_at: timestamp('sealed_at', { withTimezone: true }),
    dispatched_at: timestamp('dispatched_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_shipping_manifests_tenant_number').on(table.tenant_id, table.manifest_number),
    index('idx_shipping_manifests_carrier').on(table.tenant_id, table.carrier_id, table.status),
  ],
);

export const packed_containers = pgTable(
  'packed_containers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    station_id: text('station_id').references(() => packing_stations.id, { onDelete: 'set null' }),
    box_type_id: text('box_type_id').references(() => packaging_boxes.id, { onDelete: 'set null' }),
    manifest_id: text('manifest_id').references(() => shipping_manifests.id, { onDelete: 'set null' }),
    container_number: text('container_number').notNull(),
    sscc_barcode: text('sscc_barcode').notNull(),
    tracking_number: text('tracking_number'),
    status: text('status').notNull().default('OPEN'),
    tare_weight_grams: integer('tare_weight_grams').notNull().default(0),
    net_weight_grams: integer('net_weight_grams').notNull().default(0),
    gross_weight_grams: integer('gross_weight_grams').notNull().default(0),
    scale_verified_weight_grams: integer('scale_verified_weight_grams'),
    weight_discrepancy_grams: integer('weight_discrepancy_grams'),
    seal_number: text('seal_number'),
    sealed_at: timestamp('sealed_at', { withTimezone: true }),
    dispatched_at: timestamp('dispatched_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_packed_containers_tenant_number').on(table.tenant_id, table.container_number),
    uniqueIndex('idx_packed_containers_sscc').on(table.tenant_id, table.sscc_barcode),
    index('idx_packed_containers_manifest').on(table.tenant_id, table.manifest_id),
    index('idx_packed_containers_status').on(table.tenant_id, table.status),
  ],
);

export const packed_container_lines = pgTable(
  'packed_container_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    container_id: text('container_id').notNull().references(() => packed_containers.id, { onDelete: 'cascade' }),
    pick_list_line_id: text('pick_list_line_id'),
    order_id: text('order_id').notNull(),
    order_line_id: text('order_line_id').notNull(),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    quantity: integer('quantity').notNull(),
    batch_id: text('batch_id'),
    serial_numbers: jsonb('serial_numbers'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_container_lines_container').on(table.tenant_id, table.container_id),
    index('idx_container_lines_order').on(table.tenant_id, table.order_id, table.order_line_id),
  ],
);

// ----------------------------------------------------------------------------
// Phase 6D: Bin Transfers, Cross-Docking & Barcode Logistics Tables
// ----------------------------------------------------------------------------

export const internal_bin_transfers = pgTable(
  'internal_bin_transfers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    transfer_number: text('transfer_number').notNull(),
    transfer_type: text('transfer_type').notNull().default('INTERNAL_BIN_MOVE'),
    status: text('status').notNull().default('PENDING'),
    source_location_id: text('source_location_id').notNull().references(() => storage_locations.id),
    destination_location_id: text('destination_location_id').notNull().references(() => storage_locations.id),
    operator_id: text('operator_id'),
    notes: text('notes'),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_bin_transfers_tenant_num').on(table.tenant_id, table.transfer_number),
    index('idx_bin_transfers_src').on(table.tenant_id, table.source_location_id),
    index('idx_bin_transfers_dst').on(table.tenant_id, table.destination_location_id),
    index('idx_bin_transfers_status').on(table.tenant_id, table.status),
  ],
);

export const internal_bin_transfer_lines = pgTable(
  'internal_bin_transfer_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    transfer_id: text('transfer_id').notNull().references(() => internal_bin_transfers.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    quantity: integer('quantity').notNull(),
    batch_id: text('batch_id'),
    serial_numbers: jsonb('serial_numbers'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_transfer_lines_transfer').on(table.tenant_id, table.transfer_id),
    index('idx_transfer_lines_variant').on(table.tenant_id, table.variant_id),
  ],
);

export const cross_dock_operations = pgTable(
  'cross_dock_operations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    inbound_receipt_id: text('inbound_receipt_id').notNull(),
    inbound_line_id: text('inbound_line_id').notNull(),
    matched_order_id: text('matched_order_id').notNull(),
    matched_order_line_id: text('matched_order_line_id').notNull(),
    quantity_to_cross_dock: integer('quantity_to_cross_dock').notNull(),
    target_staging_location_id: text('target_staging_location_id').notNull().references(() => storage_locations.id),
    status: text('status').notNull().default('PLANNED'),
    operator_id: text('operator_id'),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cross_dock_tenant_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_cross_dock_receipt').on(table.tenant_id, table.inbound_receipt_id),
    index('idx_cross_dock_order').on(table.tenant_id, table.matched_order_id),
    index('idx_cross_dock_status').on(table.tenant_id, table.status),
  ],
);


