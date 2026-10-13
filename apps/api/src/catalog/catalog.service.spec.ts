import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UomService } from './uom.service.js';
import { CategoriesService } from './categories.service.js';
import { BrandsService } from './brands.service.js';

describe('Catalog Services (Phase 2A)', () => {
  const tenant1 = 'ten_11111111';
  const tenant2 = 'ten_22222222';

  let uomService: UomService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;

  beforeEach(() => {
    uomService = new UomService();
    categoriesService = new CategoriesService();
    brandsService = new BrandsService();
  });

  describe('UomService', () => {
    it('creates UOM and enforces single base unit per category', async () => {
      const pcs = await uomService.createUom(tenant1, {
        code: 'pcs',
        name: 'Pieces',
        category: 'COUNT',
        is_base_unit: true,
      });

      expect(pcs.code).toBe('PCS');
      expect(pcs.is_base_unit).toBe(true);

      // Attempting to create another base unit in COUNT category should fail
      await expect(
        uomService.createUom(tenant1, {
          code: 'each',
          name: 'Each',
          category: 'COUNT',
          is_base_unit: true,
        }),
      ).rejects.toThrow(ConflictException);

      // Duplicate code should fail
      await expect(
        uomService.createUom(tenant1, {
          code: 'pcs',
          name: 'Duplicate Pieces',
          category: 'COUNT',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates conversions and converts quantities accurately (direct, reverse, 2-hop)', async () => {
      const pcs = await uomService.createUom(tenant1, {
        code: 'PCS',
        name: 'Piece',
        category: 'COUNT',
        is_base_unit: true,
      });

      const box = await uomService.createUom(tenant1, {
        code: 'BOX',
        name: 'Box (12 pcs)',
        category: 'COUNT',
      });

      const carton = await uomService.createUom(tenant1, {
        code: 'CTN',
        name: 'Carton (10 boxes)',
        category: 'COUNT',
      });

      // 1 BOX = 12 PCS
      await uomService.createConversion(tenant1, {
        from_uom_id: box.id,
        to_uom_id: pcs.id,
        multiplier: 12,
        divisor: 1,
      });

      // 1 CTN = 10 BOX
      await uomService.createConversion(tenant1, {
        from_uom_id: carton.id,
        to_uom_id: box.id,
        multiplier: 10,
        divisor: 1,
      });

      // Direct: 5 BOX -> 60 PCS
      const res1 = await uomService.convertQuantity(tenant1, {
        quantity: 5,
        from_uom_id: box.id,
        to_uom_id: pcs.id,
      });
      expect(res1.target_quantity).toBe(60);
      expect(res1.effective_factor).toBe(12);

      // Reverse: 24 PCS -> 2 BOX
      const res2 = await uomService.convertQuantity(tenant1, {
        quantity: 24,
        from_uom_id: pcs.id,
        to_uom_id: box.id,
      });
      expect(res2.target_quantity).toBe(2);
      expect(res2.effective_factor).toBeCloseTo(1 / 12);

      // Two-hop: 2 CTN -> 240 PCS (CTN -> BOX -> PCS)
      const res3 = await uomService.convertQuantity(tenant1, {
        quantity: 2,
        from_uom_id: carton.id,
        to_uom_id: pcs.id,
      });
      expect(res3.target_quantity).toBe(240);
      expect(res3.effective_factor).toBe(120);
    });

    it('rejects conversions across incompatible unit categories', async () => {
      const kg = await uomService.createUom(tenant1, {
        code: 'KG',
        name: 'Kilogram',
        category: 'MASS',
        is_base_unit: true,
      });

      const liter = await uomService.createUom(tenant1, {
        code: 'L',
        name: 'Liter',
        category: 'VOLUME',
        is_base_unit: true,
      });

      await expect(
        uomService.createConversion(tenant1, {
          from_uom_id: kg.id,
          to_uom_id: liter.id,
          multiplier: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('isolates UOM and conversions between tenants', async () => {
      const uomT1 = await uomService.createUom(tenant1, {
        code: 'METER',
        name: 'Meter',
        category: 'LENGTH',
      });

      // Same code is allowed in different tenant
      const uomT2 = await uomService.createUom(tenant2, {
        code: 'METER',
        name: 'Meter',
        category: 'LENGTH',
      });
      expect(uomT2.id).toBeDefined();

      // Tenant 2 cannot access Tenant 1 UOM
      await expect(uomService.getUomById(tenant2, uomT1.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('CategoriesService', () => {
    it('creates hierarchical categories with correct materialized paths', async () => {
      const root = await categoriesService.createCategory(tenant1, {
        code: 'elec',
        name: 'Electronics',
      });
      expect(root.code).toBe('ELEC');
      expect(root.materialized_path).toBe('ELEC');
      expect(root.slug).toBe('electronics');

      const child = await categoriesService.createCategory(tenant1, {
        code: 'audio',
        name: 'Audio Systems',
        parent_id: root.id,
      });
      expect(child.materialized_path).toBe('ELEC/AUDIO');

      const grandchild = await categoriesService.createCategory(tenant1, {
        code: 'headphones',
        name: 'Wireless Headphones',
        parent_id: child.id,
      });
      expect(grandchild.materialized_path).toBe('ELEC/AUDIO/HEADPHONES');
    });

    it('builds category tree correctly', async () => {
      const root1 = await categoriesService.createCategory(tenant1, {
        code: 'FOOD',
        name: 'Food',
      });
      const child1 = await categoriesService.createCategory(tenant1, {
        code: 'BEV',
        name: 'Beverages',
        parent_id: root1.id,
      });

      const tree = await categoriesService.getCategoryTree(tenant1);
      expect(tree.length).toBe(1);
      expect(tree[0]!.id).toBe(root1.id);
      expect(tree[0]!.children.length).toBe(1);
      expect(tree[0]!.children[0]!.id).toBe(child1.id);
    });

    it('prevents cyclic category assignment', async () => {
      const catA = await categoriesService.createCategory(tenant1, {
        code: 'A',
        name: 'Category A',
      });
      const catB = await categoriesService.createCategory(tenant1, {
        code: 'B',
        name: 'Category B',
        parent_id: catA.id,
      });
      const catC = await categoriesService.createCategory(tenant1, {
        code: 'C',
        name: 'Category C',
        parent_id: catB.id,
      });

      // Self-parenting forbidden
      await expect(
        categoriesService.updateCategory(tenant1, catA.id, { parent_id: catA.id }),
      ).rejects.toThrow(BadRequestException);

      // Attempting to set catA's parent to catC (A -> B -> C -> A) must throw
      await expect(
        categoriesService.updateCategory(tenant1, catA.id, { parent_id: catC.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cascades materialized paths when moving subtrees', async () => {
      const root1 = await categoriesService.createCategory(tenant1, {
        code: 'ROOT1',
        name: 'Root One',
      });
      const root2 = await categoriesService.createCategory(tenant1, {
        code: 'ROOT2',
        name: 'Root Two',
      });
      const child = await categoriesService.createCategory(tenant1, {
        code: 'CHILD',
        name: 'Child Node',
        parent_id: root1.id,
      });
      const grandChild = await categoriesService.createCategory(tenant1, {
        code: 'LEAF',
        name: 'Leaf Node',
        parent_id: child.id,
      });

      expect(child.materialized_path).toBe('ROOT1/CHILD');
      expect(grandChild.materialized_path).toBe('ROOT1/CHILD/LEAF');

      // Move child from ROOT1 to ROOT2
      await categoriesService.updateCategory(tenant1, child.id, { parent_id: root2.id });

      const updatedChild = await categoriesService.getCategoryById(tenant1, child.id);
      const updatedGrandChild = await categoriesService.getCategoryById(
        tenant1,
        grandChild.id,
      );

      expect(updatedChild.materialized_path).toBe('ROOT2/CHILD');
      expect(updatedGrandChild.materialized_path).toBe('ROOT2/CHILD/LEAF');
    });
  });

  describe('BrandsService', () => {
    it('creates, lists, and updates brands', async () => {
      const brand = await brandsService.createBrand(tenant1, {
        code: 'sony',
        name: 'Sony Corporation',
        origin_country: 'jp',
        description: 'Consumer electronics',
      });

      expect(brand.code).toBe('SONY');
      expect(brand.slug).toBe('sony-corporation');
      expect(brand.origin_country).toBe('JP');

      // Reject duplicate code in tenant
      await expect(
        brandsService.createBrand(tenant1, {
          code: 'sony',
          name: 'Another Sony',
        }),
      ).rejects.toThrow(ConflictException);

      // Update brand
      const updated = await brandsService.updateBrand(tenant1, brand.id, {
        name: 'Sony Group',
        is_active: false,
      });

      expect(updated.name).toBe('Sony Group');
      expect(updated.slug).toBe('sony-group');
      expect(updated.is_active).toBe(false);

      // Filter active brands
      const activeList = await brandsService.getBrands(tenant1, true);
      expect(activeList.find((b) => b.id === brand.id)).toBeUndefined();
    });
  });
});
