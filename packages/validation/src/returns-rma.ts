import { z } from 'zod';

export const RmaStatusSchema = z.enum([
  'DRAFT',
  'REQUESTED',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
]);

export const RmaTypeSchema = z.enum([
  'CUSTOMER_RETURN',
  'VENDOR_RETURN',
  'INTERNAL_TRANSFER_RETURN',
]);

export const ReturnReasonCodeSchema = z.enum([
  'DEFECTIVE',
  'WRONG_ITEM_SHIPPED',
  'BUYER_REMORSE',
  'DAMAGED_IN_TRANSIT',
  'EXPIRED',
  'NOT_AS_DESCRIBED',
  'OTHER',
]);

export const ResolutionPreferenceSchema = z.enum([
  'REFUND',
  'REPLACEMENT',
  'STORE_CREDIT',
  'REPAIR',
]);

export const CreateReturnLineSchema = z.object({
  order_id: z.string().nullable().optional(),
  order_line_id: z.string().nullable().optional(),
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  item_name: z.string().min(1, 'Item name is required').max(200),
  quantity_authorized: z.number().int().positive('Authorized quantity must be positive'),
  unit_price_cents: z.number().int().nonnegative('Unit price must be non-negative cents'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  reason_code: ReturnReasonCodeSchema,
  customer_notes: z.string().max(500).nullable().optional(),
  batch_id: z.string().nullable().optional(),
  serial_numbers: z.array(z.string().min(1)).nullable().optional(),
});

export const CreateRmaSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  type: RmaTypeSchema,
  customer_id: z.string().nullable().optional(),
  customer_name: z.string().max(100).nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  original_order_id: z.string().nullable().optional(),
  original_order_number: z.string().nullable().optional(),
  resolution_preference: ResolutionPreferenceSchema.optional().default('REFUND'),
  restocking_fee_bp: z.number().int().min(0).max(10000).optional().default(0),
  return_tracking_number: z.string().nullable().optional(),
  carrier_code: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  lines: z.array(CreateReturnLineSchema).min(1, 'At least one return line is required'),
});

export const UpdateRmaSchema = z.object({
  resolution_preference: ResolutionPreferenceSchema.optional(),
  restocking_fee_bp: z.number().int().min(0).max(10000).optional(),
  return_tracking_number: z.string().nullable().optional(),
  carrier_code: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const ApproveRmaSchema = z.object({
  approved_by: z.string().min(1, 'Approver ID is required'),
  notes: z.string().max(500).nullable().optional(),
});

export const RejectRmaSchema = z.object({
  rejection_reason: z.string().min(1, 'Rejection reason is required').max(500),
  rejected_by: z.string().nullable().optional(),
});

export const ReceiveRmaLineItemSchema = z.object({
  line_id: z.string().min(1, 'Line ID is required'),
  quantity_received: z.number().int().positive('Quantity received must be positive'),
  batch_id: z.string().nullable().optional(),
  serial_numbers: z.array(z.string().min(1)).nullable().optional(),
});

export const ReceiveRmaSchema = z.object({
  receiving_location_id: z.string().min(1, 'Receiving location ID is required'),
  lines: z.array(ReceiveRmaLineItemSchema).min(1, 'At least one item must be received'),
  notes: z.string().max(500).nullable().optional(),
});

// ----------------------------------------------------------------------------
// Phase 7B: Quality Inspection Schemas
// ----------------------------------------------------------------------------

export const InspectionConditionGradeSchema = z.enum([
  'GRADE_A_NEW',
  'GRADE_B_OPEN_BOX',
  'GRADE_C_REFURBISHABLE',
  'GRADE_D_SALVAGE',
  'SCRAP_HAZMAT',
]);

export const InspectionStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'PASSED',
  'FAILED',
  'QUARANTINED',
]);

export const PerformQualityInspectionSchema = z.object({
  rma_id: z.string().min(1, 'RMA ID is required'),
  return_line_id: z.string().min(1, 'Return line ID is required'),
  quantity_inspected: z.number().int().positive('Inspected quantity must be positive'),
  condition_grade: InspectionConditionGradeSchema,
  status: InspectionStatusSchema,
  failure_reason_code: z.string().nullable().optional(),
  inspector_id: z.string().nullable().optional(),
  quarantine_location_id: z.string().nullable().optional(),
  inspection_notes: z.string().max(500).nullable().optional(),
});

// ----------------------------------------------------------------------------
// Phase 7C: Restocking & Disposition Schemas
// ----------------------------------------------------------------------------

export const DispositionActionTypeSchema = z.enum([
  'RESTOCK_TO_PRIMARY',
  'TRANSFER_TO_REFURB',
  'RETURN_TO_VENDOR',
  'SCRAP_DISPOSAL',
]);

export const ExecuteDispositionSchema = z.object({
  rma_id: z.string().min(1, 'RMA ID is required'),
  inspection_id: z.string().nullable().optional(),
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  action_type: DispositionActionTypeSchema,
  destination_location_id: z.string().min(1, 'Destination location ID is required'),
  gross_unit_price_cents: z.number().int().nonnegative('Unit price must be non-negative cents'),
  restocking_fee_bp: z.number().int().min(0).max(10000).default(0),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  operator_id: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
