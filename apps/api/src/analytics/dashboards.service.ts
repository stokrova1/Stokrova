import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AnalyticsDashboard,
  DashboardWidget,
  CreateAnalyticsDashboardRequest,
  UpdateAnalyticsDashboardRequest,
  EnterpriseReportExecutionResult,
} from '@stokrova/contracts';
import {
  CreateAnalyticsDashboardSchema,
  UpdateAnalyticsDashboardSchema,
} from '@stokrova/validation';
import { ReportingEngineService } from './reporting-engine.service.js';

export interface PopulatedDashboardResponse {
  dashboard: AnalyticsDashboard;
  widget_data: Record<string, EnterpriseReportExecutionResult>;
}

@Injectable()
export class DashboardsService {
  private readonly dashboards = new DurableMap<AnalyticsDashboard>('analytics_dashboards');

  constructor(private readonly reportingEngine: ReportingEngineService) {}

  /**
   * Create an analytical dashboard with widgets and layout.
   */
  async createDashboard(
    tenantId: string,
    userId: string,
    req: CreateAnalyticsDashboardRequest,
  ): Promise<AnalyticsDashboard> {
    const parsed = CreateAnalyticsDashboardSchema.parse(req);

    const dashboardId = `dsh_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    // If marked default, unset previous default
    if (parsed.is_default) {
      this.unsetDefaultDashboard(tenantId);
    }

    const dashboard: AnalyticsDashboard = {
      id: dashboardId,
      tenant_id: tenantId,
      name: parsed.name,
      description: parsed.description ?? undefined,
      is_default: parsed.is_default ?? false,
      sharing_scope: parsed.sharing_scope,
      shared_roles: parsed.shared_roles,
      widgets: (parsed.widgets as unknown as DashboardWidget[]) ?? [],
      layout_config: parsed.layout_config ?? {},
      created_by: userId,
      is_active: true,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  /**
   * List dashboards accessible to user.
   */
  async listDashboards(
    tenantId: string,
    userId: string,
    userRoles: string[] = [],
  ): Promise<AnalyticsDashboard[]> {
    const list: AnalyticsDashboard[] = [];

    for (const dsh of this.dashboards.values()) {
      if (dsh.tenant_id !== tenantId || dsh.is_active === false) {
        continue;
      }

      if (this.isDashboardAccessible(dsh, userId, userRoles)) {
        list.push(dsh);
      }
    }

    return list;
  }

  /**
   * Retrieve a dashboard by ID.
   */
  async getDashboard(
    tenantId: string,
    dashboardId: string,
    userId: string,
    userRoles: string[] = [],
  ): Promise<AnalyticsDashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard || dashboard.tenant_id !== tenantId || dashboard.is_active === false) {
      throw new NotFoundException(`Dashboard '${dashboardId}' not found.`);
    }

    if (!this.isDashboardAccessible(dashboard, userId, userRoles)) {
      throw new ForbiddenException(
        `User is not authorized to access restricted dashboard '${dashboardId}'.`,
      );
    }

    return dashboard;
  }

  /**
   * Retrieve dashboard and dynamically execute queries for all contained widgets.
   */
  async getPopulatedDashboard(
    tenantId: string,
    dashboardId: string,
    userId: string,
    userRoles: string[] = [],
  ): Promise<PopulatedDashboardResponse> {
    const dashboard = await this.getDashboard(tenantId, dashboardId, userId, userRoles);

    const widgetData: Record<string, EnterpriseReportExecutionResult> = {};

    for (const widget of dashboard.widgets) {
      const query = (widget.query_definition ?? widget.query);
      if (!query) continue;

      try {
        const result = await this.reportingEngine.executeQuery(
          tenantId,
          query,
        );
        widgetData[widget.id] = result;
      } catch {
        widgetData[widget.id] = {
          report_name: widget.title,
          query_definition: query,
          executed_at: new Date().toISOString(),
          row_count: 0,
          total_rows: 0,
          page: 1,
          limit: 1,
          rows: [],
          freshness_timestamp: new Date().toISOString(),
          is_stale: false,
        };
      }
    }

    return {
      dashboard,
      widget_data: widgetData,
    };
  }

  /**
   * Update an existing dashboard.
   */
  async updateDashboard(
    tenantId: string,
    dashboardId: string,
    userId: string,
    userRoles: string[],
    req: UpdateAnalyticsDashboardRequest,
  ): Promise<AnalyticsDashboard> {
    const dashboard = await this.getDashboard(tenantId, dashboardId, userId, userRoles);
    const parsed = UpdateAnalyticsDashboardSchema.parse(req);

    if (dashboard.created_by !== userId && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException('Only the author or administrator can modify this dashboard.');
    }

    if (parsed.is_default) {
      this.unsetDefaultDashboard(tenantId);
    }

    const updated: AnalyticsDashboard = {
      ...dashboard,
      name: parsed.name ?? dashboard.name,
      description: parsed.description !== undefined ? parsed.description ?? undefined : dashboard.description,
      is_default: parsed.is_default ?? dashboard.is_default,
      sharing_scope: parsed.sharing_scope ?? dashboard.sharing_scope,
      shared_roles: parsed.shared_roles ?? dashboard.shared_roles,
      widgets: (parsed.widgets as unknown as DashboardWidget[]) ?? dashboard.widgets,
      layout_config: parsed.layout_config ?? dashboard.layout_config,
      is_active: parsed.is_active ?? dashboard.is_active ?? true,
      version: (dashboard.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
    };

    this.dashboards.set(dashboardId, updated);
    return updated;
  }

  private unsetDefaultDashboard(tenantId: string): void {
    for (const d of this.dashboards.values()) {
      if (d.tenant_id === tenantId && d.is_default) {
        d.is_default = false;
      }
    }
  }

  private isDashboardAccessible(
    dsh: AnalyticsDashboard,
    userId: string,
    userRoles: string[],
  ): boolean {
    if (userRoles.includes('ADMIN') || userRoles.includes('SYSTEM_ADMIN')) {
      return true;
    }

    if (dsh.created_by === userId) {
      return true;
    }

    if (dsh.sharing_scope === 'ORGANIZATION' || dsh.sharing_scope === 'TENANT_SHARED') {
      return true;
    }

    if (dsh.sharing_scope === 'SPECIFIC_ROLES' || dsh.sharing_scope === 'ROLE_SCOPED') {
      const roles = dsh.shared_roles ?? [];
      return roles.some((r: string) => userRoles.includes(r));
    }

    return false;
  }
}
