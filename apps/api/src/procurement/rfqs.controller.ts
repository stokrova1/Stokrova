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
  PurchaseRfq,
  CreatePurchaseRfqInput,
  PurchaseRfqStatus,
} from '@stokrova/contracts';
import { CreatePurchaseRfqSchema } from '@stokrova/validation';
import { RfqsService } from './rfqs.service.js';
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

@Controller('tenants/:tenantId/procurement/rfqs')
export class RfqsController {
  constructor(private readonly rfqsService: RfqsService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreatePurchaseRfqSchema)) body: CreatePurchaseRfqInput,
  ): Promise<{ rfq: PurchaseRfq }> {
    const rfq = await this.rfqsService.create(tenantId, body);
    return { rfq };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: PurchaseRfqStatus,
  ): Promise<{ rfqs: PurchaseRfq[] }> {
    const rfqs = await this.rfqsService.list(tenantId, { status });
    return { rfqs };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ rfq: PurchaseRfq }> {
    const rfq = await this.rfqsService.getById(tenantId, id);
    return { rfq };
  }

  @Post(':id/issue')
  async issue(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ rfq: PurchaseRfq }> {
    const rfq = await this.rfqsService.issue(tenantId, id);
    return { rfq };
  }

  @Post(':id/close')
  async close(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ rfq: PurchaseRfq }> {
    const rfq = await this.rfqsService.close(tenantId, id);
    return { rfq };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<{ rfq: PurchaseRfq }> {
    const rfq = await this.rfqsService.cancel(tenantId, id, body.reason);
    return { rfq };
  }
}
