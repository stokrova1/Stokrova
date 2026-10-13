import { pgTable, text, boolean, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';
import { roles } from './rbac.js';
import { work_centers } from './work_centers.js';

export const workflows = pgTable(
  'workflows',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull(), // RETAIL_SALE, WHOLESALE_FULFILLMENT, RETURN, PURCHASE_RECEIVE, TRANSFER
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_workflows_tenant').on(table.tenant_id),
  ],
);

export const workflow_versions = pgTable(
  'workflow_versions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    workflow_id: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
    version_number: integer('version_number').notNull(),
    definition_graph: jsonb('definition_graph').notNull(), // DAG with steps, transitions, rules
    status: text('status').notNull().default('DRAFT'), // DRAFT, PUBLISHED, ARCHIVED
    published_at: timestamp('published_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_workflow_versions_unique').on(table.workflow_id, table.version_number),
  ],
);

export const workflow_tasks = pgTable(
  'workflow_tasks',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    workflow_version_id: text('workflow_version_id').notNull().references(() => workflow_versions.id, { onDelete: 'cascade' }),
    step_key: text('step_key').notNull(),
    entity_type: text('entity_type').notNull(), // SALE_ORDER, RETURN_REQUEST, PURCHASE_ORDER
    entity_id: text('entity_id').notNull(),
    status: text('status').notNull().default('PENDING'), // PENDING, CLAIMED, IN_PROGRESS, COMPLETED, FAILED, SKIPPED
    assigned_role_id: text('assigned_role_id').references(() => roles.id),
    assigned_user_id: text('assigned_user_id').references(() => users.id),
    assigned_work_center_id: text('assigned_work_center_id').references(() => work_centers.id),
    priority: text('priority').notNull().default('NORMAL'), // LOW, NORMAL, HIGH, URGENT
    payload: jsonb('payload'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_wf_tasks_tenant_status').on(table.tenant_id, table.status),
    index('idx_wf_tasks_entity').on(table.tenant_id, table.entity_type, table.entity_id),
    index('idx_wf_tasks_work_center').on(table.tenant_id, table.assigned_work_center_id, table.status),
  ],
);

export const workflow_task_claims = pgTable(
  'workflow_task_claims',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    task_id: text('task_id').notNull().references(() => workflow_tasks.id, { onDelete: 'cascade' }),
    claimed_by_user_id: text('claimed_by_user_id').notNull().references(() => users.id),
    claimed_at: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE, RELEASED, COMPLETED
  },
  (table) => [
    uniqueIndex('idx_task_claims_active').on(table.task_id, table.status),
  ],
);

export const business_rules = pgTable(
  'business_rules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    event_trigger: text('event_trigger').notNull(), // ORDER_SUBMITTED, DISCOUNT_APPLIED, REFUND_REQUESTED
    condition_expression: jsonb('condition_expression').notNull(),
    action_type: text('action_type').notNull(), // REQUIRE_APPROVAL, ROUTE_WORKFLOW, BLOCK_ACTION
    action_parameters: jsonb('action_parameters'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_business_rules_trigger').on(table.tenant_id, table.event_trigger),
  ],
);

export const approval_requests = pgTable(
  'approval_requests',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    requested_by_user_id: text('requested_by_user_id').notNull().references(() => users.id),
    approver_role_id: text('approver_role_id').references(() => roles.id),
    approver_user_id: text('approver_user_id').references(() => users.id),
    status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
    decision_reason: text('decision_reason'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    decided_at: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_approvals_tenant_status').on(table.tenant_id, table.status),
  ],
);
