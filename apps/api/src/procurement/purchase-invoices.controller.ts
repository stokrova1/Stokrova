import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import {
  CreatePurchaseInvoiceRequest,
  PurchaseInvoiceResponse,
  ListPurchaseInvoicesResponse,
} from '@stokrova/contracts';
import { CreatePurchaseInvoiceSchema } from '@stokrova/validation';
import { PurchaseInvoicesService } from './purchase-invoices.service.js';
import { ZodSchema } from 'zod';

class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.errors);
    }
    return result.data;
  }
}

@Controller('tenants/:tenantId/procurement/purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private readonly invoicesService: PurchaseInvoicesService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreatePurchaseInvoiceSchema)) body: CreatePurchaseInvoiceRequest,
  ): Promise<PurchaseInvoiceResponse> {
    const invoice = await this.invoicesService.create(tenantId, body);
    return { invoice };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<PurchaseInvoiceResponse> {
    const invoice = await this.invoicesService.getById(tenantId, id);
    return { invoice };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('supplier_id') supplierId?: string,
    @Query('purchase_order_id') poId?: string,
  ): Promise<ListPurchaseInvoicesResponse> {
    const invoices = await this.invoicesService.list(tenantId, supplierId, poId);
    return { invoices };
  }

  @Post(':id/approve')
  async approve(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('approved_by') approvedBy: string,
  ): Promise<PurchaseInvoiceResponse> {
    const invoice = await this.invoicesService.approve(tenantId, id, approvedBy || 'SYSTEM_AP');
    return { invoice };
  }
}
