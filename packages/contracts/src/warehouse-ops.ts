/**
 * STOKROVA Warehouse Operations & Logistics Contracts (Phase 6)
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

// ==========================================
// 6A: Directed Put-Away, Velocity & Zones
// ==========================================

export type StorageZoneType =
  | 'BULK_STORAGE'
  | 'PICKING'
  | 'COLD_CHAIN'
  | 'HAZMAT'
  | 'STAGING'
  | 'CROSS_DOCK';

export type TemperatureClass =
  | 'AMBIENT'
  | 'CONTROLLED_ROOM_TEMP' // 15°C - 25°C
  | 'COLD_STORAGE'         // 2°C - 8°C
  | 'FROZEN'               // -20°C
  | 'ULTRA_LOW';           // -80°C

export type HazmatClass =
  | 'NONE'
  | 'FLAMMABLE'
  | 'CORROSIVE'
  | 'TOXIC'
  | 'OXIDIZER'
  | 'EXPLOSIVE'
  | 'RADIOACTIVE';

export type AbcVelocityClass =
  | 'CLASS_A_FAST_MOVING'
  | 'CLASS_B_MEDIUM_MOVING'
  | 'CLASS_C_SLOW_MOVING';

export type PutAwayStrategy =
  | 'FASTEST_PICK_PROXIMITY'
  | 'SAME_SKU_CONSOLIDATION'
  | 'MAX_FILL_RATE'
  | 'VELOCITY_MATCHED';

export interface StorageZone {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  code: string;
  name: string;
  zone_type: StorageZoneType;
  temperature_class: TemperatureClass;
  hazmat_class: HazmatClass;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PutAwayRule {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  name: string;
  priority: number; // lower number = higher priority
  strategy: PutAwayStrategy;
  filter_category_id: string | null;
  filter_temperature_class: TemperatureClass | null;
  filter_hazmat_class: HazmatClass | null;
  filter_velocity_class: AbcVelocityClass | null;
  destination_zone_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// DTOs: Requests & Responses for Phase 6A
// ----------------------------------------------------------------------------

export interface CreateStorageZoneRequest {
  warehouse_id: string;
  code: string;
  name: string;
  zone_type: StorageZoneType;
  temperature_class?: TemperatureClass;
  hazmat_class?: HazmatClass;
  is_active?: boolean;
  notes?: string | null;
}

export interface UpdateStorageZoneRequest {
  name?: string;
  zone_type?: StorageZoneType;
  temperature_class?: TemperatureClass;
  hazmat_class?: HazmatClass;
  is_active?: boolean;
  notes?: string | null;
}

export interface StorageZoneResponse {
  zone: StorageZone;
}

export interface ListStorageZonesResponse {
  zones: StorageZone[];
}

export interface CreatePutAwayRuleRequest {
  warehouse_id: string;
  name: string;
  priority: number;
  strategy: PutAwayStrategy;
  filter_category_id?: string | null;
  filter_temperature_class?: TemperatureClass | null;
  filter_hazmat_class?: HazmatClass | null;
  filter_velocity_class?: AbcVelocityClass | null;
  destination_zone_id?: string | null;
  is_active?: boolean;
}

export interface UpdatePutAwayRuleRequest {
  name?: string;
  priority?: number;
  strategy?: PutAwayStrategy;
  filter_category_id?: string | null;
  filter_temperature_class?: TemperatureClass | null;
  filter_hazmat_class?: HazmatClass | null;
  filter_velocity_class?: AbcVelocityClass | null;
  destination_zone_id?: string | null;
  is_active?: boolean;
}

export interface PutAwayRuleResponse {
  rule: PutAwayRule;
}

export interface ListPutAwayRulesResponse {
  rules: PutAwayRule[];
}

export interface CalculatePutAwayRequest {
  warehouse_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  unit_weight_kg?: number;
  unit_volume_cm3?: number;
  temperature_class?: TemperatureClass;
  hazmat_class?: HazmatClass;
  velocity_class?: AbcVelocityClass;
  batch_id?: string | null;
  preferred_zone_id?: string | null;
}

export interface PutAwayRecommendation {
  location_id: string;
  location_code: string;
  zone_id: string | null;
  score: number;
  reasons: string[];
  available_weight_kg: number | null;
  available_volume_cm3: number | null;
  existing_sku_count: number;
}

export interface CalculatePutAwayResponse {
  variant_id: string;
  sku: string;
  quantity: number;
  best_match_location_id: string | null;
  recommendations: PutAwayRecommendation[];
}

// ==========================================
// 6B: Picking Strategies (Discrete, Batch, Wave & Zone)
// ==========================================

export type PickingStrategy = 'DISCRETE' | 'BATCH' | 'WAVE' | 'ZONE';

export type PickListStatus =
  | 'DRAFT'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PickLineStatus =
  | 'PENDING'
  | 'PICKED'
  | 'SHORT_PICKED'
  | 'CANCELLED';

export type PickWaveStatus =
  | 'PLANNING'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PickWaveCriteria {
  carrier_id?: string | null;
  customer_id?: string | null;
  zone_id?: string | null;
  max_orders?: number | null;
  max_lines?: number | null;
}

export interface PickWave {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  wave_number: string;
  status: PickWaveStatus;
  strategy: PickingStrategy;
  criteria?: PickWaveCriteria | null;
  total_orders: number;
  total_lines: number;
  released_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PickListLine {
  id: string;
  tenant_id: string;
  pick_list_id: string;
  order_id: string;
  order_line_id: string;
  variant_id: string;
  sku: string;
  batch_id?: string | null;
  source_location_id: string;
  source_location_code: string;
  zone_id?: string | null;
  aisle?: number | null;
  rack?: number | null;
  shelf?: number | null;
  bin_position?: number | null;
  pick_sequence: number;
  quantity_requested: number;
  quantity_picked: number;
  quantity_short: number;
  status: PickLineStatus;
  short_reason?: string | null;
  picked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PickList {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  wave_id?: string | null;
  pick_list_number: string;
  strategy: PickingStrategy;
  status: PickListStatus;
  picker_id?: string | null;
  zone_id?: string | null;
  staging_location_id?: string | null;
  order_ids: string[];
  lines: PickListLine[];
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// DTOs for Phase 6B
// ----------------------------------------------------------------------------

export interface CreatePickListLineRequest {
  order_id: string;
  order_line_id: string;
  variant_id: string;
  sku: string;
  batch_id?: string | null;
  source_location_id: string;
  source_location_code: string;
  zone_id?: string | null;
  aisle?: number | null;
  rack?: number | null;
  shelf?: number | null;
  bin_position?: number | null;
  quantity_requested: number;
}

export interface CreatePickListRequest {
  warehouse_id: string;
  wave_id?: string | null;
  strategy: PickingStrategy;
  zone_id?: string | null;
  staging_location_id?: string | null;
  order_ids: string[];
  lines: CreatePickListLineRequest[];
}

export interface CreatePickWaveRequest {
  warehouse_id: string;
  strategy: PickingStrategy;
  criteria?: PickWaveCriteria | null;
  order_ids: string[];
}

export interface ConfirmPickLineRequest {
  quantity_picked: number;
  batch_id?: string | null;
}

export interface ShortPickRequest {
  quantity_picked: number;
  short_reason: string;
}

export interface PickListResponse {
  pick_list: PickList;
}

export interface ListPickListsResponse {
  pick_lists: PickList[];
}

export interface PickWaveResponse {
  wave: PickWave;
  pick_lists?: PickList[];
}

export interface ListPickWavesResponse {
  waves: PickWave[];
}

export interface OptimizeRoutingResponse {
  pick_list_id: string;
  ordered_lines: PickListLine[];
}

// ----------------------------------------------------------------------------
// Phase 6C: Packing Stations, Containerization & Shipping Manifests
// ----------------------------------------------------------------------------

export type PackingStationStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface PackingStation {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  station_code: string;
  station_name: string;
  status: PackingStationStatus;
  default_staging_location_id?: string | null;
  scale_device_id?: string | null;
  printer_device_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackagingBoxType {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  max_weight_grams: number;
  tare_weight_grams: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ContainerStatus =
  | 'OPEN'
  | 'WEIGHED'
  | 'SEALED'
  | 'STAGED'
  | 'LOADED'
  | 'DISPATCHED'
  | 'CANCELLED';

export interface PackedContainerLine {
  id: string;
  tenant_id: string;
  container_id: string;
  pick_list_line_id?: string | null;
  order_id: string;
  order_line_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  batch_id?: string | null;
  serial_numbers?: string[] | null;
  created_at: string;
}

export interface PackedContainer {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  station_id?: string | null;
  box_type_id?: string | null;
  container_number: string;
  sscc_barcode: string;
  tracking_number?: string | null;
  status: ContainerStatus;
  tare_weight_grams: number;
  net_weight_grams: number;
  gross_weight_grams: number;
  scale_verified_weight_grams?: number | null;
  weight_discrepancy_grams?: number | null;
  manifest_id?: string | null;
  seal_number?: string | null;
  lines: PackedContainerLine[];
  sealed_at?: string | null;
  dispatched_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ShippingManifestStatus = 'DRAFT' | 'SEALED' | 'DISPATCHED' | 'CANCELLED';

export interface ShippingManifest {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  manifest_number: string;
  carrier_id: string;
  carrier_name: string;
  status: ShippingManifestStatus;
  vehicle_reference?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  total_containers: number;
  total_gross_weight_grams: number;
  containers?: PackedContainer[];
  sealed_at?: string | null;
  dispatched_at?: string | null;
  created_at: string;
  updated_at: string;
}

// DTOs for Phase 6C

export interface CreatePackingStationRequest {
  warehouse_id: string;
  station_code: string;
  station_name: string;
  default_staging_location_id?: string | null;
  scale_device_id?: string | null;
  printer_device_id?: string | null;
  notes?: string | null;
}

export interface UpdatePackingStationRequest {
  station_name?: string;
  status?: PackingStationStatus;
  default_staging_location_id?: string | null;
  scale_device_id?: string | null;
  printer_device_id?: string | null;
  notes?: string | null;
}

export interface PackingStationResponse {
  station: PackingStation;
}

export interface ListPackingStationsResponse {
  stations: PackingStation[];
}

export interface CreatePackagingBoxRequest {
  code: string;
  name: string;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  max_weight_grams: number;
  tare_weight_grams: number;
}

export interface PackagingBoxResponse {
  box: PackagingBoxType;
}

export interface ListPackagingBoxesResponse {
  boxes: PackagingBoxType[];
}

export interface CartonItemRequirement {
  sku: string;
  variant_id: string;
  quantity: number;
  weight_grams_each: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
}

export interface CartonizationRecommendationRequest {
  warehouse_id: string;
  items: CartonItemRequirement[];
}

export interface CartonBoxAssignment {
  box_type_id: string;
  box_code: string;
  box_name: string;
  estimated_gross_weight_grams: number;
  fill_percentage_bp: number;
  items: { variant_id: string; sku: string; quantity: number }[];
}

export interface CartonizationRecommendationResponse {
  total_cartons: number;
  cartons: CartonBoxAssignment[];
}

export interface OpenPackedContainerRequest {
  warehouse_id: string;
  station_id?: string | null;
  box_type_id?: string | null;
  tracking_number?: string | null;
}

export interface PackItemIntoContainerRequest {
  pick_list_line_id?: string | null;
  order_id: string;
  order_line_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  unit_weight_grams: number;
  batch_id?: string | null;
  serial_numbers?: string[] | null;
}

export interface SealContainerRequest {
  scale_weight_grams: number;
  seal_number?: string | null;
  tolerance_percentage_bp?: number;
}

export interface PackedContainerResponse {
  container: PackedContainer;
}

export interface ListPackedContainersResponse {
  containers: PackedContainer[];
}

export interface CreateShippingManifestRequest {
  warehouse_id: string;
  carrier_id: string;
  carrier_name: string;
  vehicle_reference?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
}

export interface AddContainersToManifestRequest {
  container_ids: string[];
}

export interface DispatchManifestRequest {
  vehicle_reference?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  notes?: string | null;
}

export interface ShippingManifestResponse {
  manifest: ShippingManifest;
}

export interface ListShippingManifestsResponse {
  manifests: ShippingManifest[];
}

// ----------------------------------------------------------------------------
// Phase 6D: Bin Transfers, Cross-Docking & Barcode Logistics Engine Contracts
// ----------------------------------------------------------------------------

export interface GS1BarcodeElement {
  ai: string;
  label: string;
  raw_value: string;
  parsed_value: string | number;
}

export interface GS1ParsedPayload {
  raw_barcode: string;
  elements: GS1BarcodeElement[];
  gtin?: string | null;
  batch_id?: string | null;
  expiry_date?: string | null;
  serial_number?: string | null;
  sscc?: string | null;
  weight_grams?: number | null;
  count?: number | null;
}

export interface ParseBarcodeRequest {
  barcode: string;
  warehouse_id?: string | null;
}

export interface ParseBarcodeResponse {
  parsed: GS1ParsedPayload;
  matched_variant_id?: string | null;
}

export type TransferType =
  | 'INTERNAL_BIN_MOVE'
  | 'ZONE_TRANSFER'
  | 'REPLENISHMENT'
  | 'CROSS_DOCK';

export type TransferStatus =
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface InternalTransferLine {
  id: string;
  tenant_id: string;
  transfer_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  batch_id?: string | null;
  serial_numbers?: string[] | null;
  created_at: string;
}

export interface InternalBinTransfer {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  transfer_number: string;
  transfer_type: TransferType;
  status: TransferStatus;
  source_location_id: string;
  source_location_code: string;
  destination_location_id: string;
  destination_location_code: string;
  lines: InternalTransferLine[];
  operator_id?: string | null;
  notes?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInternalTransferLineRequest {
  variant_id: string;
  sku: string;
  quantity: number;
  unit_weight_kg?: number;
  unit_volume_cm3?: number;
  batch_id?: string | null;
  serial_numbers?: string[] | null;
}

export interface CreateInternalTransferRequest {
  warehouse_id: string;
  transfer_type: TransferType;
  source_location_id: string;
  destination_location_id: string;
  lines: CreateInternalTransferLineRequest[];
  operator_id?: string | null;
  notes?: string | null;
}

export interface InternalTransferResponse {
  transfer: InternalBinTransfer;
}

export interface ListInternalTransfersResponse {
  transfers: InternalBinTransfer[];
}

export type CrossDockStatus =
  | 'PLANNED'
  | 'DIRECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CrossDockDemandItem {
  order_id: string;
  order_line_id: string;
  variant_id: string;
  sku: string;
  quantity_demanded: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
}

export interface CrossDockOpportunity {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  variant_id: string;
  sku: string;
  inbound_receipt_id: string;
  inbound_line_id: string;
  matched_order_id: string;
  matched_order_line_id: string;
  quantity_to_cross_dock: number;
  target_staging_location_id: string;
  target_staging_location_code: string;
  status: CrossDockStatus;
  created_at: string;
  completed_at?: string | null;
}

export interface EvaluateCrossDockOpportunitiesRequest {
  warehouse_id: string;
  inbound_receipt_id: string;
  inbound_items: Array<{
    inbound_line_id: string;
    variant_id: string;
    sku: string;
    quantity: number;
  }>;
  pending_demands: CrossDockDemandItem[];
  staging_location_id: string;
}

export interface ExecuteCrossDockBypassRequest {
  opportunity_id: string;
  operator_id?: string | null;
}

export interface CrossDockOpportunityResponse {
  opportunity: CrossDockOpportunity;
}

export interface ListCrossDockOpportunitiesResponse {
  opportunities: CrossDockOpportunity[];
}


