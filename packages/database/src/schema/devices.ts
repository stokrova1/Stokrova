import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants, branches } from './tenants.js';

export const devices = pgTable(
  'devices',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    branch_id: text('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    device_name: text('device_name').notNull(),
    platform: text('platform').notNull(), // tauri-desktop, expo-mobile, browser-web
    app_version: text('app_version').notNull(),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, REVOKED, PENDING
    last_seen_at: timestamp('last_seen_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_devices_tenant_status').on(table.tenant_id, table.status),
    index('idx_devices_tenant').on(table.tenant_id),
  ],
);
