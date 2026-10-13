import { describe, it, expect } from 'vitest';
import {
  CreateWarehouseSchema,
  UpdateWarehouseSchema,
  CreateStorageLocationSchema,
  UpdateStorageLocationSchema,
} from '../src/warehouse.js';

describe('Warehouse & Storage Location Validation Schemas (Phase 2C)', () => {
  describe('CreateWarehouseSchema', () => {
    it('validates a valid warehouse creation payload', () => {
      const valid = {
        branch_id: 'br_12345',
        code: 'wh-main',
        name: 'Main Distribution Center',
        address: '10 Industrial Ave, Ikeja, Lagos',
      };
      const result = CreateWarehouseSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('WH-MAIN');
      }
    });

    it('rejects missing branch_id or empty code', () => {
      const invalid = {
        branch_id: '',
        code: '',
        name: 'Main DC',
      };
      const result = CreateWarehouseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateWarehouseSchema', () => {
    it('validates partial update of warehouse', () => {
      const valid = {
        name: 'Main Logistics Hub',
        is_active: false,
      };
      const result = UpdateWarehouseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateStorageLocationSchema', () => {
    it('validates storage location creation with defaults', () => {
      const valid = {
        warehouse_id: 'wh_123',
        code: 'zone-a',
        name: 'Zone A (Fast Moving)',
        type: 'INTERNAL_STORAGE',
      };
      const result = CreateStorageLocationSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('ZONE-A');
        expect(result.data.mix_policy).toBe('MULTI_SKU');
        expect(result.data.is_pickable).toBe(true);
      }
    });

    it('validates storage bin with capacity constraints and mix policy', () => {
      const valid = {
        warehouse_id: 'wh_123',
        parent_id: 'loc_rack_01',
        code: 'bin-01',
        name: 'Bin 01',
        type: 'PICKING_FACE',
        mix_policy: 'SINGLE_SKU',
        max_weight_kg: 25.5,
        max_volume_cm3: 10000,
      };
      const result = CreateStorageLocationSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mix_policy).toBe('SINGLE_SKU');
        expect(result.data.max_weight_kg).toBe(25.5);
      }
    });

    it('rejects invalid location type', () => {
      const invalid = {
        warehouse_id: 'wh_123',
        code: 'ZONE-A',
        name: 'Zone A',
        type: 'INVALID_TYPE',
      };
      const result = CreateStorageLocationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateStorageLocationSchema', () => {
    it('validates storage location updates', () => {
      const valid = {
        name: 'Renamed Bin',
        mix_policy: 'SINGLE_BATCH',
        is_pickable: false,
      };
      const result = UpdateStorageLocationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
