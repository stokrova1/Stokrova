import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { chart_of_accounts, journal_entries } from './finance.js';

export const bank_accounts = pgTable(
  'bank_accounts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    bank_name: text('bank_name').notNull(),
    account_name: text('account_name').notNull(),
    account_number_masked: text('account_number_masked').notNull(),
    currency: text('currency').notNull().default('USD'),
    gl_account_id: text('gl_account_id').notNull().references(() => chart_of_accounts.id, { onDelete: 'restrict' }),
    current_balance_minor: text('current_balance_minor').notNull().default('0'),
    statement_balance_minor: text('statement_balance_minor').notNull().default('0'),
    last_reconciled_at: timestamp('last_reconciled_at', { withTimezone: true }),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, INACTIVE, FROZEN
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_bank_acc_tenant_company_acc').on(table.tenant_id, table.company_id, table.account_number_masked),
    index('idx_bank_acc_tenant_company').on(table.tenant_id, table.company_id),
  ],
);

export const bank_connections = pgTable(
  'bank_connections',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    provider_type: text('provider_type').notNull().default('MANUAL'), // MANUAL, PLAID, OPEN_BANKING, SANDBOX
    provider_connection_id: text('provider_connection_id').notNull(),
    status: text('status').notNull().default('CONNECTED'), // CONNECTED, DISCONNECTED, ERROR
    last_sync_at: timestamp('last_sync_at', { withTimezone: true }),
    sync_cursor: text('sync_cursor'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_bank_conn_tenant_company_provider').on(table.tenant_id, table.company_id, table.provider_connection_id),
  ],
);

export const bank_transactions = pgTable(
  'bank_transactions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    bank_account_id: text('bank_account_id').notNull().references(() => bank_accounts.id, { onDelete: 'cascade' }),
    external_transaction_id: text('external_transaction_id').notNull(),
    transaction_date: timestamp('transaction_date', { withTimezone: true }).notNull(),
    amount_minor: text('amount_minor').notNull(), // positive for deposit, negative for withdrawal
    currency: text('currency').notNull().default('USD'),
    transaction_type: text('transaction_type').notNull().default('OTHER'), // DEPOSIT, WITHDRAWAL, FEE, INTEREST, TRANSFER
    description: text('description').notNull(),
    matching_status: text('matching_status').notNull().default('UNMATCHED'), // UNMATCHED, MATCHED, PARTIALLY_MATCHED, REVIEW_REQUIRED
    matched_journal_entry_id: text('matched_journal_entry_id').references(() => journal_entries.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_bank_tx_tenant_acc_ext').on(table.tenant_id, table.bank_account_id, table.external_transaction_id),
    index('idx_bank_tx_tenant_acc_status').on(table.tenant_id, table.bank_account_id, table.matching_status),
  ],
);

export const cash_transfers = pgTable(
  'cash_transfers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    transfer_number: text('transfer_number').notNull(),
    operation_id: text('operation_id').notNull(), // durable idempotency
    source_company_id: text('source_company_id').notNull(),
    source_bank_account_id: text('source_bank_account_id').notNull().references(() => bank_accounts.id, { onDelete: 'restrict' }),
    destination_company_id: text('destination_company_id').notNull(),
    destination_bank_account_id: text('destination_bank_account_id').notNull().references(() => bank_accounts.id, { onDelete: 'restrict' }),
    amount_minor: text('amount_minor').notNull(),
    currency: text('currency').notNull().default('USD'),
    is_intercompany: boolean('is_intercompany').notNull().default(false),
    status: text('status').notNull().default('DRAFT'), // DRAFT, AWAITING_APPROVAL, APPROVED, INITIATED, SETTLED, REJECTED, CANCELLED
    requires_dual_approval: boolean('requires_dual_approval').notNull().default(false),
    initiated_by: text('initiated_by').notNull(),
    approved_by: text('approved_by'),
    second_approved_by: text('second_approved_by'),
    settled_at: timestamp('settled_at', { withTimezone: true }),
    journal_entry_id: text('journal_entry_id').references(() => journal_entries.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_cash_transfers_operation_id').on(table.tenant_id, table.operation_id),
    uniqueIndex('idx_cash_transfers_tenant_num').on(table.tenant_id, table.transfer_number),
    index('idx_cash_transfers_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const cash_forecasts = pgTable(
  'cash_forecasts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    forecast_date: timestamp('forecast_date', { withTimezone: true }).notNull(),
    horizon_days: integer('horizon_days').notNull().default(30),
    currency: text('currency').notNull().default('USD'),
    opening_cash_minor: text('opening_cash_minor').notNull(),
    projected_inflows_minor: text('projected_inflows_minor').notNull(),
    projected_outflows_minor: text('projected_outflows_minor').notNull(),
    projected_closing_minor: text('projected_closing_minor').notNull(),
    assumptions: text('assumptions'), // JSON string of components
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cash_forecasts_tenant_company_date').on(table.tenant_id, table.company_id, table.forecast_date),
  ],
);
