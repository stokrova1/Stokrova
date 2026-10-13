import { describe, it, expect } from 'vitest';
import {
  calculateMaterializedLocationPath,
  validateLocationAcyclicity,
  assertValidBinCapacity,
  assertBinMixPolicy,
  WarehouseDomainError,
} from '../src/warehouse.js';

describe('Warehouse & Storage Location Domain Engine (Phase 2C)', () => {
  describe('calculateMaterializedLocationPath', () => {
    it('creates root location path from code', () => {
      expect(calculateMaterializedLocationPath(null, 'wh-main')).toBe('WH-MAIN');
    });

    it('creates nested hierarchical path', () => {
      expect(calculateMaterializedLocationPath('WH-MAIN', 'zone-a')).toBe('WH-MAIN/ZONE-A');
      expect(calculateMaterializedLocationPath('WH-MAIN/ZONE-A', 'rack-01')).toBe(
        'WH-MAIN/ZONE-A/RACK-01',
      );
    });

    it('rejects code containing path separator "/"', () => {
      expect(() => calculateMaterializedLocationPath('WH-MAIN', 'INVALID/CODE')).toThrow(
        WarehouseDomainError,
      );
    });
  });

  describe('validateLocationAcyclicity', () => {
    const wh1 = 'wh_1111';
    const wh2 = 'wh_2222';

    const locations = new Map([
      ['loc_a', { parent_id: null, warehouse_id: wh1 }],
      ['loc_b', { parent_id: 'loc_a', warehouse_id: wh1 }],
      ['loc_c', { parent_id: 'loc_b', warehouse_id: wh1 }],
      ['loc_other_wh', { parent_id: null, warehouse_id: wh2 }],
    ]);

    const lookup = (id: string) => locations.get(id);

    it('allows valid parent assignment within same warehouse', () => {
      expect(() =>
        validateLocationAcyclicity('loc_new', 'loc_c', lookup, wh1),
      ).not.toThrow();
    });

    it('rejects self-parenting', () => {
      expect(() =>
        validateLocationAcyclicity('loc_a', 'loc_a', lookup, wh1),
      ).toThrow(WarehouseDomainError);
    });

    it('rejects circular parent loop (A -> B -> C -> A)', () => {
      expect(() =>
        validateLocationAcyclicity('loc_a', 'loc_c', lookup, wh1),
      ).toThrow(WarehouseDomainError);
    });

    it('rejects cross-warehouse parenting', () => {
      expect(() =>
        validateLocationAcyclicity('loc_new', 'loc_other_wh', lookup, wh1),
      ).toThrow(WarehouseDomainError);
    });
  });

  describe('assertValidBinCapacity', () => {
    it('permits stock within weight and volume limits', () => {
      expect(() =>
        assertValidBinCapacity(10, 50, 20, 1000, 5000, 2000),
      ).not.toThrow();
    });

    it('throws when added weight exceeds maximum capacity', () => {
      expect(() =>
        assertValidBinCapacity(40, 50, 15, 1000, 5000, 500),
      ).toThrow(WarehouseDomainError);
    });

    it('throws when added volume exceeds maximum volume', () => {
      expect(() =>
        assertValidBinCapacity(10, 50, 5, 4500, 5000, 600),
      ).toThrow(WarehouseDomainError);
    });
  });

  describe('assertBinMixPolicy', () => {
    it('enforces SINGLE_SKU policy strictly', () => {
      // Empty bin accepts any SKU
      expect(() =>
        assertBinMixPolicy('SINGLE_SKU', [], 'SKU-SHIRT-RED'),
      ).not.toThrow();

      // Bin with existing SKU accepts same SKU
      expect(() =>
        assertBinMixPolicy('SINGLE_SKU', ['SKU-SHIRT-RED'], 'SKU-SHIRT-RED'),
      ).not.toThrow();

      // Bin with existing SKU rejects different SKU
      expect(() =>
        assertBinMixPolicy('SINGLE_SKU', ['SKU-SHIRT-RED'], 'SKU-SHIRT-BLUE'),
      ).toThrow(WarehouseDomainError);
    });

    it('permits multiple SKUs under MULTI_SKU policy', () => {
      expect(() =>
        assertBinMixPolicy('MULTI_SKU', ['SKU-SHIRT-RED'], 'SKU-SHIRT-BLUE'),
      ).not.toThrow();
    });

    it('enforces SINGLE_BATCH policy strictly', () => {
      expect(() =>
        assertBinMixPolicy('SINGLE_BATCH', ['SKU-MED'], 'SKU-MED', ['BATCH-001'], 'BATCH-001'),
      ).not.toThrow();

      expect(() =>
        assertBinMixPolicy('SINGLE_BATCH', ['SKU-MED'], 'SKU-MED', ['BATCH-001'], 'BATCH-002'),
      ).toThrow(WarehouseDomainError);
    });
  });
});
