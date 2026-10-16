import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RmaService } from './rma.service.js';
import { QualityInspectionService } from './quality-inspection.service.js';
import { DispositionService } from './disposition.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateRmaSchema,
  UpdateRmaSchema,
  ApproveRmaSchema,
  RejectRmaSchema,
  ReceiveRmaSchema,
  PerformQualityInspectionSchema,
  ExecuteDispositionSchema,
} from '@stokrova/validation';
import type {
  RmaResponse,
  ListRmasResponse,
  CreateRmaRequest,
  UpdateRmaRequest,
  ApproveRmaRequest,
  RejectRmaRequest,
  ReceiveRmaRequest,
  QualityInspectionResponse,
  ListQualityInspectionsResponse,
  PerformQualityInspectionRequest,
  DispositionResponse,
  ListDispositionsResponse,
  ExecuteDispositionRequest,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('returns')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class ReturnsController {
  constructor(
    private readonly rmaService: RmaService,
    private readonly qcService: QualityInspectionService,
    private readonly dispositionService: DispositionService,
  ) {}

  // --------------------------------------------------------------------------
  // Specialized Routes (Declared before :id to prevent route shadowing)
  // --------------------------------------------------------------------------

  @Post('inspections')
  @RequirePermission(StandardPermissions.RETURNS_MANAGE)
  async performInspection(
    @CurrentTenant() tenantId: string,
    @Body() body: PerformQualityInspectionRequest,
  ): Promise<QualityInspectionResponse> {
    PerformQualityInspectionSchema.parse(body);
    return this.qcService.performInspection(tenantId, body);
  }

  @Get('inspections/:id')
  @RequirePermission(StandardPermissions.RETURNS_VIEW)
  async getInspectionById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<QualityInspectionResponse> {
    return this.qcService.getInspectionById(tenantId, id);
  }

  @Post('dispositions')
  @RequirePermission(StandardPermissions.RETURNS_MANAGE)
  async executeDisposition(
    @CurrentTenant() tenantId: string,
    @Body() body: ExecuteDispositionRequest,
  ): Promise<DispositionResponse> {
    ExecuteDispositionSchema.parse(body);
    return this.dispositionService.executeDisposition(tenantId, body);
  }

  @Get('dispositions/:id')
  @RequirePermission(StandardPermissions.RETURNS_VIEW)
  async getDispositionById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DispositionResponse> {
    return this.dispositionService.getDispositionById(tenantId, id);
  }

  // --------------------------------------------------------------------------
  // RMA Collection Routes
  // --------------------------------------------------------------------------

  @Post()
  @RequirePermission(StandardPermissions.RETURNS_CREATE)
  async createRma(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateRmaRequest,
  ): Promise<RmaResponse> {
    CreateRmaSchema.parse(body);
    return this.rmaService.createRma(tenantId, body);
  }

  @Get()
  @RequirePermission(StandardPermissions.RETURNS_VIEW)
  async listRmas(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListRmasResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.rmaService.listRmas(tenantId, warehouseId);
  }

  // --------------------------------------------------------------------------
  // RMA Individual & Action Routes
  // --------------------------------------------------------------------------

  @Get(':id')
  @RequirePermission(StandardPermissions.RETURNS_VIEW)
  async getRmaById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<RmaResponse> {
    return this.rmaService.getRmaById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission(StandardPermissions.RETURNS_MANAGE)
  async updateRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateRmaRequest,
  ): Promise<RmaResponse> {
    UpdateRmaSchema.parse(body);
    return this.rmaService.updateRma(tenantId, id, body);
  }

  @Post(':id/request')
  @RequirePermission(StandardPermissions.RETURNS_CREATE)
  async requestRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<RmaResponse> {
    return this.rmaService.requestRma(tenantId, id);
  }

  @Post(':id/approve')
  @RequirePermission(StandardPermissions.RETURNS_MANAGE)
  async approveRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: ApproveRmaRequest,
  ): Promise<RmaResponse> {
    ApproveRmaSchema.parse(body);
    return this.rmaService.approveRma(tenantId, id, body);
  }

  @Post(':id/reject')
  @RequirePermission(StandardPermissions.RETURNS_MANAGE)
  async rejectRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: RejectRmaRequest,
  ): Promise<RmaResponse> {
    RejectRmaSchema.parse(body);
    return this.rmaService.rejectRma(tenantId, id, body);
  }

  @Post(':id/receive')
  @RequirePermission(StandardPermissions.RETURNS_MANAGE)
  async receiveRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: ReceiveRmaRequest,
  ): Promise<RmaResponse> {
    ReceiveRmaSchema.parse(body);
    return this.rmaService.receiveRma(tenantId, id, body);
  }

  @Post(':id/cancel')
  @RequirePermission(StandardPermissions.RETURNS_MANAGE)
  async cancelRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<RmaResponse> {
    return this.rmaService.cancelRma(tenantId, id);
  }

  @Get(':id/inspections')
  @RequirePermission(StandardPermissions.RETURNS_VIEW)
  async listInspectionsByRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ListQualityInspectionsResponse> {
    return this.qcService.listInspectionsByRma(tenantId, id);
  }

  @Get(':id/dispositions')
  @RequirePermission(StandardPermissions.RETURNS_VIEW)
  async listDispositionsByRma(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ListDispositionsResponse> {
    return this.dispositionService.listDispositionsByRma(tenantId, id);
  }
}
