/**
 * Manufacturing, BOM, Work Centers & Routing Validation Schemas (Phase 5)
 * Zero external runtime dependencies other than Zod.
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

import { z } from 'zod';

const NonNegativeIntegerOrStringSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((val) => val.toString());

// ==========================================
// 5A: Bill of Materials (BOM)
// ==========================================

export const BomTypes = ['MANUFACTURE', 'KIT', 'SUBCONTRACT'] as const;
export const BomTypeSchema = z.enum(BomTypes);

export const BomStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export const BomStatusSchema = z.enum(BomStatuses);

export const CreateBomLineSchema = z.object({
  component_variant_id: z.string().min(1, 'component_variant_id is required'),
  quantity: z.number().int().positive('Component quantity must be positive'),
  scrap_percentage_basis_points: z.number().int().min(0).max(10000).optional().default(0),
  fixed_scrap_quantity: z.number().int().nonnegative().optional().default(0),
  operation_step_number: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const CreateBomByproductSchema = z.object({
  variant_id: z.string().min(1, 'byproduct variant_id is required'),
  quantity: z.number().int().positive('Byproduct quantity must be positive'),
  cost_allocation_basis_points: z.number().int().min(0).max(10000).optional().default(0),
});

export const CreateBillOfMaterialsSchema = z.object({
  variant_id: z.string().min(1, 'Finished good variant_id is required'),
  version: z.number().int().positive().optional().default(1),
  revision_label: z.string().trim().max(50).optional().default('REV-A'),
  type: BomTypeSchema.optional().default('MANUFACTURE'),
  output_quantity: z.number().int().positive().optional().default(1),
  routing_id: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  is_active_revision: z.boolean().optional().default(true),
  lines: z.array(CreateBomLineSchema).min(1, 'BOM must contain at least one component line'),
  byproducts: z.array(CreateBomByproductSchema).optional().default([]),
});

export const UpdateBillOfMaterialsSchema = z.object({
  revision_label: z.string().trim().max(50).optional(),
  status: BomStatusSchema.optional(),
  output_quantity: z.number().int().positive().optional(),
  routing_id: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  is_active_revision: z.boolean().optional(),
  lines: z.array(CreateBomLineSchema).min(1).optional(),
  byproducts: z.array(CreateBomByproductSchema).optional(),
});

export const ExplodeBomSchema = z.object({
  target_quantity: z.number().int().positive().optional().default(1),
});

// ==========================================
// 5B: Work Centers & Capacities
// ==========================================

export const MfgWorkCenterStatuses = ['ACTIVE', 'MAINTENANCE', 'OFFLINE'] as const;
export const MfgWorkCenterStatusSchema = z.enum(MfgWorkCenterStatuses);

export const CreateMfgWorkCenterSchema = z.object({
  warehouse_id: z.string().min(1, 'warehouse_id is required'),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code must be alphanumeric with hyphens or underscores'),
  name: z.string().trim().min(1, 'Work center name is required').max(150),
  capacity_units_per_hour: z.number().int().positive().optional().default(1),
  efficiency_basis_points: z.number().int().min(1).max(20000).optional().default(10000), // 100.00% default
  hourly_labor_rate_minor: NonNegativeIntegerOrStringSchema,
  hourly_machine_rate_minor: NonNegativeIntegerOrStringSchema,
  hourly_overhead_rate_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const UpdateMfgWorkCenterSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  status: MfgWorkCenterStatusSchema.optional(),
  capacity_units_per_hour: z.number().int().positive().optional(),
  efficiency_basis_points: z.number().int().min(1).max(20000).optional(),
  hourly_labor_rate_minor: NonNegativeIntegerOrStringSchema.optional(),
  hourly_machine_rate_minor: NonNegativeIntegerOrStringSchema.optional(),
  hourly_overhead_rate_minor: NonNegativeIntegerOrStringSchema.optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// ==========================================
// 5C: Routings & Operation Time Standards
// ==========================================

export const CreateRoutingOperationSchema = z.object({
  operation_number: z.number().int().positive('operation_number must be positive (e.g. 10, 20)'),
  name: z.string().trim().min(1, 'Operation name is required').max(150),
  work_center_id: z.string().min(1, 'work_center_id is required'),
  setup_time_minutes: z.number().int().nonnegative().optional().default(0),
  run_time_minutes_per_unit: z.number().int().nonnegative('Run time must be non-negative'),
  teardown_time_minutes: z.number().int().nonnegative().optional().default(0),
  description: z.string().trim().max(500).nullable().optional(),
});

export const CreateRoutingSchema = z.object({
  name: z.string().trim().min(1, 'Routing name is required').max(150),
  variant_id: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
  notes: z.string().trim().max(500).nullable().optional(),
  operations: z.array(CreateRoutingOperationSchema).min(1, 'Routing must contain at least one operation'),
});

// ==========================================
// 5D: Manufacturing Orders (MO) Lifecycle
// ==========================================

export const ManufacturingOrderPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const ManufacturingOrderPrioritySchema = z.enum(ManufacturingOrderPriorities);

export const CreateManufacturingOrderSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  bom_id: z.string().min(1, 'bom_id is required'),
  warehouse_id: z.string().min(1, 'warehouse_id is required'),
  destination_location_id: z.string().min(1, 'destination_location_id is required'),
  target_quantity: z.number().int().positive('target_quantity must be positive'),
  routing_id: z.string().nullable().optional(),
  priority: ManufacturingOrderPrioritySchema.optional().default('NORMAL'),
  lot_number: z.string().trim().max(100).nullable().optional(),
  scheduled_start_date: z.string().datetime().nullable().optional(),
  scheduled_completion_date: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// ==========================================
// 5E: Execution, Backflushing & Completion
// ==========================================

export const RecordWorkOrderExecutionSchema = z.object({
  work_order_id: z.string().min(1, 'work_order_id is required'),
  actual_duration_minutes: z.number().int().positive('Duration must be positive'),
  operator_user_id: z.string().nullable().optional(),
  backflush_components: z.boolean().optional().default(true),
});

export const IssueMoComponentsSchema = z.object({
  consumptions: z.array(
    z.object({
      component_id: z.string().min(1, 'component_id is required'),
      quantity: z.number().int().positive('Quantity must be positive'),
      unit_cost_minor: NonNegativeIntegerOrStringSchema.optional(),
    }),
  ).min(1),
});

export const CompleteManufacturingOrderSchema = z.object({
  produced_quantity: z.number().int().positive('produced_quantity must be positive'),
  scrapped_quantity: z.number().int().nonnegative().optional().default(0),
  lot_number: z.string().trim().max(100).nullable().optional(),
});

// ==========================================
// 5F: Partial Runs, Inspections & Scrap Validation
// ==========================================

export const RecordExecutionRunSchema = z.object({
  good_quantity: z.number().int().positive('good_quantity must be positive'),
  scrapped_quantity: z.number().int().nonnegative().optional().default(0),
  notes: z.string().trim().max(500).nullable().optional(),
  operator_user_id: z.string().nullable().optional(),
});

export const OutputInspectionStatuses = ['PENDING', 'ACCEPTED', 'QUARANTINED', 'REJECTED'] as const;
export const OutputInspectionStatusSchema = z.enum(OutputInspectionStatuses);

export const RecordOutputInspectionSchema = z.object({
  run_id: z.string().nullable().optional(),
  inspected_quantity: z.number().int().positive('inspected_quantity must be positive'),
  accepted_quantity: z.number().int().nonnegative().default(0),
  quarantined_quantity: z.number().int().nonnegative().optional().default(0),
  rejected_quantity: z.number().int().nonnegative().optional().default(0),
  failure_reason: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  inspector_user_id: z.string().nullable().optional(),
});

export const ScrapReasonCodes = ['DEFECT', 'PROCESS_LOSS', 'MACHINE_FAILURE', 'EXPIRED', 'OTHER'] as const;
export const ScrapReasonCodeSchema = z.enum(ScrapReasonCodes);

export const RecordScrapSchema = z.object({
  variant_id: z.string().min(1, 'variant_id is required'),
  quantity: z.number().int().positive('quantity must be positive'),
  reason_code: ScrapReasonCodeSchema.optional().default('DEFECT'),
  is_process_loss: z.boolean().optional().default(false),
  notes: z.string().trim().max(500).nullable().optional(),
  operator_user_id: z.string().nullable().optional(),
});

export const SubstituteComponentSchema = z.object({
  original_variant_id: z.string().min(1, 'original_variant_id is required'),
  substituted_variant_id: z.string().min(1, 'substituted_variant_id is required'),
  quantity: z.number().int().positive('quantity must be positive'),
  reason: z.string().trim().max(500).nullable().optional(),
  approved_by: z.string().nullable().optional(),
});

