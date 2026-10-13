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
  SupplierReturn,
  CreateSupplierReturnInput,
  AuthorizeSupplierReturnInput,
  DispatchSupplierReturnInput,
  SupplierReturnStatus,
} from '@stokrova/contracts';
import {
  CreateSupplierReturnSchema,
  AuthorizeSupplierReturnSchema,
  DispatchSupplierReturnSchema,
} from '@stokrova/validation';
import { SupplierReturnsService } from './supplier-returns.service.js';
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

@Controller('tenants/:tenantId/procurement/supplier-returns')
export class SupplierReturnsController {
  constructor(private readonly returnsService: SupplierReturnsService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateSupplierReturnSchema)) body: CreateSupplierReturnInput,
  ): Promise<{ return: SupplierReturn }> {
    const ret = await this.returnsService.create(tenantId, body);
    return { return: ret };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('supplierId') supplierId?: string,
    @Query('poId') poId?: string,
    @Query('status') status?: SupplierReturnStatus,
  ): Promise<{ returns: SupplierReturn[] }> {
    const returns = await this.returnsService.list(tenantId, {
      supplierId,
      poId,
      status,
    });
    return { returns };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ return: SupplierReturn }> {
    const ret = await this.returnsService.getById(tenantId, id);
    return { return: ret };
  }

  @Post(':id/authorize')
  async authorize(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AuthorizeSupplierReturnSchema)) body: AuthorizeSupplierReturnInput,
  ): Promise<{ return: SupplierReturn }> {
    const ret = await this.returnsService.authorize(tenantId, id, body);
    return { return: ret };
  }

  @Post(':id/dispatch')
  async dispatch(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(DispatchSupplierReturnSchema)) body: DispatchSupplierReturnInput,
  ): Promise<{ return: SupplierReturn }> {
    const ret = await this.returnsService.dispatch(tenantId, id, body);
    return { return: ret };
  }

  @Post(':id/complete')
  async complete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ return: SupplierReturn }> {
    const ret = await this.returnsService.complete(tenantId, id);
    return { return: ret };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<{ return: SupplierReturn }> {
    const ret = await this.returnsService.cancel(tenantId, id, body.reason);
    return { return: ret };
  }
}
