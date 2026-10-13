/**
 * ============================================================================
 * STOKROVA — Supply Chain EDI Engine & Automated B2B Exchange Domain
 * Phase 18: Supply Chain EDI Engine (ANSI X12 & UN/EDIFACT)
 *
 * Benchmark: Amazon Vendor Central EDI, Walmart Retail Link EDI,
 * Target EDI, Home Depot Supplier Hub, GS1 SSCC-18 Logistics Standards
 *
 * Golden Rules Compliance:
 * - Rule 7: Authoritative truth in ledger journal entries, not ephemeral EDI receipts
 * - Rule 18 & 19: Idempotent message deduplication via interchange control numbers (ISA13 / UNB05)
 * - Rule 22: Decoupled pure domain logic (Zero external/Node dependencies)
 * - Rule 26: Pure integer arithmetic (minor units for prices, integer quantities, Modulo-10 Luhn check digits)
 * ============================================================================
 */

export type EdiStandard = 'ANSI_X12' | 'UN_EDIFACT';

export type EdiTransactionType =
  | '850'
  | '855'
  | '856'
  | '810'
  | '997'
  | 'ORDERS'
  | 'ORDRSP'
  | 'DESADV'
  | 'INVOIC'
  | 'CONTRL';

export type EdiDirection = 'INBOUND' | 'OUTBOUND';

export type EdiMessageStatus =
  | 'RECEIVED'
  | 'PARSED'
  | 'PROCESSED'
  | 'GENERATED'
  | 'TRANSMITTED'
  | 'ACKNOWLEDGED'
  | 'REJECTED'
  | 'FAILED';

export interface EdiInterchangeEnvelope {
  sender_id: string;
  sender_qualifier: string;
  receiver_id: string;
  receiver_qualifier: string;
  control_number: string;
  date: string;
  time: string;
  standard: EdiStandard;
  version: string;
}

export interface EdiPurchaseOrderLine {
  line_number: string;
  sku: string;
  gtin_upc?: string | null;
  description: string;
  quantity: number;
  unit_price_minor: string;
  uom: string;
}

export interface EdiPurchaseOrder {
  po_number: string;
  po_date: string;
  buyer_name: string;
  buyer_id: string;
  supplier_id?: string | null;
  currency: string;
  total_amount_minor: string;
  lines: EdiPurchaseOrderLine[];
}

export interface EdiPurchaseOrderAckLine {
  line_number: string;
  sku: string;
  status: 'IA' | 'IR' | 'IP' | 'IQ';
  quantity_acknowledged: number;
  unit_price_minor: string;
}

export interface EdiPurchaseOrderAck {
  po_number: string;
  ack_type: 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
  ack_date: string;
  lines: EdiPurchaseOrderAckLine[];
}

export interface EdiAsnItem {
  sku: string;
  quantity: number;
  uom: string;
  lot_number?: string | null;
  serial_numbers?: string[] | null;
}

export interface EdiPallet {
  sscc_18: string;
  tare_weight_grams?: number;
  items: EdiAsnItem[];
}

export interface EdiAdvanceShipNotice {
  shipment_id: string;
  bol_number: string;
  ship_date: string;
  estimated_delivery_date?: string;
  carrier_code: string;
  tracking_number: string;
  pallets: EdiPallet[];
}

export interface EdiInvoiceLine {
  line_number: string;
  sku: string;
  description: string;
  quantity: number;
  unit_price_minor: string;
  line_total_minor: string;
}

export interface EdiInvoice {
  invoice_number: string;
  po_number: string;
  invoice_date: string;
  currency: string;
  subtotal_minor: string;
  tax_minor: string;
  total_minor: string;
  lines: EdiInvoiceLine[];
}

export interface EdiFunctionalAck {
  original_control_number: string;
  group_control_number: string;
  status: 'A' | 'R' | 'E';
  error_codes?: string[];
}

export class EdiDomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'EdiDomainError';
  }
}

// ============================================================================
// Minor Unit & Decimal Formatting Utilities (Rule 26)
// ============================================================================

/**
 * Parses a decimal string (e.g. "12.50", "99", "0.25") into minor units (bigint cents).
 * Never uses floating-point arithmetic.
 */
export function parseDecimalToMinor(decimalStr: string): bigint {
  const clean = decimalStr.trim();
  if (!clean) return 0n;

  const parts = clean.split('.');
  if (parts.length === 1) {
    const wholeStr = parts[0] ?? '0';
    return BigInt(wholeStr) * 100n;
  }
  if (parts.length === 2) {
    const whole = BigInt(parts[0] || '0') * 100n;
    const fractionStr = (parts[1] ?? '').slice(0, 2).padEnd(2, '0');
    const fraction = BigInt(fractionStr);
    return whole >= 0n ? whole + fraction : whole - fraction;
  }
  throw new EdiDomainError('INVALID_DECIMAL_FORMAT', `Invalid decimal number: ${decimalStr}`);
}

/**
 * Formats minor units (bigint or string) to a standard decimal string (e.g. 1250n -> "12.50").
 */
export function formatMinorToDecimal(minorAmount: bigint | string): string {
  const val = typeof minorAmount === 'string' ? BigInt(minorAmount) : minorAmount;
  const isNegative = val < 0n;
  const absVal = isNegative ? -val : val;

  const whole = absVal / 100n;
  const fraction = absVal % 100n;
  const fractionStr = fraction.toString().padStart(2, '0');
  const sign = isNegative ? '-' : '';

  return `${sign}${whole}.${fractionStr}`;
}

// ============================================================================
// GS1 SSCC-18 Barcode Generation & Luhn Modulo-10 Check Digit (GS1 Standard)
// ============================================================================

/**
 * Calculates GS1 Modulo-10 check digit for a string of numeric digits.
 * Weights alternate 3 and 1 from right to left.
 */
export function calculateGs1CheckDigit(digits: string): number {
  if (!/^\d+$/.test(digits)) {
    throw new EdiDomainError('INVALID_GS1_DIGITS', `Input must contain only numeric digits: ${digits}`);
  }

  let sum = 0;
  let multiplier = 3;

  for (let i = digits.length - 1; i >= 0; i--) {
    const char = digits[i];
    if (!char) continue;
    const digit = parseInt(char, 10);
    sum += digit * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Generates an 18-digit Serial Shipping Container Code (SSCC-18).
 * Structure: 1 digit extension + GS1 Company Prefix + Serial Reference (total 17 digits) + 1 check digit.
 */
export function generateSscc18(
  extensionDigit: string,
  gs1CompanyPrefix: string,
  serialReference: string,
): string {
  const ext = extensionDigit.trim();
  const prefix = gs1CompanyPrefix.trim();
  const serial = serialReference.trim();

  if (ext.length !== 1 || !/^\d$/.test(ext)) {
    throw new EdiDomainError('INVALID_EXTENSION_DIGIT', 'Extension digit must be exactly 1 numeric digit.');
  }

  const payload17 = `${ext}${prefix}${serial}`;
  if (payload17.length !== 17 || !/^\d{17}$/.test(payload17)) {
    throw new EdiDomainError(
      'INVALID_SSCC_PAYLOAD_LENGTH',
      `Extension digit + Company prefix + Serial reference must total exactly 17 digits. Got ${payload17.length} digits.`,
    );
  }

  const checkDigit = calculateGs1CheckDigit(payload17);
  return `${payload17}${checkDigit}`;
}

/**
 * Validates whether an SSCC-18 barcode meets GS1 length and Modulo-10 check digit rules.
 */
export function validateSscc18(sscc18: string): boolean {
  const clean = sscc18.trim();
  if (clean.length !== 18 || !/^\d{18}$/.test(clean)) {
    return false;
  }
  const payload17 = clean.slice(0, 17);
  const expectedCheckDigit = calculateGs1CheckDigit(payload17);
  const checkChar = clean[17];
  if (!checkChar) return false;
  const actualCheckDigit = parseInt(checkChar, 10);
  return expectedCheckDigit === actualCheckDigit;
}

// ============================================================================
// Segment Tokenizer
// ============================================================================

/**
 * Splits raw EDI text into segments and elements according to specified delimiters.
 */
export function tokenizeEdiSegments(
  rawContent: string,
  segmentDelimiter = '~',
  elementDelimiter = '*',
): string[][] {
  if (!rawContent || !rawContent.trim()) {
    return [];
  }

  const rawSegments = rawContent.replace(/\r?\n/g, '').split(segmentDelimiter);

  const parsedSegments: string[][] = [];
  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    if (trimmed.length > 0) {
      parsedSegments.push(trimmed.split(elementDelimiter));
    }
  }

  return parsedSegments;
}

// ============================================================================
// ANSI X12 850 (Purchase Order) Parser
// ============================================================================

export function parseX12_850(rawOrSegments: string | string[][]): EdiPurchaseOrder {
  const segments =
    typeof rawOrSegments === 'string'
      ? tokenizeEdiSegments(rawOrSegments, '~', '*')
      : rawOrSegments;

  let poNumber = '';
  let poDate = '';
  let currency = 'USD';
  let buyerName = '';
  let buyerId = '';
  let supplierId: string | null = null;
  const lines: EdiPurchaseOrderLine[] = [];

  for (const seg of segments) {
    const segId = seg[0]?.toUpperCase();

    if (segId === 'BEG') {
      poNumber = seg[3] || '';
      poDate = seg[5] || '';
    }

    if (segId === 'CUR') {
      currency = seg[2] || 'USD';
    }

    if (segId === 'N1') {
      const entity = seg[1]?.toUpperCase();
      if (entity === 'BY' || entity === 'OB') {
        buyerName = seg[2] || '';
        buyerId = seg[4] || buyerName;
      } else if (entity === 'SE' || entity === 'SU') {
        supplierId = seg[4] || seg[2] || null;
      }
    }

    if (segId === 'PO1') {
      const lineNo = seg[1] || `${lines.length + 1}`;
      const qty = parseInt(seg[2] || '0', 10);
      const uom = seg[3] || 'EA';
      const unitPriceStr = seg[4] || '0';
      const unitPriceMinor = parseDecimalToMinor(unitPriceStr);

      let sku = '';
      let gtinUpc: string | null = null;

      for (let i = 6; i < seg.length; i += 2) {
        const qualifier = seg[i]?.toUpperCase();
        const value = seg[i + 1] || '';
        if (qualifier === 'IN' || qualifier === 'VP' || qualifier === 'VN') {
          if (!sku) sku = value;
        } else if (qualifier === 'UP' || qualifier === 'EN' || qualifier === 'UK') {
          gtinUpc = value;
        }
      }

      if (!sku) {
        sku = seg[7] || `ITEM-${lineNo}`;
      }

      lines.push({
        line_number: lineNo,
        sku,
        gtin_upc: gtinUpc,
        description: `Line item ${lineNo} SKU ${sku}`,
        quantity: qty,
        unit_price_minor: unitPriceMinor.toString(),
        uom,
      });
    }
  }

  if (!poNumber) {
    throw new EdiDomainError('MISSING_PO_NUMBER', 'EDI 850 document missing BEG03 PO number.');
  }

  let totalAmountMinor = 0n;
  for (const l of lines) {
    totalAmountMinor += BigInt(l.quantity) * BigInt(l.unit_price_minor);
  }

  return {
    po_number: poNumber,
    po_date: poDate,
    buyer_name: buyerName || 'Enterprise Buyer',
    buyer_id: buyerId || 'BUYER-01',
    supplier_id: supplierId,
    currency,
    total_amount_minor: totalAmountMinor.toString(),
    lines,
  };
}

// ============================================================================
// ANSI X12 855 (Purchase Order Acknowledgment) Serializer
// ============================================================================

export function generateX12_855(
  envelope: EdiInterchangeEnvelope,
  ack: EdiPurchaseOrderAck,
): string {
  const segs: string[] = [];
  const ctrl = envelope.control_number.padStart(9, '0');
  const d = envelope.date || new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const t = envelope.time || '1200';

  segs.push(`ISA*00*          *00*          *${envelope.sender_qualifier.padEnd(2)}*${envelope.sender_id.padEnd(15)}*${envelope.receiver_qualifier.padEnd(2)}*${envelope.receiver_id.padEnd(15)}*${d}*${t}*U*00401*${ctrl}*0*P*>`);
  segs.push(`GS*PR*${envelope.sender_id}*${envelope.receiver_id}*${envelope.date || '20261012'}*${t}*1*X*004010`);
  segs.push(`ST*855*${ctrl}`);

  const ackTypeCode = ack.ack_type === 'ACCEPTED' ? 'AC' : ack.ack_type === 'REJECTED' ? 'RD' : 'AD';
  segs.push(`BAK*00*${ackTypeCode}*${ack.po_number}*${ack.ack_date.replace(/-/g, '')}`);

  for (const line of ack.lines) {
    const priceDec = formatMinorToDecimal(line.unit_price_minor);
    segs.push(`PO1*${line.line_number}*${line.quantity_acknowledged}*EA*${priceDec}**VP*${line.sku}`);
    segs.push(`ACK*${line.status}*${line.quantity_acknowledged}*EA`);
  }

  segs.push(`CTT*${ack.lines.length}`);
  const setSegmentsCount = segs.length - 1;
  segs.push(`SE*${setSegmentsCount}*${ctrl}`);
  segs.push(`GE*1*1`);
  segs.push(`IEA*1*${ctrl}`);

  return segs.join('~\n') + '~\n';
}

// ============================================================================
// ANSI X12 856 (Advance Ship Notice / ASN) Serializer
// ============================================================================

export function generateX12_856(
  envelope: EdiInterchangeEnvelope,
  asn: EdiAdvanceShipNotice,
): string {
  const segs: string[] = [];
  const ctrl = envelope.control_number.padStart(9, '0');
  const d = envelope.date || new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const t = envelope.time || '1200';

  segs.push(`ISA*00*          *00*          *${envelope.sender_qualifier.padEnd(2)}*${envelope.sender_id.padEnd(15)}*${envelope.receiver_qualifier.padEnd(2)}*${envelope.receiver_id.padEnd(15)}*${d}*${t}*U*00401*${ctrl}*0*P*>`);
  segs.push(`GS*SH*${envelope.sender_id}*${envelope.receiver_id}*${envelope.date || '20261012'}*${t}*1*X*004010`);
  segs.push(`ST*856*${ctrl}`);

  segs.push(`BSN*00*${asn.shipment_id}*${asn.ship_date.replace(/-/g, '')}*${t}`);
  segs.push(`DTM*011*${asn.ship_date.replace(/-/g, '')}`);

  let hlCounter = 1;
  const shipmentHl = hlCounter;
  segs.push(`HL*${shipmentHl}**S`);
  segs.push(`TD5**2*${asn.carrier_code}*M`);
  segs.push(`REF*BM*${asn.bol_number}`);
  segs.push(`REF*CN*${asn.tracking_number}`);

  for (const pallet of asn.pallets) {
    hlCounter++;
    const palletHl = hlCounter;
    segs.push(`HL*${palletHl}*${shipmentHl}*T`);
    segs.push(`MAN*GM*${pallet.sscc_18}`);

    if (pallet.tare_weight_grams) {
      segs.push(`MEW*WT*${pallet.tare_weight_grams}*GR`);
    }

    for (const item of pallet.items) {
      hlCounter++;
      const itemHl = hlCounter;
      segs.push(`HL*${itemHl}*${palletHl}*I`);
      segs.push(`LIN**VP*${item.sku}`);
      segs.push(`SN1**${item.quantity}*${item.uom}`);

      if (item.lot_number) {
        segs.push(`REF*LT*${item.lot_number}`);
      }
      if (item.serial_numbers && item.serial_numbers.length > 0) {
        for (const sn of item.serial_numbers) {
          segs.push(`REF*SE*${sn}`);
        }
      }
    }
  }

  segs.push(`CTT*${hlCounter}`);
  const setSegmentsCount = segs.length - 1;
  segs.push(`SE*${setSegmentsCount}*${ctrl}`);
  segs.push(`GE*1*1`);
  segs.push(`IEA*1*${ctrl}`);

  return segs.join('~\n') + '~\n';
}

// ============================================================================
// ANSI X12 810 (Commercial Invoice) Serializer
// ============================================================================

export function generateX12_810(
  envelope: EdiInterchangeEnvelope,
  invoice: EdiInvoice,
): string {
  const segs: string[] = [];
  const ctrl = envelope.control_number.padStart(9, '0');
  const d = envelope.date || new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const t = envelope.time || '1200';

  segs.push(`ISA*00*          *00*          *${envelope.sender_qualifier.padEnd(2)}*${envelope.sender_id.padEnd(15)}*${envelope.receiver_qualifier.padEnd(2)}*${envelope.receiver_id.padEnd(15)}*${d}*${t}*U*00401*${ctrl}*0*P*>`);
  segs.push(`GS*IN*${envelope.sender_id}*${envelope.receiver_id}*${envelope.date || '20261012'}*${t}*1*X*004010`);
  segs.push(`ST*810*${ctrl}`);

  segs.push(`BIG*${invoice.invoice_date.replace(/-/g, '')}*${invoice.invoice_number}**${invoice.po_number}`);
  segs.push(`CUR*SE*${invoice.currency}`);

  for (const line of invoice.lines) {
    const unitPriceDec = formatMinorToDecimal(line.unit_price_minor);
    segs.push(`IT1*${line.line_number}*${line.quantity}*EA*${unitPriceDec}**VP*${line.sku}`);
  }

  segs.push(`TDS*${invoice.total_minor}`);

  if (BigInt(invoice.tax_minor) > 0n) {
    const taxDec = formatMinorToDecimal(invoice.tax_minor);
    segs.push(`TXI*TX*${taxDec}`);
  }

  segs.push(`CTT*${invoice.lines.length}`);
  const setSegmentsCount = segs.length - 1;
  segs.push(`SE*${setSegmentsCount}*${ctrl}`);
  segs.push(`GE*1*1`);
  segs.push(`IEA*1*${ctrl}`);

  return segs.join('~\n') + '~\n';
}

// ============================================================================
// ANSI X12 997 (Functional Acknowledgment) Parser & Serializer
// ============================================================================

export function parseX12_997(rawOrSegments: string | string[][]): EdiFunctionalAck {
  const segments =
    typeof rawOrSegments === 'string'
      ? tokenizeEdiSegments(rawOrSegments, '~', '*')
      : rawOrSegments;

  let origCtrl = '';
  let groupCtrl = '';
  let status: 'A' | 'R' | 'E' = 'A';
  const errorCodes: string[] = [];

  for (const seg of segments) {
    const segId = seg[0]?.toUpperCase();

    if (segId === 'AK1') {
      groupCtrl = seg[2] || '';
    }

    if (segId === 'AK2') {
      origCtrl = seg[2] || '';
    }

    if (segId === 'AK5') {
      const code = seg[1]?.toUpperCase();
      if (code === 'R') status = 'R';
      else if (code === 'E') status = 'E';
      else status = 'A';

      for (let i = 2; i < seg.length; i++) {
        const err = seg[i];
        if (err) errorCodes.push(err);
      }
    }
  }

  return {
    original_control_number: origCtrl || groupCtrl,
    group_control_number: groupCtrl,
    status,
    error_codes: errorCodes.length > 0 ? errorCodes : undefined,
  };
}

export function generateX12_997(
  envelope: EdiInterchangeEnvelope,
  ack: EdiFunctionalAck,
): string {
  const segs: string[] = [];
  const ctrl = envelope.control_number.padStart(9, '0');
  const d = envelope.date || new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const t = envelope.time || '1200';

  segs.push(`ISA*00*          *00*          *${envelope.sender_qualifier.padEnd(2)}*${envelope.sender_id.padEnd(15)}*${envelope.receiver_qualifier.padEnd(2)}*${envelope.receiver_id.padEnd(15)}*${d}*${t}*U*00401*${ctrl}*0*P*>`);
  segs.push(`GS*FA*${envelope.sender_id}*${envelope.receiver_id}*${envelope.date || '20261012'}*${t}*1*X*004010`);
  segs.push(`ST*997*${ctrl}`);

  segs.push(`AK1*PO*${ack.group_control_number}`);
  segs.push(`AK2*850*${ack.original_control_number}`);
  segs.push(`AK5*${ack.status}`);
  segs.push(`AK9*${ack.status}*1*1*1`);

  const setSegmentsCount = segs.length - 1;
  segs.push(`SE*${setSegmentsCount}*${ctrl}`);
  segs.push(`GE*1*1`);
  segs.push(`IEA*1*${ctrl}`);

  return segs.join('~\n') + '~\n';
}

// ============================================================================
// UN/EDIFACT (ORDERS & DESADV) Engine
// ============================================================================

export function parseEdifact_ORDERS(rawContent: string): EdiPurchaseOrder {
  const clean = rawContent.replace(/\r?\n/g, '').trim();
  const rawSegments = clean.split("'").map((s) => s.trim()).filter((s) => s.length > 0);

  let poNumber = '';
  let poDate = '';
  let buyerName = '';
  let buyerId = '';
  const currency = 'USD';
  const lines: EdiPurchaseOrderLine[] = [];

  let currentLineNo = '';
  let currentSku = '';
  let currentQty = 0;
  let currentUom = 'PCE';
  let currentUnitPriceMinor = 0n;

  for (const seg of rawSegments) {
    const elements = seg.split('+');
    const tag = elements[0]?.toUpperCase();

    if (tag === 'BGM') {
      poNumber = elements[2] || '';
    }

    if (tag === 'DTM') {
      const comp = (elements[1] || '').split(':');
      if (comp[0] === '137') {
        poDate = comp[1] || '';
      }
    }

    if (tag === 'NAD') {
      const role = elements[1]?.toUpperCase();
      if (role === 'BY') {
        const idComp = (elements[2] || '').split(':');
        buyerId = idComp[0] || 'BUYER';
        buyerName = elements[4] || buyerId;
      }
    }

    if (tag === 'LIN') {
      if (currentLineNo && currentSku) {
        lines.push({
          line_number: currentLineNo,
          sku: currentSku,
          description: `Line item ${currentLineNo} SKU ${currentSku}`,
          quantity: currentQty,
          unit_price_minor: currentUnitPriceMinor.toString(),
          uom: currentUom,
        });
      }

      currentLineNo = elements[1] || `${lines.length + 1}`;
      const itemComp = (elements[3] || '').split(':');
      currentSku = itemComp[0] || `ITEM-${currentLineNo}`;
      currentQty = 1;
      currentUom = 'PCE';
      currentUnitPriceMinor = 0n;
    }

    if (tag === 'QTY') {
      const qtyComp = (elements[1] || '').split(':');
      currentQty = parseInt(qtyComp[1] || '1', 10);
      currentUom = qtyComp[2] || 'PCE';
    }

    if (tag === 'PRI') {
      const priComp = (elements[1] || '').split(':');
      const priceStr = priComp[1] || '0';
      currentUnitPriceMinor = parseDecimalToMinor(priceStr);
    }
  }

  if (currentLineNo && currentSku) {
    lines.push({
      line_number: currentLineNo,
      sku: currentSku,
      description: `Line item ${currentLineNo} SKU ${currentSku}`,
      quantity: currentQty,
      unit_price_minor: currentUnitPriceMinor.toString(),
      uom: currentUom,
    });
  }

  if (!poNumber) {
    throw new EdiDomainError('MISSING_EDIFACT_PO_NUMBER', 'UN/EDIFACT ORDERS missing BGM PO number.');
  }

  let totalMinor = 0n;
  for (const l of lines) {
    totalMinor += BigInt(l.quantity) * BigInt(l.unit_price_minor);
  }

  return {
    po_number: poNumber,
    po_date: poDate,
    buyer_name: buyerName || 'UN/EDIFACT Buyer',
    buyer_id: buyerId || 'BUYER-01',
    currency,
    total_amount_minor: totalMinor.toString(),
    lines,
  };
}

export function generateEdifact_DESADV(
  envelope: EdiInterchangeEnvelope,
  asn: EdiAdvanceShipNotice,
): string {
  const segs: string[] = [];
  const ctrl = envelope.control_number;
  const d = envelope.date || new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  const t = envelope.time || '1200';

  segs.push(`UNB+UNOC:3+${envelope.sender_id}:${envelope.sender_qualifier}+${envelope.receiver_id}:${envelope.receiver_qualifier}+${d}:${t}+${ctrl}`);
  segs.push(`UNH+${ctrl}+DESADV:D:96A:UN`);
  segs.push(`BGM+351+${asn.shipment_id}+9`);
  segs.push(`DTM+137:${asn.ship_date.replace(/-/g, '')}:102`);
  segs.push(`RFF+BM:${asn.bol_number}`);
  segs.push(`RFF+CN:${asn.tracking_number}`);
  segs.push(`TDT+20++31+${asn.carrier_code}`);

  let itemCounter = 1;
  for (const pallet of asn.pallets) {
    segs.push(`CPS+${itemCounter}`);
    segs.push(`PAC+1++PK`);
    segs.push(`GIN+BJ+${pallet.sscc_18}`);

    for (const item of pallet.items) {
      itemCounter++;
      segs.push(`LIN+${itemCounter}++${item.sku}:IN`);
      segs.push(`QTY+12:${item.quantity}:${item.uom}`);
    }
  }

  const untCount = segs.length;
  segs.push(`UNT+${untCount}+${ctrl}`);
  segs.push(`UNZ+1+${ctrl}`);

  return segs.join("'\n") + "'\n";
}
