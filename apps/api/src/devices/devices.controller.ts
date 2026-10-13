import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { DevicesService } from './devices.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  RegisterDeviceSchema,
  RevokeDeviceSchema,
} from '@stokrova/validation';
import type { DeviceResponse } from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('devices')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async registerDevice(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<DeviceResponse> {
    const parsed = RegisterDeviceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid device registration payload.',
          details: parsed.error.issues,
        },
      });
    }

    return this.devicesService.registerDevice(tenantId, parsed.data);
  }

  @Post(':id/revoke')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async revokeDevice(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<DeviceResponse> {
    const parsed = RevokeDeviceSchema.safeParse(body || {});
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid device revocation payload.',
          details: parsed.error.issues,
        },
      });
    }

    return this.devicesService.revokeDevice(tenantId, id, parsed.data);
  }

  @Get()
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async listDevices(
    @CurrentTenant() tenantId: string,
  ): Promise<DeviceResponse[]> {
    return this.devicesService.listDevices(tenantId);
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async getDeviceById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DeviceResponse> {
    return this.devicesService.getDeviceById(tenantId, id);
  }
}
