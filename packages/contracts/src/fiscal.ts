/**
 * ============================================================================
 * STOKROVA — Cross-Border Fiscal Compliance & Certified E-Invoicing Contracts
 * Phase 15: Cross-Border Fiscal Compliance, Certified E-Invoicing & Digital Tax
 * ============================================================================
 */

export type FiscalInvoiceType = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export type EInvoiceStandard =
  | 'PEPPOL_BIS_BILLING_3_0'
  | 'FACTUR_X_COMFORT'
  | 'ZUGFERD_2_2'
  | 'UBL_2_1';

export type FacturXProfile =
  | 'MINIMUM'
  | 'BASIC_WL'
  | 'BASIC'
  | 'EN16931_COMFORT'
  | 'EXTENDED';

export type TaxCategoryCode =
  | 'S'   // Standard rate
  | 'Z'   // Zero rated goods
  | 'E'   // Exempt from tax
  | 'AE'  // Reverse charge (intra-community B2B)
  | 'K'   // VAT exempt for EEA intra-community supply of goods
  | 'G'   // Free export, tax not charged
  | 'O'   // Services outside scope of tax
  | 'L'   // Canary Islands IGIC
  | 'M';  // Ceuta and Melilla IPSI

export type PaymentMeansCode =
  | '10'  // In cash
  | '30'  // Credit transfer
  | '31'  // Debit transfer
  | '42'  // Payment to bank account
  | '48'  // Credit card
  | '49'  // Direct debit
  | '58'  // SEPA credit transfer
  | '97'; // Clearing between partners

export type EInvoiceTransmissionStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'TRANSMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ERROR';

export type CrossBorderTaxScheme =
  | 'DOMESTIC'
  | 'REVERSE_CHARGE'
  | 'ONE_STOP_SHOP'
  | 'EXPORT_EXEMPT'
  | 'OUT_OF_SCOPE';

export interface FiscalEntityProfile {
  id: string;
  tenant_id: string;
  company_name: string;
  country_code: string; // ISO 3166-1 alpha-2
  vat_id?: string | null; // e.g. FR12345678901, DE123456789
  tax_registration_id?: string | null;
  peppol_endpoint_id?: string | null;
  peppol_scheme_id?: string | null; // e.g. '0195', '9930', '9906'
  address_line1: string;
  city: string;
  postal_code: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EInvoiceParty {
  name: string;
  country_code: string;
  vat_id?: string;
  tax_registration_id?: string;
  peppol_endpoint?: string;
  peppol_scheme?: string;
  address_line1: string;
  city: string;
  postal_code: string;
}

export interface EInvoiceLineItem {
  line_id: string;
  item_name: string;
  description?: string;
  quantity: string | number;
  unit_code: string; // UN/ECE Recommendation 20 (e.g. 'H87', 'C62', 'KGM')
  unit_price_minor: string;
  line_net_minor: string;
  tax_category: TaxCategoryCode;
  tax_rate_bp: number; // e.g. 2000 = 20.00%
  tax_amount_minor: string;
}

export interface EInvoiceTaxSubtotal {
  taxable_amount_minor: string;
  tax_amount_minor: string;
  tax_category: TaxCategoryCode;
  tax_rate_bp: number;
  exemption_reason_code?: string;
  exemption_reason_text?: string;
}

export interface EInvoiceDocument {
  invoice_number: string;
  issue_date: string; // YYYY-MM-DD
  due_date: string;   // YYYY-MM-DD
  type: FiscalInvoiceType;
  currency: string;   // ISO 4217, e.g. 'EUR', 'USD'
  buyer_reference?: string;
  order_reference?: string;
  supplier: EInvoiceParty;
  customer: EInvoiceParty;
  payment_means_code: PaymentMeansCode;
  payment_terms_note?: string;
  line_extension_amount_minor: string; // Sum of line net amounts
  tax_exclusive_amount_minor: string;
  tax_inclusive_amount_minor: string;
  payable_amount_minor: string;
  tax_subtotals: EInvoiceTaxSubtotal[];
  lines: EInvoiceLineItem[];
}

export interface EInvoiceGenerationResult {
  standard: EInvoiceStandard;
  xml_content: string;
  sha256_digest: string;
  byte_length: number;
  is_valid: boolean;
  validation_errors: string[];
}

export interface FiscalReceiptSignatureRecord {
  id: string;
  tenant_id: string;
  register_id: string;
  receipt_number: string;
  sequence_number: number;
  gross_amount_minor: string;
  tax_amount_minor: string;
  timestamp: string;
  previous_signature_hash: string;
  signature_hash: string;
  qr_payload: string;
  created_at: string;
}

export interface DetermineCrossBorderTaxResult {
  tax_scheme: CrossBorderTaxScheme;
  effective_rate_bp: number;
  tax_category: TaxCategoryCode;
  exemption_reason_code?: string;
  exemption_reason_text?: string;
}

// ============================================================================
// DTOs & Request Interfaces
// ============================================================================

export interface CreateFiscalEntityRequest {
  company_name: string;
  country_code: string;
  vat_id?: string | null;
  tax_registration_id?: string | null;
  peppol_endpoint_id?: string | null;
  peppol_scheme_id?: string | null;
  address_line1: string;
  city: string;
  postal_code: string;
  currency?: string;
}

export interface GenerateEInvoiceXmlRequest {
  standard: EInvoiceStandard;
  factur_x_profile?: FacturXProfile;
  document: EInvoiceDocument;
}

export interface ValidateEInvoiceRequest {
  document: EInvoiceDocument;
}

export interface SignFiscalReceiptRequest {
  register_id: string;
  receipt_number: string;
  sequence_number: number;
  gross_amount_minor: string;
  tax_amount_minor: string;
  timestamp?: string;
  previous_signature_hash?: string;
}

export interface DetermineCrossBorderTaxRequest {
  origin_country_code: string;
  destination_country_code: string;
  is_b2b: boolean;
  customer_vat_id?: string | null;
  customer_vat_valid?: boolean;
  oss_registered?: boolean;
  standard_rate_bp?: number;
}
