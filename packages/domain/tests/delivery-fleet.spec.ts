import { describe, it, expect } from 'vitest';
import {
  assertVehicleCapacityLimits,
  assertDeliveryRunTransition,
  assertDeliveryStopTransition,
  calculateGeofenceDistanceMeters,
  assertGeofenceWithinThreshold,
  evaluateRunCompletion,
  DeliveryFleetDomainError,
} from '../src/delivery-fleet.js';

describe('Fleet Management, Delivery Routing & POD Domain Engine (Phase 9)', () => {
  // ==========================================================================
  // 1. Vehicle Capacity Invariants
  // ==========================================================================
  describe('assertVehicleCapacityLimits', () => {
    const activeVan = {
      vehicle_code: 'VAN-01',
      status: 'ACTIVE',
      is_active: true,
      max_payload_grams: 1000000, // 1000 kg
      max_volume_cm3: 8000000,   // 8 m3
    };

    it('passes when cargo weight and volume are within vehicle capacity', () => {
      const stops = [
        { total_weight_grams: 200000, total_volume_cm3: 2000000 },
        { total_weight_grams: 500000, total_volume_cm3: 4000000 },
      ];
      expect(() => assertVehicleCapacityLimits(activeVan, stops)).not.toThrow();
    });

    it('rejects cargo exceeding vehicle payload capacity', () => {
      const stops = [
        { total_weight_grams: 600000, total_volume_cm3: 1000000 },
        { total_weight_grams: 500000, total_volume_cm3: 1000000 }, // Total = 1,100,000 > 1,000,000
      ];
      expect(() => assertVehicleCapacityLimits(activeVan, stops)).toThrowError(
        /exceeds vehicle 'VAN-01' payload capacity/,
      );
    });

    it('rejects cargo exceeding vehicle volume capacity', () => {
      const stops = [
        { total_weight_grams: 100000, total_volume_cm3: 5000000 },
        { total_weight_grams: 100000, total_volume_cm3: 4000000 }, // Total = 9,000,000 > 8,000,000
      ];
      expect(() => assertVehicleCapacityLimits(activeVan, stops)).toThrowError(
        /exceeds vehicle 'VAN-01' cargo capacity/,
      );
    });

    it('rejects assignment to non-operational or inactive vehicle', () => {
      const inShopVan = { ...activeVan, status: 'IN_SHOP' };
      expect(() => assertVehicleCapacityLimits(inShopVan, [])).toThrowError(
        /not operational/,
      );

      const inactiveVan = { ...activeVan, is_active: false };
      expect(() => assertVehicleCapacityLimits(inactiveVan, [])).toThrowError(
        /not operational/,
      );
    });
  });

  // ==========================================================================
  // 2. Lifecycle State Machine Transitions
  // ==========================================================================
  describe('assertDeliveryRunTransition', () => {
    it('allows valid delivery run lifecycle progression', () => {
      expect(() => assertDeliveryRunTransition('PLANNING', 'OPTIMIZED')).not.toThrow();
      expect(() => assertDeliveryRunTransition('OPTIMIZED', 'DISPATCHED')).not.toThrow();
      expect(() => assertDeliveryRunTransition('DISPATCHED', 'IN_TRANSIT')).not.toThrow();
      expect(() => assertDeliveryRunTransition('IN_TRANSIT', 'COMPLETED')).not.toThrow();
    });

    it('allows direct dispatch from PLANNING and cancellations', () => {
      expect(() => assertDeliveryRunTransition('PLANNING', 'DISPATCHED')).not.toThrow();
      expect(() => assertDeliveryRunTransition('DISPATCHED', 'CANCELLED')).not.toThrow();
    });

    it('rejects illegal transitions from terminal states', () => {
      expect(() => assertDeliveryRunTransition('COMPLETED', 'IN_TRANSIT')).toThrow(
        DeliveryFleetDomainError,
      );
      expect(() => assertDeliveryRunTransition('CANCELLED', 'PLANNING')).toThrow(
        DeliveryFleetDomainError,
      );
    });
  });

  describe('assertDeliveryStopTransition', () => {
    it('allows valid delivery stop progression: PENDING -> ARRIVED -> DELIVERED', () => {
      expect(() => assertDeliveryStopTransition('PENDING', 'ARRIVED')).not.toThrow();
      expect(() => assertDeliveryStopTransition('ARRIVED', 'DELIVERED')).not.toThrow();
    });

    it('allows recording delivery attempt failure and retry reset', () => {
      expect(() => assertDeliveryStopTransition('ARRIVED', 'ATTEMPTED_FAILED')).not.toThrow();
      expect(() => assertDeliveryStopTransition('ATTEMPTED_FAILED', 'PENDING')).not.toThrow();
    });

    it('rejects transition from terminal DELIVERED state', () => {
      expect(() => assertDeliveryStopTransition('DELIVERED', 'PENDING')).toThrow(
        DeliveryFleetDomainError,
      );
    });
  });

  // ==========================================================================
  // 3. Geofence & Proximity Verification (Rule 26)
  // ==========================================================================
  describe('Geofence Distance & Threshold Verification', () => {
    // London Trafalgar Square: 51.508000, -0.128100
    // Leicester Square (~350m away): 51.511300, -0.128300
    const trafalgarLat = 51508000;
    const trafalgarLon = -128100;
    const leicesterLat = 51511300;
    const leicesterLon = -128300;

    it('calculates integer distance between microdegree coordinates', () => {
      const distance = calculateGeofenceDistanceMeters(
        trafalgarLat,
        trafalgarLon,
        leicesterLat,
        leicesterLon,
      );
      expect(distance).toBeGreaterThan(300);
      expect(distance).toBeLessThan(400);
      expect(Number.isInteger(distance)).toBe(true);
    });

    it('passes when within geofence threshold', () => {
      // 500m threshold
      const dist = assertGeofenceWithinThreshold(
        trafalgarLat,
        trafalgarLon,
        leicesterLat,
        leicesterLon,
        500,
      );
      expect(dist).toBeGreaterThan(0);
    });

    it('throws GEOFENCE_BREACH when exceeding threshold', () => {
      // 100m threshold (too small for 350m distance)
      expect(() =>
        assertGeofenceWithinThreshold(
          trafalgarLat,
          trafalgarLon,
          leicesterLat,
          leicesterLon,
          100,
        ),
      ).toThrowError(/exceeds maximum permitted geofence/);
    });
  });

  // ==========================================================================
  // 4. Delivery Run Completion Evaluator
  // ==========================================================================
  describe('evaluateRunCompletion', () => {
    it('returns true when all stops are delivered or attempted failed', () => {
      const stops = [
        { status: 'DELIVERED' as const },
        { status: 'DELIVERED' as const },
        { status: 'ATTEMPTED_FAILED' as const },
      ];
      expect(evaluateRunCompletion(stops)).toBe(true);
    });

    it('returns false when any stop is still pending or arrived', () => {
      const stops = [
        { status: 'DELIVERED' as const },
        { status: 'ARRIVED' as const },
      ];
      expect(evaluateRunCompletion(stops)).toBe(false);

      const pendingStops = [
        { status: 'PENDING' as const },
      ];
      expect(evaluateRunCompletion(pendingStops)).toBe(false);
    });
  });
});
