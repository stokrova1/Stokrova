CREATE TABLE "consolidation_groups" (
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
--> statement-breakpoint
CREATE TABLE "consolidation_group_members" (
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
--> statement-breakpoint
CREATE TABLE "group_chart_of_accounts" (
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
--> statement-breakpoint
CREATE TABLE "entity_account_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"group_id" text NOT NULL,
	"company_id" text NOT NULL,
	"source_account_code" text NOT NULL,
	"group_account_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidation_runs" (
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
--> statement-breakpoint
CREATE TABLE "consolidation_run_entities" (
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
--> statement-breakpoint
CREATE TABLE "consolidation_adjustments" (
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
--> statement-breakpoint
CREATE TABLE "consolidation_adjustment_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"adjustment_id" text NOT NULL,
	"company_id" text,
	"group_account_code" text NOT NULL,
	"entry_type" text NOT NULL,
	"amount_minor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intercompany_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"primary_company_id" text NOT NULL,
	"counterparty_company_id" text NOT NULL,
	"relationship_type" text DEFAULT 'SUBSIDIARY' NOT NULL,
	"settlement_currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intercompany_transactions" (
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
--> statement-breakpoint
CREATE TABLE "intercompany_matches" (
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
--> statement-breakpoint
CREATE TABLE "elimination_rules" (
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
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
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
--> statement-breakpoint
CREATE TABLE "bank_connections" (
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
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
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
--> statement-breakpoint
CREATE TABLE "cash_transfers" (
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
--> statement-breakpoint
CREATE TABLE "cash_forecasts" (
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
--> statement-breakpoint
CREATE TABLE "tax_registrations" (
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
--> statement-breakpoint
CREATE TABLE "tax_jurisdiction_configs" (
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
--> statement-breakpoint
CREATE TABLE "tax_filing_periods" (
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
--> statement-breakpoint
CREATE TABLE "tax_returns" (
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
--> statement-breakpoint
CREATE TABLE "tax_filing_submissions" (
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
--> statement-breakpoint
CREATE TABLE "search_index_entries" (
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
--> statement-breakpoint
CREATE TABLE "audit_chain_blocks" (
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
--> statement-breakpoint
CREATE TABLE "data_export_jobs" (
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
--> statement-breakpoint
CREATE TABLE "custom_report_definitions" (
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
--> statement-breakpoint
CREATE TABLE "hardware_devices" (
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
--> statement-breakpoint
CREATE TABLE "hardware_profiles" (
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
--> statement-breakpoint
CREATE TABLE "hardware_print_jobs" (
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
--> statement-breakpoint
ALTER TABLE "consolidation_groups" ADD CONSTRAINT "consolidation_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_group_members" ADD CONSTRAINT "consolidation_group_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_group_members" ADD CONSTRAINT "consolidation_group_members_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_group_members" ADD CONSTRAINT "consolidation_group_members_book_id_accounting_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."accounting_books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_chart_of_accounts" ADD CONSTRAINT "group_chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_chart_of_accounts" ADD CONSTRAINT "group_chart_of_accounts_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_account_mappings" ADD CONSTRAINT "entity_account_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_account_mappings" ADD CONSTRAINT "entity_account_mappings_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_runs" ADD CONSTRAINT "consolidation_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_runs" ADD CONSTRAINT "consolidation_runs_group_id_consolidation_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."consolidation_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_run_entities" ADD CONSTRAINT "consolidation_run_entities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_run_entities" ADD CONSTRAINT "consolidation_run_entities_run_id_consolidation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."consolidation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_adjustments" ADD CONSTRAINT "consolidation_adjustments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_adjustments" ADD CONSTRAINT "consolidation_adjustments_run_id_consolidation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."consolidation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_adjustment_lines" ADD CONSTRAINT "consolidation_adjustment_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_adjustment_lines" ADD CONSTRAINT "consolidation_adjustment_lines_adjustment_id_consolidation_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."consolidation_adjustments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_relationships" ADD CONSTRAINT "intercompany_relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_transactions" ADD CONSTRAINT "intercompany_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_matches" ADD CONSTRAINT "intercompany_matches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_matches" ADD CONSTRAINT "intercompany_matches_from_transaction_id_intercompany_transactions_id_fk" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."intercompany_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intercompany_matches" ADD CONSTRAINT "intercompany_matches_to_transaction_id_intercompany_transactions_id_fk" FOREIGN KEY ("to_transaction_id") REFERENCES "public"."intercompany_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elimination_rules" ADD CONSTRAINT "elimination_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matched_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("matched_journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_source_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("source_bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_destination_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("destination_bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_forecasts" ADD CONSTRAINT "cash_forecasts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_registrations" ADD CONSTRAINT "tax_registrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_jurisdiction_configs" ADD CONSTRAINT "tax_jurisdiction_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_periods" ADD CONSTRAINT "tax_filing_periods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_periods" ADD CONSTRAINT "tax_filing_periods_registration_id_tax_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."tax_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_filing_period_id_tax_filing_periods_id_fk" FOREIGN KEY ("filing_period_id") REFERENCES "public"."tax_filing_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_submissions" ADD CONSTRAINT "tax_filing_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_submissions" ADD CONSTRAINT "tax_filing_submissions_tax_return_id_tax_returns_id_fk" FOREIGN KEY ("tax_return_id") REFERENCES "public"."tax_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_index_entries" ADD CONSTRAINT "search_index_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_chain_blocks" ADD CONSTRAINT "audit_chain_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_report_definitions" ADD CONSTRAINT "custom_report_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_devices" ADD CONSTRAINT "hardware_devices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_devices" ADD CONSTRAINT "hardware_devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_profiles" ADD CONSTRAINT "hardware_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_print_jobs" ADD CONSTRAINT "hardware_print_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_print_jobs" ADD CONSTRAINT "hardware_print_jobs_device_id_hardware_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."hardware_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_consol_groups_tenant_code" ON "consolidation_groups" USING btree ("tenant_id","group_code");--> statement-breakpoint
CREATE INDEX "idx_consol_groups_tenant" ON "consolidation_groups" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_consol_members_tenant_group_company" ON "consolidation_group_members" USING btree ("tenant_id","group_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_consol_members_tenant_group" ON "consolidation_group_members" USING btree ("tenant_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_group_coa_tenant_group_code" ON "group_chart_of_accounts" USING btree ("tenant_id","group_id","account_code");--> statement-breakpoint
CREATE INDEX "idx_group_coa_tenant_group" ON "group_chart_of_accounts" USING btree ("tenant_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_entity_account_map_unique" ON "entity_account_mappings" USING btree ("tenant_id","group_id","company_id","source_account_code");--> statement-breakpoint
CREATE INDEX "idx_entity_account_map_group" ON "entity_account_mappings" USING btree ("tenant_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_consol_runs_operation_id" ON "consolidation_runs" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE INDEX "idx_consol_runs_group_period" ON "consolidation_runs" USING btree ("tenant_id","group_id","period_id");--> statement-breakpoint
CREATE INDEX "idx_consol_runs_status" ON "consolidation_runs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_consol_run_entities_run" ON "consolidation_run_entities" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE INDEX "idx_consol_adj_tenant_run" ON "consolidation_adjustments" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE INDEX "idx_consol_adj_lines_adj" ON "consolidation_adjustment_lines" USING btree ("tenant_id","adjustment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_interco_rel_unique" ON "intercompany_relationships" USING btree ("tenant_id","primary_company_id","counterparty_company_id");--> statement-breakpoint
CREATE INDEX "idx_interco_rel_tenant" ON "intercompany_relationships" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_interco_tx_ref" ON "intercompany_transactions" USING btree ("tenant_id","transaction_reference");--> statement-breakpoint
CREATE INDEX "idx_interco_tx_from_to" ON "intercompany_transactions" USING btree ("tenant_id","from_company_id","to_company_id");--> statement-breakpoint
CREATE INDEX "idx_interco_tx_status" ON "intercompany_transactions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_interco_matches_from" ON "intercompany_matches" USING btree ("tenant_id","from_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_interco_matches_status" ON "intercompany_matches" USING btree ("tenant_id","match_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_elim_rules_tenant_code" ON "elimination_rules" USING btree ("tenant_id","rule_code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bank_acc_tenant_company_acc" ON "bank_accounts" USING btree ("tenant_id","company_id","account_number_masked");--> statement-breakpoint
CREATE INDEX "idx_bank_acc_tenant_company" ON "bank_accounts" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bank_conn_tenant_company_provider" ON "bank_connections" USING btree ("tenant_id","company_id","provider_connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bank_tx_tenant_acc_ext" ON "bank_transactions" USING btree ("tenant_id","bank_account_id","external_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_bank_tx_tenant_acc_status" ON "bank_transactions" USING btree ("tenant_id","bank_account_id","matching_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cash_transfers_operation_id" ON "cash_transfers" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cash_transfers_tenant_num" ON "cash_transfers" USING btree ("tenant_id","transfer_number");--> statement-breakpoint
CREATE INDEX "idx_cash_transfers_tenant_status" ON "cash_transfers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_cash_forecasts_tenant_company_date" ON "cash_forecasts" USING btree ("tenant_id","company_id","forecast_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_reg_tenant_company_jur_type" ON "tax_registrations" USING btree ("tenant_id","company_id","jurisdiction_code","tax_type");--> statement-breakpoint
CREATE INDEX "idx_tax_reg_tenant_company" ON "tax_registrations" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_jur_config_tenant_jur_ver" ON "tax_jurisdiction_configs" USING btree ("tenant_id","jurisdiction_code","version");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_period_tenant_reg_name" ON "tax_filing_periods" USING btree ("tenant_id","registration_id","period_name");--> statement-breakpoint
CREATE INDEX "idx_tax_period_tenant_status" ON "tax_filing_periods" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_returns_tenant_period" ON "tax_returns" USING btree ("tenant_id","filing_period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_returns_operation_id" ON "tax_returns" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE INDEX "idx_tax_returns_tenant_status" ON "tax_returns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_tax_sub_tenant_return" ON "tax_filing_submissions" USING btree ("tenant_id","tax_return_id");--> statement-breakpoint
CREATE INDEX "idx_tax_sub_ref" ON "tax_filing_submissions" USING btree ("tenant_id","submission_reference");--> statement-breakpoint
CREATE INDEX "idx_search_tenant_entity" ON "search_index_entries" USING btree ("tenant_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_search_tenant_barcode" ON "search_index_entries" USING btree ("tenant_id","barcode");--> statement-breakpoint
CREATE INDEX "idx_search_tenant_sku" ON "search_index_entries" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "idx_search_tenant_ref" ON "search_index_entries" USING btree ("tenant_id","reference_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_audit_chain_tenant_index" ON "audit_chain_blocks" USING btree ("tenant_id","block_index");--> statement-breakpoint
CREATE INDEX "idx_audit_chain_tenant_created" ON "audit_chain_blocks" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_export_tenant_status" ON "data_export_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_export_download_token" ON "data_export_jobs" USING btree ("download_token");--> statement-breakpoint
CREATE INDEX "idx_report_def_tenant" ON "custom_report_definitions" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_hardware_devices_tenant_type" ON "hardware_devices" USING btree ("tenant_id","device_type");--> statement-breakpoint
CREATE INDEX "idx_hardware_devices_tenant_status" ON "hardware_devices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_hardware_devices_tenant_branch" ON "hardware_devices" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "idx_hardware_profiles_tenant" ON "hardware_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hardware_print_jobs_tenant_op" ON "hardware_print_jobs" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE INDEX "idx_hardware_print_jobs_tenant_status" ON "hardware_print_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_hardware_print_jobs_device" ON "hardware_print_jobs" USING btree ("device_id");