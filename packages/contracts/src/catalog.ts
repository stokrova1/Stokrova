export type UnitCategory = 'COUNT' | 'MASS' | 'VOLUME' | 'LENGTH' | 'AREA';

export interface UnitOfMeasure {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category: UnitCategory;
  is_base_unit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitConversion {
  id: string;
  tenant_id: string;
  from_uom_id: string;
  to_uom_id: string;
  multiplier: number; // Numerator
  divisor: number;    // Denominator (default 1)
  created_at: string;
}

export interface ProductCategory {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  code: string;
  slug: string;
  materialized_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  slug: string;
  description: string | null;
  origin_country: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Phase 2B: Product Templates, Attributes, Variants & Universal Matrix
// ----------------------------------------------------------------------------

export type ProductType =
  | 'STANDARD'
  | 'VARIANT_PARENT'
  | 'KIT_BUNDLE'
  | 'SERVICE'
  | 'COMPOSITE'
  | 'DIGITAL';

export type TrackingPolicy =
  | 'NONE'
  | 'BATCH'
  | 'SERIAL'
  | 'BATCH_AND_SERIAL';

export type ProductStatus = 'ACTIVE' | 'DISCONTINUED' | 'DRAFT';

export interface ProductTemplate {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: ProductType;
  category_id: string | null;
  brand_id: string | null;
  base_uom_id: string;
  tracking_policy: TrackingPolicy;
  is_expirable: boolean;
  tax_category_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttributeDimension {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface AttributeValue {
  id: string;
  tenant_id: string;
  dimension_id: string;
  code: string;
  name: string;
  hex_color: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  tenant_id: string;
  template_id: string;
  sku: string;
  barcode: string | null;
  cost_price_minor: string;
  selling_price_minor: string;
  attributes: Record<string, string>;
  weight_grams: number | null;
  volume_cm3: number | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// DTO Requests & Responses
// ----------------------------------------------------------------------------

export interface CreateUomRequest {
  code: string;
  name: string;
  category: UnitCategory;
  is_base_unit?: boolean;
}

export interface UomResponse {
  uom: UnitOfMeasure;
}

export interface ListUomResponse {
  uoms: UnitOfMeasure[];
}

export interface CreateUnitConversionRequest {
  from_uom_id: string;
  to_uom_id: string;
  multiplier: number;
  divisor?: number;
}

export interface UnitConversionResponse {
  conversion: UnitConversion;
}

export interface ConvertQuantityRequest {
  quantity: number;
  from_uom_id: string;
  to_uom_id: string;
}

export interface ConvertQuantityResponse {
  source_quantity: number;
  target_quantity: number;
  from_uom_code: string;
  to_uom_code: string;
  effective_factor: number;
}

export interface CreateCategoryRequest {
  parent_id?: string | null;
  name: string;
  code: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface CategoryResponse {
  category: ProductCategory;
}

export interface CategoryNode extends ProductCategory {
  children: CategoryNode[];
}

export interface CategoryTreeResponse {
  categories: CategoryNode[];
}

export interface CreateBrandRequest {
  name: string;
  code: string;
  description?: string;
  origin_country?: string;
  logo_url?: string;
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
  origin_country?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface BrandResponse {
  brand: Brand;
}

export interface ListBrandsResponse {
  brands: Brand[];
}

// Template Requests & Responses
export interface CreateProductTemplateRequest {
  code: string;
  name: string;
  type: ProductType;
  category_id?: string | null;
  brand_id?: string | null;
  base_uom_id: string;
  tracking_policy?: TrackingPolicy;
  is_expirable?: boolean;
  tax_category_code?: string | null;
}

export interface UpdateProductTemplateRequest {
  name?: string;
  category_id?: string | null;
  brand_id?: string | null;
  tracking_policy?: TrackingPolicy;
  is_expirable?: boolean;
  tax_category_code?: string | null;
  is_active?: boolean;
}

export interface ProductTemplateResponse {
  template: ProductTemplate;
}

export interface ListProductTemplatesResponse {
  templates: ProductTemplate[];
}

// Attribute Requests & Responses
export interface CreateAttributeDimensionRequest {
  code: string;
  name: string;
  sort_order?: number;
}

export interface AttributeDimensionResponse {
  dimension: AttributeDimension;
}

export interface ListAttributeDimensionsResponse {
  dimensions: AttributeDimension[];
}

export interface CreateAttributeValueRequest {
  code: string;
  name: string;
  hex_color?: string | null;
  sort_order?: number;
}

export interface AttributeValueResponse {
  value: AttributeValue;
}

export interface ListAttributeValuesResponse {
  values: AttributeValue[];
}

// Matrix Generation DTOs
export interface MatrixDimensionInput {
  dimension_code: string;
  value_codes: string[];
}

export interface MatrixPriceAdjustment {
  attribute_code: string;
  value_code: string;
  delta_selling_minor?: string;
  delta_cost_minor?: string;
}

export interface MatrixGenerateRequest {
  template_id: string;
  dimensions: MatrixDimensionInput[];
  base_cost_price_minor: string;
  base_selling_price_minor: string;
  price_adjustments?: MatrixPriceAdjustment[];
}

export interface GeneratedVariantPreview {
  sku: string;
  attributes: Record<string, string>;
  cost_price_minor: string;
  selling_price_minor: string;
}

export interface MatrixGenerateResponse {
  template_id: string;
  generated_count: number;
  variants: GeneratedVariantPreview[];
}

// Variant Requests & Responses
export interface CreateProductVariantRequest {
  template_id: string;
  sku: string;
  barcode?: string | null;
  cost_price_minor: string;
  selling_price_minor: string;
  attributes: Record<string, string>;
  weight_grams?: number | null;
  volume_cm3?: number | null;
}

export interface UpdateProductVariantRequest {
  sku?: string;
  barcode?: string | null;
  cost_price_minor?: string;
  selling_price_minor?: string;
  weight_grams?: number | null;
  volume_cm3?: number | null;
  status?: ProductStatus;
}

export interface ProductVariantResponse {
  variant: ProductVariant;
}

export interface ListProductVariantsResponse {
  variants: ProductVariant[];
}
