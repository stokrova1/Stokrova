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
import { BranchesService } from './branches.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateBranchRequestSchema,
  UpdateBranchRequestSchema,
} from '@stokrova/validation';
import type {
  BranchResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('branches')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermission(StandardPermissions.BRANCHES_MANAGE)
  async createBranch(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<BranchResponse> {
    const parseResult = CreateBranchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid branch creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.branchesService.createBranch(
      tenantId,
      parseResult.data as CreateBranchRequest,
    );
  }

  @Get()
  async getBranches(
    @CurrentTenant() tenantId: string,
    @Query('company_id') companyId?: string,
  ): Promise<BranchResponse[]> {
    return this.branchesService.getBranches(tenantId, companyId);
  }

  @Get(':id')
  async getBranch(
    @CurrentTenant() tenantId: string,
    @Param('id') branchId: string,
  ): Promise<BranchResponse> {
    return this.branchesService.getBranchById(tenantId, branchId);
  }

  @Patch(':id')
  @RequirePermission(StandardPermissions.BRANCHES_MANAGE)
  async updateBranch(
    @CurrentTenant() tenantId: string,
    @Param('id') branchId: string,
    @Body() body: unknown,
  ): Promise<BranchResponse> {
    const parseResult = UpdateBranchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid branch update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.branchesService.updateBranch(
      tenantId,
      branchId,
      parseResult.data as UpdateBranchRequest,
    );
  }
}
