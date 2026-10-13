/**
 * ============================================================================
 * STOKROVA — Hardware Peripherals, Barcode Scanning & ESC/POS Domain Engine
 * Phase 14: Mobile Offline Scanner, Hardware Peripherals & ESC/POS Engine
 *
 * Golden Rules Compliance:
 * - Rule 7: Never treat receipts as financial truth (reprints are strictly non-financial duplicates)
 * - Rule 22: Decouple domain logic from UI & runtime (Zero node: imports, zero external dependencies)
 * - Rule 26: Pure integer arithmetic (weights in integer grams, minor units for currency)
 * ============================================================================
 */

export type HardwareDeviceType =
  | 'PRINTER_THERMAL'
  | 'SCALE_DIGITAL'
  | 'BARCODE_SCANNER'
  | 'POLE_DISPLAY'
  | 'CASH_DRAWER'
  | 'PAYMENT_TERMINAL';

export type HardwareDriverProtocol =
  | 'ESCPOS_GENERIC'
  | 'STAR_PRNT'
  | 'EPSON_EPOS'
  | 'TOLEDO_8217'
  | 'NCI_SERIAL'
  | 'CAS_SERIAL'
  | 'ZEBRA_DATAWEDGE'
  | 'GENERIC_HID_SCANNER';

export type WeightScaleStatus =
  | 'STABLE'
  | 'MOTION'
  | 'OVER_CAPACITY'
  | 'UNDER_CAPACITY'
  | 'ZERO';

export interface WeightReading {
  status: WeightScaleStatus;
  net_weight_grams: number;
  tare_weight_grams: number;
  gross_weight_grams: number;
  unit: 'g' | 'kg' | 'lb' | 'oz';
  is_over_capacity: boolean;
  is_motion: boolean;
  is_zero: boolean;
  timestamp: string;
}

export type BarcodeSymbology =
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'CODE_128'
  | 'CODE_39'
  | 'QR_CODE'
  | 'DATA_MATRIX'
  | 'UNKNOWN';

export interface Gs1ParsedPayload {
  raw_barcode: string;
  gtin_14?: string;
  batch_lot?: string;
  expiration_date_iso?: string;
  serial_number?: string;
  net_weight_grams?: number;
  application_identifiers: Record<string, string>;
}

export type ScanIntentType =
  | 'GTIN_PRODUCT'
  | 'BATCH_TRACKED_ITEM'
  | 'SERIAL_NUMBER'
  | 'BIN_LOCATION'
  | 'ORDER_BARCODE'
  | 'PAYMENT_CODE'
  | 'UNKNOWN';

export interface ScanResolutionResult {
  raw_input: string;
  symbology: BarcodeSymbology;
  is_gs1_composite: boolean;
  intent: ScanIntentType;
  parsed_gs1?: Gs1ParsedPayload;
  identifier: string;
}

export interface ReceiptCompileOptions {
  paper_width_mm?: 58 | 80;
  columns?: number;
  protocol?: 'ESCPOS_GENERIC' | 'STAR_PRNT';
  is_reprint?: boolean;
}

export interface ReceiptCompileResult {
  escpos_bytes_base64: string;
  byte_length: number;
  plaintext_preview: string;
  line_count: number;
  has_cut: boolean;
  has_drawer_kick: boolean;
  is_duplicate_reprint: boolean;
}

// ============================================================================
// Runtime-Agnostic Byte & Base64 Helpers (Pure TypeScript)
// ============================================================================

export function stringToUtf8Bytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      i++;
      const nextCode = i < str.length ? str.charCodeAt(i) : 0;
      const surrogate = 0x10000 + (((code & 0x3ff) << 10) | (nextCode & 0x3ff));
      bytes.push(
        0xf0 | (surrogate >> 18),
        0x80 | ((surrogate >> 12) & 0x3f),
        0x80 | ((surrogate >> 6) & 0x3f),
        0x80 | (surrogate & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = i + 1 < len ? (bytes[i + 1] ?? 0) : null;
    const b2 = i + 2 < len ? (bytes[i + 2] ?? 0) : null;

    result += B64_CHARS.charAt(b0 >> 2);
    result += B64_CHARS.charAt(((b0 & 3) << 4) | (b1 !== null ? b1 >> 4 : 0));
    result += b1 !== null ? B64_CHARS.charAt(((b1 & 15) << 2) | (b2 !== null ? b2 >> 6 : 0)) : '=';
    result += b2 !== null ? B64_CHARS.charAt(b2 & 63) : '=';
  }
  return result;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '').replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < clean.length; i++) {
    const char = clean.charAt(i);
    const charIdx = B64_CHARS.indexOf(char);
    if (charIdx === -1) continue;

    buffer = (buffer << 6) | charIdx;
    bitsCollected += 6;

    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      bytes.push((buffer >> bitsCollected) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

// ============================================================================
// 1. ESC/POS Byte Command Generator
// ============================================================================

export class EscPosBuilder {
  private chunks: Uint8Array[] = [];

  init(): this {
    this.chunks.push(new Uint8Array([0x1b, 0x40])); // ESC @
    return this;
  }

  text(content: string): this {
    this.chunks.push(stringToUtf8Bytes(content));
    return this;
  }

  line(content = ''): this {
    if (content) {
      this.text(content);
    }
    this.chunks.push(new Uint8Array([0x0a])); // LF
    return this;
  }

  feed(lines = 1): this {
    if (lines <= 0) return this;
    if (lines === 1) {
      this.chunks.push(new Uint8Array([0x0a]));
    } else {
      this.chunks.push(new Uint8Array([0x1b, 0x64, Math.min(255, lines)])); // ESC d n
    }
    return this;
  }

  bold(enable: boolean): this {
    this.chunks.push(new Uint8Array([0x1b, 0x45, enable ? 0x01 : 0x00])); // ESC E n
    return this;
  }

  underline(enable: boolean): this {
    this.chunks.push(new Uint8Array([0x1b, 0x2d, enable ? 0x01 : 0x00])); // ESC - n
    return this;
  }

  invert(enable: boolean): this {
    this.chunks.push(new Uint8Array([0x1d, 0x42, enable ? 0x01 : 0x00])); // GS B n
    return this;
  }

  doubleSize(enable: boolean): this {
    this.chunks.push(new Uint8Array([0x1d, 0x21, enable ? 0x11 : 0x00])); // GS ! n
    return this;
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    const code = alignment === 'center' ? 0x01 : alignment === 'right' ? 0x02 : 0x00;
    this.chunks.push(new Uint8Array([0x1b, 0x61, code])); // ESC a n
    return this;
  }

  cut(mode: 'full' | 'partial' = 'partial'): this {
    const code = mode === 'full' ? 0x00 : 0x01;
    this.chunks.push(new Uint8Array([0x1d, 0x56, code]));
    return this;
  }

  kickDrawer(pin: 2 | 5 = 2, t1Ms = 50, t2Ms = 100): this {
    const m = pin === 2 ? 0x00 : 0x01;
    const t1 = Math.min(255, Math.max(1, Math.floor(t1Ms / 2)));
    const t2 = Math.min(255, Math.max(1, Math.floor(t2Ms / 2)));
    this.chunks.push(new Uint8Array([0x1b, 0x70, m, t1, t2]));
    return this;
  }

  barcode128(data: string, height = 64): this {
    const cleanData = data.trim();
    if (!cleanData) return this;
    const dataBytes = stringToUtf8Bytes(cleanData);

    this.chunks.push(new Uint8Array([0x1d, 0x68, Math.min(255, height)])); // GS h n
    this.chunks.push(new Uint8Array([0x1d, 0x77, 0x02])); // GS w n
    this.chunks.push(new Uint8Array([0x1d, 0x48, 0x02])); // GS H 2 (HRI below)
    this.chunks.push(new Uint8Array([0x1d, 0x6b, 73, dataBytes.length]));
    this.chunks.push(dataBytes);
    return this;
  }

  qrcode(data: string, size = 6): this {
    const cleanData = data.trim();
    if (!cleanData) return this;
    const dataBytes = stringToUtf8Bytes(cleanData);
    const len = dataBytes.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;

    // Model 2
    this.chunks.push(new Uint8Array([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));
    // Size
    this.chunks.push(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, size))]));
    // Error correction Level M (49)
    this.chunks.push(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 49]));
    // Store data
    this.chunks.push(new Uint8Array([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]));
    this.chunks.push(dataBytes);
    // Print QR
    this.chunks.push(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));
    return this;
  }

  build(): Uint8Array {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.byteLength;
    }
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return combined;
  }

  toBase64(): string {
    return bytesToBase64(this.build());
  }
}

// ============================================================================
// 2. Star Micronics Line Mode Builder
// ============================================================================

export class StarPrntBuilder {
  private chunks: Uint8Array[] = [];

  init(): this {
    this.chunks.push(new Uint8Array([0x1b, 0x40])); // ESC @
    return this;
  }

  text(content: string): this {
    this.chunks.push(stringToUtf8Bytes(content));
    return this;
  }

  line(content = ''): this {
    if (content) {
      this.text(content);
    }
    this.chunks.push(new Uint8Array([0x0a])); // LF
    return this;
  }

  cut(): this {
    this.chunks.push(new Uint8Array([0x1b, 0x64, 0x02]));
    return this;
  }

  kickDrawer(): this {
    this.chunks.push(new Uint8Array([0x07])); // BEL
    return this;
  }

  build(): Uint8Array {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.byteLength;
    }
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return combined;
  }
}

// ============================================================================
// 3. Digital Weight Scale Protocol Decoders (Rule 26: Pure Integer Grams)
// ============================================================================

export function decodeToledoScaleFrame(raw: string): WeightReading {
  const clean = raw.trim();
  const now = new Date().toISOString();

  let isMotion = false;
  let isOver = false;

  if (clean.includes('US')) {
    isMotion = true;
  } else if (clean.includes('OL')) {
    isOver = true;
  }

  const weightMatch = clean.match(/([+-]?\d+(?:\.\d+)?)/);
  const rawNumStr = weightMatch?.[1] ?? '0';
  const weightFloat = parseFloat(rawNumStr);

  let grams = Math.round(weightFloat * 1000);
  if (clean.toLowerCase().includes('lb')) {
    grams = Math.round(weightFloat * 453.59237);
  } else if (clean.toLowerCase().includes('oz')) {
    grams = Math.round(weightFloat * 28.3495);
  }

  const isZero = grams === 0;

  let status: WeightScaleStatus = 'STABLE';
  if (isOver) {
    status = 'OVER_CAPACITY';
  } else if (isMotion) {
    status = 'MOTION';
  } else if (isZero) {
    status = 'ZERO';
  }

  return {
    status,
    net_weight_grams: grams,
    tare_weight_grams: 0,
    gross_weight_grams: grams,
    unit: 'g',
    is_over_capacity: isOver,
    is_motion: isMotion,
    is_zero: isZero,
    timestamp: now,
  };
}

export function decodeNciScaleFrame(raw: string): WeightReading {
  const clean = raw.trim();
  const now = new Date().toISOString();

  const isMotion = clean.includes('M') || clean.includes('?');
  const isOver = clean.includes('O') || clean.includes('L');
  const isZero = clean.includes('Z');

  const match = clean.match(/([+-]?\d+(?:\.\d+)?)/);
  const weightFloat = match?.[1] ? parseFloat(match[1]) : 0;
  const grams = Math.round(weightFloat * 1000);

  let status: WeightScaleStatus = 'STABLE';
  if (isOver) {
    status = 'OVER_CAPACITY';
  } else if (isMotion) {
    status = 'MOTION';
  } else if (grams === 0 || isZero) {
    status = 'ZERO';
  }

  return {
    status,
    net_weight_grams: grams,
    tare_weight_grams: 0,
    gross_weight_grams: grams,
    unit: 'g',
    is_over_capacity: isOver,
    is_motion: isMotion,
    is_zero: grams === 0,
    timestamp: now,
  };
}

export function decodeCasScaleFrame(raw: string): WeightReading {
  return decodeToledoScaleFrame(raw);
}

// ============================================================================
// 4. Barcode Verification & GS1-128 Engine
// ============================================================================

export function validateModulo10CheckDigit(barcode: string): boolean {
  const digits = barcode.trim();
  if (!/^\d+$/.test(digits) || digits.length < 8) {
    return false;
  }

  const checkDigit = parseInt(digits.slice(-1), 10);
  const payload = digits.slice(0, -1);

  let sum = 0;
  let weight = 3;
  for (let i = payload.length - 1; i >= 0; i--) {
    const char = payload[i] ?? '0';
    sum += parseInt(char, 10) * weight;
    weight = weight === 3 ? 1 : 3;
  }

  const remainder = sum % 10;
  const expectedCheck = remainder === 0 ? 0 : 10 - remainder;
  return checkDigit === expectedCheck;
}

export function parseGs1Barcode(rawBarcode: string): Gs1ParsedPayload {
  const raw = rawBarcode.trim();
  const ais: Record<string, string> = {};

  if (raw.includes('(') && raw.includes(')')) {
    const regex = /\((\d{2,4})\)([^()]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
      const ai = match[1];
      const val = match[2];
      if (ai && val) {
        ais[ai] = val.trim();
      }
    }
  } else {
    const cleanRaw = raw.replace(/\x1D/g, '^');
    const segments = cleanRaw.split('^');

    for (const segment of segments) {
      let cursor = 0;
      while (cursor < segment.length) {
        if (segment.startsWith('01', cursor) && segment.length >= cursor + 16) {
          ais['01'] = segment.substring(cursor + 2, cursor + 16);
          cursor += 16;
        } else if (segment.startsWith('17', cursor) && segment.length >= cursor + 8) {
          ais['17'] = segment.substring(cursor + 2, cursor + 8);
          cursor += 8;
        } else if (segment.startsWith('10', cursor)) {
          ais['10'] = segment.substring(cursor + 2);
          cursor = segment.length;
        } else if (segment.startsWith('21', cursor)) {
          ais['21'] = segment.substring(cursor + 2);
          cursor = segment.length;
        } else if (segment.startsWith('310', cursor) && segment.length >= cursor + 10) {
          const aiFull = segment.substring(cursor, cursor + 4);
          ais[aiFull] = segment.substring(cursor + 4, cursor + 10);
          cursor += 10;
        } else {
          cursor++;
        }
      }
    }
  }

  let expirationDateIso: string | undefined;
  const ai17 = ais['17'];
  if (ai17 && ai17.length === 6) {
    const yy = ai17.substring(0, 2);
    const mm = ai17.substring(2, 4);
    const dd = ai17.substring(4, 6);
    expirationDateIso = `20${yy}-${mm}-${dd}`;
  }

  let netWeightGrams: number | undefined;
  for (const key of Object.keys(ais)) {
    if (key.startsWith('310') && key[3] !== undefined) {
      const decimals = parseInt(key[3], 10) || 0;
      const rawVal = parseInt(ais[key] ?? '0', 10) || 0;
      const kg = rawVal / Math.pow(10, decimals);
      netWeightGrams = Math.round(kg * 1000);
      break;
    }
  }

  return {
    raw_barcode: raw,
    gtin_14: ais['01'],
    batch_lot: ais['10'],
    expiration_date_iso: expirationDateIso,
    serial_number: ais['21'],
    net_weight_grams: netWeightGrams,
    application_identifiers: ais,
  };
}

export function classifyBarcodeIntent(rawInput: string): ScanResolutionResult {
  const input = rawInput.trim();

  if (input.includes('(01)') || input.includes('(10)') || input.includes('(21)') || input.includes('\x1D')) {
    const gs1 = parseGs1Barcode(input);
    let intent: ScanIntentType = 'GTIN_PRODUCT';
    if (gs1.serial_number) {
      intent = 'SERIAL_NUMBER';
    } else if (gs1.batch_lot) {
      intent = 'BATCH_TRACKED_ITEM';
    }
    return {
      raw_input: input,
      symbology: 'CODE_128',
      is_gs1_composite: true,
      intent,
      parsed_gs1: gs1,
      identifier: gs1.gtin_14 || gs1.serial_number || gs1.batch_lot || input,
    };
  }

  if (/^(LOC|BIN|RACK|AISLE)-/i.test(input)) {
    return {
      raw_input: input,
      symbology: 'CODE_128',
      is_gs1_composite: false,
      intent: 'BIN_LOCATION',
      identifier: input.toUpperCase(),
    };
  }

  if (/^(ORD|INV|PO|SO|RET|MO)-/i.test(input)) {
    return {
      raw_input: input,
      symbology: 'CODE_128',
      is_gs1_composite: false,
      intent: 'ORDER_BARCODE',
      identifier: input.toUpperCase(),
    };
  }

  if (/^\d{8}$/.test(input) && validateModulo10CheckDigit(input)) {
    return {
      raw_input: input,
      symbology: 'EAN_8',
      is_gs1_composite: false,
      intent: 'GTIN_PRODUCT',
      identifier: input,
    };
  }
  if (/^\d{12}$/.test(input) && validateModulo10CheckDigit(input)) {
    return {
      raw_input: input,
      symbology: 'UPC_A',
      is_gs1_composite: false,
      intent: 'GTIN_PRODUCT',
      identifier: input,
    };
  }
  if (/^\d{13}$/.test(input) && validateModulo10CheckDigit(input)) {
    return {
      raw_input: input,
      symbology: 'EAN_13',
      is_gs1_composite: false,
      intent: 'GTIN_PRODUCT',
      identifier: input,
    };
  }

  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('stokrova://')) {
    return {
      raw_input: input,
      symbology: 'QR_CODE',
      is_gs1_composite: false,
      intent: 'PAYMENT_CODE',
      identifier: input,
    };
  }

  return {
    raw_input: input,
    symbology: 'CODE_128',
    is_gs1_composite: false,
    intent: 'GTIN_PRODUCT',
    identifier: input,
  };
}

// ============================================================================
// 5. Declarative Thermal Receipt Markup Language Compiler (Rule 7)
// ============================================================================

export function formatMinorUnitCurrency(minorStr: string | number, symbol = '$'): string {
  const val = BigInt(minorStr.toString() || '0');
  const isNegative = val < 0n;
  const abs = isNegative ? -val : val;
  const major = abs / 100n;
  const minor = abs % 100n;
  const minorPadded = minor < 10n ? `0${minor}` : minor.toString();
  return `${isNegative ? '-' : ''}${symbol}${major}.${minorPadded}`;
}

export function formatJustifiedRow(left: string, right: string, width = 48): string {
  const l = left.trim();
  const r = right.trim();
  const spacesNeeded = width - l.length - r.length;
  if (spacesNeeded <= 0) {
    return `${l} ${r}`.substring(0, width);
  }
  return l + ' '.repeat(spacesNeeded) + r;
}

export function compileReceiptMarkup(
  markup: string,
  variables: Record<string, unknown> = {},
  options: ReceiptCompileOptions = {},
): ReceiptCompileResult {
  const width = options.columns ?? (options.paper_width_mm === 58 ? 32 : 48);
  const isReprint = options.is_reprint ?? false;

  let processed = markup;
  for (const [key, val] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processed = processed.replace(placeholder, String(val ?? ''));
  }

  const escpos = new EscPosBuilder().init();
  const plaintextLines: string[] = [];

  let hasCut = false;
  let hasDrawerKick = false;

  if (isReprint) {
    const bannerBorder = '*'.repeat(width);
    const bannerText = '*** DUPLICATE RECEIPT / REPRINT ***';
    const bannerImpact = '*** ZERO FINANCIAL IMPACT ***';

    escpos.align('center').bold(true).line(bannerBorder);
    escpos.line(bannerText);
    escpos.line(bannerImpact);
    escpos.line(bannerBorder).bold(false).feed(1);

    plaintextLines.push(bannerBorder);
    plaintextLines.push(bannerText);
    plaintextLines.push(bannerImpact);
    plaintextLines.push(bannerBorder);
  }

  const rawLines = processed.split(/\r?\n/);

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('<cut')) {
      hasCut = true;
      escpos.feed(3).cut('partial');
      plaintextLines.push('[--- PAPER CUT ---]');
      continue;
    }

    if (trimmed.startsWith('<cashdrawer')) {
      hasDrawerKick = true;
      escpos.kickDrawer(2);
      plaintextLines.push('[--- CASH DRAWER PULSE ---]');
      continue;
    }

    if (trimmed.startsWith('<divider')) {
      const charMatch = trimmed.match(/char="([^"]+)"/);
      const divChar = charMatch?.[1]?.[0] ?? '-';
      const div = divChar.repeat(width);
      escpos.align('left').line(div);
      plaintextLines.push(div);
      continue;
    }

    if (trimmed.startsWith('<row')) {
      const leftMatch = trimmed.match(/left="([^"]*)"/);
      const rightMatch = trimmed.match(/right="([^"]*)"/);
      const left = leftMatch?.[1] ?? '';
      const right = rightMatch?.[1] ?? '';
      const formatted = formatJustifiedRow(left, right, width);
      escpos.align('left').line(formatted);
      plaintextLines.push(formatted);
      continue;
    }

    if (trimmed.startsWith('<barcode')) {
      const valMatch = trimmed.match(/value="([^"]*)"/);
      const val = valMatch?.[1] ?? '';
      if (val) {
        escpos.align('center').barcode128(val).feed(1);
        plaintextLines.push(`[BARCODE 128: ${val}]`);
      }
      continue;
    }

    if (trimmed.startsWith('<qrcode')) {
      const valMatch = trimmed.match(/value="([^"]*)"/);
      const val = valMatch?.[1] ?? '';
      if (val) {
        escpos.align('center').qrcode(val).feed(1);
        plaintextLines.push(`[QR CODE: ${val}]`);
      }
      continue;
    }

    let textContent = trimmed
      .replace(/<\/?(?:receipt|header|totals|table)>/g, '')
      .trim();

    if (!textContent) continue;

    const isCenter = textContent.includes('<center>');
    const isBold = textContent.includes('<bold>');
    const isDouble = textContent.includes('<double>');

    textContent = textContent.replace(/<\/?(?:center|bold|double|left|right|line)>/g, '').trim();
    if (!textContent) continue;

    escpos.align(isCenter ? 'center' : 'left');
    if (isBold) escpos.bold(true);
    if (isDouble) escpos.doubleSize(true);

    escpos.line(textContent);

    if (isBold) escpos.bold(false);
    if (isDouble) escpos.doubleSize(false);

    plaintextLines.push(isCenter ? centerText(textContent, width) : textContent);
  }

  const bytes = escpos.build();

  return {
    escpos_bytes_base64: bytesToBase64(bytes),
    byte_length: bytes.byteLength,
    plaintext_preview: plaintextLines.join('\n'),
    line_count: plaintextLines.length,
    has_cut: hasCut,
    has_drawer_kick: hasDrawerKick,
    is_duplicate_reprint: isReprint,
  };
}

function centerText(text: string, width = 48): string {
  const clean = text.trim();
  if (clean.length >= width) return clean;
  const padding = Math.floor((width - clean.length) / 2);
  return ' '.repeat(padding) + clean;
}
