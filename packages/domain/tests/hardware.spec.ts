import { describe, it, expect } from 'vitest';
import {
  EscPosBuilder,
  StarPrntBuilder,
  decodeToledoScaleFrame,
  decodeNciScaleFrame,
  validateModulo10CheckDigit,
  parseGs1Barcode,
  classifyBarcodeIntent,
  formatMinorUnitCurrency,
  formatJustifiedRow,
  compileReceiptMarkup,
  bytesToBase64,
  base64ToBytes,
} from '../src/hardware.js';

describe('Hardware Peripherals, Barcode Scanning & ESC/POS Domain Engine (Phase 14)', () => {
  // ==========================================================================
  // 1. ESC/POS & Star Byte Builders
  // ==========================================================================
  describe('EscPosBuilder', () => {
    it('generates standard ESC/POS initialization and formatting byte sequences', () => {
      const builder = new EscPosBuilder()
        .init()
        .bold(true)
        .text('STOKROVA')
        .bold(false)
        .line()
        .align('center')
        .text('RECEIPT')
        .feed(2)
        .cut('partial')
        .kickDrawer(2, 50, 100);

      const bytes = builder.build();
      expect(bytes.length).toBeGreaterThan(15);

      // Verify init bytes: ESC @ (0x1B, 0x40)
      expect(bytes[0]).toBe(0x1b);
      expect(bytes[1]).toBe(0x40);

      // Verify bold on: ESC E 1 (0x1B, 0x45, 0x01)
      expect(bytes[2]).toBe(0x1b);
      expect(bytes[3]).toBe(0x45);
      expect(bytes[4]).toBe(0x01);
    });

    it('generates Code 128 barcode commands with HRI text', () => {
      const builder = new EscPosBuilder().barcode128('INV-2026-999');
      const bytes = builder.build();
      expect(bytes.length).toBeGreaterThan(10);
      // GS k 73 len bytes
      const b64 = builder.toBase64();
      expect(typeof b64).toBe('string');
      expect(b64.length).toBeGreaterThan(0);
    });

    it('generates QR code rasterization byte sequences', () => {
      const builder = new EscPosBuilder().qrcode('https://stokrova.com/verify/txn_123');
      const bytes = builder.build();
      expect(bytes.length).toBeGreaterThan(20);
    });

    it('performs runtime-agnostic base64 round-trip conversion', () => {
      const original = new Uint8Array([0, 1, 2, 255, 128, 64, 32, 16, 8, 4, 2, 1]);
      const b64 = bytesToBase64(original);
      const decoded = base64ToBytes(b64);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });

  describe('StarPrntBuilder', () => {
    it('generates Star Line Mode cut and cash drawer kick codes', () => {
      const builder = new StarPrntBuilder().init().line('STAR TEST').cut().kickDrawer();
      const bytes = builder.build();
      expect(bytes).toContain(0x07); // BEL for cash drawer
    });
  });

  // ==========================================================================
  // 2. Digital Weight Scale Protocol Decoders (Rule 26: Pure Integer Grams)
  // ==========================================================================
  describe('Scale Protocol Decoders', () => {
    it('decodes stable metric Toledo 8217 frame into pure integer grams', () => {
      const frame = 'ST,GS,  1.250kg\r\n';
      const reading = decodeToledoScaleFrame(frame);

      expect(reading.status).toBe('STABLE');
      expect(reading.net_weight_grams).toBe(1250);
      expect(reading.gross_weight_grams).toBe(1250);
      expect(reading.is_motion).toBe(false);
      expect(reading.is_over_capacity).toBe(false);
      expect(reading.unit).toBe('g');
    });

    it('decodes unstable motion Toledo frame', () => {
      const frame = 'US,GS,  0.450kg';
      const reading = decodeToledoScaleFrame(frame);

      expect(reading.status).toBe('MOTION');
      expect(reading.net_weight_grams).toBe(450);
      expect(reading.is_motion).toBe(true);
    });

    it('decodes imperial pounds to integer grams precision', () => {
      const frame = 'ST,GS,  2.500lb'; // 2.5 lb = ~1134 grams
      const reading = decodeToledoScaleFrame(frame);

      expect(reading.status).toBe('STABLE');
      expect(reading.net_weight_grams).toBe(1134);
    });

    it('decodes NCI scale protocol response frame', () => {
      const frame = '\nS  00.750kg\r';
      const reading = decodeNciScaleFrame(frame);

      expect(reading.net_weight_grams).toBe(750);
      expect(reading.is_motion).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Barcode Verification & GS1-128 Engine
  // ==========================================================================
  describe('Barcode & GS1-128 Scanning Engine', () => {
    it('validates correct EAN-13 modulo 10 check digit and detects invalid digits', () => {
      // 9780141036144 is valid Orwell 1984 ISBN/EAN-13
      expect(validateModulo10CheckDigit('9780141036144')).toBe(true);
      // Altered check digit should fail
      expect(validateModulo10CheckDigit('9780141036145')).toBe(false);

      // UPC-A (12 digits) 012345678905
      expect(validateModulo10CheckDigit('012345678905')).toBe(true);
      expect(validateModulo10CheckDigit('012345678909')).toBe(false);
    });

    it('parses parenthesized GS1-128 composite barcode with GTIN, Lot, Expiry and Serial', () => {
      const barcode = '(01)00843210000000(10)LOT-2026A(17)261231(21)SN-998877';
      const parsed = parseGs1Barcode(barcode);

      expect(parsed.gtin_14).toBe('00843210000000');
      expect(parsed.batch_lot).toBe('LOT-2026A');
      expect(parsed.expiration_date_iso).toBe('2026-12-31');
      expect(parsed.serial_number).toBe('SN-998877');
    });

    it('parses variable-weight GS1 net weight AI 3102 into integer grams', () => {
      // AI 3102 with 001550 => 15.50 kg = 15500 grams
      const barcode = '(01)00843210000000(3102)001550';
      const parsed = parseGs1Barcode(barcode);

      expect(parsed.net_weight_grams).toBe(15500);
    });

    it('classifies scanned barcode business intent accurately', () => {
      const gtin = classifyBarcodeIntent('9780141036144');
      expect(gtin.intent).toBe('GTIN_PRODUCT');
      expect(gtin.symbology).toBe('EAN_13');

      const bin = classifyBarcodeIntent('LOC-A1-BIN-04');
      expect(bin.intent).toBe('BIN_LOCATION');
      expect(bin.identifier).toBe('LOC-A1-BIN-04');

      const ord = classifyBarcodeIntent('ORD-2026-8812');
      expect(ord.intent).toBe('ORDER_BARCODE');

      const gs1 = classifyBarcodeIntent('(01)00843210000000(21)SER123');
      expect(gs1.intent).toBe('SERIAL_NUMBER');
      expect(gs1.is_gs1_composite).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Receipt Markup Compiler (Rule 7 Compliance)
  // ==========================================================================
  describe('Receipt Markup Compiler (Rule 7)', () => {
    it('formats minor units into currency strings cleanly', () => {
      expect(formatMinorUnitCurrency('15000')).toBe('$150.00');
      expect(formatMinorUnitCurrency('99')).toBe('$0.99');
      expect(formatMinorUnitCurrency('-500')).toBe('-$5.00');
    });

    it('formats justified two-column rows padded to exact width', () => {
      const row = formatJustifiedRow('Organic Apples x2', '$15.00', 48);
      expect(row.length).toBe(48);
      expect(row.startsWith('Organic Apples x2')).toBe(true);
      expect(row.endsWith('$15.00')).toBe(true);
    });

    it('compiles standard receipt markup into ESC/POS bytes and preview text', () => {
      const markup = `
<receipt>
  <header>
    <center><bold>{{store_name}}</bold></center>
    <center>{{store_address}}</center>
  </header>
  <divider char="-" />
  <row left="Coffee Mug x1" right="$12.00" />
  <row left="Espresso Beans x1" right="$18.50" />
  <divider char="=" />
  <bold><row left="TOTAL" right="$30.50" /></bold>
  <barcode value="{{receipt_number}}" />
  <cut />
  <cashdrawer />
</receipt>
      `;

      const result = compileReceiptMarkup(
        markup,
        {
          store_name: 'STOKROVA FLAGSHIP',
          store_address: '100 Silicon Way, Tech City',
          receipt_number: 'REC-2026-0001',
        },
        { paper_width_mm: 80, columns: 48, is_reprint: false },
      );

      expect(result.byte_length).toBeGreaterThan(50);
      expect(result.has_cut).toBe(true);
      expect(result.has_drawer_kick).toBe(true);
      expect(result.is_duplicate_reprint).toBe(false);
      expect(result.plaintext_preview).toContain('STOKROVA FLAGSHIP');
      expect(result.plaintext_preview).toContain('Coffee Mug x1');
      expect(result.plaintext_preview).not.toContain('*** DUPLICATE RECEIPT / REPRINT ***');
    });

    it('strictly enforces Rule 7 by injecting duplicate warning on receipt reprint', () => {
      const markup = `
<receipt>
  <row left="Item A" right="$5.00" />
  <cut />
</receipt>
      `;

      const result = compileReceiptMarkup(markup, {}, { is_reprint: true });

      expect(result.is_duplicate_reprint).toBe(true);
      expect(result.plaintext_preview).toContain('*** DUPLICATE RECEIPT / REPRINT ***');
      expect(result.plaintext_preview).toContain('*** ZERO FINANCIAL IMPACT ***');
    });
  });
});
