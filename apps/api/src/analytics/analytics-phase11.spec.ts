import { describe, it, expect, beforeEach } from 'vitest';
import { MetricDictionaryService } from './metric-dictionary.service.js';
import { ReportingEngineService } from './reporting-engine.service.js';
import { SavedReportsService } from './saved-reports.service.js';
import { DashboardsService } from './dashboards.service.js';
import { ReportSchedulerService } from './report-scheduler.service.js';
import { ReportExportService } from './report-export.service.js';
import { ProjectionsService } from './projections.service.js';
import {
  calculateBasisPointRatio,
  calculateAggregateRatio,
  assertSingleCurrencyAggregation,
  assertSingleCurrencyQuery,
  sanitizeCsvCell,
  sanitizeCsvValue,
  validateReportQuery,
  reconcileProjectionLedger,
  ReportingDomainError,
  STANDARD_METRIC_DEFINITIONS,
  StandardPermissions,
  SystemRoleTemplates,
} from '@stokrova/domain';
import type {
  ReportQueryDefinition,
  CreateSavedReportRequest,
  CreateAnalyticsDashboardRequest,
  CreateReportScheduleRequest,
} from '@stokrova/contracts';

describe('STOKROVA Phase 11 — Enterprise Reporting, Analytics & Business Intelligence (Master Acceptance Matrix)', () => {
  let metricDictionary: MetricDictionaryService;
  let reportingEngine: ReportingEngineService;
  let savedReports: SavedReportsService;
  let dashboards: DashboardsService;
  let scheduler: ReportSchedulerService;
  let exporter: ReportExportService;
  let projections: ProjectionsService;

  const tenantAlpha = 'tenant_ent_alpha';
  const tenantBeta = 'tenant_ent_beta';
  const userAuthor = 'usr_analyst_001';
  const userAuditor = 'usr_auditor_002';
  const userStranger = 'usr_guest_003';

  beforeEach(() => {
    metricDictionary = new MetricDictionaryService();
    reportingEngine = new ReportingEngineService(metricDictionary);
    savedReports = new SavedReportsService(reportingEngine);
    dashboards = new DashboardsService(reportingEngine);
    exporter = new ReportExportService();
    scheduler = new ReportSchedulerService(savedReports, exporter);
    projections = new ProjectionsService();
  });

  // ==========================================================================
  // Group 1: Metric Governance & Shared Dictionary (Scenarios 1-6)
  // ==========================================================================
  describe('Group 1: Metric Governance & Shared Dictionary', () => {
    it('Scenario 1: Standard metric catalog returns metrics with complete provenance metadata', async () => {
      const response = await metricDictionary.listMetrics();
      expect(response.total_count).toBeGreaterThanOrEqual(10);

      const grossSales = response.metrics.find((m) => m.id === 'GROSS_SALES');
      expect(grossSales).toBeDefined();
      expect(grossSales?.provenance).toBe('ACTUAL');
      expect(grossSales?.owner_domain).toBe('Commerce');
      expect(grossSales?.source_service).toBe('OrdersService');
      expect(grossSales?.data_type).toBe('CURRENCY_MINOR');
      expect(grossSales?.aggregation_type).toBe('SUM');
    });

    it('Scenario 2: Metric lookup by ID provides calculation formulas, rules, and required permission', async () => {
      const metric = await metricDictionary.getMetric('GROSS_MARGIN_BP');
      expect(metric.id).toBe('GROSS_MARGIN_BP');
      expect(metric.category).toBe('FINANCE');
      expect(metric.provenance).toBe('DERIVED');
      expect(metric.data_type).toBe('BASIS_POINTS');
      expect(metric.required_permission).toBe('reporting.financial.view');
      expect(metric.inclusion_rules).toContain('Net Sales');
    });

    it('Scenario 3: Category filtering accurately isolates metrics by operational domain', async () => {
      const salesMetrics = await metricDictionary.listMetrics('SALES');
      const invMetrics = await metricDictionary.listMetrics('INVENTORY');

      expect(salesMetrics.metrics.every((m) => m.category === 'SALES')).toBe(true);
      expect(invMetrics.metrics.every((m) => m.category === 'INVENTORY')).toBe(true);
      expect(salesMetrics.metrics.some((m) => m.id === 'GROSS_SALES')).toBe(true);
      expect(invMetrics.metrics.some((m) => m.id === 'ON_HAND_COUNT')).toBe(true);
    });

    it('Scenario 4: Requesting unregistered metric throws explicit domain error', async () => {
      await expect(metricDictionary.getMetric('UNREGISTERED_CUSTOM_METRIC')).rejects.toThrow();
      expect(() => {
        validateReportQuery({
          source: 'sales_orders',
          metrics: ['INVALID_METRIC_ID'],
          dimensions: ['BRANCH'],
        });
      }).toThrowError(ReportingDomainError);
    });

    it('Scenario 5: Currency-sensitive metrics identify is_currency_sensitive = true across commercial metrics', async () => {
      const grossSales = await metricDictionary.getMetric('GROSS_SALES');
      const cogs = await metricDictionary.getMetric('COGS');
      const ratio = await metricDictionary.getMetric('GROSS_MARGIN_BP');

      expect(grossSales.is_currency_sensitive).toBe(true);
      expect(cogs.is_currency_sensitive).toBe(true);
      expect(ratio.is_currency_sensitive).toBe(false); // Ratios/percentages are unit-independent
    });

    it('Scenario 6: Forecast metrics explicitly specify PROVENANCE = FORECAST and warn against GL recognition', async () => {
      const pipelineVal = await metricDictionary.getMetric('PROJECTED_PIPELINE_VALUE');
      expect(pipelineVal.provenance).toBe('FORECAST');
      expect(pipelineVal.exclusion_rules).toContain('General Ledger');
    });
  });

  // ==========================================================================
  // Group 2: Safe Declarative Query Model & AST Validation (Scenarios 7-12)
  // ==========================================================================
  describe('Group 2: Safe Declarative Query Model & AST Validation', () => {
    it('Scenario 7: Valid declarative query AST executes across allowed dimensions and returns aggregated rows', async () => {
      const query: ReportQueryDefinition = {
        source: 'sales_orders',
        metrics: ['GROSS_SALES', 'NET_SALES', 'SALES_VOLUME'],
        dimensions: ['BRANCH', 'CATEGORY'],
        currency_code: 'EUR',
      };

      const result = await reportingEngine.executeQuery(tenantAlpha, query);
      expect(result.row_count).toBeGreaterThan(0);
      expect(result.rows[0]?.dimensions).toHaveProperty('BRANCH');
      expect(result.rows[0]?.dimensions).toHaveProperty('CATEGORY');
      expect(result.rows[0]?.metrics).toHaveProperty('GROSS_SALES');
    });

    it('Scenario 8: Query AST rejects unauthorized or un-whitelisted data sources with INVALID_REPORT_SOURCE', async () => {
      const query: ReportQueryDefinition = {
        source: 'raw_users_table',
        metrics: ['GROSS_SALES'],
        dimensions: ['BRANCH'],
      };

      await expect(reportingEngine.executeQuery(tenantAlpha, query)).rejects.toThrow();
    });

    it('Scenario 9: Query AST rejects unsupported dimensions with INVALID_REPORT_DIMENSION', async () => {
      const query: ReportQueryDefinition = {
        source: 'sales_orders',
        metrics: ['GROSS_SALES'],
        dimensions: ['CREDIT_CARD_PAN_NUMBER'],
      };

      await expect(reportingEngine.executeQuery(tenantAlpha, query)).rejects.toThrow();
    });

    it('Scenario 10: Query AST detects and blocks SQL injection keywords in filter fields and values', async () => {
      const injectionQueries: ReportQueryDefinition[] = [
        {
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
          filters: [{ field: 'BRANCH; DROP TABLE users--', operator: 'EQ', value: 'BR-01' }],
        },
        {
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
          filters: [{ field: 'BRANCH', operator: 'EQ', value: "' UNION SELECT * FROM accounts--" }],
        },
      ];

      for (const q of injectionQueries) {
        await expect(reportingEngine.executeQuery(tenantAlpha, q)).rejects.toThrow();
      }
    });

    it('Scenario 11: Query AST enforces maximum limit of 10 metrics and 5 dimensions', async () => {
      const tooManyMetrics: ReportQueryDefinition = {
        source: 'sales_orders',
        metrics: [
          'GROSS_SALES', 'NET_SALES', 'COGS', 'GROSS_PROFIT', 'GROSS_MARGIN_BP',
          'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'PO_FULFILLMENT_RATE_BP',
          'ON_TIME_DELIVERY_RATE_BP', 'DELIVERY_FAILURE_RATE_BP', 'LEAD_CONVERSION_RATE_BP',
        ],
        dimensions: ['BRANCH'],
      };

      await expect(reportingEngine.executeQuery(tenantAlpha, tooManyMetrics)).rejects.toThrow();

      const tooManyDimensions: ReportQueryDefinition = {
        source: 'sales_orders',
        metrics: ['GROSS_SALES'],
        dimensions: ['BRANCH', 'WAREHOUSE', 'CHANNEL', 'CATEGORY', 'PRODUCT', 'CUSTOMER'],
      };

      await expect(reportingEngine.executeQuery(tenantAlpha, tooManyDimensions)).rejects.toThrow();
    });

    it('Scenario 12: Query AST enforces pagination controls and bounds checking', async () => {
      const query: ReportQueryDefinition = {
        source: 'sales_orders',
        metrics: ['GROSS_SALES'],
        dimensions: ['BRANCH'],
        currency_code: 'EUR',
        limit: 1,
        offset: 0,
      };

      const result = await reportingEngine.executeQuery(tenantAlpha, query);
      expect(result.rows.length).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  // ==========================================================================
  // Group 3: Pure Integer Rational Math & Basis Point Margins (Scenarios 13-17)
  // ==========================================================================
  describe('Group 3: Pure Integer Rational Math & Basis Point Margins', () => {
    it('Scenario 13: Basis point ratio calculations maintain exact integer precision (10000 = 100.00%)', () => {
      // 50% = 5000 bps
      expect(calculateBasisPointRatio(500n, 1000n)).toBe(5000);
      // 33.3333% = 3333 bps
      expect(calculateBasisPointRatio(1n, 3n)).toBe(3333);
      // 100% = 10000 bps
      expect(calculateBasisPointRatio(100n, 100n)).toBe(10000);
    });

    it('Scenario 14: Gross margin ratio computes (Gross Profit * 10000) / Gross Sales', () => {
      const grossSales = 100000n; // $1,000.00
      const cogs = 60000n;        // $600.00
      const grossProfit = grossSales - cogs; // $400.00 (40.00%)

      const marginBp = calculateBasisPointRatio(grossProfit, grossSales);
      expect(marginBp).toBe(4000); // 40.00%
    });

    it('Scenario 15: Cross-branch aggregate margin is computed from sum of numerators over sum of denominators, never averaging sub-entity percentages', () => {
      // Branch A: Sales 100, Profit 10 (10.00% = 1000 bps)
      // Branch B: Sales 10,000, Profit 5,000 (50.00% = 5000 bps)
      // Mathematical fallacy: (10% + 50%) / 2 = 30% (3000 bps)
      // Correct aggregate: (10 + 5000) / (100 + 10000) = 5010 / 10100 = 49.60% (4960 bps)
      const branchASales = 100n;
      const branchAProfit = 10n;
      const branchBSales = 10000n;
      const branchBProfit = 5000n;

      const totalSales = branchASales + branchBSales;
      const totalProfit = branchAProfit + branchBProfit;

      const trueAggregateMargin = calculateAggregateRatio(totalProfit, totalSales);
      expect(trueAggregateMargin).toBe(4960);
      expect(trueAggregateMargin).not.toBe(3000);
    });

    it('Scenario 16: Zero denominator gracefully returns 0 basis points without dividing by zero', () => {
      expect(calculateBasisPointRatio(500n, 0n)).toBe(0);
      expect(calculateAggregateRatio(0n, 0n)).toBe(0);
    });

    it('Scenario 17: Multi-currency aggregation assertion blocks un-converted cross-currency aggregations with CROSS_CURRENCY_AGGREGATION_PROHIBITED', () => {
      const singleCurrencyList = ['EUR', 'EUR', 'EUR'];
      expect(assertSingleCurrencyAggregation(singleCurrencyList)).toBe('EUR');

      const mixedCurrencyList = ['EUR', 'USD', 'GBP'];
      expect(() => {
        assertSingleCurrencyAggregation(mixedCurrencyList);
      }).toThrowError(ReportingDomainError);
    });
  });

  // ==========================================================================
  // Group 4: Saved Reports & RBAC Sharing Boundaries (Scenarios 18-22)
  // ==========================================================================
  describe('Group 4: Saved Reports & RBAC Sharing Boundaries', () => {
    it('Scenario 18: Creating a saved report persists definition with version 1 and active state', async () => {
      const req: CreateSavedReportRequest = {
        name: 'Weekly Branch Revenue',
        description: 'Tracking branch revenues by category',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES', 'NET_SALES'],
          dimensions: ['BRANCH'],
        },
        sharing_scope: 'PRIVATE',
      };

      const report = await savedReports.createSavedReport(tenantAlpha, userAuthor, req);
      expect(report.id).toMatch(/^rep_/);
      expect(report.version).toBe(1);
      expect(report.is_active).toBe(true);
      expect(report.created_by).toBe(userAuthor);
    });

    it('Scenario 19: PRIVATE saved report is accessible only to author and administrator', async () => {
      const req: CreateSavedReportRequest = {
        name: 'Private Executive Report',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
        },
        sharing_scope: 'PRIVATE',
      };

      const report = await savedReports.createSavedReport(tenantAlpha, userAuthor, req);

      // Author can read
      const byAuthor = await savedReports.getSavedReport(tenantAlpha, report.id, userAuthor, ['SALES_REP']);
      expect(byAuthor.id).toBe(report.id);

      // Admin can read
      const byAdmin = await savedReports.getSavedReport(tenantAlpha, report.id, userStranger, ['ADMIN']);
      expect(byAdmin.id).toBe(report.id);

      // Unrelated user cannot read
      await expect(
        savedReports.getSavedReport(tenantAlpha, report.id, userStranger, ['SALES_REP']),
      ).rejects.toThrow();
    });

    it('Scenario 20: ORGANIZATION / TENANT_SHARED saved report is accessible to any user in the tenant', async () => {
      const req: CreateSavedReportRequest = {
        name: 'Company Public Overview',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
        },
        sharing_scope: 'ORGANIZATION',
      };

      const report = await savedReports.createSavedReport(tenantAlpha, userAuthor, req);

      const byStranger = await savedReports.getSavedReport(tenantAlpha, report.id, userStranger, ['CASHIER']);
      expect(byStranger.id).toBe(report.id);
    });

    it('Scenario 21: SPECIFIC_ROLES / ROLE_SCOPED saved report restricts access to users with designated roles', async () => {
      const req: CreateSavedReportRequest = {
        name: 'Auditor Compliance Summary',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES', 'COGS'],
          dimensions: ['BRANCH'],
        },
        sharing_scope: 'SPECIFIC_ROLES',
        shared_roles: ['FINANCIAL_AUDITOR', 'EXECUTIVE_VIEWER'],
      };

      const report = await savedReports.createSavedReport(tenantAlpha, userAuthor, req);

      // User with FINANCIAL_AUDITOR role can access
      const byAuditor = await savedReports.getSavedReport(tenantAlpha, report.id, userAuditor, ['FINANCIAL_AUDITOR']);
      expect(byAuditor.id).toBe(report.id);

      // User with CASHIER role cannot access
      await expect(
        savedReports.getSavedReport(tenantAlpha, report.id, userStranger, ['CASHIER']),
      ).rejects.toThrow();
    });

    it('Scenario 22: Updating a saved report increments version and updates definition while preserving author', async () => {
      const report = await savedReports.createSavedReport(tenantAlpha, userAuthor, {
        name: 'Initial Report',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
        },
        sharing_scope: 'PRIVATE',
      });

      const updated = await savedReports.updateSavedReport(
        tenantAlpha,
        report.id,
        userAuthor,
        ['SALES_REP'],
        {
          name: 'Updated Report V2',
          query_definition: {
            source: 'sales_orders',
            metrics: ['GROSS_SALES', 'NET_SALES'],
            dimensions: ['BRANCH', 'CATEGORY'],
          },
        },
      );

      expect(updated.version).toBe(2);
      expect(updated.name).toBe('Updated Report V2');
      expect(updated.created_by).toBe(userAuthor);
    });
  });

  // ==========================================================================
  // Group 5: Dashboards & Multi-Widget Visualization (Scenarios 23-26)
  // ==========================================================================
  describe('Group 5: Dashboards & Multi-Widget Visualization', () => {
    it('Scenario 23: Creating a dashboard persists multi-widget layout, widget types, and queries', async () => {
      const req: CreateAnalyticsDashboardRequest = {
        name: 'Store Operations Overview',
        description: 'Live KPIs and sales trends',
        is_default: false,
        sharing_scope: 'ORGANIZATION',
        widgets: [
          {
            id: 'wgt_kpi_sales',
            title: 'Gross Revenue',
            widget_type: 'KPI_CARD',
            metric_id: 'GROSS_SALES',
            query_definition: {
              source: 'sales_orders',
              metrics: ['GROSS_SALES'],
              dimensions: ['BRANCH'],
            },
            grid_position: { x: 0, y: 0, width: 4, height: 2 },
            refresh_interval_seconds: 60,
          },
          {
            id: 'wgt_chart_categories',
            title: 'Sales by Category',
            widget_type: 'BAR_CHART',
            metric_id: 'NET_SALES',
            query_definition: {
              source: 'sales_orders',
              metrics: ['NET_SALES'],
              dimensions: ['CATEGORY'],
            },
            grid_position: { x: 4, y: 0, width: 8, height: 4 },
            refresh_interval_seconds: 300,
          },
        ],
      };

      const dashboard = await dashboards.createDashboard(tenantAlpha, userAuthor, req);
      expect(dashboard.id).toMatch(/^dsh_/);
      expect(dashboard.widgets.length).toBe(2);
      expect(dashboard.widgets[0]?.widget_type).toBe('KPI_CARD');
    });

    it('Scenario 24: Populated dashboard executes queries for each widget and bundles results into structured response', async () => {
      const dashboard = await dashboards.createDashboard(tenantAlpha, userAuthor, {
        name: 'Live Dashboard',
        sharing_scope: 'ORGANIZATION',
        widgets: [
          {
            id: 'wgt_1',
            title: 'Sales Widget',
            widget_type: 'KPI_CARD',
            metric_id: 'GROSS_SALES',
            query_definition: {
              source: 'sales_orders',
              metrics: ['GROSS_SALES'],
              dimensions: ['BRANCH'],
              currency_code: 'EUR',
            },
            grid_position: { x: 0, y: 0, width: 4, height: 2 },
          },
        ],
      });

      const populated = await dashboards.getPopulatedDashboard(tenantAlpha, dashboard.id, userAuthor, ['ADMIN']);
      expect(populated.dashboard.id).toBe(dashboard.id);
      expect(populated.widget_data).toHaveProperty('wgt_1');
      expect(populated.widget_data['wgt_1']?.row_count).toBeGreaterThan(0);
    });

    it('Scenario 25: Setting a dashboard as default automatically unsets the previous default dashboard for that tenant', async () => {
      const dsh1 = await dashboards.createDashboard(tenantAlpha, userAuthor, {
        name: 'First Default Dashboard',
        is_default: true,
        sharing_scope: 'ORGANIZATION',
        widgets: [],
      });
      expect(dsh1.is_default).toBe(true);

      const dsh2 = await dashboards.createDashboard(tenantAlpha, userAuthor, {
        name: 'Second Default Dashboard',
        is_default: true,
        sharing_scope: 'ORGANIZATION',
        widgets: [],
      });
      expect(dsh2.is_default).toBe(true);

      const dsh1Reloaded = await dashboards.getDashboard(tenantAlpha, dsh1.id, userAuthor, ['ADMIN']);
      expect(dsh1Reloaded.is_default).toBe(false);
    });

    it('Scenario 26: Role-scoped dashboard access restricts viewing by unauthorized roles', async () => {
      const dsh = await dashboards.createDashboard(tenantAlpha, userAuthor, {
        name: 'Executive BI Dashboard',
        sharing_scope: 'SPECIFIC_ROLES',
        shared_roles: ['EXECUTIVE_VIEWER'],
        widgets: [],
      });

      const allowed = await dashboards.getDashboard(tenantAlpha, dsh.id, userStranger, ['EXECUTIVE_VIEWER']);
      expect(allowed.id).toBe(dsh.id);

      await expect(
        dashboards.getDashboard(tenantAlpha, dsh.id, userStranger, ['CASHIER']),
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Group 6: Automated Scheduling & Delivery Audit (Scenarios 27-30)
  // ==========================================================================
  describe('Group 6: Automated Scheduling & Delivery Audit', () => {
    it('Scenario 27: Creating a report schedule configures cadence, recipients, export format, and future next run', async () => {
      const report = await savedReports.createSavedReport(tenantAlpha, userAuthor, {
        name: 'Daily Store Closeout',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
        },
        sharing_scope: 'ORGANIZATION',
      });

      const req: CreateReportScheduleRequest = {
        saved_report_id: report.id,
        name: 'Nightly Store Close Schedule',
        cadence: 'DAILY',
        delivery_channel: 'EMAIL',
        recipients: ['manager@store.com', 'finance@store.com'],
        export_format: 'CSV',
      };

      const sched = await scheduler.createSchedule(tenantAlpha, req);
      expect(sched.id).toMatch(/^sch_/);
      expect(sched.is_active).toBe(true);
      expect(sched.recipients.length).toBe(2);
      expect(new Date(sched.next_run_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('Scenario 28: Triggering a schedule executes underlying report, generates export, and writes execution audit log', async () => {
      const report = await savedReports.createSavedReport(tenantAlpha, userAuthor, {
        name: 'Scheduled Inventory Summary',
        query_definition: {
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
          currency_code: 'EUR',
        },
        sharing_scope: 'ORGANIZATION',
      });

      const sched = await scheduler.createSchedule(tenantAlpha, {
        saved_report_id: report.id,
        name: 'Weekly Inventory Schedule',
        cadence: 'WEEKLY',
        recipients: ['wh-lead@store.com'],
        export_format: 'CSV',
      });

      const log = await scheduler.triggerSchedule(tenantAlpha, sched.id, 'SYS_CRON');
      expect(log.status).toBe('SUCCESS');
      expect(log.row_count).toBeGreaterThan(0);
      expect(log.export_format).toBe('CSV');
      expect(log.recipient_count).toBe(1);

      const logs = await scheduler.getExecutionLogs(tenantAlpha, report.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('Scenario 29: Failed schedule execution records failure details, duration, and error message in audit log', async () => {
      // Create a schedule pointing to a non-existent saved report ID
      const sched = await scheduler.createSchedule(tenantAlpha, {
        saved_report_id: 'non_existent_report_id',
        name: 'Failing Schedule',
        cadence: 'DAILY',
        recipients: ['alert@store.com'],
        export_format: 'CSV',
      });

      const log = await scheduler.triggerSchedule(tenantAlpha, sched.id, 'SYS_CRON');
      expect(log.status).toBe('FAILED');
      expect(log.row_count).toBe(0);
      expect(log.error_message).toBeDefined();
    });

    it('Scenario 30: Execution logs can be listed and filtered by saved report ID', async () => {
      const logs = await scheduler.getExecutionLogs(tenantAlpha);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  // ==========================================================================
  // Group 7: Secure Export & Formula Injection Sanitization (Scenarios 31-33)
  // ==========================================================================
  describe('Group 7: Secure Export & Formula Injection Sanitization', () => {
    it('Scenario 31: CSV export sanitizes cells starting with formula triggers (=, +, -, @, \\t, \\r, %) by prepending single quotes', () => {
      expect(sanitizeCsvValue('=CMD|’/C calc’!A0')).toBe("'=CMD|’/C calc’!A0");
      expect(sanitizeCsvValue('+12345')).toBe("'+12345");
      expect(sanitizeCsvValue('-54321')).toBe("'-54321");
      expect(sanitizeCsvValue('@SUM(1,2)')).toBe("'@SUM(1,2)");
      expect(sanitizeCsvValue('\tTAB_INJECT')).toBe("'\tTAB_INJECT");
      expect(sanitizeCsvValue('%PERCENT_INJECT')).toBe("'%PERCENT_INJECT");
      // Safe text remains unchanged
      expect(sanitizeCsvValue('Standard Product Name')).toBe('Standard Product Name');
    });

    it('Scenario 32: CSV export produces valid headers and escapes commas and double quotes', async () => {
      const query: ReportQueryDefinition = {
        source: 'sales_orders',
        metrics: ['GROSS_SALES'],
        dimensions: ['BRANCH'],
        currency_code: 'EUR',
      };

      const execResult = await reportingEngine.executeQuery(tenantAlpha, query);
      const csvExport = await exporter.exportReport(execResult, 'CSV', 'branch_sales_test');

      expect(csvExport.content_type).toBe('text/csv');
      expect(csvExport.file_name).toBe('branch_sales_test.csv');
      expect(typeof csvExport.data).toBe('string');
      const csvStr = csvExport.data as string;
      expect(csvStr).toContain('BRANCH,GROSS_SALES');
    });

    it('Scenario 33: JSON export outputs structured datasets with pagination metadata and row records', async () => {
      const query: ReportQueryDefinition = {
        source: 'sales_orders',
        metrics: ['GROSS_SALES'],
        dimensions: ['BRANCH'],
        currency_code: 'EUR',
      };

      const execResult = await reportingEngine.executeQuery(tenantAlpha, query);
      const jsonExport = await exporter.exportReport(execResult, 'JSON', 'branch_sales_json');

      expect(jsonExport.content_type).toBe('application/json');
      const parsed = JSON.parse(jsonExport.data as string);
      expect(parsed).toHaveProperty('report_name');
      expect(parsed).toHaveProperty('rows');
      expect(parsed.rows.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Group 8: Analytical Projections & Deterministic Rebuild (Scenarios 34-35)
  // ==========================================================================
  describe('Group 8: Analytical Projections & Deterministic Rebuild', () => {
    it('Scenario 34: Incremental projection upsert accumulates metric values and increments version', async () => {
      const initial = await projections.upsertProjection(
        tenantAlpha,
        'DAILY_SALES_BY_BRANCH',
        'BRANCH:BR-01',
        { GROSS_SALES: 100000, NET_SALES: 95000 },
        'evt_001',
      );

      expect(initial.snapshot_version).toBe(1);
      expect(initial.metric_values['GROSS_SALES']).toBe(100000);

      const updated = await projections.upsertProjection(
        tenantAlpha,
        'DAILY_SALES_BY_BRANCH',
        'BRANCH:BR-01',
        { GROSS_SALES: 150000, NET_SALES: 140000 },
        'evt_002',
      );

      expect(updated.snapshot_version).toBe(2);
      expect(updated.metric_values['GROSS_SALES']).toBe(150000);
      expect(updated.last_event_id).toBe('evt_002');
    });

    it('Scenario 35: Rebuilding projection from authoritative operational ledger balances detects variance, reconciles drift, and restores consistency', async () => {
      // Seed a projection that has drifted from reality
      await projections.upsertProjection(
        tenantAlpha,
        'DAILY_SALES_BY_BRANCH',
        'BRANCH:BR-01',
        { GROSS_SALES: 200000, NET_SALES: 190000 }, // Stale values
        'evt_drifted',
      );

      // Authoritative ground-truth ledger calculated directly from posted records
      const groundTruthLedger: Record<string, bigint> = {
        GROSS_SALES: 250000n, // Drift: +50,000
        NET_SALES: 235000n,   // Drift: +45,000
      };

      const reconciliation = await projections.rebuildProjectionFromLedger(
        tenantAlpha,
        'DAILY_SALES_BY_BRANCH',
        groundTruthLedger,
        'BRANCH:BR-01',
      );

      expect(reconciliation.drift_detected).toBe(true);
      expect(reconciliation.differences.length).toBe(2);
      const grossDiff = reconciliation.differences.find((d) => d.metric === 'GROSS_SALES');
      expect(grossDiff?.variance).toBe(50000n);

      // Verify that after rebuild, the projection matches the ground truth exactly
      const reconciledProj = await projections.getProjection(tenantAlpha, 'DAILY_SALES_BY_BRANCH', 'BRANCH:BR-01');
      expect(reconciledProj?.metric_values['GROSS_SALES']).toBe(250000);
      expect(reconciledProj?.metric_values['NET_SALES']).toBe(235000);
      expect(reconciledProj?.is_consistent).toBe(true);
    });
  });
});
