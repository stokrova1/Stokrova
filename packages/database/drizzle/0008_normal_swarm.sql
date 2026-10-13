CREATE TABLE "webhook_dead_letters" (
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
--> statement-breakpoint
CREATE TABLE "fiscal_entities" (
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
--> statement-breakpoint
CREATE TABLE "certified_e_invoices" (
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
--> statement-breakpoint
CREATE TABLE "fiscal_receipt_chains" (
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
--> statement-breakpoint
CREATE TABLE "b2b_organizations" (
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
--> statement-breakpoint
CREATE TABLE "b2b_credit_accounts" (
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
--> statement-breakpoint
CREATE TABLE "b2b_contract_pricing" (
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
--> statement-breakpoint
CREATE TABLE "b2b_requisitions" (
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
--> statement-breakpoint
CREATE TABLE "b2b_punchout_sessions" (
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
--> statement-breakpoint
CREATE TABLE "loyalty_programs" (
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
--> statement-breakpoint
CREATE TABLE "loyalty_tiers" (
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
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
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
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
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
--> statement-breakpoint
CREATE TABLE "gift_card_accounts" (
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
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
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
--> statement-breakpoint
CREATE TABLE "edi_partners" (
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
--> statement-breakpoint
CREATE TABLE "edi_message_logs" (
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
--> statement-breakpoint
CREATE TABLE "edi_interchange_controls" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"direction" text NOT NULL,
	"control_number" text NOT NULL,
	"transaction_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_contracts" (
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
--> statement-breakpoint
CREATE TABLE "customer_contract_items" (
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
--> statement-breakpoint
CREATE TABLE "promotion_campaigns" (
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
--> statement-breakpoint
CREATE TABLE "promotion_redemptions" (
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
--> statement-breakpoint
CREATE TABLE "pricing_margin_policies" (
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
--> statement-breakpoint
CREATE TABLE "pricing_override_requests" (
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
--> statement-breakpoint
CREATE TABLE "commercial_price_snapshots" (
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
--> statement-breakpoint
CREATE TABLE "rebate_agreements" (
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
--> statement-breakpoint
CREATE TABLE "rebate_tiers" (
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
--> statement-breakpoint
CREATE TABLE "rebate_accruals" (
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
--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD COLUMN "failure_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD COLUMN "circuit_breaker_tripped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webhook_delivery_attempts" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "webhook_dead_letters" ADD CONSTRAINT "webhook_dead_letters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_dead_letters" ADD CONSTRAINT "webhook_dead_letters_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_entities" ADD CONSTRAINT "fiscal_entities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certified_e_invoices" ADD CONSTRAINT "certified_e_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certified_e_invoices" ADD CONSTRAINT "certified_e_invoices_entity_id_fiscal_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."fiscal_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_receipt_chains" ADD CONSTRAINT "fiscal_receipt_chains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_organizations" ADD CONSTRAINT "b2b_organizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_credit_accounts" ADD CONSTRAINT "b2b_credit_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_credit_accounts" ADD CONSTRAINT "b2b_credit_accounts_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_contract_pricing" ADD CONSTRAINT "b2b_contract_pricing_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_contract_pricing" ADD CONSTRAINT "b2b_contract_pricing_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_requisitions" ADD CONSTRAINT "b2b_requisitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_requisitions" ADD CONSTRAINT "b2b_requisitions_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_punchout_sessions" ADD CONSTRAINT "b2b_punchout_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_punchout_sessions" ADD CONSTRAINT "b2b_punchout_sessions_organization_id_b2b_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."b2b_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_accounts" ADD CONSTRAINT "gift_card_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_card_accounts_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_card_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edi_partners" ADD CONSTRAINT "edi_partners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edi_message_logs" ADD CONSTRAINT "edi_message_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edi_message_logs" ADD CONSTRAINT "edi_message_logs_partner_id_edi_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."edi_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edi_interchange_controls" ADD CONSTRAINT "edi_interchange_controls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edi_interchange_controls" ADD CONSTRAINT "edi_interchange_controls_partner_id_edi_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."edi_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contract_items" ADD CONSTRAINT "customer_contract_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contract_items" ADD CONSTRAINT "customer_contract_items_contract_id_customer_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."customer_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contract_items" ADD CONSTRAINT "customer_contract_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_campaign_id_promotion_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."promotion_campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_margin_policies" ADD CONSTRAINT "pricing_margin_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_override_requests" ADD CONSTRAINT "pricing_override_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_override_requests" ADD CONSTRAINT "pricing_override_requests_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_price_snapshots" ADD CONSTRAINT "commercial_price_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebate_agreements" ADD CONSTRAINT "rebate_agreements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebate_tiers" ADD CONSTRAINT "rebate_tiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebate_tiers" ADD CONSTRAINT "rebate_tiers_agreement_id_rebate_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."rebate_agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebate_accruals" ADD CONSTRAINT "rebate_accruals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebate_accruals" ADD CONSTRAINT "rebate_accruals_agreement_id_rebate_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."rebate_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_wh_dead_letter_sub" ON "webhook_dead_letters" USING btree ("tenant_id","subscription_id");--> statement-breakpoint
CREATE INDEX "idx_wh_dead_letter_time" ON "webhook_dead_letters" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_fiscal_entities_tenant" ON "fiscal_entities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_fiscal_entities_vat" ON "fiscal_entities" USING btree ("tenant_id","vat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_e_invoices_tenant_num" ON "certified_e_invoices" USING btree ("tenant_id","invoice_number");--> statement-breakpoint
CREATE INDEX "idx_e_invoices_tenant_status" ON "certified_e_invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_e_invoices_entity" ON "certified_e_invoices" USING btree ("entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fiscal_chains_tenant_reg_seq" ON "fiscal_receipt_chains" USING btree ("tenant_id","register_id","sequence_number");--> statement-breakpoint
CREATE INDEX "idx_fiscal_chains_receipt" ON "fiscal_receipt_chains" USING btree ("tenant_id","receipt_number");--> statement-breakpoint
CREATE INDEX "idx_b2b_organizations_tenant" ON "b2b_organizations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_organizations_parent" ON "b2b_organizations" USING btree ("tenant_id","parent_org_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_organizations_tax" ON "b2b_organizations" USING btree ("tenant_id","tax_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_b2b_credit_accounts_tenant_org" ON "b2b_credit_accounts" USING btree ("tenant_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_credit_accounts_status" ON "b2b_credit_accounts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_b2b_contract_pricing_tenant_org_sku" ON "b2b_contract_pricing" USING btree ("tenant_id","organization_id","sku");--> statement-breakpoint
CREATE INDEX "idx_b2b_contract_pricing_tenant_sku" ON "b2b_contract_pricing" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_b2b_requisitions_tenant_num" ON "b2b_requisitions" USING btree ("tenant_id","requisition_number");--> statement-breakpoint
CREATE INDEX "idx_b2b_requisitions_org" ON "b2b_requisitions" USING btree ("tenant_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_requisitions_status" ON "b2b_requisitions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_b2b_punchout_sessions_tenant_cookie" ON "b2b_punchout_sessions" USING btree ("tenant_id","buyer_cookie");--> statement-breakpoint
CREATE INDEX "idx_b2b_punchout_sessions_tenant_org" ON "b2b_punchout_sessions" USING btree ("tenant_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_programs_tenant" ON "loyalty_programs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_tiers_tenant_prog" ON "loyalty_tiers" USING btree ("tenant_id","program_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_tiers_code" ON "loyalty_tiers" USING btree ("tenant_id","tier_code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_loyalty_accounts_tenant_cust" ON "loyalty_accounts" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_accounts_prog" ON "loyalty_accounts" USING btree ("tenant_id","program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_loyalty_tx_operation" ON "loyalty_transactions" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_tx_account" ON "loyalty_transactions" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_gift_cards_tenant_code" ON "gift_card_accounts" USING btree ("tenant_id","card_code");--> statement-breakpoint
CREATE INDEX "idx_gift_cards_tenant_status" ON "gift_card_accounts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_gift_card_tx_operation" ON "gift_card_transactions" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE INDEX "idx_gift_card_tx_card" ON "gift_card_transactions" USING btree ("tenant_id","gift_card_id");--> statement-breakpoint
CREATE INDEX "idx_edi_partners_tenant" ON "edi_partners" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_edi_partners_tenant_name" ON "edi_partners" USING btree ("tenant_id","partner_name");--> statement-breakpoint
CREATE INDEX "idx_edi_logs_tenant_partner" ON "edi_message_logs" USING btree ("tenant_id","partner_id");--> statement-breakpoint
CREATE INDEX "idx_edi_logs_control_num" ON "edi_message_logs" USING btree ("tenant_id","control_number");--> statement-breakpoint
CREATE INDEX "idx_edi_logs_status" ON "edi_message_logs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_edi_ctrl_dedup" ON "edi_interchange_controls" USING btree ("tenant_id","partner_id","control_number","direction");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cust_contracts_tenant_num" ON "customer_contracts" USING btree ("tenant_id","contract_number");--> statement-breakpoint
CREATE INDEX "idx_cust_contracts_cust" ON "customer_contracts" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cust_contract_items_unique" ON "customer_contract_items" USING btree ("tenant_id","contract_id","variant_id","min_quantity");--> statement-breakpoint
CREATE INDEX "idx_cust_contract_items_variant" ON "customer_contract_items" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_promo_campaigns_tenant_code" ON "promotion_campaigns" USING btree ("tenant_id","campaign_code");--> statement-breakpoint
CREATE INDEX "idx_promo_campaigns_coupon" ON "promotion_campaigns" USING btree ("tenant_id","coupon_code");--> statement-breakpoint
CREATE INDEX "idx_promo_campaigns_active" ON "promotion_campaigns" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_promo_redemptions_op" ON "promotion_redemptions" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE INDEX "idx_promo_redemptions_campaign" ON "promotion_redemptions" USING btree ("tenant_id","campaign_id");--> statement-breakpoint
CREATE INDEX "idx_promo_redemptions_order" ON "promotion_redemptions" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_margin_policies_tenant" ON "pricing_margin_policies" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_override_op" ON "pricing_override_requests" USING btree ("tenant_id","operation_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_override_status" ON "pricing_override_requests" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_price_snapshots_order" ON "commercial_price_snapshots" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_price_snapshots_variant" ON "commercial_price_snapshots" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rebate_agreements_num" ON "rebate_agreements" USING btree ("tenant_id","agreement_number");--> statement-breakpoint
CREATE INDEX "idx_rebate_agreements_party" ON "rebate_agreements" USING btree ("tenant_id","counterparty_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rebate_tiers_unique" ON "rebate_tiers" USING btree ("tenant_id","agreement_id","tier_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rebate_accruals_period" ON "rebate_accruals" USING btree ("tenant_id","agreement_id","period_identifier");--> statement-breakpoint
CREATE INDEX "idx_rebate_accruals_party" ON "rebate_accruals" USING btree ("tenant_id","counterparty_id");--> statement-breakpoint
CREATE INDEX "idx_rebate_accruals_status" ON "rebate_accruals" USING btree ("tenant_id","status");