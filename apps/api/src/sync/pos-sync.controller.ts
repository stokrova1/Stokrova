import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PosSyncService } from './pos-sync.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PosSyncBatchRequestSchema } from '@stokrova/validation';
import type {
  PosSyncBatchRequest,
  PosSyncBatchResponse,
  DeviceSyncStatusResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('pos/sync')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class PosSyncController {
  constructor(private readonly posSyncService: PosSyncService) {}

  @Post('batch')
  @RequirePermission(StandardPermissions.SYNC_PUSH)
  async processBatch(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<PosSyncBatchResponse> {
    const parseResult = PosSyncBatchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid POS sync batch payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.posSyncService.processSyncBatch(
      tenantId,
      userId,
      parseResult.data as PosSyncBatchRequest,
    );
  }

  @Get('devices/:deviceId/sequence')
  @RequirePermission(StandardPermissions.SYNC_PULL)
  async getDeviceStatus(
    @CurrentTenant() tenantId: string,
    @Param('deviceId') deviceId: string,
  ): Promise<DeviceSyncStatusResponse> {
    return this.posSyncService.getDeviceSyncStatus(tenantId, deviceId);
  }
}
