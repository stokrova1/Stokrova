import { describe, it, expect } from 'vitest';
import {
  assertShipmentTransition,
  assertFulfillmentTransition,
  validateFulfillmentQuantities,
  reconcileDeliveredQuantities,
  calculateTotalLogisticsCharges,
  reconcileProviderMilestone,
  evaluateDeliveryAttemptPolicy,
  assertRunCapacityLimits,
  LogisticsDomainError,
} from '../src/logistics.js';

describe('Logistics Pure Domain Engine', () => {
  it('validates legal shipment lifecycle transitions and rejects illegal ones', () => {
    // Legal transitions
    expect(() => assertShipmentTransition('DRAFT', 'READY_FOR_DISPATCH')).not.toThrow();
    expect(() => assertShipmentTransition('READY_FOR_DISPATCH', 'DISPATCHED')).not.toThrow();
    expect(() => assertShipmentTransition('DISPATCHED', 'IN_TRANSIT')).not.toThrow();
    expect(() => assertShipmentTransition('IN_TRANSIT', 'OUT_FOR_DELIVERY')).not.toThrow();
    expect(() => assertShipmentTransition('OUT_FOR_DELIVERY', 'DELIVERED')).not.toThrow();

    // Dispatched shipment cannot be cancelled
    expect(() => assertShipmentTransition('DISPATCHED', 'CANCELLED')).toThrow(LogisticsDomainError);
    expect(() => assertShipmentTransition('DISPATCHED', 'CANCELLED')).toThrow(
      /Shipment has already been physically dispatched/,
    );

    // Terminal states cannot transition
    expect(() => assertShipmentTransition('DELIVERED', 'IN_TRANSIT')).toThrow(LogisticsDomainError);
    expect(() => assertShipmentTransition('CANCELLED', 'DRAFT')).toThrow(LogisticsDomainError);
  });

  it('validates legal fulfillment lifecycle transitions', () => {
    expect(() => assertFulfillmentTransition('PLANNED', 'ALLOCATED')).not.toThrow();
    expect(() => assertFulfillmentTransition('ALLOCATED', 'PACKING')).not.toThrow();
    expect(() => assertFulfillmentTransition('PACKING', 'READY_FOR_DISPATCH')).not.toThrow();
    expect(() => assertFulfillmentTransition('READY_FOR_DISPATCH', 'DISPATCHED')).not.toThrow();
    expect(() => assertFulfillmentTransition('DISPATCHED', 'COMPLETED')).not.toThrow();

    // Hold from anywhere
    expect(() => assertFulfillmentTransition('PACKING', 'HOLD')).not.toThrow();
    expect(() => assertFulfillmentTransition('HOLD', 'PACKING')).not.toThrow();

    // Illegal jump
    expect(() => assertFulfillmentTransition('PLANNED', 'COMPLETED')).toThrow(LogisticsDomainError);
  });

  it('validates fulfillment item quantities against order lines', () => {
    const orderLines = [
      { id: 'ol_1', quantity: 10 },
      { id: 'ol_2', quantity: 5 },
    ];

    // Valid partial fulfillment
    expect(() =>
      validateFulfillmentQuantities(orderLines, [
        { order_line_id: 'ol_1', quantity: 4 },
        { order_line_id: 'ol_2', quantity: 5 },
      ]),
    ).not.toThrow();

    // Exceeding quantity throws error
    expect(() =>
      validateFulfillmentQuantities(orderLines, [
        { order_line_id: 'ol_1', quantity: 12 },
      ]),
    ).toThrow(/exceeds available order line quantity/);

    // Invalid non-positive quantity throws error
    expect(() =>
      validateFulfillmentQuantities(orderLines, [
        { order_line_id: 'ol_1', quantity: 0 },
      ]),
    ).toThrow(/must be greater than zero/);
  });

  it('reconciles delivered quantities and calculates integer basis points ratio', () => {
    // 5 of 10 delivered = 50.00% (5000 bp)
    const partial = reconcileDeliveredQuantities(10, 0, 5);
    expect(partial.isFullyDelivered).toBe(false);
    expect(partial.remainingQuantity).toBe(5);
    expect(partial.deliveryRatioBp).toBe(5000);

    // Remaining 5 delivered = 100.00% (10000 bp)
    const full = reconcileDeliveredQuantities(10, 5, 5);
    expect(full.isFullyDelivered).toBe(true);
    expect(full.remainingQuantity).toBe(0);
    expect(full.deliveryRatioBp).toBe(10000);
  });

  it('calculates total logistics charges with pure integer minor units', () => {
    const charges = [
      { amount_minor: '1500' }, // $15.00 freight
      { amount_minor: '350' },  // $3.50 fuel surcharge
      { amount_minor: 200n },   // $2.00 handling
    ];
    const total = calculateTotalLogisticsCharges(charges);
    expect(total).toBe(2050n); // $20.50
  });

  it('reconciles carrier milestones, ignoring stale or backward regression updates', () => {
    // Forward progress allowed
    const forward = reconcileProviderMilestone('DISPATCHED', 'IN_TRANSIT');
    expect(forward.shouldUpdate).toBe(true);

    // Backward regression ignored
    const regression = reconcileProviderMilestone('OUT_FOR_DELIVERY', 'IN_TRANSIT');
    expect(regression.shouldUpdate).toBe(false);
    expect(regression.reason).toContain('backward regression');

    // Post-terminal update ignored
    const postDelivered = reconcileProviderMilestone('DELIVERED', 'IN_TRANSIT');
    expect(postDelivered.shouldUpdate).toBe(false);
    expect(postDelivered.reason).toContain('already in terminal state');
  });

  it('evaluates delivery attempt policy to reschedule or trigger return to origin', () => {
    // Attempt 1 of 3 -> reschedule
    const attempt1 = evaluateDeliveryAttemptPolicy(1, 3);
    expect(attempt1.action).toBe('RESCHEDULE');
    expect(attempt1.attemptsRemaining).toBe(2);

    // Attempt 3 of 3 -> return to origin
    const attempt3 = evaluateDeliveryAttemptPolicy(3, 3);
    expect(attempt3.action).toBe('RETURN_TO_ORIGIN');
    expect(attempt3.attemptsRemaining).toBe(0);
  });

  it('verifies run capacity limits against weight and volume', () => {
    expect(() =>
      assertRunCapacityLimits(500000, 1000000, 450000, 900000),
    ).not.toThrow();

    expect(() =>
      assertRunCapacityLimits(500000, 1000000, 550000, 900000),
    ).toThrow(/exceeds vehicle payload capacity/);

    expect(() =>
      assertRunCapacityLimits(500000, 1000000, 450000, 1100000),
    ).toThrow(/exceeds vehicle cargo volume capacity/);
  });
});
