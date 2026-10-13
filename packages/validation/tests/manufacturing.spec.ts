import { describe, it, expect } from 'vitest';
import {
  CreateBillOfMaterialsSchema,
  CreateMfgWorkCenterSchema,
  CreateRoutingSchema,
  CreateManufacturingOrderSchema,
  RecordWorkOrderExecutionSchema,
  CompleteManufacturingOrderSchema,
} from '../src/manufacturing.js';

describe('Manufacturing Validation Schemas (Phase 5)', () => {
  describe('CreateBillOfMaterialsSchema', () => {
    it('validates compliant BOM with component lines and scrap rates', () => {
      const valid = {
        variant_id: 'var_parent_drone',
        version: 1,
        revision_label: 'REV-A',
        lines: [
          {
            component_variant_id: 'var_motor',
            quantity: 4,
            scrap_percentage_basis_points: 250,
            fixed_scrap_quantity: 1,
          },
        ],
        byproducts: [
          {
            variant_id: 'var_aluminum_swarf',
            quantity: 2,
            cost_allocation_basis_points: 300,
          },
        ],
      };

      const result = CreateBillOfMaterialsSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('MANUFACTURE');
        expect(result.data.output_quantity).toBe(1);
        expect(result.data.is_active_revision).toBe(true);
      }
    });

    it('rejects BOM with empty lines', () => {
      const invalid = {
        variant_id: 'var_parent_drone',
        lines: [],
      };
      expect(CreateBillOfMaterialsSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('CreateMfgWorkCenterSchema', () => {
    it('validates compliant manufacturing work center with rate numbers or strings', () => {
      const valid = {
        warehouse_id: 'wh_main',
        code: 'CNC-MILL-01',
        name: '5-Axis CNC Milling Center',
        capacity_units_per_hour: 4,
        efficiency_basis_points: 9500,
        hourly_labor_rate_minor: 4500, // $45.00/hr
        hourly_machine_rate_minor: '6000', // $60.00/hr
      };

      const result = CreateMfgWorkCenterSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hourly_labor_rate_minor).toBe('4500');
        expect(result.data.hourly_machine_rate_minor).toBe('6000');
        expect(result.data.hourly_overhead_rate_minor).toBe('0');
      }
    });
  });

  describe('CreateRoutingSchema', () => {
    it('validates routing with sequenced operations', () => {
      const valid = {
        name: 'Drone Frame Assembly Routing',
        operations: [
          {
            operation_number: 10,
            name: 'Frame CNC Milling',
            work_center_id: 'wc_cnc_01',
            setup_time_minutes: 30,
            run_time_minutes_per_unit: 15,
            teardown_time_minutes: 10,
          },
          {
            operation_number: 20,
            name: 'Anodizing Surface Treatment',
            work_center_id: 'wc_chem_01',
            run_time_minutes_per_unit: 20,
          },
        ],
      };

      const result = CreateRoutingSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateManufacturingOrderSchema', () => {
    it('validates MO creation request', () => {
      const valid = {
        variant_id: 'var_drone_pro',
        bom_id: 'bom_drone_001',
        warehouse_id: 'wh_main',
        destination_location_id: 'loc_finished_goods',
        target_quantity: 25,
        priority: 'HIGH',
      };

      const result = CreateManufacturingOrderSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('RecordWorkOrderExecutionSchema & CompleteManufacturingOrderSchema', () => {
    it('validates execution and completion payloads', () => {
      const exec = {
        work_order_id: 'wo_step_10',
        actual_duration_minutes: 45,
        operator_user_id: 'usr_technician_1',
      };
      expect(RecordWorkOrderExecutionSchema.safeParse(exec).success).toBe(true);

      const comp = {
        produced_quantity: 24,
        scrapped_quantity: 1,
        lot_number: 'LOT-BATCH-2026-99',
      };
      expect(CompleteManufacturingOrderSchema.safeParse(comp).success).toBe(true);
    });
  });
});
