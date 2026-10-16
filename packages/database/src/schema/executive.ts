import { pgTable, text, timestamp, bigint, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * Imported sales records (spreadsheets, external tills, legacy systems).
 * Amounts are signed minor units so refunds subtract; unknown costs stay null.
 * (tenant_id, reference) is unique so re-importing the same file never doubles totals.
 */
export const executive_sales_entries = pgTable(
  'executive_sales_entries',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    reference: text('reference').notNull(),
    sale_date: date('sale_date').notNull(),
    net_sales_minor: bigint('net_sales_minor', { mode: 'bigint' }).notNull(),
    cogs_minor: bigint('cogs_minor', { mode: 'bigint' }),
    currency_code: text('currency_code').notNull().default('NGN'),
    source: text('source').notNull().default('SPREADSHEET'), // SPREADSHEET, API, LEGACY
    source_file_key: text('source_file_key'),
    imported_by_user_id: text('imported_by_user_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_exec_sales_tenant_reference').on(table.tenant_id, table.reference),
    index('idx_exec_sales_tenant_date').on(table.tenant_id, table.sale_date),
  ],
);
