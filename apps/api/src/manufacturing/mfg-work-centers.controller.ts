import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateMfgWorkCenterRequest,
  UpdateMfgWorkCenterRequest,
  MfgWorkCenterResponse,
  ListMfgWorkCentersResponse,
} from '@stokrova/contracts';
import {
  CreateMfgWorkCenterSchema,
  UpdateMfgWorkCenterSchema,
} from '@stokrova/validation';
import { MfgWorkCentersService } from './mfg-work-centers.service.js';
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

@Controller('tenants/:tenantId/manufacturing/work-centers')
export class MfgWorkCentersController {
  constructor(private readonly workCentersService: MfgWorkCentersService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateMfgWorkCenterSchema)) body: CreateMfgWorkCenterRequest,
  ): Promise<MfgWorkCenterResponse> {
    const work_center = await this.workCentersService.createWorkCenter(tenantId, body);
    return { work_center };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<MfgWorkCenterResponse> {
    const work_center = await this.workCentersService.getWorkCenterById(tenantId, id);
    return { work_center };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('warehouse_id') warehouseId?: string,
  ): Promise<ListMfgWorkCentersResponse> {
    const work_centers = await this.workCentersService.listWorkCenters(tenantId, warehouseId);
    return { work_centers };
  }

  @Patch(':id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMfgWorkCenterSchema)) body: UpdateMfgWorkCenterRequest,
  ): Promise<MfgWorkCenterResponse> {
    const work_center = await this.workCentersService.updateWorkCenter(tenantId, id, body);
    return { work_center };
  }
}
