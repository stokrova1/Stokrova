import { describe, it, expect } from 'vitest';
import {
  CreateRmaSchema,
  UpdateRmaSchema,
  ApproveRmaSchema,
  RejectRmaSchema,
  ReceiveRmaSchema,
  PerformQualityInspectionSchema,
  ExecuteDispositionSchema,
} from '../src/returns-rma.js';

describe('Reverse Logistics & RMA Validation Schemas (Phase 7)', () => {
  describe('CreateRmaSchema', () => {
    it('validates a complete valid RMA creation payload', () => {
      const payload = {
        warehouse_id: 'wh_main_01',
        type: 'CUSTOMER_RETURN',
        customer_id: 'cust_alpha_1',
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        original_order_id: 'ord_1001',
        original_order_number: 'SO-1001',
        resolution_preference: 'REFUND',
        restocking_fee_bp: 1500, // 15%
        return_tracking_number: 'RET-TRK-7788',
        carrier_code: 'FEDEX',
        notes: 'Customer ordered wrong size',
        lines: [
          {
            order_id: 'ord_1001',
            order_line_id: 'ord_line_1',
            variant_id: 'var_boot_10',
            sku: 'SKU-BOOT-42',
            item_name: 'All-Terrain Hiking Boot Size 42',
            quantity_authorized: 1,
            unit_price_cents: 12000,
            currency: 'USD',
            reason_code: 'WRONG_ITEM_SHIPPED',
          },
        ],
      };

      const parsed = CreateRmaSchema.parse(payload);
      expect(parsed.warehouse_id).toBe('wh_main_01');
      expect(parsed.restocking_fee_bp).toBe(1500);
      expect(parsed.lines.length).toBe(1);
    });

    it('rejects payload with empty lines array', () => {
      const invalid = {
        warehouse_id: 'wh_1',
        type: 'CUSTOMER_RETURN',
        lines: [],
      };
      expect(() => CreateRmaSchema.parse(invalid)).toThrow();
    });

    it('rejects invalid email address', () => {
      const invalid = {
        warehouse_id: 'wh_1',
        type: 'CUSTOMER_RETURN',
        customer_email: 'not-an-email',
        lines: [
          {
            variant_id: 'v1',
            sku: 'SKU-1',
            item_name: 'Widget',
            quantity_authorized: 1,
            unit_price_cents: 100,
            currency: 'USD',
            reason_code: 'DEFECTIVE',
          },
        ],
      };
      expect(() => CreateRmaSchema.parse(invalid)).toThrow();
    });

    it('rejects invalid restocking fee basis points (> 10000 or negative)', () => {
      const base = {
        warehouse_id: 'wh_1',
        type: 'CUSTOMER_RETURN',
        lines: [
          {
            variant_id: 'v1',
            sku: 'SKU-1',
            item_name: 'Widget',
            quantity_authorized: 1,
            unit_price_cents: 100,
            currency: 'USD',
            reason_code: 'DEFECTIVE',
          },
        ],
      };

      expect(() =>
        CreateRmaSchema.parse({ ...base, restocking_fee_bp: 15000 }),
      ).toThrow();
      expect(() =>
        CreateRmaSchema.parse({ ...base, restocking_fee_bp: -100 }),
      ).toThrow();
    });
  });

  describe('ApproveRmaSchema and RejectRmaSchema', () => {
    it('validates approve and reject payloads', () => {
      expect(
        ApproveRmaSchema.parse({
          approved_by: 'usr_manager_1',
          notes: 'Customer provided photos of defect',
        }),
      ).toBeDefined();

      expect(
        RejectRmaSchema.parse({
          rejection_reason: 'Return window expired 90 days ago',
          rejected_by: 'usr_manager_1',
        }),
      ).toBeDefined();

      expect(() => RejectRmaSchema.parse({ rejection_reason: '' })).toThrow();
    });
  });

  describe('ReceiveRmaSchema', () => {
    it('validates inbound receiving line items', () => {
      const valid = {
        receiving_location_id: 'loc_quarantine_dock_1',
        lines: [
          {
            line_id: 'rma_line_101',
            quantity_received: 2,
            batch_id: 'LOT-2026-X',
            serial_numbers: ['SN001', 'SN002'],
          },
        ],
      };

      const parsed = ReceiveRmaSchema.parse(valid);
      expect(parsed.lines[0]?.quantity_received).toBe(2);
      expect(parsed.lines[0]?.serial_numbers?.length).toBe(2);
    });

    it('rejects non-positive received quantity', () => {
      const invalid = {
        receiving_location_id: 'loc_dock',
        lines: [
          {
            line_id: 'rma_line_101',
            quantity_received: 0,
          },
        ],
      };
      expect(() => ReceiveRmaSchema.parse(invalid)).toThrow();
    });
  });

  describe('PerformQualityInspectionSchema', () => {
    it('validates QC inspection input', () => {
      const valid = {
        rma_id: 'rma_001',
        return_line_id: 'rma_line_001',
        quantity_inspected: 1,
        condition_grade: 'GRADE_A_NEW',
        status: 'PASSED',
        inspector_id: 'usr_qc_lead_1',
        inspection_notes: 'Original box factory sealed, passed QA',
      };

      const parsed = PerformQualityInspectionSchema.parse(valid);
      expect(parsed.condition_grade).toBe('GRADE_A_NEW');
      expect(parsed.status).toBe('PASSED');
    });
  });

  describe('ExecuteDispositionSchema', () => {
    it('validates inventory disposition routing input', () => {
      const valid = {
        rma_id: 'rma_001',
        variant_id: 'var_sku_1',
        sku: 'SKU-WIDGET',
        quantity: 1,
        action_type: 'RESTOCK_TO_PRIMARY',
        destination_location_id: 'loc_pick_face_1',
        gross_unit_price_cents: 5000,
        restocking_fee_bp: 1000,
        currency: 'USD',
      };

      const parsed = ExecuteDispositionSchema.parse(valid);
      expect(parsed.action_type).toBe('RESTOCK_TO_PRIMARY');
      expect(parsed.gross_unit_price_cents).toBe(5000);
      expect(parsed.restocking_fee_bp).toBe(1000);
    });
  });
});
