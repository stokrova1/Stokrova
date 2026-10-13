import { describe, it, expect } from 'vitest';
import {
  getMetricDefinition,
  listMetricDefinitions,
  validateReportQuery,
  calculateBasisPointRatio,
  calculateAggregateRatio,
  assertSingleCurrencyAggregation,
  sanitizeCsvCell,
  reconcileProjectionEvent,
  ReportingDomainError,
  STANDARD_METRIC_DEFINITIONS,
} from '../src/reporting.js';
import { StandardPermissions, SystemRoleTemplates } from '../src/rbac.js';

describe('Enterprise Reporting & Analytics Pure Domain Engine', () => {
  describe('Metric Dictionary Registry', () => {
    it('retrieves metric definitions with authoritative metadata and permissions', () => {
      const grossSales = getMetricDefinition('GROSS_SALES');
      expect(grossSales.id).toBe('GROSS_SALES');
      expect(grossSales.category).toBe('SALES');
      expect(grossSales.data_type).toBe('CURRENCY_MINOR');
      expect(grossSales.provenance).toBe('ACTUAL');
      expect(grossSales.required_permission).toBe('reporting.sales.view');
      expect(grossSales.is_currency_sensitive).toBe(true);

      const atp = getMetricDefinition('AVAILABLE_TO_PROMISE');
      expect(atp.category).toBe('INVENTORY');
      expect(atp.provenance).toBe('DERIVED');

      const pipeline = getMetricDefinition('PROJECTED_PIPELINE_VALUE');
      expect(pipeline.category).toBe('CRM');
      expect(pipeline.provenance).toBe('FORECAST');
    });

    it('rejects unknown or unregistered metric identifiers', () => {
      expect(() => getMetricDefinition('UNREGISTERED_METRIC')).toThrow(ReportingDomainError);
      expect(() => getMetricDefinition('UNREGISTERED_METRIC')).toThrow(
        /is not registered in the shared metric dictionary/,
      );
    });

    it('filters metrics by category cleanly', () => {
      const financeMetrics = listMetricDefinitions('FINANCE');
      expect(financeMetrics.length).toBeGreaterThan(0);
      expect(financeMetrics.every((m) => m.category === 'FINANCE')).toBe(true);
    });
  });

  describe('Safe Declarative Query AST Validator', () => {
    it('validates a compliant declarative report query', () => {
      expect(() =>
        validateReportQuery({
          source: 'sales_orders',
          metrics: ['GROSS_SALES', 'NET_SALES', 'COMPLETED_ORDER_COUNT'],
          dimensions: ['BRANCH', 'CHANNEL'],
          filters: [
            { field: 'channel', operator: 'EQ', value: 'POS' },
            { field: 'branch_id', operator: 'IN', value: ['brn_1', 'brn_2'] },
          ],
          limit: 100,
        }),
      ).not.toThrow();
    });

    it('rejects forbidden or unregistered sources', () => {
      expect(() =>
        validateReportQuery({
          source: 'raw_users_table',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
        }),
      ).toThrow(ReportingDomainError);
    });

    it('rejects SQL injection attempts in filter fields or values', () => {
      expect(() =>
        validateReportQuery({
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
          filters: [{ field: 'branch; DROP TABLE users--', operator: 'EQ', value: '1' }],
        }),
      ).toThrow(/forbidden SQL keywords/);

      expect(() =>
        validateReportQuery({
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
          filters: [{ field: 'branch_id', operator: 'EQ', value: "1' UNION SELECT * FROM passwords--" }],
        }),
      ).toThrow(/forbidden SQL keywords/);
    });

    it('enforces bounds on metrics, dimensions, and filter counts', () => {
      // Empty metrics
      expect(() =>
        validateReportQuery({
          source: 'sales_orders',
          metrics: [],
          dimensions: ['BRANCH'],
        }),
      ).toThrow(/at least one registered metric/);

      // Exceeding query limit
      expect(() =>
        validateReportQuery({
          source: 'sales_orders',
          metrics: ['GROSS_SALES'],
          dimensions: ['BRANCH'],
          limit: 20000,
        }),
      ).toThrow(/outside allowed range/);
    });
  });

  describe('Precision Rational Math & Currency Safety', () => {
    it('calculates exact basis point ratios with zero float drift', () => {
      // 25.50% = 2550 bp
      expect(calculateBasisPointRatio(255n, 1000n)).toBe(2550);
      // 100% = 10000 bp
      expect(calculateBasisPointRatio(100n, 100n)).toBe(10000);
      // Division by zero is protected
      expect(calculateBasisPointRatio(100n, 0n)).toBe(0);
    });

    it('computes aggregate ratio correctly instead of averaging percentage ratios', () => {
      // Entity A: $10 profit on $100 sales (10.00% = 1000 bp)
      // Entity B: $90 profit on $1000 sales (9.00% = 900 bp)
      // Simple average of margins would be (1000 + 900)/2 = 950 bp (9.5%) - INCORRECT
      // Correct aggregate margin: (10 + 90) / (100 + 1000) = 100 / 1100 = 9.09% = 909 bp
      const aggregateMargin = calculateAggregateRatio(100n, 1100n);
      expect(aggregateMargin).toBe(909);
    });

    it('enforces single currency consistency and prevents cross-currency mixing', () => {
      expect(assertSingleCurrencyAggregation(['USD', 'usd', 'USD'])).toBe('USD');

      expect(() => assertSingleCurrencyAggregation(['USD', 'EUR'])).toThrow(
        /Cannot sum monetary metrics across mixed currencies/,
      );
    });
  });

  describe('CSV Formula Injection Sanitization', () => {
    it('escapes dangerous formula triggers in exported cells', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
      expect(sanitizeCsvCell('-12.50')).toBe("'-12.50");
      expect(sanitizeCsvCell('@SUM(1+1)')).toBe("'@SUM(1+1)");
      expect(sanitizeCsvCell('Normal Text')).toBe('Normal Text');
    });

    it('escapes commas, quotes, and newlines per RFC 4180', () => {
      expect(sanitizeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(sanitizeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(sanitizeCsvCell('He said "Hi"')).toBe('"He said ""Hi"""');
    });
  });

  describe('Analytical Projections & Idempotency', () => {
    it('updates projection metrics incrementally and skips duplicate events', () => {
      const initial = {
        metrics: { total_sales_minor: 10000, order_count: 1 },
        last_event_id: 'evt_1',
        version: 1,
      };

      // New event
      const res1 = reconcileProjectionEvent(initial, 'evt_2', {
        total_sales_minor: 5000,
        order_count: 1,
      });
      expect(res1.skippedDuplicate).toBe(false);
      expect(res1.state.metrics['total_sales_minor']).toBe(15000);
      expect(res1.state.metrics['order_count']).toBe(2);
      expect(res1.state.version).toBe(2);

      // Replaying same event is skipped idempotently
      const res2 = reconcileProjectionEvent(res1.state, 'evt_2', {
        total_sales_minor: 5000,
        order_count: 1,
      });
      expect(res2.skippedDuplicate).toBe(true);
      expect(res2.state.metrics['total_sales_minor']).toBe(15000);
      expect(res2.state.version).toBe(2);
    });
  });

  describe('Role-Based Access Control', () => {
    it('provides specialized reporting role templates with least privilege', () => {
      const analyst = SystemRoleTemplates['REPORTING_ANALYST']!;
      expect(analyst).toBeDefined();
      expect(analyst.permissions).toContain(StandardPermissions.REPORTING_REPORT_CREATE);
      expect(analyst.permissions).toContain(StandardPermissions.REPORTING_REPORT_EXPORT);

      const auditor = SystemRoleTemplates['FINANCIAL_AUDITOR']!;
      expect(auditor).toBeDefined();
      expect(auditor.permissions).toContain(StandardPermissions.REPORTING_FINANCIAL_VIEW);
      expect(auditor.permissions).not.toContain(StandardPermissions.REPORTING_REPORT_CREATE);

      const executive = SystemRoleTemplates['EXECUTIVE_VIEWER']!;
      expect(executive).toBeDefined();
      expect(executive.permissions).toContain(StandardPermissions.REPORTING_DASHBOARD_VIEW);
    });
  });
});
