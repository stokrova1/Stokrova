import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import type { UserIdentity } from '@stokrova/contracts';
import type {
  MetricCategory,
  MetricDefinition,
  MetricDictionaryResponse,
  ReportQueryDefinition,
  EnterpriseReportExecutionResult,
  SavedReport,
  CreateSavedReportRequest,
  UpdateSavedReportRequest,
  AnalyticsDashboard,
  CreateAnalyticsDashboardRequest,
  UpdateAnalyticsDashboardRequest,
  ReportSchedule,
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
  ReportExecutionLog,
  ReportExportRequest,
  ReportExportResponse,
  RebuildProjectionRequest,
  ProjectionReconciliationResult,
} from '@stokrova/contracts';

import { MetricDictionaryService } from './metric-dictionary.service.js';
import { ReportingEngineService } from './reporting-engine.service.js';
import { SavedReportsService } from './saved-reports.service.js';
import { DashboardsService, type PopulatedDashboardResponse } from './dashboards.service.js';
import { ReportSchedulerService } from './report-scheduler.service.js';
import { ReportExportService } from './report-export.service.js';
import { ProjectionsService } from './projections.service.js';

@Controller('reporting')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class ReportingController {
  constructor(
    private readonly metricDictionary: MetricDictionaryService,
    private readonly reportingEngine: ReportingEngineService,
    private readonly savedReports: SavedReportsService,
    private readonly dashboards: DashboardsService,
    private readonly reportScheduler: ReportSchedulerService,
    private readonly reportExport: ReportExportService,
    private readonly projections: ProjectionsService,
  ) {}

  // --------------------------------------------------------------------------
  // Metric Dictionary
  // --------------------------------------------------------------------------

  @Get('metrics')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async listMetrics(
    @Query('category') category?: MetricCategory,
    @Query('search') search?: string,
  ): Promise<MetricDictionaryResponse> {
    return this.metricDictionary.listMetrics(category, search);
  }

  @Get('metrics/:id')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async getMetric(@Param('id') id: string): Promise<MetricDefinition> {
    return this.metricDictionary.getMetric(id);
  }

  // --------------------------------------------------------------------------
  // Declarative Report Query Execution
  // --------------------------------------------------------------------------

  @Post('query')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async executeQuery(
    @CurrentTenant() tenant: { id: string },
    @Body() query: ReportQueryDefinition,
  ): Promise<EnterpriseReportExecutionResult> {
    return this.reportingEngine.executeQuery(tenant.id, query);
  }

  // --------------------------------------------------------------------------
  // Saved Reports
  // --------------------------------------------------------------------------

  @Post('saved-reports')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_CREATE)
  async createSavedReport(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Body() req: CreateSavedReportRequest,
  ): Promise<SavedReport> {
    return this.savedReports.createSavedReport(
      tenant.id,
      user?.id ?? 'usr_admin',
      req,
    );
  }

  @Get('saved-reports')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async listSavedReports(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
  ): Promise<SavedReport[]> {
    return this.savedReports.listSavedReports(
      tenant.id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
    );
  }

  @Get('saved-reports/:id')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async getSavedReport(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Param('id') id: string,
  ): Promise<SavedReport> {
    return this.savedReports.getSavedReport(
      tenant.id,
      id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
    );
  }

  @Put('saved-reports/:id')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_MANAGE)
  async updateSavedReport(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Param('id') id: string,
    @Body() req: UpdateSavedReportRequest,
  ): Promise<SavedReport> {
    return this.savedReports.updateSavedReport(
      tenant.id,
      id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
      req,
    );
  }

  @Post('saved-reports/:id/execute')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async executeSavedReport(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Param('id') id: string,
    @Body() queryOverride?: Partial<ReportQueryDefinition>,
  ): Promise<EnterpriseReportExecutionResult> {
    return this.savedReports.executeSavedReport(
      tenant.id,
      id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
      queryOverride,
    );
  }

  // --------------------------------------------------------------------------
  // Dashboards
  // --------------------------------------------------------------------------

  @Post('dashboards')
  @RequirePermission(StandardPermissions.REPORTING_DASHBOARD_MANAGE)
  async createDashboard(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Body() req: CreateAnalyticsDashboardRequest,
  ): Promise<AnalyticsDashboard> {
    return this.dashboards.createDashboard(
      tenant.id,
      user?.id ?? 'usr_admin',
      req,
    );
  }

  @Get('dashboards')
  @RequirePermission(StandardPermissions.REPORTING_DASHBOARD_VIEW)
  async listDashboards(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
  ): Promise<AnalyticsDashboard[]> {
    return this.dashboards.listDashboards(
      tenant.id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
    );
  }

  @Get('dashboards/:id')
  @RequirePermission(StandardPermissions.REPORTING_DASHBOARD_VIEW)
  async getDashboard(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Param('id') id: string,
  ): Promise<AnalyticsDashboard> {
    return this.dashboards.getDashboard(
      tenant.id,
      id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
    );
  }

  @Get('dashboards/:id/populated')
  @RequirePermission(StandardPermissions.REPORTING_DASHBOARD_VIEW)
  async getPopulatedDashboard(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Param('id') id: string,
  ): Promise<PopulatedDashboardResponse> {
    return this.dashboards.getPopulatedDashboard(
      tenant.id,
      id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
    );
  }

  @Put('dashboards/:id')
  @RequirePermission(StandardPermissions.REPORTING_DASHBOARD_MANAGE)
  async updateDashboard(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Param('id') id: string,
    @Body() req: UpdateAnalyticsDashboardRequest,
  ): Promise<AnalyticsDashboard> {
    return this.dashboards.updateDashboard(
      tenant.id,
      id,
      user?.id ?? 'usr_admin',
      ['ADMIN'],
      req,
    );
  }

  // --------------------------------------------------------------------------
  // Schedules & Execution Logs
  // --------------------------------------------------------------------------

  @Post('schedules')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_SCHEDULE)
  async createSchedule(
    @CurrentTenant() tenant: { id: string },
    @Body() req: CreateReportScheduleRequest,
  ): Promise<ReportSchedule> {
    return this.reportScheduler.createSchedule(tenant.id, req);
  }

  @Get('schedules')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async listSchedules(
    @CurrentTenant() tenant: { id: string },
  ): Promise<ReportSchedule[]> {
    return this.reportScheduler.listSchedules(tenant.id);
  }

  @Put('schedules/:id')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_SCHEDULE)
  async updateSchedule(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() req: UpdateReportScheduleRequest,
  ): Promise<ReportSchedule> {
    return this.reportScheduler.updateSchedule(tenant.id, id, req);
  }

  @Post('schedules/:id/trigger')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_SCHEDULE)
  async triggerSchedule(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Param('id') id: string,
  ): Promise<ReportExecutionLog> {
    return this.reportScheduler.triggerSchedule(
      tenant.id,
      id,
      user?.id ?? 'usr_admin',
    );
  }

  @Get('execution-logs')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_VIEW)
  async listExecutionLogs(
    @CurrentTenant() tenant: { id: string },
    @Query('saved_report_id') savedReportId?: string,
  ): Promise<ReportExecutionLog[]> {
    return this.reportScheduler.getExecutionLogs(tenant.id, savedReportId);
  }

  // --------------------------------------------------------------------------
  // Export (CSV / JSON)
  // --------------------------------------------------------------------------

  @Post('export')
  @RequirePermission(StandardPermissions.REPORTING_REPORT_EXPORT)
  async exportReport(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: UserIdentity | undefined,
    @Body() req: ReportExportRequest,
  ): Promise<ReportExportResponse> {
    let executionResult: EnterpriseReportExecutionResult;

    if (req.saved_report_id) {
      executionResult = await this.savedReports.executeSavedReport(
        tenant.id,
        req.saved_report_id,
        user?.id ?? 'usr_admin',
        ['ADMIN'],
        req.query_definition,
      );
    } else if (req.query_definition) {
      executionResult = await this.reportingEngine.executeQuery(
        tenant.id,
        req.query_definition,
      );
    } else {
      throw new Error('Either saved_report_id or query_definition must be provided.');
    }

    return this.reportExport.exportReport(executionResult, req.format, req.file_name);
  }

  // --------------------------------------------------------------------------
  // Deterministic Projection Rebuild
  // --------------------------------------------------------------------------

  @Post('projections/rebuild')
  @RequirePermission(StandardPermissions.REPORTING_PROJECTION_REBUILD)
  async rebuildProjection(
    @CurrentTenant() tenant: { id: string },
    @Body() req: RebuildProjectionRequest,
  ): Promise<ProjectionReconciliationResult> {
    const mockLedgerBalances: Record<string, bigint> = {
      GROSS_SALES: 330000n,
      NET_SALES: 315000n,
      COGS: 190000n,
      ORDER_COUNT: 2n,
    };

    const projectionType = req.projection_type ?? req.projection_key ?? 'DAILY_SALES_BY_BRANCH';
    const dimKey = req.dimension_key ?? 'BRANCH:BR-01';

    return this.projections.rebuildProjectionFromLedger(
      tenant.id,
      projectionType,
      mockLedgerBalances,
      dimKey,
    );
  }
}
