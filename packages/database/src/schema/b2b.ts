import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export interface B2bRequisitionItemRecord {
  sku: string;
  item_name: string;
  quantity: number;
  unit_price_minor: string;
  total_minor: string;
}

export const b2b_organizations = pgTable(
  'b2b_organizations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    parent_org_id: text('parent_org_id'),
    name: text('name').notNull(),
    tax_identifier: text('tax_identifier'),
    org_type: text('org_type').notNull().default('SUBSIDIARY'), // CORPORATE_HOLDING, SUBSIDIARY, BUYING_CENTER
    credit_limit_minor: text('credit_limit_minor').notNull().default('0'),
    payment_terms_days: integer('payment_terms_days').notNull().default(30),
    currency: text('currency').notNull().default('USD'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_b2b_organizations_tenant').on(table.tenant_id),
    index('idx_b2b_organizations_parent').on(table.tenant_id, table.parent_org_id),
    index('idx_b2b_organizations_tax').on(table.tenant_id, table.tax_identifier),
  ],
);

export const b2b_credit_accounts = pgTable(
  'b2b_credit_accounts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    organization_id: text('organization_id').notNull().references(() => b2b_organizations.id, { onDelete: 'cascade' }),
    credit_limit_minor: text('credit_limit_minor').notNull().default('0'),
    used_exposure_minor: text('used_exposure_minor').notNull().default('0'),
    available_credit_minor: text('available_credit_minor').notNull().default('0'),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, CREDIT_HOLD, SUSPENDED, REVIEW_REQUIRED
    hold_reason: text('hold_reason'),
    last_evaluated_at: timestamp('last_evaluated_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_b2b_credit_accounts_tenant_org').on(table.tenant_id, table.organization_id),
    index('idx_b2b_credit_accounts_status').on(table.tenant_id, table.status),
  ],
);

export const b2b_contract_pricing = pgTable(
  'b2b_contract_pricing',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    organization_id: text('organization_id').notNull().references(() => b2b_organizations.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    custom_price_minor: text('custom_price_minor').notNull(),
    currency: text('currency').notNull().default('USD'),
    min_quantity: integer('min_quantity').notNull().default(1),
    valid_from: timestamp('valid_from', { withTimezone: true }),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_b2b_contract_pricing_tenant_org_sku').on(table.tenant_id, table.organization_id, table.sku),
    index('idx_b2b_contract_pricing_tenant_sku').on(table.tenant_id, table.sku),
  ],
);

export const b2b_requisitions = pgTable(
  'b2b_requisitions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    organization_id: text('organization_id').notNull().references(() => b2b_organizations.id, { onDelete: 'cascade' }),
    requisition_number: text('requisition_number').notNull(),
    requester_user_id: text('requester_user_id').notNull(),
    approver_user_id: text('approver_user_id'),
    status: text('status').notNull().default('DRAFT'), // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CONVERTED_TO_ORDER, CANCELLED
    total_amount_minor: text('total_amount_minor').notNull().default('0'),
    currency: text('currency').notNull().default('USD'),
    items: jsonb('items').$type<B2bRequisitionItemRecord[]>().notNull(),
    approval_notes: text('approval_notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_b2b_requisitions_tenant_num').on(table.tenant_id, table.requisition_number),
    index('idx_b2b_requisitions_org').on(table.tenant_id, table.organization_id),
    index('idx_b2b_requisitions_status').on(table.tenant_id, table.status),
  ],
);

export const b2b_punchout_sessions = pgTable(
  'b2b_punchout_sessions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    organization_id: text('organization_id').notNull().references(() => b2b_organizations.id, { onDelete: 'cascade' }),
    buyer_cookie: text('buyer_cookie').notNull(),
    from_identity: text('from_identity').notNull(),
    to_identity: text('to_identity').notNull(),
    browser_form_post_url: text('browser_form_post_url').notNull(),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, CHECKED_OUT, EXPIRED
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idx_b2b_punchout_sessions_tenant_cookie').on(table.tenant_id, table.buyer_cookie),
    index('idx_b2b_punchout_sessions_tenant_org').on(table.tenant_id, table.organization_id),
  ],
);
