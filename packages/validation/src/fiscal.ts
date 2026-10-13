import { z } from 'zod';

export const FiscalInvoiceTypeSchema = z.enum(['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE']);

export const EInvoiceStandardSchema = z.enum([
  'PEPPOL_BIS_BILLING_3_0',
  'FACTUR_X_COMFORT',
  'ZUGFERD_2_2',
  'UBL_2_1',
]);

export const FacturXProfileSchema = z.enum([
  'MINIMUM',
  'BASIC_WL',
  'BASIC',
  'EN16931_COMFORT',
  'EXTENDED',
]);

export const TaxCategoryCodeSchema = z.enum([
  'S',
  'Z',
  'E',
  'AE',
  'K',
  'G',
  'O',
  'L',
  'M',
]);

export const PaymentMeansCodeSchema = z.enum([
  '10',
  '30',
  '31',
  '42',
  '48',
  '49',
  '58',
  '97',
]);

export const EInvoicePartySchema = z.object({
  name: z.string().trim().min(1, 'Party name is required').max(255),
  country_code: z.string().trim().length(2, 'Country code must be ISO 3166-1 alpha-2 (2 letters)'),
  vat_id: z.string().trim().optional(),
  tax_registration_id: z.string().trim().optional(),
  peppol_endpoint: z.string().trim().optional(),
  peppol_scheme: z.string().trim().optional(),
  address_line1: z.string().trim().min(1, 'Street address is required'),
  city: z.string().trim().min(1, 'City is required'),
  postal_code: z.string().trim().min(1, 'Postal code is required'),
});

export const EInvoiceLineItemSchema = z.object({
  line_id: z.string().trim().min(1, 'Line ID is required'),
  item_name: z.string().trim().min(1, 'Item name is required'),
  description: z.string().trim().optional(),
  quantity: z.union([z.number().positive(), z.string().min(1)]),
  unit_code: z.string().trim().min(1).max(8).default('C62'),
  unit_price_minor: z.string().regex(/^\d+$/, 'Unit price must be a non-negative integer string'),
  line_net_minor: z.string().regex(/^\d+$/, 'Line net amount must be a non-negative integer string'),
  tax_category: TaxCategoryCodeSchema,
  tax_rate_bp: z.number().int().min(0).max(10000),
  tax_amount_minor: z.string().regex(/^\d+$/, 'Tax amount must be a non-negative integer string'),
});

export const EInvoiceTaxSubtotalSchema = z.object({
  taxable_amount_minor: z.string().regex(/^\d+$/, 'Taxable amount must be a non-negative integer string'),
  tax_amount_minor: z.string().regex(/^\d+$/, 'Tax amount must be a non-negative integer string'),
  tax_category: TaxCategoryCodeSchema,
  tax_rate_bp: z.number().int().min(0).max(10000),
  exemption_reason_code: z.string().trim().optional(),
  exemption_reason_text: z.string().trim().optional(),
});

export const EInvoiceDocumentSchema = z.object({
  invoice_number: z.string().trim().min(1, 'Invoice number is required'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be in YYYY-MM-DD format'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
  type: FiscalInvoiceTypeSchema.default('INVOICE'),
  currency: z.string().trim().length(3, 'Currency must be 3-letter ISO 4217 code'),
  buyer_reference: z.string().trim().optional(),
  order_reference: z.string().trim().optional(),
  supplier: EInvoicePartySchema,
  customer: EInvoicePartySchema,
  payment_means_code: PaymentMeansCodeSchema.default('58'),
  payment_terms_note: z.string().trim().optional(),
  line_extension_amount_minor: z.string().regex(/^\d+$/),
  tax_exclusive_amount_minor: z.string().regex(/^\d+$/),
  tax_inclusive_amount_minor: z.string().regex(/^\d+$/),
  payable_amount_minor: z.string().regex(/^\d+$/),
  tax_subtotals: z.array(EInvoiceTaxSubtotalSchema).min(1, 'At least one tax subtotal is required'),
  lines: z.array(EInvoiceLineItemSchema).min(1, 'At least one line item is required'),
});

export const CreateFiscalEntitySchema = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(255),
  country_code: z.string().trim().length(2, 'Country code must be 2 letters'),
  vat_id: z.string().trim().optional().nullable(),
  tax_registration_id: z.string().trim().optional().nullable(),
  peppol_endpoint_id: z.string().trim().optional().nullable(),
  peppol_scheme_id: z.string().trim().optional().nullable(),
  address_line1: z.string().trim().min(1, 'Address is required'),
  city: z.string().trim().min(1, 'City is required'),
  postal_code: z.string().trim().min(1, 'Postal code is required'),
  currency: z.string().trim().length(3).default('EUR').optional(),
});

export const GenerateEInvoiceXmlSchema = z.object({
  standard: EInvoiceStandardSchema.default('PEPPOL_BIS_BILLING_3_0'),
  factur_x_profile: FacturXProfileSchema.optional(),
  document: EInvoiceDocumentSchema,
});

export const ValidateEInvoiceSchema = z.object({
  document: EInvoiceDocumentSchema,
});

export const SignFiscalReceiptSchema = z.object({
  register_id: z.string().trim().min(1, 'Register ID is required'),
  receipt_number: z.string().trim().min(1, 'Receipt number is required'),
  sequence_number: z.number().int().positive('Sequence number must be positive'),
  gross_amount_minor: z.string().regex(/^\d+$/, 'Gross amount must be integer string'),
  tax_amount_minor: z.string().regex(/^\d+$/, 'Tax amount must be integer string'),
  timestamp: z.string().optional(),
  previous_signature_hash: z.string().optional(),
});

export const DetermineCrossBorderTaxSchema = z.object({
  origin_country_code: z.string().trim().length(2),
  destination_country_code: z.string().trim().length(2),
  is_b2b: z.boolean().default(true),
  customer_vat_id: z.string().trim().optional().nullable(),
  customer_vat_valid: z.boolean().optional(),
  oss_registered: z.boolean().optional(),
  standard_rate_bp: z.number().int().min(0).max(10000).optional(),
});
