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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"query" jsonb NOT NULL,
	"sharing_scope" text DEFAULT 'PRIVATE' NOT NULL,
	"allowed_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"saved_report_id" text NOT NULL,
	"schedule_name" text NOT NULL,
	"cron_expression" text NOT NULL,
	"export_format" text DEFAULT 'CSV' NOT NULL,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_run_status" text,
	"next_run_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dashboard_family" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"widgets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reporting_projections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"projection_key" text NOT NULL,
	"period_date" text NOT NULL,
	"dimension_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_event_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_saved_report_id_saved_reports_id_fk" FOREIGN KEY ("saved_report_id") REFERENCES "public"."saved_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_execution_logs" ADD CONSTRAINT "report_execution_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_dashboards" ADD CONSTRAINT "analytics_dashboards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reporting_projections" ADD CONSTRAINT "reporting_projections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
