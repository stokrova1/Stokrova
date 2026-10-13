/**
 * Manufacturing, BOM, Work Centers & Routing Database Schema (Phase 5)
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { product_variants } from './catalog.js';
import { warehouses, storage_locations } from './warehouse.js';

// ==========================================
// 5A: Bill of Materials (BOM) & Components
// ==========================================

export const bill_of_materials = pgTable(
  'bill_of_materials',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    bom_number: text('bom_number').notNull(),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    version: integer('version').notNull().default(1),
    revision_label: text('revision_label').notNull().default('REV-A'),
    type: text('type').notNull().default('MANUFACTURE'),
    status: text('status').notNull().default('ACTIVE'),
    output_quantity: integer('output_quantity').notNull().default(1),
    routing_id: text('routing_id'),
    notes: text('notes'),
    is_active_revision: boolean('is_active_revision').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_bom_tenant_number').on(table.tenant_id, table.bom_number),
    index('idx_bom_tenant_variant').on(table.tenant_id, table.variant_id),
  ],
);

export const bom_lines = pgTable(
  'bom_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    bom_id: text('bom_id').notNull().references(() => bill_of_materials.id, { onDelete: 'cascade' }),
    component_variant_id: text('component_variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    scrap_percentage_basis_points: integer('scrap_percentage_basis_points').notNull().default(0),
    fixed_scrap_quantity: integer('fixed_scrap_quantity').notNull().default(0),
    operation_step_number: integer('operation_step_number'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bom_lines_bom_id').on(table.tenant_id, table.bom_id),
    index('idx_bom_lines_component_variant').on(table.tenant_id, table.component_variant_id),
  ],
);

export const bom_byproducts = pgTable(
  'bom_byproducts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    bom_id: text('bom_id').notNull().references(() => bill_of_materials.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    cost_allocation_basis_points: integer('cost_allocation_basis_points').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bom_byproducts_bom_id').on(table.tenant_id, table.bom_id),
  ],
);

// ==========================================
// 5B: Manufacturing Work Centers
// ==========================================

export const mfg_work_centers = pgTable(
  'mfg_work_centers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    capacity_units_per_hour: integer('capacity_units_per_hour').notNull().default(1),
    efficiency_basis_points: integer('efficiency_basis_points').notNull().default(10000),
    hourly_labor_rate_minor: bigint('hourly_labor_rate_minor', { mode: 'bigint' }).notNull(),
    hourly_machine_rate_minor: bigint('hourly_machine_rate_minor', { mode: 'bigint' }).notNull(),
    hourly_overhead_rate_minor: bigint('hourly_overhead_rate_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_mfg_work_centers_code').on(table.tenant_id, table.code),
    index('idx_mfg_work_centers_warehouse').on(table.tenant_id, table.warehouse_id),
  ],
);

// ==========================================
// 5C: Routings & Operations
// ==========================================

export const routings = pgTable(
  'routings',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    routing_number: text('routing_number').notNull(),
    name: text('name').notNull(),
    variant_id: text('variant_id').references(() => product_variants.id, { onDelete: 'set null' }),
    is_active: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_routings_tenant_number').on(table.tenant_id, table.routing_number),
  ],
);

export const routing_operations = pgTable(
  'routing_operations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    routing_id: text('routing_id').notNull().references(() => routings.id, { onDelete: 'cascade' }),
    operation_number: integer('operation_number').notNull(),
    name: text('name').notNull(),
    work_center_id: text('work_center_id').notNull().references(() => mfg_work_centers.id, { onDelete: 'restrict' }),
    setup_time_minutes: integer('setup_time_minutes').notNull().default(0),
    run_time_minutes_per_unit: integer('run_time_minutes_per_unit').notNull().default(0),
    teardown_time_minutes: integer('teardown_time_minutes').notNull().default(0),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_routing_ops_routing').on(table.tenant_id, table.routing_id),
  ],
);

// ==========================================
// 5D: Manufacturing Orders (MO)
// ==========================================

export const manufacturing_orders = pgTable(
  'manufacturing_orders',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    mo_number: text('mo_number').notNull(),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    bom_id: text('bom_id').notNull().references(() => bill_of_materials.id, { onDelete: 'restrict' }),
    routing_id: text('routing_id').references(() => routings.id, { onDelete: 'set null' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    destination_location_id: text('destination_location_id').notNull().references(() => storage_locations.id, { onDelete: 'restrict' }),
    target_quantity: integer('target_quantity').notNull(),
    produced_quantity: integer('produced_quantity').notNull().default(0),
    scrapped_quantity: integer('scrapped_quantity').notNull().default(0),
    status: text('status').notNull().default('DRAFT'),
    priority: text('priority').notNull().default('NORMAL'),
    lot_number: text('lot_number'),
    scheduled_start_date: timestamp('scheduled_start_date', { withTimezone: true }),
    scheduled_completion_date: timestamp('scheduled_completion_date', { withTimezone: true }),
    actual_start_date: timestamp('actual_start_date', { withTimezone: true }),
    actual_completion_date: timestamp('actual_completion_date', { withTimezone: true }),
    total_material_cost_minor: bigint('total_material_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_labor_cost_minor: bigint('total_labor_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_overhead_cost_minor: bigint('total_overhead_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_production_cost_minor: bigint('total_production_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    unit_production_cost_minor: bigint('unit_production_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    notes: text('notes'),
    created_by: text('created_by'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_mo_tenant_number').on(table.tenant_id, table.mo_number),
    index('idx_mo_tenant_status').on(table.tenant_id, table.status),
    index('idx_mo_tenant_variant').on(table.tenant_id, table.variant_id),
  ],
);

export const mo_components = pgTable(
  'mo_components',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    manufacturing_order_id: text('manufacturing_order_id').notNull().references(() => manufacturing_orders.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    required_quantity: integer('required_quantity').notNull(),
    consumed_quantity: integer('consumed_quantity').notNull().default(0),
    unit_cost_minor: bigint('unit_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_cost_minor: bigint('total_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    is_backflushed: boolean('is_backflushed').notNull().default(false),
    location_id: text('location_id').notNull().references(() => storage_locations.id, { onDelete: 'restrict' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mo_components_mo_id').on(table.tenant_id, table.manufacturing_order_id),
  ],
);

export const mo_work_orders = pgTable(
  'mo_work_orders',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    manufacturing_order_id: text('manufacturing_order_id').notNull().references(() => manufacturing_orders.id, { onDelete: 'cascade' }),
    operation_id: text('operation_id').references(() => routing_operations.id, { onDelete: 'set null' }),
    work_center_id: text('work_center_id').notNull().references(() => mfg_work_centers.id, { onDelete: 'restrict' }),
    operation_number: integer('operation_number').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('PENDING'),
    actual_duration_minutes: integer('actual_duration_minutes').notNull().default(0),
    labor_cost_minor: bigint('labor_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    machine_cost_minor: bigint('machine_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    overhead_cost_minor: bigint('overhead_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_operation_cost_minor: bigint('total_operation_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    operator_user_id: text('operator_user_id'),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mo_work_orders_mo_id').on(table.tenant_id, table.manufacturing_order_id),
  ],
);

// ==========================================
// 5E: Execution Runs, Inspections, Scrap & Substitutions
// ==========================================

export const mo_execution_runs = pgTable(
  'mo_execution_runs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    manufacturing_order_id: text('manufacturing_order_id').notNull().references(() => manufacturing_orders.id, { onDelete: 'cascade' }),
    run_number: integer('run_number').notNull(),
    good_quantity: integer('good_quantity').notNull(),
    scrapped_quantity: integer('scrapped_quantity').notNull().default(0),
    notes: text('notes'),
    operator_user_id: text('operator_user_id'),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mo_runs_mo_id').on(table.tenant_id, table.manufacturing_order_id),
  ],
);

export const mo_output_inspections = pgTable(
  'mo_output_inspections',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    manufacturing_order_id: text('manufacturing_order_id').notNull().references(() => manufacturing_orders.id, { onDelete: 'cascade' }),
    run_id: text('run_id').references(() => mo_execution_runs.id, { onDelete: 'set null' }),
    inspection_number: text('inspection_number').notNull(),
    status: text('status').notNull().default('PENDING'), // PENDING, ACCEPTED, QUARANTINED, REJECTED
    inspected_quantity: integer('inspected_quantity').notNull(),
    accepted_quantity: integer('accepted_quantity').notNull().default(0),
    quarantined_quantity: integer('quarantined_quantity').notNull().default(0),
    rejected_quantity: integer('rejected_quantity').notNull().default(0),
    failure_reason: text('failure_reason'),
    notes: text('notes'),
    inspector_user_id: text('inspector_user_id'),
    inspected_at: timestamp('inspected_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_mo_inspections_tenant_number').on(table.tenant_id, table.inspection_number),
    index('idx_mo_inspections_mo_id').on(table.tenant_id, table.manufacturing_order_id),
    index('idx_mo_inspections_status').on(table.tenant_id, table.status),
  ],
);

export const mo_scrap_records = pgTable(
  'mo_scrap_records',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    manufacturing_order_id: text('manufacturing_order_id').notNull().references(() => manufacturing_orders.id, { onDelete: 'cascade' }),
    scrap_number: text('scrap_number').notNull(),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    reason_code: text('reason_code').notNull().default('DEFECT'), // DEFECT, PROCESS_LOSS, MACHINE_FAILURE, EXPIRED, OTHER
    is_process_loss: boolean('is_process_loss').notNull().default(false),
    stock_movement_id: text('stock_movement_id'),
    notes: text('notes'),
    operator_user_id: text('operator_user_id'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_mo_scrap_tenant_number').on(table.tenant_id, table.scrap_number),
    index('idx_mo_scrap_mo_id').on(table.tenant_id, table.manufacturing_order_id),
    index('idx_mo_scrap_variant_id').on(table.tenant_id, table.variant_id),
  ],
);

export const mo_component_substitutions = pgTable(
  'mo_component_substitutions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    manufacturing_order_id: text('manufacturing_order_id').notNull().references(() => manufacturing_orders.id, { onDelete: 'cascade' }),
    original_variant_id: text('original_variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    substituted_variant_id: text('substituted_variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    approved_by: text('approved_by'),
    reason: text('reason'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mo_substitutions_mo_id').on(table.tenant_id, table.manufacturing_order_id),
  ],
);
