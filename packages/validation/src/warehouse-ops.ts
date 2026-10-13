import { z } from 'zod';

export const StorageZoneTypeSchema = z.enum([
  'BULK_STORAGE',
  'PICKING',
  'COLD_CHAIN',
  'HAZMAT',
  'STAGING',
  'CROSS_DOCK',
]);

export const TemperatureClassSchema = z.enum([
  'AMBIENT',
  'CONTROLLED_ROOM_TEMP',
  'COLD_STORAGE',
  'FROZEN',
  'ULTRA_LOW',
]);

export const HazmatClassSchema = z.enum([
  'NONE',
  'FLAMMABLE',
  'CORROSIVE',
  'TOXIC',
  'OXIDIZER',
  'EXPLOSIVE',
  'RADIOACTIVE',
]);

export const AbcVelocityClassSchema = z.enum([
  'CLASS_A_FAST_MOVING',
  'CLASS_B_MEDIUM_MOVING',
  'CLASS_C_SLOW_MOVING',
]);

export const PutAwayStrategySchema = z.enum([
  'FASTEST_PICK_PROXIMITY',
  'SAME_SKU_CONSOLIDATION',
  'MAX_FILL_RATE',
  'VELOCITY_MATCHED',
]);

export const CreateStorageZoneSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  code: z
    .string()
    .min(1, 'Zone code is required')
    .max(50, 'Zone code cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Zone code may only contain alphanumeric characters, hyphens, and underscores'),
  name: z.string().min(1, 'Zone name is required').max(100),
  zone_type: StorageZoneTypeSchema,
  temperature_class: TemperatureClassSchema.optional().default('AMBIENT'),
  hazmat_class: HazmatClassSchema.optional().default('NONE'),
  is_active: z.boolean().optional().default(true),
  notes: z.string().max(500).nullable().optional(),
});

export const UpdateStorageZoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  zone_type: StorageZoneTypeSchema.optional(),
  temperature_class: TemperatureClassSchema.optional(),
  hazmat_class: HazmatClassSchema.optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const CreatePutAwayRuleSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  name: z.string().min(1, 'Rule name is required').max(100),
  priority: z.number().int().min(1).max(9999).default(100),
  strategy: PutAwayStrategySchema,
  filter_category_id: z.string().nullable().optional(),
  filter_temperature_class: TemperatureClassSchema.nullable().optional(),
  filter_hazmat_class: HazmatClassSchema.nullable().optional(),
  filter_velocity_class: AbcVelocityClassSchema.nullable().optional(),
  destination_zone_id: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

export const UpdatePutAwayRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  priority: z.number().int().min(1).max(9999).optional(),
  strategy: PutAwayStrategySchema.optional(),
  filter_category_id: z.string().nullable().optional(),
  filter_temperature_class: TemperatureClassSchema.nullable().optional(),
  filter_hazmat_class: HazmatClassSchema.nullable().optional(),
  filter_velocity_class: AbcVelocityClassSchema.nullable().optional(),
  destination_zone_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const CalculatePutAwaySchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_weight_kg: z.number().nonnegative().optional(),
  unit_volume_cm3: z.number().nonnegative().optional(),
  temperature_class: TemperatureClassSchema.optional().default('AMBIENT'),
  hazmat_class: HazmatClassSchema.optional().default('NONE'),
  velocity_class: AbcVelocityClassSchema.optional(),
  batch_id: z.string().nullable().optional(),
  preferred_zone_id: z.string().nullable().optional(),
});

// ==========================================
// 6B: Picking Strategies & Waves Validation Schemas
// ==========================================

export const PickingStrategySchema = z.enum([
  'DISCRETE',
  'BATCH',
  'WAVE',
  'ZONE',
]);

export const PickListStatusSchema = z.enum([
  'DRAFT',
  'RELEASED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const PickLineStatusSchema = z.enum([
  'PENDING',
  'PICKED',
  'SHORT_PICKED',
  'CANCELLED',
]);

export const PickWaveStatusSchema = z.enum([
  'PLANNING',
  'RELEASED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const PickWaveCriteriaSchema = z.object({
  carrier_id: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  zone_id: z.string().nullable().optional(),
  max_orders: z.number().int().positive().nullable().optional(),
  max_lines: z.number().int().positive().nullable().optional(),
});

export const CreatePickListLineSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  order_line_id: z.string().min(1, 'Order line ID is required'),
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  batch_id: z.string().nullable().optional(),
  source_location_id: z.string().min(1, 'Source location ID is required'),
  source_location_code: z.string().min(1, 'Source location code is required'),
  zone_id: z.string().nullable().optional(),
  aisle: z.number().int().nonnegative().nullable().optional(),
  rack: z.number().int().nonnegative().nullable().optional(),
  shelf: z.number().int().nonnegative().nullable().optional(),
  bin_position: z.number().int().nonnegative().nullable().optional(),
  quantity_requested: z.number().int().positive('Requested quantity must be positive'),
});

export const CreatePickListSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  wave_id: z.string().nullable().optional(),
  strategy: PickingStrategySchema,
  zone_id: z.string().nullable().optional(),
  staging_location_id: z.string().nullable().optional(),
  order_ids: z.array(z.string().min(1)).min(1, 'At least one order ID is required'),
  lines: z.array(CreatePickListLineSchema).min(1, 'At least one pick line is required'),
});

export const CreatePickWaveSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  strategy: PickingStrategySchema,
  criteria: PickWaveCriteriaSchema.nullable().optional(),
  order_ids: z.array(z.string().min(1)).min(1, 'At least one order ID is required'),
});

export const ConfirmPickLineSchema = z.object({
  quantity_picked: z.number().int().positive('Picked quantity must be positive'),
  batch_id: z.string().nullable().optional(),
});

export const ShortPickSchema = z.object({
  quantity_picked: z.number().int().nonnegative('Picked quantity must be non-negative'),
  short_reason: z.string().min(1, 'Short pick reason is required').max(255),
});

// ----------------------------------------------------------------------------
// Phase 6C: Packing Stations, Containerization & Shipping Manifests Schemas
// ----------------------------------------------------------------------------

export const PackingStationStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'MAINTENANCE',
]);

export const CreatePackingStationSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  station_code: z.string().min(1, 'Station code is required').max(50),
  station_name: z.string().min(1, 'Station name is required').max(100),
  default_staging_location_id: z.string().nullable().optional(),
  scale_device_id: z.string().nullable().optional(),
  printer_device_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdatePackingStationSchema = z.object({
  station_name: z.string().min(1).max(100).optional(),
  status: PackingStationStatusSchema.optional(),
  default_staging_location_id: z.string().nullable().optional(),
  scale_device_id: z.string().nullable().optional(),
  printer_device_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const CreatePackagingBoxSchema = z.object({
  code: z.string().min(1, 'Box code is required').max(50),
  name: z.string().min(1, 'Box name is required').max(100),
  length_mm: z.number().int().positive('Length must be positive mm'),
  width_mm: z.number().int().positive('Width must be positive mm'),
  height_mm: z.number().int().positive('Height must be positive mm'),
  max_weight_grams: z.number().int().positive('Max weight must be positive grams'),
  tare_weight_grams: z.number().int().nonnegative('Tare weight must be non-negative grams'),
});

export const CartonItemRequirementSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  variant_id: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  weight_grams_each: z.number().int().positive('Unit weight must be positive grams'),
  length_mm: z.number().int().positive().optional(),
  width_mm: z.number().int().positive().optional(),
  height_mm: z.number().int().positive().optional(),
});

export const CartonizationRecommendationSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  items: z.array(CartonItemRequirementSchema).min(1, 'At least one item requirement is required'),
});

export const ContainerStatusSchema = z.enum([
  'OPEN',
  'WEIGHED',
  'SEALED',
  'STAGED',
  'LOADED',
  'DISPATCHED',
  'CANCELLED',
]);

export const OpenPackedContainerSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  station_id: z.string().nullable().optional(),
  box_type_id: z.string().nullable().optional(),
  tracking_number: z.string().nullable().optional(),
});

export const PackItemIntoContainerSchema = z.object({
  pick_list_line_id: z.string().nullable().optional(),
  order_id: z.string().min(1, 'Order ID is required'),
  order_line_id: z.string().min(1, 'Order line ID is required'),
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_weight_grams: z.number().int().positive('Unit weight must be positive grams'),
  batch_id: z.string().nullable().optional(),
  serial_numbers: z.array(z.string().min(1)).nullable().optional(),
});

export const SealContainerSchema = z.object({
  scale_weight_grams: z.number().int().positive('Scale weight must be positive grams'),
  seal_number: z.string().nullable().optional(),
  tolerance_percentage_bp: z.number().int().min(1).max(5000).default(200).optional(),
});

export const ShippingManifestStatusSchema = z.enum([
  'DRAFT',
  'SEALED',
  'DISPATCHED',
  'CANCELLED',
]);

export const CreateShippingManifestSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  carrier_id: z.string().min(1, 'Carrier ID is required'),
  carrier_name: z.string().min(1, 'Carrier name is required'),
  vehicle_reference: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
  driver_phone: z.string().nullable().optional(),
});

export const AddContainersToManifestSchema = z.object({
  container_ids: z.array(z.string().min(1)).min(1, 'At least one container ID is required'),
});

export const DispatchManifestSchema = z.object({
  vehicle_reference: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
  driver_phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ----------------------------------------------------------------------------
// Phase 6D: Bin Transfers, Cross-Docking & Barcode Logistics Schemas
// ----------------------------------------------------------------------------

export const ParseBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode string cannot be empty'),
  warehouse_id: z.string().nullable().optional(),
});

export const TransferTypeSchema = z.enum([
  'INTERNAL_BIN_MOVE',
  'ZONE_TRANSFER',
  'REPLENISHMENT',
  'CROSS_DOCK',
]);

export const TransferStatusSchema = z.enum([
  'PENDING',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
]);

export const CreateInternalTransferLineSchema = z.object({
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_weight_kg: z.number().positive().optional(),
  unit_volume_cm3: z.number().positive().optional(),
  batch_id: z.string().nullable().optional(),
  serial_numbers: z.array(z.string().min(1)).nullable().optional(),
});

export const CreateInternalTransferSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  transfer_type: TransferTypeSchema,
  source_location_id: z.string().min(1, 'Source location ID is required'),
  destination_location_id: z.string().min(1, 'Destination location ID is required'),
  lines: z.array(CreateInternalTransferLineSchema).min(1, 'At least one line item is required'),
  operator_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const CrossDockPrioritySchema = z.enum(['URGENT', 'HIGH', 'NORMAL']);

export const CrossDockDemandItemSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  order_line_id: z.string().min(1, 'Order line ID is required'),
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity_demanded: z.number().int().positive('Quantity demanded must be positive'),
  priority: CrossDockPrioritySchema,
});

export const EvaluateCrossDockOpportunitiesSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  inbound_receipt_id: z.string().min(1, 'Inbound receipt ID is required'),
  inbound_items: z
    .array(
      z.object({
        inbound_line_id: z.string().min(1, 'Inbound line ID is required'),
        variant_id: z.string().min(1, 'Variant ID is required'),
        sku: z.string().min(1, 'SKU is required'),
        quantity: z.number().int().positive('Inbound quantity must be positive'),
      }),
    )
    .min(1, 'At least one inbound item is required'),
  pending_demands: z.array(CrossDockDemandItemSchema),
  staging_location_id: z.string().min(1, 'Staging location ID is required'),
});

export const ExecuteCrossDockBypassSchema = z.object({
  opportunity_id: z.string().min(1, 'Opportunity ID is required'),
  operator_id: z.string().nullable().optional(),
});


