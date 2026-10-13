import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HardwareDevicesService } from './hardware-devices.service.js';
import { HardwarePrinterService } from './hardware-printer.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import type {
  HardwareDevice,
  HardwareProfile,
  HardwarePrintJob,
  ReceiptCompileResult,
  ScanResolutionResult,
  WeightReading,
  CreateHardwareDeviceRequest,
  UpdateHardwareDeviceRequest,
  CreateHardwareProfileRequest,
  CreateHardwarePrintJobRequest,
  CompileReceiptTemplateRequest,
  HardwareParseBarcodeRequest,
  DecodeScaleWeightRequest,
  ReceiptCompileOptions,
  HardwareDeviceStatus,
} from '@stokrova/contracts';

@Controller('hardware')
export class HardwareController {
  constructor(
    private readonly devicesService: HardwareDevicesService,
    private readonly printerService: HardwarePrinterService,
  ) {}

  // ==========================================================================
  // Device Endpoints
  // ==========================================================================

  @Post('devices')
  @UseGuards(AuthGuard, TenantGuard)
  async createDevice(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateHardwareDeviceRequest,
  ): Promise<HardwareDevice> {
    return this.devicesService.createDevice(tenant.id, body);
  }

  @Get('devices')
  @UseGuards(AuthGuard, TenantGuard)
  async listDevices(
    @CurrentTenant() tenant: { id: string },
    @Query('branch_id') branchId?: string,
    @Query('device_type') deviceType?: string,
    @Query('status') status?: string,
  ): Promise<HardwareDevice[]> {
    return this.devicesService.listDevices(tenant.id, {
      branch_id: branchId,
      device_type: deviceType,
      status,
    });
  }

  @Get('devices/:id')
  @UseGuards(AuthGuard, TenantGuard)
  async getDevice(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<HardwareDevice> {
    return this.devicesService.getDeviceById(tenant.id, id);
  }

  @Put('devices/:id')
  @UseGuards(AuthGuard, TenantGuard)
  async updateDevice(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() body: UpdateHardwareDeviceRequest,
  ): Promise<HardwareDevice> {
    return this.devicesService.updateDevice(tenant.id, id, body);
  }

  @Post('devices/:id/heartbeat')
  @UseGuards(AuthGuard, TenantGuard)
  async heartbeat(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body('status') status?: HardwareDeviceStatus,
  ): Promise<HardwareDevice> {
    return this.devicesService.recordHeartbeat(tenant.id, id, status);
  }

  @Delete('devices/:id')
  @UseGuards(AuthGuard, TenantGuard)
  async deleteDevice(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.devicesService.deleteDevice(tenant.id, id);
  }

  // ==========================================================================
  // Profile Endpoints
  // ==========================================================================

  @Post('profiles')
  @UseGuards(AuthGuard, TenantGuard)
  async createProfile(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateHardwareProfileRequest,
  ): Promise<HardwareProfile> {
    return this.devicesService.createProfile(tenant.id, body);
  }

  @Get('profiles')
  @UseGuards(AuthGuard, TenantGuard)
  async listProfiles(
    @CurrentTenant() tenant: { id: string },
  ): Promise<HardwareProfile[]> {
    return this.devicesService.listProfiles(tenant.id);
  }

  @Get('profiles/:id')
  @UseGuards(AuthGuard, TenantGuard)
  async getProfile(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<HardwareProfile> {
    return this.devicesService.getProfileById(tenant.id, id);
  }

  // ==========================================================================
  // Printer & Spooler Endpoints
  // ==========================================================================

  @Post('printers/compile-template')
  async compileTemplate(
    @Body() body: CompileReceiptTemplateRequest,
  ): Promise<ReceiptCompileResult> {
    return this.printerService.compileTemplate(body);
  }

  @Post('printers/print-jobs')
  @UseGuards(AuthGuard, TenantGuard)
  async createPrintJob(
    @CurrentTenant() tenant: { id: string },
    @Body() body: CreateHardwarePrintJobRequest,
  ): Promise<HardwarePrintJob> {
    return this.printerService.createPrintJob(tenant.id, body);
  }

  @Get('printers/print-jobs')
  @UseGuards(AuthGuard, TenantGuard)
  async listPrintJobs(
    @CurrentTenant() tenant: { id: string },
    @Query('device_id') deviceId?: string,
    @Query('status') status?: string,
  ): Promise<HardwarePrintJob[]> {
    return this.printerService.listPrintJobs(tenant.id, deviceId, status);
  }

  @Get('printers/print-jobs/:id')
  @UseGuards(AuthGuard, TenantGuard)
  async getPrintJob(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ): Promise<HardwarePrintJob> {
    return this.printerService.getPrintJobById(tenant.id, id);
  }

  @Post('printers/:id/test-print')
  @UseGuards(AuthGuard, TenantGuard)
  async executeTestPrint(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() options?: ReceiptCompileOptions,
  ): Promise<HardwarePrintJob> {
    return this.printerService.executeTestPrint(tenant.id, id, options);
  }

  // ==========================================================================
  // Scanner & Scale Endpoints
  // ==========================================================================

  @Post('scanners/parse-barcode')
  async parseBarcode(
    @Body() body: HardwareParseBarcodeRequest,
  ): Promise<ScanResolutionResult> {
    return this.printerService.parseBarcode(body);
  }

  @Post('scales/decode-weight')
  async decodeScaleWeight(
    @Body() body: DecodeScaleWeightRequest,
  ): Promise<WeightReading> {
    return this.printerService.decodeScaleWeight(body);
  }
}
