import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  SavedReport,
  ReportDefinition,
  CreateSavedReportRequest,
  UpdateSavedReportRequest,
  EnterpriseReportExecutionResult,
  ReportQueryDefinition,
} from '@stokrova/contracts';
import {
  CreateSavedReportSchema,
  UpdateSavedReportSchema,
} from '@stokrova/validation';
import { ReportingEngineService } from './reporting-engine.service.js';

@Injectable()
export class SavedReportsService {
  private readonly savedReports = new Map<string, SavedReport>();
  private readonly reportDefinitions = new Map<string, ReportDefinition>();

  constructor(private readonly reportingEngine: ReportingEngineService) {
    this.seedSystemReportDefinitions();
  }

  private seedSystemReportDefinitions(): void {
    const sysDefinitions: ReportDefinition[] = [
      {
        id: 'rep_def_sales_perf',
        tenant_id: 'SYSTEM',
        code: 'SYS_SALES_PERFORMANCE',
        name: 'Sales Performance Overview',
        description: 'Comprehensive branch and channel performance report with margin breakdown.',
        category: 'SALES',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES', 'NET_SALES', 'COGS', 'GROSS_MARGIN_RATIO'],
          dimensions: ['BRANCH', 'CATEGORY'],
        },
        required_permission: 'reporting.sales.view',
        is_system: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'rep_def_inventory_valuation',
        tenant_id: 'SYSTEM',
        code: 'SYS_INVENTORY_VALUATION',
        name: 'Inventory Valuation by Warehouse',
        description: 'Current stock holding value, velocity, and turnover metrics.',
        category: 'INVENTORY',
        query_definition: {
          source: 'stock_ledger',
          metrics: ['INVENTORY_VALUATION_FIFO', 'ON_HAND_COUNT'],
          dimensions: ['WAREHOUSE', 'CATEGORY'],
        },
        required_permission: 'reporting.inventory.view',
        is_system: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const def of sysDefinitions) {
      this.reportDefinitions.set(def.id, def);
    }
  }

  /**
   * Create a new saved report with access boundaries.
   */
  async createSavedReport(
    tenantId: string,
    userId: string,
    req: CreateSavedReportRequest,
  ): Promise<SavedReport> {
    const parsed = CreateSavedReportSchema.parse(req);

    const reportId = `rep_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    const queryDef = parsed.query_definition as ReportQueryDefinition;
    const roles = parsed.shared_roles ?? [];

    const savedReport: SavedReport = {
      id: reportId,
      tenant_id: tenantId,
      name: parsed.name,
      description: parsed.description ?? undefined,
      report_definition_id: parsed.report_definition_id ?? undefined,
      query: queryDef,
      query_definition: queryDef,
      sharing_scope: parsed.sharing_scope,
      shared_roles: roles,
      allowed_roles: roles,
      created_by: userId,
      is_active: true,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    this.savedReports.set(reportId, savedReport);
    return savedReport;
  }

  /**
   * List saved reports accessible to user based on sharing scope and roles.
   */
  async listSavedReports(
    tenantId: string,
    userId: string,
    userRoles: string[] = [],
  ): Promise<SavedReport[]> {
    const reports: SavedReport[] = [];

    for (const report of this.savedReports.values()) {
      if (report.tenant_id !== tenantId || report.is_active === false) {
        continue;
      }

      if (this.isReportAccessible(report, userId, userRoles)) {
        reports.push(report);
      }
    }

    return reports;
  }

  /**
   * Retrieve a saved report by ID with scope validation.
   */
  async getSavedReport(
    tenantId: string,
    reportId: string,
    userId: string,
    userRoles: string[] = [],
  ): Promise<SavedReport> {
    const report = this.savedReports.get(reportId);
    if (!report || report.tenant_id !== tenantId || report.is_active === false) {
      throw new NotFoundException(`Saved report '${reportId}' not found.`);
    }

    if (!this.isReportAccessible(report, userId, userRoles)) {
      throw new ForbiddenException(
        `User is not authorized to access private or restricted saved report '${reportId}'.`,
      );
    }

    return report;
  }

  /**
   * Update saved report.
   */
  async updateSavedReport(
    tenantId: string,
    reportId: string,
    userId: string,
    userRoles: string[],
    req: UpdateSavedReportRequest,
  ): Promise<SavedReport> {
    const report = await this.getSavedReport(tenantId, reportId, userId, userRoles);
    const parsed = UpdateSavedReportSchema.parse(req);

    if (report.created_by !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Only the author or administrator can modify this report.');
    }

    const updatedQuery = (parsed.query_definition as ReportQueryDefinition) ?? report.query_definition ?? report.query;
    const roles = parsed.shared_roles ?? report.shared_roles ?? [];

    const updated: SavedReport = {
      ...report,
      name: parsed.name ?? report.name,
      description: parsed.description !== undefined ? parsed.description ?? undefined : report.description,
      query: updatedQuery,
      query_definition: updatedQuery,
      sharing_scope: parsed.sharing_scope ?? report.sharing_scope,
      shared_roles: roles,
      allowed_roles: roles,
      is_active: parsed.is_active ?? report.is_active ?? true,
      version: report.version + 1,
      updated_at: new Date().toISOString(),
    };

    this.savedReports.set(reportId, updated);
    return updated;
  }

  /**
   * Execute saved report with optional override parameters.
   */
  async executeSavedReport(
    tenantId: string,
    reportId: string,
    userId: string,
    userRoles: string[],
    queryOverride?: Partial<ReportQueryDefinition>,
  ): Promise<EnterpriseReportExecutionResult> {
    const report = await this.getSavedReport(tenantId, reportId, userId, userRoles);

    const effectiveQuery: ReportQueryDefinition = {
      ...(report.query_definition ?? report.query),
      ...queryOverride,
    };

    const execution = await this.reportingEngine.executeQuery(tenantId, effectiveQuery);
    execution.report_id = report.id;
    execution.report_name = report.name;

    return execution;
  }

  private isReportAccessible(
    report: SavedReport,
    userId: string,
    userRoles: string[],
  ): boolean {
    if (userRoles.includes('ADMIN') || userRoles.includes('SYSTEM_ADMIN')) {
      return true;
    }

    if (report.created_by === userId) {
      return true;
    }

    if (
      report.sharing_scope === 'ORGANIZATION' ||
      report.sharing_scope === 'TENANT_SHARED'
    ) {
      return true;
    }

    if (
      report.sharing_scope === 'SPECIFIC_ROLES' ||
      report.sharing_scope === 'ROLE_SCOPED'
    ) {
      const roles = report.shared_roles ?? report.allowed_roles ?? [];
      return roles.some((r: string) => userRoles.includes(r));
    }

    return false;
  }
}
