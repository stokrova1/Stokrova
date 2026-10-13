import { describe, it, expect } from 'vitest';
import {
  generatePeppolUblInvoiceXml,
  generateFacturXCiiXml,
  validateEInvoiceDocument,
  generateFiscalReceiptSignature,
  determineCrossBorderTaxScheme,
  minorUnitsToDecimalString,
  basisPointsToPercentString,
  type EInvoiceDocument,
} from '../src/fiscal.js';

describe('Cross-Border Fiscal Compliance, Certified E-Invoicing & Digital Tax Engine (Phase 15)', () => {
  const sampleDocument: EInvoiceDocument = {
    invoice_number: 'INV-2026-0001',
    issue_date: '2026-10-11',
    due_date: '2026-11-10',
    type: 'INVOICE',
    currency: 'EUR',
    buyer_reference: 'PO-9988',
    order_reference: 'SO-1001',
    supplier: {
      name: 'STOKROVA FRANCE SAS',
      country_code: 'FR',
      vat_id: 'FR12345678901',
      peppol_endpoint: 'FR12345678901',
      peppol_scheme: '9957',
      address_line1: '10 Rue de la Paix',
      city: 'Paris',
      postal_code: '75002',
    },
    customer: {
      name: 'ACME GERMANY GMBH',
      country_code: 'DE',
      vat_id: 'DE987654321',
      peppol_endpoint: 'DE987654321',
      peppol_scheme: '9930',
      address_line1: '45 Berliner Str.',
      city: 'Berlin',
      postal_code: '10115',
    },
    payment_means_code: '58', // SEPA credit transfer
    line_extension_amount_minor: '100000', // €1,000.00
    tax_exclusive_amount_minor: '100000',
    tax_inclusive_amount_minor: '120000',  // €1,200.00 (20% VAT)
    payable_amount_minor: '120000',
    tax_subtotals: [
      {
        taxable_amount_minor: '100000',
        tax_amount_minor: '20000', // €200.00
        tax_category: 'S',
        tax_rate_bp: 2000, // 20.00%
      },
    ],
    lines: [
      {
        line_id: '1',
        item_name: 'Industrial Barcode Scanner Zebra TC21',
        description: 'Android Touch Computer with 2D imager',
        quantity: 2,
        unit_code: 'C62', // One
        unit_price_minor: '50000', // €500.00
        line_net_minor: '100000',
        tax_category: 'S',
        tax_rate_bp: 2000,
        tax_amount_minor: '20000',
      },
    ],
  };

  // ==========================================================================
  // 1. Formatting & Numeric Precision (Rule 26)
  // ==========================================================================
  describe('Minor Units and Basis Points Formatters', () => {
    it('converts minor units to exact decimal strings without float drift', () => {
      expect(minorUnitsToDecimalString('100000')).toBe('1000.00');
      expect(minorUnitsToDecimalString('1250')).toBe('12.50');
      expect(minorUnitsToDecimalString('5')).toBe('0.05');
      expect(minorUnitsToDecimalString('0')).toBe('0.00');
      expect(minorUnitsToDecimalString('-250')).toBe('-2.50');
    });

    it('converts basis points to percentage strings', () => {
      expect(basisPointsToPercentString(2000)).toBe('20.00');
      expect(basisPointsToPercentString(750)).toBe('7.50');
      expect(basisPointsToPercentString(0)).toBe('0.00');
    });
  });

  // ==========================================================================
  // 2. PEPPOL BIS Billing 3.0 & UBL 2.1 E-Invoicing
  // ==========================================================================
  describe('generatePeppolUblInvoiceXml', () => {
    it('generates compliant PEPPOL BIS Billing 3.0 UBL 2.1 Invoice XML', () => {
      const xml = generatePeppolUblInvoiceXml(sampleDocument);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"');
      expect(xml).toContain('urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0');
      expect(xml).toContain('<cbc:ID>INV-2026-0001</cbc:ID>');
      expect(xml).toContain('<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>');
      expect(xml).toContain('<cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>');
      expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="EUR">1200.00</cbc:TaxInclusiveAmount>');
      expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">1200.00</cbc:PayableAmount>');
      expect(xml).toContain('<cbc:Name>STOKROVA FRANCE SAS</cbc:Name>');
      expect(xml).toContain('<cbc:Name>ACME GERMANY GMBH</cbc:Name>');
      expect(xml).toContain('<cbc:PriceAmount currencyID="EUR">500.00</cbc:PriceAmount>');
    });

    it('generates UBL Credit Note with CreditNote root tag and type code 381', () => {
      const creditNoteDoc: EInvoiceDocument = {
        ...sampleDocument,
        invoice_number: 'CN-2026-0001',
        type: 'CREDIT_NOTE',
      };
      const xml = generatePeppolUblInvoiceXml(creditNoteDoc);

      expect(xml).toContain('<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"');
      expect(xml).toContain('<cbc:InvoiceTypeCode>381</cbc:InvoiceTypeCode>');
      expect(xml).toContain('<cac:CreditNoteLine>');
      expect(xml).toContain('<cbc:CreditedQuantity unitCode="C62">2</cbc:CreditedQuantity>');
    });
  });

  // ==========================================================================
  // 3. Factur-X / ZUGFeRD 2.2 CII Generator
  // ==========================================================================
  describe('generateFacturXCiiXml', () => {
    it('generates valid UN/CEFACT Cross Industry Invoice XML with Factur-X Guideline', () => {
      const xml = generateFacturXCiiXml(sampleDocument);

      expect(xml).toContain('<rsm:CrossIndustryInvoice');
      expect(xml).toContain('urn:factur-x.eu:1p0:en16931');
      expect(xml).toContain('<ram:ID>INV-2026-0001</ram:ID>');
      expect(xml).toContain('<ram:LineTotalAmount>1000.00</ram:LineTotalAmount>');
      expect(xml).toContain('<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>');
      expect(xml).toContain('<ram:DuePayableAmount>1200.00</ram:DuePayableAmount>');
    });
  });

  // ==========================================================================
  // 4. Schematron Business Rule Validation
  // ==========================================================================
  describe('validateEInvoiceDocument', () => {
    it('passes for a perfectly balanced and well-formed document', () => {
      const result = validateEInvoiceDocument(sampleDocument);
      expect(result.is_valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects line extension amount mathematical discrepancy (Rule BR-CO-10)', () => {
      const invalidDoc: EInvoiceDocument = {
        ...sampleDocument,
        line_extension_amount_minor: '99000', // Discrepancy against lines sum (100000)
      };
      const result = validateEInvoiceDocument(invalidDoc);
      expect(result.is_valid).toBe(false);
      expect(result.errors.some((e) => e.includes('BR-CO-10'))).toBe(true);
    });

    it('detects tax calculation equilibrium mismatch (Rule BR-CO-15)', () => {
      const invalidDoc: EInvoiceDocument = {
        ...sampleDocument,
        tax_inclusive_amount_minor: '130000', // Should be 100000 + 20000 = 120000
      };
      const result = validateEInvoiceDocument(invalidDoc);
      expect(result.is_valid).toBe(false);
      expect(result.errors.some((e) => e.includes('BR-CO-15'))).toBe(true);
    });

    it('rejects document missing required metadata (BR-02, BR-05)', () => {
      const invalidDoc: EInvoiceDocument = {
        ...sampleDocument,
        invoice_number: '',
        currency: 'INVALID',
      };
      const result = validateEInvoiceDocument(invalidDoc);
      expect(result.is_valid).toBe(false);
      expect(result.errors.some((e) => e.includes('BR-02'))).toBe(true);
      expect(result.errors.some((e) => e.includes('BR-05'))).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Cryptographic Fiscal Cash Register Signatures
  // ==========================================================================
  describe('generateFiscalReceiptSignature', () => {
    it('generates SHA-256 rolling fiscal signature and standardized QR code payload', () => {
      const sig1 = generateFiscalReceiptSignature({
        registerId: 'REG-01',
        receiptNumber: 'REC-1001',
        sequenceNumber: 1,
        grossMinor: '15000', // €150.00
        taxMinor: '3000',    // €30.00
        timestamp: '2026-10-11T19:30:00.000Z',
      });

      expect(sig1.signatureHash).toBeDefined();
      expect(sig1.signatureHash.length).toBe(64); // SHA-256 64-char hex
      expect(sig1.qrPayload).toContain('_R1-AT0_REG-01_REC-1001_2026-10-11T19:30:00.000Z_150.00_30.00_');

      // Second receipt links cryptographically to sig1
      const sig2 = generateFiscalReceiptSignature({
        registerId: 'REG-01',
        receiptNumber: 'REC-1002',
        sequenceNumber: 2,
        grossMinor: '2500',
        taxMinor: '500',
        timestamp: '2026-10-11T19:35:00.000Z',
        previousHash: sig1.signatureHash,
      });

      expect(sig2.signatureHash).not.toBe(sig1.signatureHash);
      expect(sig2.qrPayload).toContain(sig1.signatureHash.substring(0, 8));
    });
  });

  // ==========================================================================
  // 6. Cross-Border Tax Scheme Determiner (EU VAT & Non-EU Export)
  // ==========================================================================
  describe('determineCrossBorderTaxScheme', () => {
    it('returns DOMESTIC standard VAT when origin and destination are the same country', () => {
      const result = determineCrossBorderTaxScheme({
        origin_country_code: 'FR',
        destination_country_code: 'FR',
        is_b2b: true,
        standard_rate_bp: 2000,
      });

      expect(result.tax_scheme).toBe('DOMESTIC');
      expect(result.effective_rate_bp).toBe(2000);
      expect(result.tax_category).toBe('S');
    });

    it('returns REVERSE_CHARGE 0% for Intra-EU B2B with valid customer VAT ID', () => {
      const result = determineCrossBorderTaxScheme({
        origin_country_code: 'FR',
        destination_country_code: 'DE',
        is_b2b: true,
        customer_vat_id: 'DE987654321',
        customer_vat_valid: true,
      });

      expect(result.tax_scheme).toBe('REVERSE_CHARGE');
      expect(result.effective_rate_bp).toBe(0);
      expect(result.tax_category).toBe('AE');
      expect(result.exemption_reason_code).toBe('VATEX-EU-AE');
    });

    it('returns ONE_STOP_SHOP for Intra-EU B2C distance sales with OSS registration', () => {
      const result = determineCrossBorderTaxScheme({
        origin_country_code: 'FR',
        destination_country_code: 'ES',
        is_b2b: false,
        oss_registered: true,
        standard_rate_bp: 2100, // Spain standard rate
      });

      expect(result.tax_scheme).toBe('ONE_STOP_SHOP');
      expect(result.effective_rate_bp).toBe(2100);
      expect(result.tax_category).toBe('S');
    });

    it('returns EXPORT_EXEMPT 0% for exports outside the European Union', () => {
      const result = determineCrossBorderTaxScheme({
        origin_country_code: 'FR',
        destination_country_code: 'US', // Non-EU
        is_b2b: true,
      });

      expect(result.tax_scheme).toBe('EXPORT_EXEMPT');
      expect(result.effective_rate_bp).toBe(0);
      expect(result.tax_category).toBe('G');
      expect(result.exemption_reason_code).toBe('VATEX-EU-G');
    });
  });
});
