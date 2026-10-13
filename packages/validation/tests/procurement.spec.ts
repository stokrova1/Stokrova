import { describe, it, expect } from 'vitest';
import {
  CreateSupplierSchema,
  CreateSupplierProductMappingSchema,
  CreatePurchaseOrderSchema,
  CreateGoodsReceiptSchema,
  InspectGoodsReceiptSchema,
  CreateLandedCostVoucherSchema,
  CreatePurchaseInvoiceSchema,
} from '../src/procurement.js';

describe('Procurement Validation Schemas (Phase 4)', () => {
  describe('Phase 4A: Suppliers & Mappings', () => {
    it('validates compliant supplier creation request with defaults', () => {
      const valid = {
        name: 'Acme Components Ltd',
        code: 'ACME-COMP',
        email: 'sales@acme.com',
      };

      const result = CreateSupplierSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency_code).toBe('USD');
        expect(result.data.payment_terms).toBe('NET_30');
        expect(result.data.lead_time_days).toBe(7);
      }
    });

    it('rejects invalid supplier codes with invalid characters', () => {
      const invalid = {
        name: 'Bad Code Inc',
        code: 'BAD CODE!',
      };
      expect(CreateSupplierSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates compliant supplier product mapping', () => {
      const valid = {
        supplier_id: 'sup_123',
        variant_id: 'var_456',
        supplier_sku: 'VEND-SKU-990',
        unit_cost_minor: '4500',
        minimum_order_quantity: 10,
        order_increment_quantity: 5,
        is_preferred: true,
      };

      const result = CreateSupplierProductMappingSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minimum_order_quantity).toBe(10);
        expect(result.data.unit_cost_minor).toBe('4500');
        expect(result.data.is_preferred).toBe(true);
      }
    });
  });

  describe('Phase 4B: Purchase Orders', () => {
    it('validates compliant purchase order request', () => {
      const valid = {
        supplier_id: 'sup_001',
        destination_warehouse_id: 'wh_main',
        currency_code: 'USD',
        priority: 'HIGH',
        lines: [
          {
            variant_id: 'var_101',
            quantity: 50,
            unit_cost_minor: '1200',
            tax_rate_basis_points: 500,
          },
        ],
      };

      const result = CreatePurchaseOrderSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects PO without lines or with negative quantity', () => {
      const invalid = {
        supplier_id: 'sup_001',
        destination_warehouse_id: 'wh_main',
        lines: [],
      };
      expect(CreatePurchaseOrderSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Phase 4C: Goods Receiving & Quarantine', () => {
    it('validates goods receipt note with line inspection targets', () => {
      const valid = {
        purchase_order_id: 'po_999',
        destination_warehouse_id: 'wh_main',
        received_by: 'usr_receiver',
        lines: [
          {
            purchase_order_line_id: 'po_line_1',
            variant_id: 'var_101',
            quantity_received: 50,
            quantity_accepted: 45,
            quantity_quarantined: 5,
            quarantine_reason: 'Packaging moisture damage',
            target_location_id: 'loc_shelf_a',
            quarantine_location_id: 'loc_quarantine_bay',
          },
        ],
      };

      const result = CreateGoodsReceiptSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates inspection submission schema', () => {
      const inspection = {
        inspected_by: 'usr_qa_inspector',
        notes: 'Visual batch inspection complete',
        line_inspections: [
          {
            goods_receipt_line_id: 'grn_line_1',
            quantity_accepted: 45,
            quantity_quarantined: 5,
            quantity_rejected: 0,
            quarantine_reason: 'Scratched enclosure',
          },
        ],
      };

      const result = InspectGoodsReceiptSchema.safeParse(inspection);
      expect(result.success).toBe(true);
    });
  });

  describe('Phase 4D: Landed Cost Vouchers', () => {
    it('validates landed cost voucher creation with multi-component charges', () => {
      const valid = {
        goods_receipt_ids: ['grn_1001', 'grn_1002'],
        allocation_method: 'BY_VALUE',
        charges: [
          {
            category: 'FREIGHT',
            description: 'Ocean carrier freight',
            amount_minor: '45000',
          },
          {
            category: 'CUSTOMS_DUTY',
            description: 'Port import tariff',
            amount_minor: '12500',
          },
        ],
      };

      const result = CreateLandedCostVoucherSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Phase 4E: 3-Way Matching & Invoicing', () => {
    it('validates purchase invoice creation', () => {
      const valid = {
        invoice_number: 'INV-2026-880',
        supplier_invoice_reference: 'SUP-INV-9941',
        supplier_id: 'sup_001',
        purchase_order_id: 'po_999',
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        lines: [
          {
            purchase_order_line_id: 'po_line_1',
            variant_id: 'var_101',
            quantity_invoiced: 50,
            unit_price_minor: '1200',
          },
        ],
      };

      const result = CreatePurchaseInvoiceSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
