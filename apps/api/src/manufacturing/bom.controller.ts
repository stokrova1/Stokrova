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
  CreateBillOfMaterialsRequest,
  BillOfMaterialsResponse,
  ListBillOfMaterialsResponse,
  ExplodeBomResponse,
} from '@stokrova/contracts';
import { CreateBillOfMaterialsSchema } from '@stokrova/validation';
import { BomService } from './bom.service.js';
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

@Controller('tenants/:tenantId/manufacturing/boms')
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateBillOfMaterialsSchema)) body: CreateBillOfMaterialsRequest,
  ): Promise<BillOfMaterialsResponse> {
    const bom = await this.bomService.createBom(tenantId, body);
    return { bom };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<BillOfMaterialsResponse> {
    const bom = await this.bomService.getBomById(tenantId, id);
    return { bom };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('variant_id') variantId?: string,
  ): Promise<ListBillOfMaterialsResponse> {
    const boms = await this.bomService.listBoms(tenantId, variantId);
    return { boms };
  }

  @Get('variant/:variantId/explode')
  async explode(
    @Param('tenantId') tenantId: string,
    @Param('variantId') variantId: string,
    @Query('quantity') quantity?: string,
  ): Promise<ExplodeBomResponse> {
    const targetQty = quantity ? parseInt(quantity, 10) : 1;
    return this.bomService.explodeBom(tenantId, variantId, targetQty > 0 ? targetQty : 1);
  }
}
