import { describe, it, expect, beforeEach } from 'vitest';
import { FiscalComplianceService } from './fiscal-compliance.service.js';
import type { EInvoiceDocument } from '@stokrova/contracts';

describe('Fiscal Compliance & E-Invoicing Services (Phase 15 API)', () => {
  let fiscalService: FiscalComplianceService;
  const tenantId = 'tenant-fiscal-test';

  const sampleDoc: EInvoiceDocument = {
    invoice_number: 'INV-2026-9001',
    issue_date: '2026-10-11',
    due_date: '2026-11-10',
    type: 'INVOICE',
    currency: 'EUR',
    buyer_reference: 'PO-TEST',
    supplier: {
      name: 'STOKROVA TECH SAS',
      country_code: 'FR',
      vat_id: 'FR55123456789',
      address_line1: '1 Av des Champs-Elysees',
      city: 'Paris',
      postal_code: '75008',
    },
    customer: {
      name: 'DEUTSCHE HANDEL AG',
      country_code: 'DE',
      vat_id: 'DE112233445',
      address_line1: '10 Friedrichstr',
      city: 'Berlin',
      postal_code: '10117',
    },
    payment_means_code: '58',
    line_extension_amount_minor: '250000', // €2,500.00
    tax_exclusive_amount_minor: '250000',
    tax_inclusive_amount_minor: '300000',  // €3,000.00 (20% VAT)
    payable_amount_minor: '300000',
    tax_subtotals: [
      {
        taxable_amount_minor: '250000',
        tax_amount_minor: '50000',
        tax_category: 'S',
        tax_rate_bp: 2000,
      },
    ],
    lines: [
      {
        line_id: '1',
        item_name: 'POS Terminal Workstation STOKROVA ONE',
        quantity: 5,
        unit_code: 'C62',
        unit_price_minor: '50000',
        line_net_minor: '250000',
        tax_category: 'S',
        tax_rate_bp: 2000,
        tax_amount_minor: '50000',
      },
    ],
  };

  beforeEach(() => {
    fiscalService = new FiscalComplianceService();
  });

  describe('FiscalEntity Management', () => {
    it('creates and lists fiscal entities for tenant', async () => {
      const entity = await fiscalService.createFiscalEntity(tenantId, {
        company_name: 'STOKROVA FRANCE SAS',
        country_code: 'FR',
        vat_id: 'FR55123456789',
        address_line1: '1 Av des Champs-Elysees',
        city: 'Paris',
        postal_code: '75008',
        currency: 'EUR',
      });

      expect(entity.id).toBeDefined();
      expect(entity.tenant_id).toBe(tenantId);
      expect(entity.vat_id).toBe('FR55123456789');

      const list = await fiscalService.listFiscalEntities(tenantId);
      expect(list.length).toBe(1);

      const fetched = await fiscalService.getFiscalEntity(tenantId, entity.id);
      expect(fetched.id).toBe(entity.id);
    });
  });

  describe('PEPPOL & Factur-X Generation', () => {
    it('generates compliant PEPPOL UBL 2.1 XML and computes SHA256 digest', async () => {
      const result = await fiscalService.generateEInvoiceXml(tenantId, {
        standard: 'PEPPOL_BIS_BILLING_3_0',
        document: sampleDoc,
      });

      expect(result.standard).toBe('PEPPOL_BIS_BILLING_3_0');
      expect(result.is_valid).toBe(true);
      expect(result.validation_errors).toHaveLength(0);
      expect(result.sha256_digest).toBeDefined();
      expect(result.sha256_digest.length).toBe(64);
      expect(result.xml_content).toContain('<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>');
      expect(result.xml_content).toContain('<cbc:LineExtensionAmount currencyID="EUR">2500.00</cbc:LineExtensionAmount>');
    });

    it('generates Factur-X CII XML format', async () => {
      const result = await fiscalService.generateEInvoiceXml(tenantId, {
        standard: 'FACTUR_X_COMFORT',
        document: sampleDoc,
      });

      expect(result.standard).toBe('FACTUR_X_COMFORT');
      expect(result.xml_content).toContain('<rsm:CrossIndustryInvoice');
      expect(result.xml_content).toContain('urn:factur-x.eu:1p0:en16931');
    });

    it('validates e-invoice document rules independently', async () => {
      const validation = await fiscalService.validateEInvoice({
        document: sampleDoc,
      });

      expect(validation.is_valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Fiscal Cash Register Signatures', () => {
    it('signs cash register receipts in cryptographic chain', async () => {
      const receipt1 = await fiscalService.signFiscalReceipt(tenantId, {
        register_id: 'REG-FR-01',
        receipt_number: 'REC-2026-101',
        sequence_number: 1,
        gross_amount_minor: '15000',
        tax_amount_minor: '3000',
        timestamp: '2026-10-11T19:40:00.000Z',
      });

      expect(receipt1.signature_hash).toBeDefined();
      expect(receipt1.signature_hash.length).toBe(64);
      expect(receipt1.qr_payload).toContain('_R1-AT0_REG-FR-01_REC-2026-101_');

      // Next receipt links automatically to previous hash
      const receipt2 = await fiscalService.signFiscalReceipt(tenantId, {
        register_id: 'REG-FR-01',
        receipt_number: 'REC-2026-102',
        sequence_number: 2,
        gross_amount_minor: '4500',
        tax_amount_minor: '900',
        timestamp: '2026-10-11T19:45:00.000Z',
      });

      expect(receipt2.previous_signature_hash).toBe(receipt1.signature_hash);
      expect(receipt2.qr_payload).toContain(receipt1.signature_hash.substring(0, 8));
    });
  });

  describe('Cross-Border Tax Determination', () => {
    it('resolves EU B2B reverse charge for intra-community sales with valid customer VAT', () => {
      const tax = fiscalService.determineCrossBorderTax({
        origin_country_code: 'FR',
        destination_country_code: 'DE',
        is_b2b: true,
        customer_vat_id: 'DE112233445',
        customer_vat_valid: true,
      });

      expect(tax.tax_scheme).toBe('REVERSE_CHARGE');
      expect(tax.effective_rate_bp).toBe(0);
      expect(tax.tax_category).toBe('AE');
    });

    it('resolves zero-rated export for sales outside EU', () => {
      const tax = fiscalService.determineCrossBorderTax({
        origin_country_code: 'FR',
        destination_country_code: 'US',
        is_b2b: true,
      });

      expect(tax.tax_scheme).toBe('EXPORT_EXEMPT');
      expect(tax.effective_rate_bp).toBe(0);
      expect(tax.tax_category).toBe('G');
    });
  });
});
