import { describe, it, expect } from 'vitest';
import {
  normalizeSku,
  validateEan13,
  validateUpcA,
  validateBarcode,
  assertUniqueVariantCoordinates,
  generateVariantMatrix,
  CatalogDomainError,
} from '../src/catalog.js';

describe('Catalog Matrix & Variant Domain Engine (Phase 2B)', () => {
  describe('normalizeSku', () => {
    it('normalizes valid SKUs to uppercase', () => {
      expect(normalizeSku('sku-prod-001')).toBe('SKU-PROD-001');
      expect(normalizeSku('  item_123.A  ')).toBe('ITEM_123.A');
    });

    it('rejects invalid characters or empty string', () => {
      expect(() => normalizeSku('')).toThrow(CatalogDomainError);
      expect(() => normalizeSku('SKU with space')).toThrow(CatalogDomainError);
      expect(() => normalizeSku('SKU#123@!')).toThrow(CatalogDomainError);
    });
  });

  describe('Barcode Checksum Engine', () => {
    it('validates EAN-13 barcodes with Modulo-10 checksum', () => {
      // 9780201379624 is valid (Book ISBN-13)
      expect(validateEan13('9780201379624')).toBe(true);
      // Alter check digit: invalid
      expect(validateEan13('9780201379625')).toBe(false);
      // Non-13 digits: invalid
      expect(validateEan13('123456')).toBe(false);
    });

    it('validates UPC-A barcodes with Modulo-10 checksum', () => {
      // 036000291452 is valid Kleenex tissue UPC-A
      expect(validateUpcA('036000291452')).toBe(true);
      // Alter check digit: invalid
      expect(validateUpcA('036000291453')).toBe(false);
    });

    it('categorizes barcode format via validateBarcode', () => {
      const ean = validateBarcode('9780201379624');
      expect(ean.valid).toBe(true);
      expect(ean.format).toBe('EAN13');

      const upc = validateBarcode('036000291452');
      expect(upc.valid).toBe(true);
      expect(upc.format).toBe('UPCA');

      const code128 = validateBarcode('INTERNAL-BIN-402');
      expect(code128.valid).toBe(true);
      expect(code128.format).toBe('CODE128');

      const badEan = validateBarcode('9780201379620');
      expect(badEan.valid).toBe(false);
      expect(badEan.error).toBeDefined();
    });
  });

  describe('assertUniqueVariantCoordinates', () => {
    it('permits distinct coordinates', () => {
      const existing = [
        { attributes: { COLOR: 'RED', SIZE: 'M' } },
        { attributes: { COLOR: 'RED', SIZE: 'L' } },
      ];
      expect(() =>
        assertUniqueVariantCoordinates(existing, { COLOR: 'BLUE', SIZE: 'M' }),
      ).not.toThrow();
    });

    it('rejects duplicate coordinates even with different key order or case', () => {
      const existing = [
        { attributes: { COLOR: 'RED', SIZE: 'M' } },
      ];
      expect(() =>
        assertUniqueVariantCoordinates(existing, { size: 'm', color: 'red' }),
      ).toThrow(CatalogDomainError);
    });
  });

  describe('generateVariantMatrix', () => {
    it('generates a single variant when no dimensions are provided', () => {
      const result = generateVariantMatrix({
        template_code: 'TSHIRT',
        dimensions: [],
        base_cost_price_minor: 1500n,
        base_selling_price_minor: 3000n,
      });

      expect(result.length).toBe(1);
      expect(result[0]!.sku).toBe('TSHIRT');
      expect(result[0]!.cost_price_minor).toBe(1500n);
      expect(result[0]!.selling_price_minor).toBe(3000n);
    });

    it('generates Cartesian product with delta pricing across multiple dimensions', () => {
      const result = generateVariantMatrix({
        template_code: 'TSHIRT',
        dimensions: [
          { dimension_code: 'COLOR', value_codes: ['RED', 'BLUE'] },
          { dimension_code: 'SIZE', value_codes: ['S', 'XL'] },
        ],
        base_cost_price_minor: 1000n,
        base_selling_price_minor: 2000n,
        price_adjustments: [
          {
            attribute_code: 'SIZE',
            value_code: 'XL',
            delta_cost_minor: 200n,
            delta_selling_minor: 500n,
          },
        ],
      });

      // 2 colors * 2 sizes = 4 variants
      expect(result.length).toBe(4);

      // Check S size (no delta)
      const redS = result.find(
        (v) => v.attributes['COLOR'] === 'RED' && v.attributes['SIZE'] === 'S',
      );
      expect(redS).toBeDefined();
      expect(redS!.sku).toBe('TSHIRT-RED-S');
      expect(redS!.cost_price_minor).toBe(1000n);
      expect(redS!.selling_price_minor).toBe(2000n);

      // Check XL size (+200 cost, +500 selling)
      const blueXl = result.find(
        (v) => v.attributes['COLOR'] === 'BLUE' && v.attributes['SIZE'] === 'XL',
      );
      expect(blueXl).toBeDefined();
      expect(blueXl!.sku).toBe('TSHIRT-BLUE-XL');
      expect(blueXl!.cost_price_minor).toBe(1200n);
      expect(blueXl!.selling_price_minor).toBe(2500n);
    });

    it('throws error on duplicate dimensions in matrix request', () => {
      expect(() =>
        generateVariantMatrix({
          template_code: 'TSHIRT',
          dimensions: [
            { dimension_code: 'COLOR', value_codes: ['RED'] },
            { dimension_code: 'COLOR', value_codes: ['BLUE'] },
          ],
          base_cost_price_minor: 1000n,
          base_selling_price_minor: 2000n,
        }),
      ).toThrow(CatalogDomainError);
    });
  });
});
