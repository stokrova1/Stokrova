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

export const fleet_vehicles = pgTable(
  'fleet_vehicles',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    vehicle_code: text('vehicle_code').notNull(),
    license_plate: text('license_plate').notNull(),
    make_model: text('make_model').notNull(),
    type: text('type').notNull(), // VAN_CARGO, TRUCK_LIGHT, TRUCK_HEAVY, REFRIGERATED_VAN, MOTORCYCLE_EV
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, MAINTENANCE_DUE, IN_SHOP, DECOMMISSIONED
    max_payload_grams: integer('max_payload_grams').notNull(),
    max_volume_cm3: integer('max_volume_cm3').notNull(),
    odometer_meters: integer('odometer_meters').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_vehicles_tenant_code').on(table.tenant_id, table.vehicle_code),
    uniqueIndex('idx_vehicles_tenant_plate').on(table.tenant_id, table.license_plate),
    index('idx_vehicles_tenant_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_vehicles_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const fleet_drivers = pgTable(
  'fleet_drivers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id').notNull(),
    driver_code: text('driver_code').notNull(),
    full_name: text('full_name').notNull(),
    phone_number: text('phone_number').notNull(),
    license_number: text('license_number').notNull(),
    license_expiry_date: text('license_expiry_date').notNull(),
    assigned_vehicle_id: text('assigned_vehicle_id').references(() => fleet_vehicles.id, { onDelete: 'set null' }),
    shift_status: text('shift_status').notNull().default('OFF_DUTY'), // OFF_DUTY, ON_DUTY, EN_ROUTE, BREAK
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_drivers_tenant_code').on(table.tenant_id, table.driver_code),
    index('idx_drivers_tenant_user').on(table.tenant_id, table.user_id),
    index('idx_drivers_tenant_shift').on(table.tenant_id, table.shift_status),
  ],
);

export const delivery_runs = pgTable(
  'delivery_runs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    run_number: text('run_number').notNull(),
    vehicle_id: text('vehicle_id').references(() => fleet_vehicles.id, { onDelete: 'set null' }),
    driver_id: text('driver_id').references(() => fleet_drivers.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('PLANNING'), // PLANNING, OPTIMIZED, DISPATCHED, IN_TRANSIT, COMPLETED, CANCELLED
    total_stops: integer('total_stops').notNull().default(0),
    completed_stops: integer('completed_stops').notNull().default(0),
    total_weight_grams: integer('total_weight_grams').notNull().default(0),
    total_volume_cm3: integer('total_volume_cm3').notNull().default(0),
    dispatched_at: timestamp('dispatched_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_runs_tenant_number').on(table.tenant_id, table.run_number),
    index('idx_runs_tenant_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_runs_tenant_status').on(table.tenant_id, table.status),
    index('idx_runs_tenant_vehicle').on(table.tenant_id, table.vehicle_id),
    index('idx_runs_tenant_driver').on(table.tenant_id, table.driver_id),
  ],
);

export const delivery_stops = pgTable(
  'delivery_stops',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    run_id: text('run_id').notNull().references(() => delivery_runs.id, { onDelete: 'cascade' }),
    stop_sequence: integer('stop_sequence').notNull(),
    order_id: text('order_id').notNull(),
    order_number: text('order_number').notNull(),
    recipient_name: text('recipient_name').notNull(),
    recipient_phone: text('recipient_phone').notNull(),
    delivery_address: text('delivery_address').notNull(),
    latitude_microdegrees: integer('latitude_microdegrees'),
    longitude_microdegrees: integer('longitude_microdegrees'),
    time_window_start: text('time_window_start'),
    time_window_end: text('time_window_end'),
    estimated_arrival: timestamp('estimated_arrival', { withTimezone: true }),
    actual_arrival: timestamp('actual_arrival', { withTimezone: true }),
    status: text('status').notNull().default('PENDING'), // PENDING, ARRIVED, DELIVERED, ATTEMPTED_FAILED
    failure_reason: text('failure_reason'),
    total_weight_grams: integer('total_weight_grams').notNull().default(0),
    total_volume_cm3: integer('total_volume_cm3').notNull().default(0),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_stops_tenant_run').on(table.tenant_id, table.run_id),
    index('idx_stops_tenant_order').on(table.tenant_id, table.order_id),
    index('idx_stops_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const proof_of_deliveries = pgTable(
  'proof_of_deliveries',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    run_id: text('run_id').notNull().references(() => delivery_runs.id, { onDelete: 'cascade' }),
    stop_id: text('stop_id').notNull().references(() => delivery_stops.id, { onDelete: 'cascade' }),
    verification_method: text('verification_method').notNull(), // SIGNATURE, PHOTO, OTP, GEOFENCE
    recipient_name: text('recipient_name').notNull(),
    signature_svg: text('signature_svg'),
    photo_url: text('photo_url'),
    otp_code: text('otp_code'),
    delivered_latitude_microdegrees: integer('delivered_latitude_microdegrees'),
    delivered_longitude_microdegrees: integer('delivered_longitude_microdegrees'),
    geofence_distance_meters: integer('geofence_distance_meters'),
    notes: text('notes'),
    delivered_at: timestamp('delivered_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pod_tenant_run').on(table.tenant_id, table.run_id),
    index('idx_pod_tenant_stop').on(table.tenant_id, table.stop_id),
  ],
);
