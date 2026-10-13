import { z } from 'zod';

export const HardwareDeviceTypeSchema = z.enum([
  'PRINTER_THERMAL',
  'SCALE_DIGITAL',
  'BARCODE_SCANNER',
  'POLE_DISPLAY',
  'CASH_DRAWER',
  'PAYMENT_TERMINAL',
]);

export const HardwareDriverProtocolSchema = z.enum([
  'ESCPOS_GENERIC',
  'STAR_PRNT',
  'EPSON_EPOS',
  'TOLEDO_8217',
  'NCI_SERIAL',
  'CAS_SERIAL',
  'ZEBRA_DATAWEDGE',
  'GENERIC_HID_SCANNER',
]);

export const HardwareConnectionInterfaceSchema = z.enum([
  'USB',
  'ETHERNET',
  'BLUETOOTH',
  'SERIAL_RS232',
  'WEBSOCKET',
  'VIRTUAL',
]);

export const HardwareDeviceStatusSchema = z.enum([
  'ONLINE',
  'OFFLINE',
  'BUSY',
  'PAPER_OUT',
  'COVER_OPEN',
  'ERROR',
]);

export const HardwarePrintJobStatusSchema = z.enum([
  'QUEUED',
  'PRINTING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const CreateHardwareDeviceSchema = z.object({
  name: z.string().trim().min(1, 'Device name is required').max(128),
  device_type: HardwareDeviceTypeSchema,
  protocol: HardwareDriverProtocolSchema,
  connection_interface: HardwareConnectionInterfaceSchema,
  branch_id: z.string().trim().optional().nullable(),
  register_id: z.string().trim().optional().nullable(),
  ip_address: z.string().trim().optional().nullable(),
  port: z.number().int().min(1).max(65535).optional().nullable(),
  serial_port: z.string().trim().optional().nullable(),
  baud_rate: z.number().int().positive().optional().nullable(),
  mac_address: z.string().trim().optional().nullable(),
  profile_id: z.string().trim().optional().nullable(),
});

export const UpdateHardwareDeviceSchema = z.object({
  name: z.string().trim().min(1).max(128).optional(),
  protocol: HardwareDriverProtocolSchema.optional(),
  connection_interface: HardwareConnectionInterfaceSchema.optional(),
  branch_id: z.string().trim().optional().nullable(),
  register_id: z.string().trim().optional().nullable(),
  ip_address: z.string().trim().optional().nullable(),
  port: z.number().int().min(1).max(65535).optional().nullable(),
  serial_port: z.string().trim().optional().nullable(),
  baud_rate: z.number().int().positive().optional().nullable(),
  profile_id: z.string().trim().optional().nullable(),
  status: HardwareDeviceStatusSchema.optional(),
  is_active: z.boolean().optional(),
});

export const CreateHardwareProfileSchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required').max(128),
  device_type: HardwareDeviceTypeSchema,
  paper_width_mm: z.number().int().refine((val) => val === 58 || val === 80, {
    message: 'Paper width must be either 58mm or 80mm',
  }).default(80).optional(),
  column_count: z.number().int().min(16).max(64).default(48).optional(),
  drawer_kick_pin: z.union([z.literal(2), z.literal(5)]).default(2).optional(),
  drawer_pulse_duration_ms: z.number().int().min(10).max(500).default(100).optional(),
  scale_precision_grams: z.number().int().min(1).max(1000).default(1).optional(),
});

export const CreateHardwarePrintJobSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required'),
  operation_id: z.string().min(1, 'Operation ID is required for idempotency'),
  job_type: z.enum(['RECEIPT', 'ORDER_SLIP', 'BARCODE_LABEL', 'Z_REPORT', 'TEST_PRINT']),
  payload_bytes_base64: z.string().min(1, 'Payload base64 is required'),
  plaintext_preview: z.string().optional().nullable(),
});

export const CompileReceiptTemplateSchema = z.object({
  template_markup: z.string().min(1, 'Template markup is required'),
  variables: z.record(z.string(), z.unknown()).default({}),
  options: z
    .object({
      paper_width_mm: z.union([z.literal(58), z.literal(80)]).optional(),
      columns: z.number().int().min(16).max(64).optional(),
      protocol: z.enum(['ESCPOS_GENERIC', 'STAR_PRNT']).optional(),
      is_reprint: z.boolean().optional(),
    })
    .optional(),
});

export const HardwareParseBarcodeSchema = z.object({
  raw_barcode: z.string().trim().min(1, 'Raw barcode is required'),
  hint_symbology: z
    .enum(['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'QR_CODE', 'DATA_MATRIX'])
    .optional(),
});

export const DecodeScaleWeightSchema = z.object({
  raw_serial_hex_or_ascii: z.string().trim().min(1, 'Serial frame is required'),
  protocol: z.enum(['TOLEDO_8217', 'NCI_SERIAL', 'CAS_SERIAL']),
});
