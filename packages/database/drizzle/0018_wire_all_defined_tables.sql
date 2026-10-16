-- Migration 0018: create every defined-but-missing table and column (idempotent, additive only).
-- Generated from packages/database/src/schema. Existing tables and data are never altered destructively.

CREATE TABLE IF NOT EXISTS "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"currency_code" text DEFAULT 'NGN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'NGN' NOT NULL;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'staff' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"phone_number" text,
	"avatar_url" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "display_name" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "phone_number" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "locale" text DEFAULT 'en' NOT NULL;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'UTC' NOT NULL;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text,
	"device_name" text NOT NULL,
	"platform" text NOT NULL,
	"app_version" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "device_name" text;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "platform" text;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "app_version" text;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"actor_user_id" text,
	"device_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" text,
	"metadata" jsonb
);
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "actor_user_id" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "device_id" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "action" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
CREATE TABLE IF NOT EXISTS "security_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb
);
ALTER TABLE "security_events" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "security_events" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "security_events" ADD COLUMN IF NOT EXISTS "severity" text DEFAULT 'INFO' NOT NULL;
ALTER TABLE "security_events" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "security_events" ADD COLUMN IF NOT EXISTS "details" jsonb;
CREATE TABLE IF NOT EXISTS "sync_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"device_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"command_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "device_id" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "command_type" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "error_code" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "schema_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "sync_operations" ADD COLUMN IF NOT EXISTS "processed_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "sync_changes" (
	"sequence" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"operation" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "sync_changes" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "sync_changes" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "sync_changes" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "sync_changes" ADD COLUMN IF NOT EXISTS "operation" text;
ALTER TABLE "sync_changes" ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE "sync_changes" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"is_system_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_system_template" boolean DEFAULT false NOT NULL;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"module" text NOT NULL,
	"description" text,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module" text;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "description" text;
CREATE TABLE IF NOT EXISTS "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL
);
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "role_id" text;
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "permission_id" text;
CREATE TABLE IF NOT EXISTS "role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"company_id" text,
	"branch_id" text,
	"warehouse_id" text,
	"register_id" text,
	"work_center_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "role_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "register_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "work_center_id" text;
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "work_centers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "work_centers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "work_centers" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "work_centers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "work_centers" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "work_centers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "registers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"work_center_id" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "registers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "registers" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "registers" ADD COLUMN IF NOT EXISTS "work_center_id" text;
ALTER TABLE "registers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "registers" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "registers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "registers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "register_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"register_id" text NOT NULL,
	"opened_by_user_id" text NOT NULL,
	"closed_by_user_id" text,
	"opening_float_minor" bigint DEFAULT 0 NOT NULL,
	"closing_expected_minor" bigint,
	"closing_actual_minor" bigint,
	"variance_minor" bigint,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text
);
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "register_id" text;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "opened_by_user_id" text;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "closed_by_user_id" text;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "opening_float_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "closing_expected_minor" bigint;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "closing_actual_minor" bigint;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "variance_minor" bigint;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'OPEN' NOT NULL;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "opened_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
ALTER TABLE "register_sessions" ADD COLUMN IF NOT EXISTS "notes" text;
CREATE TABLE IF NOT EXISTS "cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"register_session_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" text DEFAULT 'NGN' NOT NULL,
	"source_type" text,
	"source_id" text,
	"reason" text,
	"created_by_user_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "register_session_id" text;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "movement_type" text;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "amount_minor" bigint;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'NGN' NOT NULL;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "source_id" text;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "workflow_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"definition_graph" jsonb NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "workflow_versions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "workflow_versions" ADD COLUMN IF NOT EXISTS "workflow_id" text;
ALTER TABLE "workflow_versions" ADD COLUMN IF NOT EXISTS "version_number" integer;
ALTER TABLE "workflow_versions" ADD COLUMN IF NOT EXISTS "definition_graph" jsonb;
ALTER TABLE "workflow_versions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "workflow_versions" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
ALTER TABLE "workflow_versions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "workflow_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_version_id" text NOT NULL,
	"step_key" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"assigned_role_id" text,
	"assigned_user_id" text,
	"assigned_work_center_id" text,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "workflow_version_id" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "step_key" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "assigned_role_id" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "assigned_user_id" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "assigned_work_center_id" text;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'NORMAL' NOT NULL;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "workflow_tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "workflow_task_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"task_id" text NOT NULL,
	"claimed_by_user_id" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'ACTIVE' NOT NULL
);
ALTER TABLE "workflow_task_claims" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "workflow_task_claims" ADD COLUMN IF NOT EXISTS "task_id" text;
ALTER TABLE "workflow_task_claims" ADD COLUMN IF NOT EXISTS "claimed_by_user_id" text;
ALTER TABLE "workflow_task_claims" ADD COLUMN IF NOT EXISTS "claimed_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "workflow_task_claims" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "workflow_task_claims" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
CREATE TABLE IF NOT EXISTS "business_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"event_trigger" text NOT NULL,
	"condition_expression" jsonb NOT NULL,
	"action_type" text NOT NULL,
	"action_parameters" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "event_trigger" text;
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "condition_expression" jsonb;
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "action_type" text;
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "action_parameters" jsonb;
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "business_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"approver_role_id" text,
	"approver_user_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"decision_reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "requested_by_user_id" text;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "approver_role_id" text;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "approver_user_id" text;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "decision_reason" text;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "decided_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text,
	"invoice_id" text,
	"register_session_id" text,
	"amount_minor" bigint NOT NULL,
	"currency_code" text DEFAULT 'NGN' NOT NULL,
	"payment_method" text NOT NULL,
	"status" text NOT NULL,
	"provider_reference" text,
	"captured_by_user_id" text NOT NULL,
	"operation_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "register_session_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_minor" bigint;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'NGN' NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_reference" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "captured_by_user_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "receipt_prints" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"payment_id" text,
	"receipt_number" text NOT NULL,
	"printed_by_user_id" text NOT NULL,
	"register_id" text,
	"print_count" integer DEFAULT 1 NOT NULL,
	"is_reprint" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "payment_id" text;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "receipt_number" text;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "printed_by_user_id" text;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "register_id" text;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "print_count" integer DEFAULT 1 NOT NULL;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "is_reprint" boolean DEFAULT false NOT NULL;
ALTER TABLE "receipt_prints" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "multi_tender_checkouts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"pos_session_id" text,
	"total_payable_minor" bigint NOT NULL,
	"total_tendered_minor" bigint NOT NULL,
	"total_allocated_minor" bigint NOT NULL,
	"change_due_minor" bigint DEFAULT 0 NOT NULL,
	"remaining_balance_minor" bigint DEFAULT 0 NOT NULL,
	"is_fully_paid" boolean DEFAULT false NOT NULL,
	"pos_cash_movement_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "pos_session_id" text;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "total_payable_minor" bigint;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "total_tendered_minor" bigint;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "total_allocated_minor" bigint;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "change_due_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "remaining_balance_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "is_fully_paid" boolean DEFAULT false NOT NULL;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "pos_cash_movement_id" text;
ALTER TABLE "multi_tender_checkouts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "checkout_tenders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"checkout_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"tender_type" text NOT NULL,
	"tendered_minor" bigint NOT NULL,
	"allocated_minor" bigint NOT NULL,
	"change_returned_minor" bigint DEFAULT 0 NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"provider_reference" text,
	"terminal_id" text,
	"customer_account_id" text,
	"gift_card_code" text,
	"notes" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "checkout_id" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "tender_type" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "tendered_minor" bigint;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "allocated_minor" bigint;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "change_returned_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "provider_reference" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "terminal_id" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "customer_account_id" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "gift_card_code" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "checkout_tenders" ADD COLUMN IF NOT EXISTS "captured_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "units_of_measure" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"is_base_unit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "units_of_measure" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "units_of_measure" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "units_of_measure" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "units_of_measure" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "units_of_measure" ADD COLUMN IF NOT EXISTS "is_base_unit" boolean DEFAULT false NOT NULL;
ALTER TABLE "units_of_measure" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "units_of_measure" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "unit_conversions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"from_uom_id" text NOT NULL,
	"to_uom_id" text NOT NULL,
	"multiplier" double precision NOT NULL,
	"divisor" double precision DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "unit_conversions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "unit_conversions" ADD COLUMN IF NOT EXISTS "from_uom_id" text;
ALTER TABLE "unit_conversions" ADD COLUMN IF NOT EXISTS "to_uom_id" text;
ALTER TABLE "unit_conversions" ADD COLUMN IF NOT EXISTS "multiplier" double precision;
ALTER TABLE "unit_conversions" ADD COLUMN IF NOT EXISTS "divisor" double precision DEFAULT 1 NOT NULL;
ALTER TABLE "unit_conversions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "unit_conversions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "product_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"parent_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "parent_id" text;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "path" text;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "level" integer DEFAULT 0 NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"origin_country" text,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "origin_country" text;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "product_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category_id" text,
	"brand_id" text,
	"base_uom_id" text NOT NULL,
	"tracking_policy" text DEFAULT 'NONE' NOT NULL,
	"is_expirable" boolean DEFAULT false NOT NULL,
	"tax_category_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "category_id" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "brand_id" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "base_uom_id" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "tracking_policy" text DEFAULT 'NONE' NOT NULL;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "is_expirable" boolean DEFAULT false NOT NULL;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "tax_category_code" text;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "product_templates" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "attribute_dimensions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "attribute_dimensions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "attribute_dimensions" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "attribute_dimensions" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "attribute_dimensions" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
ALTER TABLE "attribute_dimensions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "attribute_dimensions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "attribute_values" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"dimension_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"hex_color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "dimension_id" text;
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "hex_color" text;
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "attribute_values" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"template_id" text NOT NULL,
	"sku" text NOT NULL,
	"barcode" text,
	"cost_price_minor" bigint DEFAULT 0 NOT NULL,
	"selling_price_minor" bigint DEFAULT 0 NOT NULL,
	"attributes" jsonb DEFAULT '{}' NOT NULL,
	"weight_grams" double precision,
	"volume_cm3" double precision,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "template_id" text;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "barcode" text;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "cost_price_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "selling_price_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "attributes" jsonb DEFAULT '{}' NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "weight_grams" double precision;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "volume_cm3" double precision;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "idempotency_records" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_path" text NOT NULL,
	"request_method" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"response_code" integer,
	"response_body" jsonb,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "request_path" text;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "request_method" text;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "request_hash" text;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "response_code" integer;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "response_body" jsonb;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "idempotency_records" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "outbox_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"operation_id" text,
	"payload" jsonb NOT NULL,
	"metadata" jsonb,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "event_id" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "aggregate_type" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "aggregate_id" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "storage_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"zone_type" text NOT NULL,
	"temperature_class" text DEFAULT 'AMBIENT' NOT NULL,
	"hazmat_class" text DEFAULT 'NONE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "zone_type" text;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "temperature_class" text DEFAULT 'AMBIENT' NOT NULL;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "hazmat_class" text DEFAULT 'NONE' NOT NULL;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "storage_zones" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "storage_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"zone_id" text,
	"parent_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"materialized_path" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"mix_policy" text DEFAULT 'MULTI_SKU' NOT NULL,
	"max_weight_kg" double precision,
	"max_volume_cm3" double precision,
	"velocity_class" text,
	"is_pickable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "zone_id" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "parent_id" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "materialized_path" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "level" integer DEFAULT 0 NOT NULL;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "mix_policy" text DEFAULT 'MULTI_SKU' NOT NULL;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "max_weight_kg" double precision;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "max_volume_cm3" double precision;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "velocity_class" text;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "is_pickable" boolean DEFAULT true NOT NULL;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "put_away_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"strategy" text NOT NULL,
	"filter_category_id" text,
	"filter_temperature_class" text,
	"filter_hazmat_class" text,
	"filter_velocity_class" text,
	"destination_zone_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 100 NOT NULL;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "strategy" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "filter_category_id" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "filter_temperature_class" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "filter_hazmat_class" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "filter_velocity_class" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "destination_zone_id" text;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "put_away_rules" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pick_waves" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"wave_number" text NOT NULL,
	"status" text DEFAULT 'PLANNING' NOT NULL,
	"strategy" text NOT NULL,
	"criteria" jsonb,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_lines" integer DEFAULT 0 NOT NULL,
	"released_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "wave_number" text;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PLANNING' NOT NULL;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "strategy" text;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "criteria" jsonb;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "total_orders" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "total_lines" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "released_at" timestamp with time zone;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pick_waves" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pick_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"wave_id" text,
	"pick_list_number" text NOT NULL,
	"strategy" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"picker_id" text,
	"zone_id" text,
	"staging_location_id" text,
	"order_ids" jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "wave_id" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "pick_list_number" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "strategy" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "picker_id" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "zone_id" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "staging_location_id" text;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "order_ids" jsonb;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pick_list_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pick_list_id" text NOT NULL,
	"order_id" text NOT NULL,
	"order_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"batch_id" text,
	"source_location_id" text NOT NULL,
	"source_location_code" text NOT NULL,
	"zone_id" text,
	"aisle" integer,
	"rack" integer,
	"shelf" integer,
	"bin_position" integer,
	"pick_sequence" integer DEFAULT 1 NOT NULL,
	"quantity_requested" integer NOT NULL,
	"quantity_picked" integer DEFAULT 0 NOT NULL,
	"quantity_short" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"short_reason" text,
	"picked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "pick_list_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "order_line_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "source_location_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "source_location_code" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "zone_id" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "aisle" integer;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "rack" integer;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "shelf" integer;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "bin_position" integer;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "pick_sequence" integer DEFAULT 1 NOT NULL;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "quantity_requested" integer;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "quantity_picked" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "quantity_short" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "short_reason" text;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "picked_at" timestamp with time zone;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pick_list_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "packing_stations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"station_code" text NOT NULL,
	"station_name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"default_staging_location_id" text,
	"scale_device_id" text,
	"printer_device_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "station_code" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "station_name" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "default_staging_location_id" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "scale_device_id" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "printer_device_id" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "packing_stations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "packaging_boxes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"length_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"height_mm" integer NOT NULL,
	"max_weight_grams" integer NOT NULL,
	"tare_weight_grams" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "length_mm" integer;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "width_mm" integer;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "height_mm" integer;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "max_weight_grams" integer;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "tare_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "packaging_boxes" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "shipping_manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"manifest_number" text NOT NULL,
	"carrier_id" text NOT NULL,
	"carrier_name" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"vehicle_reference" text,
	"driver_name" text,
	"driver_phone" text,
	"total_containers" integer DEFAULT 0 NOT NULL,
	"total_gross_weight_grams" integer DEFAULT 0 NOT NULL,
	"sealed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "manifest_number" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "carrier_id" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "carrier_name" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "vehicle_reference" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "driver_name" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "driver_phone" text;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "total_containers" integer DEFAULT 0 NOT NULL;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "total_gross_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "sealed_at" timestamp with time zone;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "shipping_manifests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "packed_containers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"station_id" text,
	"box_type_id" text,
	"manifest_id" text,
	"container_number" text NOT NULL,
	"sscc_barcode" text NOT NULL,
	"tracking_number" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"tare_weight_grams" integer DEFAULT 0 NOT NULL,
	"net_weight_grams" integer DEFAULT 0 NOT NULL,
	"gross_weight_grams" integer DEFAULT 0 NOT NULL,
	"scale_verified_weight_grams" integer,
	"weight_discrepancy_grams" integer,
	"seal_number" text,
	"sealed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "station_id" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "box_type_id" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "manifest_id" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "container_number" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "sscc_barcode" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "tracking_number" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'OPEN' NOT NULL;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "tare_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "net_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "gross_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "scale_verified_weight_grams" integer;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "weight_discrepancy_grams" integer;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "seal_number" text;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "sealed_at" timestamp with time zone;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "packed_containers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "packed_container_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"container_id" text NOT NULL,
	"pick_list_line_id" text,
	"order_id" text NOT NULL,
	"order_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"batch_id" text,
	"serial_numbers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "container_id" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "pick_list_line_id" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "order_line_id" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "serial_numbers" jsonb;
ALTER TABLE "packed_container_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "internal_bin_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"transfer_number" text NOT NULL,
	"transfer_type" text DEFAULT 'INTERNAL_BIN_MOVE' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"source_location_id" text NOT NULL,
	"destination_location_id" text NOT NULL,
	"operator_id" text,
	"notes" text,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "transfer_number" text;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "transfer_type" text DEFAULT 'INTERNAL_BIN_MOVE' NOT NULL;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "source_location_id" text;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "destination_location_id" text;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "operator_id" text;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "internal_bin_transfers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "internal_bin_transfer_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"transfer_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"batch_id" text,
	"serial_numbers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "transfer_id" text;
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "serial_numbers" jsonb;
ALTER TABLE "internal_bin_transfer_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "cross_dock_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"inbound_receipt_id" text NOT NULL,
	"inbound_line_id" text NOT NULL,
	"matched_order_id" text NOT NULL,
	"matched_order_line_id" text NOT NULL,
	"quantity_to_cross_dock" integer NOT NULL,
	"target_staging_location_id" text NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"operator_id" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "inbound_receipt_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "inbound_line_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "matched_order_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "matched_order_line_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "quantity_to_cross_dock" integer;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "target_staging_location_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PLANNED' NOT NULL;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "operator_id" text;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "cross_dock_operations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "stock_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"batch_number" text NOT NULL,
	"supplier_lot_number" text,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"manufacture_date" timestamp with time zone,
	"expiry_date" timestamp with time zone,
	"retest_date" timestamp with time zone,
	"certificate_of_analysis_url" text,
	"quarantine_reason" text,
	"quarantine_notes" text,
	"quarantined_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"released_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "batch_number" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "supplier_lot_number" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'AVAILABLE' NOT NULL;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "manufacture_date" timestamp with time zone;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "expiry_date" timestamp with time zone;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "retest_date" timestamp with time zone;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "certificate_of_analysis_url" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "quarantine_reason" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "quarantine_notes" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "quarantined_at" timestamp with time zone;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "released_at" timestamp with time zone;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "released_by" text;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "stock_serials" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"batch_id" text,
	"serial_number" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"location_id" text,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"quarantine_reason" text,
	"quarantine_notes" text,
	"quarantined_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"released_by" text,
	"warranty_start_date" timestamp with time zone,
	"warranty_end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "serial_number" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "location_id" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'AVAILABLE' NOT NULL;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "quarantine_reason" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "quarantine_notes" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "quarantined_at" timestamp with time zone;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "released_at" timestamp with time zone;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "released_by" text;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "warranty_start_date" timestamp with time zone;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "warranty_end_date" timestamp with time zone;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "stock_serials" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "stock_ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"movement_type" text NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"batch_id" text,
	"serial_id" text,
	"source_warehouse_id" text,
	"source_location_id" text,
	"destination_warehouse_id" text,
	"destination_location_id" text,
	"quantity" double precision NOT NULL,
	"unit_cost_minor" text NOT NULL,
	"total_cost_minor" text NOT NULL,
	"user_id" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "movement_type" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "reference_type" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "reference_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "serial_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "source_warehouse_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "source_location_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "destination_warehouse_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "destination_location_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "quantity" double precision;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "unit_cost_minor" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "total_cost_minor" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "stock_ledger_entries" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "stock_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"batch_id" text,
	"serial_id" text,
	"quantity" double precision NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "serial_id" text;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "quantity" double precision;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "reference_type" text;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "reference_id" text;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "fulfilled_at" timestamp with time zone;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "released_at" timestamp with time zone;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "stock_balance_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"location_id" text,
	"variant_id" text NOT NULL,
	"batch_id" text,
	"on_hand_quantity" double precision DEFAULT 0 NOT NULL,
	"reserved_quantity" double precision DEFAULT 0 NOT NULL,
	"available_to_promise" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "location_id" text;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "on_hand_quantity" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "reserved_quantity" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "available_to_promise" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "stock_balance_snapshots" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "price_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"currency_code" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"customer_group" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "currency_code" text;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "customer_group" text;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "price_lists" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "price_list_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pricelist_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"fixed_price_minor" text,
	"discount_percent_bp" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "pricelist_id" text;
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "min_quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "fixed_price_minor" text;
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "discount_percent_bp" integer;
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "price_list_rules" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "tax_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rate_bp" integer NOT NULL,
	"computation_type" text DEFAULT 'PERCENTAGE' NOT NULL,
	"inclusion_type" text DEFAULT 'EXCLUSIVE' NOT NULL,
	"liability_account_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "rate_bp" integer;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "computation_type" text DEFAULT 'PERCENTAGE' NOT NULL;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "inclusion_type" text DEFAULT 'EXCLUSIVE' NOT NULL;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "liability_account_id" text;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "discount_promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"discount_type" text NOT NULL,
	"value_minor_or_bp" text NOT NULL,
	"max_discount_minor" text,
	"min_subtotal_minor" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "discount_type" text;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "value_minor_or_bp" text;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "max_discount_minor" text;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "min_subtotal_minor" text;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "usage_limit" integer;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "usage_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "discount_promotions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pos_registers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"work_center_id" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"default_price_list_id" text,
	"blind_closing_enabled" boolean DEFAULT true NOT NULL,
	"max_cash_limit_minor" bigint DEFAULT 1000000 NOT NULL,
	"max_allowed_variance_minor" bigint DEFAULT 1000 NOT NULL,
	"receipt_header" text,
	"receipt_footer" text,
	"open_cash_drawer_on_sale" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "work_center_id" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "default_price_list_id" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "blind_closing_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "max_cash_limit_minor" bigint DEFAULT 1000000 NOT NULL;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "max_allowed_variance_minor" bigint DEFAULT 1000 NOT NULL;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "receipt_header" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "receipt_footer" text;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "open_cash_drawer_on_sale" boolean DEFAULT true NOT NULL;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pos_registers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pos_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"register_id" text NOT NULL,
	"cashier_user_id" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"opening_float_minor" bigint DEFAULT 0 NOT NULL,
	"opening_denominations" jsonb,
	"closing_expected_minor" bigint,
	"closing_actual_minor" bigint,
	"closing_denominations" jsonb,
	"variance_minor" bigint,
	"variance_category" text,
	"supervisor_user_id" text,
	"supervisor_override_reason" text,
	"notes" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"reconciled_at" timestamp with time zone
);
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "register_id" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "cashier_user_id" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'OPEN' NOT NULL;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "opening_float_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "opening_denominations" jsonb;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "closing_expected_minor" bigint;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "closing_actual_minor" bigint;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "closing_denominations" jsonb;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "variance_minor" bigint;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "variance_category" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "supervisor_user_id" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "supervisor_override_reason" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "opened_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "reconciled_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "pos_cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"session_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"drawer_balance_after_minor" bigint NOT NULL,
	"source_type" text,
	"source_id" text,
	"reason" text,
	"safe_drop_envelope" text,
	"authorized_by_user_id" text,
	"performed_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "session_id" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "movement_type" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "amount_minor" bigint;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "drawer_balance_after_minor" bigint;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "source_id" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "safe_drop_envelope" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "authorized_by_user_id" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "performed_by_user_id" text;
ALTER TABLE "pos_cash_movements" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "sales_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_number" text NOT NULL,
	"channel_type" text NOT NULL,
	"branch_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"customer_id" text,
	"quotation_id" text,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"shipping_address" text,
	"billing_address" text,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"payment_status" text DEFAULT 'UNPAID' NOT NULL,
	"fulfillment_status" text DEFAULT 'UNFULFILLED' NOT NULL,
	"pos_session_id" text,
	"pos_register_id" text,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"total_discount_minor" bigint DEFAULT 0 NOT NULL,
	"total_tax_minor" bigint DEFAULT 0 NOT NULL,
	"grand_total_minor" bigint DEFAULT 0 NOT NULL,
	"amount_paid_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "order_number" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "channel_type" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "quotation_id" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "customer_phone" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "shipping_address" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "billing_address" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'UNPAID' NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "fulfillment_status" text DEFAULT 'UNFULFILLED' NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "pos_session_id" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "pos_register_id" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "subtotal_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "total_discount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "total_tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "grand_total_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "amount_paid_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "sales_order_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"fulfilled_quantity" integer DEFAULT 0 NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"cogs_minor" bigint
);
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "fulfilled_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "unit_price_minor" bigint;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "discount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "line_total_minor" bigint;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "cogs_minor" bigint;
CREATE TABLE IF NOT EXISTS "pos_sync_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"device_id" text NOT NULL,
	"pos_register_id" text NOT NULL,
	"pos_session_id" text NOT NULL,
	"total_submitted" integer NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"conflict_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "device_id" text;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "pos_register_id" text;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "pos_session_id" text;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "total_submitted" integer;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "processed_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "duplicate_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "conflict_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "rejected_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pos_sync_batches" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pos_sync_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"client_tx_id" text NOT NULL,
	"device_id" text NOT NULL,
	"pos_session_id" text NOT NULL,
	"client_sequence" integer NOT NULL,
	"client_timestamp" timestamp with time zone NOT NULL,
	"tx_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text NOT NULL,
	"server_order_id" text,
	"conflict_reason" text,
	"reconciliation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "client_tx_id" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "device_id" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "pos_session_id" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "client_sequence" integer;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "client_timestamp" timestamp with time zone;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "tx_type" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "server_order_id" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "conflict_reason" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "reconciliation_note" text;
ALTER TABLE "pos_sync_transactions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"tax_id" text,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"payment_terms" text DEFAULT 'NET_30' NOT NULL,
	"lead_time_days" integer DEFAULT 7 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"email" text,
	"phone" text,
	"website" text,
	"billing_address" text,
	"shipping_address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "payment_terms" text DEFAULT 'NET_30' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "lead_time_days" integer DEFAULT 7 NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "billing_address" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "shipping_address" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "supplier_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "is_primary" boolean DEFAULT false NOT NULL;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_contacts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "supplier_product_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"supplier_sku" text NOT NULL,
	"supplier_product_name" text,
	"minimum_order_quantity" integer DEFAULT 1 NOT NULL,
	"order_increment_quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"lead_time_days" integer,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "supplier_sku" text;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "supplier_product_name" text;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "minimum_order_quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "order_increment_quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "unit_cost_minor" bigint;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "lead_time_days" integer;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "is_preferred" boolean DEFAULT false NOT NULL;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_product_mappings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"request_number" text NOT NULL,
	"requested_by" text NOT NULL,
	"branch_id" text,
	"destination_warehouse_id" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"required_by_date" timestamp with time zone,
	"estimated_total_minor" bigint DEFAULT 0 NOT NULL,
	"preferred_supplier_id" text,
	"business_justification" text,
	"notes" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"converted_purchase_order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "request_number" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "requested_by" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "destination_warehouse_id" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "required_by_date" timestamp with time zone;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "estimated_total_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "preferred_supplier_id" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "business_justification" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "converted_purchase_order_id" text;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_request_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"request_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"estimated_unit_cost_minor" bigint DEFAULT 0 NOT NULL,
	"estimated_line_total_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "line_number" integer;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "estimated_unit_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "estimated_line_total_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_request_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_rfqs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rfq_number" text NOT NULL,
	"purchase_request_id" text,
	"destination_warehouse_id" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"response_deadline" timestamp with time zone,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "rfq_number" text;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "purchase_request_id" text;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "destination_warehouse_id" text;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "response_deadline" timestamp with time zone;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_rfqs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_rfq_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rfq_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"target_unit_cost_minor" bigint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "rfq_id" text;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "line_number" integer;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "target_unit_cost_minor" bigint;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_rfq_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_rfq_suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rfq_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"status" text DEFAULT 'INVITED' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
ALTER TABLE "purchase_rfq_suppliers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_rfq_suppliers" ADD COLUMN IF NOT EXISTS "rfq_id" text;
ALTER TABLE "purchase_rfq_suppliers" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "purchase_rfq_suppliers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'INVITED' NOT NULL;
ALTER TABLE "purchase_rfq_suppliers" ADD COLUMN IF NOT EXISTS "invited_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_rfq_suppliers" ADD COLUMN IF NOT EXISTS "responded_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "supplier_quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"quotation_number" text NOT NULL,
	"supplier_quotation_reference" text NOT NULL,
	"supplier_id" text NOT NULL,
	"rfq_id" text,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"lead_time_days" integer,
	"valid_until" timestamp with time zone,
	"payment_terms" text DEFAULT 'NET_30' NOT NULL,
	"notes" text,
	"selected_at" timestamp with time zone,
	"converted_purchase_order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "quotation_number" text;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "supplier_quotation_reference" text;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "rfq_id" text;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'RECEIVED' NOT NULL;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "subtotal_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "total_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "lead_time_days" integer;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "payment_terms" text DEFAULT 'NET_30' NOT NULL;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "selected_at" timestamp with time zone;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "converted_purchase_order_id" text;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_quotations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "supplier_quotation_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"quotation_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"lead_time_days" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "quotation_id" text;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "line_number" integer;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "unit_cost_minor" bigint;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "discount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "tax_rate_basis_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "line_total_minor" bigint;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "lead_time_days" integer;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_quotation_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"po_number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"destination_warehouse_id" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"expected_delivery_date" timestamp with time zone,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "po_number" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "destination_warehouse_id" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'NORMAL' NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "subtotal_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "discount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "total_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "expected_delivery_date" timestamp with time zone;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "issued_at" timestamp with time zone;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"variant_id" text NOT NULL,
	"supplier_sku" text,
	"quantity" integer NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"billed_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"tax_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"line_subtotal_minor" bigint NOT NULL,
	"line_tax_minor" bigint NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "purchase_order_id" text;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "line_number" integer;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "supplier_sku" text;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "received_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "billed_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "unit_cost_minor" bigint;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "tax_rate_basis_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "line_subtotal_minor" bigint;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "line_tax_minor" bigint;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "line_total_minor" bigint;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_order_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "goods_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"grn_number" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"destination_warehouse_id" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"received_by" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"inspected_by" text,
	"inspected_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "grn_number" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "purchase_order_id" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "destination_warehouse_id" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "carrier" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "tracking_number" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "received_by" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "received_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "inspected_by" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "inspected_at" timestamp with time zone;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "goods_receipt_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"goods_receipt_id" text NOT NULL,
	"purchase_order_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity_received" integer NOT NULL,
	"quantity_accepted" integer DEFAULT 0 NOT NULL,
	"quantity_quarantined" integer DEFAULT 0 NOT NULL,
	"quantity_rejected" integer DEFAULT 0 NOT NULL,
	"quarantine_reason" text,
	"lot_number" text,
	"internal_batch_number" text,
	"expiration_date" timestamp with time zone,
	"target_location_id" text NOT NULL,
	"quarantine_location_id" text,
	"unit_cost_minor" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "goods_receipt_id" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "purchase_order_line_id" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "quantity_received" integer;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "quantity_accepted" integer DEFAULT 0 NOT NULL;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "quantity_quarantined" integer DEFAULT 0 NOT NULL;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "quantity_rejected" integer DEFAULT 0 NOT NULL;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "quarantine_reason" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "lot_number" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "internal_batch_number" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "expiration_date" timestamp with time zone;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "target_location_id" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "quarantine_location_id" text;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "unit_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "landed_cost_vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"voucher_number" text NOT NULL,
	"allocation_method" text DEFAULT 'BY_VALUE' NOT NULL,
	"total_charges_minor" bigint DEFAULT 0 NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"posted_by" text,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "voucher_number" text;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "allocation_method" text DEFAULT 'BY_VALUE' NOT NULL;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "total_charges_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "posted_by" text;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "posted_at" timestamp with time zone;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "landed_cost_vouchers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "landed_cost_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"voucher_id" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount_minor" bigint NOT NULL
);
ALTER TABLE "landed_cost_charges" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "landed_cost_charges" ADD COLUMN IF NOT EXISTS "voucher_id" text;
ALTER TABLE "landed_cost_charges" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "landed_cost_charges" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "landed_cost_charges" ADD COLUMN IF NOT EXISTS "amount_minor" bigint;
CREATE TABLE IF NOT EXISTS "landed_cost_line_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"voucher_id" text NOT NULL,
	"goods_receipt_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"received_quantity" integer NOT NULL,
	"original_line_cost_minor" bigint NOT NULL,
	"allocated_charge_minor" bigint NOT NULL,
	"final_line_cost_minor" bigint NOT NULL,
	"unit_landed_cost_minor" bigint NOT NULL
);
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "voucher_id" text;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "goods_receipt_line_id" text;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "received_quantity" integer;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "original_line_cost_minor" bigint;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "allocated_charge_minor" bigint;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "final_line_cost_minor" bigint;
ALTER TABLE "landed_cost_line_allocations" ADD COLUMN IF NOT EXISTS "unit_landed_cost_minor" bigint;
CREATE TABLE IF NOT EXISTS "supplier_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"return_number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"goods_receipt_id" text,
	"warehouse_id" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"reason" text NOT NULL,
	"dispatched_at" timestamp with time zone,
	"authorized_by" text,
	"authorized_at" timestamp with time zone,
	"carrier" text,
	"tracking_number" text,
	"credit_memo_reference" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "return_number" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "purchase_order_id" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "goods_receipt_id" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "authorized_by" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "authorized_at" timestamp with time zone;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "carrier" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "tracking_number" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "credit_memo_reference" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "supplier_return_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"return_id" text NOT NULL,
	"goods_receipt_line_id" text,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "return_id" text;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "goods_receipt_line_id" text;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "unit_cost_minor" bigint;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "line_total_minor" bigint;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_return_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"supplier_invoice_reference" text NOT NULL,
	"supplier_id" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"goods_receipt_id" text,
	"invoice_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"match_status" text DEFAULT 'PERFECT_MATCH' NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"paid_amount_minor" bigint DEFAULT 0 NOT NULL,
	"price_variance_minor" bigint DEFAULT 0 NOT NULL,
	"quantity_variance" integer DEFAULT 0 NOT NULL,
	"discrepancy_notes" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "invoice_number" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "supplier_invoice_reference" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "purchase_order_id" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "goods_receipt_id" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "invoice_date" timestamp with time zone;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "match_status" text DEFAULT 'PERFECT_MATCH' NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "subtotal_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "total_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "paid_amount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "price_variance_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "quantity_variance" integer DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "discrepancy_notes" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "purchase_invoice_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"purchase_order_line_id" text NOT NULL,
	"goods_receipt_line_id" text,
	"variant_id" text NOT NULL,
	"quantity_invoiced" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"tax_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"line_subtotal_minor" bigint NOT NULL,
	"line_tax_minor" bigint NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "invoice_id" text;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "purchase_order_line_id" text;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "goods_receipt_line_id" text;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "quantity_invoiced" integer;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "unit_price_minor" bigint;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "tax_rate_basis_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "line_subtotal_minor" bigint;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "line_tax_minor" bigint;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "line_total_minor" bigint;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "purchase_invoice_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "supplier_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"payment_number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"payment_method" text DEFAULT 'BANK_TRANSFER' NOT NULL,
	"status" text DEFAULT 'DISBURSED' NOT NULL,
	"disbursed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reference" text,
	"idempotency_key" text NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "payment_number" text;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "supplier_id" text;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "amount_minor" bigint;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'BANK_TRANSFER' NOT NULL;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DISBURSED' NOT NULL;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "disbursed_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "reference" text;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "supplier_payment_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"purchase_invoice_id" text NOT NULL,
	"allocated_amount_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "supplier_payment_allocations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "supplier_payment_allocations" ADD COLUMN IF NOT EXISTS "payment_id" text;
ALTER TABLE "supplier_payment_allocations" ADD COLUMN IF NOT EXISTS "purchase_invoice_id" text;
ALTER TABLE "supplier_payment_allocations" ADD COLUMN IF NOT EXISTS "allocated_amount_minor" bigint;
ALTER TABLE "supplier_payment_allocations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "bill_of_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"bom_number" text NOT NULL,
	"variant_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"revision_label" text DEFAULT 'REV-A' NOT NULL,
	"type" text DEFAULT 'MANUFACTURE' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"output_quantity" integer DEFAULT 1 NOT NULL,
	"routing_id" text,
	"notes" text,
	"is_active_revision" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "bom_number" text;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "revision_label" text DEFAULT 'REV-A' NOT NULL;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'MANUFACTURE' NOT NULL;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "output_quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "routing_id" text;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "is_active_revision" boolean DEFAULT true NOT NULL;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "bill_of_materials" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "bom_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"bom_id" text NOT NULL,
	"component_variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"scrap_percentage_basis_points" integer DEFAULT 0 NOT NULL,
	"fixed_scrap_quantity" integer DEFAULT 0 NOT NULL,
	"operation_step_number" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "bom_id" text;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "component_variant_id" text;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "scrap_percentage_basis_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "fixed_scrap_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "operation_step_number" integer;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "bom_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "bom_byproducts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"bom_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"cost_allocation_basis_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "bom_byproducts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bom_byproducts" ADD COLUMN IF NOT EXISTS "bom_id" text;
ALTER TABLE "bom_byproducts" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "bom_byproducts" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "bom_byproducts" ADD COLUMN IF NOT EXISTS "cost_allocation_basis_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "bom_byproducts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "bom_byproducts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "mfg_work_centers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"capacity_units_per_hour" integer DEFAULT 1 NOT NULL,
	"efficiency_basis_points" integer DEFAULT 10000 NOT NULL,
	"hourly_labor_rate_minor" bigint NOT NULL,
	"hourly_machine_rate_minor" bigint NOT NULL,
	"hourly_overhead_rate_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "capacity_units_per_hour" integer DEFAULT 1 NOT NULL;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "efficiency_basis_points" integer DEFAULT 10000 NOT NULL;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "hourly_labor_rate_minor" bigint;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "hourly_machine_rate_minor" bigint;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "hourly_overhead_rate_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "mfg_work_centers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "routings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"routing_number" text NOT NULL,
	"name" text NOT NULL,
	"variant_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "routing_number" text;
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "routings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "routing_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"routing_id" text NOT NULL,
	"operation_number" integer NOT NULL,
	"name" text NOT NULL,
	"work_center_id" text NOT NULL,
	"setup_time_minutes" integer DEFAULT 0 NOT NULL,
	"run_time_minutes_per_unit" integer DEFAULT 0 NOT NULL,
	"teardown_time_minutes" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "routing_id" text;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "operation_number" integer;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "work_center_id" text;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "setup_time_minutes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "run_time_minutes_per_unit" integer DEFAULT 0 NOT NULL;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "teardown_time_minutes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "routing_operations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "manufacturing_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"mo_number" text NOT NULL,
	"variant_id" text NOT NULL,
	"bom_id" text NOT NULL,
	"routing_id" text,
	"warehouse_id" text NOT NULL,
	"destination_location_id" text NOT NULL,
	"target_quantity" integer NOT NULL,
	"produced_quantity" integer DEFAULT 0 NOT NULL,
	"scrapped_quantity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"lot_number" text,
	"scheduled_start_date" timestamp with time zone,
	"scheduled_completion_date" timestamp with time zone,
	"actual_start_date" timestamp with time zone,
	"actual_completion_date" timestamp with time zone,
	"total_material_cost_minor" bigint DEFAULT 0 NOT NULL,
	"total_labor_cost_minor" bigint DEFAULT 0 NOT NULL,
	"total_overhead_cost_minor" bigint DEFAULT 0 NOT NULL,
	"total_production_cost_minor" bigint DEFAULT 0 NOT NULL,
	"unit_production_cost_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "mo_number" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "bom_id" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "routing_id" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "destination_location_id" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "target_quantity" integer;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "produced_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "scrapped_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'NORMAL' NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "lot_number" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "scheduled_start_date" timestamp with time zone;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "scheduled_completion_date" timestamp with time zone;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "actual_start_date" timestamp with time zone;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "actual_completion_date" timestamp with time zone;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "total_material_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "total_labor_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "total_overhead_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "total_production_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "unit_production_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "manufacturing_orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "mo_components" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"manufacturing_order_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"required_quantity" integer NOT NULL,
	"consumed_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost_minor" bigint DEFAULT 0 NOT NULL,
	"total_cost_minor" bigint DEFAULT 0 NOT NULL,
	"is_backflushed" boolean DEFAULT false NOT NULL,
	"location_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "manufacturing_order_id" text;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "required_quantity" integer;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "consumed_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "unit_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "total_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "is_backflushed" boolean DEFAULT false NOT NULL;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "location_id" text;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "mo_components" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "mo_work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"manufacturing_order_id" text NOT NULL,
	"operation_id" text,
	"work_center_id" text NOT NULL,
	"operation_number" integer NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"actual_duration_minutes" integer DEFAULT 0 NOT NULL,
	"labor_cost_minor" bigint DEFAULT 0 NOT NULL,
	"machine_cost_minor" bigint DEFAULT 0 NOT NULL,
	"overhead_cost_minor" bigint DEFAULT 0 NOT NULL,
	"total_operation_cost_minor" bigint DEFAULT 0 NOT NULL,
	"operator_user_id" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "manufacturing_order_id" text;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "work_center_id" text;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "operation_number" integer;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "actual_duration_minutes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "labor_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "machine_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "overhead_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "total_operation_cost_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "operator_user_id" text;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "mo_work_orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "mo_execution_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"manufacturing_order_id" text NOT NULL,
	"run_number" integer NOT NULL,
	"good_quantity" integer NOT NULL,
	"scrapped_quantity" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"operator_user_id" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "manufacturing_order_id" text;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "run_number" integer;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "good_quantity" integer;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "scrapped_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "operator_user_id" text;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "mo_execution_runs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "mo_output_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"manufacturing_order_id" text NOT NULL,
	"run_id" text,
	"inspection_number" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"inspected_quantity" integer NOT NULL,
	"accepted_quantity" integer DEFAULT 0 NOT NULL,
	"quarantined_quantity" integer DEFAULT 0 NOT NULL,
	"rejected_quantity" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"notes" text,
	"inspector_user_id" text,
	"inspected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "manufacturing_order_id" text;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "run_id" text;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "inspection_number" text;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "inspected_quantity" integer;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "accepted_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "quarantined_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "rejected_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "failure_reason" text;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "inspector_user_id" text;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "inspected_at" timestamp with time zone;
ALTER TABLE "mo_output_inspections" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "mo_scrap_records" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"manufacturing_order_id" text NOT NULL,
	"scrap_number" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason_code" text DEFAULT 'DEFECT' NOT NULL,
	"is_process_loss" boolean DEFAULT false NOT NULL,
	"stock_movement_id" text,
	"notes" text,
	"operator_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "manufacturing_order_id" text;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "scrap_number" text;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "reason_code" text DEFAULT 'DEFECT' NOT NULL;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "is_process_loss" boolean DEFAULT false NOT NULL;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "stock_movement_id" text;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "operator_user_id" text;
ALTER TABLE "mo_scrap_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "mo_component_substitutions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"manufacturing_order_id" text NOT NULL,
	"original_variant_id" text NOT NULL,
	"substituted_variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"approved_by" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "manufacturing_order_id" text;
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "original_variant_id" text;
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "substituted_variant_id" text;
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "mo_component_substitutions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "customer_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"default_discount_percent_bp" integer DEFAULT 0 NOT NULL,
	"credit_limit_minor" bigint DEFAULT 0 NOT NULL,
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "default_discount_percent_bp" integer DEFAULT 0 NOT NULL;
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "credit_limit_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "payment_terms_days" integer DEFAULT 0 NOT NULL;
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_code" text NOT NULL,
	"display_name" text NOT NULL,
	"legal_name" text,
	"email" text,
	"phone" text,
	"tax_id" text,
	"customer_group_id" text,
	"price_list_id" text,
	"credit_limit_minor" bigint DEFAULT 0 NOT NULL,
	"outstanding_balance_minor" bigint DEFAULT 0 NOT NULL,
	"payment_terms" text DEFAULT 'IMMEDIATE' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_code" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "display_name" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "legal_name" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_group_id" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "price_list_id" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_limit_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "outstanding_balance_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "payment_terms" text DEFAULT 'IMMEDIATE' NOT NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "customer_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"address_type" text DEFAULT 'BOTH' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"street_line_1" text NOT NULL,
	"street_line_2" text,
	"city" text NOT NULL,
	"state_province" text,
	"postal_code" text,
	"country_code" text DEFAULT 'US' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "address_type" text DEFAULT 'BOTH' NOT NULL;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "street_line_1" text;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "street_line_2" text;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "state_province" text;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "country_code" text DEFAULT 'US' NOT NULL;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"quotation_number" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"branch_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"converted_sales_order_id" text,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"valid_until" timestamp with time zone,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"total_discount_minor" bigint DEFAULT 0 NOT NULL,
	"total_tax_minor" bigint DEFAULT 0 NOT NULL,
	"grand_total_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone
);
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "quotation_number" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "customer_phone" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "converted_sales_order_id" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "subtotal_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "total_discount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "total_tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "grand_total_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "converted_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "quotation_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"quotation_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"line_total_minor" bigint NOT NULL
);
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "quotation_id" text;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "unit_price_minor" bigint;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "discount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "quotation_lines" ADD COLUMN IF NOT EXISTS "line_total_minor" bigint;
CREATE TABLE IF NOT EXISTS "sales_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"order_id" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"status" text DEFAULT 'ISSUED' NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"total_minor" bigint NOT NULL,
	"amount_paid_minor" bigint DEFAULT 0 NOT NULL,
	"balance_due_minor" bigint NOT NULL,
	"due_date" timestamp with time zone,
	"notes" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "invoice_number" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "customer_phone" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ISSUED' NOT NULL;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "total_minor" bigint;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "amount_paid_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "balance_due_minor" bigint;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "issued_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "sales_invoice_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"line_total_minor" bigint NOT NULL
);
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "invoice_id" text;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "unit_price_minor" bigint;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "discount_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "tax_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "sales_invoice_lines" ADD COLUMN IF NOT EXISTS "line_total_minor" bigint;
CREATE TABLE IF NOT EXISTS "return_authorizations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"rma_number" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"customer_email" text,
	"original_order_id" text,
	"original_order_number" text,
	"resolution_preference" text DEFAULT 'REFUND' NOT NULL,
	"restocking_fee_bp" integer DEFAULT 0 NOT NULL,
	"return_tracking_number" text,
	"carrier_code" text,
	"receiving_location_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"received_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "rma_number" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "original_order_id" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "original_order_number" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "resolution_preference" text DEFAULT 'REFUND' NOT NULL;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "restocking_fee_bp" integer DEFAULT 0 NOT NULL;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "return_tracking_number" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "carrier_code" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "receiving_location_id" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "received_at" timestamp with time zone;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "return_authorizations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "return_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rma_id" text NOT NULL,
	"order_id" text,
	"order_line_id" text,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity_authorized" integer NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"reason_code" text NOT NULL,
	"customer_notes" text,
	"batch_id" text,
	"serial_numbers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "rma_id" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "order_line_id" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "item_name" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "quantity_authorized" integer;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "quantity_received" integer DEFAULT 0 NOT NULL;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "unit_price_cents" integer;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "reason_code" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "customer_notes" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "serial_numbers" jsonb;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "return_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "quality_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rma_id" text NOT NULL,
	"return_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity_inspected" integer NOT NULL,
	"condition_grade" text NOT NULL,
	"status" text NOT NULL,
	"failure_reason_code" text,
	"inspector_id" text,
	"quarantine_location_id" text,
	"inspection_notes" text,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "rma_id" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "return_line_id" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "quantity_inspected" integer;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "condition_grade" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "failure_reason_code" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "inspector_id" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "quarantine_location_id" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "inspection_notes" text;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "inspected_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "quality_inspections" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "disposition_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rma_id" text NOT NULL,
	"inspection_id" text,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"action_type" text NOT NULL,
	"destination_location_id" text NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"gross_refund_cents" integer DEFAULT 0 NOT NULL,
	"restocking_fee_cents" integer DEFAULT 0 NOT NULL,
	"net_refund_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"executed_by" text,
	"executed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "rma_id" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "inspection_id" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "action_type" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "destination_location_id" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PLANNED' NOT NULL;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "gross_refund_cents" integer DEFAULT 0 NOT NULL;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "restocking_fee_cents" integer DEFAULT 0 NOT NULL;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "net_refund_cents" integer DEFAULT 0 NOT NULL;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "executed_by" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "executed_at" timestamp with time zone;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "disposition_actions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "replenishment_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"strategy" text DEFAULT 'MIN_MAX' NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 0 NOT NULL,
	"lead_time_days" integer DEFAULT 1 NOT NULL,
	"order_multiple" integer DEFAULT 1 NOT NULL,
	"min_order_quantity" integer DEFAULT 1 NOT NULL,
	"primary_vendor_id" text,
	"upstream_warehouse_id" text,
	"preferred_sourcing" text DEFAULT 'PURCHASE_ORDER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "strategy" text DEFAULT 'MIN_MAX' NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "min_quantity" integer;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "max_quantity" integer;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "safety_stock" integer DEFAULT 0 NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "reorder_point" integer DEFAULT 0 NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "lead_time_days" integer DEFAULT 1 NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "order_multiple" integer DEFAULT 1 NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "min_order_quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "primary_vendor_id" text;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "upstream_warehouse_id" text;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "preferred_sourcing" text DEFAULT 'PURCHASE_ORDER' NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "replenishment_rules" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "replenishment_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"rule_id" text NOT NULL,
	"net_stock_position" integer NOT NULL,
	"reorder_point" integer NOT NULL,
	"recommended_quantity" integer NOT NULL,
	"sourcing_method" text NOT NULL,
	"target_vendor_id" text,
	"source_warehouse_id" text,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"generated_order_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "rule_id" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "net_stock_position" integer;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "reorder_point" integer;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "recommended_quantity" integer;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "sourcing_method" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "target_vendor_id" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "source_warehouse_id" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "estimated_cost_cents" integer DEFAULT 0 NOT NULL;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PROPOSED' NOT NULL;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "generated_order_id" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "replenishment_recommendations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "fleet_vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"vehicle_code" text NOT NULL,
	"license_plate" text NOT NULL,
	"make_model" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"max_payload_grams" integer NOT NULL,
	"max_volume_cm3" integer NOT NULL,
	"odometer_meters" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "vehicle_code" text;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "license_plate" text;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "make_model" text;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "max_payload_grams" integer;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "max_volume_cm3" integer;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "odometer_meters" integer DEFAULT 0 NOT NULL;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "fleet_vehicles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "fleet_drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"driver_code" text NOT NULL,
	"full_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"license_number" text NOT NULL,
	"license_expiry_date" text NOT NULL,
	"assigned_vehicle_id" text,
	"shift_status" text DEFAULT 'OFF_DUTY' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "driver_code" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "phone_number" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "license_number" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "license_expiry_date" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "assigned_vehicle_id" text;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "shift_status" text DEFAULT 'OFF_DUTY' NOT NULL;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "fleet_drivers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "delivery_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"run_number" text NOT NULL,
	"vehicle_id" text,
	"driver_id" text,
	"status" text DEFAULT 'PLANNING' NOT NULL,
	"total_stops" integer DEFAULT 0 NOT NULL,
	"completed_stops" integer DEFAULT 0 NOT NULL,
	"total_weight_grams" integer DEFAULT 0 NOT NULL,
	"total_volume_cm3" integer DEFAULT 0 NOT NULL,
	"dispatched_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "run_number" text;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "vehicle_id" text;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "driver_id" text;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PLANNING' NOT NULL;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "total_stops" integer DEFAULT 0 NOT NULL;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "completed_stops" integer DEFAULT 0 NOT NULL;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "total_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "total_volume_cm3" integer DEFAULT 0 NOT NULL;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "delivery_runs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "delivery_stops" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"run_id" text NOT NULL,
	"stop_sequence" integer NOT NULL,
	"order_id" text NOT NULL,
	"order_number" text NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"delivery_address" text NOT NULL,
	"latitude_microdegrees" integer,
	"longitude_microdegrees" integer,
	"time_window_start" text,
	"time_window_end" text,
	"estimated_arrival" timestamp with time zone,
	"actual_arrival" timestamp with time zone,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"failure_reason" text,
	"total_weight_grams" integer DEFAULT 0 NOT NULL,
	"total_volume_cm3" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "run_id" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "stop_sequence" integer;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "order_number" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "recipient_name" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "recipient_phone" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "delivery_address" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "latitude_microdegrees" integer;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "longitude_microdegrees" integer;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "time_window_start" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "time_window_end" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "estimated_arrival" timestamp with time zone;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "actual_arrival" timestamp with time zone;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "failure_reason" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "total_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "total_volume_cm3" integer DEFAULT 0 NOT NULL;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "proof_of_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"run_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"verification_method" text NOT NULL,
	"recipient_name" text NOT NULL,
	"signature_svg" text,
	"photo_url" text,
	"otp_code" text,
	"delivered_latitude_microdegrees" integer,
	"delivered_longitude_microdegrees" integer,
	"geofence_distance_meters" integer,
	"notes" text,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "run_id" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "stop_id" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "verification_method" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "recipient_name" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "signature_svg" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "photo_url" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "otp_code" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "delivered_latitude_microdegrees" integer;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "delivered_longitude_microdegrees" integer;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "geofence_distance_meters" integer;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "proof_of_deliveries" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "accounting_books" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"functional_currency" text DEFAULT 'USD' NOT NULL,
	"fiscal_year_start_month" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "functional_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "fiscal_year_start_month" integer DEFAULT 1 NOT NULL;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "accounting_books" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "fiscal_years" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text NOT NULL,
	"year_code" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "year_code" text;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "start_date" timestamp with time zone;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "end_date" timestamp with time zone;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "is_closed" boolean DEFAULT false NOT NULL;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "fiscal_years" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "accounting_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text NOT NULL,
	"fiscal_year_id" text NOT NULL,
	"period_number" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "fiscal_year_id" text;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "period_number" integer;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "start_date" timestamp with time zone;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "end_date" timestamp with time zone;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'OPEN' NOT NULL;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "closed_by" text;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "accounting_periods" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "chart_of_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text NOT NULL,
	"normal_balance" text NOT NULL,
	"parent_account_id" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "subtype" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "normal_balance" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "parent_account_id" text;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "is_reconciled" boolean DEFAULT false NOT NULL;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text,
	"period_id" text,
	"entry_number" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"source_type" text DEFAULT 'MANUAL' NOT NULL,
	"source_id" text,
	"reversal_of_entry_id" text,
	"reversal_entry_id" text,
	"narration" text NOT NULL,
	"posting_date" timestamp with time zone NOT NULL,
	"total_debit_minor" text NOT NULL,
	"total_credit_minor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "period_id" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "entry_number" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'MANUAL' NOT NULL;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source_id" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "reversal_of_entry_id" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "reversal_entry_id" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "narration" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posting_date" timestamp with time zone;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "total_debit_minor" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "total_credit_minor" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posted_at" timestamp with time zone;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "posted_by" text;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "journal_entry_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"journal_entry_id" text NOT NULL,
	"account_id" text NOT NULL,
	"debit_minor" text DEFAULT '0' NOT NULL,
	"credit_minor" text DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"description" text,
	"reference_entity_type" text,
	"reference_entity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "journal_entry_id" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "account_id" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "debit_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "credit_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "reference_entity_type" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "reference_entity_id" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "tax_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"tax_rate_ids" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "tax_groups" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tax_groups" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "tax_groups" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "tax_groups" ADD COLUMN IF NOT EXISTS "tax_rate_ids" text;
ALTER TABLE "tax_groups" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "tax_groups" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "tax_groups" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "accounting_posting_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text NOT NULL,
	"event_type" text NOT NULL,
	"rule_code" text NOT NULL,
	"description" text,
	"debit_account_code" text NOT NULL,
	"credit_account_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "rule_code" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "debit_account_code" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "credit_account_code" text;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "accounting_posting_rules" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "accounting_source_event_records" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text NOT NULL,
	"source_module" text NOT NULL,
	"event_type" text NOT NULL,
	"source_event_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"journal_entry_id" text,
	"status" text DEFAULT 'POSTED' NOT NULL,
	"error_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "source_module" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "source_event_id" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "journal_entry_id" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'POSTED' NOT NULL;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "error_details" text;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "accounting_source_event_records" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "reconciliation_records" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text NOT NULL,
	"reconciliation_type" text NOT NULL,
	"as_of_date" timestamp with time zone NOT NULL,
	"gl_account_id" text NOT NULL,
	"gl_balance_minor" text NOT NULL,
	"subledger_balance_minor" text NOT NULL,
	"discrepancy_minor" text NOT NULL,
	"status" text DEFAULT 'BALANCED' NOT NULL,
	"performed_by" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "reconciliation_type" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "as_of_date" timestamp with time zone;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "gl_account_id" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "gl_balance_minor" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "subledger_balance_minor" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "discrepancy_minor" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'BALANCED' NOT NULL;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "performed_by" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "reconciliation_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "consolidation_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"group_code" text NOT NULL,
	"name" text NOT NULL,
	"parent_company_id" text NOT NULL,
	"reporting_currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "group_code" text;
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "parent_company_id" text;
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "reporting_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "consolidation_groups" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "consolidation_group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"group_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text NOT NULL,
	"ownership_percentage_basis_points" integer DEFAULT 10000 NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"inclusion_status" text DEFAULT 'FULL' NOT NULL,
	"functional_currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "group_id" text;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "ownership_percentage_basis_points" integer DEFAULT 10000 NOT NULL;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "effective_from" timestamp with time zone;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "effective_to" timestamp with time zone;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "inclusion_status" text DEFAULT 'FULL' NOT NULL;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "functional_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "consolidation_group_members" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "group_chart_of_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"group_id" text NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"normal_balance" text NOT NULL,
	"is_elimination_target" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "group_id" text;
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "account_code" text;
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "account_name" text;
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "account_type" text;
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "normal_balance" text;
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "is_elimination_target" boolean DEFAULT false NOT NULL;
ALTER TABLE "group_chart_of_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "entity_account_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"group_id" text NOT NULL,
	"company_id" text NOT NULL,
	"source_account_code" text NOT NULL,
	"group_account_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "entity_account_mappings" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "entity_account_mappings" ADD COLUMN IF NOT EXISTS "group_id" text;
ALTER TABLE "entity_account_mappings" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "entity_account_mappings" ADD COLUMN IF NOT EXISTS "source_account_code" text;
ALTER TABLE "entity_account_mappings" ADD COLUMN IF NOT EXISTS "group_account_code" text;
ALTER TABLE "entity_account_mappings" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "entity_account_mappings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "consolidation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"group_id" text NOT NULL,
	"period_id" text NOT NULL,
	"period_name" text NOT NULL,
	"reporting_currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"operation_id" text NOT NULL,
	"fx_rate_version" text DEFAULT 'v1' NOT NULL,
	"run_by" text NOT NULL,
	"total_entities_included" integer DEFAULT 0 NOT NULL,
	"total_eliminations_minor" text DEFAULT '0' NOT NULL,
	"consolidated_net_income_minor" text DEFAULT '0' NOT NULL,
	"is_balanced" boolean DEFAULT true NOT NULL,
	"notes" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "group_id" text;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "period_id" text;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "period_name" text;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "reporting_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "fx_rate_version" text DEFAULT 'v1' NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "run_by" text;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "total_entities_included" integer DEFAULT 0 NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "total_eliminations_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "consolidated_net_income_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "is_balanced" boolean DEFAULT true NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "finalized_at" timestamp with time zone;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "consolidation_runs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "consolidation_run_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"run_id" text NOT NULL,
	"company_id" text NOT NULL,
	"book_id" text NOT NULL,
	"source_currency" text NOT NULL,
	"fx_rate_basis_points" integer DEFAULT 10000 NOT NULL,
	"local_net_income_minor" text DEFAULT '0' NOT NULL,
	"translated_net_income_minor" text DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "run_id" text;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "book_id" text;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "source_currency" text;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "fx_rate_basis_points" integer DEFAULT 10000 NOT NULL;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "local_net_income_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "translated_net_income_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "consolidation_run_entities" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "consolidation_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"run_id" text NOT NULL,
	"adjustment_type" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"narration" text NOT NULL,
	"total_debit_minor" text DEFAULT '0' NOT NULL,
	"total_credit_minor" text DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "run_id" text;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "adjustment_type" text;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "reference_type" text;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "reference_id" text;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "narration" text;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "total_debit_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "total_credit_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "consolidation_adjustments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "consolidation_adjustment_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"adjustment_id" text NOT NULL,
	"company_id" text,
	"group_account_code" text NOT NULL,
	"entry_type" text NOT NULL,
	"amount_minor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "consolidation_adjustment_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "consolidation_adjustment_lines" ADD COLUMN IF NOT EXISTS "adjustment_id" text;
ALTER TABLE "consolidation_adjustment_lines" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "consolidation_adjustment_lines" ADD COLUMN IF NOT EXISTS "group_account_code" text;
ALTER TABLE "consolidation_adjustment_lines" ADD COLUMN IF NOT EXISTS "entry_type" text;
ALTER TABLE "consolidation_adjustment_lines" ADD COLUMN IF NOT EXISTS "amount_minor" text;
ALTER TABLE "consolidation_adjustment_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "intercompany_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"primary_company_id" text NOT NULL,
	"counterparty_company_id" text NOT NULL,
	"relationship_type" text DEFAULT 'SUBSIDIARY' NOT NULL,
	"settlement_currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "intercompany_relationships" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "intercompany_relationships" ADD COLUMN IF NOT EXISTS "primary_company_id" text;
ALTER TABLE "intercompany_relationships" ADD COLUMN IF NOT EXISTS "counterparty_company_id" text;
ALTER TABLE "intercompany_relationships" ADD COLUMN IF NOT EXISTS "relationship_type" text DEFAULT 'SUBSIDIARY' NOT NULL;
ALTER TABLE "intercompany_relationships" ADD COLUMN IF NOT EXISTS "settlement_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "intercompany_relationships" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "intercompany_relationships" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "intercompany_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"transaction_reference" text NOT NULL,
	"from_company_id" text NOT NULL,
	"to_company_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"source_document_type" text NOT NULL,
	"source_document_id" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"amount_minor" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "transaction_reference" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "from_company_id" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "to_company_id" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "transaction_type" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "source_document_type" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "source_document_id" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "amount_minor" text;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "intercompany_transactions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "intercompany_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"from_transaction_id" text NOT NULL,
	"to_transaction_id" text,
	"match_status" text DEFAULT 'MATCHED' NOT NULL,
	"matched_amount_minor" text NOT NULL,
	"discrepancy_minor" text DEFAULT '0' NOT NULL,
	"notes" text,
	"matched_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "from_transaction_id" text;
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "to_transaction_id" text;
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "match_status" text DEFAULT 'MATCHED' NOT NULL;
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "matched_amount_minor" text;
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "discrepancy_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "intercompany_matches" ADD COLUMN IF NOT EXISTS "matched_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "elimination_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rule_code" text NOT NULL,
	"name" text NOT NULL,
	"transaction_type" text NOT NULL,
	"debit_group_account_code" text NOT NULL,
	"credit_group_account_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "rule_code" text;
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "transaction_type" text;
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "debit_group_account_code" text;
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "credit_group_account_code" text;
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "elimination_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "bank_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number_masked" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"gl_account_id" text NOT NULL,
	"current_balance_minor" text DEFAULT '0' NOT NULL,
	"statement_balance_minor" text DEFAULT '0' NOT NULL,
	"last_reconciled_at" timestamp with time zone,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "bank_name" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "account_name" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "account_number_masked" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "gl_account_id" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "current_balance_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "statement_balance_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "last_reconciled_at" timestamp with time zone;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "bank_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"provider_type" text DEFAULT 'MANUAL' NOT NULL,
	"provider_connection_id" text NOT NULL,
	"status" text DEFAULT 'CONNECTED' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_cursor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "provider_type" text DEFAULT 'MANUAL' NOT NULL;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "provider_connection_id" text;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'CONNECTED' NOT NULL;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp with time zone;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "sync_cursor" text;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "bank_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"bank_account_id" text NOT NULL,
	"external_transaction_id" text NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"amount_minor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"transaction_type" text DEFAULT 'OTHER' NOT NULL,
	"description" text NOT NULL,
	"matching_status" text DEFAULT 'UNMATCHED' NOT NULL,
	"matched_journal_entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "bank_account_id" text;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "external_transaction_id" text;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "transaction_date" timestamp with time zone;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "amount_minor" text;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "transaction_type" text DEFAULT 'OTHER' NOT NULL;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matching_status" text DEFAULT 'UNMATCHED' NOT NULL;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matched_journal_entry_id" text;
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "cash_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"transfer_number" text NOT NULL,
	"operation_id" text NOT NULL,
	"source_company_id" text NOT NULL,
	"source_bank_account_id" text NOT NULL,
	"destination_company_id" text NOT NULL,
	"destination_bank_account_id" text NOT NULL,
	"amount_minor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_intercompany" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"requires_dual_approval" boolean DEFAULT false NOT NULL,
	"initiated_by" text NOT NULL,
	"approved_by" text,
	"second_approved_by" text,
	"settled_at" timestamp with time zone,
	"journal_entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "transfer_number" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "source_company_id" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "source_bank_account_id" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "destination_company_id" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "destination_bank_account_id" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "amount_minor" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "is_intercompany" boolean DEFAULT false NOT NULL;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "requires_dual_approval" boolean DEFAULT false NOT NULL;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "initiated_by" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "second_approved_by" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "settled_at" timestamp with time zone;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "journal_entry_id" text;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "cash_transfers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "cash_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"forecast_date" timestamp with time zone NOT NULL,
	"horizon_days" integer DEFAULT 30 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"opening_cash_minor" text NOT NULL,
	"projected_inflows_minor" text NOT NULL,
	"projected_outflows_minor" text NOT NULL,
	"projected_closing_minor" text NOT NULL,
	"assumptions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "forecast_date" timestamp with time zone;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "horizon_days" integer DEFAULT 30 NOT NULL;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "opening_cash_minor" text;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "projected_inflows_minor" text;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "projected_outflows_minor" text;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "projected_closing_minor" text;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "assumptions" text;
ALTER TABLE "cash_forecasts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "tax_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"tax_id_number" text NOT NULL,
	"tax_type" text DEFAULT 'VAT' NOT NULL,
	"filing_frequency" text DEFAULT 'MONTHLY' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "jurisdiction_code" text;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "tax_id_number" text;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "tax_type" text DEFAULT 'VAT' NOT NULL;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "filing_frequency" text DEFAULT 'MONTHLY' NOT NULL;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "effective_from" timestamp with time zone;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "effective_to" timestamp with time zone;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "tax_registrations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "tax_jurisdiction_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"standard_rate_basis_points" integer NOT NULL,
	"reduced_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"zero_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"output_tax_account_code" text DEFAULT '2100' NOT NULL,
	"input_tax_account_code" text DEFAULT '2105' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "jurisdiction_code" text;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "standard_rate_basis_points" integer;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "reduced_rate_basis_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "zero_rate_basis_points" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "output_tax_account_code" text DEFAULT '2100' NOT NULL;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "input_tax_account_code" text DEFAULT '2105' NOT NULL;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "effective_from" timestamp with time zone;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "tax_jurisdiction_configs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "tax_filing_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"registration_id" text NOT NULL,
	"period_name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "registration_id" text;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "period_name" text;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "start_date" timestamp with time zone;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "end_date" timestamp with time zone;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'OPEN' NOT NULL;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "tax_filing_periods" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "tax_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"filing_period_id" text NOT NULL,
	"company_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"reporting_currency" text DEFAULT 'USD' NOT NULL,
	"total_taxable_sales_minor" text DEFAULT '0' NOT NULL,
	"total_output_tax_minor" text DEFAULT '0' NOT NULL,
	"total_taxable_purchases_minor" text DEFAULT '0' NOT NULL,
	"total_recoverable_input_tax_minor" text DEFAULT '0' NOT NULL,
	"net_tax_due_minor" text DEFAULT '0' NOT NULL,
	"gl_control_account_balance_minor" text DEFAULT '0' NOT NULL,
	"reconciliation_difference_minor" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"prepared_by" text NOT NULL,
	"approved_by" text,
	"submitted_at" timestamp with time zone,
	"filing_reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "filing_period_id" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "reporting_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "total_taxable_sales_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "total_output_tax_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "total_taxable_purchases_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "total_recoverable_input_tax_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "net_tax_due_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "gl_control_account_balance_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "reconciliation_difference_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "prepared_by" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "filing_reference" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "tax_returns" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "tax_filing_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"tax_return_id" text NOT NULL,
	"submission_attempt" integer DEFAULT 1 NOT NULL,
	"provider_type" text DEFAULT 'MOCK_TAX_PORTAL' NOT NULL,
	"submission_reference" text NOT NULL,
	"provider_status" text DEFAULT 'SUBMITTED' NOT NULL,
	"acknowledgement_token" text,
	"error_message" text,
	"submitted_payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "tax_return_id" text;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "submission_attempt" integer DEFAULT 1 NOT NULL;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "provider_type" text DEFAULT 'MOCK_TAX_PORTAL' NOT NULL;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "submission_reference" text;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "provider_status" text DEFAULT 'SUBMITTED' NOT NULL;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "acknowledgement_token" text;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "submitted_payload_hash" text;
ALTER TABLE "tax_filing_submissions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "holding_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"parent_company_id" text NOT NULL,
	"subsidiary_company_ids" text NOT NULL,
	"consolidation_currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "parent_company_id" text;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "subsidiary_company_ids" text;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "consolidation_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "holding_groups" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "inter_company_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"transfer_number" text NOT NULL,
	"source_company_id" text NOT NULL,
	"source_warehouse_id" text NOT NULL,
	"destination_company_id" text NOT NULL,
	"destination_warehouse_id" text NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"total_amount_minor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"items_json" text NOT NULL,
	"source_sales_order_id" text,
	"destination_purchase_order_id" text,
	"source_journal_entry_id" text,
	"destination_journal_entry_id" text,
	"elimination_journal_entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "transfer_number" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "source_company_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "source_warehouse_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "destination_company_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "destination_warehouse_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PROPOSED' NOT NULL;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "total_amount_minor" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "items_json" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "source_sales_order_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "destination_purchase_order_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "source_journal_entry_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "destination_journal_entry_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "elimination_journal_entry_id" text;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "inter_company_transfers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "webhook_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"target_url" text NOT NULL,
	"secret_token" text NOT NULL,
	"event_types" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"retry_limit" integer DEFAULT 5 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"circuit_breaker_tripped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "target_url" text;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "secret_token" text;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "event_types" text;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "retry_limit" integer DEFAULT 5 NOT NULL;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "failure_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "circuit_breaker_tripped_at" timestamp with time zone;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "webhook_subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "webhook_delivery_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"signature_header" text NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"http_status_code" integer,
	"response_body" text,
	"error_message" text,
	"next_retry_at" timestamp with time zone,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "subscription_id" text;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "payload_json" text;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "signature_header" text;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "attempt_number" integer DEFAULT 1 NOT NULL;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "http_status_code" integer;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "response_body" text;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "next_retry_at" timestamp with time zone;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "webhook_dead_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"total_attempts" integer DEFAULT 1 NOT NULL,
	"last_error" text NOT NULL,
	"replayed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "subscription_id" text;
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "payload_json" text;
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "total_attempts" integer DEFAULT 1 NOT NULL;
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "replayed_at" timestamp with time zone;
ALTER TABLE "webhook_dead_letters" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "document_render_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"document_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"format" text DEFAULT 'HTML' NOT NULL,
	"is_reprint" boolean DEFAULT false NOT NULL,
	"reprint_count" integer DEFAULT 0 NOT NULL,
	"rendered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "document_type" text;
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "format" text DEFAULT 'HTML' NOT NULL;
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "is_reprint" boolean DEFAULT false NOT NULL;
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "reprint_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "rendered_by" text;
ALTER TABLE "document_render_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"channel" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata_json" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "severity" text DEFAULT 'INFO' NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "metadata_json" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "analytics_abc_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"criterion" text NOT NULL,
	"total_items" integer NOT NULL,
	"total_value_minor" text NOT NULL,
	"a_items_count" integer NOT NULL,
	"b_items_count" integer NOT NULL,
	"c_items_count" integer NOT NULL,
	"a_items_value_minor" text NOT NULL,
	"b_items_value_minor" text NOT NULL,
	"c_items_value_minor" text NOT NULL,
	"items_json" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "criterion" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "total_items" integer;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "total_value_minor" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "a_items_count" integer;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "b_items_count" integer;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "c_items_count" integer;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "a_items_value_minor" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "b_items_value_minor" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "c_items_value_minor" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "items_json" text;
ALTER TABLE "analytics_abc_snapshots" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "analytics_demand_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"method" text NOT NULL,
	"historical_mean" integer NOT NULL,
	"projected_demands_json" text NOT NULL,
	"mean_absolute_deviation" integer NOT NULL,
	"tracking_signal" integer NOT NULL,
	"stockout_risk_score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "method" text;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "historical_mean" integer;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "projected_demands_json" text;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "mean_absolute_deviation" integer;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "tracking_signal" integer;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "stockout_risk_score" integer;
ALTER TABLE "analytics_demand_forecasts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "analytics_dead_stock_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"days_inactive" integer NOT NULL,
	"on_hand_quantity" integer NOT NULL,
	"tied_up_capital_minor" text NOT NULL,
	"holding_cost_minor" text NOT NULL,
	"aging_tier" text NOT NULL,
	"recommended_action" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "days_inactive" integer;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "on_hand_quantity" integer;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "tied_up_capital_minor" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "holding_cost_minor" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "aging_tier" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "recommended_action" text;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "is_resolved" boolean DEFAULT false NOT NULL;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
ALTER TABLE "analytics_dead_stock_alerts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "search_index_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"primary_text" text NOT NULL,
	"secondary_text" text,
	"barcode" text,
	"sku" text,
	"reference_number" text,
	"metadata_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "primary_text" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "secondary_text" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "barcode" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "reference_number" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "metadata_json" text;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "search_index_entries" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "audit_chain_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"block_index" integer NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"previous_hash" text NOT NULL,
	"current_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "block_index" integer;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "actor_id" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "action" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "resource" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "resource_id" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "payload_hash" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "previous_hash" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "current_hash" text;
ALTER TABLE "audit_chain_blocks" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "data_export_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"format" text DEFAULT 'CSV' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"download_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "format" text DEFAULT 'CSV' NOT NULL;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "row_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "download_token" text;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "data_export_jobs" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "custom_report_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"metrics_json" text NOT NULL,
	"dimensions_json" text NOT NULL,
	"filters_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "metrics_json" text;
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "dimensions_json" text;
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "filters_json" text;
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "custom_report_definitions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "gdpr_erasure_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_type" text DEFAULT 'CUSTOMER' NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"dpo_approved_by" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"pii_fields_json" text NOT NULL,
	"records_affected_count" integer DEFAULT 0 NOT NULL,
	"erasure_hash" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"notes" text
);
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "subject_id" text;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "subject_type" text DEFAULT 'CUSTOMER' NOT NULL;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "requested_by_user_id" text;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "dpo_approved_by" text;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "pii_fields_json" text;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "records_affected_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "erasure_hash" text;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "requested_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "processed_at" timestamp with time zone;
ALTER TABLE "gdpr_erasure_requests" ADD COLUMN IF NOT EXISTS "notes" text;
CREATE TABLE IF NOT EXISTS "compliance_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"standard" text NOT NULL,
	"actor_id" text NOT NULL,
	"event_type" text NOT NULL,
	"target_resource" text NOT NULL,
	"target_id" text NOT NULL,
	"verification_hash" text NOT NULL,
	"details_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "standard" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "actor_id" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "target_resource" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "target_id" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "verification_hash" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "details_json" text;
ALTER TABLE "compliance_audit_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "hardware_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text,
	"register_id" text,
	"name" text NOT NULL,
	"device_type" text NOT NULL,
	"protocol" text NOT NULL,
	"connection_interface" text NOT NULL,
	"ip_address" text,
	"port" integer,
	"serial_port" text,
	"baud_rate" integer,
	"mac_address" text,
	"profile_id" text,
	"status" text DEFAULT 'ONLINE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "register_id" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "device_type" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "protocol" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "connection_interface" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "port" integer;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "serial_port" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "baud_rate" integer;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "mac_address" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "profile_id" text;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ONLINE' NOT NULL;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" timestamp with time zone;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "hardware_devices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "hardware_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"device_type" text NOT NULL,
	"paper_width_mm" integer DEFAULT 80 NOT NULL,
	"column_count" integer DEFAULT 48 NOT NULL,
	"drawer_kick_pin" integer DEFAULT 2 NOT NULL,
	"drawer_pulse_duration_ms" integer DEFAULT 100 NOT NULL,
	"scale_precision_grams" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "device_type" text;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "paper_width_mm" integer DEFAULT 80 NOT NULL;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "column_count" integer DEFAULT 48 NOT NULL;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "drawer_kick_pin" integer DEFAULT 2 NOT NULL;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "drawer_pulse_duration_ms" integer DEFAULT 100 NOT NULL;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "scale_precision_grams" integer DEFAULT 1 NOT NULL;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "hardware_profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "hardware_print_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"device_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"payload_bytes_base64" text NOT NULL,
	"plaintext_preview" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "device_id" text;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "job_type" text;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'QUEUED' NOT NULL;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "payload_bytes_base64" text;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "plaintext_preview" text;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "retry_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "hardware_print_jobs" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "fiscal_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_name" text NOT NULL,
	"country_code" text NOT NULL,
	"vat_id" text,
	"tax_registration_id" text,
	"peppol_endpoint_id" text,
	"peppol_scheme_id" text,
	"address_line1" text NOT NULL,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "country_code" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "vat_id" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "tax_registration_id" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "peppol_endpoint_id" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "peppol_scheme_id" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "address_line1" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'EUR' NOT NULL;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "fiscal_entities" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "certified_e_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"standard" text NOT NULL,
	"profile" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"sha256_digest" text NOT NULL,
	"xml_content" text NOT NULL,
	"peppol_message_id" text,
	"transmission_timestamp" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "invoice_number" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "standard" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "profile" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "sha256_digest" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "xml_content" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "peppol_message_id" text;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "transmission_timestamp" timestamp with time zone;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "certified_e_invoices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "fiscal_receipt_chains" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"register_id" text NOT NULL,
	"receipt_number" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"gross_amount_minor" text NOT NULL,
	"tax_amount_minor" text NOT NULL,
	"previous_signature_hash" text NOT NULL,
	"signature_hash" text NOT NULL,
	"qr_payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "register_id" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "receipt_number" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "sequence_number" integer;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "gross_amount_minor" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "tax_amount_minor" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "previous_signature_hash" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "signature_hash" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "qr_payload" text;
ALTER TABLE "fiscal_receipt_chains" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "b2b_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"parent_org_id" text,
	"name" text NOT NULL,
	"tax_identifier" text,
	"org_type" text DEFAULT 'SUBSIDIARY' NOT NULL,
	"credit_limit_minor" text DEFAULT '0' NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "parent_org_id" text;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "tax_identifier" text;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "org_type" text DEFAULT 'SUBSIDIARY' NOT NULL;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "credit_limit_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "payment_terms_days" integer DEFAULT 30 NOT NULL;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "b2b_organizations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "b2b_credit_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"credit_limit_minor" text DEFAULT '0' NOT NULL,
	"used_exposure_minor" text DEFAULT '0' NOT NULL,
	"available_credit_minor" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"hold_reason" text,
	"last_evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "organization_id" text;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "credit_limit_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "used_exposure_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "available_credit_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "hold_reason" text;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "last_evaluated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "b2b_credit_accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "b2b_contract_pricing" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"sku" text NOT NULL,
	"custom_price_minor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "organization_id" text;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "custom_price_minor" text;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "min_quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "b2b_contract_pricing" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "b2b_requisitions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"requisition_number" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"approver_user_id" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_amount_minor" text DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"items" jsonb NOT NULL,
	"approval_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "organization_id" text;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "requisition_number" text;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "requester_user_id" text;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "approver_user_id" text;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "total_amount_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "items" jsonb;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "approval_notes" text;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "b2b_requisitions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "b2b_punchout_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"buyer_cookie" text NOT NULL,
	"from_identity" text NOT NULL,
	"to_identity" text NOT NULL,
	"browser_form_post_url" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "organization_id" text;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "buyer_cookie" text;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "from_identity" text;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "to_identity" text;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "browser_form_post_url" text;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "b2b_punchout_sessions" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "loyalty_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"points_per_currency_minor" integer DEFAULT 100 NOT NULL,
	"points_currency" text DEFAULT 'USD' NOT NULL,
	"redemption_ratio_bp" integer DEFAULT 100 NOT NULL,
	"max_redemption_percent_bp" integer DEFAULT 5000 NOT NULL,
	"points_validity_days" integer DEFAULT 365 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "points_per_currency_minor" integer DEFAULT 100 NOT NULL;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "points_currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "redemption_ratio_bp" integer DEFAULT 100 NOT NULL;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "max_redemption_percent_bp" integer DEFAULT 5000 NOT NULL;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "points_validity_days" integer DEFAULT 365 NOT NULL;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "loyalty_programs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "loyalty_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"program_id" text NOT NULL,
	"tier_code" text NOT NULL,
	"tier_name" text NOT NULL,
	"min_spend_minor" text DEFAULT '0' NOT NULL,
	"multiplier_bp" integer DEFAULT 10000 NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "program_id" text;
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "tier_code" text;
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "tier_name" text;
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "min_spend_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "multiplier_bp" integer DEFAULT 10000 NOT NULL;
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 1 NOT NULL;
ALTER TABLE "loyalty_tiers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"program_id" text NOT NULL,
	"current_tier_code" text DEFAULT 'BRONZE' NOT NULL,
	"lifetime_spend_minor" text DEFAULT '0' NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_points_earned" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "program_id" text;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "current_tier_code" text DEFAULT 'BRONZE' NOT NULL;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "lifetime_spend_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "points_balance" integer DEFAULT 0 NOT NULL;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "lifetime_points_earned" integer DEFAULT 0 NOT NULL;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "loyalty_accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"account_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"points" integer NOT NULL,
	"order_id" text,
	"notes" text,
	"operation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "account_id" text;
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "transaction_type" text;
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "points" integer;
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "gift_card_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"card_code" text NOT NULL,
	"pin_hash" text,
	"pin_salt" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"initial_balance_minor" text DEFAULT '0' NOT NULL,
	"current_balance_minor" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"customer_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "card_code" text;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "pin_hash" text;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "pin_salt" text;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "initial_balance_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "current_balance_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "gift_card_accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "gift_card_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"gift_card_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"amount_minor" text NOT NULL,
	"previous_balance_minor" text NOT NULL,
	"new_balance_minor" text NOT NULL,
	"reference_order_id" text,
	"operation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "gift_card_id" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "transaction_type" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "amount_minor" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "previous_balance_minor" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "new_balance_minor" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "reference_order_id" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "gift_card_transactions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "edi_partners" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"partner_name" text NOT NULL,
	"edi_standard" text DEFAULT 'ANSI_X12' NOT NULL,
	"sender_id" text NOT NULL,
	"sender_qualifier" text DEFAULT '01' NOT NULL,
	"receiver_id" text NOT NULL,
	"receiver_qualifier" text DEFAULT '01' NOT NULL,
	"element_delimiter" text DEFAULT '*' NOT NULL,
	"segment_delimiter" text DEFAULT '~' NOT NULL,
	"subelement_delimiter" text DEFAULT ':' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "partner_name" text;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "edi_standard" text DEFAULT 'ANSI_X12' NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "sender_id" text;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "sender_qualifier" text DEFAULT '01' NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "receiver_id" text;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "receiver_qualifier" text DEFAULT '01' NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "element_delimiter" text DEFAULT '*' NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "segment_delimiter" text DEFAULT '~' NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "subelement_delimiter" text DEFAULT ':' NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "edi_partners" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "edi_message_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"direction" text NOT NULL,
	"standard" text DEFAULT 'ANSI_X12' NOT NULL,
	"transaction_type" text NOT NULL,
	"control_number" text NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"raw_content" text NOT NULL,
	"parsed_payload" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "partner_id" text;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "direction" text;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "standard" text DEFAULT 'ANSI_X12' NOT NULL;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "transaction_type" text;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "control_number" text;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'RECEIVED' NOT NULL;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "raw_content" text;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "parsed_payload" jsonb;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "edi_message_logs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "edi_interchange_controls" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"direction" text NOT NULL,
	"control_number" text NOT NULL,
	"transaction_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "edi_interchange_controls" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "edi_interchange_controls" ADD COLUMN IF NOT EXISTS "partner_id" text;
ALTER TABLE "edi_interchange_controls" ADD COLUMN IF NOT EXISTS "direction" text;
ALTER TABLE "edi_interchange_controls" ADD COLUMN IF NOT EXISTS "control_number" text;
ALTER TABLE "edi_interchange_controls" ADD COLUMN IF NOT EXISTS "transaction_type" text;
ALTER TABLE "edi_interchange_controls" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "customer_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"contract_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "contract_number" text;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "customer_contract_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"contract_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"fixed_price_minor" text,
	"discount_percent_bp" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "contract_id" text;
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "min_quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "fixed_price_minor" text;
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "discount_percent_bp" integer;
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "customer_contract_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "promotion_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"campaign_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"promotion_type" text NOT NULL,
	"stacking_rule" text DEFAULT 'BEST_DEAL' NOT NULL,
	"value_minor_or_bp" text DEFAULT '0' NOT NULL,
	"buy_quantity" integer,
	"get_quantity" integer,
	"get_discount_percent_bp" integer,
	"bundle_variant_ids" text,
	"bundle_fixed_price_minor" text,
	"min_subtotal_minor" text,
	"max_discount_minor" text,
	"eligible_variant_ids" text,
	"eligible_customer_group" text,
	"eligible_channel" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"budget_limit_minor" text,
	"budget_consumed_minor" text DEFAULT '0' NOT NULL,
	"usage_limit_total" integer,
	"usage_count_total" integer DEFAULT 0 NOT NULL,
	"usage_limit_per_customer" integer,
	"coupon_code" text,
	"requires_coupon" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "campaign_code" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "promotion_type" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "stacking_rule" text DEFAULT 'BEST_DEAL' NOT NULL;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "value_minor_or_bp" text DEFAULT '0' NOT NULL;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "buy_quantity" integer;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "get_quantity" integer;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "get_discount_percent_bp" integer;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "bundle_variant_ids" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "bundle_fixed_price_minor" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "min_subtotal_minor" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "max_discount_minor" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "eligible_variant_ids" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "eligible_customer_group" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "eligible_channel" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "budget_limit_minor" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "budget_consumed_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "usage_limit_total" integer;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "usage_count_total" integer DEFAULT 0 NOT NULL;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "usage_limit_per_customer" integer;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "coupon_code" text;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "requires_coupon" boolean DEFAULT false NOT NULL;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "promotion_campaigns" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "promotion_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"coupon_code" text,
	"order_id" text NOT NULL,
	"customer_id" text,
	"discount_amount_minor" text NOT NULL,
	"operation_id" text NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "campaign_id" text;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "coupon_code" text;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "discount_amount_minor" text;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "redeemed_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pricing_margin_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"min_margin_percent_bp" integer DEFAULT 1500 NOT NULL,
	"max_discount_percent_bp" integer DEFAULT 3000 NOT NULL,
	"cost_basis_type" text DEFAULT 'INVENTORY_COST' NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "min_margin_percent_bp" integer DEFAULT 1500 NOT NULL;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "max_discount_percent_bp" integer DEFAULT 3000 NOT NULL;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "cost_basis_type" text DEFAULT 'INVENTORY_COST' NOT NULL;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "requires_approval" boolean DEFAULT true NOT NULL;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pricing_margin_policies" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "pricing_override_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text,
	"variant_id" text NOT NULL,
	"original_price_minor" text NOT NULL,
	"requested_price_minor" text NOT NULL,
	"cost_minor" text NOT NULL,
	"margin_percent_bp" integer NOT NULL,
	"discount_percent_bp" integer NOT NULL,
	"reason" text NOT NULL,
	"requested_by" text NOT NULL,
	"approved_by" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"operation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "original_price_minor" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "requested_price_minor" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "cost_minor" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "margin_percent_bp" integer;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "discount_percent_bp" integer;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "requested_by" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pricing_override_requests" ADD COLUMN IF NOT EXISTS "decided_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "commercial_price_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text,
	"line_item_id" text,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"base_unit_price_minor" text NOT NULL,
	"resolved_unit_price_minor" text NOT NULL,
	"gross_line_minor" text NOT NULL,
	"discount_amount_minor" text DEFAULT '0' NOT NULL,
	"net_line_minor" text NOT NULL,
	"matched_rules_json" text NOT NULL,
	"applied_promotions_json" text NOT NULL,
	"tax_details_json" text NOT NULL,
	"loyalty_points_earned" integer DEFAULT 0 NOT NULL,
	"loyalty_points_redeemed" integer DEFAULT 0 NOT NULL,
	"override_id" text,
	"evaluation_timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "line_item_id" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "base_unit_price_minor" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "resolved_unit_price_minor" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "gross_line_minor" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "discount_amount_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "net_line_minor" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "matched_rules_json" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "applied_promotions_json" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "tax_details_json" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "loyalty_points_earned" integer DEFAULT 0 NOT NULL;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "loyalty_points_redeemed" integer DEFAULT 0 NOT NULL;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "override_id" text;
ALTER TABLE "commercial_price_snapshots" ADD COLUMN IF NOT EXISTS "evaluation_timestamp" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "rebate_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agreement_number" text NOT NULL,
	"name" text NOT NULL,
	"rebate_type" text NOT NULL,
	"counterparty_type" text NOT NULL,
	"counterparty_id" text NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"calculation_method" text DEFAULT 'GRADUATED_TIERS' NOT NULL,
	"settlement_frequency" text DEFAULT 'QUARTERLY' NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "agreement_number" text;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "rebate_type" text;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "counterparty_type" text;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "counterparty_id" text;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "calculation_method" text DEFAULT 'GRADUATED_TIERS' NOT NULL;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "settlement_frequency" text DEFAULT 'QUARTERLY' NOT NULL;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "valid_until" timestamp with time zone;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "rebate_agreements" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "rebate_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agreement_id" text NOT NULL,
	"tier_number" integer NOT NULL,
	"threshold_quantity" integer,
	"threshold_amount_minor" text,
	"rebate_rate_bp" integer DEFAULT 0 NOT NULL,
	"fixed_rebate_per_unit_minor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "agreement_id" text;
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "tier_number" integer;
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "threshold_quantity" integer;
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "threshold_amount_minor" text;
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "rebate_rate_bp" integer DEFAULT 0 NOT NULL;
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "fixed_rebate_per_unit_minor" text;
ALTER TABLE "rebate_tiers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "rebate_accruals" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agreement_id" text NOT NULL,
	"counterparty_id" text NOT NULL,
	"period_identifier" text NOT NULL,
	"eligible_quantity" integer DEFAULT 0 NOT NULL,
	"eligible_spend_minor" text DEFAULT '0' NOT NULL,
	"calculated_accrual_minor" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'ACCRUED' NOT NULL,
	"credit_note_reference" text,
	"settlement_reference" text,
	"operation_id" text,
	"last_recalculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "agreement_id" text;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "counterparty_id" text;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "period_identifier" text;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "eligible_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "eligible_spend_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "calculated_accrual_minor" text DEFAULT '0' NOT NULL;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACCRUED' NOT NULL;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "credit_note_reference" text;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "settlement_reference" text;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "last_recalculated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "rebate_accruals" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_account_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"parent_customer_id" text NOT NULL,
	"child_customer_id" text NOT NULL,
	"relationship_type" text DEFAULT 'PARENT_SUBSIDIARY' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_account_relationships" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_account_relationships" ADD COLUMN IF NOT EXISTS "parent_customer_id" text;
ALTER TABLE "crm_account_relationships" ADD COLUMN IF NOT EXISTS "child_customer_id" text;
ALTER TABLE "crm_account_relationships" ADD COLUMN IF NOT EXISTS "relationship_type" text DEFAULT 'PARENT_SUBSIDIARY' NOT NULL;
ALTER TABLE "crm_account_relationships" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "crm_account_relationships" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_account_relationships" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"role_title" text,
	"department" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "role_title" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "is_primary" boolean DEFAULT false NOT NULL;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_customer_merges" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"surviving_customer_id" text NOT NULL,
	"merged_customer_id" text NOT NULL,
	"merged_by" text NOT NULL,
	"reason" text NOT NULL,
	"audit_evidence_json" jsonb,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_customer_merges" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_customer_merges" ADD COLUMN IF NOT EXISTS "surviving_customer_id" text;
ALTER TABLE "crm_customer_merges" ADD COLUMN IF NOT EXISTS "merged_customer_id" text;
ALTER TABLE "crm_customer_merges" ADD COLUMN IF NOT EXISTS "merged_by" text;
ALTER TABLE "crm_customer_merges" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "crm_customer_merges" ADD COLUMN IF NOT EXISTS "audit_evidence_json" jsonb;
ALTER TABLE "crm_customer_merges" ADD COLUMN IF NOT EXISTS "merged_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"lead_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"company_name" text,
	"email" text,
	"phone" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"source" text DEFAULT 'WEBSITE' NOT NULL,
	"qualification_score_bp" integer DEFAULT 0 NOT NULL,
	"disqualification_reason" text,
	"assigned_to" text,
	"converted_customer_id" text,
	"converted_opportunity_id" text,
	"external_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "lead_code" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'NEW' NOT NULL;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'WEBSITE' NOT NULL;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "qualification_score_bp" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "disqualification_reason" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "converted_customer_id" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "converted_opportunity_id" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_pipelines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_pipelines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_pipelines" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "crm_pipelines" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "crm_pipelines" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;
ALTER TABLE "crm_pipelines" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "crm_pipelines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_pipelines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pipeline_id" text NOT NULL,
	"stage_code" text NOT NULL,
	"name" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"probability_bp" integer DEFAULT 0 NOT NULL,
	"is_won_stage" boolean DEFAULT false NOT NULL,
	"is_lost_stage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "pipeline_id" text;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "stage_code" text;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "order_index" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "probability_bp" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "is_won_stage" boolean DEFAULT false NOT NULL;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "is_lost_stage" boolean DEFAULT false NOT NULL;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_pipeline_stages" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"opportunity_code" text NOT NULL,
	"title" text NOT NULL,
	"customer_id" text NOT NULL,
	"pipeline_id" text NOT NULL,
	"current_stage_id" text NOT NULL,
	"estimated_value_minor" bigint DEFAULT 0 NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"probability_bp" integer DEFAULT 0 NOT NULL,
	"expected_close_date" timestamp with time zone,
	"assigned_to" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"loss_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "opportunity_code" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "pipeline_id" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "current_stage_id" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "estimated_value_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "probability_bp" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "expected_close_date" timestamp with time zone;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'OPEN' NOT NULL;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "loss_reason" text;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_opportunity_stage_history" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"from_stage_id" text,
	"to_stage_id" text NOT NULL,
	"changed_by" text NOT NULL,
	"notes" text,
	"transitioned_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_opportunity_stage_history" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_opportunity_stage_history" ADD COLUMN IF NOT EXISTS "opportunity_id" text;
ALTER TABLE "crm_opportunity_stage_history" ADD COLUMN IF NOT EXISTS "from_stage_id" text;
ALTER TABLE "crm_opportunity_stage_history" ADD COLUMN IF NOT EXISTS "to_stage_id" text;
ALTER TABLE "crm_opportunity_stage_history" ADD COLUMN IF NOT EXISTS "changed_by" text;
ALTER TABLE "crm_opportunity_stage_history" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "crm_opportunity_stage_history" ADD COLUMN IF NOT EXISTS "transitioned_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text,
	"contact_id" text,
	"opportunity_id" text,
	"lead_id" text,
	"activity_type" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"performed_by" text NOT NULL,
	"duration_minutes" integer,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "contact_id" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "opportunity_id" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "lead_id" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "activity_type" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "performed_by" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "performed_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text,
	"opportunity_id" text,
	"lead_id" text,
	"subject" text NOT NULL,
	"description" text,
	"due_date" timestamp with time zone NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"completed_at" timestamp with time zone,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "opportunity_id" text;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "lead_id" text;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'MEDIUM' NOT NULL;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"segment_type" text DEFAULT 'STATIC' NOT NULL,
	"rules_json" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "segment_type" text DEFAULT 'STATIC' NOT NULL;
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "rules_json" jsonb;
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_segments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_segment_members" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"segment_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_segment_members" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_segment_members" ADD COLUMN IF NOT EXISTS "segment_id" text;
ALTER TABLE "crm_segment_members" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_segment_members" ADD COLUMN IF NOT EXISTS "added_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_consent_records" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"purpose" text NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"policy_version" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "purpose" text;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "policy_version" text;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "timestamp" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_consent_records" ADD COLUMN IF NOT EXISTS "notes" text;
CREATE TABLE IF NOT EXISTS "crm_suppression_list" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"channel" text NOT NULL,
	"identifier" text NOT NULL,
	"reason" text NOT NULL,
	"suppressed_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_suppression_list" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_suppression_list" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "crm_suppression_list" ADD COLUMN IF NOT EXISTS "identifier" text;
ALTER TABLE "crm_suppression_list" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "crm_suppression_list" ADD COLUMN IF NOT EXISTS "suppressed_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"campaign_code" text NOT NULL,
	"name" text NOT NULL,
	"campaign_type" text DEFAULT 'ONE_TIME' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"channel" text DEFAULT 'EMAIL' NOT NULL,
	"segment_id" text NOT NULL,
	"subject_template" text,
	"body_template" text NOT NULL,
	"budget_limit_minor" bigint DEFAULT 0 NOT NULL,
	"actual_spend_minor" bigint DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "campaign_code" text;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "campaign_type" text DEFAULT 'ONE_TIME' NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "channel" text DEFAULT 'EMAIL' NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "segment_id" text;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "subject_template" text;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "body_template" text;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "budget_limit_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "actual_spend_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "total_recipients" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "sent_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "delivered_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "failed_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_campaigns" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"channel" text NOT NULL,
	"recipient_address" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"operation_id" text NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "campaign_id" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "recipient_address" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PENDING' NOT NULL;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "operation_id" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "provider_message_id" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "crm_messages" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_automations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"automation_code" text NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_filter_json" jsonb,
	"actions_json" jsonb NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "automation_code" text;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "trigger_type" text;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "trigger_filter_json" jsonb;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "actions_json" jsonb;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "crm_automations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "crm_automation_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"automation_id" text NOT NULL,
	"version" integer NOT NULL,
	"customer_id" text,
	"trigger_event_id" text NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"step_results_json" jsonb NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "automation_id" text;
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "version" integer;
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "customer_id" text;
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "trigger_event_id" text;
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'RUNNING' NOT NULL;
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "step_results_json" jsonb;
ALTER TABLE "crm_automation_executions" ADD COLUMN IF NOT EXISTS "executed_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "fulfillments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"fulfillment_number" text NOT NULL,
	"order_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"priority" text DEFAULT 'STANDARD' NOT NULL,
	"delivery_window_start" text,
	"delivery_window_end" text,
	"hold_reason" text,
	"hold_approved_by" text,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "fulfillment_number" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PLANNED' NOT NULL;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'STANDARD' NOT NULL;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "delivery_window_start" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "delivery_window_end" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "hold_reason" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "hold_approved_by" text;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "released_at" timestamp with time zone;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "fulfillments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "fulfillment_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"fulfillment_id" text NOT NULL,
	"order_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity_allocated" integer DEFAULT 0 NOT NULL,
	"quantity_packed" integer DEFAULT 0 NOT NULL,
	"quantity_dispatched" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "fulfillment_id" text;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "order_line_id" text;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "quantity_allocated" integer DEFAULT 0 NOT NULL;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "quantity_packed" integer DEFAULT 0 NOT NULL;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "quantity_dispatched" integer DEFAULT 0 NOT NULL;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "fulfillment_lines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "carriers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"carrier_code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'EXTERNAL_CARRIER' NOT NULL,
	"api_endpoint" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "carrier_code" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'EXTERNAL_CARRIER' NOT NULL;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "api_endpoint" text;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "carrier_services" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"carrier_id" text NOT NULL,
	"service_code" text NOT NULL,
	"name" text NOT NULL,
	"estimated_transit_days" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "carrier_id" text;
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "service_code" text;
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "estimated_transit_days" integer DEFAULT 1 NOT NULL;
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "carrier_services" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "shipping_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"quote_number" text NOT NULL,
	"service_id" text NOT NULL,
	"cost_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "quote_number" text;
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "service_id" text;
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "cost_minor" bigint;
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "parameters" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "shipping_quotes" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_number" text NOT NULL,
	"order_id" text NOT NULL,
	"fulfillment_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"carrier_id" text,
	"carrier_service_id" text,
	"run_id" text,
	"stop_id" text,
	"tracking_number" text,
	"label_url" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "shipment_number" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "fulfillment_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "carrier_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "carrier_service_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "run_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "stop_id" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tracking_number" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "label_url" text;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "shipment_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"fulfillment_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "shipment_lines" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "shipment_lines" ADD COLUMN IF NOT EXISTS "shipment_id" text;
ALTER TABLE "shipment_lines" ADD COLUMN IF NOT EXISTS "fulfillment_line_id" text;
ALTER TABLE "shipment_lines" ADD COLUMN IF NOT EXISTS "variant_id" text;
ALTER TABLE "shipment_lines" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "shipment_lines" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "shipment_lines" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "shipment_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"package_number" text NOT NULL,
	"tracking_number" text,
	"weight_grams" integer DEFAULT 0 NOT NULL,
	"length_cm" integer,
	"width_cm" integer,
	"height_cm" integer,
	"packaging_type" text DEFAULT 'BOX' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "shipment_id" text;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "package_number" text;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "tracking_number" text;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "length_cm" integer;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "width_cm" integer;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "height_cm" integer;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "packaging_type" text DEFAULT 'BOX' NOT NULL;
ALTER TABLE "shipment_packages" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "shipment_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"provider_event_id" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "shipment_id" text;
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "provider_event_id" text;
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "recorded_at" timestamp with time zone;
ALTER TABLE "shipment_milestones" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "logistics_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"charge_type" text NOT NULL,
	"provenance" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "shipment_id" text;
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "charge_type" text;
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "provenance" text;
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "amount_minor" bigint;
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "logistics_charges" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "logistics_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"name" text NOT NULL,
	"cutoff_time" text,
	"max_delivery_attempts" integer DEFAULT 3 NOT NULL,
	"required_pod_method" text DEFAULT 'SIGNATURE' NOT NULL,
	"allow_partial_delivery" boolean DEFAULT true NOT NULL,
	"auto_reschedule" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "warehouse_id" text;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "cutoff_time" text;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "max_delivery_attempts" integer DEFAULT 3 NOT NULL;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "required_pod_method" text DEFAULT 'SIGNATURE' NOT NULL;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "allow_partial_delivery" boolean DEFAULT true NOT NULL;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "auto_reschedule" boolean DEFAULT true NOT NULL;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "logistics_policies" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "report_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"query_template" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "query_template" jsonb;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "report_definitions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "saved_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"query" jsonb NOT NULL,
	"sharing_scope" text DEFAULT 'PRIVATE' NOT NULL,
	"allowed_roles" jsonb DEFAULT '[]' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "query" jsonb;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "sharing_scope" text DEFAULT 'PRIVATE' NOT NULL;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "allowed_roles" jsonb DEFAULT '[]' NOT NULL;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "saved_reports" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "report_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"saved_report_id" text NOT NULL,
	"schedule_name" text NOT NULL,
	"cron_expression" text NOT NULL,
	"export_format" text DEFAULT 'CSV' NOT NULL,
	"recipients" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_run_status" text,
	"next_run_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "saved_report_id" text;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "schedule_name" text;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "cron_expression" text;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "export_format" text DEFAULT 'CSV' NOT NULL;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "recipients" jsonb DEFAULT '[]' NOT NULL;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "last_run_at" timestamp with time zone;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "last_run_status" text;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "next_run_at" timestamp with time zone;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "report_schedules" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "report_execution_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"report_id" text,
	"schedule_id" text,
	"triggered_by" text NOT NULL,
	"execution_type" text NOT NULL,
	"status" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"export_token" text,
	"error_message" text,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "report_id" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "schedule_id" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "triggered_by" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "execution_type" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "row_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "duration_ms" integer DEFAULT 0 NOT NULL;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "export_token" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "report_execution_logs" ADD COLUMN IF NOT EXISTS "executed_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "analytics_dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dashboard_family" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"widgets" jsonb DEFAULT '[]' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "dashboard_family" text;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "widgets" jsonb DEFAULT '[]' NOT NULL;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "analytics_dashboards" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "reporting_projections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"projection_key" text NOT NULL,
	"period_date" text NOT NULL,
	"dimension_values" jsonb DEFAULT '{}' NOT NULL,
	"metrics" jsonb DEFAULT '{}' NOT NULL,
	"last_event_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "projection_key" text;
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "period_date" text;
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "dimension_values" jsonb DEFAULT '{}' NOT NULL;
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "metrics" jsonb DEFAULT '{}' NOT NULL;
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "last_event_id" text;
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "reporting_projections" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "integration_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"connector_code" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"company_id" text,
	"branch_id" text,
	"config_json" text DEFAULT '{}' NOT NULL,
	"credential_id" text,
	"last_sync_at" timestamp with time zone,
	"last_health_check_at" timestamp with time zone,
	"is_healthy" boolean DEFAULT true NOT NULL,
	"health_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "connector_code" text;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT' NOT NULL;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "config_json" text DEFAULT '{}' NOT NULL;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "credential_id" text;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp with time zone;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "last_health_check_at" timestamp with time zone;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "is_healthy" boolean DEFAULT true NOT NULL;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "health_message" text;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "integration_instances" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "developer_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"masked_key" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes_json" text DEFAULT '[]' NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 60 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "key_prefix" text;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "masked_key" text;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "key_hash" text;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "scopes_json" text DEFAULT '[]' NOT NULL;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "rate_limit_per_minute" integer DEFAULT 60 NOT NULL;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "integration_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"integration_instance_id" text NOT NULL,
	"name" text NOT NULL,
	"masked_secret" text NOT NULL,
	"secret_hash" text NOT NULL,
	"encrypted_secret" text,
	"expires_at" timestamp with time zone,
	"last_rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "integration_instance_id" text;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "masked_secret" text;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "secret_hash" text;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "encrypted_secret" text;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "last_rotated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "integration_credentials" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "integration_entity_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"integration_instance_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"internal_id" text NOT NULL,
	"sync_status" text DEFAULT 'SYNCED' NOT NULL,
	"metadata_json" text,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "integration_instance_id" text;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "internal_id" text;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "sync_status" text DEFAULT 'SYNCED' NOT NULL;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "metadata_json" text;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "integration_entity_mappings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "integration_field_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"integration_instance_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"source_field" text NOT NULL,
	"target_field" text NOT NULL,
	"transform_type" text DEFAULT 'DIRECT' NOT NULL,
	"transform_config_json" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "integration_instance_id" text;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "source_field" text;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "target_field" text;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "transform_type" text DEFAULT 'DIRECT' NOT NULL;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "transform_config_json" text;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "is_required" boolean DEFAULT false NOT NULL;
ALTER TABLE "integration_field_mappings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "integration_sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"integration_instance_id" text NOT NULL,
	"direction" text DEFAULT 'IMPORT' NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_accepted" integer DEFAULT 0 NOT NULL,
	"records_rejected" integer DEFAULT 0 NOT NULL,
	"records_skipped" integer DEFAULT 0 NOT NULL,
	"cursor_checkpoint" text,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "integration_instance_id" text;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "direction" text DEFAULT 'IMPORT' NOT NULL;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'RUNNING' NOT NULL;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "records_processed" integer DEFAULT 0 NOT NULL;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "records_accepted" integer DEFAULT 0 NOT NULL;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "records_rejected" integer DEFAULT 0 NOT NULL;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "records_skipped" integer DEFAULT 0 NOT NULL;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "cursor_checkpoint" text;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "integration_sync_runs" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "inbound_webhook_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"integration_instance_id" text,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_hash" text NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "integration_instance_id" text;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "provider_event_id" text;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "payload_hash" text;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'RECEIVED' NOT NULL;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "received_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "inbound_webhook_receipts" ADD COLUMN IF NOT EXISTS "processed_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "integration_reconciliations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"integration_instance_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"internal_id" text NOT NULL,
	"status" text DEFAULT 'MATCHED' NOT NULL,
	"discrepancy_details_json" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "integration_instance_id" text;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "internal_id" text;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'MATCHED' NOT NULL;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "discrepancy_details_json" text;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "checked_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "integration_reconciliations" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS "integration_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"actor_id" text,
	"details_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "integration_audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "integration_audit_logs" ADD COLUMN IF NOT EXISTS "action" text;
ALTER TABLE "integration_audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "integration_audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "integration_audit_logs" ADD COLUMN IF NOT EXISTS "actor_id" text;
ALTER TABLE "integration_audit_logs" ADD COLUMN IF NOT EXISTS "details_json" text;
ALTER TABLE "integration_audit_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "executive_sales_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"reference" text NOT NULL,
	"sale_date" date NOT NULL,
	"net_sales_minor" bigint NOT NULL,
	"cogs_minor" bigint,
	"currency_code" text DEFAULT 'NGN' NOT NULL,
	"source" text DEFAULT 'SPREADSHEET' NOT NULL,
	"source_file_key" text,
	"imported_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "reference" text;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "sale_date" date;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "net_sales_minor" bigint;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "cogs_minor" bigint;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "currency_code" text DEFAULT 'NGN' NOT NULL;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'SPREADSHEET' NOT NULL;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "source_file_key" text;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "imported_by_user_id" text;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "executive_sales_entries" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
DO $$ BEGIN ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "devices" ADD CONSTRAINT "devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sync_changes" ADD CONSTRAINT "sync_changes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "registers" ADD CONSTRAINT "registers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "registers" ADD CONSTRAINT "registers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "registers" ADD CONSTRAINT "registers_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "register_sessions" ADD CONSTRAINT "register_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "register_sessions" ADD CONSTRAINT "register_sessions_register_id_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."registers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "register_sessions" ADD CONSTRAINT "register_sessions_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "register_sessions" ADD CONSTRAINT "register_sessions_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_register_session_id_register_sessions_id_fk" FOREIGN KEY ("register_session_id") REFERENCES "public"."register_sessions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_workflow_version_id_workflow_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."workflow_versions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_assigned_role_id_roles_id_fk" FOREIGN KEY ("assigned_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_assigned_work_center_id_work_centers_id_fk" FOREIGN KEY ("assigned_work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_task_claims" ADD CONSTRAINT "workflow_task_claims_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_task_claims" ADD CONSTRAINT "workflow_task_claims_task_id_workflow_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."workflow_tasks"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "workflow_task_claims" ADD CONSTRAINT "workflow_task_claims_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "business_rules" ADD CONSTRAINT "business_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approver_role_id_roles_id_fk" FOREIGN KEY ("approver_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_register_session_id_register_sessions_id_fk" FOREIGN KEY ("register_session_id") REFERENCES "public"."register_sessions"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "receipt_prints" ADD CONSTRAINT "receipt_prints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "receipt_prints" ADD CONSTRAINT "receipt_prints_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "receipt_prints" ADD CONSTRAINT "receipt_prints_printed_by_user_id_users_id_fk" FOREIGN KEY ("printed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "receipt_prints" ADD CONSTRAINT "receipt_prints_register_id_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."registers"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "multi_tender_checkouts" ADD CONSTRAINT "multi_tender_checkouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "checkout_tenders" ADD CONSTRAINT "checkout_tenders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "checkout_tenders" ADD CONSTRAINT "checkout_tenders_checkout_id_multi_tender_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."multi_tender_checkouts"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_from_uom_id_units_of_measure_id_fk" FOREIGN KEY ("from_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_to_uom_id_units_of_measure_id_fk" FOREIGN KEY ("to_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_base_uom_id_units_of_measure_id_fk" FOREIGN KEY ("base_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "attribute_dimensions" ADD CONSTRAINT "attribute_dimensions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_dimension_id_attribute_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."attribute_dimensions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_template_id_product_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."product_templates"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "storage_zones" ADD CONSTRAINT "storage_zones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "storage_zones" ADD CONSTRAINT "storage_zones_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_zone_id_storage_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "put_away_rules" ADD CONSTRAINT "put_away_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "put_away_rules" ADD CONSTRAINT "put_away_rules_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "put_away_rules" ADD CONSTRAINT "put_away_rules_destination_zone_id_storage_zones_id_fk" FOREIGN KEY ("destination_zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_waves" ADD CONSTRAINT "pick_waves_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_waves" ADD CONSTRAINT "pick_waves_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_wave_id_pick_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."pick_waves"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_zone_id_storage_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_staging_location_id_storage_locations_id_fk" FOREIGN KEY ("staging_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_pick_list_id_pick_lists_id_fk" FOREIGN KEY ("pick_list_id") REFERENCES "public"."pick_lists"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_source_location_id_storage_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_zone_id_storage_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packing_stations" ADD CONSTRAINT "packing_stations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packing_stations" ADD CONSTRAINT "packing_stations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packaging_boxes" ADD CONSTRAINT "packaging_boxes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipping_manifests" ADD CONSTRAINT "shipping_manifests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipping_manifests" ADD CONSTRAINT "shipping_manifests_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_station_id_packing_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."packing_stations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_box_type_id_packaging_boxes_id_fk" FOREIGN KEY ("box_type_id") REFERENCES "public"."packaging_boxes"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_manifest_id_shipping_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."shipping_manifests"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packed_container_lines" ADD CONSTRAINT "packed_container_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "packed_container_lines" ADD CONSTRAINT "packed_container_lines_container_id_packed_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."packed_containers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_source_location_id_storage_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "internal_bin_transfer_lines" ADD CONSTRAINT "internal_bin_transfer_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "internal_bin_transfer_lines" ADD CONSTRAINT "internal_bin_transfer_lines_transfer_id_internal_bin_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."internal_bin_transfers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cross_dock_operations" ADD CONSTRAINT "cross_dock_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cross_dock_operations" ADD CONSTRAINT "cross_dock_operations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cross_dock_operations" ADD CONSTRAINT "cross_dock_operations_target_staging_location_id_storage_locations_id_fk" FOREIGN KEY ("target_staging_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_serial_id_stock_serials_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."stock_serials"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_source_warehouse_id_warehouses_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_source_location_id_storage_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_serial_id_stock_serials_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."stock_serials"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_pricelist_id_price_lists_id_fk" FOREIGN KEY ("pricelist_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "discount_promotions" ADD CONSTRAINT "discount_promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_default_price_list_id_price_lists_id_fk" FOREIGN KEY ("default_price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_register_id_pos_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."pos_registers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_cashier_user_id_users_id_fk" FOREIGN KEY ("cashier_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_supervisor_user_id_users_id_fk" FOREIGN KEY ("supervisor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_session_id_pos_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_authorized_by_user_id_users_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_pos_session_id_pos_sessions_id_fk" FOREIGN KEY ("pos_session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_pos_register_id_pos_registers_id_fk" FOREIGN KEY ("pos_register_id") REFERENCES "public"."pos_registers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sync_batches" ADD CONSTRAINT "pos_sync_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sync_batches" ADD CONSTRAINT "pos_sync_batches_pos_register_id_pos_registers_id_fk" FOREIGN KEY ("pos_register_id") REFERENCES "public"."pos_registers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sync_batches" ADD CONSTRAINT "pos_sync_batches_pos_session_id_pos_sessions_id_fk" FOREIGN KEY ("pos_session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_batch_id_pos_sync_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."pos_sync_batches"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_pos_session_id_pos_sessions_id_fk" FOREIGN KEY ("pos_session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_server_order_id_sales_orders_id_fk" FOREIGN KEY ("server_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_preferred_supplier_id_suppliers_id_fk" FOREIGN KEY ("preferred_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_rfq_id_purchase_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."purchase_rfqs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_rfq_id_purchase_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."purchase_rfqs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_rfq_id_purchase_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."purchase_rfqs"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_quotation_id_supplier_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."supplier_quotations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "landed_cost_vouchers" ADD CONSTRAINT "landed_cost_vouchers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "landed_cost_charges" ADD CONSTRAINT "landed_cost_charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "landed_cost_charges" ADD CONSTRAINT "landed_cost_charges_voucher_id_landed_cost_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."landed_cost_vouchers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_voucher_id_landed_cost_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."landed_cost_vouchers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_goods_receipt_line_id_goods_receipt_lines_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_lines"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_return_id_supplier_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."supplier_returns"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_goods_receipt_line_id_goods_receipt_lines_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_lines"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_goods_receipt_line_id_goods_receipt_lines_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_lines"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_payment_id_supplier_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."supplier_payments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_purchase_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_component_variant_id_product_variants_id_fk" FOREIGN KEY ("component_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bom_byproducts" ADD CONSTRAINT "bom_byproducts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bom_byproducts" ADD CONSTRAINT "bom_byproducts_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bom_byproducts" ADD CONSTRAINT "bom_byproducts_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "routings" ADD CONSTRAINT "routings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "routings" ADD CONSTRAINT "routings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_routing_id_routings_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."routings"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_work_center_id_mfg_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."mfg_work_centers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_routing_id_routings_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."routings"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_operation_id_routing_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."routing_operations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_work_center_id_mfg_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."mfg_work_centers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_execution_runs" ADD CONSTRAINT "mo_execution_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_execution_runs" ADD CONSTRAINT "mo_execution_runs_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_output_inspections" ADD CONSTRAINT "mo_output_inspections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_output_inspections" ADD CONSTRAINT "mo_output_inspections_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_output_inspections" ADD CONSTRAINT "mo_output_inspections_run_id_mo_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."mo_execution_runs"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_scrap_records" ADD CONSTRAINT "mo_scrap_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_scrap_records" ADD CONSTRAINT "mo_scrap_records_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_scrap_records" ADD CONSTRAINT "mo_scrap_records_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_original_variant_id_product_variants_id_fk" FOREIGN KEY ("original_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_substituted_variant_id_product_variants_id_fk" FOREIGN KEY ("substituted_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_group_id_customer_groups_id_fk" FOREIGN KEY ("customer_group_id") REFERENCES "public"."customer_groups"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customers" ADD CONSTRAINT "customers_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quotations" ADD CONSTRAINT "quotations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quotations" ADD CONSTRAINT "quotations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_receiving_location_id_storage_locations_id_fk" FOREIGN KEY ("receiving_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_rma_id_return_authorizations_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."return_authorizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_rma_id_return_authorizations_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."return_authorizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_return_line_id_return_lines_id_fk" FOREIGN KEY ("return_line_id") REFERENCES "public"."return_lines"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_quarantine_location_id_storage_locations_id_fk" FOREIGN KEY ("quarantine_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_rma_id_return_authorizations_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."return_authorizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_inspection_id_quality_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."quality_inspections"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "replenishment_rules" ADD CONSTRAINT "replenishment_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "replenishment_rules" ADD CONSTRAINT "replenishment_rules_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "replenishment_rules" ADD CONSTRAINT "replenishment_rules_upstream_warehouse_id_warehouses_id_fk" FOREIGN KEY ("upstream_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_rule_id_replenishment_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."replenishment_rules"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_source_warehouse_id_warehouses_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_assigned_vehicle_id_fleet_vehicles_id_fk" FOREIGN KEY ("assigned_vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_vehicle_id_fleet_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_driver_id_fleet_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."fleet_drivers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_run_id_delivery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."delivery_runs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_run_id_delivery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."delivery_runs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_stop_id_delivery_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."delivery_stops"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_books" ADD CONSTRAINT "accounting_books_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_groups" ADD CONSTRAINT "tax_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_posting_rules" ADD CONSTRAINT "accounting_posting_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_posting_rules" ADD CONSTRAINT "accounting_posting_rules_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_source_event_records" ADD CONSTRAINT "accounting_source_event_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "accounting_source_event_records" ADD CONSTRAINT "accounting_source_event_records_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_groups" ADD CONSTRAINT "consolidation_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_group_members" ADD CONSTRAINT "consolidation_group_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_group_members" ADD CONSTRAINT "consolidation_group_members_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_group_members" ADD CONSTRAINT "consolidation_group_members_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "group_chart_of_accounts" ADD CONSTRAINT "group_chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "group_chart_of_accounts" ADD CONSTRAINT "group_chart_of_accounts_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "entity_account_mappings" ADD CONSTRAINT "entity_account_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "entity_account_mappings" ADD CONSTRAINT "entity_account_mappings_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_runs" ADD CONSTRAINT "consolidation_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_runs" ADD CONSTRAINT "consolidation_runs_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_run_entities" ADD CONSTRAINT "consolidation_run_entities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_run_entities" ADD CONSTRAINT "consolidation_run_entities_run_id_consolidation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."consolidation_runs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_adjustments" ADD CONSTRAINT "consolidation_adjustments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_adjustments" ADD CONSTRAINT "consolidation_adjustments_run_id_consolidation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."consolidation_runs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_adjustment_lines" ADD CONSTRAINT "consolidation_adjustment_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "consolidation_adjustment_lines" ADD CONSTRAINT "consolidation_adjustment_lines_adjustment_id_consolidation_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."consolidation_adjustments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "intercompany_relationships" ADD CONSTRAINT "intercompany_relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "intercompany_transactions" ADD CONSTRAINT "intercompany_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "intercompany_matches" ADD CONSTRAINT "intercompany_matches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "intercompany_matches" ADD CONSTRAINT "intercompany_matches_from_transaction_id_intercompany_transactions_id_fk" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."intercompany_transactions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "intercompany_matches" ADD CONSTRAINT "intercompany_matches_to_transaction_id_intercompany_transactions_id_fk" FOREIGN KEY ("to_transaction_id") REFERENCES "public"."intercompany_transactions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "elimination_rules" ADD CONSTRAINT "elimination_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matched_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("matched_journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_source_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("source_bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_destination_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("destination_bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_forecasts" ADD CONSTRAINT "cash_forecasts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_registrations" ADD CONSTRAINT "tax_registrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_jurisdiction_configs" ADD CONSTRAINT "tax_jurisdiction_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_filing_periods" ADD CONSTRAINT "tax_filing_periods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_filing_periods" ADD CONSTRAINT "tax_filing_periods_registration_id_tax_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."tax_registrations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_filing_period_id_tax_filing_periods_id_fk" FOREIGN KEY ("filing_period_id") REFERENCES "public"."tax_filing_periods"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_filing_submissions" ADD CONSTRAINT "tax_filing_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tax_filing_submissions" ADD CONSTRAINT "tax_filing_submissions_tax_return_id_tax_returns_id_fk" FOREIGN KEY ("tax_return_id") REFERENCES "public"."tax_returns"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "holding_groups" ADD CONSTRAINT "holding_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "inter_company_transfers" ADD CONSTRAINT "inter_company_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "webhook_dead_letters" ADD CONSTRAINT "webhook_dead_letters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "webhook_dead_letters" ADD CONSTRAINT "webhook_dead_letters_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "document_render_logs" ADD CONSTRAINT "document_render_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "analytics_abc_snapshots" ADD CONSTRAINT "analytics_abc_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "analytics_demand_forecasts" ADD CONSTRAINT "analytics_demand_forecasts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "analytics_dead_stock_alerts" ADD CONSTRAINT "analytics_dead_stock_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "search_index_entries" ADD CONSTRAINT "search_index_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "audit_chain_blocks" ADD CONSTRAINT "audit_chain_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "custom_report_definitions" ADD CONSTRAINT "custom_report_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "gdpr_erasure_requests" ADD CONSTRAINT "gdpr_erasure_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "compliance_audit_logs" ADD CONSTRAINT "compliance_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "hardware_devices" ADD CONSTRAINT "hardware_devices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "hardware_devices" ADD CONSTRAINT "hardware_devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "hardware_profiles" ADD CONSTRAINT "hardware_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "hardware_print_jobs" ADD CONSTRAINT "hardware_print_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "hardware_print_jobs" ADD CONSTRAINT "hardware_print_jobs_device_id_hardware_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."hardware_devices"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fiscal_entities" ADD CONSTRAINT "fiscal_entities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "certified_e_invoices" ADD CONSTRAINT "certified_e_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "certified_e_invoices" ADD CONSTRAINT "certified_e_invoices_entity_id_fiscal_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."fiscal_entities"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fiscal_receipt_chains" ADD CONSTRAINT "fiscal_receipt_chains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_organizations" ADD CONSTRAINT "b2b_organizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_credit_accounts" ADD CONSTRAINT "b2b_credit_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_credit_accounts" ADD CONSTRAINT "b2b_credit_accounts_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_contract_pricing" ADD CONSTRAINT "b2b_contract_pricing_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_contract_pricing" ADD CONSTRAINT "b2b_contract_pricing_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_requisitions" ADD CONSTRAINT "b2b_requisitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_requisitions" ADD CONSTRAINT "b2b_requisitions_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_punchout_sessions" ADD CONSTRAINT "b2b_punchout_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "b2b_punchout_sessions" ADD CONSTRAINT "b2b_punchout_sessions_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "gift_card_accounts" ADD CONSTRAINT "gift_card_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_card_accounts_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_card_accounts"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "edi_partners" ADD CONSTRAINT "edi_partners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "edi_message_logs" ADD CONSTRAINT "edi_message_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "edi_message_logs" ADD CONSTRAINT "edi_message_logs_partner_id_edi_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."edi_partners"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "edi_interchange_controls" ADD CONSTRAINT "edi_interchange_controls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "edi_interchange_controls" ADD CONSTRAINT "edi_interchange_controls_partner_id_edi_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."edi_partners"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_contract_items" ADD CONSTRAINT "customer_contract_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_contract_items" ADD CONSTRAINT "customer_contract_items_contract_id_customer_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."customer_contracts"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_contract_items" ADD CONSTRAINT "customer_contract_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_campaign_id_promotion_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."promotion_campaigns"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pricing_margin_policies" ADD CONSTRAINT "pricing_margin_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pricing_override_requests" ADD CONSTRAINT "pricing_override_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pricing_override_requests" ADD CONSTRAINT "pricing_override_requests_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "commercial_price_snapshots" ADD CONSTRAINT "commercial_price_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "rebate_agreements" ADD CONSTRAINT "rebate_agreements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "rebate_tiers" ADD CONSTRAINT "rebate_tiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "rebate_tiers" ADD CONSTRAINT "rebate_tiers_agreement_id_rebate_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."rebate_agreements"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "rebate_accruals" ADD CONSTRAINT "rebate_accruals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "rebate_accruals" ADD CONSTRAINT "rebate_accruals_agreement_id_rebate_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."rebate_agreements"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_account_relationships" ADD CONSTRAINT "crm_account_relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_account_relationships" ADD CONSTRAINT "crm_account_relationships_parent_customer_id_customers_id_fk" FOREIGN KEY ("parent_customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_account_relationships" ADD CONSTRAINT "crm_account_relationships_child_customer_id_customers_id_fk" FOREIGN KEY ("child_customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_customer_merges" ADD CONSTRAINT "crm_customer_merges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_customer_merges" ADD CONSTRAINT "crm_customer_merges_surviving_customer_id_customers_id_fk" FOREIGN KEY ("surviving_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_customer_merges" ADD CONSTRAINT "crm_customer_merges_merged_customer_id_customers_id_fk" FOREIGN KEY ("merged_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_customer_id_customers_id_fk" FOREIGN KEY ("converted_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_current_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("current_stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_from_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_to_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_segments" ADD CONSTRAINT "crm_segments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_segment_members" ADD CONSTRAINT "crm_segment_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_segment_members" ADD CONSTRAINT "crm_segment_members_segment_id_crm_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."crm_segments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_segment_members" ADD CONSTRAINT "crm_segment_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_consent_records" ADD CONSTRAINT "crm_consent_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_consent_records" ADD CONSTRAINT "crm_consent_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_suppression_list" ADD CONSTRAINT "crm_suppression_list_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_segment_id_crm_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."crm_segments"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_campaign_id_crm_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crm_campaigns"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_automations" ADD CONSTRAINT "crm_automations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_automation_id_crm_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."crm_automations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_order_line_id_sales_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."sales_order_lines"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "carriers" ADD CONSTRAINT "carriers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "carrier_services" ADD CONSTRAINT "carrier_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "carrier_services" ADD CONSTRAINT "carrier_services_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_service_id_carrier_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."carrier_services"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_carrier_service_id_carrier_services_id_fk" FOREIGN KEY ("carrier_service_id") REFERENCES "public"."carrier_services"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_run_id_delivery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."delivery_runs"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_stop_id_delivery_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."delivery_stops"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_fulfillment_line_id_fulfillment_lines_id_fk" FOREIGN KEY ("fulfillment_line_id") REFERENCES "public"."fulfillment_lines"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "logistics_charges" ADD CONSTRAINT "logistics_charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "logistics_charges" ADD CONSTRAINT "logistics_charges_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "logistics_policies" ADD CONSTRAINT "logistics_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "logistics_policies" ADD CONSTRAINT "logistics_policies_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_saved_report_id_saved_reports_id_fk" FOREIGN KEY ("saved_report_id") REFERENCES "public"."saved_reports"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "report_execution_logs" ADD CONSTRAINT "report_execution_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "analytics_dashboards" ADD CONSTRAINT "analytics_dashboards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reporting_projections" ADD CONSTRAINT "reporting_projections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_instances" ADD CONSTRAINT "integration_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "developer_api_keys" ADD CONSTRAINT "developer_api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_entity_mappings" ADD CONSTRAINT "integration_entity_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_entity_mappings" ADD CONSTRAINT "integration_entity_mappings_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "inbound_webhook_receipts" ADD CONSTRAINT "inbound_webhook_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_reconciliations" ADD CONSTRAINT "integration_reconciliations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_reconciliations" ADD CONSTRAINT "integration_reconciliations_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "executive_sales_entries" ADD CONSTRAINT "executive_sales_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_foreign_key THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "idx_tenants_status" ON "tenants" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_companies_tenant" ON "companies" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_branches_tenant" ON "branches" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_branches_company" ON "branches" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "idx_users_tenant_email" ON "users" USING btree ("tenant_id","email");
CREATE INDEX IF NOT EXISTS "idx_users_tenant" ON "users" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_profiles_user" ON "user_profiles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_devices_tenant_status" ON "devices" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_devices_tenant" ON "devices" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_tenant_occurred" ON "audit_events" USING btree ("tenant_id","occurred_at");
CREATE INDEX IF NOT EXISTS "idx_audit_tenant_entity" ON "audit_events" USING btree ("tenant_id","entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "idx_security_occurred" ON "security_events" USING btree ("occurred_at");
CREATE INDEX IF NOT EXISTS "idx_security_type" ON "security_events" USING btree ("event_type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sync_ops_tenant_op_id" ON "sync_operations" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_sync_ops_tenant_device_status" ON "sync_operations" USING btree ("tenant_id","device_id","status");
CREATE INDEX IF NOT EXISTS "idx_sync_changes_tenant_seq" ON "sync_changes" USING btree ("tenant_id","sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_memberships_tenant_user" ON "memberships" USING btree ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "idx_roles_tenant" ON "roles" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_role_perm_unique" ON "role_permissions" USING btree ("role_id","permission_id");
CREATE INDEX IF NOT EXISTS "idx_role_assign_user" ON "role_assignments" USING btree ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "idx_role_assign_scope" ON "role_assignments" USING btree ("tenant_id","branch_id");
CREATE INDEX IF NOT EXISTS "idx_work_centers_tenant_branch" ON "work_centers" USING btree ("tenant_id","branch_id");
CREATE INDEX IF NOT EXISTS "idx_registers_tenant_branch" ON "registers" USING btree ("tenant_id","branch_id");
CREATE INDEX IF NOT EXISTS "idx_reg_sessions_tenant_reg" ON "register_sessions" USING btree ("tenant_id","register_id");
CREATE INDEX IF NOT EXISTS "idx_reg_sessions_status" ON "register_sessions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_cash_mov_session" ON "cash_movements" USING btree ("register_session_id");
CREATE INDEX IF NOT EXISTS "idx_workflows_tenant" ON "workflows" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workflow_versions_unique" ON "workflow_versions" USING btree ("workflow_id","version_number");
CREATE INDEX IF NOT EXISTS "idx_wf_tasks_tenant_status" ON "workflow_tasks" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_wf_tasks_entity" ON "workflow_tasks" USING btree ("tenant_id","entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "idx_wf_tasks_work_center" ON "workflow_tasks" USING btree ("tenant_id","assigned_work_center_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_claims_active" ON "workflow_task_claims" USING btree ("task_id","status");
CREATE INDEX IF NOT EXISTS "idx_business_rules_trigger" ON "business_rules" USING btree ("tenant_id","event_trigger");
CREATE INDEX IF NOT EXISTS "idx_approvals_tenant_status" ON "approval_requests" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_payments_operation_id" ON "payments" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_payments_order" ON "payments" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_payments_session" ON "payments" USING btree ("register_session_id");
CREATE INDEX IF NOT EXISTS "idx_receipts_order" ON "receipt_prints" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_multi_checkouts_tenant_order" ON "multi_tender_checkouts" USING btree ("tenant_id","order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_checkout_tenders_tenant_key" ON "checkout_tenders" USING btree ("tenant_id","idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_checkout_tenders_checkout" ON "checkout_tenders" USING btree ("checkout_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_uom_tenant_code" ON "units_of_measure" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_uom_tenant_category" ON "units_of_measure" USING btree ("tenant_id","category");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_uom_conv_tenant_pair" ON "unit_conversions" USING btree ("tenant_id","from_uom_id","to_uom_id");
CREATE INDEX IF NOT EXISTS "idx_uom_conv_from" ON "unit_conversions" USING btree ("from_uom_id");
CREATE INDEX IF NOT EXISTS "idx_uom_conv_to" ON "unit_conversions" USING btree ("to_uom_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_categories_tenant_code" ON "product_categories" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_categories_tenant_path" ON "product_categories" USING btree ("tenant_id","path");
CREATE INDEX IF NOT EXISTS "idx_categories_tenant_parent" ON "product_categories" USING btree ("tenant_id","parent_id");
CREATE INDEX IF NOT EXISTS "idx_categories_tenant_slug" ON "product_categories" USING btree ("tenant_id","slug");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_brands_tenant_code" ON "brands" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_brands_tenant_slug" ON "brands" USING btree ("tenant_id","slug");
CREATE INDEX IF NOT EXISTS "idx_brands_tenant_active" ON "brands" USING btree ("tenant_id","is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_templates_tenant_code" ON "product_templates" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_templates_tenant_category" ON "product_templates" USING btree ("tenant_id","category_id");
CREATE INDEX IF NOT EXISTS "idx_templates_tenant_brand" ON "product_templates" USING btree ("tenant_id","brand_id");
CREATE INDEX IF NOT EXISTS "idx_templates_tenant_type" ON "product_templates" USING btree ("tenant_id","type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_dimensions_tenant_code" ON "attribute_dimensions" USING btree ("tenant_id","code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_attr_values_tenant_dim_code" ON "attribute_values" USING btree ("tenant_id","dimension_id","code");
CREATE INDEX IF NOT EXISTS "idx_attr_values_dim" ON "attribute_values" USING btree ("dimension_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_variants_tenant_sku" ON "product_variants" USING btree ("tenant_id","sku");
CREATE INDEX IF NOT EXISTS "idx_variants_tenant_template" ON "product_variants" USING btree ("tenant_id","template_id");
CREATE INDEX IF NOT EXISTS "idx_variants_tenant_barcode" ON "product_variants" USING btree ("tenant_id","barcode");
CREATE INDEX IF NOT EXISTS "idx_variants_tenant_status" ON "product_variants" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_idempotency_tenant_key" ON "idempotency_records" USING btree ("tenant_id","idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_idempotency_tenant_status" ON "idempotency_records" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_idempotency_locked_until" ON "idempotency_records" USING btree ("locked_until");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_outbox_event_id" ON "outbox_events" USING btree ("event_id");
CREATE INDEX IF NOT EXISTS "idx_outbox_tenant_status" ON "outbox_events" USING btree ("tenant_id","status","occurred_at");
CREATE INDEX IF NOT EXISTS "idx_outbox_aggregate" ON "outbox_events" USING btree ("tenant_id","aggregate_type","aggregate_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_warehouses_tenant_code" ON "warehouses" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_warehouses_tenant_branch" ON "warehouses" USING btree ("tenant_id","branch_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_storage_zones_wh_code" ON "storage_zones" USING btree ("tenant_id","warehouse_id","code");
CREATE INDEX IF NOT EXISTS "idx_storage_zones_wh" ON "storage_zones" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_storage_zones_type" ON "storage_zones" USING btree ("tenant_id","zone_type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_storage_locations_wh_code" ON "storage_locations" USING btree ("tenant_id","warehouse_id","code");
CREATE INDEX IF NOT EXISTS "idx_storage_locations_path" ON "storage_locations" USING btree ("tenant_id","warehouse_id","materialized_path");
CREATE INDEX IF NOT EXISTS "idx_storage_locations_parent" ON "storage_locations" USING btree ("tenant_id","parent_id");
CREATE INDEX IF NOT EXISTS "idx_storage_locations_type" ON "storage_locations" USING btree ("tenant_id","type");
CREATE INDEX IF NOT EXISTS "idx_storage_locations_zone" ON "storage_locations" USING btree ("tenant_id","zone_id");
CREATE INDEX IF NOT EXISTS "idx_put_away_rules_wh" ON "put_away_rules" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_put_away_rules_priority" ON "put_away_rules" USING btree ("tenant_id","warehouse_id","priority");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pick_waves_number" ON "pick_waves" USING btree ("tenant_id","warehouse_id","wave_number");
CREATE INDEX IF NOT EXISTS "idx_pick_waves_wh_status" ON "pick_waves" USING btree ("tenant_id","warehouse_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pick_lists_number" ON "pick_lists" USING btree ("tenant_id","warehouse_id","pick_list_number");
CREATE INDEX IF NOT EXISTS "idx_pick_lists_wave" ON "pick_lists" USING btree ("tenant_id","wave_id");
CREATE INDEX IF NOT EXISTS "idx_pick_lists_status" ON "pick_lists" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_pick_list_lines_list" ON "pick_list_lines" USING btree ("tenant_id","pick_list_id");
CREATE INDEX IF NOT EXISTS "idx_pick_list_lines_seq" ON "pick_list_lines" USING btree ("tenant_id","pick_list_id","pick_sequence");
CREATE INDEX IF NOT EXISTS "idx_pick_list_lines_status" ON "pick_list_lines" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_packing_stations_tenant_code" ON "packing_stations" USING btree ("tenant_id","warehouse_id","station_code");
CREATE INDEX IF NOT EXISTS "idx_packing_stations_status" ON "packing_stations" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_packaging_boxes_tenant_code" ON "packaging_boxes" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_packaging_boxes_active" ON "packaging_boxes" USING btree ("tenant_id","is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipping_manifests_tenant_number" ON "shipping_manifests" USING btree ("tenant_id","manifest_number");
CREATE INDEX IF NOT EXISTS "idx_shipping_manifests_carrier" ON "shipping_manifests" USING btree ("tenant_id","carrier_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_packed_containers_tenant_number" ON "packed_containers" USING btree ("tenant_id","container_number");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_packed_containers_sscc" ON "packed_containers" USING btree ("tenant_id","sscc_barcode");
CREATE INDEX IF NOT EXISTS "idx_packed_containers_manifest" ON "packed_containers" USING btree ("tenant_id","manifest_id");
CREATE INDEX IF NOT EXISTS "idx_packed_containers_status" ON "packed_containers" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_container_lines_container" ON "packed_container_lines" USING btree ("tenant_id","container_id");
CREATE INDEX IF NOT EXISTS "idx_container_lines_order" ON "packed_container_lines" USING btree ("tenant_id","order_id","order_line_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bin_transfers_tenant_num" ON "internal_bin_transfers" USING btree ("tenant_id","transfer_number");
CREATE INDEX IF NOT EXISTS "idx_bin_transfers_src" ON "internal_bin_transfers" USING btree ("tenant_id","source_location_id");
CREATE INDEX IF NOT EXISTS "idx_bin_transfers_dst" ON "internal_bin_transfers" USING btree ("tenant_id","destination_location_id");
CREATE INDEX IF NOT EXISTS "idx_bin_transfers_status" ON "internal_bin_transfers" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_transfer_lines_transfer" ON "internal_bin_transfer_lines" USING btree ("tenant_id","transfer_id");
CREATE INDEX IF NOT EXISTS "idx_transfer_lines_variant" ON "internal_bin_transfer_lines" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_cross_dock_tenant_wh" ON "cross_dock_operations" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_cross_dock_receipt" ON "cross_dock_operations" USING btree ("tenant_id","inbound_receipt_id");
CREATE INDEX IF NOT EXISTS "idx_cross_dock_order" ON "cross_dock_operations" USING btree ("tenant_id","matched_order_id");
CREATE INDEX IF NOT EXISTS "idx_cross_dock_status" ON "cross_dock_operations" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stock_batches_tenant_variant_code" ON "stock_batches" USING btree ("tenant_id","variant_id","batch_number");
CREATE INDEX IF NOT EXISTS "idx_stock_batches_status" ON "stock_batches" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_stock_batches_expiry" ON "stock_batches" USING btree ("tenant_id","expiry_date");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stock_serials_tenant_variant_sn" ON "stock_serials" USING btree ("tenant_id","variant_id","serial_number");
CREATE INDEX IF NOT EXISTS "idx_stock_serials_wh_status" ON "stock_serials" USING btree ("tenant_id","warehouse_id","status");
CREATE INDEX IF NOT EXISTS "idx_stock_serials_location" ON "stock_serials" USING btree ("tenant_id","location_id");
CREATE INDEX IF NOT EXISTS "idx_stock_serials_batch" ON "stock_serials" USING btree ("tenant_id","batch_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stock_ledger_tenant_idempotency" ON "stock_ledger_entries" USING btree ("tenant_id","idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_stock_ledger_tenant_variant_date" ON "stock_ledger_entries" USING btree ("tenant_id","variant_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_stock_ledger_reference" ON "stock_ledger_entries" USING btree ("tenant_id","reference_type","reference_id");
CREATE INDEX IF NOT EXISTS "idx_stock_reservations_tenant_lookup" ON "stock_reservations" USING btree ("tenant_id","variant_id","warehouse_id","status");
CREATE INDEX IF NOT EXISTS "idx_stock_reservations_expires" ON "stock_reservations" USING btree ("tenant_id","expires_at");
CREATE INDEX IF NOT EXISTS "idx_stock_balance_tenant_lookup" ON "stock_balance_snapshots" USING btree ("tenant_id","warehouse_id","variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_price_lists_tenant_code" ON "price_lists" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_price_lists_tenant_default" ON "price_lists" USING btree ("tenant_id","is_default");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_price_list_rules_unique" ON "price_list_rules" USING btree ("tenant_id","pricelist_id","variant_id","min_quantity");
CREATE INDEX IF NOT EXISTS "idx_price_list_rules_variant" ON "price_list_rules" USING btree ("tenant_id","variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tax_rates_tenant_code" ON "tax_rates" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_tax_rates_tenant_active" ON "tax_rates" USING btree ("tenant_id","is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_discount_promotions_tenant_code" ON "discount_promotions" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_discount_promotions_active" ON "discount_promotions" USING btree ("tenant_id","is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pos_registers_tenant_code" ON "pos_registers" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_pos_registers_tenant_branch" ON "pos_registers" USING btree ("tenant_id","branch_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant_register" ON "pos_sessions" USING btree ("tenant_id","register_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_status" ON "pos_sessions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_pos_cash_movements_tenant_session" ON "pos_cash_movements" USING btree ("tenant_id","session_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sales_orders_tenant_number" ON "sales_orders" USING btree ("tenant_id","order_number");
CREATE INDEX IF NOT EXISTS "idx_sales_orders_tenant_channel" ON "sales_orders" USING btree ("tenant_id","channel_type");
CREATE INDEX IF NOT EXISTS "idx_sales_orders_status" ON "sales_orders" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_sales_order_lines_order" ON "sales_order_lines" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_sales_order_lines_variant" ON "sales_order_lines" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sync_batches_tenant" ON "pos_sync_batches" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sync_batches_device" ON "pos_sync_batches" USING btree ("tenant_id","device_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sync_batches_session" ON "pos_sync_batches" USING btree ("pos_session_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pos_sync_tx_tenant_client_id" ON "pos_sync_transactions" USING btree ("tenant_id","client_tx_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pos_sync_tx_tenant_idempotency" ON "pos_sync_transactions" USING btree ("tenant_id","idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pos_sync_tx_tenant_device_seq" ON "pos_sync_transactions" USING btree ("tenant_id","device_id","client_sequence");
CREATE INDEX IF NOT EXISTS "idx_pos_sync_tx_batch" ON "pos_sync_transactions" USING btree ("batch_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sync_tx_session" ON "pos_sync_transactions" USING btree ("pos_session_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_suppliers_tenant_code" ON "suppliers" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant_status" ON "suppliers" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_sup_contacts_supplier" ON "supplier_contacts" USING btree ("tenant_id","supplier_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_mappings_tenant_sup_var" ON "supplier_product_mappings" USING btree ("tenant_id","supplier_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_mappings_variant" ON "supplier_product_mappings" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_mappings_sku" ON "supplier_product_mappings" USING btree ("tenant_id","supplier_sku");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_purchase_requests_tenant_number" ON "purchase_requests" USING btree ("tenant_id","request_number");
CREATE INDEX IF NOT EXISTS "idx_purchase_requests_tenant_status" ON "purchase_requests" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_pr_lines_request_id" ON "purchase_request_lines" USING btree ("tenant_id","request_id");
CREATE INDEX IF NOT EXISTS "idx_pr_lines_variant_id" ON "purchase_request_lines" USING btree ("tenant_id","variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rfqs_tenant_number" ON "purchase_rfqs" USING btree ("tenant_id","rfq_number");
CREATE INDEX IF NOT EXISTS "idx_rfqs_tenant_status" ON "purchase_rfqs" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_rfq_lines_rfq_id" ON "purchase_rfq_lines" USING btree ("tenant_id","rfq_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rfq_sup_rfq_supplier" ON "purchase_rfq_suppliers" USING btree ("tenant_id","rfq_id","supplier_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_quotes_tenant_number" ON "supplier_quotations" USING btree ("tenant_id","quotation_number");
CREATE INDEX IF NOT EXISTS "idx_supplier_quotes_tenant_supplier" ON "supplier_quotations" USING btree ("tenant_id","supplier_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_quotes_tenant_rfq" ON "supplier_quotations" USING btree ("tenant_id","rfq_id");
CREATE INDEX IF NOT EXISTS "idx_sq_lines_quotation_id" ON "supplier_quotation_lines" USING btree ("tenant_id","quotation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_po_tenant_number" ON "purchase_orders" USING btree ("tenant_id","po_number");
CREATE INDEX IF NOT EXISTS "idx_po_tenant_status" ON "purchase_orders" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_po_tenant_supplier" ON "purchase_orders" USING btree ("tenant_id","supplier_id");
CREATE INDEX IF NOT EXISTS "idx_po_lines_po_id" ON "purchase_order_lines" USING btree ("tenant_id","purchase_order_id");
CREATE INDEX IF NOT EXISTS "idx_po_lines_variant_id" ON "purchase_order_lines" USING btree ("tenant_id","variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_grn_tenant_number" ON "goods_receipts" USING btree ("tenant_id","grn_number");
CREATE INDEX IF NOT EXISTS "idx_grn_tenant_po" ON "goods_receipts" USING btree ("tenant_id","purchase_order_id");
CREATE INDEX IF NOT EXISTS "idx_grn_lines_receipt_id" ON "goods_receipt_lines" USING btree ("tenant_id","goods_receipt_id");
CREATE INDEX IF NOT EXISTS "idx_grn_lines_po_line_id" ON "goods_receipt_lines" USING btree ("tenant_id","purchase_order_line_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_landed_vouchers_tenant_number" ON "landed_cost_vouchers" USING btree ("tenant_id","voucher_number");
CREATE INDEX IF NOT EXISTS "idx_landed_vouchers_tenant_status" ON "landed_cost_vouchers" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_landed_charges_voucher" ON "landed_cost_charges" USING btree ("tenant_id","voucher_id");
CREATE INDEX IF NOT EXISTS "idx_landed_allocations_voucher" ON "landed_cost_line_allocations" USING btree ("tenant_id","voucher_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sup_returns_tenant_number" ON "supplier_returns" USING btree ("tenant_id","return_number");
CREATE INDEX IF NOT EXISTS "idx_sup_returns_tenant_supplier" ON "supplier_returns" USING btree ("tenant_id","supplier_id");
CREATE INDEX IF NOT EXISTS "idx_sup_returns_tenant_po" ON "supplier_returns" USING btree ("tenant_id","purchase_order_id");
CREATE INDEX IF NOT EXISTS "idx_sup_return_lines_return_id" ON "supplier_return_lines" USING btree ("tenant_id","return_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_tenant_number" ON "purchase_invoices" USING btree ("tenant_id","invoice_number");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_tenant_supplier_ref" ON "purchase_invoices" USING btree ("tenant_id","supplier_id","supplier_invoice_reference");
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_po" ON "purchase_invoices" USING btree ("tenant_id","purchase_order_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_supplier" ON "purchase_invoices" USING btree ("tenant_id","supplier_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_lines_invoice" ON "purchase_invoice_lines" USING btree ("tenant_id","invoice_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sup_pmt_tenant_number" ON "supplier_payments" USING btree ("tenant_id","payment_number");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sup_pmt_tenant_idemp" ON "supplier_payments" USING btree ("tenant_id","idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_sup_pmt_tenant_supplier" ON "supplier_payments" USING btree ("tenant_id","supplier_id");
CREATE INDEX IF NOT EXISTS "idx_sup_pmt_alloc_payment" ON "supplier_payment_allocations" USING btree ("tenant_id","payment_id");
CREATE INDEX IF NOT EXISTS "idx_sup_pmt_alloc_invoice" ON "supplier_payment_allocations" USING btree ("tenant_id","purchase_invoice_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bom_tenant_number" ON "bill_of_materials" USING btree ("tenant_id","bom_number");
CREATE INDEX IF NOT EXISTS "idx_bom_tenant_variant" ON "bill_of_materials" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_bom_lines_bom_id" ON "bom_lines" USING btree ("tenant_id","bom_id");
CREATE INDEX IF NOT EXISTS "idx_bom_lines_component_variant" ON "bom_lines" USING btree ("tenant_id","component_variant_id");
CREATE INDEX IF NOT EXISTS "idx_bom_byproducts_bom_id" ON "bom_byproducts" USING btree ("tenant_id","bom_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mfg_work_centers_code" ON "mfg_work_centers" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_mfg_work_centers_warehouse" ON "mfg_work_centers" USING btree ("tenant_id","warehouse_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_routings_tenant_number" ON "routings" USING btree ("tenant_id","routing_number");
CREATE INDEX IF NOT EXISTS "idx_routing_ops_routing" ON "routing_operations" USING btree ("tenant_id","routing_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mo_tenant_number" ON "manufacturing_orders" USING btree ("tenant_id","mo_number");
CREATE INDEX IF NOT EXISTS "idx_mo_tenant_status" ON "manufacturing_orders" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_mo_tenant_variant" ON "manufacturing_orders" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_mo_components_mo_id" ON "mo_components" USING btree ("tenant_id","manufacturing_order_id");
CREATE INDEX IF NOT EXISTS "idx_mo_work_orders_mo_id" ON "mo_work_orders" USING btree ("tenant_id","manufacturing_order_id");
CREATE INDEX IF NOT EXISTS "idx_mo_runs_mo_id" ON "mo_execution_runs" USING btree ("tenant_id","manufacturing_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mo_inspections_tenant_number" ON "mo_output_inspections" USING btree ("tenant_id","inspection_number");
CREATE INDEX IF NOT EXISTS "idx_mo_inspections_mo_id" ON "mo_output_inspections" USING btree ("tenant_id","manufacturing_order_id");
CREATE INDEX IF NOT EXISTS "idx_mo_inspections_status" ON "mo_output_inspections" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mo_scrap_tenant_number" ON "mo_scrap_records" USING btree ("tenant_id","scrap_number");
CREATE INDEX IF NOT EXISTS "idx_mo_scrap_mo_id" ON "mo_scrap_records" USING btree ("tenant_id","manufacturing_order_id");
CREATE INDEX IF NOT EXISTS "idx_mo_scrap_variant_id" ON "mo_scrap_records" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_mo_substitutions_mo_id" ON "mo_component_substitutions" USING btree ("tenant_id","manufacturing_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_customer_groups_tenant_code" ON "customer_groups" USING btree ("tenant_id","code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_customers_tenant_code" ON "customers" USING btree ("tenant_id","customer_code");
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_email" ON "customers" USING btree ("tenant_id","email");
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_phone" ON "customers" USING btree ("tenant_id","phone");
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_group" ON "customers" USING btree ("tenant_id","customer_group_id");
CREATE INDEX IF NOT EXISTS "idx_customer_addresses_customer" ON "customer_addresses" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_customer_addresses_tenant" ON "customer_addresses" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_quotations_tenant_number" ON "quotations" USING btree ("tenant_id","quotation_number");
CREATE INDEX IF NOT EXISTS "idx_quotations_tenant_status" ON "quotations" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_quotations_tenant_customer" ON "quotations" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_quotation_lines_quotation" ON "quotation_lines" USING btree ("quotation_id");
CREATE INDEX IF NOT EXISTS "idx_quotation_lines_variant" ON "quotation_lines" USING btree ("variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_number" ON "sales_invoices" USING btree ("tenant_id","invoice_number");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_order" ON "sales_invoices" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_status" ON "sales_invoices" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_customer" ON "sales_invoices" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_sales_invoice_lines_invoice" ON "sales_invoice_lines" USING btree ("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_sales_invoice_lines_variant" ON "sales_invoice_lines" USING btree ("variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rma_tenant_number" ON "return_authorizations" USING btree ("tenant_id","rma_number");
CREATE INDEX IF NOT EXISTS "idx_rma_tenant_warehouse" ON "return_authorizations" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_rma_tenant_status" ON "return_authorizations" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_rma_tenant_customer" ON "return_authorizations" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_rma_tenant_order" ON "return_authorizations" USING btree ("tenant_id","original_order_id");
CREATE INDEX IF NOT EXISTS "idx_return_lines_tenant_rma" ON "return_lines" USING btree ("tenant_id","rma_id");
CREATE INDEX IF NOT EXISTS "idx_return_lines_tenant_variant" ON "return_lines" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_return_lines_tenant_sku" ON "return_lines" USING btree ("tenant_id","sku");
CREATE INDEX IF NOT EXISTS "idx_qc_tenant_rma" ON "quality_inspections" USING btree ("tenant_id","rma_id");
CREATE INDEX IF NOT EXISTS "idx_qc_tenant_line" ON "quality_inspections" USING btree ("tenant_id","return_line_id");
CREATE INDEX IF NOT EXISTS "idx_qc_tenant_status" ON "quality_inspections" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_disposition_tenant_rma" ON "disposition_actions" USING btree ("tenant_id","rma_id");
CREATE INDEX IF NOT EXISTS "idx_disposition_tenant_action" ON "disposition_actions" USING btree ("tenant_id","action_type");
CREATE INDEX IF NOT EXISTS "idx_disposition_tenant_status" ON "disposition_actions" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_replenish_rules_unique" ON "replenishment_rules" USING btree ("tenant_id","warehouse_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_replenish_rules_wh" ON "replenishment_rules" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_replenish_rules_variant" ON "replenishment_rules" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_replenish_rules_sku" ON "replenishment_rules" USING btree ("tenant_id","sku");
CREATE INDEX IF NOT EXISTS "idx_replenish_recs_wh" ON "replenishment_recommendations" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_replenish_recs_status" ON "replenishment_recommendations" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_replenish_recs_rule" ON "replenishment_recommendations" USING btree ("tenant_id","rule_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vehicles_tenant_code" ON "fleet_vehicles" USING btree ("tenant_id","vehicle_code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vehicles_tenant_plate" ON "fleet_vehicles" USING btree ("tenant_id","license_plate");
CREATE INDEX IF NOT EXISTS "idx_vehicles_tenant_wh" ON "fleet_vehicles" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_vehicles_tenant_status" ON "fleet_vehicles" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_drivers_tenant_code" ON "fleet_drivers" USING btree ("tenant_id","driver_code");
CREATE INDEX IF NOT EXISTS "idx_drivers_tenant_user" ON "fleet_drivers" USING btree ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "idx_drivers_tenant_shift" ON "fleet_drivers" USING btree ("tenant_id","shift_status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_runs_tenant_number" ON "delivery_runs" USING btree ("tenant_id","run_number");
CREATE INDEX IF NOT EXISTS "idx_runs_tenant_wh" ON "delivery_runs" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_runs_tenant_status" ON "delivery_runs" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_runs_tenant_vehicle" ON "delivery_runs" USING btree ("tenant_id","vehicle_id");
CREATE INDEX IF NOT EXISTS "idx_runs_tenant_driver" ON "delivery_runs" USING btree ("tenant_id","driver_id");
CREATE INDEX IF NOT EXISTS "idx_stops_tenant_run" ON "delivery_stops" USING btree ("tenant_id","run_id");
CREATE INDEX IF NOT EXISTS "idx_stops_tenant_order" ON "delivery_stops" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_stops_tenant_status" ON "delivery_stops" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_pod_tenant_run" ON "proof_of_deliveries" USING btree ("tenant_id","run_id");
CREATE INDEX IF NOT EXISTS "idx_pod_tenant_stop" ON "proof_of_deliveries" USING btree ("tenant_id","stop_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_books_tenant_company_code" ON "accounting_books" USING btree ("tenant_id","company_id","code");
CREATE INDEX IF NOT EXISTS "idx_books_tenant_company" ON "accounting_books" USING btree ("tenant_id","company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_fy_tenant_book_year" ON "fiscal_years" USING btree ("tenant_id","book_id","year_code");
CREATE INDEX IF NOT EXISTS "idx_fy_tenant_company" ON "fiscal_years" USING btree ("tenant_id","company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_period_tenant_book_fy_num" ON "accounting_periods" USING btree ("tenant_id","book_id","fiscal_year_id","period_number");
CREATE INDEX IF NOT EXISTS "idx_period_tenant_status" ON "accounting_periods" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_period_dates" ON "accounting_periods" USING btree ("tenant_id","start_date","end_date");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_coa_tenant_company_code" ON "chart_of_accounts" USING btree ("tenant_id","company_id","code");
CREATE INDEX IF NOT EXISTS "idx_coa_tenant_type" ON "chart_of_accounts" USING btree ("tenant_id","type");
CREATE INDEX IF NOT EXISTS "idx_coa_tenant_company" ON "chart_of_accounts" USING btree ("tenant_id","company_id");
CREATE INDEX IF NOT EXISTS "idx_coa_tenant_book" ON "chart_of_accounts" USING btree ("tenant_id","book_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_je_tenant_number" ON "journal_entries" USING btree ("tenant_id","entry_number");
CREATE INDEX IF NOT EXISTS "idx_je_tenant_company_status" ON "journal_entries" USING btree ("tenant_id","company_id","status");
CREATE INDEX IF NOT EXISTS "idx_je_tenant_posting_date" ON "journal_entries" USING btree ("tenant_id","posting_date");
CREATE INDEX IF NOT EXISTS "idx_je_tenant_source" ON "journal_entries" USING btree ("tenant_id","source_type","source_id");
CREATE INDEX IF NOT EXISTS "idx_je_tenant_book_period" ON "journal_entries" USING btree ("tenant_id","book_id","period_id");
CREATE INDEX IF NOT EXISTS "idx_je_lines_tenant_je" ON "journal_entry_lines" USING btree ("tenant_id","journal_entry_id");
CREATE INDEX IF NOT EXISTS "idx_je_lines_tenant_account" ON "journal_entry_lines" USING btree ("tenant_id","account_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tax_groups_tenant_code" ON "tax_groups" USING btree ("tenant_id","code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_posting_rules_tenant_company_event_code" ON "accounting_posting_rules" USING btree ("tenant_id","company_id","event_type","rule_code");
CREATE INDEX IF NOT EXISTS "idx_posting_rules_tenant_event" ON "accounting_posting_rules" USING btree ("tenant_id","event_type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_accounting_source_events_idempotency" ON "accounting_source_event_records" USING btree ("tenant_id","company_id","source_module","operation_id");
CREATE INDEX IF NOT EXISTS "idx_accounting_source_events_status" ON "accounting_source_event_records" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_accounting_source_events_source_id" ON "accounting_source_event_records" USING btree ("tenant_id","source_event_id");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_tenant_type" ON "reconciliation_records" USING btree ("tenant_id","company_id","reconciliation_type");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_as_of" ON "reconciliation_records" USING btree ("tenant_id","as_of_date");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_consol_groups_tenant_code" ON "consolidation_groups" USING btree ("tenant_id","group_code");
CREATE INDEX IF NOT EXISTS "idx_consol_groups_tenant" ON "consolidation_groups" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_consol_members_tenant_group_company" ON "consolidation_group_members" USING btree ("tenant_id","group_id","company_id");
CREATE INDEX IF NOT EXISTS "idx_consol_members_tenant_group" ON "consolidation_group_members" USING btree ("tenant_id","group_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_group_coa_tenant_group_code" ON "group_chart_of_accounts" USING btree ("tenant_id","group_id","account_code");
CREATE INDEX IF NOT EXISTS "idx_group_coa_tenant_group" ON "group_chart_of_accounts" USING btree ("tenant_id","group_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_entity_account_map_unique" ON "entity_account_mappings" USING btree ("tenant_id","group_id","company_id","source_account_code");
CREATE INDEX IF NOT EXISTS "idx_entity_account_map_group" ON "entity_account_mappings" USING btree ("tenant_id","group_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_consol_runs_operation_id" ON "consolidation_runs" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_consol_runs_group_period" ON "consolidation_runs" USING btree ("tenant_id","group_id","period_id");
CREATE INDEX IF NOT EXISTS "idx_consol_runs_status" ON "consolidation_runs" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_consol_run_entities_run" ON "consolidation_run_entities" USING btree ("tenant_id","run_id");
CREATE INDEX IF NOT EXISTS "idx_consol_adj_tenant_run" ON "consolidation_adjustments" USING btree ("tenant_id","run_id");
CREATE INDEX IF NOT EXISTS "idx_consol_adj_lines_adj" ON "consolidation_adjustment_lines" USING btree ("tenant_id","adjustment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_interco_rel_unique" ON "intercompany_relationships" USING btree ("tenant_id","primary_company_id","counterparty_company_id");
CREATE INDEX IF NOT EXISTS "idx_interco_rel_tenant" ON "intercompany_relationships" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_interco_tx_ref" ON "intercompany_transactions" USING btree ("tenant_id","transaction_reference");
CREATE INDEX IF NOT EXISTS "idx_interco_tx_from_to" ON "intercompany_transactions" USING btree ("tenant_id","from_company_id","to_company_id");
CREATE INDEX IF NOT EXISTS "idx_interco_tx_status" ON "intercompany_transactions" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_interco_matches_from" ON "intercompany_matches" USING btree ("tenant_id","from_transaction_id");
CREATE INDEX IF NOT EXISTS "idx_interco_matches_status" ON "intercompany_matches" USING btree ("tenant_id","match_status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_elim_rules_tenant_code" ON "elimination_rules" USING btree ("tenant_id","rule_code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bank_acc_tenant_company_acc" ON "bank_accounts" USING btree ("tenant_id","company_id","account_number_masked");
CREATE INDEX IF NOT EXISTS "idx_bank_acc_tenant_company" ON "bank_accounts" USING btree ("tenant_id","company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bank_conn_tenant_company_provider" ON "bank_connections" USING btree ("tenant_id","company_id","provider_connection_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bank_tx_tenant_acc_ext" ON "bank_transactions" USING btree ("tenant_id","bank_account_id","external_transaction_id");
CREATE INDEX IF NOT EXISTS "idx_bank_tx_tenant_acc_status" ON "bank_transactions" USING btree ("tenant_id","bank_account_id","matching_status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cash_transfers_operation_id" ON "cash_transfers" USING btree ("tenant_id","operation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cash_transfers_tenant_num" ON "cash_transfers" USING btree ("tenant_id","transfer_number");
CREATE INDEX IF NOT EXISTS "idx_cash_transfers_tenant_status" ON "cash_transfers" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_cash_forecasts_tenant_company_date" ON "cash_forecasts" USING btree ("tenant_id","company_id","forecast_date");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tax_reg_tenant_company_jur_type" ON "tax_registrations" USING btree ("tenant_id","company_id","jurisdiction_code","tax_type");
CREATE INDEX IF NOT EXISTS "idx_tax_reg_tenant_company" ON "tax_registrations" USING btree ("tenant_id","company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tax_jur_config_tenant_jur_ver" ON "tax_jurisdiction_configs" USING btree ("tenant_id","jurisdiction_code","version");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tax_period_tenant_reg_name" ON "tax_filing_periods" USING btree ("tenant_id","registration_id","period_name");
CREATE INDEX IF NOT EXISTS "idx_tax_period_tenant_status" ON "tax_filing_periods" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tax_returns_tenant_period" ON "tax_returns" USING btree ("tenant_id","filing_period_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tax_returns_operation_id" ON "tax_returns" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_tax_returns_tenant_status" ON "tax_returns" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_tax_sub_tenant_return" ON "tax_filing_submissions" USING btree ("tenant_id","tax_return_id");
CREATE INDEX IF NOT EXISTS "idx_tax_sub_ref" ON "tax_filing_submissions" USING btree ("tenant_id","submission_reference");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_holding_tenant_code" ON "holding_groups" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_holding_tenant_parent" ON "holding_groups" USING btree ("tenant_id","parent_company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ict_tenant_number" ON "inter_company_transfers" USING btree ("tenant_id","transfer_number");
CREATE INDEX IF NOT EXISTS "idx_ict_tenant_status" ON "inter_company_transfers" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_ict_tenant_source_comp" ON "inter_company_transfers" USING btree ("tenant_id","source_company_id");
CREATE INDEX IF NOT EXISTS "idx_ict_tenant_dest_comp" ON "inter_company_transfers" USING btree ("tenant_id","destination_company_id");
CREATE INDEX IF NOT EXISTS "idx_webhooks_tenant_active" ON "webhook_subscriptions" USING btree ("tenant_id","is_active");
CREATE INDEX IF NOT EXISTS "idx_wh_delivery_sub" ON "webhook_delivery_attempts" USING btree ("tenant_id","subscription_id");
CREATE INDEX IF NOT EXISTS "idx_wh_delivery_status" ON "webhook_delivery_attempts" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_wh_dead_letter_sub" ON "webhook_dead_letters" USING btree ("tenant_id","subscription_id");
CREATE INDEX IF NOT EXISTS "idx_wh_dead_letter_time" ON "webhook_dead_letters" USING btree ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_doc_render_entity" ON "document_render_logs" USING btree ("tenant_id","document_type","entity_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" USING btree ("tenant_id","user_id","is_read");
CREATE INDEX IF NOT EXISTS "idx_abc_snapshot_tenant_company" ON "analytics_abc_snapshots" USING btree ("tenant_id","company_id");
CREATE INDEX IF NOT EXISTS "idx_abc_snapshot_created_at" ON "analytics_abc_snapshots" USING btree ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_forecast_tenant_variant" ON "analytics_demand_forecasts" USING btree ("tenant_id","variant_id");
CREATE INDEX IF NOT EXISTS "idx_forecast_created_at" ON "analytics_demand_forecasts" USING btree ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_dead_stock_tenant_wh" ON "analytics_dead_stock_alerts" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_dead_stock_aging" ON "analytics_dead_stock_alerts" USING btree ("tenant_id","aging_tier");
CREATE INDEX IF NOT EXISTS "idx_search_tenant_entity" ON "search_index_entries" USING btree ("tenant_id","entity_type");
CREATE INDEX IF NOT EXISTS "idx_search_tenant_barcode" ON "search_index_entries" USING btree ("tenant_id","barcode");
CREATE INDEX IF NOT EXISTS "idx_search_tenant_sku" ON "search_index_entries" USING btree ("tenant_id","sku");
CREATE INDEX IF NOT EXISTS "idx_search_tenant_ref" ON "search_index_entries" USING btree ("tenant_id","reference_number");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_audit_chain_tenant_index" ON "audit_chain_blocks" USING btree ("tenant_id","block_index");
CREATE INDEX IF NOT EXISTS "idx_audit_chain_tenant_created" ON "audit_chain_blocks" USING btree ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_export_tenant_status" ON "data_export_jobs" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_export_download_token" ON "data_export_jobs" USING btree ("download_token");
CREATE INDEX IF NOT EXISTS "idx_report_def_tenant" ON "custom_report_definitions" USING btree ("tenant_id","name");
CREATE INDEX IF NOT EXISTS "idx_gdpr_tenant_subject" ON "gdpr_erasure_requests" USING btree ("tenant_id","subject_id");
CREATE INDEX IF NOT EXISTS "idx_gdpr_tenant_status" ON "gdpr_erasure_requests" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_compliance_tenant_standard" ON "compliance_audit_logs" USING btree ("tenant_id","standard");
CREATE INDEX IF NOT EXISTS "idx_compliance_tenant_created" ON "compliance_audit_logs" USING btree ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_hardware_devices_tenant_type" ON "hardware_devices" USING btree ("tenant_id","device_type");
CREATE INDEX IF NOT EXISTS "idx_hardware_devices_tenant_status" ON "hardware_devices" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_hardware_devices_tenant_branch" ON "hardware_devices" USING btree ("tenant_id","branch_id");
CREATE INDEX IF NOT EXISTS "idx_hardware_profiles_tenant" ON "hardware_profiles" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hardware_print_jobs_tenant_op" ON "hardware_print_jobs" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_hardware_print_jobs_tenant_status" ON "hardware_print_jobs" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_hardware_print_jobs_device" ON "hardware_print_jobs" USING btree ("device_id");
CREATE INDEX IF NOT EXISTS "idx_fiscal_entities_tenant" ON "fiscal_entities" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_fiscal_entities_vat" ON "fiscal_entities" USING btree ("tenant_id","vat_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_e_invoices_tenant_num" ON "certified_e_invoices" USING btree ("tenant_id","invoice_number");
CREATE INDEX IF NOT EXISTS "idx_e_invoices_tenant_status" ON "certified_e_invoices" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_e_invoices_entity" ON "certified_e_invoices" USING btree ("entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_fiscal_chains_tenant_reg_seq" ON "fiscal_receipt_chains" USING btree ("tenant_id","register_id","sequence_number");
CREATE INDEX IF NOT EXISTS "idx_fiscal_chains_receipt" ON "fiscal_receipt_chains" USING btree ("tenant_id","receipt_number");
CREATE INDEX IF NOT EXISTS "idx_b2b_organizations_tenant" ON "b2b_organizations" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_b2b_organizations_parent" ON "b2b_organizations" USING btree ("tenant_id","parent_org_id");
CREATE INDEX IF NOT EXISTS "idx_b2b_organizations_tax" ON "b2b_organizations" USING btree ("tenant_id","tax_identifier");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_b2b_credit_accounts_tenant_org" ON "b2b_credit_accounts" USING btree ("tenant_id","organization_id");
CREATE INDEX IF NOT EXISTS "idx_b2b_credit_accounts_status" ON "b2b_credit_accounts" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_b2b_contract_pricing_tenant_org_sku" ON "b2b_contract_pricing" USING btree ("tenant_id","organization_id","sku");
CREATE INDEX IF NOT EXISTS "idx_b2b_contract_pricing_tenant_sku" ON "b2b_contract_pricing" USING btree ("tenant_id","sku");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_b2b_requisitions_tenant_num" ON "b2b_requisitions" USING btree ("tenant_id","requisition_number");
CREATE INDEX IF NOT EXISTS "idx_b2b_requisitions_org" ON "b2b_requisitions" USING btree ("tenant_id","organization_id");
CREATE INDEX IF NOT EXISTS "idx_b2b_requisitions_status" ON "b2b_requisitions" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_b2b_punchout_sessions_tenant_cookie" ON "b2b_punchout_sessions" USING btree ("tenant_id","buyer_cookie");
CREATE INDEX IF NOT EXISTS "idx_b2b_punchout_sessions_tenant_org" ON "b2b_punchout_sessions" USING btree ("tenant_id","organization_id");
CREATE INDEX IF NOT EXISTS "idx_loyalty_programs_tenant" ON "loyalty_programs" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_loyalty_tiers_tenant_prog" ON "loyalty_tiers" USING btree ("tenant_id","program_id");
CREATE INDEX IF NOT EXISTS "idx_loyalty_tiers_code" ON "loyalty_tiers" USING btree ("tenant_id","tier_code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_loyalty_accounts_tenant_cust" ON "loyalty_accounts" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_loyalty_accounts_prog" ON "loyalty_accounts" USING btree ("tenant_id","program_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_loyalty_tx_operation" ON "loyalty_transactions" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_loyalty_tx_account" ON "loyalty_transactions" USING btree ("tenant_id","account_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_gift_cards_tenant_code" ON "gift_card_accounts" USING btree ("tenant_id","card_code");
CREATE INDEX IF NOT EXISTS "idx_gift_cards_tenant_status" ON "gift_card_accounts" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_gift_card_tx_operation" ON "gift_card_transactions" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_gift_card_tx_card" ON "gift_card_transactions" USING btree ("tenant_id","gift_card_id");
CREATE INDEX IF NOT EXISTS "idx_edi_partners_tenant" ON "edi_partners" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_edi_partners_tenant_name" ON "edi_partners" USING btree ("tenant_id","partner_name");
CREATE INDEX IF NOT EXISTS "idx_edi_logs_tenant_partner" ON "edi_message_logs" USING btree ("tenant_id","partner_id");
CREATE INDEX IF NOT EXISTS "idx_edi_logs_control_num" ON "edi_message_logs" USING btree ("tenant_id","control_number");
CREATE INDEX IF NOT EXISTS "idx_edi_logs_status" ON "edi_message_logs" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_edi_ctrl_dedup" ON "edi_interchange_controls" USING btree ("tenant_id","partner_id","control_number","direction");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cust_contracts_tenant_num" ON "customer_contracts" USING btree ("tenant_id","contract_number");
CREATE INDEX IF NOT EXISTS "idx_cust_contracts_cust" ON "customer_contracts" USING btree ("tenant_id","customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cust_contract_items_unique" ON "customer_contract_items" USING btree ("tenant_id","contract_id","variant_id","min_quantity");
CREATE INDEX IF NOT EXISTS "idx_cust_contract_items_variant" ON "customer_contract_items" USING btree ("tenant_id","variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_promo_campaigns_tenant_code" ON "promotion_campaigns" USING btree ("tenant_id","campaign_code");
CREATE INDEX IF NOT EXISTS "idx_promo_campaigns_coupon" ON "promotion_campaigns" USING btree ("tenant_id","coupon_code");
CREATE INDEX IF NOT EXISTS "idx_promo_campaigns_active" ON "promotion_campaigns" USING btree ("tenant_id","is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_promo_redemptions_op" ON "promotion_redemptions" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_promo_redemptions_campaign" ON "promotion_redemptions" USING btree ("tenant_id","campaign_id");
CREATE INDEX IF NOT EXISTS "idx_promo_redemptions_order" ON "promotion_redemptions" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_margin_policies_tenant" ON "pricing_margin_policies" USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pricing_override_op" ON "pricing_override_requests" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_pricing_override_status" ON "pricing_override_requests" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_price_snapshots_order" ON "commercial_price_snapshots" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_price_snapshots_variant" ON "commercial_price_snapshots" USING btree ("tenant_id","variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rebate_agreements_num" ON "rebate_agreements" USING btree ("tenant_id","agreement_number");
CREATE INDEX IF NOT EXISTS "idx_rebate_agreements_party" ON "rebate_agreements" USING btree ("tenant_id","counterparty_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rebate_tiers_unique" ON "rebate_tiers" USING btree ("tenant_id","agreement_id","tier_number");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rebate_accruals_period" ON "rebate_accruals" USING btree ("tenant_id","agreement_id","period_identifier");
CREATE INDEX IF NOT EXISTS "idx_rebate_accruals_party" ON "rebate_accruals" USING btree ("tenant_id","counterparty_id");
CREATE INDEX IF NOT EXISTS "idx_rebate_accruals_status" ON "rebate_accruals" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_acct_rel_unique" ON "crm_account_relationships" USING btree ("tenant_id","parent_customer_id","child_customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_acct_rel_child" ON "crm_account_relationships" USING btree ("tenant_id","child_customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_contacts_customer" ON "crm_contacts" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_contacts_email" ON "crm_contacts" USING btree ("tenant_id","email");
CREATE INDEX IF NOT EXISTS "idx_crm_merges_surviving" ON "crm_customer_merges" USING btree ("tenant_id","surviving_customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_merges_merged" ON "crm_customer_merges" USING btree ("tenant_id","merged_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_leads_code" ON "crm_leads" USING btree ("tenant_id","lead_code");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_email" ON "crm_leads" USING btree ("tenant_id","email");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_status" ON "crm_leads" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_external" ON "crm_leads" USING btree ("tenant_id","external_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_pipelines_code" ON "crm_pipelines" USING btree ("tenant_id","code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_stages_code" ON "crm_pipeline_stages" USING btree ("tenant_id","pipeline_id","stage_code");
CREATE INDEX IF NOT EXISTS "idx_crm_stages_order" ON "crm_pipeline_stages" USING btree ("pipeline_id","order_index");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_opps_code" ON "crm_opportunities" USING btree ("tenant_id","opportunity_code");
CREATE INDEX IF NOT EXISTS "idx_crm_opps_customer" ON "crm_opportunities" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_opps_stage" ON "crm_opportunities" USING btree ("tenant_id","pipeline_id","current_stage_id");
CREATE INDEX IF NOT EXISTS "idx_crm_opp_hist" ON "crm_opportunity_stage_history" USING btree ("tenant_id","opportunity_id");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_cust" ON "crm_activities" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_opp" ON "crm_activities" USING btree ("tenant_id","opportunity_id");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_lead" ON "crm_activities" USING btree ("tenant_id","lead_id");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_time" ON "crm_activities" USING btree ("tenant_id","performed_at");
CREATE INDEX IF NOT EXISTS "idx_crm_tasks_cust" ON "crm_tasks" USING btree ("tenant_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_tasks_due" ON "crm_tasks" USING btree ("tenant_id","due_date","status");
CREATE INDEX IF NOT EXISTS "idx_crm_tasks_assigned" ON "crm_tasks" USING btree ("tenant_id","assigned_to");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_segments_code" ON "crm_segments" USING btree ("tenant_id","code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_seg_members_unique" ON "crm_segment_members" USING btree ("tenant_id","segment_id","customer_id");
CREATE INDEX IF NOT EXISTS "idx_crm_consent_lookup" ON "crm_consent_records" USING btree ("tenant_id","customer_id","purpose","channel");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_suppress_unique" ON "crm_suppression_list" USING btree ("tenant_id","channel","identifier");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_camp_code" ON "crm_campaigns" USING btree ("tenant_id","campaign_code");
CREATE INDEX IF NOT EXISTS "idx_crm_camp_status" ON "crm_campaigns" USING btree ("tenant_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_msg_op" ON "crm_messages" USING btree ("tenant_id","operation_id");
CREATE INDEX IF NOT EXISTS "idx_crm_msg_camp_stat" ON "crm_messages" USING btree ("tenant_id","campaign_id","status");
CREATE INDEX IF NOT EXISTS "idx_crm_msg_cust" ON "crm_messages" USING btree ("tenant_id","customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_auto_code" ON "crm_automations" USING btree ("tenant_id","automation_code");
CREATE INDEX IF NOT EXISTS "idx_crm_auto_trig" ON "crm_automations" USING btree ("tenant_id","trigger_type","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_exec_unique" ON "crm_automation_executions" USING btree ("tenant_id","automation_id","trigger_event_id");
CREATE INDEX IF NOT EXISTS "idx_crm_exec_cust" ON "crm_automation_executions" USING btree ("tenant_id","customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_fulfillments_tenant_number" ON "fulfillments" USING btree ("tenant_id","fulfillment_number");
CREATE INDEX IF NOT EXISTS "idx_fulfillments_tenant_order" ON "fulfillments" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_fulfillments_tenant_wh" ON "fulfillments" USING btree ("tenant_id","warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_fulfillments_tenant_status" ON "fulfillments" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_fulfillment_lines_tenant_f" ON "fulfillment_lines" USING btree ("tenant_id","fulfillment_id");
CREATE INDEX IF NOT EXISTS "idx_fulfillment_lines_tenant_ol" ON "fulfillment_lines" USING btree ("tenant_id","order_line_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_carriers_tenant_code" ON "carriers" USING btree ("tenant_id","carrier_code");
CREATE INDEX IF NOT EXISTS "idx_carriers_tenant_active" ON "carriers" USING btree ("tenant_id","is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_carrier_services_tenant_code" ON "carrier_services" USING btree ("tenant_id","carrier_id","service_code");
CREATE INDEX IF NOT EXISTS "idx_carrier_services_carrier" ON "carrier_services" USING btree ("tenant_id","carrier_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipping_quotes_tenant_num" ON "shipping_quotes" USING btree ("tenant_id","quote_number");
CREATE INDEX IF NOT EXISTS "idx_shipping_quotes_service" ON "shipping_quotes" USING btree ("tenant_id","service_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipments_tenant_number" ON "shipments" USING btree ("tenant_id","shipment_number");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_order" ON "shipments" USING btree ("tenant_id","order_id");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_f" ON "shipments" USING btree ("tenant_id","fulfillment_id");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_status" ON "shipments" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_tracking" ON "shipments" USING btree ("tenant_id","tracking_number");
CREATE INDEX IF NOT EXISTS "idx_shipment_lines_shipment" ON "shipment_lines" USING btree ("tenant_id","shipment_id");
CREATE INDEX IF NOT EXISTS "idx_shipment_lines_fline" ON "shipment_lines" USING btree ("tenant_id","fulfillment_line_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipment_packages_num" ON "shipment_packages" USING btree ("tenant_id","shipment_id","package_number");
CREATE INDEX IF NOT EXISTS "idx_shipment_packages_track" ON "shipment_packages" USING btree ("tenant_id","tracking_number");
CREATE INDEX IF NOT EXISTS "idx_shipment_milestones_shipment" ON "shipment_milestones" USING btree ("tenant_id","shipment_id");
CREATE INDEX IF NOT EXISTS "idx_shipment_milestones_provider" ON "shipment_milestones" USING btree ("tenant_id","provider_event_id");
CREATE INDEX IF NOT EXISTS "idx_logistics_charges_shipment" ON "logistics_charges" USING btree ("tenant_id","shipment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_logistics_policies_wh_name" ON "logistics_policies" USING btree ("tenant_id","warehouse_id","name");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_report_defs_tenant_code" ON "report_definitions" USING btree ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_report_defs_tenant_cat" ON "report_definitions" USING btree ("tenant_id","category");
CREATE INDEX IF NOT EXISTS "idx_report_defs_tenant_active" ON "report_definitions" USING btree ("tenant_id","is_active");
CREATE INDEX IF NOT EXISTS "idx_saved_reports_tenant" ON "saved_reports" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_saved_reports_tenant_creator" ON "saved_reports" USING btree ("tenant_id","created_by");
CREATE INDEX IF NOT EXISTS "idx_saved_reports_tenant_scope" ON "saved_reports" USING btree ("tenant_id","sharing_scope");
CREATE INDEX IF NOT EXISTS "idx_report_schedules_tenant" ON "report_schedules" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_report_schedules_active_next" ON "report_schedules" USING btree ("tenant_id","is_active","next_run_at");
CREATE INDEX IF NOT EXISTS "idx_report_exec_logs_tenant" ON "report_execution_logs" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_report_exec_logs_executed_at" ON "report_execution_logs" USING btree ("tenant_id","executed_at");
CREATE INDEX IF NOT EXISTS "idx_report_exec_logs_report" ON "report_execution_logs" USING btree ("tenant_id","report_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_dashboards_tenant" ON "analytics_dashboards" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_dashboards_family" ON "analytics_dashboards" USING btree ("tenant_id","dashboard_family");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rep_proj_unique_key" ON "reporting_projections" USING btree ("tenant_id","projection_key","period_date");
CREATE INDEX IF NOT EXISTS "idx_rep_proj_tenant_key" ON "reporting_projections" USING btree ("tenant_id","projection_key");
CREATE INDEX IF NOT EXISTS "idx_int_instance_tenant_status" ON "integration_instances" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_int_instance_tenant_connector" ON "integration_instances" USING btree ("tenant_id","connector_code");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_api_keys_hash" ON "developer_api_keys" USING btree ("key_hash");
CREATE INDEX IF NOT EXISTS "idx_api_keys_tenant_active" ON "developer_api_keys" USING btree ("tenant_id","is_active");
CREATE INDEX IF NOT EXISTS "idx_int_cred_tenant_instance" ON "integration_credentials" USING btree ("tenant_id","integration_instance_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_entity_mapping_unique" ON "integration_entity_mappings" USING btree ("tenant_id","integration_instance_id","entity_type","external_id");
CREATE INDEX IF NOT EXISTS "idx_entity_mapping_internal" ON "integration_entity_mappings" USING btree ("tenant_id","entity_type","internal_id");
CREATE INDEX IF NOT EXISTS "idx_field_mapping_tenant_instance" ON "integration_field_mappings" USING btree ("tenant_id","integration_instance_id","entity_type");
CREATE INDEX IF NOT EXISTS "idx_sync_runs_tenant_instance" ON "integration_sync_runs" USING btree ("tenant_id","integration_instance_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_inbound_wh_dedup" ON "inbound_webhook_receipts" USING btree ("tenant_id","provider","provider_event_id");
CREATE INDEX IF NOT EXISTS "idx_inbound_wh_tenant_status" ON "inbound_webhook_receipts" USING btree ("tenant_id","status");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_tenant_instance" ON "integration_reconciliations" USING btree ("tenant_id","integration_instance_id","status");
CREATE INDEX IF NOT EXISTS "idx_int_audit_tenant_time" ON "integration_audit_logs" USING btree ("tenant_id","created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_exec_sales_tenant_reference" ON "executive_sales_entries" USING btree ("tenant_id","reference");
CREATE INDEX IF NOT EXISTS "idx_exec_sales_tenant_date" ON "executive_sales_entries" USING btree ("tenant_id","sale_date");

-- Tenant isolation for every tenant-scoped table (adds a policy; never removes existing ones).
ALTER TABLE public."tenants" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tenants" TO authenticated;
ALTER TABLE public."companies" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."companies" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."companies";
CREATE POLICY "durable_tenant_isolation" ON public."companies" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."branches" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."branches" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."branches";
CREATE POLICY "durable_tenant_isolation" ON public."branches" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."users" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."users";
CREATE POLICY "durable_tenant_isolation" ON public."users" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."user_profiles" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_profiles" TO authenticated;
ALTER TABLE public."devices" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."devices" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."devices";
CREATE POLICY "durable_tenant_isolation" ON public."devices" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."audit_events" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."audit_events" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."audit_events";
CREATE POLICY "durable_tenant_isolation" ON public."audit_events" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."security_events" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."security_events" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."security_events";
CREATE POLICY "durable_tenant_isolation" ON public."security_events" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."sync_operations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sync_operations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."sync_operations";
CREATE POLICY "durable_tenant_isolation" ON public."sync_operations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."sync_changes" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sync_changes" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."sync_changes";
CREATE POLICY "durable_tenant_isolation" ON public."sync_changes" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."memberships" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."memberships" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."memberships";
CREATE POLICY "durable_tenant_isolation" ON public."memberships" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."roles" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."roles" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."roles";
CREATE POLICY "durable_tenant_isolation" ON public."roles" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."permissions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."permissions" TO authenticated;
ALTER TABLE public."role_permissions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."role_permissions" TO authenticated;
ALTER TABLE public."role_assignments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."role_assignments" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."role_assignments";
CREATE POLICY "durable_tenant_isolation" ON public."role_assignments" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."work_centers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."work_centers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."work_centers";
CREATE POLICY "durable_tenant_isolation" ON public."work_centers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."registers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."registers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."registers";
CREATE POLICY "durable_tenant_isolation" ON public."registers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."register_sessions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."register_sessions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."register_sessions";
CREATE POLICY "durable_tenant_isolation" ON public."register_sessions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."cash_movements" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."cash_movements" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."cash_movements";
CREATE POLICY "durable_tenant_isolation" ON public."cash_movements" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."workflows" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."workflows" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."workflows";
CREATE POLICY "durable_tenant_isolation" ON public."workflows" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."workflow_versions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."workflow_versions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."workflow_versions";
CREATE POLICY "durable_tenant_isolation" ON public."workflow_versions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."workflow_tasks" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."workflow_tasks" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."workflow_tasks";
CREATE POLICY "durable_tenant_isolation" ON public."workflow_tasks" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."workflow_task_claims" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."workflow_task_claims" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."workflow_task_claims";
CREATE POLICY "durable_tenant_isolation" ON public."workflow_task_claims" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."business_rules" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."business_rules" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."business_rules";
CREATE POLICY "durable_tenant_isolation" ON public."business_rules" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."approval_requests" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."approval_requests" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."approval_requests";
CREATE POLICY "durable_tenant_isolation" ON public."approval_requests" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."payments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."payments" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."payments";
CREATE POLICY "durable_tenant_isolation" ON public."payments" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."receipt_prints" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."receipt_prints" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."receipt_prints";
CREATE POLICY "durable_tenant_isolation" ON public."receipt_prints" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."multi_tender_checkouts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."multi_tender_checkouts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."multi_tender_checkouts";
CREATE POLICY "durable_tenant_isolation" ON public."multi_tender_checkouts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."checkout_tenders" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."checkout_tenders" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."checkout_tenders";
CREATE POLICY "durable_tenant_isolation" ON public."checkout_tenders" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."units_of_measure" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."units_of_measure" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."units_of_measure";
CREATE POLICY "durable_tenant_isolation" ON public."units_of_measure" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."unit_conversions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."unit_conversions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."unit_conversions";
CREATE POLICY "durable_tenant_isolation" ON public."unit_conversions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."product_categories" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."product_categories" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."product_categories";
CREATE POLICY "durable_tenant_isolation" ON public."product_categories" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."brands" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."brands" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."brands";
CREATE POLICY "durable_tenant_isolation" ON public."brands" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."product_templates" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."product_templates" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."product_templates";
CREATE POLICY "durable_tenant_isolation" ON public."product_templates" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."attribute_dimensions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."attribute_dimensions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."attribute_dimensions";
CREATE POLICY "durable_tenant_isolation" ON public."attribute_dimensions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."attribute_values" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."attribute_values" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."attribute_values";
CREATE POLICY "durable_tenant_isolation" ON public."attribute_values" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."product_variants" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."product_variants" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."product_variants";
CREATE POLICY "durable_tenant_isolation" ON public."product_variants" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."idempotency_records" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."idempotency_records" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."idempotency_records";
CREATE POLICY "durable_tenant_isolation" ON public."idempotency_records" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."outbox_events" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."outbox_events" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."outbox_events";
CREATE POLICY "durable_tenant_isolation" ON public."outbox_events" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."warehouses" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."warehouses" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."warehouses";
CREATE POLICY "durable_tenant_isolation" ON public."warehouses" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."storage_zones" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."storage_zones" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."storage_zones";
CREATE POLICY "durable_tenant_isolation" ON public."storage_zones" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."storage_locations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."storage_locations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."storage_locations";
CREATE POLICY "durable_tenant_isolation" ON public."storage_locations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."put_away_rules" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."put_away_rules" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."put_away_rules";
CREATE POLICY "durable_tenant_isolation" ON public."put_away_rules" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pick_waves" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pick_waves" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pick_waves";
CREATE POLICY "durable_tenant_isolation" ON public."pick_waves" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pick_lists" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pick_lists" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pick_lists";
CREATE POLICY "durable_tenant_isolation" ON public."pick_lists" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pick_list_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pick_list_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pick_list_lines";
CREATE POLICY "durable_tenant_isolation" ON public."pick_list_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."packing_stations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."packing_stations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."packing_stations";
CREATE POLICY "durable_tenant_isolation" ON public."packing_stations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."packaging_boxes" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."packaging_boxes" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."packaging_boxes";
CREATE POLICY "durable_tenant_isolation" ON public."packaging_boxes" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."shipping_manifests" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."shipping_manifests" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."shipping_manifests";
CREATE POLICY "durable_tenant_isolation" ON public."shipping_manifests" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."packed_containers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."packed_containers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."packed_containers";
CREATE POLICY "durable_tenant_isolation" ON public."packed_containers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."packed_container_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."packed_container_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."packed_container_lines";
CREATE POLICY "durable_tenant_isolation" ON public."packed_container_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."internal_bin_transfers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."internal_bin_transfers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."internal_bin_transfers";
CREATE POLICY "durable_tenant_isolation" ON public."internal_bin_transfers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."internal_bin_transfer_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."internal_bin_transfer_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."internal_bin_transfer_lines";
CREATE POLICY "durable_tenant_isolation" ON public."internal_bin_transfer_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."cross_dock_operations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."cross_dock_operations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."cross_dock_operations";
CREATE POLICY "durable_tenant_isolation" ON public."cross_dock_operations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."stock_batches" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."stock_batches" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."stock_batches";
CREATE POLICY "durable_tenant_isolation" ON public."stock_batches" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."stock_serials" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."stock_serials" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."stock_serials";
CREATE POLICY "durable_tenant_isolation" ON public."stock_serials" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."stock_ledger_entries" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."stock_ledger_entries" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."stock_ledger_entries";
CREATE POLICY "durable_tenant_isolation" ON public."stock_ledger_entries" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."stock_reservations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."stock_reservations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."stock_reservations";
CREATE POLICY "durable_tenant_isolation" ON public."stock_reservations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."stock_balance_snapshots" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."stock_balance_snapshots" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."stock_balance_snapshots";
CREATE POLICY "durable_tenant_isolation" ON public."stock_balance_snapshots" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."price_lists" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."price_lists" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."price_lists";
CREATE POLICY "durable_tenant_isolation" ON public."price_lists" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."price_list_rules" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."price_list_rules" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."price_list_rules";
CREATE POLICY "durable_tenant_isolation" ON public."price_list_rules" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."tax_rates" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tax_rates" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."tax_rates";
CREATE POLICY "durable_tenant_isolation" ON public."tax_rates" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."discount_promotions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."discount_promotions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."discount_promotions";
CREATE POLICY "durable_tenant_isolation" ON public."discount_promotions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pos_registers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pos_registers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pos_registers";
CREATE POLICY "durable_tenant_isolation" ON public."pos_registers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pos_sessions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pos_sessions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pos_sessions";
CREATE POLICY "durable_tenant_isolation" ON public."pos_sessions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pos_cash_movements" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pos_cash_movements" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pos_cash_movements";
CREATE POLICY "durable_tenant_isolation" ON public."pos_cash_movements" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."sales_orders" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sales_orders" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."sales_orders";
CREATE POLICY "durable_tenant_isolation" ON public."sales_orders" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."sales_order_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sales_order_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."sales_order_lines";
CREATE POLICY "durable_tenant_isolation" ON public."sales_order_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pos_sync_batches" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pos_sync_batches" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pos_sync_batches";
CREATE POLICY "durable_tenant_isolation" ON public."pos_sync_batches" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pos_sync_transactions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pos_sync_transactions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pos_sync_transactions";
CREATE POLICY "durable_tenant_isolation" ON public."pos_sync_transactions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."suppliers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."suppliers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."suppliers";
CREATE POLICY "durable_tenant_isolation" ON public."suppliers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_contacts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_contacts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_contacts";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_contacts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_product_mappings" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_product_mappings" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_product_mappings";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_product_mappings" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_requests" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_requests" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_requests";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_requests" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_request_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_request_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_request_lines";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_request_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_rfqs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_rfqs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_rfqs";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_rfqs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_rfq_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_rfq_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_rfq_lines";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_rfq_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_rfq_suppliers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_rfq_suppliers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_rfq_suppliers";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_rfq_suppliers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_quotations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_quotations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_quotations";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_quotations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_quotation_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_quotation_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_quotation_lines";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_quotation_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_orders" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_orders" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_orders";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_orders" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_order_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_order_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_order_lines";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_order_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."goods_receipts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."goods_receipts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."goods_receipts";
CREATE POLICY "durable_tenant_isolation" ON public."goods_receipts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."goods_receipt_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."goods_receipt_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."goods_receipt_lines";
CREATE POLICY "durable_tenant_isolation" ON public."goods_receipt_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."landed_cost_vouchers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."landed_cost_vouchers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."landed_cost_vouchers";
CREATE POLICY "durable_tenant_isolation" ON public."landed_cost_vouchers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."landed_cost_charges" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."landed_cost_charges" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."landed_cost_charges";
CREATE POLICY "durable_tenant_isolation" ON public."landed_cost_charges" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."landed_cost_line_allocations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."landed_cost_line_allocations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."landed_cost_line_allocations";
CREATE POLICY "durable_tenant_isolation" ON public."landed_cost_line_allocations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_returns" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_returns" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_returns";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_returns" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_return_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_return_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_return_lines";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_return_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_invoices" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_invoices" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_invoices";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_invoices" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."purchase_invoice_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."purchase_invoice_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."purchase_invoice_lines";
CREATE POLICY "durable_tenant_isolation" ON public."purchase_invoice_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_payments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_payments" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_payments";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_payments" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."supplier_payment_allocations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."supplier_payment_allocations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."supplier_payment_allocations";
CREATE POLICY "durable_tenant_isolation" ON public."supplier_payment_allocations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."bill_of_materials" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."bill_of_materials" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."bill_of_materials";
CREATE POLICY "durable_tenant_isolation" ON public."bill_of_materials" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."bom_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."bom_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."bom_lines";
CREATE POLICY "durable_tenant_isolation" ON public."bom_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."bom_byproducts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."bom_byproducts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."bom_byproducts";
CREATE POLICY "durable_tenant_isolation" ON public."bom_byproducts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."mfg_work_centers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mfg_work_centers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."mfg_work_centers";
CREATE POLICY "durable_tenant_isolation" ON public."mfg_work_centers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."routings" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."routings" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."routings";
CREATE POLICY "durable_tenant_isolation" ON public."routings" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."routing_operations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."routing_operations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."routing_operations";
CREATE POLICY "durable_tenant_isolation" ON public."routing_operations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."manufacturing_orders" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."manufacturing_orders" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."manufacturing_orders";
CREATE POLICY "durable_tenant_isolation" ON public."manufacturing_orders" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."mo_components" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mo_components" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."mo_components";
CREATE POLICY "durable_tenant_isolation" ON public."mo_components" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."mo_work_orders" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mo_work_orders" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."mo_work_orders";
CREATE POLICY "durable_tenant_isolation" ON public."mo_work_orders" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."mo_execution_runs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mo_execution_runs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."mo_execution_runs";
CREATE POLICY "durable_tenant_isolation" ON public."mo_execution_runs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."mo_output_inspections" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mo_output_inspections" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."mo_output_inspections";
CREATE POLICY "durable_tenant_isolation" ON public."mo_output_inspections" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."mo_scrap_records" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mo_scrap_records" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."mo_scrap_records";
CREATE POLICY "durable_tenant_isolation" ON public."mo_scrap_records" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."mo_component_substitutions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mo_component_substitutions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."mo_component_substitutions";
CREATE POLICY "durable_tenant_isolation" ON public."mo_component_substitutions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."customer_groups" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."customer_groups" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."customer_groups";
CREATE POLICY "durable_tenant_isolation" ON public."customer_groups" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."customers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."customers";
CREATE POLICY "durable_tenant_isolation" ON public."customers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."customer_addresses" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."customer_addresses" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."customer_addresses";
CREATE POLICY "durable_tenant_isolation" ON public."customer_addresses" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."quotations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."quotations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."quotations";
CREATE POLICY "durable_tenant_isolation" ON public."quotations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."quotation_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."quotation_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."quotation_lines";
CREATE POLICY "durable_tenant_isolation" ON public."quotation_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."sales_invoices" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sales_invoices" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."sales_invoices";
CREATE POLICY "durable_tenant_isolation" ON public."sales_invoices" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."sales_invoice_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sales_invoice_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."sales_invoice_lines";
CREATE POLICY "durable_tenant_isolation" ON public."sales_invoice_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."return_authorizations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."return_authorizations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."return_authorizations";
CREATE POLICY "durable_tenant_isolation" ON public."return_authorizations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."return_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."return_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."return_lines";
CREATE POLICY "durable_tenant_isolation" ON public."return_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."quality_inspections" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."quality_inspections" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."quality_inspections";
CREATE POLICY "durable_tenant_isolation" ON public."quality_inspections" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."disposition_actions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."disposition_actions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."disposition_actions";
CREATE POLICY "durable_tenant_isolation" ON public."disposition_actions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."replenishment_rules" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."replenishment_rules" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."replenishment_rules";
CREATE POLICY "durable_tenant_isolation" ON public."replenishment_rules" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."replenishment_recommendations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."replenishment_recommendations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."replenishment_recommendations";
CREATE POLICY "durable_tenant_isolation" ON public."replenishment_recommendations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."fleet_vehicles" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fleet_vehicles" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."fleet_vehicles";
CREATE POLICY "durable_tenant_isolation" ON public."fleet_vehicles" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."fleet_drivers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fleet_drivers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."fleet_drivers";
CREATE POLICY "durable_tenant_isolation" ON public."fleet_drivers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."delivery_runs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."delivery_runs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."delivery_runs";
CREATE POLICY "durable_tenant_isolation" ON public."delivery_runs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."delivery_stops" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."delivery_stops" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."delivery_stops";
CREATE POLICY "durable_tenant_isolation" ON public."delivery_stops" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."proof_of_deliveries" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."proof_of_deliveries" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."proof_of_deliveries";
CREATE POLICY "durable_tenant_isolation" ON public."proof_of_deliveries" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."accounting_books" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."accounting_books" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."accounting_books";
CREATE POLICY "durable_tenant_isolation" ON public."accounting_books" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."fiscal_years" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fiscal_years" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."fiscal_years";
CREATE POLICY "durable_tenant_isolation" ON public."fiscal_years" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."accounting_periods" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."accounting_periods" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."accounting_periods";
CREATE POLICY "durable_tenant_isolation" ON public."accounting_periods" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."chart_of_accounts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."chart_of_accounts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."chart_of_accounts";
CREATE POLICY "durable_tenant_isolation" ON public."chart_of_accounts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."journal_entries" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."journal_entries" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."journal_entries";
CREATE POLICY "durable_tenant_isolation" ON public."journal_entries" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."journal_entry_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."journal_entry_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."journal_entry_lines";
CREATE POLICY "durable_tenant_isolation" ON public."journal_entry_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."tax_groups" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tax_groups" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."tax_groups";
CREATE POLICY "durable_tenant_isolation" ON public."tax_groups" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."accounting_posting_rules" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."accounting_posting_rules" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."accounting_posting_rules";
CREATE POLICY "durable_tenant_isolation" ON public."accounting_posting_rules" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."accounting_source_event_records" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."accounting_source_event_records" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."accounting_source_event_records";
CREATE POLICY "durable_tenant_isolation" ON public."accounting_source_event_records" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."reconciliation_records" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."reconciliation_records" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."reconciliation_records";
CREATE POLICY "durable_tenant_isolation" ON public."reconciliation_records" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."consolidation_groups" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."consolidation_groups" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."consolidation_groups";
CREATE POLICY "durable_tenant_isolation" ON public."consolidation_groups" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."consolidation_group_members" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."consolidation_group_members" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."consolidation_group_members";
CREATE POLICY "durable_tenant_isolation" ON public."consolidation_group_members" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."group_chart_of_accounts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."group_chart_of_accounts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."group_chart_of_accounts";
CREATE POLICY "durable_tenant_isolation" ON public."group_chart_of_accounts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."entity_account_mappings" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."entity_account_mappings" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."entity_account_mappings";
CREATE POLICY "durable_tenant_isolation" ON public."entity_account_mappings" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."consolidation_runs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."consolidation_runs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."consolidation_runs";
CREATE POLICY "durable_tenant_isolation" ON public."consolidation_runs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."consolidation_run_entities" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."consolidation_run_entities" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."consolidation_run_entities";
CREATE POLICY "durable_tenant_isolation" ON public."consolidation_run_entities" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."consolidation_adjustments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."consolidation_adjustments" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."consolidation_adjustments";
CREATE POLICY "durable_tenant_isolation" ON public."consolidation_adjustments" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."consolidation_adjustment_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."consolidation_adjustment_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."consolidation_adjustment_lines";
CREATE POLICY "durable_tenant_isolation" ON public."consolidation_adjustment_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."intercompany_relationships" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."intercompany_relationships" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."intercompany_relationships";
CREATE POLICY "durable_tenant_isolation" ON public."intercompany_relationships" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."intercompany_transactions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."intercompany_transactions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."intercompany_transactions";
CREATE POLICY "durable_tenant_isolation" ON public."intercompany_transactions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."intercompany_matches" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."intercompany_matches" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."intercompany_matches";
CREATE POLICY "durable_tenant_isolation" ON public."intercompany_matches" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."elimination_rules" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."elimination_rules" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."elimination_rules";
CREATE POLICY "durable_tenant_isolation" ON public."elimination_rules" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."bank_accounts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."bank_accounts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."bank_accounts";
CREATE POLICY "durable_tenant_isolation" ON public."bank_accounts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."bank_connections" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."bank_connections" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."bank_connections";
CREATE POLICY "durable_tenant_isolation" ON public."bank_connections" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."bank_transactions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."bank_transactions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."bank_transactions";
CREATE POLICY "durable_tenant_isolation" ON public."bank_transactions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."cash_transfers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."cash_transfers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."cash_transfers";
CREATE POLICY "durable_tenant_isolation" ON public."cash_transfers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."cash_forecasts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."cash_forecasts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."cash_forecasts";
CREATE POLICY "durable_tenant_isolation" ON public."cash_forecasts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."tax_registrations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tax_registrations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."tax_registrations";
CREATE POLICY "durable_tenant_isolation" ON public."tax_registrations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."tax_jurisdiction_configs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tax_jurisdiction_configs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."tax_jurisdiction_configs";
CREATE POLICY "durable_tenant_isolation" ON public."tax_jurisdiction_configs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."tax_filing_periods" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tax_filing_periods" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."tax_filing_periods";
CREATE POLICY "durable_tenant_isolation" ON public."tax_filing_periods" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."tax_returns" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tax_returns" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."tax_returns";
CREATE POLICY "durable_tenant_isolation" ON public."tax_returns" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."tax_filing_submissions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tax_filing_submissions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."tax_filing_submissions";
CREATE POLICY "durable_tenant_isolation" ON public."tax_filing_submissions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."holding_groups" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."holding_groups" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."holding_groups";
CREATE POLICY "durable_tenant_isolation" ON public."holding_groups" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."inter_company_transfers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."inter_company_transfers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."inter_company_transfers";
CREATE POLICY "durable_tenant_isolation" ON public."inter_company_transfers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."webhook_subscriptions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."webhook_subscriptions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."webhook_subscriptions";
CREATE POLICY "durable_tenant_isolation" ON public."webhook_subscriptions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."webhook_delivery_attempts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."webhook_delivery_attempts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."webhook_delivery_attempts";
CREATE POLICY "durable_tenant_isolation" ON public."webhook_delivery_attempts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."webhook_dead_letters" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."webhook_dead_letters" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."webhook_dead_letters";
CREATE POLICY "durable_tenant_isolation" ON public."webhook_dead_letters" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."document_render_logs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."document_render_logs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."document_render_logs";
CREATE POLICY "durable_tenant_isolation" ON public."document_render_logs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."notifications" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."notifications";
CREATE POLICY "durable_tenant_isolation" ON public."notifications" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."analytics_abc_snapshots" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."analytics_abc_snapshots" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."analytics_abc_snapshots";
CREATE POLICY "durable_tenant_isolation" ON public."analytics_abc_snapshots" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."analytics_demand_forecasts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."analytics_demand_forecasts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."analytics_demand_forecasts";
CREATE POLICY "durable_tenant_isolation" ON public."analytics_demand_forecasts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."analytics_dead_stock_alerts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."analytics_dead_stock_alerts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."analytics_dead_stock_alerts";
CREATE POLICY "durable_tenant_isolation" ON public."analytics_dead_stock_alerts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."search_index_entries" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."search_index_entries" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."search_index_entries";
CREATE POLICY "durable_tenant_isolation" ON public."search_index_entries" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."audit_chain_blocks" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."audit_chain_blocks" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."audit_chain_blocks";
CREATE POLICY "durable_tenant_isolation" ON public."audit_chain_blocks" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."data_export_jobs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."data_export_jobs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."data_export_jobs";
CREATE POLICY "durable_tenant_isolation" ON public."data_export_jobs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."custom_report_definitions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."custom_report_definitions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."custom_report_definitions";
CREATE POLICY "durable_tenant_isolation" ON public."custom_report_definitions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."gdpr_erasure_requests" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."gdpr_erasure_requests" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."gdpr_erasure_requests";
CREATE POLICY "durable_tenant_isolation" ON public."gdpr_erasure_requests" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."compliance_audit_logs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."compliance_audit_logs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."compliance_audit_logs";
CREATE POLICY "durable_tenant_isolation" ON public."compliance_audit_logs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."hardware_devices" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."hardware_devices" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."hardware_devices";
CREATE POLICY "durable_tenant_isolation" ON public."hardware_devices" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."hardware_profiles" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."hardware_profiles" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."hardware_profiles";
CREATE POLICY "durable_tenant_isolation" ON public."hardware_profiles" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."hardware_print_jobs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."hardware_print_jobs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."hardware_print_jobs";
CREATE POLICY "durable_tenant_isolation" ON public."hardware_print_jobs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."fiscal_entities" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fiscal_entities" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."fiscal_entities";
CREATE POLICY "durable_tenant_isolation" ON public."fiscal_entities" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."certified_e_invoices" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."certified_e_invoices" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."certified_e_invoices";
CREATE POLICY "durable_tenant_isolation" ON public."certified_e_invoices" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."fiscal_receipt_chains" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fiscal_receipt_chains" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."fiscal_receipt_chains";
CREATE POLICY "durable_tenant_isolation" ON public."fiscal_receipt_chains" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."b2b_organizations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."b2b_organizations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."b2b_organizations";
CREATE POLICY "durable_tenant_isolation" ON public."b2b_organizations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."b2b_credit_accounts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."b2b_credit_accounts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."b2b_credit_accounts";
CREATE POLICY "durable_tenant_isolation" ON public."b2b_credit_accounts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."b2b_contract_pricing" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."b2b_contract_pricing" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."b2b_contract_pricing";
CREATE POLICY "durable_tenant_isolation" ON public."b2b_contract_pricing" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."b2b_requisitions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."b2b_requisitions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."b2b_requisitions";
CREATE POLICY "durable_tenant_isolation" ON public."b2b_requisitions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."b2b_punchout_sessions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."b2b_punchout_sessions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."b2b_punchout_sessions";
CREATE POLICY "durable_tenant_isolation" ON public."b2b_punchout_sessions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."loyalty_programs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."loyalty_programs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."loyalty_programs";
CREATE POLICY "durable_tenant_isolation" ON public."loyalty_programs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."loyalty_tiers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."loyalty_tiers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."loyalty_tiers";
CREATE POLICY "durable_tenant_isolation" ON public."loyalty_tiers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."loyalty_accounts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."loyalty_accounts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."loyalty_accounts";
CREATE POLICY "durable_tenant_isolation" ON public."loyalty_accounts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."loyalty_transactions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."loyalty_transactions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."loyalty_transactions";
CREATE POLICY "durable_tenant_isolation" ON public."loyalty_transactions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."gift_card_accounts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."gift_card_accounts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."gift_card_accounts";
CREATE POLICY "durable_tenant_isolation" ON public."gift_card_accounts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."gift_card_transactions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."gift_card_transactions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."gift_card_transactions";
CREATE POLICY "durable_tenant_isolation" ON public."gift_card_transactions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."edi_partners" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."edi_partners" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."edi_partners";
CREATE POLICY "durable_tenant_isolation" ON public."edi_partners" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."edi_message_logs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."edi_message_logs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."edi_message_logs";
CREATE POLICY "durable_tenant_isolation" ON public."edi_message_logs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."edi_interchange_controls" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."edi_interchange_controls" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."edi_interchange_controls";
CREATE POLICY "durable_tenant_isolation" ON public."edi_interchange_controls" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."customer_contracts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."customer_contracts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."customer_contracts";
CREATE POLICY "durable_tenant_isolation" ON public."customer_contracts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."customer_contract_items" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."customer_contract_items" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."customer_contract_items";
CREATE POLICY "durable_tenant_isolation" ON public."customer_contract_items" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."promotion_campaigns" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."promotion_campaigns" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."promotion_campaigns";
CREATE POLICY "durable_tenant_isolation" ON public."promotion_campaigns" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."promotion_redemptions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."promotion_redemptions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."promotion_redemptions";
CREATE POLICY "durable_tenant_isolation" ON public."promotion_redemptions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pricing_margin_policies" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pricing_margin_policies" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pricing_margin_policies";
CREATE POLICY "durable_tenant_isolation" ON public."pricing_margin_policies" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."pricing_override_requests" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."pricing_override_requests" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."pricing_override_requests";
CREATE POLICY "durable_tenant_isolation" ON public."pricing_override_requests" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."commercial_price_snapshots" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."commercial_price_snapshots" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."commercial_price_snapshots";
CREATE POLICY "durable_tenant_isolation" ON public."commercial_price_snapshots" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."rebate_agreements" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."rebate_agreements" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."rebate_agreements";
CREATE POLICY "durable_tenant_isolation" ON public."rebate_agreements" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."rebate_tiers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."rebate_tiers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."rebate_tiers";
CREATE POLICY "durable_tenant_isolation" ON public."rebate_tiers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."rebate_accruals" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."rebate_accruals" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."rebate_accruals";
CREATE POLICY "durable_tenant_isolation" ON public."rebate_accruals" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_account_relationships" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_account_relationships" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_account_relationships";
CREATE POLICY "durable_tenant_isolation" ON public."crm_account_relationships" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_contacts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_contacts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_contacts";
CREATE POLICY "durable_tenant_isolation" ON public."crm_contacts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_customer_merges" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_customer_merges" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_customer_merges";
CREATE POLICY "durable_tenant_isolation" ON public."crm_customer_merges" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_leads" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_leads" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_leads";
CREATE POLICY "durable_tenant_isolation" ON public."crm_leads" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_pipelines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_pipelines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_pipelines";
CREATE POLICY "durable_tenant_isolation" ON public."crm_pipelines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_pipeline_stages" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_pipeline_stages" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_pipeline_stages";
CREATE POLICY "durable_tenant_isolation" ON public."crm_pipeline_stages" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_opportunities" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_opportunities" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_opportunities";
CREATE POLICY "durable_tenant_isolation" ON public."crm_opportunities" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_opportunity_stage_history" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_opportunity_stage_history" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_opportunity_stage_history";
CREATE POLICY "durable_tenant_isolation" ON public."crm_opportunity_stage_history" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_activities" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_activities" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_activities";
CREATE POLICY "durable_tenant_isolation" ON public."crm_activities" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_tasks" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_tasks" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_tasks";
CREATE POLICY "durable_tenant_isolation" ON public."crm_tasks" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_segments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_segments" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_segments";
CREATE POLICY "durable_tenant_isolation" ON public."crm_segments" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_segment_members" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_segment_members" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_segment_members";
CREATE POLICY "durable_tenant_isolation" ON public."crm_segment_members" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_consent_records" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_consent_records" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_consent_records";
CREATE POLICY "durable_tenant_isolation" ON public."crm_consent_records" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_suppression_list" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_suppression_list" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_suppression_list";
CREATE POLICY "durable_tenant_isolation" ON public."crm_suppression_list" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_campaigns" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_campaigns" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_campaigns";
CREATE POLICY "durable_tenant_isolation" ON public."crm_campaigns" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_messages" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_messages" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_messages";
CREATE POLICY "durable_tenant_isolation" ON public."crm_messages" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_automations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_automations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_automations";
CREATE POLICY "durable_tenant_isolation" ON public."crm_automations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."crm_automation_executions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."crm_automation_executions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."crm_automation_executions";
CREATE POLICY "durable_tenant_isolation" ON public."crm_automation_executions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."fulfillments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fulfillments" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."fulfillments";
CREATE POLICY "durable_tenant_isolation" ON public."fulfillments" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."fulfillment_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."fulfillment_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."fulfillment_lines";
CREATE POLICY "durable_tenant_isolation" ON public."fulfillment_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."carriers" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."carriers" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."carriers";
CREATE POLICY "durable_tenant_isolation" ON public."carriers" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."carrier_services" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."carrier_services" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."carrier_services";
CREATE POLICY "durable_tenant_isolation" ON public."carrier_services" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."shipping_quotes" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."shipping_quotes" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."shipping_quotes";
CREATE POLICY "durable_tenant_isolation" ON public."shipping_quotes" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."shipments" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."shipments" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."shipments";
CREATE POLICY "durable_tenant_isolation" ON public."shipments" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."shipment_lines" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."shipment_lines" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."shipment_lines";
CREATE POLICY "durable_tenant_isolation" ON public."shipment_lines" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."shipment_packages" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."shipment_packages" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."shipment_packages";
CREATE POLICY "durable_tenant_isolation" ON public."shipment_packages" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."shipment_milestones" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."shipment_milestones" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."shipment_milestones";
CREATE POLICY "durable_tenant_isolation" ON public."shipment_milestones" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."logistics_charges" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."logistics_charges" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."logistics_charges";
CREATE POLICY "durable_tenant_isolation" ON public."logistics_charges" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."logistics_policies" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."logistics_policies" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."logistics_policies";
CREATE POLICY "durable_tenant_isolation" ON public."logistics_policies" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."report_definitions" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."report_definitions" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."report_definitions";
CREATE POLICY "durable_tenant_isolation" ON public."report_definitions" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."saved_reports" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."saved_reports" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."saved_reports";
CREATE POLICY "durable_tenant_isolation" ON public."saved_reports" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."report_schedules" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."report_schedules" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."report_schedules";
CREATE POLICY "durable_tenant_isolation" ON public."report_schedules" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."report_execution_logs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."report_execution_logs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."report_execution_logs";
CREATE POLICY "durable_tenant_isolation" ON public."report_execution_logs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."analytics_dashboards" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."analytics_dashboards" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."analytics_dashboards";
CREATE POLICY "durable_tenant_isolation" ON public."analytics_dashboards" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."reporting_projections" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."reporting_projections" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."reporting_projections";
CREATE POLICY "durable_tenant_isolation" ON public."reporting_projections" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."integration_instances" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."integration_instances" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."integration_instances";
CREATE POLICY "durable_tenant_isolation" ON public."integration_instances" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."developer_api_keys" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."developer_api_keys" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."developer_api_keys";
CREATE POLICY "durable_tenant_isolation" ON public."developer_api_keys" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."integration_credentials" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."integration_credentials" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."integration_credentials";
CREATE POLICY "durable_tenant_isolation" ON public."integration_credentials" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."integration_entity_mappings" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."integration_entity_mappings" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."integration_entity_mappings";
CREATE POLICY "durable_tenant_isolation" ON public."integration_entity_mappings" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."integration_field_mappings" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."integration_field_mappings" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."integration_field_mappings";
CREATE POLICY "durable_tenant_isolation" ON public."integration_field_mappings" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."integration_sync_runs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."integration_sync_runs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."integration_sync_runs";
CREATE POLICY "durable_tenant_isolation" ON public."integration_sync_runs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."inbound_webhook_receipts" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."inbound_webhook_receipts" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."inbound_webhook_receipts";
CREATE POLICY "durable_tenant_isolation" ON public."inbound_webhook_receipts" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."integration_reconciliations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."integration_reconciliations" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."integration_reconciliations";
CREATE POLICY "durable_tenant_isolation" ON public."integration_reconciliations" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."integration_audit_logs" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."integration_audit_logs" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."integration_audit_logs";
CREATE POLICY "durable_tenant_isolation" ON public."integration_audit_logs" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
ALTER TABLE public."executive_sales_entries" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."executive_sales_entries" TO authenticated;
DROP POLICY IF EXISTS "durable_tenant_isolation" ON public."executive_sales_entries";
CREATE POLICY "durable_tenant_isolation" ON public."executive_sales_entries" AS PERMISSIVE FOR ALL TO authenticated
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true' OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
