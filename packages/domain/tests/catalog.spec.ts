import { describe, it, expect } from 'vitest';
import {
  convertQuantity,
  calculateMaterializedCategoryPath,
  validateCategoryAcyclicity,
  generateSlug,
  DomainUnitOfMeasure,
  DomainUnitConversion,
  CatalogDomainError,
} from '../src/catalog.js';

describe('Catalog Domain Engine', () => {
  const uomPiece: DomainUnitOfMeasure = {
    id: 'uom-pcs',
    code: 'PCS',
    name: 'Piece',
    category: 'COUNT',
    is_base_unit: true,
  };

  const uomBox: DomainUnitOfMeasure = {
    id: 'uom-box',
    code: 'BOX',
    name: 'Box',
    category: 'COUNT',
    is_base_unit: false,
  };

  const uomCarton: DomainUnitOfMeasure = {
    id: 'uom-ctn',
    code: 'CTN',
    name: 'Carton',
    category: 'COUNT',
    is_base_unit: false,
  };

  const uomKg: DomainUnitOfMeasure = {
    id: 'uom-kg',
    code: 'KG',
    name: 'Kilogram',
    category: 'MASS',
    is_base_unit: true,
  };

  const uomLiter: DomainUnitOfMeasure = {
    id: 'uom-l',
    code: 'L',
    name: 'Liter',
    category: 'VOLUME',
    is_base_unit: true,
  };

  const conversions: DomainUnitConversion[] = [
    // 1 Box = 12 Pieces
    {
      from_uom_id: 'uom-box',
      to_uom_id: 'uom-pcs',
      multiplier: 12,
      divisor: 1,
    },
    // 1 Carton = 24 Pieces
    {
      from_uom_id: 'uom-ctn',
      to_uom_id: 'uom-pcs',
      multiplier: 24,
      divisor: 1,
    },
  ];

  describe('convertQuantity', () => {
    it('returns exact same quantity when from and to UOM are identical', () => {
      const result = convertQuantity({
        quantity: 15,
        from_uom: uomPiece,
        to_uom: uomPiece,
        conversions,
      });

      expect(result.target_quantity).toBe(15);
      expect(result.effective_factor).toBe(1);
    });

    it('converts forward along direct conversion path (Box -> Pieces)', () => {
      const result = convertQuantity({
        quantity: 5,
        from_uom: uomBox,
        to_uom: uomPiece,
        conversions,
      });

      expect(result.target_quantity).toBe(60);
      expect(result.effective_factor).toBe(12);
    });

    it('converts in reverse along direct conversion path (Pieces -> Boxes)', () => {
      const result = convertQuantity({
        quantity: 36,
        from_uom: uomPiece,
        to_uom: uomBox,
        conversions,
      });

      expect(result.target_quantity).toBe(3);
      expect(result.effective_factor).toBeCloseTo(1 / 12);
    });

    it('handles fractional conversion accurately without floating point loss', () => {
      const result = convertQuantity({
        quantity: 30,
        from_uom: uomPiece,
        to_uom: uomBox,
        conversions,
      });

      expect(result.target_quantity).toBe(2.5);
    });

    it('resolves multi-hop conversion via common base unit (Cartons -> Boxes)', () => {
      // 1 Carton = 24 Pieces, 1 Box = 12 Pieces => 1 Carton = 2 Boxes
      const result = convertQuantity({
        quantity: 3,
        from_uom: uomCarton,
        to_uom: uomBox,
        conversions,
      });

      expect(result.target_quantity).toBe(6);
      expect(result.effective_factor).toBe(2);
    });

    it('throws error when converting between incompatible UOM categories', () => {
      expect(() =>
        convertQuantity({
          quantity: 10,
          from_uom: uomKg,
          to_uom: uomLiter,
          conversions,
        })
      ).toThrowError(CatalogDomainError);

      expect(() =>
        convertQuantity({
          quantity: 10,
          from_uom: uomKg,
          to_uom: uomLiter,
          conversions,
        })
      ).toThrowError(/Cannot convert between MASS and VOLUME/);
    });

    it('throws error when no conversion path exists between units of the same category', () => {
      const uomDozen: DomainUnitOfMeasure = {
        id: 'uom-dzn',
        code: 'DZN',
        name: 'Dozen',
        category: 'COUNT',
        is_base_unit: false,
      };

      expect(() =>
        convertQuantity({
          quantity: 2,
          from_uom: uomDozen,
          to_uom: uomBox,
          conversions,
        })
      ).toThrowError(/No conversion path found/);
    });

    it('rejects negative quantity conversion', () => {
      expect(() =>
        convertQuantity({
          quantity: -5,
          from_uom: uomBox,
          to_uom: uomPiece,
          conversions,
        })
      ).toThrowError(/Conversion quantity cannot be negative/);
    });
  });

  describe('calculateMaterializedCategoryPath', () => {
    it('returns uppercase root code when parentPath is null', () => {
      expect(calculateMaterializedCategoryPath(null, 'elec')).toBe('ELEC');
    });

    it('constructs hierarchical path string when parentPath is provided', () => {
      expect(calculateMaterializedCategoryPath('ELEC', 'audio')).toBe('ELEC/AUDIO');
      expect(calculateMaterializedCategoryPath('ELEC/AUDIO', 'headphones')).toBe('ELEC/AUDIO/HEADPHONES');
    });

    it('throws error if category code contains a slash separator', () => {
      expect(() => calculateMaterializedCategoryPath('ELEC', 'audio/video')).toThrowError(
        /cannot contain path separator/
      );
    });
  });

  describe('validateCategoryAcyclicity', () => {
    const categories = new Map<string, { parent_id: string | null }>([
      ['cat-root', { parent_id: null }],
      ['cat-child1', { parent_id: 'cat-root' }],
      ['cat-child2', { parent_id: 'cat-child1' }],
    ]);

    const lookup = (id: string) => categories.get(id);

    it('permits valid parent assignment', () => {
      expect(() => validateCategoryAcyclicity('cat-child3', 'cat-child2', lookup)).not.toThrow();
      expect(() => validateCategoryAcyclicity('cat-child1', null, lookup)).not.toThrow();
    });

    it('throws error if a category is made its own parent', () => {
      expect(() => validateCategoryAcyclicity('cat-child1', 'cat-child1', lookup)).toThrowError(
        /Category cannot be its own parent/
      );
    });

    it('throws error if an ancestor is assigned as a child (cycle detection)', () => {
      // Trying to make cat-root a child of cat-child2
      expect(() => validateCategoryAcyclicity('cat-root', 'cat-child2', lookup)).toThrowError(
        /Circular reference detected/
      );
    });
  });

  describe('generateSlug', () => {
    it('creates lowercase URL-safe slug with hyphen separators', () => {
      expect(generateSlug("Men's Premium T-Shirts")).toBe('mens-premium-t-shirts');
      expect(generateSlug('  Electronics & Accessories  ')).toBe('electronics-accessories');
      expect(generateSlug('Cold Storage / Refrigerated')).toBe('cold-storage-refrigerated');
    });
  });
});
