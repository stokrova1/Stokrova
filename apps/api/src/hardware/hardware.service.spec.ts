import { describe, it, expect, beforeEach } from 'vitest';
import { HardwareDevicesService } from './hardware-devices.service.js';
import { HardwarePrinterService } from './hardware-printer.service.js';

describe('Hardware Peripherals & ESC/POS Services (Phase 14 API)', () => {
  let devicesService: HardwareDevicesService;
  let printerService: HardwarePrinterService;
  const tenantId = 'tenant-hardware-test';

  beforeEach(() => {
    devicesService = new HardwareDevicesService();
    printerService = new HardwarePrinterService(devicesService);
  });

  describe('HardwareDevicesService', () => {
    it('registers an ESC/POS network thermal printer successfully', async () => {
      const dev = await devicesService.createDevice(tenantId, {
        name: 'Main POS Receipt Printer',
        device_type: 'PRINTER_THERMAL',
        protocol: 'ESCPOS_GENERIC',
        connection_interface: 'ETHERNET',
        ip_address: '192.168.1.100',
        port: 9100,
        branch_id: 'branch-01',
      });

      expect(dev.id).toBeDefined();
      expect(dev.tenant_id).toBe(tenantId);
      expect(dev.name).toBe('Main POS Receipt Printer');
      expect(dev.status).toBe('ONLINE');
      expect(dev.is_active).toBe(true);

      const fetched = await devicesService.getDeviceById(tenantId, dev.id);
      expect(fetched.id).toBe(dev.id);
    });

    it('updates device heartbeat status', async () => {
      const dev = await devicesService.createDevice(tenantId, {
        name: 'Scale 1',
        device_type: 'SCALE_DIGITAL',
        protocol: 'TOLEDO_8217',
        connection_interface: 'SERIAL_RS232',
      });

      const updated = await devicesService.recordHeartbeat(tenantId, dev.id, 'BUSY');
      expect(updated.status).toBe('BUSY');
    });

    it('creates and retrieves hardware printer profile', async () => {
      const profile = await devicesService.createProfile(tenantId, {
        name: 'Thermal 80mm Wide',
        device_type: 'PRINTER_THERMAL',
        paper_width_mm: 80,
        column_count: 48,
        drawer_kick_pin: 2,
      });

      expect(profile.paper_width_mm).toBe(80);
      expect(profile.column_count).toBe(48);

      const list = await devicesService.listProfiles(tenantId);
      expect(list.length).toBe(1);
    });
  });

  describe('HardwarePrinterService', () => {
    it('compiles receipt markup and injects Rule 7 duplicate reprint banner', async () => {
      const markup = `
<receipt>
  <center><bold>{{store}}</bold></center>
  <row left="Latte x1" right="$4.50" />
  <cut />
</receipt>
      `;

      // Normal print
      const normal = await printerService.compileTemplate({
        template_markup: markup,
        variables: { store: 'STOKROVA PARIS' },
        options: { is_reprint: false },
      });
      expect(normal.is_duplicate_reprint).toBe(false);
      expect(normal.plaintext_preview).not.toContain('*** DUPLICATE RECEIPT / REPRINT ***');

      // Reprint print (Rule 7 enforcement)
      const reprint = await printerService.compileTemplate({
        template_markup: markup,
        variables: { store: 'STOKROVA PARIS' },
        options: { is_reprint: true },
      });
      expect(reprint.is_duplicate_reprint).toBe(true);
      expect(reprint.plaintext_preview).toContain('*** DUPLICATE RECEIPT / REPRINT ***');
      expect(reprint.plaintext_preview).toContain('*** ZERO FINANCIAL IMPACT ***');
    });

    it('creates print job with strict operation_id idempotency (Rule 19)', async () => {
      const dev = await devicesService.createDevice(tenantId, {
        name: 'Bar Printer',
        device_type: 'PRINTER_THERMAL',
        protocol: 'ESCPOS_GENERIC',
        connection_interface: 'USB',
      });

      const opId = 'op-print-order-5501';
      const job1 = await printerService.createPrintJob(tenantId, {
        device_id: dev.id,
        operation_id: opId,
        job_type: 'RECEIPT',
        payload_bytes_base64: 'G0AASGVsbG8hCg==',
      });

      expect(job1.id).toBeDefined();
      expect(job1.status).toBe('COMPLETED');

      // Second identical call returns existing job without duplication
      const job2 = await printerService.createPrintJob(tenantId, {
        device_id: dev.id,
        operation_id: opId,
        job_type: 'RECEIPT',
        payload_bytes_base64: 'G0AASGVsbG8hCg==',
      });

      expect(job2.id).toBe(job1.id);
    });

    it('executes diagnostic test print for registered device', async () => {
      const dev = await devicesService.createDevice(tenantId, {
        name: 'Kitchen Star Printer',
        device_type: 'PRINTER_THERMAL',
        protocol: 'STAR_PRNT',
        connection_interface: 'ETHERNET',
      });

      const testJob = await printerService.executeTestPrint(tenantId, dev.id);
      expect(testJob.job_type).toBe('TEST_PRINT');
      expect(testJob.status).toBe('COMPLETED');
      expect(testJob.plaintext_preview).toContain('STOKROVA TEST PRINT');
    });

    it('parses composite GS1 barcode and identifies business scan intent', () => {
      const res = printerService.parseBarcode({
        raw_barcode: '(01)00843210000000(10)LOT-X9(17)261011',
      });

      expect(res.is_gs1_composite).toBe(true);
      expect(res.intent).toBe('BATCH_TRACKED_ITEM');
      expect(res.parsed_gs1?.batch_lot).toBe('LOT-X9');
      expect(res.parsed_gs1?.expiration_date_iso).toBe('2026-10-11');
    });

    it('decodes Toledo scale frame into pure integer grams', () => {
      const reading = printerService.decodeScaleWeight({
        raw_serial_hex_or_ascii: 'ST,GS,  3.750kg\r\n',
        protocol: 'TOLEDO_8217',
      });

      expect(reading.status).toBe('STABLE');
      expect(reading.net_weight_grams).toBe(3750);
      expect(reading.unit).toBe('g');
    });
  });
});
