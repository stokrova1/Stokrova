import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WorkCentersService } from './work-centers.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateWorkCenterRequestSchema,
  UpdateWorkCenterRequestSchema,
} from '@stokrova/validation';
import type {
  WorkCenterResponse,
  CreateWorkCenterRequest,
  UpdateWorkCenterRequest,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('work-centers')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class WorkCentersController {
  constructor(private readonly workCentersService: WorkCentersService) {}

  @Post()
  @RequirePermission(StandardPermissions.WORK_CENTERS_MANAGE)
  async createWorkCenter(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<WorkCenterResponse> {
    const parseResult = CreateWorkCenterRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid work center creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workCentersService.createWorkCenter(
      tenantId,
      parseResult.data as CreateWorkCenterRequest,
    );
  }

  @Get()
  async getWorkCenters(
    @CurrentTenant() tenantId: string,
    @Query('branch_id') branchId?: string,
  ): Promise<WorkCenterResponse[]> {
    return this.workCentersService.getWorkCenters(tenantId, branchId);
  }

  @Get(':id')
  async getWorkCenter(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkCenterResponse> {
    return this.workCentersService.getWorkCenterById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission(StandardPermissions.WORK_CENTERS_MANAGE)
  async updateWorkCenter(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<WorkCenterResponse> {
    const parseResult = UpdateWorkCenterRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid work center update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workCentersService.updateWorkCenter(
      tenantId,
      id,
      parseResult.data as UpdateWorkCenterRequest,
    );
  }
}
