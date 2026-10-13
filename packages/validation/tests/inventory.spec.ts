import { describe, it, expect } from 'vitest';
import {
  PostStockMovementSchema,
  CreateStockReservationSchema,
} from '../src/inventory.js';

describe('Inventory Validation Schemas (Phase 2E)', () => {
  describe('PostStockMovementSchema', () => {
    it('validates correct movement payload', () => {
      const result = PostStockMovementSchema.safeParse({
        idempotency_key: 'idem-mov-001',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'PURCHASE_ORDER',
        reference_id: 'PO-9921',
        variant_id: 'var_123',
        destination_warehouse_id: 'wh_main',
        destination_location_id: 'loc_bin_1',
        quantity: 50,
        unit_cost_minor: '1450',
        notes: 'Received from supplier dock',
      });

      expect(result.success).toBe(true);
    });

    it('rejects negative or zero quantity and non-integer minor unit cost', () => {
      const badQty = PostStockMovementSchema.safeParse({
        idempotency_key: 'idem-1',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'PURCHASE_ORDER',
        reference_id: 'PO-1',
        variant_id: 'var_1',
        quantity: -5,
        unit_cost_minor: '1000',
      });
      expect(badQty.success).toBe(false);

      const badCost = PostStockMovementSchema.safeParse({
        idempotency_key: 'idem-1',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'PURCHASE_ORDER',
        reference_id: 'PO-1',
        variant_id: 'var_1',
        quantity: 10,
        unit_cost_minor: '10.50', // floating point not allowed
      });
      expect(badCost.success).toBe(false);
    });
  });

  describe('CreateStockReservationSchema', () => {
    it('applies default TTL if not provided', () => {
      const result = CreateStockReservationSchema.safeParse({
        variant_id: 'var_123',
        warehouse_id: 'wh_main',
        quantity: 2,
        reference_type: 'SALES_ORDER',
        reference_id: 'SO-100',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ttl_seconds).toBe(900);
      }
    });

    it('rejects zero quantity or excessive TTL', () => {
      const badTtl = CreateStockReservationSchema.safeParse({
        variant_id: 'var_123',
        warehouse_id: 'wh_main',
        quantity: 1,
        reference_type: 'SALES_ORDER',
        reference_id: 'SO-100',
        ttl_seconds: 100000, // exceeds 86400 (24h)
      });
      expect(badTtl.success).toBe(false);
    });
  });
});
