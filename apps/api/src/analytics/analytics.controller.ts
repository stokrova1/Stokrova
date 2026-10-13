import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import type {
  AbcAnalysisResult,
  CashierDiscrepancySummary,
  DeadStockReport,
  DemandForecastProjection,
  ExecutiveDashboardSummary,
  InventoryTurnoverMetrics,
} from '@stokrova/contracts';
import type {
  GenerateDemandForecastDto,
  GetCashierDiscrepancyQueryDto,
  GetDeadStockQueryDto,
  GetExecutiveDashboardQueryDto,
  GetTurnoverMetricsQueryDto,
  RunAbcAnalysisDto,
} from '@stokrova/validation';

@Controller('analytics')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('abc/run')
  @RequirePermission(StandardPermissions.ANALYTICS_RUN)
  async runAbcAnalysis(
    @CurrentTenant() tenant: { id: string },
    @Query('company_id') companyId: string,
    @Body() dto: RunAbcAnalysisDto
  ): Promise<AbcAnalysisResult> {
    return this.analyticsService.runAbcAnalysis(tenant.id, companyId ?? tenant.id, dto);
  }

  @Get('abc/:id')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async getAbcSnapshot(
    @CurrentTenant() tenant: { id: string },
    @Param('id') snapshotId: string
  ) {
    return this.analyticsService.getAbcSnapshot(tenant.id, snapshotId);
  }

  @Get('dead-stock')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async getDeadStock(
    @CurrentTenant() tenant: { id: string },
    @Query('company_id') companyId: string,
    @Query() query: GetDeadStockQueryDto
  ): Promise<DeadStockReport> {
    return this.analyticsService.getDeadStockReport(tenant.id, companyId ?? tenant.id, query);
  }

  @Post('forecast')
  @RequirePermission(StandardPermissions.ANALYTICS_RUN)
  async generateForecast(
    @CurrentTenant() tenant: { id: string },
    @Query('company_id') companyId: string,
    @Body() dto: GenerateDemandForecastDto
  ): Promise<DemandForecastProjection> {
    return this.analyticsService.generateDemandForecast(tenant.id, companyId ?? tenant.id, dto);
  }

  @Get('turnover')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async getTurnover(
    @CurrentTenant() tenant: { id: string },
    @Query('company_id') companyId: string,
    @Query() query: GetTurnoverMetricsQueryDto
  ): Promise<InventoryTurnoverMetrics> {
    return this.analyticsService.getInventoryTurnover(tenant.id, companyId ?? tenant.id, query);
  }

  @Get('cashier-discrepancies')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async getCashierDiscrepancies(
    @CurrentTenant() tenant: { id: string },
    @Query('company_id') companyId: string,
    @Query() query: GetCashierDiscrepancyQueryDto
  ): Promise<CashierDiscrepancySummary[]> {
    return this.analyticsService.getCashierDiscrepancies(tenant.id, companyId ?? tenant.id, query);
  }

  @Get('dashboard')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async getExecutiveDashboard(
    @CurrentTenant() tenant: { id: string },
    @Query('company_id') companyId: string,
    @Query() query: GetExecutiveDashboardQueryDto
  ): Promise<ExecutiveDashboardSummary> {
    return this.analyticsService.getExecutiveDashboard(tenant.id, companyId ?? tenant.id, query);
  }
}
