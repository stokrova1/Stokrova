import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { MetricDictionaryService } from './metric-dictionary.service.js';
import { ReportingEngineService } from './reporting-engine.service.js';
import { SavedReportsService } from './saved-reports.service.js';
import { DashboardsService } from './dashboards.service.js';
import { ReportSchedulerService } from './report-scheduler.service.js';
import { ReportExportService } from './report-export.service.js';
import { ProjectionsService } from './projections.service.js';
import { ReportingController } from './reporting.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [AnalyticsController, ReportingController],
  providers: [
    AnalyticsService,
    MetricDictionaryService,
    ReportingEngineService,
    SavedReportsService,
    DashboardsService,
    ReportSchedulerService,
    ReportExportService,
    ProjectionsService,
  ],
  exports: [
    AnalyticsService,
    MetricDictionaryService,
    ReportingEngineService,
    SavedReportsService,
    DashboardsService,
    ReportSchedulerService,
    ReportExportService,
    ProjectionsService,
  ],
})
export class AnalyticsModule {}
