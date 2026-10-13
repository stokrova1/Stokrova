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

export const tax_registrations = pgTable(
  'tax_registrations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    company_id: text('company_id').notNull(),
    jurisdiction_code: text('jurisdiction_code').notNull(), // US_CA, GB, NG, EU_DE
    tax_id_number: text('tax_id_number').notNull(),
    tax_type: text('tax_type').notNull().default('VAT'), // VAT, SALES_TAX, GST, WITHHOLDING
    filing_frequency: text('filing_frequency').notNull().default('MONTHLY'), // MONTHLY, QUARTERLY, ANNUAL
    effective_from: timestamp('effective_from', { withTimezone: true }).notNull(),
    effective_to: timestamp('effective_to', { withTimezone: true }),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, CANCELLED
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_tax_reg_tenant_company_jur_type').on(table.tenant_id, table.company_id, table.jurisdiction_code, table.tax_type),
    index('idx_tax_reg_tenant_company').on(table.tenant_id, table.company_id),
  ],
);

export const tax_jurisdiction_configs = pgTable(
  'tax_jurisdiction_configs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    jurisdiction_code: text('jurisdiction_code').notNull(),
    version: integer('version').notNull().default(1),
    standard_rate_basis_points: integer('standard_rate_basis_points').notNull(), // e.g. 750 for 7.5%, 2000 for 20%
    reduced_rate_basis_points: integer('reduced_rate_basis_points').notNull().default(0),
    zero_rate_basis_points: integer('zero_rate_basis_points').notNull().default(0),
    output_tax_account_code: text('output_tax_account_code').notNull().default('2100'),
    input_tax_account_code: text('input_tax_account_code').notNull().default('2105'),
    effective_from: timestamp('effective_from', { withTimezone: true }).notNull(),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_tax_jur_config_tenant_jur_ver').on(table.tenant_id, table.jurisdiction_code, table.version),
  ],
);

export const tax_filing_periods = pgTable(
  'tax_filing_periods',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    registration_id: text('registration_id').notNull().references(() => tax_registrations.id, { onDelete: 'cascade' }),
    period_name: text('period_name').notNull(), // '2026-Q3', '2026-M09'
    start_date: timestamp('start_date', { withTimezone: true }).notNull(),
    end_date: timestamp('end_date', { withTimezone: true }).notNull(),
    due_date: timestamp('due_date', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('OPEN'), // OPEN, PREPARED, APPROVED, SUBMITTED, CLOSED
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_tax_period_tenant_reg_name').on(table.tenant_id, table.registration_id, table.period_name),
    index('idx_tax_period_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const tax_returns = pgTable(
  'tax_returns',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    filing_period_id: text('filing_period_id').notNull().references(() => tax_filing_periods.id, { onDelete: 'cascade' }),
    company_id: text('company_id').notNull(),
    operation_id: text('operation_id').notNull(), // durable idempotency
    reporting_currency: text('reporting_currency').notNull().default('USD'),
    total_taxable_sales_minor: text('total_taxable_sales_minor').notNull().default('0'),
    total_output_tax_minor: text('total_output_tax_minor').notNull().default('0'),
    total_taxable_purchases_minor: text('total_taxable_purchases_minor').notNull().default('0'),
    total_recoverable_input_tax_minor: text('total_recoverable_input_tax_minor').notNull().default('0'),
    net_tax_due_minor: text('net_tax_due_minor').notNull().default('0'), // Output Tax - Recoverable Input Tax
    gl_control_account_balance_minor: text('gl_control_account_balance_minor').notNull().default('0'),
    reconciliation_difference_minor: text('reconciliation_difference_minor').notNull().default('0'),
    status: text('status').notNull().default('DRAFT'), // DRAFT, PREPARED, VALIDATED, APPROVED, SUBMITTED, ACCEPTED, REJECTED
    prepared_by: text('prepared_by').notNull(),
    approved_by: text('approved_by'),
    submitted_at: timestamp('submitted_at', { withTimezone: true }),
    filing_reference: text('filing_reference'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_tax_returns_tenant_period').on(table.tenant_id, table.filing_period_id),
    uniqueIndex('idx_tax_returns_operation_id').on(table.tenant_id, table.operation_id),
    index('idx_tax_returns_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const tax_filing_submissions = pgTable(
  'tax_filing_submissions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    tax_return_id: text('tax_return_id').notNull().references(() => tax_returns.id, { onDelete: 'cascade' }),
    submission_attempt: integer('submission_attempt').notNull().default(1),
    provider_type: text('provider_type').notNull().default('MOCK_TAX_PORTAL'),
    submission_reference: text('submission_reference').notNull(),
    provider_status: text('provider_status').notNull().default('SUBMITTED'), // SUBMITTED, ACCEPTED, REJECTED, TIMEOUT_PENDING
    acknowledgement_token: text('acknowledgement_token'),
    error_message: text('error_message'),
    submitted_payload_hash: text('submitted_payload_hash').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_tax_sub_tenant_return').on(table.tenant_id, table.tax_return_id),
    index('idx_tax_sub_ref').on(table.tenant_id, table.submission_reference),
  ],
);
