import { describe, it, expect, beforeEach } from 'vitest';
import { EdiService } from './edi.service.js';
import { ConflictException } from '@nestjs/common';
import { generateSscc18 } from '@stokrova/domain';

describe('Supply Chain EDI API Service (Phase 18)', () => {
  let ediService: EdiService;
  const tenantId = 'tenant-edi-test';

  beforeEach(() => {
    ediService = new EdiService();
  });

  it('creates EDI partner profile and retrieves partner', async () => {
    const partner = await ediService.createPartner(tenantId, {
      partner_name: 'Walmart US EDI Gateway',
      edi_standard: 'ANSI_X12',
      sender_id: 'WALMART_EDI',
      receiver_id: 'STOKROVA_HQ',
    });

    expect(partner.id).toBeDefined();
    expect(partner.partner_name).toBe('Walmart US EDI Gateway');

    const retrieved = await ediService.getPartner(tenantId, partner.id);
    expect(retrieved.id).toBe(partner.id);

    const partners = await ediService.listPartners(tenantId);
    expect(partners).toHaveLength(1);
  });

  it('parses inbound ANSI X12 850 PO, auto-generates 997 FA, and logs message', async () => {
    const partner = await ediService.createPartner(tenantId, {
      partner_name: 'Walmart EDI',
      edi_standard: 'ANSI_X12',
      sender_id: 'WALMART_EDI',
      receiver_id: 'STOKROVA_HQ',
    });

    const raw850 = [
      'ISA*00*          *00*          *08*WALMART_EDI    *01*STOKROVA_HQ    *261012*1200*U*00401*000009988*0*P*>',
      'GS*PO*WALMART_EDI*STOKROVA_HQ*20261012*1200*1*X*004010',
      'ST*850*000009988',
      'BEG*00*SA*PO-WMT-1122**20261012',
      'CUR*BY*USD',
      'N1*BY*Walmart Supercenter*92*STORE-50',
      'PO1*1*100*EA*25.00**IN*SKU-WMT-01',
      'CTT*1',
      'SE*6*000009988',
      'GE*1*1',
      'IEA*1*000009988',
    ].join('~\n') + '~';

    const result = await ediService.parseInboundDocument(tenantId, partner.id, raw850);

    expect(result.messageLog.status).toBe('PROCESSED');
    expect(result.messageLog.control_number).toBe('000009988');
    expect(result.parsed).toBeDefined();
    const po = result.parsed as any;
    expect(po.po_number).toBe('PO-WMT-1122');
    expect(po.lines[0].sku).toBe('SKU-WMT-01');
    expect(po.lines[0].unit_price_minor).toBe('2500');

    // Auto-generated 997 Functional Acknowledgment
    expect(result.ack997).toBeDefined();
    expect(result.ack997).toContain('ST*997*');
    expect(result.ack997).toContain('AK2*850*000009988');
    expect(result.ack997).toContain('AK5*A');
  });

  it('enforces message deduplication on identical control numbers (Rule 18 & 19)', async () => {
    const partner = await ediService.createPartner(tenantId, {
      partner_name: 'Target EDI',
      sender_id: 'TARGET_EDI',
      receiver_id: 'STOKROVA_HQ',
    });

    const raw850 = [
      'ISA*00*          *00*          *08*TARGET_EDI     *01*STOKROVA_HQ    *261012*1200*U*00401*000005544*0*P*>',
      'ST*850*000005544',
      'BEG*00*SA*PO-TGT-1**20261012',
      'PO1*1*10*EA*10.00**IN*SKU-1',
      'SE*3*000005544',
      'IEA*1*000005544',
    ].join('~');

    // First ingestion succeeds
    await ediService.parseInboundDocument(tenantId, partner.id, raw850);

    // Duplicate ingestion with same control number must throw ConflictException
    await expect(
      ediService.parseInboundDocument(tenantId, partner.id, raw850),
    ).rejects.toThrow(ConflictException);
  });

  it('generates outbound ANSI X12 855 PO Acknowledgment and logs outbound message', async () => {
    const partner = await ediService.createPartner(tenantId, {
      partner_name: 'Home Depot Hub',
      sender_id: 'HOMEDEPOT',
      receiver_id: 'STOKROVA_HQ',
    });

    const { messageLog, document } = await ediService.generate855(tenantId, {
      partner_id: partner.id,
      po_ack: {
        po_number: 'PO-HD-99',
        ack_type: 'ACCEPTED',
        ack_date: '20261012',
        lines: [
          {
            line_number: '1',
            sku: 'SKU-LUMBER-01',
            status: 'IA',
            quantity_acknowledged: 50,
            unit_price_minor: '4500',
          },
        ],
      },
    });

    expect(messageLog.direction).toBe('OUTBOUND');
    expect(messageLog.transaction_type).toBe('855');
    expect(document).toContain('ST*855*');
    expect(document).toContain('BAK*00*AC*PO-HD-99*20261012');
    expect(document).toContain('ACK*IA*50*EA');
  });

  it('generates outbound ANSI X12 856 ASN with Pick & Pack SSCC-18 pallet hierarchy', async () => {
    const partner = await ediService.createPartner(tenantId, {
      partner_name: 'Amazon Vendor Central',
      sender_id: 'AMAZON_VC',
      receiver_id: 'STOKROVA_HQ',
    });

    const sscc = generateSscc18('0', '0614141', '123456789');

    const { messageLog, document } = await ediService.generate856(tenantId, {
      partner_id: partner.id,
      asn: {
        shipment_id: 'AMZ-SHP-001',
        bol_number: 'BOL-AMZ-77',
        ship_date: '20261012',
        carrier_code: 'FDEG',
        tracking_number: 'FX99887766',
        pallets: [
          {
            sscc_18: sscc,
            tare_weight_grams: 30000,
            items: [
              {
                sku: 'SKU-AMZ-ELEC',
                quantity: 40,
                uom: 'EA',
                lot_number: 'LOT-AMZ-01',
              },
            ],
          },
        ],
      },
    });

    expect(messageLog.direction).toBe('OUTBOUND');
    expect(messageLog.transaction_type).toBe('856');
    expect(document).toContain('ST*856*');
    expect(document).toContain(`MAN*GM*${sscc}`);
    expect(document).toContain('HL*1**S');
    expect(document).toContain('HL*2*1*T');
    expect(document).toContain('HL*3*2*I');
  });

  it('generates outbound ANSI X12 810 Commercial Invoice', async () => {
    const partner = await ediService.createPartner(tenantId, {
      partner_name: 'Walmart EDI',
      sender_id: 'WALMART_EDI',
      receiver_id: 'STOKROVA_HQ',
    });

    const { messageLog, document } = await ediService.generate810(tenantId, {
      partner_id: partner.id,
      invoice: {
        invoice_number: 'INV-WMT-009',
        po_number: 'PO-WMT-1122',
        invoice_date: '20261012',
        currency: 'USD',
        subtotal_minor: '250000',
        tax_minor: '20000',
        total_minor: '270000',
        lines: [
          {
            line_number: '1',
            sku: 'SKU-WMT-01',
            description: 'Item 1',
            quantity: 100,
            unit_price_minor: '2500',
            line_total_minor: '250000',
          },
        ],
      },
    });

    expect(messageLog.transaction_type).toBe('810');
    expect(document).toContain('ST*810*');
    expect(document).toContain('BIG*20261012*INV-WMT-009**PO-WMT-1122');
    expect(document).toContain('TDS*270000');
  });

  it('parses inbound UN/EDIFACT ORDERS and generates outbound DESADV', async () => {
    const partner = await ediService.createPartner(tenantId, {
      partner_name: 'Carrefour France',
      edi_standard: 'UN_EDIFACT',
      sender_id: 'CARREFOUR_FR',
      receiver_id: 'STOKROVA_HQ',
    });

    const rawEdifact = [
      "UNB+UNOC:3+CARREFOUR_FR:01+STOKROVA_HQ:01+261012:1200+CN-009988'",
      "UNH+CN-009988+ORDERS:D:96A:UN'",
      "BGM+220+CRF-PO-5544+9'",
      "DTM+137:20261012:102'",
      "NAD+BY+CRF01::91++CARREFOUR PARIS'",
      "LIN+1++SKU-FR-WINE:IN'",
      "QTY+21:60:PCE'",
      "PRI+AAA:30.00'",
      "UNT+8+CN-009988'",
      "UNZ+1+CN-009988'",
    ].join('\n');

    const inRes = await ediService.parseInboundDocument(tenantId, partner.id, rawEdifact);
    expect(inRes.messageLog.standard).toBe('UN_EDIFACT');
    expect(inRes.messageLog.control_number).toBe('CN-009988');
    const po = inRes.parsed as any;
    expect(po.po_number).toBe('CRF-PO-5544');

    // Generate DESADV
    const sscc = generateSscc18('0', '0614141', '123456789');
    const outRes = await ediService.generateDesadv(tenantId, partner.id, {
      shipment_id: 'CRF-SHP-1',
      bol_number: 'BOL-FR-1',
      ship_date: '20261012',
      carrier_code: 'CHRN',
      tracking_number: 'TRK-FR-99',
      pallets: [
        {
          sscc_18: sscc,
          items: [{ sku: 'SKU-FR-WINE', quantity: 60, uom: 'PCE' }],
        },
      ],
    });

    expect(outRes.messageLog.transaction_type).toBe('DESADV');
    expect(outRes.document).toContain('DESADV:D:96A:UN');
    expect(outRes.document).toContain(`GIN+BJ+${sscc}`);

    const logs = await ediService.listMessageLogs(tenantId, partner.id);
    expect(logs).toHaveLength(2);
  });
});
