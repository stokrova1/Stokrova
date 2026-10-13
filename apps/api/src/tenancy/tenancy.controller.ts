import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TenancyService } from './tenancy.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserIdentity } from '@stokrova/contracts';
import {
  CreateTenantRequestSchema,
  UpdateTenantStatusSchema,
} from '@stokrova/validation';
import type {
  CreateTenantRequest,
  ProvisionedTenantResult,
  TenantResponse,
} from '@stokrova/contracts';
import type { TenantStatus } from '@stokrova/domain';

@Controller('tenants')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createTenant(
    @Body() body: unknown,
    @CurrentUser() user: UserIdentity,
  ): Promise<ProvisionedTenantResult> {
    const parseResult = CreateTenantRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid tenant creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const ownerId = user?.id || 'owner_init';
    return this.tenancyService.provisionTenant(
      parseResult.data as CreateTenantRequest,
      ownerId,
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard, TenantGuard)
  async getTenant(@Param('id') tenantId: string): Promise<TenantResponse> {
    return this.tenancyService.getTenantById(tenantId);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, TenantGuard)
  async updateStatus(
    @Param('id') tenantId: string,
    @Body() body: unknown,
  ): Promise<TenantResponse> {
    const parseResult = UpdateTenantStatusSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid status update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.tenancyService.updateTenantStatus(
      tenantId,
      parseResult.data.status as TenantStatus,
    );
  }
}
