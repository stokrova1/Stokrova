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
  CreateRoutingRequest,
  RoutingResponse,
  ListRoutingsResponse,
} from '@stokrova/contracts';
import { CreateRoutingSchema } from '@stokrova/validation';
import { RoutingsService } from './routings.service.js';
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

@Controller('tenants/:tenantId/manufacturing/routings')
export class RoutingsController {
  constructor(private readonly routingsService: RoutingsService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateRoutingSchema)) body: CreateRoutingRequest,
  ): Promise<RoutingResponse> {
    const routing = await this.routingsService.createRouting(tenantId, body);
    return { routing };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<RoutingResponse> {
    const routing = await this.routingsService.getRoutingById(tenantId, id);
    return { routing };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
  ): Promise<ListRoutingsResponse> {
    const routings = await this.routingsService.listRoutings(tenantId);
    return { routings };
  }
}
