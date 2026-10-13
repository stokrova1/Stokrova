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
  CreateGoodsReceiptRequest,
  InspectGoodsReceiptRequest,
  GoodsReceiptResponse,
  ListGoodsReceiptsResponse,
} from '@stokrova/contracts';
import {
  CreateGoodsReceiptSchema,
  InspectGoodsReceiptSchema,
} from '@stokrova/validation';
import { GoodsReceiptService } from './goods-receipt.service.js';
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

@Controller('tenants/:tenantId/procurement/goods-receipts')
export class GoodsReceiptController {
  constructor(private readonly grnService: GoodsReceiptService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateGoodsReceiptSchema)) body: CreateGoodsReceiptRequest,
  ): Promise<GoodsReceiptResponse> {
    const receipt = await this.grnService.create(tenantId, body);
    return { receipt };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<GoodsReceiptResponse> {
    const receipt = await this.grnService.getById(tenantId, id);
    return { receipt };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('purchase_order_id') poId?: string,
  ): Promise<ListGoodsReceiptsResponse> {
    const receipts = await this.grnService.list(tenantId, poId);
    return { receipts };
  }

  @Post(':id/inspect')
  async inspect(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(InspectGoodsReceiptSchema)) body: InspectGoodsReceiptRequest,
  ): Promise<GoodsReceiptResponse> {
    const receipt = await this.grnService.inspect(tenantId, id, body);
    return { receipt };
  }

  @Post(':id/complete')
  async complete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<GoodsReceiptResponse> {
    const receipt = await this.grnService.complete(tenantId, id);
    return { receipt };
  }
}
