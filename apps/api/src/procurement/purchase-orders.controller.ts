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
  CreatePurchaseOrderRequest,
  SubmitPurchaseOrderForApprovalRequest,
  ApprovePurchaseOrderRequest,
  RejectPurchaseOrderRequest,
  CancelPurchaseOrderRequest,
  PurchaseOrderResponse,
  ListPurchaseOrdersResponse,
  PurchaseOrderStatus,
} from '@stokrova/contracts';
import {
  CreatePurchaseOrderSchema,
  SubmitPurchaseOrderForApprovalSchema,
  ApprovePurchaseOrderSchema,
  RejectPurchaseOrderSchema,
  CancelPurchaseOrderSchema,
} from '@stokrova/validation';
import { PurchaseOrdersService } from './purchase-orders.service.js';
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

@Controller('tenants/:tenantId/procurement/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreatePurchaseOrderSchema)) body: CreatePurchaseOrderRequest,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.poService.create(tenantId, body);
    return { order };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.poService.getById(tenantId, id);
    return { order };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('supplier_id') supplierId?: string,
    @Query('status') status?: PurchaseOrderStatus,
  ): Promise<ListPurchaseOrdersResponse> {
    const orders = await this.poService.list(tenantId, supplierId, status);
    return { orders };
  }

  @Post(':id/submit-approval')
  async submitForApproval(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SubmitPurchaseOrderForApprovalSchema))
    body: SubmitPurchaseOrderForApprovalRequest,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.poService.submitForApproval(tenantId, id, body);
    return { order };
  }

  @Post(':id/approve')
  async approve(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ApprovePurchaseOrderSchema))
    body: ApprovePurchaseOrderRequest,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.poService.approve(tenantId, id, body);
    return { order };
  }

  @Post(':id/reject')
  async reject(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RejectPurchaseOrderSchema))
    body: RejectPurchaseOrderRequest,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.poService.reject(tenantId, id, body);
    return { order };
  }

  @Post(':id/issue')
  async issue(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.poService.issue(tenantId, id);
    return { order };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelPurchaseOrderSchema))
    body: CancelPurchaseOrderRequest,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.poService.cancel(tenantId, id, body);
    return { order };
  }
}
