import { describe, it, expect } from 'vitest';
import {
  EdiStandardSchema,
  EdiTransactionTypeSchema,
  CreateEdiPartnerSchema,
  ParseEdiDocumentSchema,
  EdiPurchaseOrderSchema,
  EdiPurchaseOrderAckSchema,
  EdiAdvanceShipNoticeSchema,
  EdiInvoiceSchema,
  EdiFunctionalAckSchema,
} from '../src/edi.js';

describe('Supply Chain EDI Validation Schemas (Phase 18)', () => {
  describe('Standard and Transaction Type Enums', () => {
    it('validates supported EDI standards', () => {
      expect(EdiStandardSchema.safeParse('ANSI_X12').success).toBe(true);
      expect(EdiStandardSchema.safeParse('UN_EDIFACT').success).toBe(true);
      expect(EdiStandardSchema.safeParse('CSV').success).toBe(false);
    });

    it('validates standard EDI transaction types', () => {
      expect(EdiTransactionTypeSchema.safeParse('850').success).toBe(true);
      expect(EdiTransactionTypeSchema.safeParse('855').success).toBe(true);
      expect(EdiTransactionTypeSchema.safeParse('856').success).toBe(true);
      expect(EdiTransactionTypeSchema.safeParse('810').success).toBe(true);
      expect(EdiTransactionTypeSchema.safeParse('997').success).toBe(true);
      expect(EdiTransactionTypeSchema.safeParse('ORDERS').success).toBe(true);
      expect(EdiTransactionTypeSchema.safeParse('DESADV').success).toBe(true);
      expect(EdiTransactionTypeSchema.safeParse('9999').success).toBe(false);
    });
  });

  describe('CreateEdiPartnerSchema', () => {
    it('validates a valid partner setup with defaults', () => {
      const parsed = CreateEdiPartnerSchema.parse({
        partner_name: 'Walmart US EDI Gateway',
        sender_id: 'WMT_PROD',
        receiver_id: 'STOKROVA_HQ',
      });
      expect(parsed.edi_standard).toBe('ANSI_X12');
      expect(parsed.element_delimiter).toBe('*');
      expect(parsed.segment_delimiter).toBe('~');
    });

    it('rejects partner without sender_id or partner_name', () => {
      expect(
        CreateEdiPartnerSchema.safeParse({
          partner_name: '',
          sender_id: '',
          receiver_id: 'STOKROVA',
        }).success,
      ).toBe(false);
    });
  });

  describe('EdiPurchaseOrderSchema', () => {
    it('validates valid EDI 850 purchase order payload', () => {
      const valid = {
        po_number: 'PO-88229',
        po_date: '20261012',
        buyer_name: 'Target Corporation',
        buyer_id: 'TARGET-HQ',
        currency: 'USD',
        total_amount_minor: '150000',
        lines: [
          {
            line_number: '1',
            sku: 'SKU-TARGET-01',
            quantity: 10,
            unit_price_minor: '15000',
            uom: 'EA',
          },
        ],
      };
      expect(EdiPurchaseOrderSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects non-integer minor unit prices', () => {
      const invalid = {
        po_number: 'PO-88229',
        po_date: '20261012',
        buyer_name: 'Target Corporation',
        buyer_id: 'TARGET-HQ',
        currency: 'USD',
        total_amount_minor: '150.00', // invalid decimal string
        lines: [
          {
            line_number: '1',
            sku: 'SKU-TARGET-01',
            quantity: 10,
            unit_price_minor: '15.00',
            uom: 'EA',
          },
        ],
      };
      expect(EdiPurchaseOrderSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('EdiAdvanceShipNoticeSchema', () => {
    it('validates SSCC-18 pallet barcode requirement', () => {
      const valid = {
        shipment_id: 'SHP-12345',
        bol_number: 'BOL-5544',
        ship_date: '20261012',
        carrier_code: 'UPSN',
        tracking_number: '1Z888888',
        pallets: [
          {
            sscc_18: '006141411234567894', // 18 digits
            items: [
              {
                sku: 'SKU-001',
                quantity: 50,
                uom: 'EA',
              },
            ],
          },
        ],
      };
      expect(EdiAdvanceShipNoticeSchema.safeParse(valid).success).toBe(true);

      const invalidSscc = {
        ...valid,
        pallets: [
          {
            sscc_18: '12345', // Not 18 digits
            items: [{ sku: 'SKU-001', quantity: 50, uom: 'EA' }],
          },
        ],
      };
      expect(EdiAdvanceShipNoticeSchema.safeParse(invalidSscc).success).toBe(false);
    });
  });

  describe('EdiInvoiceSchema & FunctionalAck', () => {
    it('validates invoice structure', () => {
      const invoice = {
        invoice_number: 'INV-9901',
        po_number: 'PO-88229',
        invoice_date: '20261012',
        currency: 'USD',
        subtotal_minor: '10000',
        tax_minor: '800',
        total_minor: '10800',
        lines: [
          {
            line_number: '1',
            sku: 'SKU-001',
            quantity: 1,
            unit_price_minor: '10000',
            line_total_minor: '10000',
          },
        ],
      };
      expect(EdiInvoiceSchema.safeParse(invoice).success).toBe(true);
    });

    it('validates functional acknowledgment', () => {
      const ack = {
        original_control_number: '000001001',
        group_control_number: '1',
        status: 'A' as const,
      };
      expect(EdiFunctionalAckSchema.safeParse(ack).success).toBe(true);
    });
  });
});
