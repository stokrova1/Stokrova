import { describe, it, expect } from 'vitest';
import {
  CreateStorageZoneSchema,
  CreatePutAwayRuleSchema,
  CalculatePutAwaySchema,
  CreatePickListSchema,
  CreatePickWaveSchema,
  ConfirmPickLineSchema,
  ShortPickSchema,
  CreatePackingStationSchema,
  UpdatePackingStationSchema,
  CreatePackagingBoxSchema,
  CartonizationRecommendationSchema,
  OpenPackedContainerSchema,
  PackItemIntoContainerSchema,
  SealContainerSchema,
  CreateShippingManifestSchema,
  AddContainersToManifestSchema,
  DispatchManifestSchema,
  ParseBarcodeSchema,
  CreateInternalTransferSchema,
  EvaluateCrossDockOpportunitiesSchema,
  ExecuteCrossDockBypassSchema,
} from '../src/warehouse-ops.js';

describe('Warehouse Operations & Directed Put-Away Validation (Phase 6A & 6B)', () => {
  describe('CreateStorageZoneSchema', () => {
    it('accepts valid storage zone payload', () => {
      const res = CreateStorageZoneSchema.safeParse({
        warehouse_id: 'wh_main_01',
        code: 'ZONE-COLD-01',
        name: 'Cold Chain Vaccine Vault',
        zone_type: 'COLD_CHAIN',
        temperature_class: 'COLD_STORAGE',
        hazmat_class: 'NONE',
        notes: 'Strict 2-8 C monitoring',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.temperature_class).toBe('COLD_STORAGE');
        expect(res.data.is_active).toBe(true);
      }
    });

    it('rejects invalid zone code characters', () => {
      const res = CreateStorageZoneSchema.safeParse({
        warehouse_id: 'wh_main_01',
        code: 'ZONE COLD! INVALID',
        name: 'Cold Chain',
        zone_type: 'COLD_CHAIN',
      });

      expect(res.success).toBe(false);
    });

    it('rejects unrecognized zone type', () => {
      const res = CreateStorageZoneSchema.safeParse({
        warehouse_id: 'wh_main_01',
        code: 'ZONE-A',
        name: 'Zone A',
        zone_type: 'NON_EXISTENT_TYPE',
      });

      expect(res.success).toBe(false);
    });
  });

  describe('CreatePutAwayRuleSchema', () => {
    it('accepts valid put-away rule', () => {
      const res = CreatePutAwayRuleSchema.safeParse({
        warehouse_id: 'wh_main_01',
        name: 'Cold Storage High Priority Rule',
        priority: 10,
        strategy: 'FASTEST_PICK_PROXIMITY',
        filter_temperature_class: 'COLD_STORAGE',
        destination_zone_id: 'zone_cold_vault',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.priority).toBe(10);
      }
    });

    it('rejects non-positive priority', () => {
      const res = CreatePutAwayRuleSchema.safeParse({
        warehouse_id: 'wh_main_01',
        name: 'Zero Priority Rule',
        priority: 0,
        strategy: 'SAME_SKU_CONSOLIDATION',
      });

      expect(res.success).toBe(false);
    });
  });

  describe('CalculatePutAwaySchema', () => {
    it('accepts valid put-away evaluation request', () => {
      const res = CalculatePutAwaySchema.safeParse({
        warehouse_id: 'wh_main_01',
        variant_id: 'var_prod_01',
        sku: 'SKU-VACCINE-X',
        quantity: 50,
        unit_weight_kg: 0.2,
        unit_volume_cm3: 250,
        temperature_class: 'COLD_STORAGE',
        velocity_class: 'CLASS_A_FAST_MOVING',
      });

      expect(res.success).toBe(true);
    });

    it('rejects non-positive quantity', () => {
      const res = CalculatePutAwaySchema.safeParse({
        warehouse_id: 'wh_main_01',
        variant_id: 'var_prod_01',
        sku: 'SKU-VACCINE-X',
        quantity: 0,
      });

      expect(res.success).toBe(false);
    });
  });

  describe('Phase 6B Picking & Wave Schemas', () => {
    it('validates CreatePickListSchema successfully', () => {
      const res = CreatePickListSchema.safeParse({
        warehouse_id: 'wh_01',
        strategy: 'WAVE',
        order_ids: ['ord_1', 'ord_2'],
        lines: [
          {
            order_id: 'ord_1',
            order_line_id: 'line_1',
            variant_id: 'var_1',
            sku: 'SKU-01',
            source_location_id: 'loc_01',
            source_location_code: 'A1-R1-S1-B1',
            aisle: 1,
            rack: 1,
            shelf: 1,
            bin_position: 1,
            quantity_requested: 5,
          },
        ],
      });

      expect(res.success).toBe(true);
    });

    it('rejects CreatePickListSchema with empty lines', () => {
      const res = CreatePickListSchema.safeParse({
        warehouse_id: 'wh_01',
        strategy: 'DISCRETE',
        order_ids: ['ord_1'],
        lines: [],
      });

      expect(res.success).toBe(false);
    });

    it('validates CreatePickWaveSchema successfully', () => {
      const res = CreatePickWaveSchema.safeParse({
        warehouse_id: 'wh_01',
        strategy: 'BATCH',
        criteria: {
          carrier_id: 'FEDEX',
          max_orders: 20,
        },
        order_ids: ['ord_1', 'ord_2'],
      });

      expect(res.success).toBe(true);
    });

    it('validates ConfirmPickLineSchema and ShortPickSchema', () => {
      const confirmRes = ConfirmPickLineSchema.safeParse({
        quantity_picked: 5,
        batch_id: 'batch_123',
      });
      expect(confirmRes.success).toBe(true);

      const shortRes = ShortPickSchema.safeParse({
        quantity_picked: 3,
        short_reason: 'Physical bin stock depleted',
      });
      expect(shortRes.success).toBe(true);

      const invalidShortRes = ShortPickSchema.safeParse({
        quantity_picked: -1,
        short_reason: 'Negative invalid',
      });
      expect(invalidShortRes.success).toBe(false);
    });
  });

  describe('Phase 6C Packing Stations, Containerization & Manifest Schemas', () => {
    it('validates CreatePackingStationSchema and UpdatePackingStationSchema', () => {
      const stationRes = CreatePackingStationSchema.safeParse({
        warehouse_id: 'wh_01',
        station_code: 'PACK-01',
        station_name: 'Main Packing Bench 1',
        scale_device_id: 'scale_usb_01',
      });
      expect(stationRes.success).toBe(true);

      const updateRes = UpdatePackingStationSchema.safeParse({
        status: 'MAINTENANCE',
        notes: 'Scale undergoing recalibration',
      });
      expect(updateRes.success).toBe(true);
    });

    it('validates CreatePackagingBoxSchema with positive dimensions and weight', () => {
      const validBox = CreatePackagingBoxSchema.safeParse({
        code: 'BOX-M',
        name: 'Medium Shipping Carton',
        length_mm: 300,
        width_mm: 200,
        height_mm: 150,
        max_weight_grams: 10000,
        tare_weight_grams: 350,
      });
      expect(validBox.success).toBe(true);

      const invalidBox = CreatePackagingBoxSchema.safeParse({
        code: 'BOX-BAD',
        name: 'Bad Box',
        length_mm: -10, // negative invalid
        width_mm: 200,
        height_mm: 150,
        max_weight_grams: 10000,
        tare_weight_grams: 350,
      });
      expect(invalidBox.success).toBe(false);
    });

    it('validates CartonizationRecommendationSchema', () => {
      const cartonRes = CartonizationRecommendationSchema.safeParse({
        warehouse_id: 'wh_01',
        items: [
          {
            sku: 'SKU-SHIRT-BLUE',
            variant_id: 'var_shirt_1',
            quantity: 4,
            weight_grams_each: 250,
            length_mm: 200,
            width_mm: 150,
            height_mm: 20,
          },
        ],
      });
      expect(cartonRes.success).toBe(true);

      const emptyItems = CartonizationRecommendationSchema.safeParse({
        warehouse_id: 'wh_01',
        items: [],
      });
      expect(emptyItems.success).toBe(false);
    });

    it('validates Container packing and sealing schemas', () => {
      const openRes = OpenPackedContainerSchema.safeParse({
        warehouse_id: 'wh_01',
        box_type_id: 'box_m',
        tracking_number: '1Z9999999999999999',
      });
      expect(openRes.success).toBe(true);

      const packItemRes = PackItemIntoContainerSchema.safeParse({
        order_id: 'ord_1',
        order_line_id: 'line_1',
        variant_id: 'var_1',
        sku: 'SKU-01',
        quantity: 2,
        unit_weight_grams: 500,
      });
      expect(packItemRes.success).toBe(true);

      const sealRes = SealContainerSchema.safeParse({
        scale_weight_grams: 1350,
        seal_number: 'SEAL-SEC-998',
        tolerance_percentage_bp: 250,
      });
      expect(sealRes.success).toBe(true);

      const invalidSeal = SealContainerSchema.safeParse({
        scale_weight_grams: -100,
      });
      expect(invalidSeal.success).toBe(false);
    });

    it('validates Shipping Manifest schemas', () => {
      const manifestRes = CreateShippingManifestSchema.safeParse({
        warehouse_id: 'wh_01',
        carrier_id: 'DHL_EXPRESS',
        carrier_name: 'DHL Express Global',
        vehicle_reference: 'VAN-DHL-102',
      });
      expect(manifestRes.success).toBe(true);

      const addContainersRes = AddContainersToManifestSchema.safeParse({
        container_ids: ['cnt_01', 'cnt_02'],
      });
      expect(addContainersRes.success).toBe(true);

      const dispatchRes = DispatchManifestSchema.safeParse({
        driver_name: 'John Carrier',
        driver_phone: '+1-555-0199',
        notes: 'Handed over at dock 4',
      });
      expect(dispatchRes.success).toBe(true);
    });
  });

  describe('Phase 6D Bin Transfers, Cross-Docking & Barcode Schemas', () => {
    it('validates ParseBarcodeSchema with non-empty string', () => {
      const valid = ParseBarcodeSchema.safeParse({
        barcode: '(01)00012345678905(10)LOT123',
      });
      expect(valid.success).toBe(true);

      const empty = ParseBarcodeSchema.safeParse({
        barcode: '',
      });
      expect(empty.success).toBe(false);
    });

    it('validates CreateInternalTransferSchema with positive quantities', () => {
      const valid = CreateInternalTransferSchema.safeParse({
        warehouse_id: 'wh_01',
        transfer_type: 'INTERNAL_BIN_MOVE',
        source_location_id: 'loc_src',
        destination_location_id: 'loc_dst',
        lines: [
          {
            variant_id: 'var_01',
            sku: 'SKU-01',
            quantity: 5,
          },
        ],
      });
      expect(valid.success).toBe(true);

      const invalidQty = CreateInternalTransferSchema.safeParse({
        warehouse_id: 'wh_01',
        transfer_type: 'INTERNAL_BIN_MOVE',
        source_location_id: 'loc_src',
        destination_location_id: 'loc_dst',
        lines: [
          {
            variant_id: 'var_01',
            sku: 'SKU-01',
            quantity: 0,
          },
        ],
      });
      expect(invalidQty.success).toBe(false);
    });

    it('validates EvaluateCrossDockOpportunitiesSchema and ExecuteCrossDockBypassSchema', () => {
      const evalRes = EvaluateCrossDockOpportunitiesSchema.safeParse({
        warehouse_id: 'wh_01',
        inbound_receipt_id: 'rcpt_01',
        inbound_items: [
          {
            inbound_line_id: 'rcpt_l1',
            variant_id: 'var_1',
            sku: 'SKU-1',
            quantity: 10,
          },
        ],
        pending_demands: [
          {
            order_id: 'ord_1',
            order_line_id: 'ord_l1',
            variant_id: 'var_1',
            sku: 'SKU-1',
            quantity_demanded: 6,
            priority: 'URGENT',
          },
        ],
        staging_location_id: 'loc_stage_dock',
      });
      expect(evalRes.success).toBe(true);

      const execRes = ExecuteCrossDockBypassSchema.safeParse({
        opportunity_id: 'xdock_opp_01',
        operator_id: 'usr_ops_1',
      });
      expect(execRes.success).toBe(true);
    });
  });
});


