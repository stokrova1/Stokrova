-- Migration 0017: Executive sales pipeline
-- 1. Creates defined-but-never-migrated compliance tables.
-- 2. Adds historical cost to order lines so margins come from real data.
-- 3. Adds imported sales entries with idempotent (tenant, reference) key.
-- All tables follow the tenant-isolation RLS pattern from 0013-0015.

CREATE TABLE IF NOT EXISTS "gdpr_erasure_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gdpr_tenant_subject" ON "gdpr_erasure_requests" ("tenant_id","subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gdpr_tenant_status" ON "gdpr_erasure_requests" ("tenant_id","status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "standard" text NOT NULL,
  "actor_id" text NOT NULL,
  "event_type" text NOT NULL,
  "target_resource" text NOT NULL,
  "target_id" text NOT NULL,
  "verification_hash" text NOT NULL,
  "details_json" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_compliance_tenant_standard" ON "compliance_audit_logs" ("tenant_id","standard");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_compliance_tenant_created" ON "compliance_audit_logs" ("tenant_id","created_at");
--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "cogs_minor" bigint;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "executive_sales_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "reference" text NOT NULL,
  "sale_date" date NOT NULL,
  "net_sales_minor" bigint NOT NULL,
  "cogs_minor" bigint,
  "currency_code" text DEFAULT 'NGN' NOT NULL,
  "source" text DEFAULT 'SPREADSHEET' NOT NULL,
  "source_file_key" text,
  "imported_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "exec_sales_amount_bounds" CHECK (abs("net_sales_minor") <= 1000000000000 AND ("cogs_minor" IS NULL OR abs("cogs_minor") <= 1000000000000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_exec_sales_tenant_reference" ON "executive_sales_entries" ("tenant_id","reference");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exec_sales_tenant_date" ON "executive_sales_entries" ("tenant_id","sale_date");
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gdpr_erasure_requests','compliance_audit_logs','executive_sales_entries'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_isolation', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO authenticated, anon, public
      USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
             OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
      WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
             OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))$p$, t || '_tenant_isolation', t);
  END LOOP;
END $$;
