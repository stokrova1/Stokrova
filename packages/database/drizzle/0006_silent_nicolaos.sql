CREATE TABLE "accounting_books" (
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
--> statement-breakpoint
CREATE TABLE "fiscal_years" (
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
--> statement-breakpoint
CREATE TABLE "accounting_periods" (
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
--> statement-breakpoint
CREATE TABLE "accounting_posting_rules" (
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
--> statement-breakpoint
CREATE TABLE "accounting_source_event_records" (
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
--> statement-breakpoint
CREATE TABLE "reconciliation_records" (
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
--> statement-breakpoint
CREATE TABLE "holding_groups" (
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
--> statement-breakpoint
CREATE TABLE "inter_company_transfers" (
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
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"target_url" text NOT NULL,
	"secret_token" text NOT NULL,
	"event_types" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"retry_limit" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery_attempts" (
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_render_logs" (
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
--> statement-breakpoint
CREATE TABLE "notifications" (
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
--> statement-breakpoint
CREATE TABLE "analytics_abc_snapshots" (
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
--> statement-breakpoint
CREATE TABLE "analytics_demand_forecasts" (
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
--> statement-breakpoint
CREATE TABLE "analytics_dead_stock_alerts" (
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
--> statement-breakpoint
ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tax_groups" DROP CONSTRAINT "tax_groups_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "book_id" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "book_id" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "period_id" text;--> statement-breakpoint
ALTER TABLE "accounting_books" ADD CONSTRAINT "accounting_books_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_posting_rules" ADD CONSTRAINT "accounting_posting_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_posting_rules" ADD CONSTRAINT "accounting_posting_rules_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_source_event_records" ADD CONSTRAINT "accounting_source_event_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_source_event_records" ADD CONSTRAINT "accounting_source_event_records_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holding_groups" ADD CONSTRAINT "holding_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inter_company_transfers" ADD CONSTRAINT "inter_company_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_render_logs" ADD CONSTRAINT "document_render_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_abc_snapshots" ADD CONSTRAINT "analytics_abc_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_demand_forecasts" ADD CONSTRAINT "analytics_demand_forecasts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_dead_stock_alerts" ADD CONSTRAINT "analytics_dead_stock_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_books_tenant_company_code" ON "accounting_books" USING btree ("tenant_id","company_id","code");--> statement-breakpoint
CREATE INDEX "idx_books_tenant_company" ON "accounting_books" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fy_tenant_book_year" ON "fiscal_years" USING btree ("tenant_id","book_id","year_code");--> statement-breakpoint
CREATE INDEX "idx_fy_tenant_company" ON "fiscal_years" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_period_tenant_book_fy_num" ON "accounting_periods" USING btree ("tenant_id","book_id","fiscal_year_id","period_number");--> statement-breakpoint
CREATE INDEX "idx_period_tenant_status" ON "accounting_periods" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_period_dates" ON "accounting_periods" USING btree ("tenant_id","start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_posting_rules_tenant_company_event_code" ON "accounting_posting_rules" USING btree ("tenant_id","company_id","event_type","rule_code");--> statement-breakpoint
CREATE INDEX "idx_posting_rules_tenant_event" ON "accounting_posting_rules" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounting_source_events_idempotency" ON "accounting_source_event_records" USING btree ("tenant_id","company_id","source_module","operation_id");--> statement-breakpoint
CREATE INDEX "idx_accounting_source_events_status" ON "accounting_source_event_records" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_accounting_source_events_source_id" ON "accounting_source_event_records" USING btree ("tenant_id","source_event_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_tenant_type" ON "reconciliation_records" USING btree ("tenant_id","company_id","reconciliation_type");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_as_of" ON "reconciliation_records" USING btree ("tenant_id","as_of_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_holding_tenant_code" ON "holding_groups" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_holding_tenant_parent" ON "holding_groups" USING btree ("tenant_id","parent_company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ict_tenant_number" ON "inter_company_transfers" USING btree ("tenant_id","transfer_number");--> statement-breakpoint
CREATE INDEX "idx_ict_tenant_status" ON "inter_company_transfers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_ict_tenant_source_comp" ON "inter_company_transfers" USING btree ("tenant_id","source_company_id");--> statement-breakpoint
CREATE INDEX "idx_ict_tenant_dest_comp" ON "inter_company_transfers" USING btree ("tenant_id","destination_company_id");--> statement-breakpoint
CREATE INDEX "idx_webhooks_tenant_active" ON "webhook_subscriptions" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_wh_delivery_sub" ON "webhook_delivery_attempts" USING btree ("tenant_id","subscription_id");--> statement-breakpoint
CREATE INDEX "idx_wh_delivery_status" ON "webhook_delivery_attempts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_doc_render_entity" ON "document_render_logs" USING btree ("tenant_id","document_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("tenant_id","user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_abc_snapshot_tenant_company" ON "analytics_abc_snapshots" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_abc_snapshot_created_at" ON "analytics_abc_snapshots" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_forecast_tenant_variant" ON "analytics_demand_forecasts" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_forecast_created_at" ON "analytics_demand_forecasts" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_dead_stock_tenant_wh" ON "analytics_dead_stock_alerts" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_dead_stock_aging" ON "analytics_dead_stock_alerts" USING btree ("tenant_id","aging_tier");--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_groups" ADD CONSTRAINT "tax_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_coa_tenant_book" ON "chart_of_accounts" USING btree ("tenant_id","book_id");--> statement-breakpoint
CREATE INDEX "idx_je_tenant_book_period" ON "journal_entries" USING btree ("tenant_id","book_id","period_id");