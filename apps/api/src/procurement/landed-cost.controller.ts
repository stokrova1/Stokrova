import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateLandedCostVoucherRequest,
  LandedCostVoucherResponse,
  ListLandedCostVouchersResponse,
} from '@stokrova/contracts';
import { CreateLandedCostVoucherSchema } from '@stokrova/validation';
import { LandedCostService } from './landed-cost.service.js';
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

@Controller('tenants/:tenantId/procurement/landed-costs')
export class LandedCostController {
  constructor(private readonly landedCostService: LandedCostService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateLandedCostVoucherSchema))
    body: CreateLandedCostVoucherRequest,
  ): Promise<LandedCostVoucherResponse> {
    const voucher = await this.landedCostService.create(tenantId, body);
    return { voucher };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<LandedCostVoucherResponse> {
    const voucher = await this.landedCostService.getById(tenantId, id);
    return { voucher };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
  ): Promise<ListLandedCostVouchersResponse> {
    const vouchers = await this.landedCostService.list(tenantId);
    return { vouchers };
  }

  @Post(':id/post')
  async postVoucher(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('posted_by') postedBy: string,
  ): Promise<LandedCostVoucherResponse> {
    const voucher = await this.landedCostService.post(tenantId, id, postedBy || 'SYSTEM_FINANCE');
    return { voucher };
  }
}
