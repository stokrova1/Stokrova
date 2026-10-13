/**
 * Procurement, Purchasing, Goods Receiving & Landed Cost Database Schema (Phase 4)
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
import { warehouses } from './warehouse.js';

// ==========================================
// 4A: Suppliers & Vendor Product Mappings
// ==========================================

export const suppliers = pgTable(
  'suppliers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    tax_id: text('tax_id'),
    currency_code: text('currency_code').notNull().default('USD'),
    payment_terms: text('payment_terms').notNull().default('NET_30'),
    lead_time_days: integer('lead_time_days').notNull().default(7),
    status: text('status').notNull().default('ACTIVE'),
    email: text('email'),
    phone: text('phone'),
    website: text('website'),
    billing_address: text('billing_address'),
    shipping_address: text('shipping_address'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_suppliers_tenant_code').on(table.tenant_id, table.code),
    index('idx_suppliers_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const supplier_contacts = pgTable(
  'supplier_contacts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    title: text('title'),
    email: text('email'),
    phone: text('phone'),
    is_primary: boolean('is_primary').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sup_contacts_supplier').on(table.tenant_id, table.supplier_id),
  ],
);

export const supplier_product_mappings = pgTable(
  'supplier_product_mappings',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'cascade' }),
    supplier_sku: text('supplier_sku').notNull(),
    supplier_product_name: text('supplier_product_name'),
    minimum_order_quantity: integer('minimum_order_quantity').notNull().default(1),
    order_increment_quantity: integer('order_increment_quantity').notNull().default(1),
    unit_cost_minor: bigint('unit_cost_minor', { mode: 'bigint' }).notNull(),
    lead_time_days: integer('lead_time_days'),
    is_preferred: boolean('is_preferred').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_supplier_mappings_tenant_sup_var').on(table.tenant_id, table.supplier_id, table.variant_id),
    index('idx_supplier_mappings_variant').on(table.tenant_id, table.variant_id),
    index('idx_supplier_mappings_sku').on(table.tenant_id, table.supplier_sku),
  ],
);

// ==========================================
// 4B: Purchase Requests (Internal Requisitions)
// ==========================================

export const purchase_requests = pgTable(
  'purchase_requests',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    request_number: text('request_number').notNull(),
    requested_by: text('requested_by').notNull(),
    branch_id: text('branch_id'),
    destination_warehouse_id: text('destination_warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, CONVERTED
    required_by_date: timestamp('required_by_date', { withTimezone: true }),
    estimated_total_minor: bigint('estimated_total_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    preferred_supplier_id: text('preferred_supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    business_justification: text('business_justification'),
    notes: text('notes'),
    approved_by: text('approved_by'),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    converted_purchase_order_id: text('converted_purchase_order_id'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_purchase_requests_tenant_number').on(table.tenant_id, table.request_number),
    index('idx_purchase_requests_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const purchase_request_lines = pgTable(
  'purchase_request_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    request_id: text('request_id').notNull().references(() => purchase_requests.id, { onDelete: 'cascade' }),
    line_number: integer('line_number').notNull(),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    estimated_unit_cost_minor: bigint('estimated_unit_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    estimated_line_total_minor: bigint('estimated_line_total_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_pr_lines_request_id').on(table.tenant_id, table.request_id),
    index('idx_pr_lines_variant_id').on(table.tenant_id, table.variant_id),
  ],
);

// ==========================================
// 4C: RFQs & Supplier Quotations
// ==========================================

export const purchase_rfqs = pgTable(
  'purchase_rfqs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    rfq_number: text('rfq_number').notNull(),
    purchase_request_id: text('purchase_request_id').references(() => purchase_requests.id, { onDelete: 'set null' }),
    destination_warehouse_id: text('destination_warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('DRAFT'), // DRAFT, ISSUED, CLOSED, CANCELLED
    response_deadline: timestamp('response_deadline', { withTimezone: true }),
    currency_code: text('currency_code').notNull().default('USD'),
    notes: text('notes'),
    created_by: text('created_by'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_rfqs_tenant_number').on(table.tenant_id, table.rfq_number),
    index('idx_rfqs_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const purchase_rfq_lines = pgTable(
  'purchase_rfq_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    rfq_id: text('rfq_id').notNull().references(() => purchase_rfqs.id, { onDelete: 'cascade' }),
    line_number: integer('line_number').notNull(),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    target_unit_cost_minor: bigint('target_unit_cost_minor', { mode: 'bigint' }),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_rfq_lines_rfq_id').on(table.tenant_id, table.rfq_id),
  ],
);

export const purchase_rfq_suppliers = pgTable(
  'purchase_rfq_suppliers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    rfq_id: text('rfq_id').notNull().references(() => purchase_rfqs.id, { onDelete: 'cascade' }),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('INVITED'), // INVITED, QUOTED, DECLINED
    invited_at: timestamp('invited_at', { withTimezone: true }).defaultNow().notNull(),
    responded_at: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_rfq_sup_rfq_supplier').on(table.tenant_id, table.rfq_id, table.supplier_id),
  ],
);

export const supplier_quotations = pgTable(
  'supplier_quotations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    quotation_number: text('quotation_number').notNull(),
    supplier_quotation_reference: text('supplier_quotation_reference').notNull(),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    rfq_id: text('rfq_id').references(() => purchase_rfqs.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('RECEIVED'), // RECEIVED, UNDER_REVIEW, SELECTED, REJECTED, EXPIRED
    currency_code: text('currency_code').notNull().default('USD'),
    subtotal_minor: bigint('subtotal_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    tax_minor: bigint('tax_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_minor: bigint('total_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    lead_time_days: integer('lead_time_days'),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    payment_terms: text('payment_terms').notNull().default('NET_30'),
    notes: text('notes'),
    selected_at: timestamp('selected_at', { withTimezone: true }),
    converted_purchase_order_id: text('converted_purchase_order_id'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_supplier_quotes_tenant_number').on(table.tenant_id, table.quotation_number),
    index('idx_supplier_quotes_tenant_supplier').on(table.tenant_id, table.supplier_id),
    index('idx_supplier_quotes_tenant_rfq').on(table.tenant_id, table.rfq_id),
  ],
);

export const supplier_quotation_lines = pgTable(
  'supplier_quotation_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    quotation_id: text('quotation_id').notNull().references(() => supplier_quotations.id, { onDelete: 'cascade' }),
    line_number: integer('line_number').notNull(),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unit_cost_minor: bigint('unit_cost_minor', { mode: 'bigint' }).notNull(),
    discount_minor: bigint('discount_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    tax_rate_basis_points: integer('tax_rate_basis_points').notNull().default(0),
    line_total_minor: bigint('line_total_minor', { mode: 'bigint' }).notNull(),
    lead_time_days: integer('lead_time_days'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sq_lines_quotation_id').on(table.tenant_id, table.quotation_id),
  ],
);

// ==========================================
// 4D: Purchase Orders & Line Items
// ==========================================

export const purchase_orders = pgTable(
  'purchase_orders',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    po_number: text('po_number').notNull(),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    destination_warehouse_id: text('destination_warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('DRAFT'),
    priority: text('priority').notNull().default('NORMAL'),
    currency_code: text('currency_code').notNull().default('USD'),
    subtotal_minor: bigint('subtotal_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    tax_minor: bigint('tax_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    discount_minor: bigint('discount_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_minor: bigint('total_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    notes: text('notes'),
    expected_delivery_date: timestamp('expected_delivery_date', { withTimezone: true }),
    approved_by: text('approved_by'),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    issued_at: timestamp('issued_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    cancellation_reason: text('cancellation_reason'),
    created_by: text('created_by'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_po_tenant_number').on(table.tenant_id, table.po_number),
    index('idx_po_tenant_status').on(table.tenant_id, table.status),
    index('idx_po_tenant_supplier').on(table.tenant_id, table.supplier_id),
  ],
);

export const purchase_order_lines = pgTable(
  'purchase_order_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    purchase_order_id: text('purchase_order_id').notNull().references(() => purchase_orders.id, { onDelete: 'cascade' }),
    line_number: integer('line_number').notNull(),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    supplier_sku: text('supplier_sku'),
    quantity: integer('quantity').notNull(),
    received_quantity: integer('received_quantity').notNull().default(0),
    billed_quantity: integer('billed_quantity').notNull().default(0),
    unit_cost_minor: bigint('unit_cost_minor', { mode: 'bigint' }).notNull(),
    tax_rate_basis_points: integer('tax_rate_basis_points').notNull().default(0),
    line_subtotal_minor: bigint('line_subtotal_minor', { mode: 'bigint' }).notNull(),
    line_tax_minor: bigint('line_tax_minor', { mode: 'bigint' }).notNull(),
    line_total_minor: bigint('line_total_minor', { mode: 'bigint' }).notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_po_lines_po_id').on(table.tenant_id, table.purchase_order_id),
    index('idx_po_lines_variant_id').on(table.tenant_id, table.variant_id),
  ],
);

// ==========================================
// 4E: Goods Receiving (GRN) & Quarantine
// ==========================================

export const goods_receipts = pgTable(
  'goods_receipts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    grn_number: text('grn_number').notNull(),
    purchase_order_id: text('purchase_order_id').notNull().references(() => purchase_orders.id, { onDelete: 'restrict' }),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    destination_warehouse_id: text('destination_warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('DRAFT'),
    carrier: text('carrier'),
    tracking_number: text('tracking_number'),
    received_by: text('received_by').notNull(),
    received_at: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    inspected_by: text('inspected_by'),
    inspected_at: timestamp('inspected_at', { withTimezone: true }),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_grn_tenant_number').on(table.tenant_id, table.grn_number),
    index('idx_grn_tenant_po').on(table.tenant_id, table.purchase_order_id),
  ],
);

export const goods_receipt_lines = pgTable(
  'goods_receipt_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    goods_receipt_id: text('goods_receipt_id').notNull().references(() => goods_receipts.id, { onDelete: 'cascade' }),
    purchase_order_line_id: text('purchase_order_line_id').notNull().references(() => purchase_order_lines.id, { onDelete: 'restrict' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity_received: integer('quantity_received').notNull(),
    quantity_accepted: integer('quantity_accepted').notNull().default(0),
    quantity_quarantined: integer('quantity_quarantined').notNull().default(0),
    quantity_rejected: integer('quantity_rejected').notNull().default(0),
    quarantine_reason: text('quarantine_reason'),
    lot_number: text('lot_number'),
    internal_batch_number: text('internal_batch_number'),
    expiration_date: timestamp('expiration_date', { withTimezone: true }),
    target_location_id: text('target_location_id').notNull(),
    quarantine_location_id: text('quarantine_location_id'),
    unit_cost_minor: bigint('unit_cost_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_grn_lines_receipt_id').on(table.tenant_id, table.goods_receipt_id),
    index('idx_grn_lines_po_line_id').on(table.tenant_id, table.purchase_order_line_id),
  ],
);

// ==========================================
// 4F: Landed Cost Vouchers & Allocations
// ==========================================

export const landed_cost_vouchers = pgTable(
  'landed_cost_vouchers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    voucher_number: text('voucher_number').notNull(),
    allocation_method: text('allocation_method').notNull().default('BY_VALUE'),
    total_charges_minor: bigint('total_charges_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    currency_code: text('currency_code').notNull().default('USD'),
    status: text('status').notNull().default('DRAFT'),
    notes: text('notes'),
    posted_by: text('posted_by'),
    posted_at: timestamp('posted_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_landed_vouchers_tenant_number').on(table.tenant_id, table.voucher_number),
    index('idx_landed_vouchers_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const landed_cost_charges = pgTable(
  'landed_cost_charges',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    voucher_id: text('voucher_id').notNull().references(() => landed_cost_vouchers.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    description: text('description').notNull(),
    amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    index('idx_landed_charges_voucher').on(table.tenant_id, table.voucher_id),
  ],
);

export const landed_cost_line_allocations = pgTable(
  'landed_cost_line_allocations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    voucher_id: text('voucher_id').notNull().references(() => landed_cost_vouchers.id, { onDelete: 'cascade' }),
    goods_receipt_line_id: text('goods_receipt_line_id').notNull().references(() => goods_receipt_lines.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    received_quantity: integer('received_quantity').notNull(),
    original_line_cost_minor: bigint('original_line_cost_minor', { mode: 'bigint' }).notNull(),
    allocated_charge_minor: bigint('allocated_charge_minor', { mode: 'bigint' }).notNull(),
    final_line_cost_minor: bigint('final_line_cost_minor', { mode: 'bigint' }).notNull(),
    unit_landed_cost_minor: bigint('unit_landed_cost_minor', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    index('idx_landed_allocations_voucher').on(table.tenant_id, table.voucher_id),
  ],
);

// ==========================================
// 4G: Supplier Returns (Debit Notes / Returns)
// ==========================================

export const supplier_returns = pgTable(
  'supplier_returns',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    return_number: text('return_number').notNull(),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    purchase_order_id: text('purchase_order_id').notNull().references(() => purchase_orders.id, { onDelete: 'restrict' }),
    goods_receipt_id: text('goods_receipt_id').references(() => goods_receipts.id, { onDelete: 'set null' }),
    warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('DRAFT'), // DRAFT, AUTHORIZED, DISPATCHED, COMPLETED, CANCELLED
    reason: text('reason').notNull(), // DAMAGED, DEFECTIVE, WRONG_ITEM, EXCESS_DELIVERY, QUALITY_FAIL, EXPIRED, OTHER
    dispatched_at: timestamp('dispatched_at', { withTimezone: true }),
    authorized_by: text('authorized_by'),
    authorized_at: timestamp('authorized_at', { withTimezone: true }),
    carrier: text('carrier'),
    tracking_number: text('tracking_number'),
    credit_memo_reference: text('credit_memo_reference'),
    notes: text('notes'),
    created_by: text('created_by'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_sup_returns_tenant_number').on(table.tenant_id, table.return_number),
    index('idx_sup_returns_tenant_supplier').on(table.tenant_id, table.supplier_id),
    index('idx_sup_returns_tenant_po').on(table.tenant_id, table.purchase_order_id),
  ],
);

export const supplier_return_lines = pgTable(
  'supplier_return_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    return_id: text('return_id').notNull().references(() => supplier_returns.id, { onDelete: 'cascade' }),
    goods_receipt_line_id: text('goods_receipt_line_id').references(() => goods_receipt_lines.id, { onDelete: 'set null' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unit_cost_minor: bigint('unit_cost_minor', { mode: 'bigint' }).notNull(),
    line_total_minor: bigint('line_total_minor', { mode: 'bigint' }).notNull(),
    reason: text('reason'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sup_return_lines_return_id').on(table.tenant_id, table.return_id),
  ],
);

// ==========================================
// 4H: 3-Way Matching & Purchase Invoices
// ==========================================

export const purchase_invoices = pgTable(
  'purchase_invoices',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    invoice_number: text('invoice_number').notNull(),
    supplier_invoice_reference: text('supplier_invoice_reference').notNull(),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    purchase_order_id: text('purchase_order_id').notNull().references(() => purchase_orders.id, { onDelete: 'restrict' }),
    goods_receipt_id: text('goods_receipt_id').references(() => goods_receipts.id, { onDelete: 'set null' }),
    invoice_date: timestamp('invoice_date', { withTimezone: true }).notNull(),
    due_date: timestamp('due_date', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('DRAFT'),
    match_status: text('match_status').notNull().default('PERFECT_MATCH'),
    currency_code: text('currency_code').notNull().default('USD'),
    subtotal_minor: bigint('subtotal_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    tax_minor: bigint('tax_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    total_minor: bigint('total_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    paid_amount_minor: bigint('paid_amount_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    price_variance_minor: bigint('price_variance_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    quantity_variance: integer('quantity_variance').notNull().default(0),
    discrepancy_notes: text('discrepancy_notes'),
    approved_by: text('approved_by'),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_invoices_tenant_number').on(table.tenant_id, table.invoice_number),
    uniqueIndex('idx_invoices_tenant_supplier_ref').on(table.tenant_id, table.supplier_id, table.supplier_invoice_reference),
    index('idx_invoices_tenant_po').on(table.tenant_id, table.purchase_order_id),
    index('idx_invoices_tenant_supplier').on(table.tenant_id, table.supplier_id),
  ],
);

export const purchase_invoice_lines = pgTable(
  'purchase_invoice_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    invoice_id: text('invoice_id').notNull().references(() => purchase_invoices.id, { onDelete: 'cascade' }),
    purchase_order_line_id: text('purchase_order_line_id').notNull().references(() => purchase_order_lines.id, { onDelete: 'restrict' }),
    goods_receipt_line_id: text('goods_receipt_line_id').references(() => goods_receipt_lines.id, { onDelete: 'set null' }),
    variant_id: text('variant_id').notNull().references(() => product_variants.id, { onDelete: 'restrict' }),
    quantity_invoiced: integer('quantity_invoiced').notNull(),
    unit_price_minor: bigint('unit_price_minor', { mode: 'bigint' }).notNull(),
    tax_rate_basis_points: integer('tax_rate_basis_points').notNull().default(0),
    line_subtotal_minor: bigint('line_subtotal_minor', { mode: 'bigint' }).notNull(),
    line_tax_minor: bigint('line_tax_minor', { mode: 'bigint' }).notNull(),
    line_total_minor: bigint('line_total_minor', { mode: 'bigint' }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_invoice_lines_invoice').on(table.tenant_id, table.invoice_id),
  ],
);

// ==========================================
// 4I: Supplier Payments & Allocation
// ==========================================

export const supplier_payments = pgTable(
  'supplier_payments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    payment_number: text('payment_number').notNull(),
    supplier_id: text('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
    amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency_code: text('currency_code').notNull().default('USD'),
    payment_method: text('payment_method').notNull().default('BANK_TRANSFER'), // BANK_TRANSFER, CHECK, CASH, CREDIT_ADJUSTMENT, OTHER
    status: text('status').notNull().default('DISBURSED'), // PENDING, DISBURSED, FAILED, CANCELLED
    disbursed_at: timestamp('disbursed_at', { withTimezone: true }).defaultNow().notNull(),
    reference: text('reference'),
    idempotency_key: text('idempotency_key').notNull(),
    notes: text('notes'),
    created_by: text('created_by'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_sup_pmt_tenant_number').on(table.tenant_id, table.payment_number),
    uniqueIndex('idx_sup_pmt_tenant_idemp').on(table.tenant_id, table.idempotency_key),
    index('idx_sup_pmt_tenant_supplier').on(table.tenant_id, table.supplier_id),
  ],
);

export const supplier_payment_allocations = pgTable(
  'supplier_payment_allocations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    payment_id: text('payment_id').notNull().references(() => supplier_payments.id, { onDelete: 'cascade' }),
    purchase_invoice_id: text('purchase_invoice_id').notNull().references(() => purchase_invoices.id, { onDelete: 'restrict' }),
    allocated_amount_minor: bigint('allocated_amount_minor', { mode: 'bigint' }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sup_pmt_alloc_payment').on(table.tenant_id, table.payment_id),
    index('idx_sup_pmt_alloc_invoice').on(table.tenant_id, table.purchase_invoice_id),
  ],
);
