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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_instances" ADD CONSTRAINT "integration_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_api_keys" ADD CONSTRAINT "developer_api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_entity_mappings" ADD CONSTRAINT "integration_entity_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_entity_mappings" ADD CONSTRAINT "integration_entity_mappings_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbound_webhook_receipts" ADD CONSTRAINT "inbound_webhook_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_reconciliations" ADD CONSTRAINT "integration_reconciliations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_reconciliations" ADD CONSTRAINT "integration_reconciliations_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_int_instance_tenant_status" ON "integration_instances" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_int_instance_tenant_connector" ON "integration_instances" USING btree ("tenant_id","connector_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_api_keys_hash" ON "developer_api_keys" USING btree ("key_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_tenant_active" ON "developer_api_keys" USING btree ("tenant_id","is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_int_cred_tenant_instance" ON "integration_credentials" USING btree ("tenant_id","integration_instance_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_entity_mapping_unique" ON "integration_entity_mappings" USING btree ("tenant_id","integration_instance_id","entity_type","external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_mapping_internal" ON "integration_entity_mappings" USING btree ("tenant_id","entity_type","internal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_field_mapping_tenant_instance" ON "integration_field_mappings" USING btree ("tenant_id","integration_instance_id","entity_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_runs_tenant_instance" ON "integration_sync_runs" USING btree ("tenant_id","integration_instance_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_inbound_wh_dedup" ON "inbound_webhook_receipts" USING btree ("tenant_id","provider","provider_event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inbound_wh_tenant_status" ON "inbound_webhook_receipts" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reconciliation_tenant_instance" ON "integration_reconciliations" USING btree ("tenant_id","integration_instance_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_int_audit_tenant_time" ON "integration_audit_logs" USING btree ("tenant_id","created_at");
