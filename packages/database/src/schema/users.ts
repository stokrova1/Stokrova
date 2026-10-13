import { pgTable, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    password_hash: text('password_hash').notNull(),
    full_name: text('full_name').notNull(),
    role: text('role').notNull().default('staff'), // tenant_admin, branch_manager, cashier, inventory_staff, auditor
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_users_tenant_email').on(table.tenant_id, table.email),
    index('idx_users_tenant').on(table.tenant_id),
  ],
);

export const user_profiles = pgTable(
  'user_profiles',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    display_name: text('display_name'),
    phone_number: text('phone_number'),
    avatar_url: text('avatar_url'),
    locale: text('locale').notNull().default('en'),
    timezone: text('timezone').notNull().default('UTC'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_user_profiles_user').on(table.user_id),
  ],
);
