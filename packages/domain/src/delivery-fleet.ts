// ============================================================================
// STOKROVA — Fleet Management, Delivery Routing & POD Domain Engine
// Benchmark: SAP TM, Manhattan TMS, Odoo 18 Fleet, Onfleet
// Rule 26: Zero floating-point drift, integer distance (m), microdegrees
// ============================================================================

export type DomainVehicleType =
  | 'VAN_CARGO'
  | 'TRUCK_LIGHT'
  | 'TRUCK_HEAVY'
  | 'REFRIGERATED_VAN'
  | 'MOTORCYCLE_EV';

export type DomainVehicleStatus =
  | 'ACTIVE'
  | 'MAINTENANCE_DUE'
  | 'IN_SHOP'
  | 'DECOMMISSIONED';

export type DomainDriverShiftStatus =
  | 'OFF_DUTY'
  | 'ON_DUTY'
  | 'EN_ROUTE'
  | 'BREAK';

export type DomainDeliveryRunStatus =
  | 'PLANNING'
  | 'OPTIMIZED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type DomainDeliveryStopStatus =
  | 'PENDING'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'ATTEMPTED_FAILED';

export class DeliveryFleetDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DeliveryFleetDomainError';
  }
}

// ----------------------------------------------------------------------------
// 1. Vehicle Capacity Invariants
// ----------------------------------------------------------------------------

export interface DomainVehicleCapacityParams {
  vehicle_code: string;
  status: string;
  is_active: boolean;
  max_payload_grams: number;
  max_volume_cm3: number;
}

export interface DomainStopCargoParams {
  total_weight_grams: number;
  total_volume_cm3: number;
}

/**
 * Validates that vehicle is operational and cargo does not violate weight/volume limits.
 */
export function assertVehicleCapacityLimits(
  vehicle: DomainVehicleCapacityParams,
  stops: DomainStopCargoParams[],
): void {
  if (!vehicle.is_active || vehicle.status !== 'ACTIVE') {
    throw new DeliveryFleetDomainError(
      'VEHICLE_NOT_OPERATIONAL',
      `Vehicle '${vehicle.vehicle_code}' is not operational (status: '${vehicle.status}', active: ${vehicle.is_active}).`,
    );
  }

  const totalWeight = stops.reduce((acc, s) => acc + s.total_weight_grams, 0);
  const totalVolume = stops.reduce((acc, s) => acc + s.total_volume_cm3, 0);

  if (totalWeight > vehicle.max_payload_grams) {
    throw new DeliveryFleetDomainError(
      'PAYLOAD_CAPACITY_EXCEEDED',
      `Run total weight of ${totalWeight}g exceeds vehicle '${vehicle.vehicle_code}' payload capacity of ${vehicle.max_payload_grams}g.`,
    );
  }

  if (totalVolume > vehicle.max_volume_cm3) {
    throw new DeliveryFleetDomainError(
      'VOLUME_CAPACITY_EXCEEDED',
      `Run total volume of ${totalVolume}cm³ exceeds vehicle '${vehicle.vehicle_code}' cargo capacity of ${vehicle.max_volume_cm3}cm³.`,
    );
  }
}

// ----------------------------------------------------------------------------
// 2. Lifecycle State Machine Transitions
// ----------------------------------------------------------------------------

const VALID_RUN_TRANSITIONS: Record<
  DomainDeliveryRunStatus,
  readonly DomainDeliveryRunStatus[]
> = {
  PLANNING: ['OPTIMIZED', 'DISPATCHED', 'CANCELLED'],
  OPTIMIZED: ['DISPATCHED', 'PLANNING', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertDeliveryRunTransition(
  from: DomainDeliveryRunStatus,
  to: DomainDeliveryRunStatus,
): void {
  if (from === to) return;
  const allowed = VALID_RUN_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new DeliveryFleetDomainError(
      'INVALID_RUN_TRANSITION',
      `Illegal delivery run transition from '${from}' to '${to}'.`,
    );
  }
}

const VALID_STOP_TRANSITIONS: Record<
  DomainDeliveryStopStatus,
  readonly DomainDeliveryStopStatus[]
> = {
  PENDING: ['ARRIVED', 'ATTEMPTED_FAILED'],
  ARRIVED: ['DELIVERED', 'ATTEMPTED_FAILED'],
  DELIVERED: [],
  ATTEMPTED_FAILED: ['PENDING'], // Can be retried
};

export function assertDeliveryStopTransition(
  from: DomainDeliveryStopStatus,
  to: DomainDeliveryStopStatus,
): void {
  if (from === to) return;
  const allowed = VALID_STOP_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new DeliveryFleetDomainError(
      'INVALID_STOP_TRANSITION',
      `Illegal delivery stop transition from '${from}' to '${to}'.`,
    );
  }
}

// ----------------------------------------------------------------------------
// 3. Geofence & Proximity Verification (Rule 26)
// ----------------------------------------------------------------------------

/**
 * Calculates Great-Circle distance in integer meters using microdegrees (deg * 10^6).
 * Mean Earth radius = 6,371,000 meters.
 */
export function calculateGeofenceDistanceMeters(
  lat1Micro: number,
  lon1Micro: number,
  lat2Micro: number,
  lon2Micro: number,
): number {
  const DEG_TO_RAD = Math.PI / 180000000;
  const lat1Rad = lat1Micro * DEG_TO_RAD;
  const lon1Rad = lon1Micro * DEG_TO_RAD;
  const lat2Rad = lat2Micro * DEG_TO_RAD;
  const lon2Rad = lon2Micro * DEG_TO_RAD;

  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const R = 6371000; // Earth radius in meters

  return Math.round(R * c);
}

/**
 * Validates that driver location is within the acceptable geofence radius.
 */
export function assertGeofenceWithinThreshold(
  targetLatMicro: number,
  targetLonMicro: number,
  actualLatMicro: number,
  actualLonMicro: number,
  thresholdMeters: number,
): number {
  const distance = calculateGeofenceDistanceMeters(
    targetLatMicro,
    targetLonMicro,
    actualLatMicro,
    actualLonMicro,
  );

  if (distance > thresholdMeters) {
    throw new DeliveryFleetDomainError(
      'GEOFENCE_BREACH',
      `Driver location is ${distance}m away, which exceeds maximum permitted geofence of ${thresholdMeters}m.`,
    );
  }

  return distance;
}

/**
 * Evaluates whether all stops on a run have concluded execution.
 */
export function evaluateRunCompletion(
  stops: Array<{ status: DomainDeliveryStopStatus }>,
): boolean {
  if (stops.length === 0) return false;
  return stops.every(
    (s) => s.status === 'DELIVERED' || s.status === 'ATTEMPTED_FAILED',
  );
}
