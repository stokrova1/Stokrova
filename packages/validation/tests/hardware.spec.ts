import { describe, it, expect } from 'vitest';
import {
  CreateHardwareDeviceSchema,
  UpdateHardwareDeviceSchema,
  CreateHardwareProfileSchema,
  CreateHardwarePrintJobSchema,
  CompileReceiptTemplateSchema,
  HardwareParseBarcodeSchema,
  DecodeScaleWeightSchema,
} from '../src/hardware.js';

describe('Hardware Peripherals & ESC/POS Validation Schemas (Phase 14)', () => {
  describe('CreateHardwareDeviceSchema', () => {
    it('accepts a valid ESC/POS network thermal printer device', () => {
      const input = {
        name: 'Front Register Printer',
        device_type: 'PRINTER_THERMAL',
        protocol: 'ESCPOS_GENERIC',
        connection_interface: 'ETHERNET',
        ip_address: '192.168.1.150',
        port: 9100,
        branch_id: 'br-main',
        register_id: 'reg-01',
      };
      const parsed = CreateHardwareDeviceSchema.parse(input);
      expect(parsed.name).toBe('Front Register Printer');
      expect(parsed.port).toBe(9100);
    });

    it('rejects device with missing or empty name', () => {
      const input = {
        name: '   ',
        device_type: 'PRINTER_THERMAL',
        protocol: 'ESCPOS_GENERIC',
        connection_interface: 'USB',
      };
      expect(() => CreateHardwareDeviceSchema.parse(input)).toThrow();
    });

    it('rejects device with out-of-range port number', () => {
      const input = {
        name: 'Scale 1',
        device_type: 'SCALE_DIGITAL',
        protocol: 'TOLEDO_8217',
        connection_interface: 'ETHERNET',
        port: 70000,
      };
      expect(() => CreateHardwareDeviceSchema.parse(input)).toThrow();
    });
  });

  describe('CreateHardwareProfileSchema', () => {
    it('accepts valid 80mm and 58mm thermal printer profiles', () => {
      const p80 = CreateHardwareProfileSchema.parse({
        name: 'Standard 80mm Kitchen & POS',
        device_type: 'PRINTER_THERMAL',
        paper_width_mm: 80,
        column_count: 48,
        drawer_kick_pin: 2,
      });
      expect(p80.paper_width_mm).toBe(80);
      expect(p80.column_count).toBe(48);

      const p58 = CreateHardwareProfileSchema.parse({
        name: 'Compact 58mm Mobile',
        device_type: 'PRINTER_THERMAL',
        paper_width_mm: 58,
        column_count: 32,
      });
      expect(p58.paper_width_mm).toBe(58);
      expect(p58.column_count).toBe(32);
    });

    it('rejects invalid paper width (e.g. 70mm)', () => {
      expect(() =>
        CreateHardwareProfileSchema.parse({
          name: 'Invalid Paper',
          device_type: 'PRINTER_THERMAL',
          paper_width_mm: 70,
        }),
      ).toThrow(/Paper width must be either 58mm or 80mm/);
    });
  });

  describe('CreateHardwarePrintJobSchema', () => {
    it('accepts valid print job with operation_id for idempotency', () => {
      const parsed = CreateHardwarePrintJobSchema.parse({
        device_id: 'dev-printer-1',
        operation_id: 'op-print-txn-1234',
        job_type: 'RECEIPT',
        payload_bytes_base64: 'G0AASGVsbG8gV29ybGQhCg==',
        plaintext_preview: 'Hello World!\n',
      });
      expect(parsed.job_type).toBe('RECEIPT');
      expect(parsed.operation_id).toBe('op-print-txn-1234');
    });

    it('rejects print job without operation_id', () => {
      expect(() =>
        CreateHardwarePrintJobSchema.parse({
          device_id: 'dev-printer-1',
          operation_id: '',
          job_type: 'RECEIPT',
          payload_bytes_base64: 'G0A=',
        }),
      ).toThrow();
    });
  });

  describe('CompileReceiptTemplateSchema', () => {
    it('accepts valid receipt markup and variables', () => {
      const parsed = CompileReceiptTemplateSchema.parse({
        template_markup: '<receipt><bold>{{store}}</bold><cut /></receipt>',
        variables: { store: 'STOKROVA PARIS' },
        options: { paper_width_mm: 80, is_reprint: true },
      });
      expect(parsed.template_markup).toContain('<receipt>');
      expect(parsed.options?.is_reprint).toBe(true);
    });
  });

  describe('HardwareParseBarcodeSchema & DecodeScaleWeightSchema', () => {
    it('validates barcode parsing request input', () => {
      const parsed = HardwareParseBarcodeSchema.parse({
        raw_barcode: '(01)00843210000000(10)LOT123',
        hint_symbology: 'CODE_128',
      });
      expect(parsed.raw_barcode).toBe('(01)00843210000000(10)LOT123');
    });

    it('validates scale reading protocol request input', () => {
      const parsed = DecodeScaleWeightSchema.parse({
        raw_serial_hex_or_ascii: 'ST,GS,  1.500kg\r\n',
        protocol: 'TOLEDO_8217',
      });
      expect(parsed.protocol).toBe('TOLEDO_8217');
    });
  });
});
