import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UomService } from './uom.service.js';
import { CategoriesService } from './categories.service.js';
import { BrandsService } from './brands.service.js';
import { TemplatesService } from './templates.service.js';
import { AttributesService } from './attributes.service.js';
import { VariantsService } from './variants.service.js';

describe('Product Templates, Attributes & Universal Matrix (Phase 2B)', () => {
  const tenant1 = 'ten_11111111';
  const tenant2 = 'ten_22222222';

  let uomService: UomService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;
  let templatesService: TemplatesService;
  let attributesService: AttributesService;
  let variantsService: VariantsService;

  beforeEach(() => {
    uomService = new UomService();
    categoriesService = new CategoriesService();
    brandsService = new BrandsService();
    templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    attributesService = new AttributesService();
    variantsService = new VariantsService(templatesService);
  });

  describe('Product Templates', () => {
    it('creates product template with validated references', async () => {
      const uom = await uomService.createUom(tenant1, {
        code: 'PCS',
        name: 'Pieces',
        category: 'COUNT',
        is_base_unit: true,
      });

      const category = await categoriesService.createCategory(tenant1, {
        code: 'APPAREL',
        name: 'Apparel',
      });

      const brand = await brandsService.createBrand(tenant1, {
        code: 'NIKE',
        name: 'Nike',
      });

      const template = await templatesService.createTemplate(tenant1, {
        code: 'dri-fit-tee',
        name: 'Dri-FIT Running Tee',
        type: 'VARIANT_PARENT',
        category_id: category.id,
        brand_id: brand.id,
        base_uom_id: uom.id,
        tracking_policy: 'NONE',
        is_expirable: false,
      });

      expect(template.code).toBe('DRI-FIT-TEE');
      expect(template.category_id).toBe(category.id);
      expect(template.brand_id).toBe(brand.id);
      expect(template.base_uom_id).toBe(uom.id);
    });

    it('rejects template creation when references do not exist', async () => {
      await expect(
        templatesService.createTemplate(tenant1, {
          code: 'GHOST',
          name: 'Ghost Item',
          type: 'STANDARD',
          base_uom_id: 'non_existent_uom',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces unique template code per tenant', async () => {
      const uom = await uomService.createUom(tenant1, {
        code: 'EA',
        name: 'Each',
        category: 'COUNT',
      });

      await templatesService.createTemplate(tenant1, {
        code: 'ITEM-01',
        name: 'Item One',
        type: 'STANDARD',
        base_uom_id: uom.id,
      });

      await expect(
        templatesService.createTemplate(tenant1, {
          code: 'item-01',
          name: 'Item One Duplicate',
          type: 'STANDARD',
          base_uom_id: uom.id,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Attribute Dimensions & Values', () => {
    it('creates dimensions and values with order and unique codes', async () => {
      const colorDim = await attributesService.createDimension(tenant1, {
        code: 'color',
        name: 'Color',
        sort_order: 1,
      });
      expect(colorDim.code).toBe('COLOR');

      const redVal = await attributesService.createValue(tenant1, colorDim.id, {
        code: 'red',
        name: 'Ruby Red',
        hex_color: '#FF0000',
        sort_order: 1,
      });
      expect(redVal.code).toBe('RED');
      expect(redVal.hex_color).toBe('#FF0000');

      // Duplicate value code under same dimension should fail
      await expect(
        attributesService.createValue(tenant1, colorDim.id, {
          code: 'red',
          name: 'Another Red',
        }),
      ).rejects.toThrow(ConflictException);

      const values = await attributesService.getValues(tenant1, colorDim.id);
      expect(values.length).toBe(1);
      expect(values[0]!.id).toBe(redVal.id);
    });
  });

  describe('Universal Matrix Generator & Variant Management', () => {
    it('generates variant matrix preview with delta pricing', async () => {
      const uom = await uomService.createUom(tenant1, {
        code: 'PCS',
        name: 'Pieces',
        category: 'COUNT',
      });

      const template = await templatesService.createTemplate(tenant1, {
        code: 'SHIRT',
        name: 'Men Shirt',
        type: 'VARIANT_PARENT',
        base_uom_id: uom.id,
      });

      const matrixRes = await variantsService.generateMatrix(tenant1, {
        template_id: template.id,
        dimensions: [
          { dimension_code: 'COLOR', value_codes: ['BLACK', 'WHITE'] },
          { dimension_code: 'SIZE', value_codes: ['M', 'XXL'] },
        ],
        base_cost_price_minor: '5000',
        base_selling_price_minor: '10000',
        price_adjustments: [
          {
            attribute_code: 'SIZE',
            value_code: 'XXL',
            delta_selling_minor: '1500',
            delta_cost_minor: '500',
          },
        ],
      });

      expect(matrixRes.generated_count).toBe(4);
      expect(matrixRes.variants.length).toBe(4);

      // Verify regular size price
      const blackM = matrixRes.variants.find(
        (v) => v.attributes['COLOR'] === 'BLACK' && v.attributes['SIZE'] === 'M',
      );
      expect(blackM).toBeDefined();
      expect(blackM!.cost_price_minor).toBe('5000');
      expect(blackM!.selling_price_minor).toBe('10000');

      // Verify XXL delta adjustment (+500 cost, +1500 selling)
      const blackXxl = matrixRes.variants.find(
        (v) => v.attributes['COLOR'] === 'BLACK' && v.attributes['SIZE'] === 'XXL',
      );
      expect(blackXxl).toBeDefined();
      expect(blackXxl!.cost_price_minor).toBe('5500');
      expect(blackXxl!.selling_price_minor).toBe('11500');
    });

    it('creates physical variant with barcode verification and coordinate uniqueness', async () => {
      const uom = await uomService.createUom(tenant1, {
        code: 'PCS',
        name: 'Pieces',
        category: 'COUNT',
      });

      const template = await templatesService.createTemplate(tenant1, {
        code: 'JEANS',
        name: 'Denim Jeans',
        type: 'VARIANT_PARENT',
        base_uom_id: uom.id,
      });

      // Valid EAN-13 barcode
      const variant = await variantsService.createVariant(tenant1, {
        template_id: template.id,
        sku: 'JEANS-32-BLUE',
        barcode: '9780201379624',
        cost_price_minor: '8000',
        selling_price_minor: '16000',
        attributes: { WAIST: '32', COLOR: 'BLUE' },
        weight_grams: 650,
      });

      expect(variant.sku).toBe('JEANS-32-BLUE');
      expect(variant.barcode).toBe('9780201379624');
      expect(variant.status).toBe('ACTIVE');

      // Reject creation with invalid check digit barcode
      await expect(
        variantsService.createVariant(tenant1, {
          template_id: template.id,
          sku: 'JEANS-34-BLUE',
          barcode: '9780201379625', // Invalid check digit
          cost_price_minor: '8000',
          selling_price_minor: '16000',
          attributes: { WAIST: '34', COLOR: 'BLUE' },
        }),
      ).rejects.toThrow(BadRequestException);

      // Reject duplicate variant attribute coordinates
      await expect(
        variantsService.createVariant(tenant1, {
          template_id: template.id,
          sku: 'JEANS-32-BLUE-ALT',
          cost_price_minor: '8000',
          selling_price_minor: '16000',
          attributes: { color: 'blue', waist: '32' }, // Same coords in different case/order
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('guarantees tenant isolation across templates and variants', async () => {
      const uom1 = await uomService.createUom(tenant1, {
        code: 'PCS',
        name: 'Pieces',
        category: 'COUNT',
      });

      const tmpl1 = await templatesService.createTemplate(tenant1, {
        code: 'PROD',
        name: 'Product Tenant 1',
        type: 'STANDARD',
        base_uom_id: uom1.id,
      });

      // Tenant 2 cannot see or access Tenant 1 template
      await expect(templatesService.getTemplateById(tenant2, tmpl1.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
