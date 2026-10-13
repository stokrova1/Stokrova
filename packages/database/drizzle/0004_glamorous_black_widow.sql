CREATE TABLE "pick_waves" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"wave_number" text NOT NULL,
	"status" text DEFAULT 'PLANNING' NOT NULL,
	"strategy" text NOT NULL,
	"criteria" jsonb,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_lines" integer DEFAULT 0 NOT NULL,
	"released_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pick_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"wave_id" text,
	"pick_list_number" text NOT NULL,
	"strategy" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"picker_id" text,
	"zone_id" text,
	"staging_location_id" text,
	"order_ids" jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pick_list_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pick_list_id" text NOT NULL,
	"order_id" text NOT NULL,
	"order_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"batch_id" text,
	"source_location_id" text NOT NULL,
	"source_location_code" text NOT NULL,
	"zone_id" text,
	"aisle" integer,
	"rack" integer,
	"shelf" integer,
	"bin_position" integer,
	"pick_sequence" integer DEFAULT 1 NOT NULL,
	"quantity_requested" integer NOT NULL,
	"quantity_picked" integer DEFAULT 0 NOT NULL,
	"quantity_short" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"short_reason" text,
	"picked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_stations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"station_code" text NOT NULL,
	"station_name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"default_staging_location_id" text,
	"scale_device_id" text,
	"printer_device_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packaging_boxes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"length_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"height_mm" integer NOT NULL,
	"max_weight_grams" integer NOT NULL,
	"tare_weight_grams" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"manifest_number" text NOT NULL,
	"carrier_id" text NOT NULL,
	"carrier_name" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"vehicle_reference" text,
	"driver_name" text,
	"driver_phone" text,
	"total_containers" integer DEFAULT 0 NOT NULL,
	"total_gross_weight_grams" integer DEFAULT 0 NOT NULL,
	"sealed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packed_containers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"station_id" text,
	"box_type_id" text,
	"manifest_id" text,
	"container_number" text NOT NULL,
	"sscc_barcode" text NOT NULL,
	"tracking_number" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"tare_weight_grams" integer DEFAULT 0 NOT NULL,
	"net_weight_grams" integer DEFAULT 0 NOT NULL,
	"gross_weight_grams" integer DEFAULT 0 NOT NULL,
	"scale_verified_weight_grams" integer,
	"weight_discrepancy_grams" integer,
	"seal_number" text,
	"sealed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packed_container_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"container_id" text NOT NULL,
	"pick_list_line_id" text,
	"order_id" text NOT NULL,
	"order_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"batch_id" text,
	"serial_numbers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_bin_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"transfer_number" text NOT NULL,
	"transfer_type" text DEFAULT 'INTERNAL_BIN_MOVE' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"source_location_id" text NOT NULL,
	"destination_location_id" text NOT NULL,
	"operator_id" text,
	"notes" text,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_bin_transfer_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"transfer_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"batch_id" text,
	"serial_numbers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_dock_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"inbound_receipt_id" text NOT NULL,
	"inbound_line_id" text NOT NULL,
	"matched_order_id" text NOT NULL,
	"matched_order_line_id" text NOT NULL,
	"quantity_to_cross_dock" integer NOT NULL,
	"target_staging_location_id" text NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"operator_id" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_authorizations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"rma_number" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"customer_email" text,
	"original_order_id" text,
	"original_order_number" text,
	"resolution_preference" text DEFAULT 'REFUND' NOT NULL,
	"restocking_fee_bp" integer DEFAULT 0 NOT NULL,
	"return_tracking_number" text,
	"carrier_code" text,
	"receiving_location_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"received_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rma_id" text NOT NULL,
	"order_id" text,
	"order_line_id" text,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity_authorized" integer NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"reason_code" text NOT NULL,
	"customer_notes" text,
	"batch_id" text,
	"serial_numbers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rma_id" text NOT NULL,
	"return_line_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity_inspected" integer NOT NULL,
	"condition_grade" text NOT NULL,
	"status" text NOT NULL,
	"failure_reason_code" text,
	"inspector_id" text,
	"quarantine_location_id" text,
	"inspection_notes" text,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disposition_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rma_id" text NOT NULL,
	"inspection_id" text,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"action_type" text NOT NULL,
	"destination_location_id" text NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"gross_refund_cents" integer DEFAULT 0 NOT NULL,
	"restocking_fee_cents" integer DEFAULT 0 NOT NULL,
	"net_refund_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"executed_by" text,
	"executed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replenishment_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"strategy" text DEFAULT 'MIN_MAX' NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 0 NOT NULL,
	"lead_time_days" integer DEFAULT 1 NOT NULL,
	"order_multiple" integer DEFAULT 1 NOT NULL,
	"min_order_quantity" integer DEFAULT 1 NOT NULL,
	"primary_vendor_id" text,
	"upstream_warehouse_id" text,
	"preferred_sourcing" text DEFAULT 'PURCHASE_ORDER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replenishment_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"sku" text NOT NULL,
	"rule_id" text NOT NULL,
	"net_stock_position" integer NOT NULL,
	"reorder_point" integer NOT NULL,
	"recommended_quantity" integer NOT NULL,
	"sourcing_method" text NOT NULL,
	"target_vendor_id" text,
	"source_warehouse_id" text,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"generated_order_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pick_waves" ADD CONSTRAINT "pick_waves_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_waves" ADD CONSTRAINT "pick_waves_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_wave_id_pick_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."pick_waves"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_zone_id_storage_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_staging_location_id_storage_locations_id_fk" FOREIGN KEY ("staging_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_pick_list_id_pick_lists_id_fk" FOREIGN KEY ("pick_list_id") REFERENCES "public"."pick_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_source_location_id_storage_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_zone_id_storage_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."storage_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_stations" ADD CONSTRAINT "packing_stations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_stations" ADD CONSTRAINT "packing_stations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packaging_boxes" ADD CONSTRAINT "packaging_boxes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_manifests" ADD CONSTRAINT "shipping_manifests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_manifests" ADD CONSTRAINT "shipping_manifests_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_station_id_packing_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."packing_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_box_type_id_packaging_boxes_id_fk" FOREIGN KEY ("box_type_id") REFERENCES "public"."packaging_boxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packed_containers" ADD CONSTRAINT "packed_containers_manifest_id_shipping_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."shipping_manifests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packed_container_lines" ADD CONSTRAINT "packed_container_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packed_container_lines" ADD CONSTRAINT "packed_container_lines_container_id_packed_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."packed_containers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_source_location_id_storage_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_bin_transfers" ADD CONSTRAINT "internal_bin_transfers_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_bin_transfer_lines" ADD CONSTRAINT "internal_bin_transfer_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_bin_transfer_lines" ADD CONSTRAINT "internal_bin_transfer_lines_transfer_id_internal_bin_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."internal_bin_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_dock_operations" ADD CONSTRAINT "cross_dock_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_dock_operations" ADD CONSTRAINT "cross_dock_operations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_dock_operations" ADD CONSTRAINT "cross_dock_operations_target_staging_location_id_storage_locations_id_fk" FOREIGN KEY ("target_staging_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_receiving_location_id_storage_locations_id_fk" FOREIGN KEY ("receiving_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_rma_id_return_authorizations_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."return_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_rma_id_return_authorizations_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."return_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_return_line_id_return_lines_id_fk" FOREIGN KEY ("return_line_id") REFERENCES "public"."return_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_quarantine_location_id_storage_locations_id_fk" FOREIGN KEY ("quarantine_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_rma_id_return_authorizations_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."return_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_inspection_id_quality_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."quality_inspections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposition_actions" ADD CONSTRAINT "disposition_actions_destination_location_id_storage_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_rules" ADD CONSTRAINT "replenishment_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_rules" ADD CONSTRAINT "replenishment_rules_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_rules" ADD CONSTRAINT "replenishment_rules_upstream_warehouse_id_warehouses_id_fk" FOREIGN KEY ("upstream_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_rule_id_replenishment_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."replenishment_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_source_warehouse_id_warehouses_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pick_waves_number" ON "pick_waves" USING btree ("tenant_id","warehouse_id","wave_number");--> statement-breakpoint
CREATE INDEX "idx_pick_waves_wh_status" ON "pick_waves" USING btree ("tenant_id","warehouse_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pick_lists_number" ON "pick_lists" USING btree ("tenant_id","warehouse_id","pick_list_number");--> statement-breakpoint
CREATE INDEX "idx_pick_lists_wave" ON "pick_lists" USING btree ("tenant_id","wave_id");--> statement-breakpoint
CREATE INDEX "idx_pick_lists_status" ON "pick_lists" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_pick_list_lines_list" ON "pick_list_lines" USING btree ("tenant_id","pick_list_id");--> statement-breakpoint
CREATE INDEX "idx_pick_list_lines_seq" ON "pick_list_lines" USING btree ("tenant_id","pick_list_id","pick_sequence");--> statement-breakpoint
CREATE INDEX "idx_pick_list_lines_status" ON "pick_list_lines" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_packing_stations_tenant_code" ON "packing_stations" USING btree ("tenant_id","warehouse_id","station_code");--> statement-breakpoint
CREATE INDEX "idx_packing_stations_status" ON "packing_stations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_packaging_boxes_tenant_code" ON "packaging_boxes" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_packaging_boxes_active" ON "packaging_boxes" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shipping_manifests_tenant_number" ON "shipping_manifests" USING btree ("tenant_id","manifest_number");--> statement-breakpoint
CREATE INDEX "idx_shipping_manifests_carrier" ON "shipping_manifests" USING btree ("tenant_id","carrier_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_packed_containers_tenant_number" ON "packed_containers" USING btree ("tenant_id","container_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_packed_containers_sscc" ON "packed_containers" USING btree ("tenant_id","sscc_barcode");--> statement-breakpoint
CREATE INDEX "idx_packed_containers_manifest" ON "packed_containers" USING btree ("tenant_id","manifest_id");--> statement-breakpoint
CREATE INDEX "idx_packed_containers_status" ON "packed_containers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_container_lines_container" ON "packed_container_lines" USING btree ("tenant_id","container_id");--> statement-breakpoint
CREATE INDEX "idx_container_lines_order" ON "packed_container_lines" USING btree ("tenant_id","order_id","order_line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bin_transfers_tenant_num" ON "internal_bin_transfers" USING btree ("tenant_id","transfer_number");--> statement-breakpoint
CREATE INDEX "idx_bin_transfers_src" ON "internal_bin_transfers" USING btree ("tenant_id","source_location_id");--> statement-breakpoint
CREATE INDEX "idx_bin_transfers_dst" ON "internal_bin_transfers" USING btree ("tenant_id","destination_location_id");--> statement-breakpoint
CREATE INDEX "idx_bin_transfers_status" ON "internal_bin_transfers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_transfer_lines_transfer" ON "internal_bin_transfer_lines" USING btree ("tenant_id","transfer_id");--> statement-breakpoint
CREATE INDEX "idx_transfer_lines_variant" ON "internal_bin_transfer_lines" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_cross_dock_tenant_wh" ON "cross_dock_operations" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_cross_dock_receipt" ON "cross_dock_operations" USING btree ("tenant_id","inbound_receipt_id");--> statement-breakpoint
CREATE INDEX "idx_cross_dock_order" ON "cross_dock_operations" USING btree ("tenant_id","matched_order_id");--> statement-breakpoint
CREATE INDEX "idx_cross_dock_status" ON "cross_dock_operations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rma_tenant_number" ON "return_authorizations" USING btree ("tenant_id","rma_number");--> statement-breakpoint
CREATE INDEX "idx_rma_tenant_warehouse" ON "return_authorizations" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_rma_tenant_status" ON "return_authorizations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_rma_tenant_customer" ON "return_authorizations" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_rma_tenant_order" ON "return_authorizations" USING btree ("tenant_id","original_order_id");--> statement-breakpoint
CREATE INDEX "idx_return_lines_tenant_rma" ON "return_lines" USING btree ("tenant_id","rma_id");--> statement-breakpoint
CREATE INDEX "idx_return_lines_tenant_variant" ON "return_lines" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_return_lines_tenant_sku" ON "return_lines" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "idx_qc_tenant_rma" ON "quality_inspections" USING btree ("tenant_id","rma_id");--> statement-breakpoint
CREATE INDEX "idx_qc_tenant_line" ON "quality_inspections" USING btree ("tenant_id","return_line_id");--> statement-breakpoint
CREATE INDEX "idx_qc_tenant_status" ON "quality_inspections" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_disposition_tenant_rma" ON "disposition_actions" USING btree ("tenant_id","rma_id");--> statement-breakpoint
CREATE INDEX "idx_disposition_tenant_action" ON "disposition_actions" USING btree ("tenant_id","action_type");--> statement-breakpoint
CREATE INDEX "idx_disposition_tenant_status" ON "disposition_actions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_replenish_rules_unique" ON "replenishment_rules" USING btree ("tenant_id","warehouse_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_replenish_rules_wh" ON "replenishment_rules" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_replenish_rules_variant" ON "replenishment_rules" USING btree ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_replenish_rules_sku" ON "replenishment_rules" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "idx_replenish_recs_wh" ON "replenishment_recommendations" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_replenish_recs_status" ON "replenishment_recommendations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_replenish_recs_rule" ON "replenishment_recommendations" USING btree ("tenant_id","rule_id");