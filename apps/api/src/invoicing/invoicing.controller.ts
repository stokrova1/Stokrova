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
import { InvoicingService } from './invoicing.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateSalesInvoiceSchema,
  VoidSalesInvoiceSchema,
} from '@stokrova/validation';
import type {
  CreateSalesInvoiceRequest,
  VoidSalesInvoiceRequest,
  SalesInvoiceResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('v1/invoices')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Post()
  @RequirePermission(StandardPermissions.INVOICES_CREATE)
  async createInvoice(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<SalesInvoiceResponse> {
    const parseResult = CreateSalesInvoiceSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid sales invoice payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.invoicingService.createInvoice(
      tenantId,
      userId || 'usr_anonymous',
      parseResult.data as CreateSalesInvoiceRequest,
    );
  }

  @Get()
  @RequirePermission(StandardPermissions.INVOICES_VIEW)
  async listInvoices(
    @CurrentTenant() tenantId: string,
    @Query('order_id') orderId?: string,
    @Query('customer_id') customerId?: string,
    @Query('status') status?: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'CREDITED',
  ): Promise<SalesInvoiceResponse[]> {
    return this.invoicingService.listInvoices(tenantId, {
      order_id: orderId,
      customer_id: customerId,
      status,
    });
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.INVOICES_VIEW)
  async getInvoiceById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<SalesInvoiceResponse> {
    return this.invoicingService.getInvoiceById(tenantId, id);
  }

  @Post(':id/void')
  @RequirePermission(StandardPermissions.INVOICES_MANAGE)
  async voidInvoice(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SalesInvoiceResponse> {
    const parseResult = VoidSalesInvoiceSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid void invoice payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.invoicingService.voidInvoice(
      tenantId,
      id,
      userId || 'usr_anonymous',
      parseResult.data as VoidSalesInvoiceRequest,
    );
  }
}
