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

export const accounting_books = pgTable(
  'accounting_books',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    functional_currency: text('functional_currency').notNull().default('USD'),
    fiscal_year_start_month: integer('fiscal_year_start_month').notNull().default(1),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_books_tenant_company_code').on(table.tenant_id, table.company_id, table.code),
    index('idx_books_tenant_company').on(table.tenant_id, table.company_id),
  ],
);

export const fiscal_years = pgTable(
  'fiscal_years',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id').notNull().references(() => accounting_books.id, { onDelete: 'cascade' }),
    year_code: text('year_code').notNull(),
    start_date: timestamp('start_date', { withTimezone: true }).notNull(),
    end_date: timestamp('end_date', { withTimezone: true }).notNull(),
    is_closed: boolean('is_closed').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_fy_tenant_book_year').on(table.tenant_id, table.book_id, table.year_code),
    index('idx_fy_tenant_company').on(table.tenant_id, table.company_id),
  ],
);

export const accounting_periods = pgTable(
  'accounting_periods',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id').notNull().references(() => accounting_books.id, { onDelete: 'cascade' }),
    fiscal_year_id: text('fiscal_year_id').notNull().references(() => fiscal_years.id, { onDelete: 'cascade' }),
    period_number: integer('period_number').notNull(),
    name: text('name').notNull(),
    start_date: timestamp('start_date', { withTimezone: true }).notNull(),
    end_date: timestamp('end_date', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('OPEN'), // OPEN, CLOSED, LOCKED
    closed_at: timestamp('closed_at', { withTimezone: true }),
    closed_by: text('closed_by'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_period_tenant_book_fy_num').on(table.tenant_id, table.book_id, table.fiscal_year_id, table.period_number),
    index('idx_period_tenant_status').on(table.tenant_id, table.status),
    index('idx_period_dates').on(table.tenant_id, table.start_date, table.end_date),
  ],
);

export const chart_of_accounts = pgTable(
  'chart_of_accounts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id'),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    subtype: text('subtype').notNull(),
    normal_balance: text('normal_balance').notNull(), // DEBIT, CREDIT
    parent_account_id: text('parent_account_id'),
    currency: text('currency').notNull().default('USD'),
    is_active: boolean('is_active').notNull().default(true),
    is_reconciled: boolean('is_reconciled').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_coa_tenant_company_code').on(table.tenant_id, table.company_id, table.code),
    index('idx_coa_tenant_type').on(table.tenant_id, table.type),
    index('idx_coa_tenant_company').on(table.tenant_id, table.company_id),
    index('idx_coa_tenant_book').on(table.tenant_id, table.book_id),
  ],
);

export const journal_entries = pgTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id'),
    period_id: text('period_id'),
    entry_number: text('entry_number').notNull(),
    status: text('status').notNull().default('DRAFT'), // DRAFT, POSTED, REVERSED
    source_type: text('source_type').notNull().default('MANUAL'),
    source_id: text('source_id'),
    reversal_of_entry_id: text('reversal_of_entry_id'),
    reversal_entry_id: text('reversal_entry_id'),
    narration: text('narration').notNull(),
    posting_date: timestamp('posting_date', { withTimezone: true }).notNull(),
    total_debit_minor: text('total_debit_minor').notNull(),
    total_credit_minor: text('total_credit_minor').notNull(),
    currency: text('currency').notNull().default('USD'),
    posted_at: timestamp('posted_at', { withTimezone: true }),
    posted_by: text('posted_by'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_je_tenant_number').on(table.tenant_id, table.entry_number),
    index('idx_je_tenant_company_status').on(table.tenant_id, table.company_id, table.status),
    index('idx_je_tenant_posting_date').on(table.tenant_id, table.posting_date),
    index('idx_je_tenant_source').on(table.tenant_id, table.source_type, table.source_id),
    index('idx_je_tenant_book_period').on(table.tenant_id, table.book_id, table.period_id),
  ],
);

export const journal_entry_lines = pgTable(
  'journal_entry_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    journal_entry_id: text('journal_entry_id').notNull().references(() => journal_entries.id, { onDelete: 'cascade' }),
    account_id: text('account_id').notNull().references(() => chart_of_accounts.id, { onDelete: 'restrict' }),
    debit_minor: text('debit_minor').notNull().default('0'),
    credit_minor: text('credit_minor').notNull().default('0'),
    currency: text('currency').notNull().default('USD'),
    description: text('description'),
    reference_entity_type: text('reference_entity_type'),
    reference_entity_id: text('reference_entity_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_je_lines_tenant_je').on(table.tenant_id, table.journal_entry_id),
    index('idx_je_lines_tenant_account').on(table.tenant_id, table.account_id),
  ],
);

export const tax_groups = pgTable(
  'tax_groups',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    tax_rate_ids: text('tax_rate_ids').notNull(), // JSON array string
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_tax_groups_tenant_code').on(table.tenant_id, table.code),
  ],
);

export const accounting_posting_rules = pgTable(
  'accounting_posting_rules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id').notNull().references(() => accounting_books.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(),
    rule_code: text('rule_code').notNull(),
    description: text('description'),
    debit_account_code: text('debit_account_code').notNull(),
    credit_account_code: text('credit_account_code').notNull(),
    is_active: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_posting_rules_tenant_company_event_code').on(table.tenant_id, table.company_id, table.event_type, table.rule_code),
    index('idx_posting_rules_tenant_event').on(table.tenant_id, table.event_type),
  ],
);

export const accounting_source_event_records = pgTable(
  'accounting_source_event_records',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id').notNull(),
    source_module: text('source_module').notNull(),
    event_type: text('event_type').notNull(),
    source_event_id: text('source_event_id').notNull(),
    operation_id: text('operation_id').notNull(), // Durable idempotency key
    journal_entry_id: text('journal_entry_id').references(() => journal_entries.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('POSTED'), // PENDING, POSTED, FAILED, QUARANTINED
    error_details: text('error_details'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_accounting_source_events_idempotency').on(table.tenant_id, table.company_id, table.source_module, table.operation_id),
    index('idx_accounting_source_events_status').on(table.tenant_id, table.status),
    index('idx_accounting_source_events_source_id').on(table.tenant_id, table.source_event_id),
  ],
);

export const reconciliation_records = pgTable(
  'reconciliation_records',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id').notNull(),
    reconciliation_type: text('reconciliation_type').notNull(), // AR, AP, INVENTORY, GRNI, CASH, WIP
    as_of_date: timestamp('as_of_date', { withTimezone: true }).notNull(),
    gl_account_id: text('gl_account_id').notNull().references(() => chart_of_accounts.id, { onDelete: 'restrict' }),
    gl_balance_minor: text('gl_balance_minor').notNull(),
    subledger_balance_minor: text('subledger_balance_minor').notNull(),
    discrepancy_minor: text('discrepancy_minor').notNull(),
    status: text('status').notNull().default('BALANCED'), // BALANCED, DISCREPANCY, ADJUSTED
    performed_by: text('performed_by').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_reconciliation_tenant_type').on(table.tenant_id, table.company_id, table.reconciliation_type),
    index('idx_reconciliation_as_of').on(table.tenant_id, table.as_of_date),
  ],
);
