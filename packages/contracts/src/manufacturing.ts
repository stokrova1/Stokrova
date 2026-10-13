/**
 * Manufacturing, Bill of Materials (BOM), Work Centers & Routing Contracts (Phase 5)
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

// ==========================================
// 5A: Bill of Materials (BOM) & Scrap Rate
// ==========================================

export type BomType = 'MANUFACTURE' | 'KIT' | 'SUBCONTRACT';
export type BomStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface BomLine {
  id: string;
  tenant_id: string;
  bom_id: string;
  component_variant_id: string;
  quantity: number;
  scrap_percentage_basis_points: number; // e.g. 250 = 2.50% scrap
  fixed_scrap_quantity: number;
  operation_step_number: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BomByproduct {
  id: string;
  tenant_id: string;
  bom_id: string;
  variant_id: string;
  quantity: number;
  cost_allocation_basis_points: number; // e.g. 500 = 5.00%
  created_at: string;
  updated_at: string;
}

export interface BillOfMaterials {
  id: string;
  tenant_id: string;
  bom_number: string;
  variant_id: string;
  version: number;
  revision_label: string;
  type: BomType;
  status: BomStatus;
  output_quantity: number;
  routing_id: string | null;
  notes: string | null;
  is_active_revision: boolean;
  created_at: string;
  updated_at: string;
  lines?: BomLine[];
  byproducts?: BomByproduct[];
}

export interface CreateBomLineRequest {
  component_variant_id: string;
  quantity: number;
  scrap_percentage_basis_points?: number;
  fixed_scrap_quantity?: number;
  operation_step_number?: number | null;
  notes?: string | null;
}

export interface CreateBomByproductRequest {
  variant_id: string;
  quantity: number;
  cost_allocation_basis_points?: number;
}

export interface CreateBillOfMaterialsRequest {
  variant_id: string;
  version?: number;
  revision_label?: string;
  type?: BomType;
  output_quantity?: number;
  routing_id?: string | null;
  notes?: string | null;
  is_active_revision?: boolean;
  lines: CreateBomLineRequest[];
  byproducts?: CreateBomByproductRequest[];
}

export interface UpdateBillOfMaterialsRequest {
  revision_label?: string;
  status?: BomStatus;
  output_quantity?: number;
  routing_id?: string | null;
  notes?: string | null;
  is_active_revision?: boolean;
  lines?: CreateBomLineRequest[];
  byproducts?: CreateBomByproductRequest[];
}

export interface BillOfMaterialsResponse {
  bom: BillOfMaterials;
}

export interface ListBillOfMaterialsResponse {
  boms: BillOfMaterials[];
}

export interface BomExplosionItem {
  variant_id: string;
  level: number;
  parent_variant_id: string | null;
  unit_quantity: number;
  total_quantity: number;
  scrap_quantity: number;
  gross_quantity: number;
  is_subassembly: boolean;
  sub_bom_id: string | null;
}

export interface ExplodeBomResponse {
  target_variant_id: string;
  target_quantity: number;
  explosion: BomExplosionItem[];
}

// ==========================================
// 5B: Work Centers, Capacities & Rates
// ==========================================

export type MfgWorkCenterStatus = 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';

export interface MfgWorkCenter {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  code: string;
  name: string;
  status: MfgWorkCenterStatus;
  capacity_units_per_hour: number;
  efficiency_basis_points: number; // 10000 = 100%
  hourly_labor_rate_minor: string;
  hourly_machine_rate_minor: string;
  hourly_overhead_rate_minor: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMfgWorkCenterRequest {
  warehouse_id: string;
  code: string;
  name: string;
  capacity_units_per_hour?: number;
  efficiency_basis_points?: number;
  hourly_labor_rate_minor: string | number;
  hourly_machine_rate_minor: string | number;
  hourly_overhead_rate_minor?: string | number;
  notes?: string | null;
}

export interface UpdateMfgWorkCenterRequest {
  name?: string;
  status?: MfgWorkCenterStatus;
  capacity_units_per_hour?: number;
  efficiency_basis_points?: number;
  hourly_labor_rate_minor?: string | number;
  hourly_machine_rate_minor?: string | number;
  hourly_overhead_rate_minor?: string | number;
  notes?: string | null;
}

export interface MfgWorkCenterResponse {
  work_center: MfgWorkCenter;
}

export interface ListMfgWorkCentersResponse {
  work_centers: MfgWorkCenter[];
}

// ==========================================
// 5C: Routings & Operation Time Standards
// ==========================================

export interface RoutingOperation {
  id: string;
  tenant_id: string;
  routing_id: string;
  operation_number: number; // 10, 20, 30...
  name: string;
  work_center_id: string;
  setup_time_minutes: number;
  run_time_minutes_per_unit: number;
  teardown_time_minutes: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Routing {
  id: string;
  tenant_id: string;
  routing_number: string;
  name: string;
  variant_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  operations?: RoutingOperation[];
}

export interface CreateRoutingOperationRequest {
  operation_number: number;
  name: string;
  work_center_id: string;
  setup_time_minutes?: number;
  run_time_minutes_per_unit: number;
  teardown_time_minutes?: number;
  description?: string | null;
}

export interface CreateRoutingRequest {
  name: string;
  variant_id?: string | null;
  is_active?: boolean;
  notes?: string | null;
  operations: CreateRoutingOperationRequest[];
}

export interface RoutingResponse {
  routing: Routing;
}

export interface ListRoutingsResponse {
  routings: Routing[];
}

// ==========================================
// 5D: Manufacturing Orders (MO) Lifecycle
// ==========================================

export type ManufacturingOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'INSPECTION'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type ManufacturingOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface MoComponent {
  id: string;
  tenant_id: string;
  manufacturing_order_id: string;
  variant_id: string;
  required_quantity: number;
  consumed_quantity: number;
  unit_cost_minor: string;
  total_cost_minor: string;
  is_backflushed: boolean;
  location_id: string;
  created_at: string;
  updated_at: string;
}

export interface MoWorkOrder {
  id: string;
  tenant_id: string;
  manufacturing_order_id: string;
  operation_id: string | null;
  work_center_id: string;
  operation_number: number;
  name: string;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  actual_duration_minutes: number;
  labor_cost_minor: string;
  machine_cost_minor: string;
  overhead_cost_minor: string;
  total_operation_cost_minor: string;
  operator_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManufacturingOrder {
  id: string;
  tenant_id: string;
  mo_number: string;
  variant_id: string;
  bom_id: string;
  routing_id: string | null;
  warehouse_id: string;
  destination_location_id: string;
  target_quantity: number;
  produced_quantity: number;
  scrapped_quantity: number;
  status: ManufacturingOrderStatus;
  priority: ManufacturingOrderPriority;
  lot_number: string | null;
  scheduled_start_date: string | null;
  scheduled_completion_date: string | null;
  actual_start_date: string | null;
  actual_completion_date: string | null;
  total_material_cost_minor: string;
  total_labor_cost_minor: string;
  total_overhead_cost_minor: string;
  total_production_cost_minor: string;
  unit_production_cost_minor: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  components?: MoComponent[];
  work_orders?: MoWorkOrder[];
}

export interface CreateManufacturingOrderRequest {
  variant_id: string;
  bom_id: string;
  warehouse_id: string;
  destination_location_id: string;
  target_quantity: number;
  routing_id?: string | null;
  priority?: ManufacturingOrderPriority;
  lot_number?: string | null;
  scheduled_start_date?: string | null;
  scheduled_completion_date?: string | null;
  notes?: string | null;
}

export interface ManufacturingOrderResponse {
  order: ManufacturingOrder;
}

export interface ListManufacturingOrdersResponse {
  orders: ManufacturingOrder[];
}

// ==========================================
// 5E: Execution, Backflushing & Completion
// ==========================================

export interface RecordWorkOrderExecutionRequest {
  work_order_id: string;
  actual_duration_minutes: number;
  operator_user_id?: string | null;
  backflush_components?: boolean;
}

export interface IssueMoComponentsRequest {
  consumptions: {
    component_id: string;
    quantity: number;
    unit_cost_minor?: string | number;
  }[];
}

export interface CompleteManufacturingOrderRequest {
  produced_quantity: number;
  scrapped_quantity?: number;
  lot_number?: string | null;
}

// ==========================================
// 5F: Partial Runs, Inspections & Scrap
// ==========================================

export interface MoExecutionRun {
  id: string;
  tenant_id: string;
  manufacturing_order_id: string;
  run_number: number;
  good_quantity: number;
  scrapped_quantity: number;
  notes: string | null;
  operator_user_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export type OutputInspectionStatus = 'PENDING' | 'ACCEPTED' | 'QUARANTINED' | 'REJECTED';

export interface MoOutputInspection {
  id: string;
  tenant_id: string;
  manufacturing_order_id: string;
  run_id: string | null;
  inspection_number: string;
  status: OutputInspectionStatus;
  inspected_quantity: number;
  accepted_quantity: number;
  quarantined_quantity: number;
  rejected_quantity: number;
  failure_reason: string | null;
  notes: string | null;
  inspector_user_id: string | null;
  inspected_at: string | null;
  created_at: string;
}

export type ScrapReasonCode = 'DEFECT' | 'PROCESS_LOSS' | 'MACHINE_FAILURE' | 'EXPIRED' | 'OTHER';

export interface MoScrapRecord {
  id: string;
  tenant_id: string;
  manufacturing_order_id: string;
  scrap_number: string;
  variant_id: string;
  quantity: number;
  reason_code: ScrapReasonCode;
  is_process_loss: boolean;
  stock_movement_id: string | null;
  notes: string | null;
  operator_user_id: string | null;
  created_at: string;
}

export interface MoComponentSubstitution {
  id: string;
  tenant_id: string;
  manufacturing_order_id: string;
  original_variant_id: string;
  substituted_variant_id: string;
  quantity: number;
  approved_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface RecordExecutionRunRequest {
  good_quantity: number;
  scrapped_quantity?: number;
  notes?: string | null;
  operator_user_id?: string | null;
}

export interface RecordOutputInspectionRequest {
  run_id?: string | null;
  inspected_quantity: number;
  accepted_quantity: number;
  quarantined_quantity?: number;
  rejected_quantity?: number;
  failure_reason?: string | null;
  notes?: string | null;
  inspector_user_id?: string | null;
}

export interface RecordScrapRequest {
  variant_id: string;
  quantity: number;
  reason_code?: ScrapReasonCode;
  is_process_loss?: boolean;
  notes?: string | null;
  operator_user_id?: string | null;
}

export interface SubstituteComponentRequest {
  original_variant_id: string;
  substituted_variant_id: string;
  quantity: number;
  reason?: string | null;
  approved_by?: string | null;
}

// ==========================================
// 5G: Material Shortages & Traceability
// ==========================================

export interface MaterialShortageItem {
  variant_id: string;
  sku: string;
  name: string;
  required_quantity: number;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_to_promise: number;
  shortage_quantity: number;
  is_shortage: boolean;
}

export interface MaterialShortageReportResponse {
  order_id: string;
  mo_number: string;
  warehouse_id: string;
  has_shortages: boolean;
  items: MaterialShortageItem[];
}

export interface ForwardTraceabilityItem {
  source_batch_id: string;
  source_variant_id: string;
  production_order_id: string;
  production_order_number: string;
  produced_lot_number: string | null;
  produced_variant_id: string;
  quantity_consumed: number;
  quantity_produced: number;
}

export interface BackwardTraceabilityItem {
  finished_variant_id: string;
  finished_lot_number: string | null;
  production_order_id: string;
  production_order_number: string;
  component_variant_id: string;
  component_batch_id: string | null;
  component_lot_number: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  goods_receipt_id: string | null;
}

export interface BatchRecallTraceabilityResponse {
  target_type: 'COMPONENT_BATCH' | 'FINISHED_LOT';
  target_identifier: string;
  forward_trace: ForwardTraceabilityItem[];
  backward_trace: BackwardTraceabilityItem[];
}

