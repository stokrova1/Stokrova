import { z } from 'zod';

export const PlanFulfillmentItemSchema = z.object({
  order_line_id: z.string().min(1),
  variant_id: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const PlanFulfillmentSchema = z.object({
  order_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  priority: z.enum(['LOW', 'STANDARD', 'HIGH', 'URGENT']).default('STANDARD'),
  delivery_window_start: z.string().nullable().optional(),
  delivery_window_end: z.string().nullable().optional(),
  items: z.array(PlanFulfillmentItemSchema).min(1),
});

export const HoldFulfillmentSchema = z.object({
  hold_reason: z.string().min(1),
});

export const ReleaseFulfillmentSchema = z.object({
  approved_by: z.string().min(1),
});

export const CreateShipmentPackageInputSchema = z.object({
  package_number: z.string().min(1),
  weight_grams: z.number().int().nonnegative(),
  length_cm: z.number().int().positive().nullable().optional(),
  width_cm: z.number().int().positive().nullable().optional(),
  height_cm: z.number().int().positive().nullable().optional(),
  packaging_type: z.enum(['BOX', 'PALLET', 'ENVELOPE', 'CRATE', 'TUBE']).default('BOX'),
});

export const CreateShipmentLineInputSchema = z.object({
  fulfillment_line_id: z.string().min(1),
  variant_id: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const CreateShipmentSchema = z.object({
  fulfillment_id: z.string().min(1),
  carrier_id: z.string().nullable().optional(),
  carrier_service_id: z.string().nullable().optional(),
  packages: z.array(CreateShipmentPackageInputSchema).default([]),
  lines: z.array(CreateShipmentLineInputSchema).min(1),
});

export const BookCarrierShipmentSchema = z.object({
  service_id: z.string().min(1),
  operation_id: z.string().min(1),
});

export const TransitionShipmentSchema = z.object({
  status: z.enum([
    'DRAFT',
    'READY_FOR_DISPATCH',
    'DISPATCHED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED_ATTEMPT',
    'EXCEPTION',
    'RETURNED_TO_ORIGIN',
    'CANCELLED',
  ]),
  reason: z.string().optional(),
  location: z.string().optional(),
  provider_event_id: z.string().optional(),
});

export const CancelShipmentSchema = z.object({
  reason: z.string().min(1),
});

export const QuoteShippingSchema = z.object({
  warehouse_id: z.string().min(1),
  destination_postal_code: z.string().min(1),
  total_weight_grams: z.number().int().positive(),
  package_count: z.number().int().positive().default(1),
  currency: z.string().default('USD'),
});

export const AddShipmentMilestoneSchema = z.object({
  status: z.enum([
    'DRAFT',
    'READY_FOR_DISPATCH',
    'DISPATCHED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED_ATTEMPT',
    'EXCEPTION',
    'RETURNED_TO_ORIGIN',
    'CANCELLED',
  ]),
  description: z.string().min(1),
  location: z.string().nullable().optional(),
  provider_event_id: z.string().nullable().optional(),
});

export const RecordDeliveryAttemptSchema = z.object({
  outcome: z.enum([
    'DELIVERED',
    'CUSTOMER_UNAVAILABLE',
    'INCORRECT_ADDRESS',
    'ACCESS_RESTRICTED',
    'REJECTED',
    'DAMAGED',
    'RESCHEDULED',
  ]),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  latitude_microdegrees: z.number().int().nullable().optional(),
  longitude_microdegrees: z.number().int().nullable().optional(),
});

export const CreateReshipmentSchema = z.object({
  original_shipment_id: z.string().min(1),
  reason: z.string().min(1),
});

export const CarrierWebhookPayloadSchema = z.object({
  carrier_code: z.string().min(1),
  tracking_number: z.string().min(1),
  provider_event_id: z.string().min(1),
  event_type: z.string().min(1),
  status: z.enum([
    'DRAFT',
    'READY_FOR_DISPATCH',
    'DISPATCHED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED_ATTEMPT',
    'EXCEPTION',
    'RETURNED_TO_ORIGIN',
    'CANCELLED',
  ]),
  location: z.string().nullable().optional(),
  description: z.string().min(1),
  timestamp: z.string().min(1),
  signature: z.string().optional(),
});

export const AddLogisticsChargeSchema = z.object({
  charge_type: z.enum([
    'CARRIER_FREIGHT',
    'FUEL_SURCHARGE',
    'HANDLING_FEE',
    'CUSTOMER_DELIVERY_FEE',
  ]),
  provenance: z.enum(['ESTIMATED', 'QUOTED', 'CONFIRMED_ACTUAL']),
  amount_minor: z.string().regex(/^\d+$/),
  currency: z.string().min(3).max(3).default('USD'),
  notes: z.string().nullable().optional(),
});
