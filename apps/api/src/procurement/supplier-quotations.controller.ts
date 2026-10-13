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
  SupplierQuotation,
  CreateSupplierQuotationInput,
  SupplierQuotationComparisonResult,
  SupplierQuotationStatus,
  PurchaseOrder,
} from '@stokrova/contracts';
import { CreateSupplierQuotationSchema } from '@stokrova/validation';
import { SupplierQuotationsService } from './supplier-quotations.service.js';
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

@Controller('tenants/:tenantId/procurement/supplier-quotations')
export class SupplierQuotationsController {
  constructor(private readonly quotationsService: SupplierQuotationsService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateSupplierQuotationSchema)) body: CreateSupplierQuotationInput,
  ): Promise<{ quotation: SupplierQuotation }> {
    const quotation = await this.quotationsService.create(tenantId, body);
    return { quotation };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('supplierId') supplierId?: string,
    @Query('rfqId') rfqId?: string,
    @Query('status') status?: SupplierQuotationStatus,
  ): Promise<{ quotations: SupplierQuotation[] }> {
    const quotations = await this.quotationsService.list(tenantId, {
      supplierId,
      rfqId,
      status,
    });
    return { quotations };
  }

  @Get('compare/:rfqId')
  async compare(
    @Param('tenantId') tenantId: string,
    @Param('rfqId') rfqId: string,
  ): Promise<SupplierQuotationComparisonResult> {
    return this.quotationsService.compare(tenantId, rfqId);
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ quotation: SupplierQuotation }> {
    const quotation = await this.quotationsService.getById(tenantId, id);
    return { quotation };
  }

  @Post(':id/select')
  async select(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ quotation: SupplierQuotation }> {
    const quotation = await this.quotationsService.select(tenantId, id);
    return { quotation };
  }

  @Post(':id/reject')
  async reject(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ quotation: SupplierQuotation }> {
    const quotation = await this.quotationsService.reject(tenantId, id);
    return { quotation };
  }

  @Post(':id/convert')
  async convert(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { destination_warehouse_id: string },
  ): Promise<{ quotation: SupplierQuotation; order: PurchaseOrder }> {
    if (!body?.destination_warehouse_id) {
      throw new BadRequestException('destination_warehouse_id is required');
    }
    return this.quotationsService.convertToPurchaseOrder(
      tenantId,
      id,
      body.destination_warehouse_id,
    );
  }
}
