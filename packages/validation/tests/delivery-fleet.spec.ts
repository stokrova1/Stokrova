import { describe, it, expect } from 'vitest';
import {
  CreateVehicleSchema,
  UpdateVehicleSchema,
  CreateDriverSchema,
  UpdateDriverShiftSchema,
  CreateDeliveryRunSchema,
  DispatchRunSchema,
  SubmitPodSchema,
  FailStopSchema,
} from '../src/delivery-fleet.js';

describe('Fleet Management, Delivery Routing & POD Validation Schemas (Phase 9)', () => {
  describe('CreateVehicleSchema and UpdateVehicleSchema', () => {
    it('validates a complete vehicle payload', () => {
      const valid = {
        warehouse_id: 'wh_main_01',
        vehicle_code: 'VEH-VAN-001',
        license_plate: 'AB12 CDE',
        make_model: 'Mercedes-Benz Sprinter 314 CDI',
        type: 'VAN_CARGO',
        max_payload_grams: 1200000,
        max_volume_cm3: 11000000,
        odometer_meters: 45000000,
        status: 'ACTIVE',
      };

      const parsed = CreateVehicleSchema.parse(valid);
      expect(parsed.vehicle_code).toBe('VEH-VAN-001');
      expect(parsed.max_payload_grams).toBe(1200000);
    });

    it('rejects non-positive payload or volume', () => {
      const invalid = {
        warehouse_id: 'wh_1',
        vehicle_code: 'V1',
        license_plate: 'L1',
        make_model: 'Model',
        type: 'VAN_CARGO',
        max_payload_grams: 0,
        max_volume_cm3: 100,
      };
      expect(() => CreateVehicleSchema.parse(invalid)).toThrow();
    });

    it('validates partial vehicle update payload', () => {
      const valid = {
        status: 'IN_SHOP',
        odometer_meters: 50000000,
      };
      expect(UpdateVehicleSchema.parse(valid)).toBeDefined();
    });
  });

  describe('CreateDriverSchema and UpdateDriverShiftSchema', () => {
    it('validates driver profile with YYYY-MM-DD license expiry', () => {
      const valid = {
        user_id: 'usr_driver_1',
        driver_code: 'DRV-101',
        full_name: 'John Miller',
        phone_number: '+44 7700 900077',
        license_number: 'MIL123456789',
        license_expiry_date: '2028-10-15',
        assigned_vehicle_id: 'veh_1',
      };

      const parsed = CreateDriverSchema.parse(valid);
      expect(parsed.full_name).toBe('John Miller');
    });

    it('rejects malformed license expiry date', () => {
      const invalid = {
        user_id: 'usr_1',
        driver_code: 'DRV-1',
        full_name: 'John',
        phone_number: '123',
        license_number: 'LIC1',
        license_expiry_date: '15/10/2028', // Not YYYY-MM-DD
      };
      expect(() => CreateDriverSchema.parse(invalid)).toThrow();
    });

    it('validates driver shift status update', () => {
      expect(UpdateDriverShiftSchema.parse({ shift_status: 'EN_ROUTE' })).toBeDefined();
      expect(() => UpdateDriverShiftSchema.parse({ shift_status: 'SLEEPING' })).toThrow();
    });
  });

  describe('CreateDeliveryRunSchema and DispatchRunSchema', () => {
    it('validates a complete multi-stop delivery run', () => {
      const valid = {
        warehouse_id: 'wh_1',
        stops: [
          {
            order_id: 'ord_101',
            order_number: 'SO-101',
            recipient_name: 'Sarah Connor',
            recipient_phone: '+44 7700 900101',
            delivery_address: '10 Downing St, London, UK',
            latitude_microdegrees: 51503300,
            longitude_microdegrees: -127600,
            total_weight_grams: 5000,
            total_volume_cm3: 20000,
          },
        ],
      };

      const parsed = CreateDeliveryRunSchema.parse(valid);
      expect(parsed.stops.length).toBe(1);
    });

    it('rejects delivery run with empty stops array', () => {
      const invalid = {
        warehouse_id: 'wh_1',
        stops: [],
      };
      expect(() => CreateDeliveryRunSchema.parse(invalid)).toThrow();
    });

    it('validates dispatch payload', () => {
      const valid = {
        vehicle_id: 'veh_01',
        driver_id: 'drv_01',
        notes: 'Priority morning delivery',
      };
      expect(DispatchRunSchema.parse(valid)).toBeDefined();
    });
  });

  describe('SubmitPodSchema and FailStopSchema', () => {
    it('validates POD submission with signature and coordinates', () => {
      const valid = {
        verification_method: 'SIGNATURE',
        recipient_name: 'Sarah Connor',
        signature_svg: '<svg>signature path</svg>',
        delivered_latitude_microdegrees: 51503300,
        delivered_longitude_microdegrees: -127600,
        notes: 'Handed directly to recipient',
      };
      expect(SubmitPodSchema.parse(valid)).toBeDefined();
    });

    it('validates stop failure exception', () => {
      const valid = {
        failure_reason: 'CUSTOMER_UNAVAILABLE',
        notes: 'Rang doorbell twice, no answer',
      };
      expect(FailStopSchema.parse(valid)).toBeDefined();
    });
  });
});
