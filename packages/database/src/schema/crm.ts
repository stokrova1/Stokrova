import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { customers } from './customers.js';

// ==========================================
// 1. Account Relationships & Contacts
// ==========================================

export const crm_account_relationships = pgTable(
  'crm_account_relationships',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    parent_customer_id: text('parent_customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    child_customer_id: text('child_customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    relationship_type: text('relationship_type')
      .notNull()
      .default('PARENT_SUBSIDIARY'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_acct_rel_unique').on(
      table.tenant_id,
      table.parent_customer_id,
      table.child_customer_id,
    ),
    index('idx_crm_acct_rel_child').on(
      table.tenant_id,
      table.child_customer_id,
    ),
  ],
);

export const crm_contacts = pgTable(
  'crm_contacts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    role_title: text('role_title'),
    department: text('department'),
    is_primary: boolean('is_primary').notNull().default(false),
    is_active: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_crm_contacts_customer').on(
      table.tenant_id,
      table.customer_id,
    ),
    index('idx_crm_contacts_email').on(
      table.tenant_id,
      table.email,
    ),
  ],
);

export const crm_customer_merges = pgTable(
  'crm_customer_merges',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    surviving_customer_id: text('surviving_customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    merged_customer_id: text('merged_customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    merged_by: text('merged_by').notNull(),
    reason: text('reason').notNull(),
    audit_evidence_json: jsonb('audit_evidence_json'),
    merged_at: timestamp('merged_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_crm_merges_surviving').on(
      table.tenant_id,
      table.surviving_customer_id,
    ),
    index('idx_crm_merges_merged').on(
      table.tenant_id,
      table.merged_customer_id,
    ),
  ],
);

// ==========================================
// 2. Leads & Sales Pipelines
// ==========================================

export const crm_leads = pgTable(
  'crm_leads',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    lead_code: text('lead_code').notNull(),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
    company_name: text('company_name'),
    email: text('email'),
    phone: text('phone'),
    status: text('status').notNull().default('NEW'),
    source: text('source').notNull().default('WEBSITE'),
    qualification_score_bp: integer('qualification_score_bp')
      .notNull()
      .default(0),
    disqualification_reason: text('disqualification_reason'),
    assigned_to: text('assigned_to'),
    converted_customer_id: text('converted_customer_id')
      .references(() => customers.id, { onDelete: 'set null' }),
    converted_opportunity_id: text('converted_opportunity_id'),
    external_id: text('external_id'),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_leads_code').on(table.tenant_id, table.lead_code),
    index('idx_crm_leads_email').on(table.tenant_id, table.email),
    index('idx_crm_leads_status').on(table.tenant_id, table.status),
    index('idx_crm_leads_external').on(table.tenant_id, table.external_id),
  ],
);

export const crm_pipelines = pgTable(
  'crm_pipelines',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    is_default: boolean('is_default').notNull().default(false),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_pipelines_code').on(table.tenant_id, table.code),
  ],
);

export const crm_pipeline_stages = pgTable(
  'crm_pipeline_stages',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    pipeline_id: text('pipeline_id')
      .notNull()
      .references(() => crm_pipelines.id, { onDelete: 'cascade' }),
    stage_code: text('stage_code').notNull(),
    name: text('name').notNull(),
    order_index: integer('order_index').notNull().default(0),
    probability_bp: integer('probability_bp').notNull().default(0),
    is_won_stage: boolean('is_won_stage').notNull().default(false),
    is_lost_stage: boolean('is_lost_stage').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_stages_code').on(
      table.tenant_id,
      table.pipeline_id,
      table.stage_code,
    ),
    index('idx_crm_stages_order').on(table.pipeline_id, table.order_index),
  ],
);

export const crm_opportunities = pgTable(
  'crm_opportunities',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    opportunity_code: text('opportunity_code').notNull(),
    title: text('title').notNull(),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    pipeline_id: text('pipeline_id')
      .notNull()
      .references(() => crm_pipelines.id, { onDelete: 'restrict' }),
    current_stage_id: text('current_stage_id')
      .notNull()
      .references(() => crm_pipeline_stages.id, { onDelete: 'restrict' }),
    estimated_value_minor: bigint('estimated_value_minor', {
      mode: 'bigint',
    })
      .notNull()
      .default(sql`0`),
    currency_code: text('currency_code').notNull().default('USD'),
    probability_bp: integer('probability_bp').notNull().default(0),
    expected_close_date: timestamp('expected_close_date', {
      withTimezone: true,
    }),
    assigned_to: text('assigned_to'),
    status: text('status').notNull().default('OPEN'),
    loss_reason: text('loss_reason'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_opps_code').on(
      table.tenant_id,
      table.opportunity_code,
    ),
    index('idx_crm_opps_customer').on(table.tenant_id, table.customer_id),
    index('idx_crm_opps_stage').on(
      table.tenant_id,
      table.pipeline_id,
      table.current_stage_id,
    ),
  ],
);

export const crm_opportunity_stage_history = pgTable(
  'crm_opportunity_stage_history',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    opportunity_id: text('opportunity_id')
      .notNull()
      .references(() => crm_opportunities.id, { onDelete: 'cascade' }),
    from_stage_id: text('from_stage_id').references(
      () => crm_pipeline_stages.id,
      { onDelete: 'set null' },
    ),
    to_stage_id: text('to_stage_id')
      .notNull()
      .references(() => crm_pipeline_stages.id, { onDelete: 'restrict' }),
    changed_by: text('changed_by').notNull(),
    notes: text('notes'),
    transitioned_at: timestamp('transitioned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_crm_opp_hist').on(table.tenant_id, table.opportunity_id),
  ],
);

// ==========================================
// 3. Activity Timeline & Tasks
// ==========================================

export const crm_activities = pgTable(
  'crm_activities',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customer_id: text('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    contact_id: text('contact_id').references(() => crm_contacts.id, {
      onDelete: 'set null',
    }),
    opportunity_id: text('opportunity_id').references(
      () => crm_opportunities.id,
      { onDelete: 'set null' },
    ),
    lead_id: text('lead_id').references(() => crm_leads.id, {
      onDelete: 'set null',
    }),
    activity_type: text('activity_type').notNull(),
    subject: text('subject').notNull(),
    description: text('description'),
    performed_by: text('performed_by').notNull(),
    duration_minutes: integer('duration_minutes'),
    performed_at: timestamp('performed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_crm_activities_cust').on(table.tenant_id, table.customer_id),
    index('idx_crm_activities_opp').on(
      table.tenant_id,
      table.opportunity_id,
    ),
    index('idx_crm_activities_lead').on(table.tenant_id, table.lead_id),
    index('idx_crm_activities_time').on(
      table.tenant_id,
      table.performed_at,
    ),
  ],
);

export const crm_tasks = pgTable(
  'crm_tasks',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customer_id: text('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    opportunity_id: text('opportunity_id').references(
      () => crm_opportunities.id,
      { onDelete: 'set null' },
    ),
    lead_id: text('lead_id').references(() => crm_leads.id, {
      onDelete: 'set null',
    }),
    subject: text('subject').notNull(),
    description: text('description'),
    due_date: timestamp('due_date', { withTimezone: true }).notNull(),
    priority: text('priority').notNull().default('MEDIUM'),
    status: text('status').notNull().default('PENDING'),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    assigned_to: text('assigned_to'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_crm_tasks_cust').on(table.tenant_id, table.customer_id),
    index('idx_crm_tasks_due').on(
      table.tenant_id,
      table.due_date,
      table.status,
    ),
    index('idx_crm_tasks_assigned').on(table.tenant_id, table.assigned_to),
  ],
);

// ==========================================
// 4. Segmentation, Consent & Suppression
// ==========================================

export const crm_segments = pgTable(
  'crm_segments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    segment_type: text('segment_type').notNull().default('STATIC'),
    rules_json: jsonb('rules_json'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_segments_code').on(table.tenant_id, table.code),
  ],
);

export const crm_segment_members = pgTable(
  'crm_segment_members',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    segment_id: text('segment_id')
      .notNull()
      .references(() => crm_segments.id, { onDelete: 'cascade' }),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    added_at: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_seg_members_unique').on(
      table.tenant_id,
      table.segment_id,
      table.customer_id,
    ),
  ],
);

export const crm_consent_records = pgTable(
  'crm_consent_records',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    channel: text('channel').notNull(),
    status: text('status').notNull(),
    source: text('source').notNull(),
    policy_version: text('policy_version').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text('notes'),
  },
  (table) => [
    index('idx_crm_consent_lookup').on(
      table.tenant_id,
      table.customer_id,
      table.purpose,
      table.channel,
    ),
  ],
);

export const crm_suppression_list = pgTable(
  'crm_suppression_list',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    channel: text('channel').notNull(),
    identifier: text('identifier').notNull(),
    reason: text('reason').notNull(),
    suppressed_at: timestamp('suppressed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_suppress_unique').on(
      table.tenant_id,
      table.channel,
      table.identifier,
    ),
  ],
);

// ==========================================
// 5. Campaigns & Delivery
// ==========================================

export const crm_campaigns = pgTable(
  'crm_campaigns',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    campaign_code: text('campaign_code').notNull(),
    name: text('name').notNull(),
    campaign_type: text('campaign_type').notNull().default('ONE_TIME'),
    status: text('status').notNull().default('DRAFT'),
    channel: text('channel').notNull().default('EMAIL'),
    segment_id: text('segment_id')
      .notNull()
      .references(() => crm_segments.id, { onDelete: 'restrict' }),
    subject_template: text('subject_template'),
    body_template: text('body_template').notNull(),
    budget_limit_minor: bigint('budget_limit_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    actual_spend_minor: bigint('actual_spend_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    scheduled_at: timestamp('scheduled_at', { withTimezone: true }),
    approved_by: text('approved_by'),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    total_recipients: integer('total_recipients').notNull().default(0),
    sent_count: integer('sent_count').notNull().default(0),
    delivered_count: integer('delivered_count').notNull().default(0),
    failed_count: integer('failed_count').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_camp_code').on(
      table.tenant_id,
      table.campaign_code,
    ),
    index('idx_crm_camp_status').on(table.tenant_id, table.status),
  ],
);

export const crm_messages = pgTable(
  'crm_messages',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    campaign_id: text('campaign_id')
      .notNull()
      .references(() => crm_campaigns.id, { onDelete: 'cascade' }),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    channel: text('channel').notNull(),
    recipient_address: text('recipient_address').notNull(),
    status: text('status').notNull().default('PENDING'),
    operation_id: text('operation_id').notNull(),
    provider_message_id: text('provider_message_id'),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    error_message: text('error_message'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_msg_op').on(table.tenant_id, table.operation_id),
    index('idx_crm_msg_camp_stat').on(
      table.tenant_id,
      table.campaign_id,
      table.status,
    ),
    index('idx_crm_msg_cust').on(table.tenant_id, table.customer_id),
  ],
);

// ==========================================
// 6. Marketing Automation
// ==========================================

export const crm_automations = pgTable(
  'crm_automations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    automation_code: text('automation_code').notNull(),
    name: text('name').notNull(),
    trigger_type: text('trigger_type').notNull(),
    trigger_filter_json: jsonb('trigger_filter_json'),
    actions_json: jsonb('actions_json').notNull(),
    status: text('status').notNull().default('DRAFT'),
    version: integer('version').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_auto_code').on(
      table.tenant_id,
      table.automation_code,
    ),
    index('idx_crm_auto_trig').on(
      table.tenant_id,
      table.trigger_type,
      table.status,
    ),
  ],
);

export const crm_automation_executions = pgTable(
  'crm_automation_executions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    automation_id: text('automation_id')
      .notNull()
      .references(() => crm_automations.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    customer_id: text('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    trigger_event_id: text('trigger_event_id').notNull(),
    status: text('status').notNull().default('RUNNING'),
    step_results_json: jsonb('step_results_json').notNull(),
    executed_at: timestamp('executed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_crm_exec_unique').on(
      table.tenant_id,
      table.automation_id,
      table.trigger_event_id,
    ),
    index('idx_crm_exec_cust').on(table.tenant_id, table.customer_id),
  ],
);
