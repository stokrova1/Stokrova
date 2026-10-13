import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  HardwarePrintJob,
  CreateHardwarePrintJobRequest,
  CompileReceiptTemplateRequest,
  ReceiptCompileResult,
  ReceiptCompileOptions,
  HardwareParseBarcodeRequest,
  ScanResolutionResult,
  DecodeScaleWeightRequest,
  WeightReading,
} from '@stokrova/contracts';
import {
  CreateHardwarePrintJobSchema,
  CompileReceiptTemplateSchema,
  HardwareParseBarcodeSchema,
  DecodeScaleWeightSchema,
} from '@stokrova/validation';
import {
  compileReceiptMarkup,
  classifyBarcodeIntent,
  decodeToledoScaleFrame,
  decodeNciScaleFrame,
  decodeCasScaleFrame,
} from '@stokrova/domain';
import { HardwareDevicesService } from './hardware-devices.service.js';

@Injectable()
export class HardwarePrinterService {
  private readonly printJobs = new Map<string, HardwarePrintJob>();
  private readonly jobsByOpId = new Map<string, string>(); // tenant:operation_id -> job_id

  constructor(private readonly devicesService: HardwareDevicesService) {}

  // ==========================================================================
  // Template Compilation (Rule 7: Never Treat Receipts as Financial Truth)
  // ==========================================================================

  async compileTemplate(
    req: CompileReceiptTemplateRequest,
  ): Promise<ReceiptCompileResult> {
    const parsed = CompileReceiptTemplateSchema.parse(req);
    return compileReceiptMarkup(
      parsed.template_markup,
      parsed.variables,
      parsed.options,
    );
  }

  // ==========================================================================
  // Print Job Dispatch & Spooling (Rule 19: Durable Idempotency)
  // ==========================================================================

  async createPrintJob(
    tenantId: string,
    req: CreateHardwarePrintJobRequest,
  ): Promise<HardwarePrintJob> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateHardwarePrintJobSchema.parse(req);

    // 1. Verify target device exists and belongs to this tenant
    await this.devicesService.getDeviceById(tenantId, parsed.device_id);

    // 2. Enforce idempotency: check if operation_id was already executed
    const opKey = `${tenantId}:${parsed.operation_id}`;
    const existingJobId = this.jobsByOpId.get(opKey);
    if (existingJobId) {
      const existing = this.printJobs.get(existingJobId);
      if (existing) {
        return existing;
      }
    }

    const now = new Date().toISOString();
    const id = `pjob_${randomUUID()}`;

    const job: HardwarePrintJob = {
      id,
      tenant_id: tenantId,
      device_id: parsed.device_id,
      operation_id: parsed.operation_id,
      job_type: parsed.job_type,
      status: 'COMPLETED', // Simulates immediate transmission to device / spooler
      payload_bytes_base64: parsed.payload_bytes_base64,
      plaintext_preview: parsed.plaintext_preview ?? null,
      error_message: null,
      retry_count: 0,
      created_at: now,
      completed_at: now,
    };

    this.printJobs.set(job.id, job);
    this.jobsByOpId.set(opKey, job.id);
    return job;
  }

  async getPrintJobById(
    tenantId: string,
    jobId: string,
  ): Promise<HardwarePrintJob> {
    const job = this.printJobs.get(jobId);
    if (!job || job.tenant_id !== tenantId) {
      throw new NotFoundException(`Hardware print job '${jobId}' not found`);
    }
    return job;
  }

  async listPrintJobs(
    tenantId: string,
    deviceId?: string,
    status?: string,
  ): Promise<HardwarePrintJob[]> {
    return Array.from(this.printJobs.values()).filter((j) => {
      if (j.tenant_id !== tenantId) return false;
      if (deviceId && j.device_id !== deviceId) return false;
      if (status && j.status !== status) return false;
      return true;
    });
  }

  async executeTestPrint(
    tenantId: string,
    deviceId: string,
    options?: ReceiptCompileOptions,
  ): Promise<HardwarePrintJob> {
    const device = await this.devicesService.getDeviceById(tenantId, deviceId);

    const testMarkup = `
<receipt>
  <center><bold>*** STOKROVA TEST PRINT ***</bold></center>
  <center>HARDWARE DIAGNOSTIC TICKET</center>
  <divider char="=" />
  <row left="Device ID:" right="{{device_id}}" />
  <row left="Device Name:" right="{{device_name}}" />
  <row left="Protocol:" right="{{protocol}}" />
  <row left="Timestamp:" right="{{timestamp}}" />
  <divider char="-" />
  <center><bold>DEVICE STATUS: READY</bold></center>
  <barcode value="{{device_id}}" />
  <cut />
</receipt>
    `;

    const compiled = compileReceiptMarkup(
      testMarkup,
      {
        device_id: device.id,
        device_name: device.name,
        protocol: device.protocol,
        timestamp: new Date().toISOString(),
      },
      options,
    );

    return this.createPrintJob(tenantId, {
      device_id: device.id,
      operation_id: `op_test_${randomUUID()}`,
      job_type: 'TEST_PRINT',
      payload_bytes_base64: compiled.escpos_bytes_base64,
      plaintext_preview: compiled.plaintext_preview,
    });
  }

  // ==========================================================================
  // Barcode & Digital Scale Utilities
  // ==========================================================================

  parseBarcode(req: HardwareParseBarcodeRequest): ScanResolutionResult {
    const parsed = HardwareParseBarcodeSchema.parse(req);
    return classifyBarcodeIntent(parsed.raw_barcode);
  }

  decodeScaleWeight(req: DecodeScaleWeightRequest): WeightReading {
    const parsed = DecodeScaleWeightSchema.parse(req);
    if (parsed.protocol === 'TOLEDO_8217') {
      return decodeToledoScaleFrame(parsed.raw_serial_hex_or_ascii);
    }
    if (parsed.protocol === 'NCI_SERIAL') {
      return decodeNciScaleFrame(parsed.raw_serial_hex_or_ascii);
    }
    return decodeCasScaleFrame(parsed.raw_serial_hex_or_ascii);
  }
}
