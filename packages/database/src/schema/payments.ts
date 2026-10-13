import { pgTable, text, boolean, integer, bigint, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { users } from './users.js';
import { registers, register_sessions } from './work_centers.js';

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    order_id: text('order_id'),
    invoice_id: text('invoice_id'),
    register_session_id: text('register_session_id').references(() => register_sessions.id),
    amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency_code: text('currency_code').notNull().default('NGN'),
    payment_method: text('payment_method').notNull(), // CASH, BANK_TRANSFER, CARD, STORE_CREDIT
    status: text('status').notNull(), // PENDING, CONFIRMED, CAPTURED, FAILED, REFUNDED
    provider_reference: text('provider_reference'),
    captured_by_user_id: text('captured_by_user_id').notNull().references(() => users.id),
    operation_id: text('operation_id'), // Idempotency key from client outbox
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_payments_operation_id').on(table.tenant_id, table.operation_id),
    index('idx_payments_order').on(table.tenant_id, table.order_id),
    index('idx_payments_session').on(table.register_session_id),
  ],
);

export const receipt_prints = pgTable(
  'receipt_prints',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    order_id: text('order_id').notNull(),
    payment_id: text('payment_id').references(() => payments.id),
    receipt_number: text('receipt_number').notNull(),
    printed_by_user_id: text('printed_by_user_id').notNull().references(() => users.id),
    register_id: text('register_id').references(() => registers.id),
    print_count: integer('print_count').notNull().default(1),
    is_reprint: boolean('is_reprint').notNull().default(false),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_receipts_order').on(table.tenant_id, table.order_id),
  ],
);

export const multi_tender_checkouts = pgTable(
  'multi_tender_checkouts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    order_id: text('order_id').notNull(),
    pos_session_id: text('pos_session_id'),
    total_payable_minor: bigint('total_payable_minor', { mode: 'bigint' }).notNull(),
    total_tendered_minor: bigint('total_tendered_minor', { mode: 'bigint' }).notNull(),
    total_allocated_minor: bigint('total_allocated_minor', { mode: 'bigint' }).notNull(),
    change_due_minor: bigint('change_due_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    remaining_balance_minor: bigint('remaining_balance_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    is_fully_paid: boolean('is_fully_paid').notNull().default(false),
    pos_cash_movement_id: text('pos_cash_movement_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_multi_checkouts_tenant_order').on(table.tenant_id, table.order_id),
  ],
);

export const checkout_tenders = pgTable(
  'checkout_tenders',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    checkout_id: text('checkout_id').notNull().references(() => multi_tender_checkouts.id, { onDelete: 'cascade' }),
    idempotency_key: text('idempotency_key').notNull(),
    tender_type: text('tender_type').notNull(), // CASH, CARD, STORE_CREDIT, GIFT_CARD, LOYALTY_POINTS, BANK_TRANSFER
    tendered_minor: bigint('tendered_minor', { mode: 'bigint' }).notNull(),
    allocated_minor: bigint('allocated_minor', { mode: 'bigint' }).notNull(),
    change_returned_minor: bigint('change_returned_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    currency_code: text('currency_code').notNull().default('USD'),
    provider_reference: text('provider_reference'),
    terminal_id: text('terminal_id'),
    customer_account_id: text('customer_account_id'),
    gift_card_code: text('gift_card_code'),
    notes: text('notes'),
    captured_at: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_checkout_tenders_tenant_key').on(table.tenant_id, table.idempotency_key),
    index('idx_checkout_tenders_checkout').on(table.checkout_id),
  ],
);
