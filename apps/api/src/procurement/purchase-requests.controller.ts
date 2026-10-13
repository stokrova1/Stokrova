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
  PurchaseRequest,
  CreatePurchaseRequestInput,
  ApprovePurchaseRequestInput,
  ConvertPurchaseRequestInput,
  PurchaseOrder,
  PurchaseRequestStatus,
} from '@stokrova/contracts';
import {
  CreatePurchaseRequestSchema,
  ApprovePurchaseRequestSchema,
  ConvertPurchaseRequestSchema,
} from '@stokrova/validation';
import { PurchaseRequestsService } from './purchase-requests.service.js';
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

@Controller('tenants/:tenantId/procurement/purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly prService: PurchaseRequestsService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreatePurchaseRequestSchema)) body: CreatePurchaseRequestInput,
  ): Promise<{ request: PurchaseRequest }> {
    const request = await this.prService.create(tenantId, body);
    return { request };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: PurchaseRequestStatus,
  ): Promise<{ requests: PurchaseRequest[] }> {
    const requests = await this.prService.list(tenantId, { status });
    return { requests };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ request: PurchaseRequest }> {
    const request = await this.prService.getById(tenantId, id);
    return { request };
  }

  @Post(':id/submit')
  async submit(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ request: PurchaseRequest }> {
    const request = await this.prService.submit(tenantId, id);
    return { request };
  }

  @Post(':id/approve')
  async approve(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ApprovePurchaseRequestSchema)) body: ApprovePurchaseRequestInput,
  ): Promise<{ request: PurchaseRequest }> {
    const request = await this.prService.approve(tenantId, id, body);
    return { request };
  }

  @Post(':id/reject')
  async reject(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { rejected_by: string; reason?: string },
  ): Promise<{ request: PurchaseRequest }> {
    const request = await this.prService.reject(tenantId, id, body.rejected_by, body.reason);
    return { request };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { cancelled_by?: string; reason?: string },
  ): Promise<{ request: PurchaseRequest }> {
    const request = await this.prService.cancel(tenantId, id, body.cancelled_by, body.reason);
    return { request };
  }

  @Post(':id/convert')
  async convert(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ConvertPurchaseRequestSchema)) body: ConvertPurchaseRequestInput,
  ): Promise<{ request: PurchaseRequest; order: PurchaseOrder }> {
    return this.prService.convertToPurchaseOrder(tenantId, id, body);
  }
}
