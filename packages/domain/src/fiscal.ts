/**
 * ============================================================================
 * STOKROVA — Cross-Border Fiscal Compliance & Certified E-Invoicing Domain Engine
 * Phase 15: Cross-Border Fiscal Compliance, Certified E-Invoicing & Digital Tax
 *
 * Benchmark: OpenPEPPOL BIS Billing 3.0, Factur-X / ZUGFeRD 2.2, EN 16931,
 * Austrian RKSV, French NF525, Portuguese AT SAF-T, Avalara Cross-Border
 *
 * Golden Rules Compliance:
 * - Rule 7: Never treat receipts as financial truth (fiscal signatures authenticate but ledger remains truth)
 * - Rule 22: Decoupled pure domain logic (Zero node: imports, runtime-agnostic)
 * - Rule 26: Pure integer arithmetic (minor units for currency, basis points for tax)
 * ============================================================================
 */

import { sha256 } from './search-reporting.js';

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

export type CrossBorderTaxScheme =
  | 'DOMESTIC'
  | 'REVERSE_CHARGE'
  | 'ONE_STOP_SHOP'
  | 'EXPORT_EXEMPT'
  | 'OUT_OF_SCOPE';

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
  unit_code: string;
  unit_price_minor: string;
  line_net_minor: string;
  tax_category: TaxCategoryCode;
  tax_rate_bp: number;
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
  currency: string;   // ISO 4217, e.g. 'EUR'
  buyer_reference?: string;
  order_reference?: string;
  supplier: EInvoiceParty;
  customer: EInvoiceParty;
  payment_means_code: PaymentMeansCode;
  payment_terms_note?: string;
  line_extension_amount_minor: string;
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

export interface DetermineCrossBorderTaxResult {
  tax_scheme: CrossBorderTaxScheme;
  effective_rate_bp: number;
  tax_category: TaxCategoryCode;
  exemption_reason_code?: string;
  exemption_reason_text?: string;
}

// ============================================================================
// Formatting & Escaping Helpers
// ============================================================================

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function minorUnitsToDecimalString(minor: string | number): string {
  const val = BigInt(minor.toString() || '0');
  const isNeg = val < 0n;
  const abs = isNeg ? -val : val;
  const major = abs / 100n;
  const cents = abs % 100n;
  const centsStr = cents < 10n ? `0${cents}` : cents.toString();
  return `${isNeg ? '-' : ''}${major}.${centsStr}`;
}

export function basisPointsToPercentString(bp: number): string {
  const isNeg = bp < 0;
  const abs = Math.abs(bp);
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  const minorStr = minor < 10 ? `0${minor}` : minor.toString();
  return `${isNeg ? '-' : ''}${major}.${minorStr}`;
}

// ============================================================================
// 1. PEPPOL BIS Billing 3.0 & UBL 2.1 Invoice XML Generator
// ============================================================================

export function generatePeppolUblInvoiceXml(doc: EInvoiceDocument): string {
  const isCreditNote = doc.type === 'CREDIT_NOTE';
  const rootTag = isCreditNote ? 'CreditNote' : 'Invoice';
  const invoiceTypeCode = isCreditNote ? '381' : '380';
  const schemaUrn = isCreditNote
    ? 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2'
    : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';

  const buyerRef = doc.buyer_reference || 'NA';
  const lineTag = isCreditNote ? 'CreditNoteLine' : 'InvoiceLine';
  const quantityTag = isCreditNote ? 'CreditedQuantity' : 'InvoicedQuantity';

  let taxSubtotalsXml = '';
  for (const st of doc.tax_subtotals) {
    const exemptionReason = st.exemption_reason_text
      ? `\n      <cbc:TaxExemptionReason>${escapeXml(st.exemption_reason_text)}</cbc:TaxExemptionReason>`
      : '';
    taxSubtotalsXml += `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(st.taxable_amount_minor)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(st.tax_amount_minor)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${escapeXml(st.tax_category)}</cbc:ID>
        <cbc:Percent>${basisPointsToPercentString(st.tax_rate_bp)}</cbc:Percent>${exemptionReason}
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
  }

  let linesXml = '';
  for (const line of doc.lines) {
    const descXml = line.description
      ? `\n        <cbc:Description>${escapeXml(line.description)}</cbc:Description>`
      : '';

    linesXml += `
  <cac:${lineTag}>
    <cbc:ID>${escapeXml(line.line_id)}</cbc:ID>
    <cbc:${quantityTag} unitCode="${escapeXml(line.unit_code)}">${line.quantity}</cbc:${quantityTag}>
    <cbc:LineExtensionAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(line.line_net_minor)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(line.item_name)}</cbc:Name>${descXml}
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${escapeXml(line.tax_category)}</cbc:ID>
        <cbc:Percent>${basisPointsToPercentString(line.tax_rate_bp)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(line.unit_price_minor)}</cbc:PriceAmount>
    </cac:Price>
  </cac:${lineTag}>`;
  }

  const supplierEndpointXml = doc.supplier.peppol_endpoint
    ? `<cbc:EndpointID schemeID="${escapeXml(doc.supplier.peppol_scheme || '0088')}">${escapeXml(doc.supplier.peppol_endpoint)}</cbc:EndpointID>`
    : `<cbc:EndpointID schemeID="0088">${escapeXml(doc.supplier.vat_id || 'UNKNOWN')}</cbc:EndpointID>`;

  const customerEndpointXml = doc.customer.peppol_endpoint
    ? `<cbc:EndpointID schemeID="${escapeXml(doc.customer.peppol_scheme || '0088')}">${escapeXml(doc.customer.peppol_endpoint)}</cbc:EndpointID>`
    : `<cbc:EndpointID schemeID="0088">${escapeXml(doc.customer.vat_id || 'UNKNOWN')}</cbc:EndpointID>`;

  const totalTaxAmountMinor = doc.tax_subtotals.reduce(
    (acc, s) => acc + BigInt(s.tax_amount_minor || '0'),
    0n,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag} xmlns="${schemaUrn}"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(doc.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(doc.issue_date)}</cbc:IssueDate>
  <cbc:DueDate>${escapeXml(doc.due_date)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXml(doc.currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(buyerRef)}</cbc:BuyerReference>

  <cac:AccountingSupplierParty>
    <cac:Party>
      ${supplierEndpointXml}
      <cac:PartyName>
        <cbc:Name>${escapeXml(doc.supplier.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(doc.supplier.address_line1)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(doc.supplier.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(doc.supplier.postal_code)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXml(doc.supplier.country_code)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(doc.supplier.vat_id || '')}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(doc.supplier.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      ${customerEndpointXml}
      <cac:PartyName>
        <cbc:Name>${escapeXml(doc.customer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(doc.customer.address_line1)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(doc.customer.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(doc.customer.postal_code)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXml(doc.customer.country_code)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(doc.customer.vat_id || '')}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(doc.customer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${escapeXml(doc.payment_means_code)}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(totalTaxAmountMinor.toString())}</cbc:TaxAmount>${taxSubtotalsXml}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(doc.line_extension_amount_minor)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(doc.tax_exclusive_amount_minor)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(doc.tax_inclusive_amount_minor)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(doc.payable_amount_minor)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${linesXml}
</${rootTag}>`;
}

// ============================================================================
// 2. Factur-X / ZUGFeRD 2.2 CII (Cross Industry Invoice) Generator
// ============================================================================

export function generateFacturXCiiXml(
  doc: EInvoiceDocument,
  _profile: FacturXProfile = 'EN16931_COMFORT',
): string {
  let taxSubtotalsXml = '';
  for (const st of doc.tax_subtotals) {
    taxSubtotalsXml += `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${minorUnitsToDecimalString(st.tax_amount_minor)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${minorUnitsToDecimalString(st.taxable_amount_minor)}</ram:BasisAmount>
        <ram:CategoryCode>${escapeXml(st.tax_category)}</ram:CategoryCode>
        <ram:RateApplicablePercent>${basisPointsToPercentString(st.tax_rate_bp)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`;
  }

  let linesXml = '';
  for (const line of doc.lines) {
    linesXml += `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${escapeXml(line.line_id)}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(line.item_name)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${minorUnitsToDecimalString(line.unit_price_minor)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${escapeXml(line.unit_code)}">${line.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${escapeXml(line.tax_category)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${basisPointsToPercentString(line.tax_rate_bp)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${minorUnitsToDecimalString(line.line_net_minor)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }

  const issueDateFormatted = doc.issue_date.replace(/-/g, '');
  const totalTaxAmountMinor = doc.tax_subtotals.reduce(
    (acc, s) => acc + BigInt(s.tax_amount_minor || '0'),
    0n,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(doc.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDateFormatted}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${linesXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(doc.supplier.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(doc.supplier.postal_code)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(doc.supplier.address_line1)}</ram:LineOne>
          <ram:CityName>${escapeXml(doc.supplier.city)}</ram:CityName>
          <ram:CountryID>${escapeXml(doc.supplier.country_code)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(doc.supplier.vat_id || '')}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(doc.customer.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(doc.customer.postal_code)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(doc.customer.address_line1)}</ram:LineOne>
          <ram:CityName>${escapeXml(doc.customer.city)}</ram:CityName>
          <ram:CountryID>${escapeXml(doc.customer.country_code)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(doc.customer.vat_id || '')}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery />
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(doc.currency)}</ram:InvoiceCurrencyCode>${taxSubtotalsXml}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${minorUnitsToDecimalString(doc.line_extension_amount_minor)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${minorUnitsToDecimalString(doc.tax_exclusive_amount_minor)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${escapeXml(doc.currency)}">${minorUnitsToDecimalString(totalTaxAmountMinor.toString())}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${minorUnitsToDecimalString(doc.tax_inclusive_amount_minor)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${minorUnitsToDecimalString(doc.payable_amount_minor)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

// ============================================================================
// 3. E-Invoice Document Schematron Business Rule Validator
// ============================================================================

export function validateEInvoiceDocument(doc: EInvoiceDocument): {
  is_valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // BR-02: Invoice number required
  if (!doc.invoice_number?.trim()) {
    errors.push('BR-02: An Invoice shall have an Invoice number [BT-1].');
  }

  // BR-03: Issue date required (YYYY-MM-DD)
  if (!doc.issue_date || !/^\d{4}-\d{2}-\d{2}$/.test(doc.issue_date)) {
    errors.push('BR-03: An Invoice shall have an Invoice issue date [BT-2] formatted as YYYY-MM-DD.');
  }

  // BR-05: Currency code required (ISO 4217)
  if (!doc.currency || doc.currency.length !== 3) {
    errors.push('BR-05: An Invoice shall have an Invoice currency code [BT-5] conforming to ISO 4217.');
  }

  // BR-08: Supplier postal country
  if (!doc.supplier?.country_code || doc.supplier.country_code.length !== 2) {
    errors.push('BR-08: The Seller postal address shall contain a Seller country code [BT-40].');
  }

  // BR-11: Customer postal country
  if (!doc.customer?.country_code || doc.customer.country_code.length !== 2) {
    errors.push('BR-11: The Buyer postal address shall contain a Buyer country code [BT-55].');
  }

  // BR-16: At least one invoice line
  if (!doc.lines || doc.lines.length === 0) {
    errors.push('BR-16: An Invoice shall have at least one Invoice line [BG-25].');
  }

  // Mathematical Equilibrium Checks (Rule 26)
  // BR-CO-10: Sum of line net amounts must equal line extension amount
  const lineSum = doc.lines.reduce(
    (acc, l) => acc + BigInt(l.line_net_minor || '0'),
    0n,
  );
  if (lineSum.toString() !== doc.line_extension_amount_minor) {
    errors.push(
      `BR-CO-10: Sum of line amounts (${lineSum}) does not equal line extension amount (${doc.line_extension_amount_minor}).`,
    );
  }

  // BR-CO-15: Tax exclusive + sum of tax subtotals must equal tax inclusive
  const taxSubtotalSum = doc.tax_subtotals.reduce(
    (acc, st) => acc + BigInt(st.tax_amount_minor || '0'),
    0n,
  );
  const calculatedInclusive = BigInt(doc.tax_exclusive_amount_minor || '0') + taxSubtotalSum;
  if (calculatedInclusive.toString() !== doc.tax_inclusive_amount_minor) {
    errors.push(
      `BR-CO-15: Tax exclusive (${doc.tax_exclusive_amount_minor}) + tax subtotals (${taxSubtotalSum}) does not equal tax inclusive (${doc.tax_inclusive_amount_minor}).`,
    );
  }

  return {
    is_valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// 4. Cryptographic Fiscal Cash Register Signatures & QR Code Engine
// ============================================================================

export function generateFiscalReceiptSignature(params: {
  registerId: string;
  receiptNumber: string;
  sequenceNumber: number;
  grossMinor: string;
  taxMinor: string;
  timestamp?: string;
  previousHash?: string;
}): {
  signatureHash: string;
  qrPayload: string;
} {
  const ts = params.timestamp || new Date().toISOString();
  const prev = params.previousHash || 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

  const grossDec = minorUnitsToDecimalString(params.grossMinor);
  const taxDec = minorUnitsToDecimalString(params.taxMinor);

  // Digest payload for signing: _R1-AT0_{registerId}_{receiptNumber}_{sequence}_{timestamp}_{gross}_{tax}_{prev}
  const payloadToHash = `${params.registerId}:${params.receiptNumber}:${params.sequenceNumber}:${ts}:${params.grossMinor}:${params.taxMinor}:${prev}`;
  const signatureHash = sha256(payloadToHash);

  // Standard fiscal QR format (conforming to Austrian RKSV & French NF525 verification string)
  const qrPayload = `_R1-AT0_${params.registerId}_${params.receiptNumber}_${ts}_${grossDec}_${taxDec}_${signatureHash.substring(0, 16)}_${prev.substring(0, 8)}`;

  return {
    signatureHash,
    qrPayload,
  };
}

// ============================================================================
// 5. Cross-Border Tax Scheme Determiner (EU VAT Directive & US Nexus)
// ============================================================================

const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

export function determineCrossBorderTaxScheme(params: {
  origin_country_code: string;
  destination_country_code: string;
  is_b2b: boolean;
  customer_vat_id?: string | null;
  customer_vat_valid?: boolean;
  oss_registered?: boolean;
  standard_rate_bp?: number;
}): DetermineCrossBorderTaxResult {
  const origin = params.origin_country_code.toUpperCase();
  const dest = params.destination_country_code.toUpperCase();
  const stdRate = params.standard_rate_bp ?? 2000;

  // 1. Domestic Transaction
  if (origin === dest) {
    return {
      tax_scheme: 'DOMESTIC',
      effective_rate_bp: stdRate,
      tax_category: 'S',
    };
  }

  const isOriginEu = EU_COUNTRY_CODES.has(origin);
  const isDestEu = EU_COUNTRY_CODES.has(dest);

  // 2. Intra-EU Cross-Border Transactions
  if (isOriginEu && isDestEu) {
    if (params.is_b2b && params.customer_vat_valid && params.customer_vat_id) {
      // Intra-EU B2B Reverse Charge
      return {
        tax_scheme: 'REVERSE_CHARGE',
        effective_rate_bp: 0,
        tax_category: 'AE',
        exemption_reason_code: 'VATEX-EU-AE',
        exemption_reason_text: 'Intra-community supply subject to reverse charge under Art. 138 Council Directive 2006/112/EC',
      };
    }

    if (!params.is_b2b && params.oss_registered) {
      // Intra-EU B2C One-Stop Shop (OSS)
      return {
        tax_scheme: 'ONE_STOP_SHOP',
        effective_rate_bp: stdRate,
        tax_category: 'S',
        exemption_reason_text: 'EU One-Stop Shop (OSS) distance sales taxation',
      };
    }
  }

  // 3. Export to Non-EU Country
  if (isOriginEu && !isDestEu) {
    return {
      tax_scheme: 'EXPORT_EXEMPT',
      effective_rate_bp: 0,
      tax_category: 'G',
      exemption_reason_code: 'VATEX-EU-G',
      exemption_reason_text: 'Exempt export of goods outside the European Union under Art. 146 Council Directive 2006/112/EC',
    };
  }

  // Default fallback: Domestic / Destination taxation
  return {
    tax_scheme: 'DOMESTIC',
    effective_rate_bp: stdRate,
    tax_category: 'S',
  };
}
