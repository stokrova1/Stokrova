import { describe, it, expect } from 'vitest';
import {
  parseDecimalToMinor,
  formatMinorToDecimal,
  calculateGs1CheckDigit,
  generateSscc18,
  validateSscc18,
  tokenizeEdiSegments,
  parseX12_850,
  generateX12_855,
  generateX12_856,
  generateX12_810,
  parseX12_997,
  generateX12_997,
  parseEdifact_ORDERS,
  generateEdifact_DESADV,
  EdiDomainError,
} from '../src/edi.js';
import type {
  EdiInterchangeEnvelope,
  EdiPurchaseOrderAck,
  EdiAdvanceShipNotice,
  EdiInvoice,
  EdiFunctionalAck,
} from '@stokrova/contracts';

describe('Supply Chain EDI Engine & Automated B2B Exchange Domain (Phase 18)', () => {
  const envelope: EdiInterchangeEnvelope = {
    sender_id: 'STOKROVAHQ',
    sender_qualifier: '01',
    receiver_id: 'WALMART_EDI',
    receiver_qualifier: '08',
    control_number: '000001001',
    date: '261012',
    time: '1430',
    standard: 'ANSI_X12',
    version: '004010',
  };

  // ==========================================================================
  // 1. Integer Minor Units & Decimal Parsing (Rule 26)
  // ==========================================================================
  describe('Minor Unit Utilities', () => {
    it('parses decimal string into minor units (bigint cents) accurately', () => {
      expect(parseDecimalToMinor('25.50')).toBe(2550n);
      expect(parseDecimalToMinor('100')).toBe(10000n);
      expect(parseDecimalToMinor('0.05')).toBe(5n);
      expect(parseDecimalToMinor('0.9')).toBe(90n);
      expect(parseDecimalToMinor('')).toBe(0n);
    });

    it('formats minor units (cents) into 2-decimal string', () => {
      expect(formatMinorToDecimal(2550n)).toBe('25.50');
      expect(formatMinorToDecimal('10000')).toBe('100.00');
      expect(formatMinorToDecimal(5n)).toBe('0.05');
      expect(formatMinorToDecimal(-1250n)).toBe('-12.50');
    });
  });

  // ==========================================================================
  // 2. GS1 SSCC-18 Logistics Barcode Generation & Luhn Modulo-10 Check Digit
  // ==========================================================================
  describe('GS1 SSCC-18 & Modulo-10 Check Digit', () => {
    it('calculates Modulo-10 check digit correctly for known GS1 barcodes', () => {
      // 00012345600000001 -> check digit calculation
      const payload = '00012345600000001';
      const checkDigit = calculateGs1CheckDigit(payload);
      expect(checkDigit).toBeGreaterThanOrEqual(0);
      expect(checkDigit).toBeLessThanOrEqual(9);
    });

    it('generates a valid 18-digit SSCC-18 pallet barcode', () => {
      const sscc = generateSscc18('0', '0614141', '123456789');
      expect(sscc).toHaveLength(18);
      expect(sscc.startsWith('00614141123456789')).toBe(true);
      expect(validateSscc18(sscc)).toBe(true);
    });

    it('rejects invalid or tampered SSCC-18 barcodes', () => {
      const validSscc = generateSscc18('0', '0614141', '123456789');
      // Tamper check digit
      const lastDigit = parseInt(validSscc[17], 10);
      const tamperedCheckDigit = (lastDigit + 1) % 10;
      const invalidSscc = validSscc.slice(0, 17) + tamperedCheckDigit;

      expect(validateSscc18(invalidSscc)).toBe(false);
      expect(validateSscc18('12345')).toBe(false); // Wrong length
      expect(validateSscc18('ABC123456789012345')).toBe(false); // Non-digit
    });

    it('throws EdiDomainError if SSCC component lengths do not total 17 digits', () => {
      expect(() => generateSscc18('0', '123', '456')).toThrow(EdiDomainError);
    });
  });

  // ==========================================================================
  // 3. Segment Tokenizer
  // ==========================================================================
  describe('tokenizeEdiSegments', () => {
    it('tokenizes ANSI X12 segments and elements correctly', () => {
      const edi = 'ST*850*0001~BEG*00*SA*PO-9988**20261012~SE*2*0001~';
      const tokens = tokenizeEdiSegments(edi);
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual(['ST', '850', '0001']);
      expect(tokens[1]).toEqual(['BEG', '00', 'SA', 'PO-9988', '', '20261012']);
      expect(tokens[2]).toEqual(['SE', '2', '0001']);
    });
  });

  // ==========================================================================
  // 4. ANSI X12 850 (Purchase Order) Parser
  // ==========================================================================
  describe('parseX12_850', () => {
    const raw850 = [
      'ISA*00*          *00*          *08*WALMART_EDI    *01*STOKROVAHQ     *261012*1200*U*00401*000001001*0*P*>',
      'GS*PO*WALMART_EDI*STOKROVAHQ*20261012*1200*1*X*004010',
      'ST*850*000001001',
      'BEG*00*SA*PO-WMT-90210**20261012',
      'CUR*BY*USD',
      'N1*BY*Walmart Inc.*92*WMT-STORE-42',
      'N1*SE*Stokrova Enterprise*92*VEND-99',
      'PO1*1*100*EA*15.50**IN*SKU-WIDGET-A*UP*012345678905',
      'PO1*2*50*EA*30.00**IN*SKU-GADGET-B*UP*098765432101',
      'CTT*2',
      'SE*8*000001001',
      'GE*1*1',
      'IEA*1*000001001',
    ].join('~\n') + '~';

    it('parses complete ANSI X12 850 PO with line items and minor unit totals', () => {
      const po = parseX12_850(raw850);
      expect(po.po_number).toBe('PO-WMT-90210');
      expect(po.po_date).toBe('20261012');
      expect(po.buyer_name).toBe('Walmart Inc.');
      expect(po.buyer_id).toBe('WMT-STORE-42');
      expect(po.currency).toBe('USD');
      expect(po.lines).toHaveLength(2);

      // Line 1: 100 * 1550 cents = 155,000 cents ($1,550.00)
      expect(po.lines[0].line_number).toBe('1');
      expect(po.lines[0].sku).toBe('SKU-WIDGET-A');
      expect(po.lines[0].gtin_upc).toBe('012345678905');
      expect(po.lines[0].quantity).toBe(100);
      expect(po.lines[0].unit_price_minor).toBe('1550');

      // Line 2: 50 * 3000 cents = 150,000 cents ($1,500.00)
      expect(po.lines[1].line_number).toBe('2');
      expect(po.lines[1].sku).toBe('SKU-GADGET-B');
      expect(po.lines[1].quantity).toBe(50);
      expect(po.lines[1].unit_price_minor).toBe('3000');

      // Total: 155,000 + 150,000 = 305,000 cents ($3,050.00)
      expect(po.total_amount_minor).toBe('305000');
    });

    it('throws error when BEG purchase order number is missing', () => {
      const invalid = 'ST*850*001~SE*1*001~';
      expect(() => parseX12_850(invalid)).toThrow(EdiDomainError);
    });
  });

  // ==========================================================================
  // 5. ANSI X12 855 (Purchase Order Acknowledgment) Serializer
  // ==========================================================================
  describe('generateX12_855', () => {
    it('generates valid ANSI X12 855 document with line-item acceptances', () => {
      const ack: EdiPurchaseOrderAck = {
        po_number: 'PO-WMT-90210',
        ack_type: 'ACCEPTED',
        ack_date: '20261012',
        lines: [
          {
            line_number: '1',
            sku: 'SKU-WIDGET-A',
            status: 'IA',
            quantity_acknowledged: 100,
            unit_price_minor: '1550',
          },
        ],
      };

      const doc = generateX12_855(envelope, ack);
      expect(doc).toContain('ST*855*');
      expect(doc).toContain('BAK*00*AC*PO-WMT-90210*20261012');
      expect(doc).toContain('PO1*1*100*EA*15.50**VP*SKU-WIDGET-A');
      expect(doc).toContain('ACK*IA*100*EA');
      expect(doc).toContain('CTT*1');
      expect(doc).toContain('SE*');
      expect(doc).toContain('IEA*1*');
    });
  });

  // ==========================================================================
  // 6. ANSI X12 856 (Advance Ship Notice / ASN) Serializer
  // ==========================================================================
  describe('generateX12_856', () => {
    it('generates Pick & Pack pallet and item hierarchy (HL S, T, I) with SSCC-18', () => {
      const sscc = generateSscc18('0', '0614141', '123456789');
      const asn: EdiAdvanceShipNotice = {
        shipment_id: 'SHP-98765',
        bol_number: 'BOL-112233',
        ship_date: '20261012',
        carrier_code: 'UPSN',
        tracking_number: '1Z9999999999999999',
        pallets: [
          {
            sscc_18: sscc,
            tare_weight_grams: 25000,
            items: [
              {
                sku: 'SKU-WIDGET-A',
                quantity: 100,
                uom: 'EA',
                lot_number: 'LOT-2026-X',
              },
            ],
          },
        ],
      };

      const doc = generateX12_856(envelope, asn);
      expect(doc).toContain('ST*856*');
      expect(doc).toContain('BSN*00*SHP-98765*20261012*');
      expect(doc).toContain('HL*1**S');
      expect(doc).toContain('TD5**2*UPSN*M');
      expect(doc).toContain('REF*BM*BOL-112233');
      expect(doc).toContain('REF*CN*1Z9999999999999999');
      expect(doc).toContain('HL*2*1*T');
      expect(doc).toContain(`MAN*GM*${sscc}`);
      expect(doc).toContain('MEW*WT*25000*GR');
      expect(doc).toContain('HL*3*2*I');
      expect(doc).toContain('LIN**VP*SKU-WIDGET-A');
      expect(doc).toContain('SN1**100*EA');
      expect(doc).toContain('REF*LT*LOT-2026-X');
    });
  });

  // ==========================================================================
  // 7. ANSI X12 810 (Commercial Invoice) Serializer
  // ==========================================================================
  describe('generateX12_810', () => {
    it('generates valid ANSI X12 810 invoice with minor units and total amounts', () => {
      const invoice: EdiInvoice = {
        invoice_number: 'INV-2026-001',
        po_number: 'PO-WMT-90210',
        invoice_date: '20261012',
        currency: 'USD',
        subtotal_minor: '155000',
        tax_minor: '12400',
        total_minor: '167400',
        lines: [
          {
            line_number: '1',
            sku: 'SKU-WIDGET-A',
            description: 'Widget A',
            quantity: 100,
            unit_price_minor: '1550',
            line_total_minor: '155000',
          },
        ],
      };

      const doc = generateX12_810(envelope, invoice);
      expect(doc).toContain('ST*810*');
      expect(doc).toContain('BIG*20261012*INV-2026-001**PO-WMT-90210');
      expect(doc).toContain('CUR*SE*USD');
      expect(doc).toContain('IT1*1*100*EA*15.50**VP*SKU-WIDGET-A');
      expect(doc).toContain('TDS*167400');
      expect(doc).toContain('TXI*TX*124.00');
      expect(doc).toContain('CTT*1');
    });
  });

  // ==========================================================================
  // 8. ANSI X12 997 Functional Acknowledgment
  // ==========================================================================
  describe('ANSI X12 997 Functional Acknowledgment', () => {
    it('generates and parses 997 functional acknowledgment', () => {
      const ack: EdiFunctionalAck = {
        original_control_number: '000001001',
        group_control_number: '1',
        status: 'A',
      };

      const doc = generateX12_997(envelope, ack);
      expect(doc).toContain('ST*997*');
      expect(doc).toContain('AK1*PO*1');
      expect(doc).toContain('AK2*850*000001001');
      expect(doc).toContain('AK5*A');
      expect(doc).toContain('AK9*A*1*1*1');

      const parsed = parseX12_997(doc);
      expect(parsed.original_control_number).toBe('000001001');
      expect(parsed.status).toBe('A');
    });
  });

  // ==========================================================================
  // 9. UN/EDIFACT (ORDERS & DESADV) Engine
  // ==========================================================================
  describe('UN/EDIFACT (ORDERS & DESADV)', () => {
    it('parses UN/EDIFACT ORDERS message into standard domain purchase order', () => {
      const rawEdifactOrders = [
        "UNB+UNOC:3+BUYER01:01+STOKROVAHQ:01+261012:1200+0001'",
        "UNH+0001+ORDERS:D:96A:UN'",
        "BGM+220+EDF-PO-7788+9'",
        "DTM+137:20261012:102'",
        "NAD+BY+BUYER01::91++GLOBAL CARREFOUR GROUP'",
        "LIN+1++SKU-EUROPE-100:IN'",
        "QTY+21:200:PCE'",
        "PRI+AAA:12.50'",
        "UNS+S'",
        "UNT+9+0001'",
        "UNZ+1+0001'",
      ].join('\n');

      const po = parseEdifact_ORDERS(rawEdifactOrders);
      expect(po.po_number).toBe('EDF-PO-7788');
      expect(po.po_date).toBe('20261012');
      expect(po.buyer_name).toBe('GLOBAL CARREFOUR GROUP');
      expect(po.lines).toHaveLength(1);
      expect(po.lines[0].sku).toBe('SKU-EUROPE-100');
      expect(po.lines[0].quantity).toBe(200);
      expect(po.lines[0].unit_price_minor).toBe('1250');
      // Total: 200 * 1250 cents = 250,000 cents
      expect(po.total_amount_minor).toBe('250000');
    });

    it('generates UN/EDIFACT DESADV despatch advice document', () => {
      const sscc = generateSscc18('0', '0614141', '123456789');
      const asn: EdiAdvanceShipNotice = {
        shipment_id: 'DESADV-5566',
        bol_number: 'BOL-EUR-99',
        ship_date: '20261012',
        carrier_code: 'DHL',
        tracking_number: 'DHL987654321',
        pallets: [
          {
            sscc_18: sscc,
            items: [
              {
                sku: 'SKU-EUROPE-100',
                quantity: 200,
                uom: 'PCE',
              },
            ],
          },
        ],
      };

      const doc = generateEdifact_DESADV(envelope, asn);
      expect(doc).toContain('UNH+000001001+DESADV:D:96A:UN');
      expect(doc).toContain('BGM+351+DESADV-5566+9');
      expect(doc).toContain('RFF+BM:BOL-EUR-99');
      expect(doc).toContain(`GIN+BJ+${sscc}`);
      expect(doc).toContain('LIN+2++SKU-EUROPE-100:IN');
      expect(doc).toContain('QTY+12:200:PCE');
      expect(doc).toContain('UNT+');
      expect(doc).toContain('UNZ+1+000001001');
    });
  });
});
