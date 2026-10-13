import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const rebate_agreements = pgTable(
  'rebate_agreements',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    agreement_number: text('agreement_number').notNull(),
    name: text('name').notNull(),
    rebate_type: text('rebate_type').notNull(), // CUSTOMER_VOLUME, CUSTOMER_SPEND, SUPPLIER_VOLUME, SUPPLIER_SPEND
    counterparty_type: text('counterparty_type').notNull(), // CUSTOMER, SUPPLIER
    counterparty_id: text('counterparty_id').notNull(),
    currency_code: text('currency_code').notNull().default('USD'),
    calculation_method: text('calculation_method').notNull().default('GRADUATED_TIERS'),
    settlement_frequency: text('settlement_frequency').notNull().default('QUARTERLY'),
    valid_from: timestamp('valid_from', { withTimezone: true }).notNull(),
    valid_until: timestamp('valid_until', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('ACTIVE'), // DRAFT, ACTIVE, EXPIRED, TERMINATED
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_rebate_agreements_num').on(
      table.tenant_id,
      table.agreement_number,
    ),
    index('idx_rebate_agreements_party').on(
      table.tenant_id,
      table.counterparty_id,
    ),
  ],
);

export const rebate_tiers = pgTable(
  'rebate_tiers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    agreement_id: text('agreement_id')
      .notNull()
      .references(() => rebate_agreements.id, { onDelete: 'cascade' }),
    tier_number: integer('tier_number').notNull(),
    threshold_quantity: integer('threshold_quantity'),
    threshold_amount_minor: text('threshold_amount_minor'),
    rebate_rate_bp: integer('rebate_rate_bp').notNull().default(0),
    fixed_rebate_per_unit_minor: text('fixed_rebate_per_unit_minor'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_rebate_tiers_unique').on(
      table.tenant_id,
      table.agreement_id,
      table.tier_number,
    ),
  ],
);

export const rebate_accruals = pgTable(
  'rebate_accruals',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    agreement_id: text('agreement_id')
      .notNull()
      .references(() => rebate_agreements.id, { onDelete: 'restrict' }),
    counterparty_id: text('counterparty_id').notNull(),
    period_identifier: text('period_identifier').notNull(), // e.g. "2026-Q1"
    eligible_quantity: integer('eligible_quantity').notNull().default(0),
    eligible_spend_minor: text('eligible_spend_minor').notNull().default('0'),
    calculated_accrual_minor: text('calculated_accrual_minor').notNull().default('0'),
    status: text('status').notNull().default('ACCRUED'), // ESTIMATE, ACCRUED, CLAIMED, APPROVED, SETTLED, DISPUTED
    credit_note_reference: text('credit_note_reference'),
    settlement_reference: text('settlement_reference'),
    operation_id: text('operation_id'),
    last_recalculated_at: timestamp('last_recalculated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_rebate_accruals_period').on(
      table.tenant_id,
      table.agreement_id,
      table.period_identifier,
    ),
    index('idx_rebate_accruals_party').on(
      table.tenant_id,
      table.counterparty_id,
    ),
    index('idx_rebate_accruals_status').on(
      table.tenant_id,
      table.status,
    ),
  ],
);

export {
  rebate_agreements as rebateAgreements,
  rebate_tiers as rebateTiers,
  rebate_accruals as rebateAccruals,
};
