CREATE TABLE "supplier_contacts" (
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
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
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
--> statement-breakpoint
CREATE TABLE "purchase_request_lines" (
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
--> statement-breakpoint
CREATE TABLE "purchase_rfqs" (
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
--> statement-breakpoint
CREATE TABLE "purchase_rfq_lines" (
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
--> statement-breakpoint
CREATE TABLE "purchase_rfq_suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rfq_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"status" text DEFAULT 'INVITED' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "supplier_quotations" (
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
--> statement-breakpoint
CREATE TABLE "supplier_quotation_lines" (
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
--> statement-breakpoint
CREATE TABLE "supplier_returns" (
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
--> statement-breakpoint
CREATE TABLE "supplier_return_lines" (
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
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
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
--> statement-breakpoint
CREATE TABLE "supplier_payment_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"purchase_invoice_id" text NOT NULL,
	"allocated_amount_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mo_execution_runs" (
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
--> statement-breakpoint
CREATE TABLE "mo_output_inspections" (
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
--> statement-breakpoint
CREATE TABLE "mo_scrap_records" (
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
--> statement-breakpoint
CREATE TABLE "mo_component_substitutions" (
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
--> statement-breakpoint
CREATE TABLE "fleet_vehicles" (
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
--> statement-breakpoint
CREATE TABLE "fleet_drivers" (
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
--> statement-breakpoint
CREATE TABLE "delivery_runs" (
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
--> statement-breakpoint
CREATE TABLE "delivery_stops" (
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
--> statement-breakpoint
CREATE TABLE "proof_of_deliveries" (
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
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
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
--> statement-breakpoint
CREATE TABLE "tax_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"tax_rate_ids" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "goods_receipts" DROP CONSTRAINT "goods_receipts_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "landed_cost_vouchers" DROP CONSTRAINT "landed_cost_vouchers_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "purchase_invoices" DROP CONSTRAINT "purchase_invoices_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "bill_of_materials" DROP CONSTRAINT "bill_of_materials_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "bill_of_materials" DROP CONSTRAINT "bill_of_materials_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "mfg_work_centers" DROP CONSTRAINT "mfg_work_centers_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "mfg_work_centers" DROP CONSTRAINT "mfg_work_centers_warehouse_id_warehouses_id_fk";
--> statement-breakpoint
ALTER TABLE "routings" DROP CONSTRAINT "routings_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "manufacturing_orders" DROP CONSTRAINT "manufacturing_orders_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tax_rates" ADD COLUMN "liability_account_id" text;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "paid_amount_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_preferred_supplier_id_suppliers_id_fk" FOREIGN KEY ("preferred_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_rfq_id_purchase_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."purchase_rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_rfq_id_purchase_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."purchase_rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_rfq_id_purchase_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."purchase_rfqs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_quotation_id_supplier_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."supplier_quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_return_id_supplier_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."supplier_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_goods_receipt_line_id_goods_receipt_lines_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_payment_id_supplier_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."supplier_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_purchase_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_execution_runs" ADD CONSTRAINT "mo_execution_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_execution_runs" ADD CONSTRAINT "mo_execution_runs_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_output_inspections" ADD CONSTRAINT "mo_output_inspections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_output_inspections" ADD CONSTRAINT "mo_output_inspections_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_output_inspections" ADD CONSTRAINT "mo_output_inspections_run_id_mo_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."mo_execution_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_scrap_records" ADD CONSTRAINT "mo_scrap_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_scrap_records" ADD CONSTRAINT "mo_scrap_records_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_scrap_records" ADD CONSTRAINT "mo_scrap_records_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_original_variant_id_product_variants_id_fk" FOREIGN KEY ("original_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_component_substitutions" ADD CONSTRAINT "mo_component_substitutions_substituted_variant_id_product_variants_id_fk" FOREIGN KEY ("substituted_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_assigned_vehicle_id_fleet_vehicles_id_fk" FOREIGN KEY ("assigned_vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_vehicle_id_fleet_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_driver_id_fleet_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."fleet_drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_run_id_delivery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."delivery_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_run_id_delivery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."delivery_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_stop_id_delivery_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."delivery_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_groups" ADD CONSTRAINT "tax_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sup_contacts_supplier" ON "supplier_contacts" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_requests_tenant_number" ON "purchase_requests" USING btree ("tenant_id","request_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_requests_tenant_status" ON "purchase_requests" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_pr_lines_request_id" ON "purchase_request_lines" USING btree ("tenant_id","request_id");--> statement-breakpoint
CREATE INDEX "idx_pr_lines_variant_id" ON "purchase_request_lines" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rfqs_tenant_number" ON "purchase_rfqs" USING btree ("tenant_id","rfq_number");--> statement-breakpoint
CREATE INDEX "idx_rfqs_tenant_status" ON "purchase_rfqs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_rfq_lines_rfq_id" ON "purchase_rfq_lines" USING btree ("tenant_id","rfq_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rfq_sup_rfq_supplier" ON "purchase_rfq_suppliers" USING btree ("tenant_id","rfq_id","supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_quotes_tenant_number" ON "supplier_quotations" USING btree ("tenant_id","quotation_number");--> statement-breakpoint
CREATE INDEX "idx_supplier_quotes_tenant_supplier" ON "supplier_quotations" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_quotes_tenant_rfq" ON "supplier_quotations" USING btree ("tenant_id","rfq_id");--> statement-breakpoint
CREATE INDEX "idx_sq_lines_quotation_id" ON "supplier_quotation_lines" USING btree ("tenant_id","quotation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sup_returns_tenant_number" ON "supplier_returns" USING btree ("tenant_id","return_number");--> statement-breakpoint
CREATE INDEX "idx_sup_returns_tenant_supplier" ON "supplier_returns" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_sup_returns_tenant_po" ON "supplier_returns" USING btree ("tenant_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_sup_return_lines_return_id" ON "supplier_return_lines" USING btree ("tenant_id","return_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sup_pmt_tenant_number" ON "supplier_payments" USING btree ("tenant_id","payment_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sup_pmt_tenant_idemp" ON "supplier_payments" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_sup_pmt_tenant_supplier" ON "supplier_payments" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_sup_pmt_alloc_payment" ON "supplier_payment_allocations" USING btree ("tenant_id","payment_id");--> statement-breakpoint
CREATE INDEX "idx_sup_pmt_alloc_invoice" ON "supplier_payment_allocations" USING btree ("tenant_id","purchase_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_mo_runs_mo_id" ON "mo_execution_runs" USING btree ("tenant_id","manufacturing_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mo_inspections_tenant_number" ON "mo_output_inspections" USING btree ("tenant_id","inspection_number");--> statement-breakpoint
CREATE INDEX "idx_mo_inspections_mo_id" ON "mo_output_inspections" USING btree ("tenant_id","manufacturing_order_id");--> statement-breakpoint
CREATE INDEX "idx_mo_inspections_status" ON "mo_output_inspections" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mo_scrap_tenant_number" ON "mo_scrap_records" USING btree ("tenant_id","scrap_number");--> statement-breakpoint
CREATE INDEX "idx_mo_scrap_mo_id" ON "mo_scrap_records" USING btree ("tenant_id","manufacturing_order_id");--> statement-breakpoint
CREATE INDEX "idx_mo_scrap_variant_id" ON "mo_scrap_records" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_mo_substitutions_mo_id" ON "mo_component_substitutions" USING btree ("tenant_id","manufacturing_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vehicles_tenant_code" ON "fleet_vehicles" USING btree ("tenant_id","vehicle_code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vehicles_tenant_plate" ON "fleet_vehicles" USING btree ("tenant_id","license_plate");--> statement-breakpoint
CREATE INDEX "idx_vehicles_tenant_wh" ON "fleet_vehicles" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_tenant_status" ON "fleet_vehicles" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_drivers_tenant_code" ON "fleet_drivers" USING btree ("tenant_id","driver_code");--> statement-breakpoint
CREATE INDEX "idx_drivers_tenant_user" ON "fleet_drivers" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_drivers_tenant_shift" ON "fleet_drivers" USING btree ("tenant_id","shift_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_runs_tenant_number" ON "delivery_runs" USING btree ("tenant_id","run_number");--> statement-breakpoint
CREATE INDEX "idx_runs_tenant_wh" ON "delivery_runs" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_runs_tenant_status" ON "delivery_runs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_runs_tenant_vehicle" ON "delivery_runs" USING btree ("tenant_id","vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_runs_tenant_driver" ON "delivery_runs" USING btree ("tenant_id","driver_id");--> statement-breakpoint
CREATE INDEX "idx_stops_tenant_run" ON "delivery_stops" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE INDEX "idx_stops_tenant_order" ON "delivery_stops" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_stops_tenant_status" ON "delivery_stops" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_pod_tenant_run" ON "proof_of_deliveries" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE INDEX "idx_pod_tenant_stop" ON "proof_of_deliveries" USING btree ("tenant_id","stop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_coa_tenant_company_code" ON "chart_of_accounts" USING btree ("tenant_id","company_id","code");--> statement-breakpoint
CREATE INDEX "idx_coa_tenant_type" ON "chart_of_accounts" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_coa_tenant_company" ON "chart_of_accounts" USING btree ("tenant_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_je_tenant_number" ON "journal_entries" USING btree ("tenant_id","entry_number");--> statement-breakpoint
CREATE INDEX "idx_je_tenant_company_status" ON "journal_entries" USING btree ("tenant_id","company_id","status");--> statement-breakpoint
CREATE INDEX "idx_je_tenant_posting_date" ON "journal_entries" USING btree ("tenant_id","posting_date");--> statement-breakpoint
CREATE INDEX "idx_je_tenant_source" ON "journal_entries" USING btree ("tenant_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_je_lines_tenant_je" ON "journal_entry_lines" USING btree ("tenant_id","journal_entry_id");--> statement-breakpoint
CREATE INDEX "idx_je_lines_tenant_account" ON "journal_entry_lines" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_groups_tenant_code" ON "tax_groups" USING btree ("tenant_id","code");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_cost_vouchers" ADD CONSTRAINT "landed_cost_vouchers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routings" ADD CONSTRAINT "routings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_tenant_supplier_ref" ON "purchase_invoices" USING btree ("tenant_id","supplier_id","supplier_invoice_reference");