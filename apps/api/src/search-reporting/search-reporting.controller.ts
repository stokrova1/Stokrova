import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service.js';
import { AuditForensicsService } from './audit-forensics.service.js';
import { DataExportService } from './data-export.service.js';
import { ReportingService } from './reporting.service.js';
import { ComplianceService } from './compliance.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import type {
  AuditChainBlock,
  AuditChainVerificationResult,
  DataExportJob,
  GlobalSearchResponse,
  ReportExecutionResult,
  GdprErasureRequest,
  SodEvaluationResult,
  ComplianceReportExport,
} from '@stokrova/contracts';
import type {
  CreateDataExportDto,
  GlobalSearchQueryDto,
  RunCustomReportDto,
  GdprErasureRequestDto,
  SodEvaluationRequestDto,
  ComplianceReportQueryDto,
} from '@stokrova/validation';

@Controller('enterprise')
export class SearchReportingController {
  constructor(
    private readonly searchService: SearchService,
    private readonly auditService: AuditForensicsService,
    private readonly exportService: DataExportService,
    private readonly reportingService: ReportingService,
    private readonly complianceService: ComplianceService
  ) {}

  @Get('search')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async search(
    @CurrentTenant() tenant: { id: string },
    @Query() query: GlobalSearchQueryDto
  ): Promise<GlobalSearchResponse> {
    return this.searchService.globalSearch(tenant.id, query);
  }

  @Post('audit/verify')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async verifyAuditChain(
    @CurrentTenant() tenant: { id: string }
  ): Promise<AuditChainVerificationResult> {
    return this.auditService.verifyAuditChain(tenant.id);
  }

  @Get('audit/blocks')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async getAuditBlocks(
    @CurrentTenant() tenant: { id: string }
  ): Promise<AuditChainBlock[]> {
    return this.auditService.getAuditBlocks(tenant.id);
  }

  @Post('export')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.ANALYTICS_RUN)
  async createExport(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: CreateDataExportDto
  ): Promise<DataExportJob> {
    return this.exportService.createExportJob(tenant.id, dto);
  }

  @Get('export/download/:token')
  async downloadExport(@Param('token') token: string) {
    return this.exportService.downloadExport(token);
  }

  @Post('reports/run')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async runReport(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: RunCustomReportDto
  ): Promise<ReportExecutionResult> {
    return this.reportingService.runReport(tenant.id, dto);
  }

  @Post('compliance/gdpr/erasure')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async processGdprErasure(
    @CurrentTenant() tenant: { id: string },
    @Body() body: { dto: GdprErasureRequestDto; record: Record<string, unknown> }
  ): Promise<{ request: GdprErasureRequest; pseudonymizedRecord: Record<string, unknown> }> {
    return this.complianceService.processGdprErasure(tenant.id, body.dto, body.record);
  }

  @Post('compliance/sox/evaluate-sod')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async evaluateSod(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: SodEvaluationRequestDto
  ): Promise<SodEvaluationResult> {
    return this.complianceService.evaluateSod(tenant.id, dto);
  }

  @Post('compliance/report')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async generateComplianceReport(
    @CurrentTenant() tenant: { id: string },
    @Body() query: ComplianceReportQueryDto
  ): Promise<ComplianceReportExport> {
    return this.complianceService.generateComplianceReport(tenant.id, query);
  }
}
