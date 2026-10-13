CREATE TABLE "multi_tender_checkouts" (
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
--> statement-breakpoint
CREATE TABLE "checkout_tenders" (
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
--> statement-breakpoint
CREATE TABLE "product_templates" (
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
--> statement-breakpoint
CREATE TABLE "attribute_dimensions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attribute_values" (
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
--> statement-breakpoint
CREATE TABLE "product_variants" (
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
--> statement-breakpoint
CREATE TABLE "warehouses" (
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
--> statement-breakpoint
CREATE TABLE "storage_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"parent_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"materialized_path" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"mix_policy" text DEFAULT 'MULTI_SKU' NOT NULL,
	"max_weight_kg" double precision,
	"max_volume_cm3" double precision,
	"is_pickable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_batches" (
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
--> statement-breakpoint
CREATE TABLE "stock_serials" (
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
--> statement-breakpoint
CREATE TABLE "stock_ledger_entries" (
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
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
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
--> statement-breakpoint
CREATE TABLE "stock_balance_snapshots" (
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
--> statement-breakpoint
CREATE TABLE "price_lists" (
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
--> statement-breakpoint
CREATE TABLE "price_list_rules" (
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
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rate_bp" integer NOT NULL,
	"computation_type" text DEFAULT 'PERCENTAGE' NOT NULL,
	"inclusion_type" text DEFAULT 'EXCLUSIVE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_promotions" (
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
--> statement-breakpoint
CREATE TABLE "pos_registers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"branch_id" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "pos_sessions" (
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
--> statement-breakpoint
CREATE TABLE "pos_cash_movements" (
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
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_number" text NOT NULL,
	"channel_type" text NOT NULL,
	"branch_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"customer_id" text,
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
--> statement-breakpoint
CREATE TABLE "sales_order_lines" (
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
	"line_total_minor" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_sync_batches" (
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
--> statement-breakpoint
CREATE TABLE "pos_sync_transactions" (
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
--> statement-breakpoint
CREATE TABLE "suppliers" (
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
--> statement-breakpoint
CREATE TABLE "supplier_product_mappings" (
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
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
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
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
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
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
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
--> statement-breakpoint
CREATE TABLE "goods_receipt_lines" (
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
--> statement-breakpoint
CREATE TABLE "landed_cost_vouchers" (
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
--> statement-breakpoint
CREATE TABLE "landed_cost_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"voucher_id" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount_minor" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landed_cost_line_allocations" (
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
--> statement-breakpoint
CREATE TABLE "purchase_invoices" (
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
	"price_variance_minor" bigint DEFAULT 0 NOT NULL,
	"quantity_variance" integer DEFAULT 0 NOT NULL,
	"discrepancy_notes" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoice_lines" (
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
--> statement-breakpoint
ALTER TABLE "multi_tender_checkouts" ADD CONSTRAINT "multi_tender_checkouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_tenders" ADD CONSTRAINT "checkout_tenders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_tenders" ADD CONSTRAINT "checkout_tenders_checkout_id_multi_tender_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."multi_tender_checkouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_base_uom_id_units_of_measure_id_fk" FOREIGN KEY ("base_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_dimensions" ADD CONSTRAINT "attribute_dimensions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_dimension_id_attribute_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."attribute_dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_template_id_product_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."product_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_serials" ADD CONSTRAINT "stock_serials_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_serial_id_stock_serials_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."stock_serials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_source_warehouse_id_warehouses_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_source_location_id_storage_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_serial_id_stock_serials_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."stock_serials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_snapshots" ADD CONSTRAINT "stock_balance_snapshots_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_pricelist_id_price_lists_id_fk" FOREIGN KEY ("pricelist_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_promotions" ADD CONSTRAINT "discount_promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_default_price_list_id_price_lists_id_fk" FOREIGN KEY ("default_price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_register_id_pos_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."pos_registers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_cashier_user_id_users_id_fk" FOREIGN KEY ("cashier_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_supervisor_user_id_users_id_fk" FOREIGN KEY ("supervisor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_session_id_pos_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_authorized_by_user_id_users_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_pos_session_id_pos_sessions_id_fk" FOREIGN KEY ("pos_session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_pos_register_id_pos_registers_id_fk" FOREIGN KEY ("pos_register_id") REFERENCES "public"."pos_registers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sync_batches" ADD CONSTRAINT "pos_sync_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sync_batches" ADD CONSTRAINT "pos_sync_batches_pos_register_id_pos_registers_id_fk" FOREIGN KEY ("pos_register_id") REFERENCES "public"."pos_registers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sync_batches" ADD CONSTRAINT "pos_sync_batches_pos_session_id_pos_sessions_id_fk" FOREIGN KEY ("pos_session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_batch_id_pos_sync_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."pos_sync_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_pos_session_id_pos_sessions_id_fk" FOREIGN KEY ("pos_session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sync_transactions" ADD CONSTRAINT "pos_sync_transactions_server_order_id_sales_orders_id_fk" FOREIGN KEY ("server_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_vouchers" ADD CONSTRAINT "landed_cost_vouchers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_charges" ADD CONSTRAINT "landed_cost_charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_charges" ADD CONSTRAINT "landed_cost_charges_voucher_id_landed_cost_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."landed_cost_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_voucher_id_landed_cost_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."landed_cost_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_goods_receipt_line_id_goods_receipt_lines_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_line_allocations" ADD CONSTRAINT "landed_cost_line_allocations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_goods_receipt_line_id_goods_receipt_lines_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_multi_checkouts_tenant_order" ON "multi_tender_checkouts" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_checkout_tenders_tenant_key" ON "checkout_tenders" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_checkout_tenders_checkout" ON "checkout_tenders" USING btree ("checkout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_templates_tenant_code" ON "product_templates" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_templates_tenant_category" ON "product_templates" USING btree ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_templates_tenant_brand" ON "product_templates" USING btree ("tenant_id","brand_id");--> statement-breakpoint
CREATE INDEX "idx_templates_tenant_type" ON "product_templates" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dimensions_tenant_code" ON "attribute_dimensions" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attr_values_tenant_dim_code" ON "attribute_values" USING btree ("tenant_id","dimension_id","code");--> statement-breakpoint
CREATE INDEX "idx_attr_values_dim" ON "attribute_values" USING btree ("dimension_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_variants_tenant_sku" ON "product_variants" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "idx_variants_tenant_template" ON "product_variants" USING btree ("tenant_id","template_id");--> statement-breakpoint
CREATE INDEX "idx_variants_tenant_barcode" ON "product_variants" USING btree ("tenant_id","barcode");--> statement-breakpoint
CREATE INDEX "idx_variants_tenant_status" ON "product_variants" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warehouses_tenant_code" ON "warehouses" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_warehouses_tenant_branch" ON "warehouses" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_storage_locations_wh_code" ON "storage_locations" USING btree ("tenant_id","warehouse_id","code");--> statement-breakpoint
CREATE INDEX "idx_storage_locations_path" ON "storage_locations" USING btree ("tenant_id","warehouse_id","materialized_path");--> statement-breakpoint
CREATE INDEX "idx_storage_locations_parent" ON "storage_locations" USING btree ("tenant_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_storage_locations_type" ON "storage_locations" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_batches_tenant_variant_code" ON "stock_batches" USING btree ("tenant_id","variant_id","batch_number");--> statement-breakpoint
CREATE INDEX "idx_stock_batches_status" ON "stock_batches" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_stock_batches_expiry" ON "stock_batches" USING btree ("tenant_id","expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_serials_tenant_variant_sn" ON "stock_serials" USING btree ("tenant_id","variant_id","serial_number");--> statement-breakpoint
CREATE INDEX "idx_stock_serials_wh_status" ON "stock_serials" USING btree ("tenant_id","warehouse_id","status");--> statement-breakpoint
CREATE INDEX "idx_stock_serials_location" ON "stock_serials" USING btree ("tenant_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_stock_serials_batch" ON "stock_serials" USING btree ("tenant_id","batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_ledger_tenant_idempotency" ON "stock_ledger_entries" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_stock_ledger_tenant_variant_date" ON "stock_ledger_entries" USING btree ("tenant_id","variant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_ledger_reference" ON "stock_ledger_entries" USING btree ("tenant_id","reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_stock_reservations_tenant_lookup" ON "stock_reservations" USING btree ("tenant_id","variant_id","warehouse_id","status");--> statement-breakpoint
CREATE INDEX "idx_stock_reservations_expires" ON "stock_reservations" USING btree ("tenant_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_stock_balance_tenant_lookup" ON "stock_balance_snapshots" USING btree ("tenant_id","warehouse_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_price_lists_tenant_code" ON "price_lists" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_price_lists_tenant_default" ON "price_lists" USING btree ("tenant_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_price_list_rules_unique" ON "price_list_rules" USING btree ("tenant_id","pricelist_id","variant_id","min_quantity");--> statement-breakpoint
CREATE INDEX "idx_price_list_rules_variant" ON "price_list_rules" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_rates_tenant_code" ON "tax_rates" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_tax_rates_tenant_active" ON "tax_rates" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_discount_promotions_tenant_code" ON "discount_promotions" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_discount_promotions_active" ON "discount_promotions" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pos_registers_tenant_code" ON "pos_registers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_pos_registers_tenant_branch" ON "pos_registers" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_tenant_register" ON "pos_sessions" USING btree ("tenant_id","register_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_status" ON "pos_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pos_cash_movements_tenant_session" ON "pos_cash_movements" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sales_orders_tenant_number" ON "sales_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_tenant_channel" ON "sales_orders" USING btree ("tenant_id","channel_type");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_status" ON "sales_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_order" ON "sales_order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_variant" ON "sales_order_lines" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sync_batches_tenant" ON "pos_sync_batches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sync_batches_device" ON "pos_sync_batches" USING btree ("tenant_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sync_batches_session" ON "pos_sync_batches" USING btree ("pos_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pos_sync_tx_tenant_client_id" ON "pos_sync_transactions" USING btree ("tenant_id","client_tx_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pos_sync_tx_tenant_idempotency" ON "pos_sync_transactions" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pos_sync_tx_tenant_device_seq" ON "pos_sync_transactions" USING btree ("tenant_id","device_id","client_sequence");--> statement-breakpoint
CREATE INDEX "idx_pos_sync_tx_batch" ON "pos_sync_transactions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sync_tx_session" ON "pos_sync_transactions" USING btree ("pos_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_suppliers_tenant_code" ON "suppliers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_suppliers_tenant_status" ON "suppliers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_mappings_tenant_sup_var" ON "supplier_product_mappings" USING btree ("tenant_id","supplier_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_mappings_variant" ON "supplier_product_mappings" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_mappings_sku" ON "supplier_product_mappings" USING btree ("tenant_id","supplier_sku");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_po_tenant_number" ON "purchase_orders" USING btree ("tenant_id","po_number");--> statement-breakpoint
CREATE INDEX "idx_po_tenant_status" ON "purchase_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_po_tenant_supplier" ON "purchase_orders" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_po_lines_po_id" ON "purchase_order_lines" USING btree ("tenant_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_po_lines_variant_id" ON "purchase_order_lines" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_grn_tenant_number" ON "goods_receipts" USING btree ("tenant_id","grn_number");--> statement-breakpoint
CREATE INDEX "idx_grn_tenant_po" ON "goods_receipts" USING btree ("tenant_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_grn_lines_receipt_id" ON "goods_receipt_lines" USING btree ("tenant_id","goods_receipt_id");--> statement-breakpoint
CREATE INDEX "idx_grn_lines_po_line_id" ON "goods_receipt_lines" USING btree ("tenant_id","purchase_order_line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_landed_vouchers_tenant_number" ON "landed_cost_vouchers" USING btree ("tenant_id","voucher_number");--> statement-breakpoint
CREATE INDEX "idx_landed_vouchers_tenant_status" ON "landed_cost_vouchers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_landed_charges_voucher" ON "landed_cost_charges" USING btree ("tenant_id","voucher_id");--> statement-breakpoint
CREATE INDEX "idx_landed_allocations_voucher" ON "landed_cost_line_allocations" USING btree ("tenant_id","voucher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_tenant_number" ON "purchase_invoices" USING btree ("tenant_id","invoice_number");--> statement-breakpoint
CREATE INDEX "idx_invoices_tenant_po" ON "purchase_invoices" USING btree ("tenant_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_tenant_supplier" ON "purchase_invoices" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_lines_invoice" ON "purchase_invoice_lines" USING btree ("tenant_id","invoice_id");