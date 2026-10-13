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
  CreateManufacturingOrderRequest,
  RecordWorkOrderExecutionRequest,
  IssueMoComponentsRequest,
  CompleteManufacturingOrderRequest,
  RecordExecutionRunRequest,
  RecordOutputInspectionRequest,
  RecordScrapRequest,
  SubstituteComponentRequest,
  ManufacturingOrderResponse,
  ListManufacturingOrdersResponse,
  MaterialShortageReportResponse,
  MoExecutionRun,
  MoOutputInspection,
  MoScrapRecord,
  MoComponentSubstitution,
  BatchRecallTraceabilityResponse,
} from '@stokrova/contracts';
import {
  CreateManufacturingOrderSchema,
  RecordWorkOrderExecutionSchema,
  IssueMoComponentsSchema,
  CompleteManufacturingOrderSchema,
  RecordExecutionRunSchema,
  RecordOutputInspectionSchema,
  RecordScrapSchema,
  SubstituteComponentSchema,
} from '@stokrova/validation';
import { ManufacturingOrdersService } from './manufacturing-orders.service.js';
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

@Controller('tenants/:tenantId/manufacturing/orders')
export class ManufacturingOrdersController {
  constructor(private readonly moService: ManufacturingOrdersService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(CreateManufacturingOrderSchema))
    body: CreateManufacturingOrderRequest,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.createOrder(tenantId, body);
    return { order };
  }

  @Get(':id')
  async getById(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.getOrderById(tenantId, id);
    return { order };
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
  ): Promise<ListManufacturingOrdersResponse> {
    const orders = await this.moService.listOrders(tenantId);
    return { orders };
  }

  @Get(':id/shortages')
  async checkShortages(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<MaterialShortageReportResponse> {
    return this.moService.checkMaterialShortages(tenantId, id);
  }

  @Post(':id/confirm')
  async confirm(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.confirmOrder(tenantId, id);
    return { order };
  }

  @Post(':id/start')
  async start(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.startOrder(tenantId, id);
    return { order };
  }

  @Post(':id/work-orders/execute')
  async executeWorkOrder(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordWorkOrderExecutionSchema))
    body: RecordWorkOrderExecutionRequest,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.recordWorkOrderExecution(tenantId, id, body);
    return { order };
  }

  @Post(':id/issue-components')
  async issueComponents(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(IssueMoComponentsSchema))
    body: IssueMoComponentsRequest,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.issueComponents(tenantId, id, body);
    return { order };
  }

  @Post(':id/runs')
  async recordExecutionRun(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordExecutionRunSchema))
    body: RecordExecutionRunRequest,
  ): Promise<{ order: ManufacturingOrderResponse['order']; run: MoExecutionRun }> {
    return this.moService.recordExecutionRun(tenantId, id, body);
  }

  @Get(':id/runs')
  async listExecutionRuns(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ runs: MoExecutionRun[] }> {
    const runs = await this.moService.listExecutionRuns(tenantId, id);
    return { runs };
  }

  @Post(':id/inspections')
  async recordOutputInspection(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordOutputInspectionSchema))
    body: RecordOutputInspectionRequest,
  ): Promise<{ inspection: MoOutputInspection }> {
    const inspection = await this.moService.recordOutputInspection(tenantId, id, body);
    return { inspection };
  }

  @Get(':id/inspections')
  async listOutputInspections(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ inspections: MoOutputInspection[] }> {
    const inspections = await this.moService.listOutputInspections(tenantId, id);
    return { inspections };
  }

  @Post(':id/scrap')
  async recordScrap(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordScrapSchema))
    body: RecordScrapRequest,
  ): Promise<{ scrap: MoScrapRecord }> {
    const scrap = await this.moService.recordScrap(tenantId, id, body);
    return { scrap };
  }

  @Get(':id/scrap')
  async listScrap(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ scrap: MoScrapRecord[] }> {
    const scrap = await this.moService.listScrapRecords(tenantId, id);
    return { scrap };
  }

  @Post(':id/substitutions')
  async substituteComponent(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SubstituteComponentSchema))
    body: SubstituteComponentRequest,
  ): Promise<{ substitution: MoComponentSubstitution }> {
    const substitution = await this.moService.substituteComponent(tenantId, id, body);
    return { substitution };
  }

  @Post(':id/complete')
  async complete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CompleteManufacturingOrderSchema))
    body: CompleteManufacturingOrderRequest,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.completeOrder(tenantId, id, body);
    return { order };
  }

  @Post(':id/close')
  async close(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.closeOrder(tenantId, id);
    return { order };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<ManufacturingOrderResponse> {
    const order = await this.moService.cancelOrder(tenantId, id);
    return { order };
  }

  @Get('traceability/:targetType/:targetIdentifier')
  async getTraceability(
    @Param('tenantId') tenantId: string,
    @Param('targetType') targetType: 'COMPONENT_BATCH' | 'FINISHED_LOT',
    @Param('targetIdentifier') targetIdentifier: string,
  ): Promise<BatchRecallTraceabilityResponse> {
    return this.moService.getGenealogy(tenantId, targetType, targetIdentifier);
  }
}
