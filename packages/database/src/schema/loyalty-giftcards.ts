import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { customers } from './customers.js';

export const loyalty_programs = pgTable(
  'loyalty_programs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    points_per_currency_minor: integer('points_per_currency_minor').notNull().default(100),
    points_currency: text('points_currency').notNull().default('USD'),
    redemption_ratio_bp: integer('redemption_ratio_bp').notNull().default(100),
    max_redemption_percent_bp: integer('max_redemption_percent_bp').notNull().default(5000),
    points_validity_days: integer('points_validity_days').notNull().default(365),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_loyalty_programs_tenant').on(table.tenant_id),
  ],
);

export const loyalty_tiers = pgTable(
  'loyalty_tiers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    program_id: text('program_id').notNull().references(() => loyalty_programs.id, { onDelete: 'cascade' }),
    tier_code: text('tier_code').notNull(),
    tier_name: text('tier_name').notNull(),
    min_spend_minor: text('min_spend_minor').notNull().default('0'),
    multiplier_bp: integer('multiplier_bp').notNull().default(10000),
    priority: integer('priority').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_loyalty_tiers_tenant_prog').on(table.tenant_id, table.program_id),
    index('idx_loyalty_tiers_code').on(table.tenant_id, table.tier_code),
  ],
);

export const loyalty_accounts = pgTable(
  'loyalty_accounts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    program_id: text('program_id').notNull().references(() => loyalty_programs.id, { onDelete: 'cascade' }),
    current_tier_code: text('current_tier_code').notNull().default('BRONZE'),
    lifetime_spend_minor: text('lifetime_spend_minor').notNull().default('0'),
    points_balance: integer('points_balance').notNull().default(0),
    lifetime_points_earned: integer('lifetime_points_earned').notNull().default(0),
    last_activity_at: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_loyalty_accounts_tenant_cust').on(table.tenant_id, table.customer_id),
    index('idx_loyalty_accounts_prog').on(table.tenant_id, table.program_id),
  ],
);

export const loyalty_transactions = pgTable(
  'loyalty_transactions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    account_id: text('account_id').notNull().references(() => loyalty_accounts.id, { onDelete: 'cascade' }),
    transaction_type: text('transaction_type').notNull(),
    points: integer('points').notNull(),
    order_id: text('order_id'),
    notes: text('notes'),
    operation_id: text('operation_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_loyalty_tx_operation').on(table.tenant_id, table.operation_id),
    index('idx_loyalty_tx_account').on(table.tenant_id, table.account_id),
  ],
);

export const gift_card_accounts = pgTable(
  'gift_card_accounts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    card_code: text('card_code').notNull(),
    pin_hash: text('pin_hash'),
    pin_salt: text('pin_salt'),
    currency: text('currency').notNull().default('USD'),
    initial_balance_minor: text('initial_balance_minor').notNull().default('0'),
    current_balance_minor: text('current_balance_minor').notNull().default('0'),
    status: text('status').notNull().default('ACTIVE'),
    customer_id: text('customer_id'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_gift_cards_tenant_code').on(table.tenant_id, table.card_code),
    index('idx_gift_cards_tenant_status').on(table.tenant_id, table.status),
  ],
);

export const gift_card_transactions = pgTable(
  'gift_card_transactions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    gift_card_id: text('gift_card_id').notNull().references(() => gift_card_accounts.id, { onDelete: 'cascade' }),
    transaction_type: text('transaction_type').notNull(),
    amount_minor: text('amount_minor').notNull(),
    previous_balance_minor: text('previous_balance_minor').notNull(),
    new_balance_minor: text('new_balance_minor').notNull(),
    reference_order_id: text('reference_order_id'),
    operation_id: text('operation_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_gift_card_tx_operation').on(table.tenant_id, table.operation_id),
    index('idx_gift_card_tx_card').on(table.tenant_id, table.gift_card_id),
  ],
);
