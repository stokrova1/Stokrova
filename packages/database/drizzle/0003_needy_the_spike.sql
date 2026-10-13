CREATE TABLE "storage_zones" (
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
--> statement-breakpoint
CREATE TABLE "put_away_rules" (
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
--> statement-breakpoint
CREATE TABLE "bill_of_materials" (
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
--> statement-breakpoint
CREATE TABLE "bom_lines" (
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
--> statement-breakpoint
CREATE TABLE "bom_byproducts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"bom_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"cost_allocation_basis_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfg_work_centers" (
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
--> statement-breakpoint
CREATE TABLE "routings" (
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
--> statement-breakpoint
CREATE TABLE "routing_operations" (
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
--> statement-breakpoint
CREATE TABLE "manufacturing_orders" (
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
--> statement-breakpoint
CREATE TABLE "mo_components" (
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
--> statement-breakpoint
CREATE TABLE "mo_work_orders" (
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
--> statement-breakpoint
CREATE TABLE "customer_groups" (
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
--> statement-breakpoint
CREATE TABLE "customers" (
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
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
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
--> statement-breakpoint
CREATE TABLE "quotations" (
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
--> statement-breakpoint
CREATE TABLE "quotation_lines" (
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
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
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
--> statement-breakpoint
CREATE TABLE "sales_invoice_lines" (
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
--> statement-breakpoint
ALTER TABLE "sales_order_lines" DROP CONSTRAINT "sales_order_lines_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "storage_locations" ADD COLUMN "zone_id" text;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD COLUMN "velocity_class" text;--> statement-breakpoint
ALTER TABLE "pos_registers" ADD COLUMN "work_center_id" text;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "quotation_id" text;--> statement-breakpoint
ALTER TABLE "storage_zones" ADD CONSTRAINT "storage_zones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_zones" ADD CONSTRAINT "storage_zones_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "put_away_rules" ADD CONSTRAINT "put_away_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "put_away_rules" ADD CONSTRAINT "put_away_rules_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "put_away_rules" ADD CONSTRAINT "put_away_rules_destination_zone_id_storage_zones_id_fk" FOREIGN KEY ("destination_zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_component_variant_id_product_variants_id_fk" FOREIGN KEY ("component_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_byproducts" ADD CONSTRAINT "bom_byproducts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_byproducts" ADD CONSTRAINT "bom_byproducts_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_byproducts" ADD CONSTRAINT "bom_byproducts_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routings" ADD CONSTRAINT "routings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routings" ADD CONSTRAINT "routings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_routing_id_routings_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."routings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_work_center_id_mfg_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."mfg_work_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_bom_id_bill_of_materials_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."bill_of_materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_routing_id_routings_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."routings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_components" ADD CONSTRAINT "mo_components_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_manufacturing_order_id_manufacturing_orders_id_fk" FOREIGN KEY ("manufacturing_order_id") REFERENCES "public"."manufacturing_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_operation_id_routing_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."routing_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mo_work_orders" ADD CONSTRAINT "mo_work_orders_work_center_id_mfg_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."mfg_work_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_group_id_customer_groups_id_fk" FOREIGN KEY ("customer_group_id") REFERENCES "public"."customer_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_storage_zones_wh_code" ON "storage_zones" USING btree ("tenant_id","warehouse_id","code");--> statement-breakpoint
CREATE INDEX "idx_storage_zones_wh" ON "storage_zones" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_storage_zones_type" ON "storage_zones" USING btree ("tenant_id","zone_type");--> statement-breakpoint
CREATE INDEX "idx_put_away_rules_wh" ON "put_away_rules" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_put_away_rules_priority" ON "put_away_rules" USING btree ("tenant_id","warehouse_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bom_tenant_number" ON "bill_of_materials" USING btree ("tenant_id","bom_number");--> statement-breakpoint
CREATE INDEX "idx_bom_tenant_variant" ON "bill_of_materials" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_bom_lines_bom_id" ON "bom_lines" USING btree ("tenant_id","bom_id");--> statement-breakpoint
CREATE INDEX "idx_bom_lines_component_variant" ON "bom_lines" USING btree ("tenant_id","component_variant_id");--> statement-breakpoint
CREATE INDEX "idx_bom_byproducts_bom_id" ON "bom_byproducts" USING btree ("tenant_id","bom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mfg_work_centers_code" ON "mfg_work_centers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_mfg_work_centers_warehouse" ON "mfg_work_centers" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_routings_tenant_number" ON "routings" USING btree ("tenant_id","routing_number");--> statement-breakpoint
CREATE INDEX "idx_routing_ops_routing" ON "routing_operations" USING btree ("tenant_id","routing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mo_tenant_number" ON "manufacturing_orders" USING btree ("tenant_id","mo_number");--> statement-breakpoint
CREATE INDEX "idx_mo_tenant_status" ON "manufacturing_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_mo_tenant_variant" ON "manufacturing_orders" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_mo_components_mo_id" ON "mo_components" USING btree ("tenant_id","manufacturing_order_id");--> statement-breakpoint
CREATE INDEX "idx_mo_work_orders_mo_id" ON "mo_work_orders" USING btree ("tenant_id","manufacturing_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customer_groups_tenant_code" ON "customer_groups" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_tenant_code" ON "customers" USING btree ("tenant_id","customer_code");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_email" ON "customers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_phone" ON "customers" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_group" ON "customers" USING btree ("tenant_id","customer_group_id");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_customer" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_tenant" ON "customer_addresses" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quotations_tenant_number" ON "quotations" USING btree ("tenant_id","quotation_number");--> statement-breakpoint
CREATE INDEX "idx_quotations_tenant_status" ON "quotations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_quotations_tenant_customer" ON "quotations" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_quotation_lines_quotation" ON "quotation_lines" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "idx_quotation_lines_variant" ON "quotation_lines" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sales_invoices_tenant_number" ON "sales_invoices" USING btree ("tenant_id","invoice_number");--> statement-breakpoint
CREATE INDEX "idx_sales_invoices_tenant_order" ON "sales_invoices" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_invoices_tenant_status" ON "sales_invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_sales_invoices_tenant_customer" ON "sales_invoices" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_sales_invoice_lines_invoice" ON "sales_invoice_lines" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_sales_invoice_lines_variant" ON "sales_invoice_lines" USING btree ("variant_id");--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_zone_id_storage_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_storage_locations_zone" ON "storage_locations" USING btree ("tenant_id","zone_id");