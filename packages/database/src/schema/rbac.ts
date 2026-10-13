import { pgTable, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants, companies, branches } from './tenants.js';
import { users } from './users.js';

export const memberships = pgTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('ACTIVE'), // INVITED, ACTIVE, SUSPENDED
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_memberships_tenant_user').on(table.tenant_id, table.user_id),
  ],
);

export const roles = pgTable(
  'roles',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // null for global templates
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    is_system_template: boolean('is_system_template').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_roles_tenant').on(table.tenant_id),
  ],
);

export const permissions = pgTable(
  'permissions',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // e.g. 'sales.order.create', 'inventory.pick', 'payments.collect'
    module: text('module').notNull(), // sales, inventory, payments, finance, admin
    description: text('description'),
  },
);

export const role_permissions = pgTable(
  'role_permissions',
  {
    id: text('id').primaryKey(),
    role_id: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permission_id: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('idx_role_perm_unique').on(table.role_id, table.permission_id),
  ],
);

export const role_assignments = pgTable(
  'role_assignments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role_id: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    company_id: text('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    warehouse_id: text('warehouse_id'),
    register_id: text('register_id'),
    work_center_id: text('work_center_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_role_assign_user').on(table.tenant_id, table.user_id),
    index('idx_role_assign_scope').on(table.tenant_id, table.branch_id),
  ],
);
