/**
 * Offline POS Synchronization & Conflict Resolution Database Schema (Phase 3E)
 * Benchmarked against TetherPOS, QuickStock Sync, Odoo POS, and ERPNext (Rule 26).
 */

import { pgTable, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { pos_registers, pos_sessions } from './pos.js';
import { sales_orders } from './orders.js';

export const pos_sync_batches = pgTable(
  'pos_sync_batches',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    device_id: text('device_id').notNull(),
    pos_register_id: text('pos_register_id').notNull().references(() => pos_registers.id, { onDelete: 'restrict' }),
    pos_session_id: text('pos_session_id').notNull().references(() => pos_sessions.id, { onDelete: 'restrict' }),
    total_submitted: integer('total_submitted').notNull(),
    processed_count: integer('processed_count').notNull().default(0),
    duplicate_count: integer('duplicate_count').notNull().default(0),
    conflict_count: integer('conflict_count').notNull().default(0),
    rejected_count: integer('rejected_count').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_pos_sync_batches_tenant').on(table.tenant_id),
    index('idx_pos_sync_batches_device').on(table.tenant_id, table.device_id),
    index('idx_pos_sync_batches_session').on(table.pos_session_id),
  ],
);

export const pos_sync_transactions = pgTable(
  'pos_sync_transactions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    batch_id: text('batch_id').notNull().references(() => pos_sync_batches.id, { onDelete: 'cascade' }),
    client_tx_id: text('client_tx_id').notNull(),
    device_id: text('device_id').notNull(),
    pos_session_id: text('pos_session_id').notNull().references(() => pos_sessions.id, { onDelete: 'restrict' }),
    client_sequence: integer('client_sequence').notNull(),
    client_timestamp: timestamp('client_timestamp', { withTimezone: true }).notNull(),
    tx_type: text('tx_type').notNull(),
    idempotency_key: text('idempotency_key').notNull(),
    status: text('status').notNull(),
    server_order_id: text('server_order_id').references(() => sales_orders.id, { onDelete: 'set null' }),
    conflict_reason: text('conflict_reason'),
    reconciliation_note: text('reconciliation_note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_pos_sync_tx_tenant_client_id').on(table.tenant_id, table.client_tx_id),
    uniqueIndex('idx_pos_sync_tx_tenant_idempotency').on(table.tenant_id, table.idempotency_key),
    uniqueIndex('idx_pos_sync_tx_tenant_device_seq').on(table.tenant_id, table.device_id, table.client_sequence),
    index('idx_pos_sync_tx_batch').on(table.batch_id),
    index('idx_pos_sync_tx_session').on(table.pos_session_id),
  ],
);
