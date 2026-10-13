import { describe, it, expect } from 'vitest';
import {
  canTransitionSalesOrderStatus,
  calculateOrderLineTotals,
  calculateOrderSummary,
  assertValidLineFulfillment,
  evaluateOrderFulfillmentStatus,
  SalesOrderStatuses,
  OrderFulfillmentStatuses,
  OrderDomainError,
  OverFulfillmentDomainError,
} from '../src/orders.js';

describe('Sales Orders & Fulfillment Domain Engine (Phase 3D)', () => {
  describe('State Machine Transitions', () => {
    it('permits valid order state transitions', () => {
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.DRAFT, SalesOrderStatuses.CONFIRMED)).toBe(true);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.CONFIRMED, SalesOrderStatuses.RESERVED)).toBe(true);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.CONFIRMED, SalesOrderStatuses.DISPATCHED)).toBe(true);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.RESERVED, SalesOrderStatuses.PICKING)).toBe(true);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.PICKING, SalesOrderStatuses.PACKING)).toBe(true);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.PACKING, SalesOrderStatuses.DISPATCHED)).toBe(true);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.DISPATCHED, SalesOrderStatuses.DELIVERED)).toBe(true);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.DRAFT, SalesOrderStatuses.CANCELLED)).toBe(true);
    });

    it('rejects invalid state transitions', () => {
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.DRAFT, SalesOrderStatuses.DELIVERED)).toBe(false);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.DELIVERED, SalesOrderStatuses.DRAFT)).toBe(false);
      expect(canTransitionSalesOrderStatus(SalesOrderStatuses.CANCELLED, SalesOrderStatuses.CONFIRMED)).toBe(false);
    });
  });

  describe('Line Item & Order Totals Math', () => {
    it('computes line item subtotal, discount, tax, and line total correctly', () => {
      // 3 units @ $25.00 (2500 minor) = $75.00 (7500 minor)
      // Discount = $5.00 (500 minor)
      // Tax = $7.00 (700 minor)
      // Total = 7500 - 500 + 700 = 7700 ($77.00)
      const line = calculateOrderLineTotals({
        quantity: 3,
        unit_price_minor: 2500n,
        discount_minor: 500n,
        tax_minor: 700n,
      });

      expect(line.subtotal_minor).toBe(7500n);
      expect(line.discount_minor).toBe(500n);
      expect(line.tax_minor).toBe(700n);
      expect(line.line_total_minor).toBe(7700n);
    });

    it('aggregates multiple line items into overall order summary', () => {
      const line1 = calculateOrderLineTotals({
        quantity: 2,
        unit_price_minor: 5000n, // $100.00
        discount_minor: 1000n,  // -$10.00
        tax_minor: 900n,        // +$9.00 -> 9900
      });

      const line2 = calculateOrderLineTotals({
        quantity: 1,
        unit_price_minor: 3000n, // $30.00
        discount_minor: 0n,
        tax_minor: 300n,        // +$3.00 -> 3300
      });

      const summary = calculateOrderSummary([line1, line2]);

      expect(summary.subtotal_minor).toBe(13000n);
      expect(summary.total_discount_minor).toBe(1000n);
      expect(summary.total_tax_minor).toBe(1200n);
      expect(summary.grand_total_minor).toBe(13200n);
    });

    it('rejects line items with discount greater than subtotal', () => {
      expect(() =>
        calculateOrderLineTotals({
          quantity: 1,
          unit_price_minor: 1000n,
          discount_minor: 1500n,
        }),
      ).toThrow(OrderDomainError);
    });
  });

  describe('Fulfillment Progress & Over-Fulfillment Prevention', () => {
    it('permits valid partial fulfillment', () => {
      expect(() => assertValidLineFulfillment(10, 0, 5)).not.toThrow();
      expect(() => assertValidLineFulfillment(10, 5, 5)).not.toThrow();
    });

    it('throws OverFulfillmentDomainError when attempting to fulfill more than ordered', () => {
      expect(() => assertValidLineFulfillment(10, 8, 3)).toThrow(
        OverFulfillmentDomainError,
      );
    });

    it('accurately evaluates order fulfillment status across lines', () => {
      // All unfulfilled
      expect(
        evaluateOrderFulfillmentStatus([
          { quantity: 5, fulfilled_quantity: 0 },
          { quantity: 2, fulfilled_quantity: 0 },
        ]),
      ).toBe(OrderFulfillmentStatuses.UNFULFILLED);

      // Partially fulfilled
      expect(
        evaluateOrderFulfillmentStatus([
          { quantity: 5, fulfilled_quantity: 5 },
          { quantity: 2, fulfilled_quantity: 0 },
        ]),
      ).toBe(OrderFulfillmentStatuses.PARTIALLY_FULFILLED);

      // Fully fulfilled
      expect(
        evaluateOrderFulfillmentStatus([
          { quantity: 5, fulfilled_quantity: 5 },
          { quantity: 2, fulfilled_quantity: 2 },
        ]),
      ).toBe(OrderFulfillmentStatuses.FULFILLED);
    });
  });
});
