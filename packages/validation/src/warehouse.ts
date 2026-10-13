import { z } from 'zod';

export const LocationTypeSchema = z.enum([
  'RECEIVING',
  'INTERNAL_STORAGE',
  'PICKING_FACE',
  'STAGING',
  'DISPATCH',
  'QUARANTINE',
  'DAMAGED',
  'SCRAP',
  'CUSTOMER',
  'SUPPLIER',
  'TRANSIT',
]);

export const BinMixPolicySchema = z.enum([
  'SINGLE_SKU',
  'MULTI_SKU',
  'SINGLE_BATCH',
]);

export const CreateWarehouseSchema = z.object({
  branch_id: z.string().min(1),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().max(300).optional(),
});

export const UpdateWarehouseSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  address: z.string().trim().max(300).optional(),
  is_active: z.boolean().optional(),
});

export const CreateStorageLocationSchema = z.object({
  warehouse_id: z.string().min(1),
  parent_id: z.string().nullable().optional(),
  code: z.string().trim().min(1).max(30).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  type: LocationTypeSchema,
  mix_policy: BinMixPolicySchema.optional().default('MULTI_SKU'),
  max_weight_kg: z.number().positive().nullable().optional(),
  max_volume_cm3: z.number().positive().nullable().optional(),
  is_pickable: z.boolean().optional().default(true),
  zone_id: z.string().nullable().optional(),
  velocity_class: z.string().nullable().optional(),
  aisle: z.number().int().nonnegative().nullable().optional(),
  rack: z.number().int().nonnegative().nullable().optional(),
  shelf: z.number().int().nonnegative().nullable().optional(),
  bin_position: z.number().int().nonnegative().nullable().optional(),
});

export const UpdateStorageLocationSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  parent_id: z.string().nullable().optional(),
  type: LocationTypeSchema.optional(),
  mix_policy: BinMixPolicySchema.optional(),
  max_weight_kg: z.number().positive().nullable().optional(),
  max_volume_cm3: z.number().positive().nullable().optional(),
  is_pickable: z.boolean().optional(),
  is_active: z.boolean().optional(),
  zone_id: z.string().nullable().optional(),
  velocity_class: z.string().nullable().optional(),
  aisle: z.number().int().nonnegative().nullable().optional(),
  rack: z.number().int().nonnegative().nullable().optional(),
  shelf: z.number().int().nonnegative().nullable().optional(),
  bin_position: z.number().int().nonnegative().nullable().optional(),
});
