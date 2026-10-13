import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateQuotationSchema,
  ConvertQuotationSchema,
} from '@stokrova/validation';
import type {
  CreateQuotationRequest,
  ConvertQuotationRequest,
  QuotationResponse,
  SalesOrderResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('v1/quotations')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @RequirePermission(StandardPermissions.QUOTATIONS_CREATE)
  async createQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<QuotationResponse> {
    const parseResult = CreateQuotationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid quotation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.quotationsService.createQuotation(
      tenantId,
      userId || 'usr_anonymous',
      parseResult.data as CreateQuotationRequest,
    );
  }

  @Get()
  @RequirePermission(StandardPermissions.QUOTATIONS_VIEW)
  async listQuotations(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED',
    @Query('customer_id') customerId?: string,
  ): Promise<QuotationResponse[]> {
    return this.quotationsService.listQuotations(tenantId, { status, customer_id: customerId });
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.QUOTATIONS_VIEW)
  async getQuotationById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<QuotationResponse> {
    return this.quotationsService.getQuotationById(tenantId, id);
  }

  @Post(':id/accept')
  @RequirePermission(StandardPermissions.QUOTATIONS_CREATE)
  async acceptQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<QuotationResponse> {
    return this.quotationsService.acceptQuotation(tenantId, id, userId || 'usr_anonymous');
  }

  @Post(':id/cancel')
  @RequirePermission(StandardPermissions.QUOTATIONS_CREATE)
  async cancelQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<QuotationResponse> {
    return this.quotationsService.cancelQuotation(tenantId, id, userId || 'usr_anonymous');
  }

  @Post(':id/convert')
  @RequirePermission(StandardPermissions.QUOTATIONS_CONVERT)
  async convertQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SalesOrderResponse> {
    const parseResult = ConvertQuotationSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid quotation conversion payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.quotationsService.convertQuotation(
      tenantId,
      id,
      userId || 'usr_anonymous',
      parseResult.data as ConvertQuotationRequest,
    );
  }
}
