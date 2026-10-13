import { describe, it, expect } from 'vitest';
import {
  CreateUomSchema,
  CreateUnitConversionSchema,
  ConvertQuantitySchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateBrandSchema,
  UpdateBrandSchema,
  CreateProductTemplateSchema,
  CreateAttributeDimensionSchema,
  CreateAttributeValueSchema,
  MatrixGenerateSchema,
  CreateProductVariantSchema,
} from '../src/catalog.js';

describe('Catalog Validation Schemas', () => {
  describe('CreateUomSchema', () => {
    it('validates a valid UOM creation payload', () => {
      const valid = {
        code: 'kg',
        name: 'Kilogram',
        category: 'MASS',
        is_base_unit: true,
      };
      const result = CreateUomSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('KG');
        expect(result.data.is_base_unit).toBe(true);
      }
    });

    it('rejects invalid UOM category', () => {
      const invalid = {
        code: 'KG',
        name: 'Kilogram',
        category: 'INVALID_CATEGORY',
      };
      const result = CreateUomSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects code that is too long', () => {
      const invalid = {
        code: 'VERYLONGCODE123',
        name: 'Kilogram',
        category: 'MASS',
      };
      const result = CreateUomSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateUnitConversionSchema', () => {
    it('validates valid unit conversion payload', () => {
      const valid = {
        from_uom_id: '123e4567-e89b-12d3-a456-426614174000',
        to_uom_id: '123e4567-e89b-12d3-a456-426614174001',
        multiplier: 1000,
        divisor: 1,
      };
      const result = CreateUnitConversionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects identity conversion (from_uom_id == to_uom_id)', () => {
      const invalid = {
        from_uom_id: '123e4567-e89b-12d3-a456-426614174000',
        to_uom_id: '123e4567-e89b-12d3-a456-426614174000',
        multiplier: 1000,
        divisor: 1,
      };
      const result = CreateUnitConversionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects non-positive multiplier or divisor', () => {
      const invalid = {
        from_uom_id: '123e4567-e89b-12d3-a456-426614174000',
        to_uom_id: '123e4567-e89b-12d3-a456-426614174001',
        multiplier: 0,
        divisor: -1,
      };
      const result = CreateUnitConversionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConvertQuantitySchema', () => {
    it('validates valid quantity conversion payload', () => {
      const valid = {
        quantity: 50.5,
        from_uom_id: '123e4567-e89b-12d3-a456-426614174000',
        to_uom_id: '123e4567-e89b-12d3-a456-426614174001',
      };
      const result = ConvertQuantitySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects negative quantity', () => {
      const invalid = {
        quantity: -10,
        from_uom_id: '123e4567-e89b-12d3-a456-426614174000',
        to_uom_id: '123e4567-e89b-12d3-a456-426614174001',
      };
      const result = ConvertQuantitySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateCategorySchema & UpdateCategorySchema', () => {
    it('validates root category creation', () => {
      const valid = {
        name: 'Beverages',
        code: 'bev',
      };
      const result = CreateCategorySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('BEV');
      }
    });

    it('validates subcategory creation with parent_id', () => {
      const valid = {
        name: 'Soft Drinks',
        code: 'SOFT',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = CreateCategorySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates category updates', () => {
      const valid = {
        name: 'Cold Beverages',
        is_active: false,
      };
      const result = UpdateCategorySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateBrandSchema & UpdateBrandSchema', () => {
    it('validates brand creation', () => {
      const valid = {
        name: 'Coca Cola',
        code: 'coke',
        description: 'Global beverage manufacturer',
        origin_country: 'us',
        logo_url: 'https://example.com/logo.png',
      };
      const result = CreateBrandSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('COKE');
        expect(result.data.origin_country).toBe('US');
      }
    });

    it('rejects invalid country code length', () => {
      const invalid = {
        name: 'Coca Cola',
        code: 'COKE',
        origin_country: 'USA',
      };
      const result = CreateBrandSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates brand update', () => {
      const valid = {
        description: 'Updated brand description',
        is_active: true,
      };
      const result = UpdateBrandSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Phase 2B: Product Templates, Attributes, Matrix & Variants Schemas', () => {
    it('validates product template creation and defaults', () => {
      const valid = {
        code: 'tshirt-01',
        name: 'Classic Cotton T-Shirt',
        type: 'VARIANT_PARENT',
        base_uom_id: 'uom_12345',
        is_expirable: false,
      };
      const result = CreateProductTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('TSHIRT-01');
        expect(result.data.tracking_policy).toBe('NONE');
      }
    });

    it('rejects invalid product type', () => {
      const invalid = {
        code: 'TSHIRT-01',
        name: 'Classic Cotton T-Shirt',
        type: 'UNKNOWN_TYPE',
        base_uom_id: 'uom_12345',
      };
      const result = CreateProductTemplateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates attribute dimension and value creation', () => {
      const dimResult = CreateAttributeDimensionSchema.safeParse({
        code: 'color',
        name: 'Color',
      });
      expect(dimResult.success).toBe(true);
      if (dimResult.success) {
        expect(dimResult.data.code).toBe('COLOR');
      }

      const valResult = CreateAttributeValueSchema.safeParse({
        code: 'red',
        name: 'Crimson Red',
        hex_color: '#FF0000',
      });
      expect(valResult.success).toBe(true);
      if (valResult.success) {
        expect(valResult.data.code).toBe('RED');
        expect(valResult.data.hex_color).toBe('#FF0000');
      }
    });

    it('validates matrix generate payload with price adjustments', () => {
      const valid = {
        template_id: 'tmpl_123',
        dimensions: [
          { dimension_code: 'COLOR', value_codes: ['RED', 'BLUE'] },
          { dimension_code: 'SIZE', value_codes: ['M', 'L'] },
        ],
        base_cost_price_minor: '1500',
        base_selling_price_minor: '3000',
        price_adjustments: [
          {
            attribute_code: 'SIZE',
            value_code: 'L',
            delta_selling_minor: '500',
            delta_cost_minor: '200',
          },
        ],
      };
      const result = MatrixGenerateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates product variant creation', () => {
      const valid = {
        template_id: 'tmpl_123',
        sku: 'TSHIRT-RED-M',
        barcode: '9780201379624',
        cost_price_minor: '1500',
        selling_price_minor: '3000',
        attributes: { COLOR: 'RED', SIZE: 'M' },
        weight_grams: 250,
      };
      const result = CreateProductVariantSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid variant prices', () => {
      const invalid = {
        template_id: 'tmpl_123',
        sku: 'TSHIRT-RED-M',
        cost_price_minor: '-500', // Negative not allowed
        selling_price_minor: '3000',
        attributes: { COLOR: 'RED' },
      };
      const result = CreateProductVariantSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
