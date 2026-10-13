/**
 * ============================================================================
 * STOKROVA — Hardware Peripherals, Barcode Scanning & ESC/POS Printing Contracts
 * Phase 14: Mobile Offline Scanner, Hardware Peripherals & ESC/POS Engine
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

export type HardwareConnectionInterface =
  | 'USB'
  | 'ETHERNET'
  | 'BLUETOOTH'
  | 'SERIAL_RS232'
  | 'WEBSOCKET'
  | 'VIRTUAL';

export type HardwareDeviceStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'BUSY'
  | 'PAPER_OUT'
  | 'COVER_OPEN'
  | 'ERROR';

export type HardwarePrintJobStatus =
  | 'QUEUED'
  | 'PRINTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

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

export interface HardwareProfile {
  id: string;
  tenant_id: string;
  name: string;
  device_type: HardwareDeviceType;
  paper_width_mm: number;
  column_count: number;
  drawer_kick_pin: 2 | 5;
  drawer_pulse_duration_ms: number;
  scale_precision_grams: number;
  created_at: string;
  updated_at: string;
}

export interface HardwareDevice {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  register_id?: string | null;
  name: string;
  device_type: HardwareDeviceType;
  protocol: HardwareDriverProtocol;
  connection_interface: HardwareConnectionInterface;
  ip_address?: string | null;
  port?: number | null;
  serial_port?: string | null;
  baud_rate?: number | null;
  mac_address?: string | null;
  profile_id?: string | null;
  status: HardwareDeviceStatus;
  is_active: boolean;
  last_heartbeat_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HardwarePrintJob {
  id: string;
  tenant_id: string;
  device_id: string;
  operation_id: string;
  job_type: 'RECEIPT' | 'ORDER_SLIP' | 'BARCODE_LABEL' | 'Z_REPORT' | 'TEST_PRINT';
  status: HardwarePrintJobStatus;
  payload_bytes_base64: string;
  plaintext_preview?: string | null;
  error_message?: string | null;
  retry_count: number;
  created_at: string;
  completed_at?: string | null;
}

// ============================================================================
// DTOs & Request Interfaces
// ============================================================================

export interface CreateHardwareDeviceRequest {
  branch_id?: string | null;
  register_id?: string | null;
  name: string;
  device_type: HardwareDeviceType;
  protocol: HardwareDriverProtocol;
  connection_interface: HardwareConnectionInterface;
  ip_address?: string | null;
  port?: number | null;
  serial_port?: string | null;
  baud_rate?: number | null;
  mac_address?: string | null;
  profile_id?: string | null;
}

export interface UpdateHardwareDeviceRequest {
  branch_id?: string | null;
  register_id?: string | null;
  name?: string;
  protocol?: HardwareDriverProtocol;
  connection_interface?: HardwareConnectionInterface;
  ip_address?: string | null;
  port?: number | null;
  serial_port?: string | null;
  baud_rate?: number | null;
  profile_id?: string | null;
  status?: HardwareDeviceStatus;
  is_active?: boolean;
}

export interface CreateHardwareProfileRequest {
  name: string;
  device_type: HardwareDeviceType;
  paper_width_mm?: number;
  column_count?: number;
  drawer_kick_pin?: 2 | 5;
  drawer_pulse_duration_ms?: number;
  scale_precision_grams?: number;
}

export interface CreateHardwarePrintJobRequest {
  device_id: string;
  operation_id: string;
  job_type: 'RECEIPT' | 'ORDER_SLIP' | 'BARCODE_LABEL' | 'Z_REPORT' | 'TEST_PRINT';
  payload_bytes_base64: string;
  plaintext_preview?: string | null;
}

export interface CompileReceiptTemplateRequest {
  template_markup: string;
  variables: Record<string, unknown>;
  options?: ReceiptCompileOptions;
}

export interface HardwareParseBarcodeRequest {
  raw_barcode: string;
  hint_symbology?: BarcodeSymbology;
}

export interface DecodeScaleWeightRequest {
  raw_serial_hex_or_ascii: string;
  protocol: 'TOLEDO_8217' | 'NCI_SERIAL' | 'CAS_SERIAL';
}
