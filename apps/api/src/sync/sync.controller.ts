import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SyncService } from './sync.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  SyncPushRequestSchema,
  SyncPullRequestSchema,
} from '@stokrova/validation';
import type {
  SyncPushResponse,
  SyncPullResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('sync')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @RequirePermission(StandardPermissions.SYNC_PUSH)
  async pushOperations(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<SyncPushResponse> {
    const parsed = SyncPushRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid sync push payload.',
          details: parsed.error.issues,
        },
      });
    }

    return this.syncService.pushOperations(tenantId, parsed.data);
  }

  @Get('pull')
  @RequirePermission(StandardPermissions.SYNC_PULL)
  async pullChanges(
    @CurrentTenant() tenantId: string,
    @Query() query: unknown,
  ): Promise<SyncPullResponse> {
    const parsed = SyncPullRequestSchema.safeParse(query || {});
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid sync pull parameters.',
          details: parsed.error.issues,
        },
      });
    }

    return this.syncService.pullChanges(tenantId, parsed.data);
  }
}
