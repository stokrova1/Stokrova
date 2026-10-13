CREATE TABLE "crm_account_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"parent_customer_id" text NOT NULL,
	"child_customer_id" text NOT NULL,
	"relationship_type" text DEFAULT 'PARENT_SUBSIDIARY' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
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
--> statement-breakpoint
CREATE TABLE "crm_customer_merges" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"surviving_customer_id" text NOT NULL,
	"merged_customer_id" text NOT NULL,
	"merged_by" text NOT NULL,
	"reason" text NOT NULL,
	"audit_evidence_json" jsonb,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
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
--> statement-breakpoint
CREATE TABLE "crm_pipelines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_pipeline_stages" (
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
--> statement-breakpoint
CREATE TABLE "crm_opportunities" (
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
--> statement-breakpoint
CREATE TABLE "crm_opportunity_stage_history" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"from_stage_id" text,
	"to_stage_id" text NOT NULL,
	"changed_by" text NOT NULL,
	"notes" text,
	"transitioned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
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
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
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
--> statement-breakpoint
CREATE TABLE "crm_segments" (
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
--> statement-breakpoint
CREATE TABLE "crm_segment_members" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"segment_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_consent_records" (
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
--> statement-breakpoint
CREATE TABLE "crm_suppression_list" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"channel" text NOT NULL,
	"identifier" text NOT NULL,
	"reason" text NOT NULL,
	"suppressed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_campaigns" (
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
--> statement-breakpoint
CREATE TABLE "crm_messages" (
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
--> statement-breakpoint
CREATE TABLE "crm_automations" (
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
--> statement-breakpoint
CREATE TABLE "crm_automation_executions" (
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
--> statement-breakpoint
ALTER TABLE "crm_account_relationships" ADD CONSTRAINT "crm_account_relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_account_relationships" ADD CONSTRAINT "crm_account_relationships_parent_customer_id_customers_id_fk" FOREIGN KEY ("parent_customer_id") REFERENCES "customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_account_relationships" ADD CONSTRAINT "crm_account_relationships_child_customer_id_customers_id_fk" FOREIGN KEY ("child_customer_id") REFERENCES "customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_customer_merges" ADD CONSTRAINT "crm_customer_merges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_customer_merges" ADD CONSTRAINT "crm_customer_merges_surviving_customer_id_customers_id_fk" FOREIGN KEY ("surviving_customer_id") REFERENCES "customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_customer_merges" ADD CONSTRAINT "crm_customer_merges_merged_customer_id_customers_id_fk" FOREIGN KEY ("merged_customer_id") REFERENCES "customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_customer_id_customers_id_fk" FOREIGN KEY ("converted_customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_current_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("current_stage_id") REFERENCES "crm_pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_from_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "crm_pipeline_stages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_opportunity_stage_history" ADD CONSTRAINT "crm_opportunity_stage_history_to_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "crm_pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_segments" ADD CONSTRAINT "crm_segments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_segment_members" ADD CONSTRAINT "crm_segment_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_segment_members" ADD CONSTRAINT "crm_segment_members_segment_id_crm_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "crm_segments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_segment_members" ADD CONSTRAINT "crm_segment_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_consent_records" ADD CONSTRAINT "crm_consent_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_consent_records" ADD CONSTRAINT "crm_consent_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_suppression_list" ADD CONSTRAINT "crm_suppression_list_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_segment_id_crm_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "crm_segments"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_campaign_id_crm_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "crm_campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_automations" ADD CONSTRAINT "crm_automations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_automation_id_crm_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "crm_automations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_acct_rel_unique" ON "crm_account_relationships" USING btree ("tenant_id","parent_customer_id","child_customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_acct_rel_child" ON "crm_account_relationships" USING btree ("tenant_id","child_customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_contacts_customer" ON "crm_contacts" USING btree ("tenant_id","customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_contacts_email" ON "crm_contacts" USING btree ("tenant_id","email");
--> statement-breakpoint
CREATE INDEX "idx_crm_merges_surviving" ON "crm_customer_merges" USING btree ("tenant_id","surviving_customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_merges_merged" ON "crm_customer_merges" USING btree ("tenant_id","merged_customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_leads_code" ON "crm_leads" USING btree ("tenant_id","lead_code");
--> statement-breakpoint
CREATE INDEX "idx_crm_leads_email" ON "crm_leads" USING btree ("tenant_id","email");
--> statement-breakpoint
CREATE INDEX "idx_crm_leads_status" ON "crm_leads" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "idx_crm_leads_external" ON "crm_leads" USING btree ("tenant_id","external_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_pipelines_code" ON "crm_pipelines" USING btree ("tenant_id","code");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_stages_code" ON "crm_pipeline_stages" USING btree ("tenant_id","pipeline_id","stage_code");
--> statement-breakpoint
CREATE INDEX "idx_crm_stages_order" ON "crm_pipeline_stages" USING btree ("pipeline_id","order_index");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_opps_code" ON "crm_opportunities" USING btree ("tenant_id","opportunity_code");
--> statement-breakpoint
CREATE INDEX "idx_crm_opps_customer" ON "crm_opportunities" USING btree ("tenant_id","customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_opps_stage" ON "crm_opportunities" USING btree ("tenant_id","pipeline_id","current_stage_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_opp_hist" ON "crm_opportunity_stage_history" USING btree ("tenant_id","opportunity_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_activities_cust" ON "crm_activities" USING btree ("tenant_id","customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_activities_opp" ON "crm_activities" USING btree ("tenant_id","opportunity_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_activities_lead" ON "crm_activities" USING btree ("tenant_id","lead_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_activities_time" ON "crm_activities" USING btree ("tenant_id","performed_at");
--> statement-breakpoint
CREATE INDEX "idx_crm_tasks_cust" ON "crm_tasks" USING btree ("tenant_id","customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_tasks_due" ON "crm_tasks" USING btree ("tenant_id","due_date","status");
--> statement-breakpoint
CREATE INDEX "idx_crm_tasks_assigned" ON "crm_tasks" USING btree ("tenant_id","assigned_to");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_segments_code" ON "crm_segments" USING btree ("tenant_id","code");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_seg_members_unique" ON "crm_segment_members" USING btree ("tenant_id","segment_id","customer_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_consent_lookup" ON "crm_consent_records" USING btree ("tenant_id","customer_id","purpose","channel");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_suppress_unique" ON "crm_suppression_list" USING btree ("tenant_id","channel","identifier");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_camp_code" ON "crm_campaigns" USING btree ("tenant_id","campaign_code");
--> statement-breakpoint
CREATE INDEX "idx_crm_camp_status" ON "crm_campaigns" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_msg_op" ON "crm_messages" USING btree ("tenant_id","operation_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_msg_camp_stat" ON "crm_messages" USING btree ("tenant_id","campaign_id","status");
--> statement-breakpoint
CREATE INDEX "idx_crm_msg_cust" ON "crm_messages" USING btree ("tenant_id","customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_auto_code" ON "crm_automations" USING btree ("tenant_id","automation_code");
--> statement-breakpoint
CREATE INDEX "idx_crm_auto_trig" ON "crm_automations" USING btree ("tenant_id","trigger_type","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crm_exec_unique" ON "crm_automation_executions" USING btree ("tenant_id","automation_id","trigger_event_id");
--> statement-breakpoint
CREATE INDEX "idx_crm_exec_cust" ON "crm_automation_executions" USING btree ("tenant_id","customer_id");
