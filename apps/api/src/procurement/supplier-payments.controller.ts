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
  SupplierPayment,
  CreateSupplierPaymentInput,
} from '@stokrova/contracts';
import { CreateSupplierPaymentSchema } from '@stokrova/validation';
import { SupplierPaymentsService } from './supplier-payments.service.js';
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

@Controller('tenants/:tenantId/procurement/supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly paymentsService: SupplierPaymentsService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateSupplierPaymentSchema)) body: CreateSupplierPaymentInput,
  ): Promise<{ payment: SupplierPayment }> {
    const payment = await this.paymentsService.create(tenantId, body);
    return { payment };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('supplierId') supplierId?: string,
  ): Promise<{ payments: SupplierPayment[] }> {
    const payments = await this.paymentsService.list(tenantId, { supplierId });
    return { payments };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ payment: SupplierPayment }> {
    const payment = await this.paymentsService.getById(tenantId, id);
    return { payment };
  }
}
