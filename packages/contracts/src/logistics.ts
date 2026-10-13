// ============================================================================
// STOKROVA — Advanced Logistics, Fulfillment & Distribution Contracts (Phase 10)
// Benchmark: SAP TM, Manhattan TMS, Odoo 18 Shipping, Flexport, ShipStation
// Rule 26: Pure integer minor units, integer grams, basis points, zero floats
// ============================================================================

export type FulfillmentStatus =
  | 'PLANNED'
  | 'ALLOCATED'
  | 'PACKING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'HOLD'
  | 'CANCELLED';

export type FulfillmentPriority =
  | 'LOW'
  | 'STANDARD'
  | 'HIGH'
  | 'URGENT';

export type ShipmentStatus =
  | 'DRAFT'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT'
  | 'EXCEPTION'
  | 'RETURNED_TO_ORIGIN'
  | 'CANCELLED';

export type CarrierType =
  | 'INTERNAL_FLEET'
  | 'EXTERNAL_CARRIER'
  | 'POSTAL'
  | 'LOCAL_COURIER';

export type PackagingType =
  | 'BOX'
  | 'PALLET'
  | 'ENVELOPE'
  | 'CRATE'
  | 'TUBE';

export type LogisticsChargeType =
  | 'CARRIER_FREIGHT'
  | 'FUEL_SURCHARGE'
  | 'HANDLING_FEE'
  | 'CUSTOMER_DELIVERY_FEE';

export type LogisticsChargeProvenance =
  | 'ESTIMATED'
  | 'QUOTED'
  | 'CONFIRMED_ACTUAL';

export type DeliveryAttemptOutcome =
  | 'DELIVERED'
  | 'CUSTOMER_UNAVAILABLE'
  | 'INCORRECT_ADDRESS'
  | 'ACCESS_RESTRICTED'
  | 'REJECTED'
  | 'DAMAGED'
  | 'RESCHEDULED';

// ----------------------------------------------------------------------------
// Core Entities
// ----------------------------------------------------------------------------

export interface FulfillmentLine {
  id: string;
  tenant_id: string;
  fulfillment_id: string;
  order_line_id: string;
  variant_id: string;
  sku: string;
  quantity_allocated: number;
  quantity_packed: number;
  quantity_dispatched: number;
  created_at: string;
  updated_at: string;
}

export interface Fulfillment {
  id: string;
  tenant_id: string;
  fulfillment_number: string;
  order_id: string;
  warehouse_id: string;
  status: FulfillmentStatus;
  priority: FulfillmentPriority;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  hold_reason?: string | null;
  hold_approved_by?: string | null;
  released_at?: string | null;
  lines: FulfillmentLine[];
  created_at: string;
  updated_at: string;
}

export interface Carrier {
  id: string;
  tenant_id: string;
  carrier_code: string;
  name: string;
  type: CarrierType;
  api_endpoint?: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CarrierService {
  id: string;
  tenant_id: string;
  carrier_id: string;
  service_code: string;
  name: string;
  estimated_transit_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingQuote {
  id: string;
  tenant_id: string;
  quote_number: string;
  service_id: string;
  service_code: string;
  carrier_name: string;
  cost_minor: string;
  currency: string;
  estimated_transit_days: number;
  expires_at: string;
  parameters: Record<string, unknown>;
  created_at: string;
}

export interface ShipmentLine {
  id: string;
  tenant_id: string;
  shipment_id: string;
  fulfillment_line_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  created_at: string;
}

export interface ShipmentPackage {
  id: string;
  tenant_id: string;
  shipment_id: string;
  package_number: string;
  tracking_number?: string | null;
  weight_grams: number;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  packaging_type: PackagingType;
  created_at: string;
}

export interface ShipmentMilestone {
  id: string;
  tenant_id: string;
  shipment_id: string;
  status: ShipmentStatus;
  description: string;
  location?: string | null;
  provider_event_id?: string | null;
  recorded_at: string;
  created_at: string;
}

export interface LogisticsCharge {
  id: string;
  tenant_id: string;
  shipment_id: string;
  charge_type: LogisticsChargeType;
  provenance: LogisticsChargeProvenance;
  amount_minor: string;
  currency: string;
  notes?: string | null;
  created_at: string;
}

export interface LogisticsPolicy {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  name: string;
  cutoff_time?: string | null; // e.g. "17:00"
  max_delivery_attempts: number;
  required_pod_method: string;
  allow_partial_delivery: boolean;
  auto_reschedule: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  tenant_id: string;
  shipment_number: string;
  order_id: string;
  fulfillment_id: string;
  warehouse_id: string;
  carrier_id?: string | null;
  carrier_service_id?: string | null;
  run_id?: string | null;
  stop_id?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
  status: ShipmentStatus;
  lines: ShipmentLine[];
  packages: ShipmentPackage[];
  milestones: ShipmentMilestone[];
  charges: LogisticsCharge[];
  dispatched_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Request & Response DTOs
// ----------------------------------------------------------------------------

export interface PlanFulfillmentItem {
  order_line_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
}

export interface PlanFulfillmentRequest {
  order_id: string;
  warehouse_id: string;
  priority?: FulfillmentPriority;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  items: PlanFulfillmentItem[];
}

export interface FulfillmentResponse {
  fulfillment: Fulfillment;
}

export interface ListFulfillmentsResponse {
  fulfillments: Fulfillment[];
}

export interface HoldFulfillmentRequest {
  hold_reason: string;
}

export interface ReleaseFulfillmentRequest {
  approved_by: string;
}

export interface CreateShipmentPackageInput {
  package_number: string;
  weight_grams: number;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  packaging_type?: PackagingType;
}

export interface CreateShipmentLineInput {
  fulfillment_line_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
}

export interface CreateShipmentRequest {
  fulfillment_id: string;
  carrier_id?: string | null;
  carrier_service_id?: string | null;
  packages: CreateShipmentPackageInput[];
  lines: CreateShipmentLineInput[];
}

export interface ShipmentResponse {
  shipment: Shipment;
}

export interface ListShipmentsResponse {
  shipments: Shipment[];
}

export interface BookCarrierShipmentRequest {
  service_id: string;
  operation_id: string;
}

export interface TransitionShipmentRequest {
  status: ShipmentStatus;
  reason?: string;
  location?: string;
  provider_event_id?: string;
}

export interface CancelShipmentRequest {
  reason: string;
}

export interface QuoteShippingRequest {
  warehouse_id: string;
  destination_postal_code: string;
  total_weight_grams: number;
  package_count: number;
  currency?: string;
}

export interface ShippingQuoteResponse {
  quotes: ShippingQuote[];
}

export interface AddShipmentMilestoneRequest {
  status: ShipmentStatus;
  description: string;
  location?: string | null;
  provider_event_id?: string | null;
}

export interface RecordDeliveryAttemptRequest {
  outcome: DeliveryAttemptOutcome;
  reason?: string | null;
  notes?: string | null;
  latitude_microdegrees?: number | null;
  longitude_microdegrees?: number | null;
}

export interface CreateReshipmentRequest {
  original_shipment_id: string;
  reason: string;
}

export interface CarrierWebhookPayload {
  carrier_code: string;
  tracking_number: string;
  provider_event_id: string;
  event_type: string;
  status: ShipmentStatus;
  location?: string | null;
  description: string;
  timestamp: string;
  signature?: string;
}

export interface AddLogisticsChargeRequest {
  charge_type: LogisticsChargeType;
  provenance: LogisticsChargeProvenance;
  amount_minor: string;
  currency: string;
  notes?: string | null;
}
