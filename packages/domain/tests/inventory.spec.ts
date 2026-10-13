import { describe, it, expect } from 'vitest';
import {
  calculateAvailableStock,
  canIssueStock,
  InventoryMovementTypes,
  assertStockMovementValid,
  calculateTotalCostMinor,
  calculateAvailableToPromise,
  isReservationExpired,
  InventoryDomainError,
} from '../src/inventory.js';

describe('Inventory Invariants', () => {
  it('correctly calculates available stock from on-hand and reserved quantity', () => {
    const onHand = 100;
    const reserved = 15;
    expect(calculateAvailableStock(onHand, reserved)).toBe(85);
  });

  it('prohibits stock issue when requested quantity exceeds available stock and negative stock is disabled', () => {
    const available = 50;
    const requested = 60;
    expect(canIssueStock(available, requested, false)).toBe(false);
  });

  it('permits stock issue when available stock covers requested quantity', () => {
    const available = 50;
    const requested = 20;
    expect(canIssueStock(available, requested, false)).toBe(true);
  });

  it('permits negative stock only when allowNegative is explicitly enabled by tenant policy', () => {
    const available = 10;
    const requested = 25;
    expect(canIssueStock(available, requested, true)).toBe(true);
  });

  it('rejects zero or negative requested quantity for stock issue', () => {
    expect(canIssueStock(10, 0)).toBe(false);
    expect(canIssueStock(10, -5)).toBe(false);
  });

  it('defines all required inventory movement types', () => {
    expect(Object.keys(InventoryMovementTypes).length).toBe(23);
    expect(InventoryMovementTypes.OPENING_BALANCE).toBe('OPENING_BALANCE');
    expect(InventoryMovementTypes.PURCHASE_RECEIPT).toBe('PURCHASE_RECEIPT');
    expect(InventoryMovementTypes.SALE_ISSUE).toBe('SALE_ISSUE');
    expect(InventoryMovementTypes.CUSTOMER_RETURN).toBe('CUSTOMER_RETURN');
    expect(InventoryMovementTypes.SUPPLIER_RETURN).toBe('SUPPLIER_RETURN');
    expect(InventoryMovementTypes.TRANSFER_OUT).toBe('TRANSFER_OUT');
    expect(InventoryMovementTypes.TRANSFER_IN).toBe('TRANSFER_IN');
    expect(InventoryMovementTypes.DAMAGE).toBe('DAMAGE');
    expect(InventoryMovementTypes.EXPIRY).toBe('EXPIRY');
    expect(InventoryMovementTypes.ADJUSTMENT).toBe('ADJUSTMENT');
    expect(InventoryMovementTypes.STOCK_COUNT_ADJUSTMENT).toBe('STOCK_COUNT_ADJUSTMENT');
    expect(InventoryMovementTypes.RESERVATION).toBe('RESERVATION');
    expect(InventoryMovementTypes.RELEASE_RESERVATION).toBe('RELEASE_RESERVATION');
    expect(InventoryMovementTypes.MANUFACTURING_CONSUMPTION).toBe('MANUFACTURING_CONSUMPTION');
    expect(InventoryMovementTypes.MANUFACTURING_RECEIPT).toBe('MANUFACTURING_RECEIPT');
    expect(InventoryMovementTypes.MANUFACTURING_SCRAP).toBe('MANUFACTURING_SCRAP');
  });

  describe('Phase 2E Movement Invariants and Math', () => {
    it('validates stock movements and rejects non-positive quantity', () => {
      expect(() =>
        assertStockMovementValid({
          quantity: 0,
          movement_type: 'PURCHASE_RECEIPT',
          destination_warehouse_id: 'wh_1',
        }),
      ).toThrow(InventoryDomainError);

      expect(() =>
        assertStockMovementValid({
          quantity: -10,
          movement_type: 'PURCHASE_RECEIPT',
          destination_warehouse_id: 'wh_1',
        }),
      ).toThrow(InventoryDomainError);
    });

    it('enforces required destination for purchase receipt and source for sales dispatch', () => {
      // Purchase receipt missing destination
      expect(() =>
        assertStockMovementValid({
          quantity: 10,
          movement_type: 'PURCHASE_RECEIPT',
        }),
      ).toThrow(/requires a destination warehouse/);

      // Sales dispatch missing source
      expect(() =>
        assertStockMovementValid({
          quantity: 5,
          movement_type: 'SALES_DISPATCH',
        }),
      ).toThrow(/requires a source warehouse/);
    });

    it('rejects internal transfer between identical locations', () => {
      expect(() =>
        assertStockMovementValid({
          quantity: 10,
          movement_type: 'INTERNAL_TRANSFER',
          source_warehouse_id: 'wh_1',
          destination_warehouse_id: 'wh_1',
          source_location_id: 'loc_a',
          destination_location_id: 'loc_a',
        }),
      ).toThrow(/cannot be identical/);
    });

    it('calculates total valuation in integer minor units without floating point distortion', () => {
      const total = calculateTotalCostMinor(25, '1599'); // 25 units * $15.99
      expect(total).toBe('39975');
    });

    it('calculates Available to Promise (ATP) and evaluates reservation expiry', () => {
      const atp = calculateAvailableToPromise(100, 30, 20); // 100 on hand - 30 reserved + 20 incoming = 90
      expect(atp).toBe(90);

      // Floor at zero
      expect(calculateAvailableToPromise(10, 50, 0)).toBe(0);

      const pastExpiry = '2026-01-01T00:00:00.000Z';
      const futureExpiry = '2099-01-01T00:00:00.000Z';
      expect(isReservationExpired(pastExpiry)).toBe(true);
      expect(isReservationExpired(futureExpiry)).toBe(false);
    });
  });
});
