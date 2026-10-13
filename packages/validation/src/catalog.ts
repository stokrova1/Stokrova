import { z } from 'zod';

export const UnitCategorySchema = z.enum(['COUNT', 'MASS', 'VOLUME', 'LENGTH', 'AREA']);

export const CreateUomSchema = z.object({
  code: z.string().trim().min(1).max(10).toUpperCase(),
  name: z.string().trim().min(1).max(50),
  category: UnitCategorySchema,
  is_base_unit: z.boolean().optional(),
});

export const CreateUnitConversionSchema = z.object({
  from_uom_id: z.string().uuid(),
  to_uom_id: z.string().uuid(),
  multiplier: z.number().positive(),
  divisor: z.number().positive().default(1),
}).refine(data => data.from_uom_id !== data.to_uom_id, {
  message: 'Source and target UOM must be different',
  path: ['to_uom_id'],
});

export const ConvertQuantitySchema = z.object({
  quantity: z.number().nonnegative(),
  from_uom_id: z.string().uuid(),
  to_uom_id: z.string().uuid(),
});

export const CreateCategorySchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(20).toUpperCase(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const CreateBrandSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  description: z.string().trim().max(500).optional(),
  origin_country: z.string().trim().length(2).toUpperCase().optional(),
  logo_url: z.string().url().optional(),
});

export const UpdateBrandSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  origin_country: z.string().trim().length(2).toUpperCase().optional(),
  logo_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
});

// ----------------------------------------------------------------------------
// Phase 2B: Product Templates, Attributes, Variants & Universal Matrix Schemas
// ----------------------------------------------------------------------------

export const ProductTypeSchema = z.enum([
  'STANDARD',
  'VARIANT_PARENT',
  'KIT_BUNDLE',
  'SERVICE',
  'COMPOSITE',
  'DIGITAL',
]);

export const TrackingPolicySchema = z.enum([
  'NONE',
  'BATCH',
  'SERIAL',
  'BATCH_AND_SERIAL',
]);

export const ProductStatusSchema = z.enum(['ACTIVE', 'DISCONTINUED', 'DRAFT']);

export const CreateProductTemplateSchema = z.object({
  code: z.string().trim().min(1).max(50).toUpperCase(),
  name: z.string().trim().min(1).max(200),
  type: ProductTypeSchema,
  category_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  base_uom_id: z.string().min(1),
  tracking_policy: TrackingPolicySchema.optional().default('NONE'),
  is_expirable: z.boolean().optional().default(false),
  tax_category_code: z.string().trim().max(50).nullable().optional(),
});

export const UpdateProductTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  tracking_policy: TrackingPolicySchema.optional(),
  is_expirable: z.boolean().optional(),
  tax_category_code: z.string().trim().max(50).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const CreateAttributeDimensionSchema = z.object({
  code: z.string().trim().min(1).max(30).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  sort_order: z.number().int().nonnegative().optional().default(0),
});

export const CreateAttributeValueSchema = z.object({
  code: z.string().trim().min(1).max(30).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  hex_color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color code').nullable().optional(),
  sort_order: z.number().int().nonnegative().optional().default(0),
});

export const MatrixDimensionInputSchema = z.object({
  dimension_code: z.string().trim().min(1).toUpperCase(),
  value_codes: z.array(z.string().trim().min(1).toUpperCase()).min(1),
});

export const MatrixPriceAdjustmentSchema = z.object({
  attribute_code: z.string().trim().min(1).toUpperCase(),
  value_code: z.string().trim().min(1).toUpperCase(),
  delta_selling_minor: z.string().regex(/^-?\d+$/, 'Delta selling price must be integer string').optional(),
  delta_cost_minor: z.string().regex(/^-?\d+$/, 'Delta cost price must be integer string').optional(),
});

export const MatrixGenerateSchema = z.object({
  template_id: z.string().min(1),
  dimensions: z.array(MatrixDimensionInputSchema),
  base_cost_price_minor: z.string().regex(/^\d+$/, 'Base cost price must be a non-negative integer string'),
  base_selling_price_minor: z.string().regex(/^\d+$/, 'Base selling price must be a non-negative integer string'),
  price_adjustments: z.array(MatrixPriceAdjustmentSchema).optional(),
});

export const CreateProductVariantSchema = z.object({
  template_id: z.string().min(1),
  sku: z.string().trim().min(1).max(50).toUpperCase(),
  barcode: z.string().trim().min(3).max(64).nullable().optional(),
  cost_price_minor: z.string().regex(/^\d+$/, 'Cost price must be a non-negative integer string'),
  selling_price_minor: z.string().regex(/^\d+$/, 'Selling price must be a non-negative integer string'),
  attributes: z.record(z.string().trim()),
  weight_grams: z.number().nonnegative().nullable().optional(),
  volume_cm3: z.number().nonnegative().nullable().optional(),
});

export const UpdateProductVariantSchema = z.object({
  sku: z.string().trim().min(1).max(50).toUpperCase().optional(),
  barcode: z.string().trim().min(3).max(64).nullable().optional(),
  cost_price_minor: z.string().regex(/^\d+$/, 'Cost price must be a non-negative integer string').optional(),
  selling_price_minor: z.string().regex(/^\d+$/, 'Selling price must be a non-negative integer string').optional(),
  weight_grams: z.number().nonnegative().nullable().optional(),
  volume_cm3: z.number().nonnegative().nullable().optional(),
  status: ProductStatusSchema.optional(),
});
