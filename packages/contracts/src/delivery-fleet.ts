// ============================================================================
// STOKROVA — Fleet Management, Delivery Routing & Proof of Delivery (POD) Contracts
// Benchmark: SAP TM, Manhattan TMS, Odoo 18 Fleet, Onfleet
// Rule 26: Pure integer distance (m), microdegrees (deg * 10^6), zero floats
// ============================================================================

export type VehicleType =
  | 'VAN_CARGO'
  | 'TRUCK_LIGHT'
  | 'TRUCK_HEAVY'
  | 'REFRIGERATED_VAN'
  | 'MOTORCYCLE_EV';

export type VehicleStatus =
  | 'ACTIVE'
  | 'MAINTENANCE_DUE'
  | 'IN_SHOP'
  | 'DECOMMISSIONED';

export type DriverShiftStatus =
  | 'OFF_DUTY'
  | 'ON_DUTY'
  | 'EN_ROUTE'
  | 'BREAK';

export type DeliveryRunStatus =
  | 'PLANNING'
  | 'OPTIMIZED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeliveryStopStatus =
  | 'PENDING'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'ATTEMPTED_FAILED';

export type PodVerificationMethod =
  | 'SIGNATURE'
  | 'PHOTO'
  | 'OTP'
  | 'GEOFENCE';

export type DeliveryFailureReason =
  | 'CUSTOMER_UNAVAILABLE'
  | 'INCORRECT_ADDRESS'
  | 'ACCESS_RESTRICTED'
  | 'CUSTOMER_REJECTED'
  | 'DAMAGED_CARGO'
  | 'OTHER';

export interface FleetVehicle {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  vehicle_code: string;
  license_plate: string;
  make_model: string;
  type: VehicleType;
  status: VehicleStatus;
  max_payload_grams: number;
  max_volume_cm3: number;
  odometer_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FleetDriver {
  id: string;
  tenant_id: string;
  user_id: string;
  driver_code: string;
  full_name: string;
  phone_number: string;
  license_number: string;
  license_expiry_date: string;
  assigned_vehicle_id?: string | null;
  shift_status: DriverShiftStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryStop {
  id: string;
  tenant_id: string;
  run_id: string;
  stop_sequence: number;
  order_id: string;
  order_number: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  latitude_microdegrees?: number | null;
  longitude_microdegrees?: number | null;
  time_window_start?: string | null;
  time_window_end?: string | null;
  estimated_arrival?: string | null;
  actual_arrival?: string | null;
  status: DeliveryStopStatus;
  failure_reason?: DeliveryFailureReason | null;
  total_weight_grams: number;
  total_volume_cm3: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRun {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  run_number: string;
  vehicle_id?: string | null;
  vehicle_code?: string | null;
  driver_id?: string | null;
  driver_name?: string | null;
  status: DeliveryRunStatus;
  total_stops: number;
  completed_stops: number;
  total_weight_grams: number;
  total_volume_cm3: number;
  dispatched_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  stops: DeliveryStop[];
  created_at: string;
  updated_at: string;
}

export interface ProofOfDelivery {
  id: string;
  tenant_id: string;
  run_id: string;
  stop_id: string;
  verification_method: PodVerificationMethod;
  recipient_name: string;
  signature_svg?: string | null;
  photo_url?: string | null;
  otp_code?: string | null;
  delivered_latitude_microdegrees?: number | null;
  delivered_longitude_microdegrees?: number | null;
  geofence_distance_meters?: number | null;
  notes?: string | null;
  delivered_at: string;
  created_at: string;
}

// ----------------------------------------------------------------------------
// DTOs & Request/Response Types
// ----------------------------------------------------------------------------

export interface CreateVehicleRequest {
  warehouse_id: string;
  vehicle_code: string;
  license_plate: string;
  make_model: string;
  type: VehicleType;
  max_payload_grams: number;
  max_volume_cm3: number;
  odometer_meters?: number;
  status?: VehicleStatus;
}

export interface UpdateVehicleRequest {
  license_plate?: string;
  make_model?: string;
  type?: VehicleType;
  max_payload_grams?: number;
  max_volume_cm3?: number;
  odometer_meters?: number;
  status?: VehicleStatus;
  is_active?: boolean;
}

export interface VehicleResponse {
  vehicle: FleetVehicle;
}

export interface ListVehiclesResponse {
  vehicles: FleetVehicle[];
}

export interface CreateDriverRequest {
  user_id: string;
  driver_code: string;
  full_name: string;
  phone_number: string;
  license_number: string;
  license_expiry_date: string;
  assigned_vehicle_id?: string | null;
}

export interface UpdateDriverRequest {
  full_name?: string;
  phone_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  assigned_vehicle_id?: string | null;
  is_active?: boolean;
}

export interface UpdateDriverShiftRequest {
  shift_status: DriverShiftStatus;
}

export interface DriverResponse {
  driver: FleetDriver;
}

export interface ListDriversResponse {
  drivers: FleetDriver[];
}

export interface CreateDeliveryStopRequest {
  order_id: string;
  order_number: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  latitude_microdegrees?: number | null;
  longitude_microdegrees?: number | null;
  time_window_start?: string | null;
  time_window_end?: string | null;
  total_weight_grams: number;
  total_volume_cm3: number;
  notes?: string | null;
}

export interface CreateDeliveryRunRequest {
  warehouse_id: string;
  vehicle_id?: string | null;
  driver_id?: string | null;
  stops: CreateDeliveryStopRequest[];
  notes?: string | null;
}

export interface DispatchRunRequest {
  vehicle_id: string;
  driver_id: string;
  notes?: string | null;
}

export interface DeliveryRunResponse {
  run: DeliveryRun;
}

export interface ListDeliveryRunsResponse {
  runs: DeliveryRun[];
}

export interface SubmitPodRequest {
  verification_method: PodVerificationMethod;
  recipient_name: string;
  signature_svg?: string | null;
  photo_url?: string | null;
  otp_code?: string | null;
  delivered_latitude_microdegrees?: number | null;
  delivered_longitude_microdegrees?: number | null;
  notes?: string | null;
}

export interface FailStopRequest {
  failure_reason: DeliveryFailureReason;
  notes?: string | null;
}

export interface PodResponse {
  pod: ProofOfDelivery;
  stop: DeliveryStop;
}

export interface DeliveryStopResponse {
  stop: DeliveryStop;
}
