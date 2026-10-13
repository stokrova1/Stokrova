import { z } from 'zod';

export const TrackingStrategySchema = z.enum([
  'NONE',
  'BATCH',
  'SERIAL',
  'BATCH_AND_SERIAL',
]);

export const BatchStatusSchema = z.enum([
  'AVAILABLE',
  'QUARANTINED',
  'EXPIRED',
  'RECALLED',
  'DEPLETED',
]);

export const SerialStatusSchema = z.enum([
  'AVAILABLE',
  'RESERVED',
  'QUARANTINED',
  'DAMAGED',
  'DISPATCHED',
  'CONSUMED',
  'RETURNED',
]);

export const QuarantineReasonCodeSchema = z.enum([
  'QA_INSPECTION_PENDING',
  'DAMAGED_IN_TRANSIT',
  'SUPPLIER_RECALL',
  'TEMPERATURE_EXCURSION',
  'CUSTOMER_RETURN_INSPECTION',
  'AUDIT_HOLD',
  'OTHER',
]);

const serialPattern = /^[A-Za-z0-9\-_./]+$/;

export const CreateBatchSchema = z.object({
  variant_id: z.string().min(1),
  batch_number: z.string().trim().min(1).max(50).toUpperCase(),
  supplier_lot_number: z.string().trim().max(100).nullable().optional(),
  manufacture_date: z.string().datetime().nullable().optional(),
  expiry_date: z.string().datetime().nullable().optional(),
  retest_date: z.string().datetime().nullable().optional(),
  certificate_of_analysis_url: z.string().url().max(500).nullable().optional(),
});

export const UpdateBatchSchema = z.object({
  supplier_lot_number: z.string().trim().max(100).nullable().optional(),
  manufacture_date: z.string().datetime().nullable().optional(),
  expiry_date: z.string().datetime().nullable().optional(),
  retest_date: z.string().datetime().nullable().optional(),
  certificate_of_analysis_url: z.string().url().max(500).nullable().optional(),
});

export const QuarantineHoldSchema = z.object({
  reason: QuarantineReasonCodeSchema,
  notes: z.string().trim().max(1000).optional(),
});

export const QuarantineReleaseSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

export const CreateSerialSchema = z.object({
  variant_id: z.string().min(1),
  batch_id: z.string().nullable().optional(),
  serial_number: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(
      serialPattern,
      'Serial number must contain only alphanumeric characters and - _ . /',
    ),
  warehouse_id: z.string().min(1),
  location_id: z.string().nullable().optional(),
  warranty_start_date: z.string().datetime().nullable().optional(),
  warranty_end_date: z.string().datetime().nullable().optional(),
});

export const BatchRegisterSerialsSchema = z.object({
  variant_id: z.string().min(1),
  batch_id: z.string().nullable().optional(),
  warehouse_id: z.string().min(1),
  location_id: z.string().nullable().optional(),
  serial_numbers: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(64)
        .regex(
          serialPattern,
          'Serial number must contain only alphanumeric characters and - _ . /',
        ),
    )
    .min(1)
    .max(1000),
});

export const UpdateSerialLocationSchema = z.object({
  warehouse_id: z.string().min(1),
  location_id: z.string().nullable().optional(),
});
