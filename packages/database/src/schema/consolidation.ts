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
import { accounting_books } from './finance.js';

export const consolidation_groups = pgTable(
  'consolidation_groups',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    group_code: text('group_code').notNull(),
    name: text('name').notNull(),
    parent_company_id: text('parent_company_id').notNull(),
    reporting_currency: text('reporting_currency').notNull().default('USD'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_consol_groups_tenant_code').on(table.tenant_id, table.group_code),
    index('idx_consol_groups_tenant').on(table.tenant_id),
  ],
);

export const consolidation_group_members = pgTable(
  'consolidation_group_members',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    group_id: text('group_id').notNull().references(() => consolidation_groups.id, { onDelete: 'cascade' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id').notNull().references(() => accounting_books.id, { onDelete: 'restrict' }),
    ownership_percentage_basis_points: integer('ownership_percentage_basis_points').notNull().default(10000), // 10000 = 100.00%
    effective_from: timestamp('effective_from', { withTimezone: true }).notNull(),
    effective_to: timestamp('effective_to', { withTimezone: true }),
    inclusion_status: text('inclusion_status').notNull().default('FULL'), // FULL, EQUITY, EXCLUDED
    functional_currency: text('functional_currency').notNull().default('USD'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_consol_members_tenant_group_company').on(table.tenant_id, table.group_id, table.company_id),
    index('idx_consol_members_tenant_group').on(table.tenant_id, table.group_id),
  ],
);

export const group_chart_of_accounts = pgTable(
  'group_chart_of_accounts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    group_id: text('group_id').notNull().references(() => consolidation_groups.id, { onDelete: 'cascade' }),
    account_code: text('account_code').notNull(),
    account_name: text('account_name').notNull(),
    account_type: text('account_type').notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    normal_balance: text('normal_balance').notNull(), // DEBIT, CREDIT
    is_elimination_target: boolean('is_elimination_target').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_group_coa_tenant_group_code').on(table.tenant_id, table.group_id, table.account_code),
    index('idx_group_coa_tenant_group').on(table.tenant_id, table.group_id),
  ],
);

export const entity_account_mappings = pgTable(
  'entity_account_mappings',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    group_id: text('group_id').notNull().references(() => consolidation_groups.id, { onDelete: 'cascade' }),
    company_id: text('company_id').notNull(),
    source_account_code: text('source_account_code').notNull(),
    group_account_code: text('group_account_code').notNull(),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_entity_account_map_unique').on(table.tenant_id, table.group_id, table.company_id, table.source_account_code),
    index('idx_entity_account_map_group').on(table.tenant_id, table.group_id),
  ],
);

export const consolidation_runs = pgTable(
  'consolidation_runs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    group_id: text('group_id').notNull().references(() => consolidation_groups.id, { onDelete: 'restrict' }),
    period_id: text('period_id').notNull(),
    period_name: text('period_name').notNull(),
    reporting_currency: text('reporting_currency').notNull().default('USD'),
    status: text('status').notNull().default('DRAFT'), // DRAFT, VALIDATING, READY, CONSOLIDATING, COMPLETED, FAILED, SUPERSEDED
    operation_id: text('operation_id').notNull(), // durable idempotency
    fx_rate_version: text('fx_rate_version').notNull().default('v1'),
    run_by: text('run_by').notNull(),
    total_entities_included: integer('total_entities_included').notNull().default(0),
    total_eliminations_minor: text('total_eliminations_minor').notNull().default('0'),
    consolidated_net_income_minor: text('consolidated_net_income_minor').notNull().default('0'),
    is_balanced: boolean('is_balanced').notNull().default(true),
    notes: text('notes'),
    finalized_at: timestamp('finalized_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_consol_runs_operation_id').on(table.tenant_id, table.operation_id),
    index('idx_consol_runs_group_period').on(table.tenant_id, table.group_id, table.period_id),
    index('idx_consol_runs_status').on(table.tenant_id, table.status),
  ],
);

export const consolidation_run_entities = pgTable(
  'consolidation_run_entities',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    run_id: text('run_id').notNull().references(() => consolidation_runs.id, { onDelete: 'cascade' }),
    company_id: text('company_id').notNull(),
    book_id: text('book_id').notNull(),
    source_currency: text('source_currency').notNull(),
    fx_rate_basis_points: integer('fx_rate_basis_points').notNull().default(10000), // 10000 = 1.0000
    local_net_income_minor: text('local_net_income_minor').notNull().default('0'),
    translated_net_income_minor: text('translated_net_income_minor').notNull().default('0'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_consol_run_entities_run').on(table.tenant_id, table.run_id),
  ],
);

export const consolidation_adjustments = pgTable(
  'consolidation_adjustments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    run_id: text('run_id').notNull().references(() => consolidation_runs.id, { onDelete: 'cascade' }),
    adjustment_type: text('adjustment_type').notNull(), // INTERCOMPANY_ELIMINATION, CURRENCY_TRANSLATION, EQUITY_ELIMINATION, MANUAL_ADJUSTMENT
    reference_type: text('reference_type'), // INTERCOMPANY_MATCH, REVALUATION
    reference_id: text('reference_id'),
    narration: text('narration').notNull(),
    total_debit_minor: text('total_debit_minor').notNull().default('0'),
    total_credit_minor: text('total_credit_minor').notNull().default('0'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_consol_adj_tenant_run').on(table.tenant_id, table.run_id),
  ],
);

export const consolidation_adjustment_lines = pgTable(
  'consolidation_adjustment_lines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    adjustment_id: text('adjustment_id').notNull().references(() => consolidation_adjustments.id, { onDelete: 'cascade' }),
    company_id: text('company_id'),
    group_account_code: text('group_account_code').notNull(),
    entry_type: text('entry_type').notNull(), // DEBIT, CREDIT
    amount_minor: text('amount_minor').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_consol_adj_lines_adj').on(table.tenant_id, table.adjustment_id),
  ],
);

export const intercompany_relationships = pgTable(
  'intercompany_relationships',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    primary_company_id: text('primary_company_id').notNull(),
    counterparty_company_id: text('counterparty_company_id').notNull(),
    relationship_type: text('relationship_type').notNull().default('SUBSIDIARY'), // PARENT, SUBSIDIARY, SISTER, AFFILIATE
    settlement_currency: text('settlement_currency').notNull().default('USD'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_interco_rel_unique').on(table.tenant_id, table.primary_company_id, table.counterparty_company_id),
    index('idx_interco_rel_tenant').on(table.tenant_id),
  ],
);

export const intercompany_transactions = pgTable(
  'intercompany_transactions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    transaction_reference: text('transaction_reference').notNull(),
    from_company_id: text('from_company_id').notNull(),
    to_company_id: text('to_company_id').notNull(),
    transaction_type: text('transaction_type').notNull(), // TRADE_SALE, TRADE_PURCHASE, SERVICE_CHARGE, LOAN, INTEREST, CASH_TRANSFER
    source_document_type: text('source_document_type').notNull(), // INVOICE, PAYMENT, TRANSFER, JOURNAL
    source_document_id: text('source_document_id').notNull(),
    currency: text('currency').notNull().default('USD'),
    amount_minor: text('amount_minor').notNull(),
    status: text('status').notNull().default('PENDING'), // PENDING, MATCHED, UNMATCHED, DISPUTED, ELIMINATED
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_interco_tx_ref').on(table.tenant_id, table.transaction_reference),
    index('idx_interco_tx_from_to').on(table.tenant_id, table.from_company_id, table.to_company_id),
    index('idx_interco_tx_status').on(table.tenant_id, table.status),
  ],
);

export const intercompany_matches = pgTable(
  'intercompany_matches',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    from_transaction_id: text('from_transaction_id').notNull().references(() => intercompany_transactions.id, { onDelete: 'cascade' }),
    to_transaction_id: text('to_transaction_id').references(() => intercompany_transactions.id, { onDelete: 'set null' }),
    match_status: text('match_status').notNull().default('MATCHED'), // MATCHED, PARTIAL, UNMATCHED_DIFFERENCE
    matched_amount_minor: text('matched_amount_minor').notNull(),
    discrepancy_minor: text('discrepancy_minor').notNull().default('0'),
    notes: text('notes'),
    matched_at: timestamp('matched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_interco_matches_from').on(table.tenant_id, table.from_transaction_id),
    index('idx_interco_matches_status').on(table.tenant_id, table.match_status),
  ],
);

export const elimination_rules = pgTable(
  'elimination_rules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    rule_code: text('rule_code').notNull(),
    name: text('name').notNull(),
    transaction_type: text('transaction_type').notNull(), // TRADE, SERVICE, LOAN, TRANSFER
    debit_group_account_code: text('debit_group_account_code').notNull(),
    credit_group_account_code: text('credit_group_account_code').notNull(),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_elim_rules_tenant_code').on(table.tenant_id, table.rule_code),
  ],
);
