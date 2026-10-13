import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { warehouses, storage_locations } from './warehouse.js';

export const return_authorizations = pgTable(
  'return_authorizations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    rma_number: text('rma_number').notNull(),
    type: text('type').notNull(), // CUSTOMER_RETURN, VENDOR_RETURN, INTERNAL_TRANSFER_RETURN
    status: text('status').notNull(), // DRAFT, REQUESTED, APPROVED, PARTIALLY_RECEIVED, RECEIVED, REJECTED, CANCELLED, COMPLETED
    customer_id: text('customer_id'),
    customer_name: text('customer_name'),
    customer_email: text('customer_email'),
    original_order_id: text('original_order_id'),
    original_order_number: text('original_order_number'),
    resolution_preference: text('resolution_preference').notNull().default('REFUND'),
    restocking_fee_bp: integer('restocking_fee_bp').notNull().default(0), // basis points (1500 = 15.00%)
    return_tracking_number: text('return_tracking_number'),
    carrier_code: text('carrier_code'),
    receiving_location_id: text('receiving_location_id').references(() => storage_locations.id, { onDelete: 'set null' }),
    approved_by: text('approved_by'),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    rejection_reason: text('rejection_reason'),
    received_at: timestamp('received_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_rma_tenant_number').on(table.tenant_id, table.rma_number),
    index('idx_rma_tenant_warehouse').on(table.tenant_id, table.warehouse_id),
    index('idx_rma_tenant_status').on(table.tenant_id, table.status),
    index('idx_rma_tenant_customer').on(table.tenant_id, table.customer_id),
    index('idx_rma_tenant_order').on(table.tenant_id, table.original_order_id),
  ],
);

export const return_lines = pgTable(
  'return_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    rma_id: text('rma_id').notNull().references(() => return_authorizations.id, { onDelete: 'cascade' }),
    order_id: text('order_id'),
    order_line_id: text('order_line_id'),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    item_name: text('item_name').notNull(),
    quantity_authorized: integer('quantity_authorized').notNull(),
    quantity_received: integer('quantity_received').notNull().default(0),
    unit_price_cents: integer('unit_price_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    reason_code: text('reason_code').notNull(),
    customer_notes: text('customer_notes'),
    batch_id: text('batch_id'),
    serial_numbers: jsonb('serial_numbers'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_return_lines_tenant_rma').on(table.tenant_id, table.rma_id),
    index('idx_return_lines_tenant_variant').on(table.tenant_id, table.variant_id),
    index('idx_return_lines_tenant_sku').on(table.tenant_id, table.sku),
  ],
);

export const quality_inspections = pgTable(
  'quality_inspections',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    rma_id: text('rma_id').notNull().references(() => return_authorizations.id, { onDelete: 'cascade' }),
    return_line_id: text('return_line_id').notNull().references(() => return_lines.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    quantity_inspected: integer('quantity_inspected').notNull(),
    condition_grade: text('condition_grade').notNull(), // GRADE_A_NEW, GRADE_B_OPEN_BOX, GRADE_C_REFURBISHABLE, GRADE_D_SALVAGE, SCRAP_HAZMAT
    status: text('status').notNull(), // PENDING, IN_PROGRESS, PASSED, FAILED, QUARANTINED
    failure_reason_code: text('failure_reason_code'),
    inspector_id: text('inspector_id'),
    quarantine_location_id: text('quarantine_location_id').references(() => storage_locations.id, { onDelete: 'set null' }),
    inspection_notes: text('inspection_notes'),
    inspected_at: timestamp('inspected_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_qc_tenant_rma').on(table.tenant_id, table.rma_id),
    index('idx_qc_tenant_line').on(table.tenant_id, table.return_line_id),
    index('idx_qc_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const disposition_actions = pgTable(
  'disposition_actions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    rma_id: text('rma_id').notNull().references(() => return_authorizations.id, { onDelete: 'cascade' }),
    inspection_id: text('inspection_id').references(() => quality_inspections.id, { onDelete: 'set null' }),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    quantity: integer('quantity').notNull(),
    action_type: text('action_type').notNull(), // RESTOCK_TO_PRIMARY, TRANSFER_TO_REFURB, RETURN_TO_VENDOR, SCRAP_DISPOSAL
    destination_location_id: text('destination_location_id').notNull().references(() => storage_locations.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('PLANNED'), // PLANNED, EXECUTED, CANCELLED
    gross_refund_cents: integer('gross_refund_cents').notNull().default(0),
    restocking_fee_cents: integer('restocking_fee_cents').notNull().default(0),
    net_refund_cents: integer('net_refund_cents').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    executed_by: text('executed_by'),
    executed_at: timestamp('executed_at', { withTimezone: true }),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_disposition_tenant_rma').on(table.tenant_id, table.rma_id),
    index('idx_disposition_tenant_action').on(table.tenant_id, table.action_type),
    index('idx_disposition_tenant_status').on(table.tenant_id, table.status),
  ],
);
