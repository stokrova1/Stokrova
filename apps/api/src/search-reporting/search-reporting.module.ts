import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { AuditForensicsService } from './audit-forensics.service.js';
import { DataExportService } from './data-export.service.js';
import { ReportingService } from './reporting.service.js';
import { ComplianceService } from './compliance.service.js';
import { SearchReportingController } from './search-reporting.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [SearchReportingController],
  providers: [
    SearchService,
    AuditForensicsService,
    DataExportService,
    ReportingService,
    ComplianceService,
  ],
  exports: [
    SearchService,
    AuditForensicsService,
    DataExportService,
    ReportingService,
    ComplianceService,
  ],
})
export class SearchReportingModule {}
