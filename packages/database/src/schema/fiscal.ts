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

export const fiscal_entities = pgTable(
  'fiscal_entities',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    company_name: text('company_name').notNull(),
    country_code: text('country_code').notNull(),
    vat_id: text('vat_id'),
    tax_registration_id: text('tax_registration_id'),
    peppol_endpoint_id: text('peppol_endpoint_id'),
    peppol_scheme_id: text('peppol_scheme_id'),
    address_line1: text('address_line1').notNull(),
    city: text('city').notNull(),
    postal_code: text('postal_code').notNull(),
    currency: text('currency').notNull().default('EUR'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_fiscal_entities_tenant').on(table.tenant_id),
    index('idx_fiscal_entities_vat').on(table.tenant_id, table.vat_id),
  ],
);

export const certified_e_invoices = pgTable(
  'certified_e_invoices',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    entity_id: text('entity_id').notNull().references(() => fiscal_entities.id, { onDelete: 'cascade' }),
    invoice_number: text('invoice_number').notNull(),
    standard: text('standard').notNull(),
    profile: text('profile'),
    status: text('status').notNull().default('DRAFT'),
    sha256_digest: text('sha256_digest').notNull(),
    xml_content: text('xml_content').notNull(),
    peppol_message_id: text('peppol_message_id'),
    transmission_timestamp: timestamp('transmission_timestamp', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_e_invoices_tenant_num').on(table.tenant_id, table.invoice_number),
    index('idx_e_invoices_tenant_status').on(table.tenant_id, table.status),
    index('idx_e_invoices_entity').on(table.entity_id),
  ],
);

export const fiscal_receipt_chains = pgTable(
  'fiscal_receipt_chains',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    register_id: text('register_id').notNull(),
    receipt_number: text('receipt_number').notNull(),
    sequence_number: integer('sequence_number').notNull(),
    gross_amount_minor: text('gross_amount_minor').notNull(),
    tax_amount_minor: text('tax_amount_minor').notNull(),
    previous_signature_hash: text('previous_signature_hash').notNull(),
    signature_hash: text('signature_hash').notNull(),
    qr_payload: text('qr_payload').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_fiscal_chains_tenant_reg_seq').on(table.tenant_id, table.register_id, table.sequence_number),
    index('idx_fiscal_chains_receipt').on(table.tenant_id, table.receipt_number),
  ],
);
