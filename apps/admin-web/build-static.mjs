import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminWebShell, DashboardViewModel } from './dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultContext = {
  tenantId: 'tenant_default',
  tenantName: 'STOKROVA Enterprise',
  companyId: 'comp_default',
  companyName: 'STOKROVA Operating System',
  branchId: 'br_hq',
  branchName: 'Headquarters Flagship',
  userRoleCodes: ['BUSINESS_OWNER', 'BRANCH_MANAGER'],
  userPermissions: [
    'sales.read',
    'sales.write',
    'catalog.read',
    'catalog.write',
    'inventory.read',
    'inventory.write',
    'finance.read',
    'analytics.read',
  ],
};

const shell = new AdminWebShell({ context: defaultContext, theme: 'dark' });
const dashboard = new DashboardViewModel({
  grossMerchandiseValueMinor: 124500000n,
  netRevenueMinor: 98700000n,
  grossMarginBps: 3450,
  stockoutRiskIndex: 8,
  warehouseUtilizationPct: 82.4,
  openTillSessionsCount: 4,
  cashierVarianceAlertsMinor: 0n,
  activeWorkflowsRunning: 6,
  currencyCode: 'USD',
});

const dashboardHtml = dashboard.renderDashboardHtml();
const completeHtml = shell.renderCompleteShellHtml(dashboardHtml);

const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), completeHtml, 'utf-8');
console.log('✅ Generated STOKROVA Admin Web index.html at', path.join(distDir, 'index.html'));
