import { describe, it, expect } from 'vitest';
import {
  DashboardViewModel,
  PlatformFounderView,
  OrganizationViewModel,
} from '../src/index.js';
import {
  renderAllWorkspaceViewsHtml,
} from '@stokrova/ui';

describe('Mandate Gate LIVE_DATA_INTEGRITY_VERIFIED — Zero-Placeholder & Demo Isolation Acceptance Suite', () => {
  describe('1. Executive Dashboard Honest Empty State (apps/admin-web)', () => {
    it('renders truthful $0.00 metrics, flat zero baseline, and zero-channel breakdown for an unpopulated live tenant', () => {
      const liveDashboard = new DashboardViewModel({
        grossMerchandiseValueMinor: 0n,
        netRevenueMinor: 0n,
        grossMarginBps: 0,
        stockoutRiskIndex: 0,
        warehouseUtilizationPct: 0,
        openTillSessionsCount: 0,
        cashierVarianceAlertsMinor: 0n,
        activeWorkflowsRunning: 0,
        currencyCode: 'USD',
      });

      const html = liveDashboard.renderDashboardHtml();

      // Top KPI Cards
      expect(html).toContain('$0.00');
      expect(html).toContain('0.00%');
      expect(html).toContain('0 / 100');
      expect(html).toContain('0 tills open');

      // SVG Chart Empty State & Zero Baseline
      expect(html).toContain('No transaction throughput recorded yet. Live revenue velocity will plot here.');
      expect(html).not.toContain('$382.0k'); // Demo callout purged

      // Channel Breakdown
      expect(html).toContain('0.0% of total');
      expect(html).not.toContain('$184,200.00'); // Demo POS revenue purged
      expect(html).not.toContain('$141,800.00'); // Demo wholesale revenue purged
      expect(html).not.toContain('$56,000.00');  // Demo mobile revenue purged

      // Capital Efficiency & Turnover
      expect(html).toContain('0.0x / yr');
      expect(html).toContain('0.0 d');
      expect(html).toContain('No Activity');
      expect(html).not.toContain('8.4x / yr');
      expect(html).not.toContain('285%');

      // Fiscal Compliance & PEPPOL
      expect(html).toContain('0 / 0');
      expect(html).toContain('Awaiting Invoices');
      expect(html).toContain('Awaiting First Batch');
      expect(html).not.toContain('1,420 / 1,420');
      expect(html).not.toContain('$76,400.00');

      // Operational Alerts
      expect(html).toContain('All systems operational — zero alerts (zero active discrepancies)');
    });
  });

  describe('2. Platform Founder Super-Admin Live Mode (apps/admin-web)', () => {
    it('renders honest empty tables and zero platform metrics when unseeded', () => {
      const founderView = new PlatformFounderView('dark', false); // seedDemoData = false
      const metrics = founderView.getPlatformMetrics();

      expect(metrics.totalTenants).toBe(0);
      expect(metrics.grossMerchandiseVolumeMinor).toBe(0n);
      expect(metrics.monthlyRecurringRevenueMinor).toBe(0n);
      expect(metrics.totalBranchesProvisioned).toBe(0);

      const html = founderView.renderPlatformFounderPortalHtml();

      // Tenants Table Empty State
      expect(html).toContain('No live business tenants enrolled yet.');
      expect(html).toContain('+ Enroll New Business');
      expect(html).not.toContain('Apex Global Retail & Logistics Ltd');
      expect(html).not.toContain('Victoria Sterling');

      // Platform Users Table Empty State
      expect(html).toContain('No platform root users registered yet.');
    });

    it('preserves demo environment isolation when explicitly requested (seedDemoData: true)', () => {
      const demoFounderView = new PlatformFounderView('dark', true);
      const metrics = demoFounderView.getPlatformMetrics();

      expect(metrics.totalTenants).toBeGreaterThan(0);
      expect(metrics.grossMerchandiseVolumeMinor).toBeGreaterThan(0n);

      const html = demoFounderView.renderPlatformFounderPortalHtml();
      expect(html).toContain('Apex Global Retail & Logistics Ltd');
    });
  });

  describe('3. Organization & Branch Topology Empty State (apps/admin-web)', () => {
    it('renders truthful empty states for companies and branches', () => {
      const orgView = new OrganizationViewModel('dark');
      const html = orgView.renderOrganizationHtml();

      expect(html).toContain('No legal companies registered yet.');
      expect(html).toContain('+ Create Company Entity');
      expect(html).toContain('No operational branches or facilities configured.');
      expect(html).toContain('+ Add Physical Branch');
    });
  });

  describe('4. Shared UI Workspace Views Purification (@stokrova/ui)', () => {
    it('renders truthful zero metrics, honest empty charts, empty staff roster, and sovereign branding in live workspace mode', () => {
      const liveHtml = renderAllWorkspaceViewsHtml({
        tenantName: 'Sovereign Goods Co',
        branchName: 'Lagos Branch 1',
        currencyCode: 'USD',
        isDemo: false,
      });

      // Dashboard zero state
      expect(liveHtml).toContain('$0.00');
      expect(liveHtml).toContain('0.00%');
      expect(liveHtml).toContain('0 / 100');
      expect(liveHtml).toContain('No transaction velocity recorded yet.');
      expect(liveHtml).toContain('✓ All systems operational. Zero critical exceptions or alerts.');
      expect(liveHtml).not.toContain('$4,850,000.00');
      expect(liveHtml).not.toContain('$382,000.00');

      // Staff roster honest empty state
      expect(liveHtml).toContain('0 Staff Members Active');
      expect(liveHtml).toContain('No additional staff members provisioned.');
      expect(liveHtml).toContain('No pending staff invitations.');
      expect(liveHtml).not.toContain('emma.watson@apex.com');
      expect(liveHtml).not.toContain('samuel.adebayo@apex.com');
      expect(liveHtml).not.toContain('value="7788"'); // Pre-filled PIN eradicated

      // Rebranding Studio sovereign preview
      expect(liveHtml).toContain('◆ Sovereign Goods Co');
      expect(liveHtml).toContain('Official Fiscal Receipt • Lagos Branch 1');
      expect(liveHtml).not.toContain('◆ APEX');
    });

    it('preserves demo features when explicitly running in demo mode (isDemo: true)', () => {
      const demoHtml = renderAllWorkspaceViewsHtml({
        tenantName: 'Apex Global Retail Ltd',
        branchName: 'London Flagship',
        currencyCode: 'USD',
        isDemo: true,
      });

      expect(demoHtml).toContain('$4,850,000.00');
      expect(demoHtml).toContain('$382,000.00');
      expect(demoHtml).toContain('Apex Global Retail Ltd');
    });
  });
});
