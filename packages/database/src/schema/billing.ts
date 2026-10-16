import { pgTable, text, timestamp, numeric, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/** Each business's Stokrova plan subscription (one per business; id = `sub_<tenant_id>`). */
export const tenant_subscriptions = pgTable('tenant_subscriptions', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull().unique().references(() => tenants.id, { onDelete: 'cascade' }),
  tier: text('tier').notNull(),
  status: text('status').notNull(),
  billing_cycle: text('billing_cycle').notNull().default('MONTHLY'),
  currency: text('currency').notNull().default('NGN'),
  current_period_start: timestamp('current_period_start', { withTimezone: true, mode: 'string' }).notNull(),
  current_period_end: timestamp('current_period_end', { withTimezone: true, mode: 'string' }).notNull(),
  cancel_at_period_end: boolean('cancel_at_period_end').notNull().default(false),
  canceled_at: timestamp('canceled_at', { withTimezone: true, mode: 'string' }),
  trial_ends_at: timestamp('trial_ends_at', { withTimezone: true, mode: 'string' }),
  billing_override: jsonb('billing_override'), // founder: FREE / DISCOUNT_PERCENT / FIXED_PRICE
  plan_grants: jsonb('plan_grants'), // founder: extra features + raised limits on top of the plan
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

/** Invoices Stokrova issues to businesses for their plan (minor units kept as exact whole numbers). */
export const saas_invoices = pgTable(
  'saas_invoices',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    subscription_id: text('subscription_id').notNull(),
    invoice_number: text('invoice_number').notNull(),
    period_start: timestamp('period_start', { withTimezone: true, mode: 'string' }).notNull(),
    period_end: timestamp('period_end', { withTimezone: true, mode: 'string' }).notNull(),
    subtotal_minor: numeric('subtotal_minor', { precision: 20, scale: 0 }).notNull(),
    tax_minor: numeric('tax_minor', { precision: 20, scale: 0 }).notNull().default('0'),
    total_minor: numeric('total_minor', { precision: 20, scale: 0 }).notNull(),
    currency: text('currency').notNull(),
    status: text('status').notNull(),
    lines: jsonb('lines').notNull().default([]),
    payment_gateway_reference: text('payment_gateway_reference'),
    paid_at: timestamp('paid_at', { withTimezone: true, mode: 'string' }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('idx_saas_invoices_tenant').on(t.tenant_id, t.period_start)],
);

/** Every plan change for a business: who changed it (owner, founder or system), from what, to what. */
export const plan_change_history = pgTable(
  'plan_change_history',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    from_tier: text('from_tier').notNull(),
    to_tier: text('to_tier').notNull(),
    changed_by: text('changed_by').notNull(),
    source: text('source').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('idx_plan_change_history_tenant').on(t.tenant_id, t.created_at)],
);
