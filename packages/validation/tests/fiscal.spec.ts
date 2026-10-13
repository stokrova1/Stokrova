import { describe, it, expect } from 'vitest';
import {
  EInvoiceDocumentSchema,
  CreateFiscalEntitySchema,
  SignFiscalReceiptSchema,
  DetermineCrossBorderTaxSchema,
} from '../src/fiscal.js';

describe('Fiscal Compliance & Certified E-Invoicing Validation Schemas (Phase 15)', () => {
  const validDocument = {
    invoice_number: 'INV-2026-0001',
    issue_date: '2026-10-11',
    due_date: '2026-11-10',
    type: 'INVOICE' as const,
    currency: 'EUR',
    supplier: {
      name: 'STOKROVA FRANCE SAS',
      country_code: 'FR',
      vat_id: 'FR12345678901',
      address_line1: '10 Rue de la Paix',
      city: 'Paris',
      postal_code: '75002',
    },
    customer: {
      name: 'ACME GERMANY GMBH',
      country_code: 'DE',
      vat_id: 'DE987654321',
      address_line1: '45 Berliner Str.',
      city: 'Berlin',
      postal_code: '10115',
    },
    payment_means_code: '58' as const,
    line_extension_amount_minor: '100000',
    tax_exclusive_amount_minor: '100000',
    tax_inclusive_amount_minor: '120000',
    payable_amount_minor: '120000',
    tax_subtotals: [
      {
        taxable_amount_minor: '100000',
        tax_amount_minor: '20000',
        tax_category: 'S' as const,
        tax_rate_bp: 2000,
      },
    ],
    lines: [
      {
        line_id: '1',
        item_name: 'Industrial Scanner',
        quantity: 2,
        unit_code: 'C62',
        unit_price_minor: '50000',
        line_net_minor: '100000',
        tax_category: 'S' as const,
        tax_rate_bp: 2000,
        tax_amount_minor: '20000',
      },
    ],
  };

  describe('EInvoiceDocumentSchema', () => {
    it('accepts a fully compliant e-invoice document', () => {
      const parsed = EInvoiceDocumentSchema.parse(validDocument);
      expect(parsed.invoice_number).toBe('INV-2026-0001');
      expect(parsed.currency).toBe('EUR');
      expect(parsed.lines).toHaveLength(1);
    });

    it('rejects an invalid currency code format', () => {
      expect(() =>
        EInvoiceDocumentSchema.parse({
          ...validDocument,
          currency: 'EUROPE',
        }),
      ).toThrow();
    });

    it('rejects an invalid issue date format', () => {
      expect(() =>
        EInvoiceDocumentSchema.parse({
          ...validDocument,
          issue_date: '11/10/2026',
        }),
      ).toThrow();
    });
  });

  describe('CreateFiscalEntitySchema', () => {
    it('accepts valid fiscal entity profile', () => {
      const parsed = CreateFiscalEntitySchema.parse({
        company_name: 'STOKROVA IBERICA SL',
        country_code: 'ES',
        vat_id: 'ESA12345678',
        address_line1: 'Gran Via 4',
        city: 'Madrid',
        postal_code: '28013',
        currency: 'EUR',
      });
      expect(parsed.company_name).toBe('STOKROVA IBERICA SL');
      expect(parsed.country_code).toBe('ES');
    });
  });

  describe('SignFiscalReceiptSchema', () => {
    it('accepts valid cash register fiscal signature request', () => {
      const parsed = SignFiscalReceiptSchema.parse({
        register_id: 'REG-01',
        receipt_number: 'REC-9001',
        sequence_number: 42,
        gross_amount_minor: '12500',
        tax_amount_minor: '2500',
      });
      expect(parsed.sequence_number).toBe(42);
      expect(parsed.gross_amount_minor).toBe('12500');
    });

    it('rejects non-integer gross amount string', () => {
      expect(() =>
        SignFiscalReceiptSchema.parse({
          register_id: 'REG-01',
          receipt_number: 'REC-9001',
          sequence_number: 42,
          gross_amount_minor: '125.00', // Floats strictly forbidden (Rule 26)
          tax_amount_minor: '2500',
        }),
      ).toThrow();
    });
  });

  describe('DetermineCrossBorderTaxSchema', () => {
    it('validates cross-border tax query parameters', () => {
      const parsed = DetermineCrossBorderTaxSchema.parse({
        origin_country_code: 'FR',
        destination_country_code: 'DE',
        is_b2b: true,
        customer_vat_id: 'DE987654321',
        customer_vat_valid: true,
      });
      expect(parsed.origin_country_code).toBe('FR');
      expect(parsed.destination_country_code).toBe('DE');
    });
  });
});
