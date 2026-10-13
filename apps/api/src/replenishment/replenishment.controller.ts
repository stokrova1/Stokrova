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
import { ReplenishmentService } from './replenishment.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateReplenishmentRuleSchema,
  UpdateReplenishmentRuleSchema,
  EvaluateReplenishmentSchema,
  ApproveRecommendationSchema,
  ConvertRecommendationSchema,
} from '@stokrova/validation';
import type {
  ReplenishmentRuleResponse,
  ListReplenishmentRulesResponse,
  CreateReplenishmentRuleRequest,
  UpdateReplenishmentRuleRequest,
  EvaluateReplenishmentRequest,
  EvaluateReplenishmentResponse,
  ApproveRecommendationRequest,
  ConvertRecommendationRequest,
  RecommendationResponse,
  ListRecommendationsResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('replenishment')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class ReplenishmentController {
  constructor(private readonly replenishmentService: ReplenishmentService) {}

  // --------------------------------------------------------------------------
  // Replenishment Rules
  // --------------------------------------------------------------------------

  @Post('rules')
  @RequirePermission(StandardPermissions.REPLENISHMENT_MANAGE)
  async createRule(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateReplenishmentRuleRequest,
  ): Promise<ReplenishmentRuleResponse> {
    CreateReplenishmentRuleSchema.parse(body);
    return this.replenishmentService.createRule(tenantId, body);
  }

  @Get('rules')
  @RequirePermission(StandardPermissions.REPLENISHMENT_VIEW)
  async listRules(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListReplenishmentRulesResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.replenishmentService.listRules(tenantId, warehouseId);
  }

  @Get('rules/:id')
  @RequirePermission(StandardPermissions.REPLENISHMENT_VIEW)
  async getRuleById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ReplenishmentRuleResponse> {
    return this.replenishmentService.getRuleById(tenantId, id);
  }

  @Patch('rules/:id')
  @RequirePermission(StandardPermissions.REPLENISHMENT_MANAGE)
  async updateRule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateReplenishmentRuleRequest,
  ): Promise<ReplenishmentRuleResponse> {
    UpdateReplenishmentRuleSchema.parse(body);
    return this.replenishmentService.updateRule(tenantId, id, body);
  }

  // --------------------------------------------------------------------------
  // Evaluation & Reorder Generation
  // --------------------------------------------------------------------------

  @Post('evaluate')
  @RequirePermission(StandardPermissions.REPLENISHMENT_MANAGE)
  async evaluateReplenishment(
    @CurrentTenant() tenantId: string,
    @Body() body: EvaluateReplenishmentRequest,
  ): Promise<EvaluateReplenishmentResponse> {
    EvaluateReplenishmentSchema.parse(body);
    return this.replenishmentService.evaluateReplenishment(tenantId, body);
  }

  // --------------------------------------------------------------------------
  // Recommendations Management
  // --------------------------------------------------------------------------

  @Get('recommendations')
  @RequirePermission(StandardPermissions.REPLENISHMENT_VIEW)
  async listRecommendations(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListRecommendationsResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.replenishmentService.listRecommendations(tenantId, warehouseId);
  }

  @Get('recommendations/:id')
  @RequirePermission(StandardPermissions.REPLENISHMENT_VIEW)
  async getRecommendationById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<RecommendationResponse> {
    return this.replenishmentService.getRecommendationById(tenantId, id);
  }

  @Post('recommendations/:id/approve')
  @RequirePermission(StandardPermissions.REPLENISHMENT_MANAGE)
  async approveRecommendation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: ApproveRecommendationRequest,
  ): Promise<RecommendationResponse> {
    ApproveRecommendationSchema.parse(body);
    return this.replenishmentService.approveRecommendation(tenantId, id, body);
  }

  @Post('recommendations/:id/convert')
  @RequirePermission(StandardPermissions.REPLENISHMENT_MANAGE)
  async convertRecommendation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: ConvertRecommendationRequest,
  ): Promise<RecommendationResponse> {
    ConvertRecommendationSchema.parse(body);
    return this.replenishmentService.convertRecommendation(tenantId, id, body);
  }

  @Post('recommendations/:id/reject')
  @RequirePermission(StandardPermissions.REPLENISHMENT_MANAGE)
  async rejectRecommendation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<RecommendationResponse> {
    return this.replenishmentService.rejectRecommendation(tenantId, id);
  }
}
