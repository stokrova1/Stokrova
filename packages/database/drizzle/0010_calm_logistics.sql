-- STOKROVA Phase 10: Advanced Logistics, Fulfillment & Distribution Schema Migration

CREATE TABLE IF NOT EXISTS "fulfillments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"fulfillment_number" text NOT NULL,
	"order_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"priority" text DEFAULT 'STANDARD' NOT NULL,
	"delivery_window_start" text,
	"delivery_window_end" text,
	"hold_reason" text,
	"hold_approved_by" text,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "fulfillment_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"fulfillment_id" text NOT NULL,
	"order_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity_allocated" integer DEFAULT 0 NOT NULL,
	"quantity_packed" integer DEFAULT 0 NOT NULL,
	"quantity_dispatched" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "carriers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"carrier_code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'EXTERNAL_CARRIER' NOT NULL,
	"api_endpoint" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "carrier_services" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"carrier_id" text NOT NULL,
	"service_code" text NOT NULL,
	"name" text NOT NULL,
	"estimated_transit_days" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipping_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"quote_number" text NOT NULL,
	"service_id" text NOT NULL,
	"cost_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_number" text NOT NULL,
	"order_id" text NOT NULL,
	"fulfillment_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"carrier_id" text,
	"carrier_service_id" text,
	"run_id" text,
	"stop_id" text,
	"tracking_number" text,
	"label_url" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipment_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"fulfillment_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipment_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"package_number" text NOT NULL,
	"tracking_number" text,
	"weight_grams" integer DEFAULT 0 NOT NULL,
	"length_cm" integer,
	"width_cm" integer,
	"height_cm" integer,
	"packaging_type" text DEFAULT 'BOX' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipment_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"provider_event_id" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "logistics_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"charge_type" text NOT NULL,
	"provenance" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "logistics_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"name" text NOT NULL,
	"cutoff_time" text,
	"max_delivery_attempts" integer DEFAULT 3 NOT NULL,
	"required_pod_method" text DEFAULT 'SIGNATURE' NOT NULL,
	"allow_partial_delivery" boolean DEFAULT true NOT NULL,
	"auto_reschedule" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Foreign Keys with restrict on tenant
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "fulfillments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_order_line_id_sales_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "sales_order_lines"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "carriers" ADD CONSTRAINT "carriers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "carrier_services" ADD CONSTRAINT "carrier_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "carrier_services" ADD CONSTRAINT "carrier_services_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_service_id_carrier_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "carrier_services"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "fulfillments"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_carrier_service_id_carrier_services_id_fk" FOREIGN KEY ("carrier_service_id") REFERENCES "carrier_services"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_run_id_delivery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "delivery_runs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_stop_id_delivery_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "delivery_stops"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_fulfillment_line_id_fulfillment_lines_id_fk" FOREIGN KEY ("fulfillment_line_id") REFERENCES "fulfillment_lines"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "logistics_charges" ADD CONSTRAINT "logistics_charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "logistics_charges" ADD CONSTRAINT "logistics_charges_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "logistics_policies" ADD CONSTRAINT "logistics_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "logistics_policies" ADD CONSTRAINT "logistics_policies_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE cascade ON UPDATE no action;

-- Unique and Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "idx_fulfillments_tenant_number" ON "fulfillments" ("tenant_id", "fulfillment_number");
CREATE INDEX IF NOT EXISTS "idx_fulfillments_tenant_order" ON "fulfillments" ("tenant_id", "order_id");
CREATE INDEX IF NOT EXISTS "idx_fulfillments_tenant_wh" ON "fulfillments" ("tenant_id", "warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_fulfillments_tenant_status" ON "fulfillments" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_fulfillment_lines_tenant_f" ON "fulfillment_lines" ("tenant_id", "fulfillment_id");
CREATE INDEX IF NOT EXISTS "idx_fulfillment_lines_tenant_ol" ON "fulfillment_lines" ("tenant_id", "order_line_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_carriers_tenant_code" ON "carriers" ("tenant_id", "carrier_code");
CREATE INDEX IF NOT EXISTS "idx_carriers_tenant_active" ON "carriers" ("tenant_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_carrier_services_tenant_code" ON "carrier_services" ("tenant_id", "carrier_id", "service_code");
CREATE INDEX IF NOT EXISTS "idx_carrier_services_carrier" ON "carrier_services" ("tenant_id", "carrier_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipping_quotes_tenant_num" ON "shipping_quotes" ("tenant_id", "quote_number");
CREATE INDEX IF NOT EXISTS "idx_shipping_quotes_service" ON "shipping_quotes" ("tenant_id", "service_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipments_tenant_number" ON "shipments" ("tenant_id", "shipment_number");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_order" ON "shipments" ("tenant_id", "order_id");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_f" ON "shipments" ("tenant_id", "fulfillment_id");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_status" ON "shipments" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_tracking" ON "shipments" ("tenant_id", "tracking_number");

CREATE INDEX IF NOT EXISTS "idx_shipment_lines_shipment" ON "shipment_lines" ("tenant_id", "shipment_id");
CREATE INDEX IF NOT EXISTS "idx_shipment_lines_fline" ON "shipment_lines" ("tenant_id", "fulfillment_line_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipment_packages_num" ON "shipment_packages" ("tenant_id", "shipment_id", "package_number");
CREATE INDEX IF NOT EXISTS "idx_shipment_packages_track" ON "shipment_packages" ("tenant_id", "tracking_number");

CREATE INDEX IF NOT EXISTS "idx_shipment_milestones_shipment" ON "shipment_milestones" ("tenant_id", "shipment_id");
CREATE INDEX IF NOT EXISTS "idx_shipment_milestones_provider" ON "shipment_milestones" ("tenant_id", "provider_event_id");

CREATE INDEX IF NOT EXISTS "idx_logistics_charges_shipment" ON "logistics_charges" ("tenant_id", "shipment_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_logistics_policies_wh_name" ON "logistics_policies" ("tenant_id", "warehouse_id", "name");
