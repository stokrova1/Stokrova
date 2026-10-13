import { z } from 'zod';

export const StockMovementTypeSchema = z.enum([
  'OPENING_BALANCE',
  'PURCHASE_RECEIPT',
  'SALE_ISSUE',
  'SALES_DISPATCH',
  'CUSTOMER_RETURN',
  'SUPPLIER_RETURN',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'INTERNAL_TRANSFER',
  'DAMAGE',
  'SCRAP_DAMAGED',
  'EXPIRY',
  'ADJUSTMENT',
  'STOCK_ADJUSTMENT',
  'STOCK_COUNT_ADJUSTMENT',
  'QUARANTINE_MOVE',
  'QUARANTINE_RELEASE',
  'QUARANTINE_REJECT',
  'MANUFACTURING_CONSUMPTION',
  'MANUFACTURING_RECEIPT',
  'MANUFACTURING_SCRAP',
]);

export const MovementReferenceTypeSchema = z.enum([
  'SALES_ORDER',
  'PURCHASE_ORDER',
  'STOCK_TRANSFER',
  'CYCLE_COUNT',
  'MANUAL_ADJUSTMENT',
  'SYSTEM_INITIALIZATION',
  'QUALITY_INSPECTION',
  'SCRAP_WRITE_OFF',
  'CUSTOMER_RETURN_RMA',
  'MANUFACTURING_ORDER',
  'PRODUCTION_ORDER',
]);

export const PostStockMovementSchema = z.object({
  idempotency_key: z.string().trim().min(1).max(100),
  movement_type: StockMovementTypeSchema,
  reference_type: MovementReferenceTypeSchema,
  reference_id: z.string().trim().min(1).max(100),
  variant_id: z.string().min(1),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  source_warehouse_id: z.string().nullable().optional(),
  source_location_id: z.string().nullable().optional(),
  destination_warehouse_id: z.string().nullable().optional(),
  destination_location_id: z.string().nullable().optional(),
  quantity: z.number().positive(),
  unit_cost_minor: z.string().regex(/^\d+$/, 'unit_cost_minor must be a non-negative integer string'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const CreateStockReservationSchema = z.object({
  variant_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  quantity: z.number().positive(),
  reference_type: z.string().trim().min(1).max(50),
  reference_id: z.string().trim().min(1).max(100),
  ttl_seconds: z.number().int().positive().max(86400).optional().default(900),
});

export const OpeningBalanceSchema = z.object({
  idempotency_key: z.string().trim().min(1).max(100),
  warehouse_id: z.string().min(1),
  location_id: z.string().nullable().optional(),
  variant_id: z.string().min(1),
  quantity: z.number().positive(),
  unit_cost_minor: z.string().regex(/^\d+$/, 'unit_cost_minor must be a non-negative integer string'),
  batch_number: z.string().trim().max(100).nullable().optional(),
  expiration_date: z.string().datetime().nullable().optional(),
  serial_numbers: z.array(z.string().trim().min(1).max(100)).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const StockAdjustmentSchema = z.object({
  idempotency_key: z.string().trim().min(1).max(100),
  warehouse_id: z.string().min(1),
  location_id: z.string().nullable().optional(),
  variant_id: z.string().min(1),
  delta_quantity: z.number().refine((n) => n !== 0, 'delta_quantity must not be zero'),
  reason_code: z.enum(['DAMAGED', 'EXPIRED', 'CYCLE_COUNT_CORRECTION', 'SCRAP', 'OTHER']),
  unit_cost_minor: z.string().regex(/^\d+$/).optional(),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const StockTransferSchema = z.object({
  idempotency_key: z.string().trim().min(1).max(100),
  source_warehouse_id: z.string().min(1),
  source_location_id: z.string().nullable().optional(),
  destination_warehouse_id: z.string().min(1),
  destination_location_id: z.string().nullable().optional(),
  variant_id: z.string().min(1),
  quantity: z.number().positive(),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  unit_cost_minor: z.string().regex(/^\d+$/).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const StockWriteOffSchema = z.object({
  idempotency_key: z.string().trim().min(1).max(100),
  warehouse_id: z.string().min(1),
  location_id: z.string().nullable().optional(),
  variant_id: z.string().min(1),
  quantity: z.number().positive(),
  write_off_type: z.enum(['DAMAGE', 'EXPIRY', 'THEFT', 'OBSOLETE']),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const StockCountDiscrepancySchema = z.object({
  idempotency_key: z.string().trim().min(1).max(100),
  warehouse_id: z.string().min(1),
  location_id: z.string().nullable().optional(),
  variant_id: z.string().min(1),
  counted_quantity: z.number().min(0),
  batch_id: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const ReconcileBalancesSchema = z.object({
  warehouse_id: z.string().optional(),
  variant_id: z.string().optional(),
});

export const FefoRecommendationSchema = z.object({
  variant_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  quantity: z.coerce.number().positive(),
});
