import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const edi_partners = pgTable(
  'edi_partners',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    partner_name: text('partner_name').notNull(),
    edi_standard: text('edi_standard').notNull().default('ANSI_X12'),
    sender_id: text('sender_id').notNull(),
    sender_qualifier: text('sender_qualifier').notNull().default('01'),
    receiver_id: text('receiver_id').notNull(),
    receiver_qualifier: text('receiver_qualifier').notNull().default('01'),
    element_delimiter: text('element_delimiter').notNull().default('*'),
    segment_delimiter: text('segment_delimiter').notNull().default('~'),
    subelement_delimiter: text('subelement_delimiter').notNull().default(':'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_edi_partners_tenant').on(table.tenant_id),
    uniqueIndex('idx_edi_partners_tenant_name').on(table.tenant_id, table.partner_name),
  ],
);

export const edi_message_logs = pgTable(
  'edi_message_logs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    partner_id: text('partner_id').notNull().references(() => edi_partners.id, { onDelete: 'cascade' }),
    direction: text('direction').notNull(),
    standard: text('standard').notNull().default('ANSI_X12'),
    transaction_type: text('transaction_type').notNull(),
    control_number: text('control_number').notNull(),
    status: text('status').notNull().default('RECEIVED'),
    raw_content: text('raw_content').notNull(),
    parsed_payload: jsonb('parsed_payload'),
    error_message: text('error_message'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_edi_logs_tenant_partner').on(table.tenant_id, table.partner_id),
    index('idx_edi_logs_control_num').on(table.tenant_id, table.control_number),
    index('idx_edi_logs_status').on(table.tenant_id, table.status),
  ],
);

export const edi_interchange_controls = pgTable(
  'edi_interchange_controls',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    partner_id: text('partner_id').notNull().references(() => edi_partners.id, { onDelete: 'cascade' }),
    direction: text('direction').notNull(),
    control_number: text('control_number').notNull(),
    transaction_type: text('transaction_type').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_edi_ctrl_dedup').on(
      table.tenant_id,
      table.partner_id,
      table.control_number,
      table.direction,
    ),
  ],
);
