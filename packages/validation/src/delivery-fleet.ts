import { z } from 'zod';

export const VehicleTypeSchema = z.enum([
  'VAN_CARGO',
  'TRUCK_LIGHT',
  'TRUCK_HEAVY',
  'REFRIGERATED_VAN',
  'MOTORCYCLE_EV',
]);

export const VehicleStatusSchema = z.enum([
  'ACTIVE',
  'MAINTENANCE_DUE',
  'IN_SHOP',
  'DECOMMISSIONED',
]);

export const DriverShiftStatusSchema = z.enum([
  'OFF_DUTY',
  'ON_DUTY',
  'EN_ROUTE',
  'BREAK',
]);

export const DeliveryRunStatusSchema = z.enum([
  'PLANNING',
  'OPTIMIZED',
  'DISPATCHED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
]);

export const DeliveryStopStatusSchema = z.enum([
  'PENDING',
  'ARRIVED',
  'DELIVERED',
  'ATTEMPTED_FAILED',
]);

export const PodVerificationMethodSchema = z.enum([
  'SIGNATURE',
  'PHOTO',
  'OTP',
  'GEOFENCE',
]);

export const DeliveryFailureReasonSchema = z.enum([
  'CUSTOMER_UNAVAILABLE',
  'INCORRECT_ADDRESS',
  'ACCESS_RESTRICTED',
  'CUSTOMER_REJECTED',
  'DAMAGED_CARGO',
  'OTHER',
]);

export const CreateVehicleSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  vehicle_code: z
    .string()
    .min(1, 'Vehicle code is required')
    .max(50, 'Vehicle code cannot exceed 50 characters'),
  license_plate: z
    .string()
    .min(1, 'License plate is required')
    .max(20, 'License plate cannot exceed 20 characters'),
  make_model: z.string().min(1, 'Make and model is required').max(100),
  type: VehicleTypeSchema,
  max_payload_grams: z.number().int().positive('Max payload must be positive grams'),
  max_volume_cm3: z.number().int().positive('Max volume must be positive cm3'),
  odometer_meters: z.number().int().nonnegative().optional().default(0),
  status: VehicleStatusSchema.optional().default('ACTIVE'),
});

export const UpdateVehicleSchema = z.object({
  license_plate: z.string().min(1).max(20).optional(),
  make_model: z.string().min(1).max(100).optional(),
  type: VehicleTypeSchema.optional(),
  max_payload_grams: z.number().int().positive().optional(),
  max_volume_cm3: z.number().int().positive().optional(),
  odometer_meters: z.number().int().nonnegative().optional(),
  status: VehicleStatusSchema.optional(),
  is_active: z.boolean().optional(),
});

export const CreateDriverSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  driver_code: z.string().min(1, 'Driver code is required').max(50),
  full_name: z.string().min(1, 'Full name is required').max(100),
  phone_number: z.string().min(1, 'Phone number is required').max(30),
  license_number: z.string().min(1, 'License number is required').max(50),
  license_expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'License expiry date must be in YYYY-MM-DD format'),
  assigned_vehicle_id: z.string().nullable().optional(),
});

export const UpdateDriverSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone_number: z.string().min(1).max(30).optional(),
  license_number: z.string().min(1).max(50).optional(),
  license_expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'License expiry date must be in YYYY-MM-DD format')
    .optional(),
  assigned_vehicle_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const UpdateDriverShiftSchema = z.object({
  shift_status: DriverShiftStatusSchema,
});

export const CreateDeliveryStopSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  order_number: z.string().min(1, 'Order number is required'),
  recipient_name: z.string().min(1, 'Recipient name is required').max(100),
  recipient_phone: z.string().min(1, 'Recipient phone is required').max(30),
  delivery_address: z.string().min(1, 'Delivery address is required').max(300),
  latitude_microdegrees: z.number().int().nullable().optional(),
  longitude_microdegrees: z.number().int().nullable().optional(),
  time_window_start: z.string().nullable().optional(),
  time_window_end: z.string().nullable().optional(),
  total_weight_grams: z.number().int().positive('Total weight must be positive grams'),
  total_volume_cm3: z.number().int().positive('Total volume must be positive cm3'),
  notes: z.string().max(500).nullable().optional(),
});

export const CreateDeliveryRunSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse ID is required'),
  vehicle_id: z.string().nullable().optional(),
  driver_id: z.string().nullable().optional(),
  stops: z.array(CreateDeliveryStopSchema).min(1, 'At least one delivery stop is required'),
  notes: z.string().max(1000).nullable().optional(),
});

export const DispatchRunSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  driver_id: z.string().min(1, 'Driver ID is required'),
  notes: z.string().max(500).nullable().optional(),
});

export const SubmitPodSchema = z.object({
  verification_method: PodVerificationMethodSchema,
  recipient_name: z.string().min(1, 'Recipient name is required').max(100),
  signature_svg: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  otp_code: z.string().length(6, 'OTP must be 6 digits').nullable().optional(),
  delivered_latitude_microdegrees: z.number().int().nullable().optional(),
  delivered_longitude_microdegrees: z.number().int().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const FailStopSchema = z.object({
  failure_reason: DeliveryFailureReasonSchema,
  notes: z.string().max(500).nullable().optional(),
});
