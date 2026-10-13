import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants, branches } from './tenants.js';

export const hardware_devices = pgTable(
  'hardware_devices',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    register_id: text('register_id'),
    name: text('name').notNull(),
    device_type: text('device_type').notNull(),
    protocol: text('protocol').notNull(),
    connection_interface: text('connection_interface').notNull(),
    ip_address: text('ip_address'),
    port: integer('port'),
    serial_port: text('serial_port'),
    baud_rate: integer('baud_rate'),
    mac_address: text('mac_address'),
    profile_id: text('profile_id'),
    status: text('status').notNull().default('ONLINE'),
    is_active: boolean('is_active').notNull().default(true),
    last_heartbeat_at: timestamp('last_heartbeat_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_hardware_devices_tenant_type').on(table.tenant_id, table.device_type),
    index('idx_hardware_devices_tenant_status').on(table.tenant_id, table.status),
    index('idx_hardware_devices_tenant_branch').on(table.tenant_id, table.branch_id),
  ],
);

export const hardware_profiles = pgTable(
  'hardware_profiles',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    device_type: text('device_type').notNull(),
    paper_width_mm: integer('paper_width_mm').notNull().default(80),
    column_count: integer('column_count').notNull().default(48),
    drawer_kick_pin: integer('drawer_kick_pin').notNull().default(2),
    drawer_pulse_duration_ms: integer('drawer_pulse_duration_ms').notNull().default(100),
    scale_precision_grams: integer('scale_precision_grams').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_hardware_profiles_tenant').on(table.tenant_id),
  ],
);

export const hardware_print_jobs = pgTable(
  'hardware_print_jobs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    device_id: text('device_id').notNull().references(() => hardware_devices.id, { onDelete: 'cascade' }),
    operation_id: text('operation_id').notNull(),
    job_type: text('job_type').notNull(),
    status: text('status').notNull().default('QUEUED'),
    payload_bytes_base64: text('payload_bytes_base64').notNull(),
    plaintext_preview: text('plaintext_preview'),
    error_message: text('error_message'),
    retry_count: integer('retry_count').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_hardware_print_jobs_tenant_op').on(table.tenant_id, table.operation_id),
    index('idx_hardware_print_jobs_tenant_status').on(table.tenant_id, table.status),
    index('idx_hardware_print_jobs_device').on(table.device_id),
  ],
);
