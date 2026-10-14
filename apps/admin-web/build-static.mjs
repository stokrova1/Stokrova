import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AdminWebShell,
  PlatformFounderView,
  DashboardViewModel,
  ProcurementViewModel,
  FinanceViewModel,
  RegistersViewModel,
  RbacViewModel,
  OrganizationViewModel,
} from './dist/index.js';
import {
  renderMasterSidebarHtml,
  renderAllWorkspaceViewsHtml,
} from '@stokrova/ui';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize View Models
const founderView = new PlatformFounderView('dark');

const defaultContext = {
  tenantId: 'ten_apex_global',
  tenantName: 'Apex Global Retail & Logistics Ltd',
  companyId: 'cmp_apex_uk',
  companyName: 'Apex Retail UK Ltd',
  branchId: 'brn_london_flagship',
  branchName: 'London Flagship Store',
  userRoleCodes: ['PLATFORM_FOUNDER', 'SUPER_ADMIN'],
  userPermissions: ['*'], // Super user
};

const shell = new AdminWebShell({ context: defaultContext, theme: 'dark' });

const dashboardModel = new DashboardViewModel({
  grossMerchandiseValueMinor: 485000000n, // $4,850,000.00
  netRevenueMinor: 38200000n, // $382,000.00
  grossMarginBps: 3850, // 38.50%
  stockoutRiskIndex: 4,
  warehouseUtilizationPct: 78.5,
  openTillSessionsCount: 6,
  cashierVarianceAlertsMinor: 0n,
  activeWorkflowsRunning: 3,
  currencyCode: 'USD',
}, 'dark');

dashboardModel.addAlert({
  id: 'alt_01',
  severity: 'INFO',
  title: 'Inter-Branch Stock Dispatched',
  message: 'TR-LON-BIR-042 dispatched to Birmingham DC (20 units in-transit).',
  timestampIso: '2026-10-14T14:15:00Z',
});
dashboardModel.addAlert({
  id: 'alt_02',
  severity: 'WARNING',
  title: 'Discount Override Requested',
  message: 'B2B Quote QT-2026-042 requested 14% discount (exceeds 10% manager threshold).',
  timestampIso: '2026-10-14T13:50:00Z',
});
dashboardModel.addAlert({
  id: 'alt_03',
  severity: 'INFO',
  title: 'Daily Register Reconciled',
  message: 'All London store tills balanced with 0 float discrepancies.',
  timestampIso: '2026-10-14T12:00:00Z',
});

const procurementModel = new ProcurementViewModel('dark');
procurementModel.addSupplier({
  id: 'supp_intel',
  name: 'Intel Corporation UK Ltd',
  code: 'SUPP-INTEL',
  contactEmail: 'orders@intel.co.uk',
  paymentTermsDays: 30,
  leadTimeDays: 5,
  currencyCode: 'USD',
  isActive: true,
});
procurementModel.addSupplier({
  id: 'supp_samsung',
  name: 'Samsung Electronics Logistics Europe',
  code: 'SUPP-SAMSUNG',
  contactEmail: 'b2b@samsung.de',
  paymentTermsDays: 14,
  leadTimeDays: 7,
  currencyCode: 'EUR',
  isActive: true,
});
procurementModel.addPurchaseOrder({
  id: 'po_089',
  poNumber: 'PO-2026-089',
  supplierId: 'supp_intel',
  supplierName: 'Intel Corporation UK Ltd',
  status: 'PARTIALLY_RECEIVED',
  createdAtIso: '2026-10-10T09:00:00Z',
  currencyCode: 'USD',
  lines: [
    {
      id: 'pol_1',
      sku: 'LAPTOP-PRO-16',
      productName: 'Apex Pro 16 Laptop Workstation',
      orderedQty: 40,
      receivedQty: 20,
      invoicedQty: 20,
      unitCostMinor: 120000n,
      invoicedUnitCostMinor: 120000n,
    },
  ],
});

const financeModel = new FinanceViewModel('dark');
[
  { code: '1010', name: 'Cash at Bank', type: 'ASSET', normalBalance: 'DEBIT', currentBalanceMinor: 45000000n },
  { code: '1200', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT', currentBalanceMinor: 1440000n },
  { code: '1400', name: 'Inventory Asset', type: 'ASSET', normalBalance: 'DEBIT', currentBalanceMinor: 124000000n },
  { code: '2010', name: 'Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT', currentBalanceMinor: 4800000n },
  { code: '4010', name: 'Retail & Wholesale Revenue', type: 'REVENUE', normalBalance: 'CREDIT', currentBalanceMinor: 38200000n },
  { code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', normalBalance: 'DEBIT', currentBalanceMinor: 23493000n },
].forEach(acc => financeModel.addAccount(acc));

financeModel.addJournalEntry({
  id: 'jrnl_001',
  entryNumber: 'JRNL-2026-10-001',
  reference: 'SO-2026-001',
  description: 'B2B Wholesale Order SO-2026-001 settlement',
  dateIso: '2026-10-14T10:00:00Z',
  status: 'POSTED',
  currencyCode: 'USD',
  lines: [
    { accountCode: '1010', accountName: 'Cash at Bank', debitMinor: 249900n, creditMinor: 0n },
    { accountCode: '4010', accountName: 'Retail Revenue', debitMinor: 0n, creditMinor: 249900n },
  ],
});

const registersModel = new RegistersViewModel('dark');
registersModel.addSession({
  id: 'reg_lon_01',
  registerCode: 'REG-LON-01',
  registerName: 'Counter Till 01 (Flagship)',
  branchId: 'brn_london_flagship',
  branchName: 'London Flagship',
  cashierId: 'usr_emma',
  cashierName: 'Emma Watson',
  status: 'OPEN',
  openingFloatMinor: 25000n,
  cashSalesMinor: 345000n,
  currentCashExpectedMinor: 370000n,
  salesCount: 14,
  cashInMinor: 345000n,
  cashOutMinor: 0n,
  expectedClosingCashMinor: 370000n,
  openedAtIso: '2026-10-14T08:00:00Z',
});
registersModel.addSession({
  id: 'reg_lon_02',
  registerCode: 'REG-LON-02',
  registerName: 'Counter Till 02 (Flagship)',
  branchId: 'brn_london_flagship',
  branchName: 'London Flagship',
  cashierId: 'usr_liam',
  cashierName: 'Liam Vance',
  status: 'RECONCILED',
  openingFloatMinor: 25000n,
  cashSalesMinor: 289000n,
  currentCashExpectedMinor: 314000n,
  actualClosingCashMinor: 314000n,
  cashInMinor: 289000n,
  cashOutMinor: 0n,
  expectedClosingCashMinor: 314000n,
  varianceMinor: 0n,
  salesCount: 11,
  openedAtIso: '2026-10-14T08:00:00Z',
  closedAtIso: '2026-10-14T16:00:00Z',
});

const rbacModel = new RbacViewModel('dark');
rbacModel.addStaffMember({
  id: 'usr_victoria',
  fullName: 'Victoria Sterling',
  email: 'victoria@apex.com',
  roleCode: 'BUSINESS_OWNER',
  roleName: 'Business Owner',
  scope: { tenantId: 'ten_apex_global' },
  status: 'ACTIVE',
  joinedDateIso: '2026-01-01T00:00:00Z',
});
rbacModel.addStaffMember({
  id: 'usr_david',
  fullName: "David O'Connor",
  email: 'david@apex.com',
  roleCode: 'BRANCH_MANAGER',
  roleName: 'Store Manager',
  scope: { tenantId: 'ten_apex_global', branchId: 'brn_london_flagship', branchName: 'London Flagship' },
  status: 'ACTIVE',
  joinedDateIso: '2026-02-15T00:00:00Z',
});
rbacModel.addStaffMember({
  id: 'usr_emma',
  fullName: 'Emma Watson',
  email: 'emma@apex.com',
  roleCode: 'CASHIER',
  roleName: 'Head Cashier',
  scope: { tenantId: 'ten_apex_global', branchId: 'brn_london_flagship', branchName: 'London Flagship' },
  status: 'ACTIVE',
  joinedDateIso: '2026-03-01T00:00:00Z',
});
rbacModel.addStaffMember({
  id: 'usr_samuel',
  fullName: 'Samuel Adebayo',
  email: 'samuel@apex.com',
  roleCode: 'WAREHOUSE_PICKER',
  roleName: 'Warehouse Operator',
  scope: { tenantId: 'ten_apex_global', branchId: 'brn_london_flagship', branchName: 'London DC' },
  status: 'ACTIVE',
  joinedDateIso: '2026-03-10T00:00:00Z',
});

const organizationModel = new OrganizationViewModel('dark');
organizationModel.addCompany({
  id: 'cmp_apex_uk',
  name: 'Apex Retail UK Ltd',
  legalName: 'Apex Retail UK Limited',
  currency: 'GBP',
  timezone: 'Europe/London',
  isHolding: true,
  branchesCount: 2,
});
organizationModel.addCompany({
  id: 'cmp_apex_us',
  name: 'Apex US Distribution Inc',
  legalName: 'Apex US Distribution Incorporated',
  currency: 'USD',
  timezone: 'America/New_York',
  isHolding: false,
  branchesCount: 1,
});
organizationModel.addBranch({
  id: 'brn_london_flagship',
  companyId: 'cmp_apex_uk',
  name: 'London Flagship Store',
  code: 'LON-FLG',
  type: 'STORE',
  isActive: true,
});
organizationModel.addBranch({
  id: 'brn_birmingham_dc',
  companyId: 'cmp_apex_uk',
  name: 'Birmingham Logistics Hub',
  code: 'BIR-DC',
  type: 'WAREHOUSE',
  isActive: true,
});
organizationModel.addBranch({
  id: 'brn_ny_hub',
  companyId: 'cmp_apex_us',
  name: 'New York Distribution Center',
  code: 'NYC-DC',
  type: 'WAREHOUSE',
  isActive: true,
});

// 2. Render View HTML Blocks
const founderHtml = founderView.renderPlatformFounderPortalHtml();

const masterBusinessSidebarHtml = renderMasterSidebarHtml({
  activeViewId: 'dashboard',
  tenantName: 'Apex Global Retail & Logistics Ltd',
  branchName: 'London Flagship Store',
  theme: 'dark',
  onItemClickFnName: 'window.stokrovaApp.showView',
});

const baseBusinessViewsHtml = renderAllWorkspaceViewsHtml({
  theme: 'dark',
  tenantName: 'Apex Global Retail & Logistics Ltd',
  branchName: 'London Flagship Store',
  currencyCode: 'USD',
  onActionToastFnName: 'window.stokrovaApp.showToast',
});

function replaceViewBlock(html, viewId, innerHtml) {
  const pattern = new RegExp(
    `<!-- =+ -->\\s*<!-- \\d+\\.[^>]* -->\\s*<!-- =+ -->\\s*<div id="ws-view-${viewId}" class="ws-view-content"[^>]*>[\\s\\S]*?(?=(?:<!-- =+ -->|\\s*</main>|$))`,
    'g'
  );
  const replacement = `<!-- ========================================== -->\n    <div id="ws-view-${viewId}" class="ws-view-content" style="${viewId === 'dashboard' ? 'display: block;' : 'display: none;'}">\n      ${innerHtml}\n    </div>\n\n    `;
  return html.replace(pattern, replacement);
}

let allBusinessViewsHtml = baseBusinessViewsHtml;
allBusinessViewsHtml = replaceViewBlock(allBusinessViewsHtml, 'dashboard', dashboardModel.renderDashboardHtml());
allBusinessViewsHtml = replaceViewBlock(allBusinessViewsHtml, 'suppliers', procurementModel.renderSuppliersTableHtml());
allBusinessViewsHtml = replaceViewBlock(allBusinessViewsHtml, 'receiving', procurementModel.renderThreeWayMatchAuditHtml());
allBusinessViewsHtml = replaceViewBlock(allBusinessViewsHtml, 'registers', registersModel.renderSessionsTableHtml('USD'));
allBusinessViewsHtml = replaceViewBlock(allBusinessViewsHtml, 'gl', `${financeModel.renderJournalLedgerHtml()}\n<div style="margin-top: 24px;">\n${financeModel.renderChartOfAccountsHtml()}\n</div>`);
allBusinessViewsHtml = replaceViewBlock(allBusinessViewsHtml, 'org', organizationModel.renderOrganizationHtml());
allBusinessViewsHtml = replaceViewBlock(allBusinessViewsHtml, 'rbac', rbacModel.renderStaffManagementHtml());

// 3. Assemble Complete Interactive Application HTML
const completeAppHtml = `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — Platform Founder & Enterprise Operations</title>
  <link rel="icon" type="image/png" href="https://assets.stokrova.com/icon-32.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0D1117;
      --surface: #161B22;
      --card: #1F242C;
      --border: #30363D;
      --border-strong: #484F58;
      --primary: #BD9652;
      --primary-fg: #000000;
      --text-primary: #F0F6FC;
      --text-secondary: #8B949E;
      --text-muted: #6E7681;
      --success: #3FB950;
      --error: #F85149;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --stokrova-font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background: var(--bg);
      color: var(--text-primary);
      font-family: var(--font-sans);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    /* Top Mode & Persona Switcher Bar */
    .top-mode-bar {
      background: #090D12;
      border-bottom: 1px solid var(--border);
      padding: 8px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8125rem;
    }
    .mode-pills { display: flex; gap: 8px; align-items: center; }
    .mode-pill {
      padding: 5px 14px;
      border-radius: 9999px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    .mode-pill.active {
      background: var(--primary);
      color: var(--primary-fg);
      box-shadow: 0 0 10px rgba(189,150,82,0.3);
    }
    .mode-pill:not(.active) {
      background: var(--surface);
      color: var(--text-secondary);
      border-color: var(--border);
    }
    .mode-pill:hover:not(.active) {
      color: var(--text-primary);
      border-color: var(--text-muted);
    }
    .persona-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .persona-select {
      background: var(--surface);
      border: 1px solid var(--borderStrong);
      color: var(--text-primary);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    /* App Layout */
    .app-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      width: 275px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .sidebar-section-title {
      padding: 16px 16px 6px 16px;
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      margin: 2px 8px;
      border-radius: 6px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
    }
    .nav-item.active {
      background: rgba(189,150,82,0.15);
      color: var(--primary);
      font-weight: 600;
      border-left: 3px solid var(--primary);
    }
    .content-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: var(--bg);
    }
    .view-panel { display: none; }
    .view-panel.active { display: block; }

    /* Toast Notification */
    #toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1F242C;
      border: 1px solid var(--primary);
      color: #F0F6FC;
      padding: 14px 20px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      z-index: 10000;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* Custom Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
  </style>
</head>
<body>

  <!-- Top Mode Switcher Bar -->
  <div class="top-mode-bar">
    <div style="display: flex; align-items: center; gap: 16px;">
      <div style="font-weight: 800; color: var(--primary); font-size: 1rem; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
        <span>◆</span>
        <span>STOKROVA</span>
        <span style="font-size: 0.65rem; background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); padding: 1px 6px; border-radius: 4px;">v1.0.0</span>
      </div>
      <div class="mode-pills">
        <div id="pill-founder" class="mode-pill active" onclick="window.stokrovaApp.switchMode('FOUNDER')">
          👑 Platform Founder Console
        </div>
        <div id="pill-business" class="mode-pill" onclick="window.stokrovaApp.switchMode('BUSINESS')">
          🏢 Business Operations Console (28 Modules)
        </div>
      </div>
    </div>

    <div class="persona-selector">
      <span style="color: var(--text-muted); font-size: 0.75rem;">Simulated Active Persona:</span>
      <select id="persona-select" class="persona-select" onchange="window.stokrovaApp.handlePersonaChange(this.value)">
        <option value="FOUNDER">👑 Platform Founder (Global Super-Admin)</option>
        <option value="OWNER">🏢 Business Owner (Victoria Sterling - Full Access)</option>
        <option value="MANAGER">🏪 Store Manager (David O'Connor - Operations)</option>
        <option value="CASHIER">💳 Head Cashier (Emma Watson - POS Terminal)</option>
        <option value="PICKER">📦 Warehouse Operator (Samuel Adebayo - Wave Picking)</option>
      </select>
    </div>
  </div>

  <!-- Main App Shell -->
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- 1. Founder Menu -->
      <div id="sidebar-founder-menu">
        <div class="sidebar-section-title">Platform Super-Admin</div>
        <div class="nav-item active" onclick="window.stokrovaApp.showView('founder')">
          <span>🏛️ Tenant Organizations</span>
          <span style="background: rgba(189,150,82,0.2); color: var(--primary); padding: 1px 6px; border-radius: 9999px; font-size: 0.7rem;">4</span>
        </div>
        <div class="nav-item" onclick="window.stokrovaApp.openEnrollModal()">
          <span>➕ Enroll New Business</span>
        </div>
        <div class="nav-item" onclick="window.stokrovaApp.showToast('Global SaaS billing synced: 4 active subscription contracts.')">
          <span>💳 Subscription Plans</span>
        </div>
        <div class="nav-item" onclick="window.stokrovaApp.showToast('Platform telemetry: 99.98% uptime, 0 replication lag.')">
          <span>🛡️ Global Audit & Health</span>
        </div>
      </div>

      <!-- 2. Master Business Navigation Menu (All 8 Sections & 28 Modules) -->
      <div id="sidebar-business-menu" style="display: none; height: 100%;">
        ${masterBusinessSidebarHtml}
      </div>

      <div style="margin-top: auto; padding: 16px; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted);">
        <div>Active Tenant: <strong id="sidebar-tenant-name" style="color: var(--text-primary);">Platform Root</strong></div>
        <div style="margin-top: 2px;">Multi-Tenant Rule 21 Active</div>
      </div>
    </aside>

    <!-- Content Viewport -->
    <main class="content-viewport">
      <!-- 1. Founder Portal View -->
      <div id="view-founder" class="view-panel active">
        ${founderHtml}
      </div>

      <!-- 2. Business Operations Views (All 28 Modules + DAG Workflows) -->
      ${allBusinessViewsHtml}
    </main>
  </div>

  <!-- Toast Notification -->
  <div id="toast-notification">
    <span id="toast-icon">✓</span>
    <span id="toast-message">Action successful</span>
  </div>

  <!-- Interactive Client Controller Script -->
  <script>
    window.stokrovaApp = {
      currentMode: 'FOUNDER',
      currentView: 'founder',
      cart: [],
      todayRevenue: 382000.00,

      switchMode(mode) {
        this.currentMode = mode;
        const pillFounder = document.getElementById('pill-founder');
        const pillBusiness = document.getElementById('pill-business');
        const sidebarFounder = document.getElementById('sidebar-founder-menu');
        const sidebarBusiness = document.getElementById('sidebar-business-menu');
        const sidebarTenantName = document.getElementById('sidebar-tenant-name');

        if (mode === 'FOUNDER') {
          pillFounder.classList.add('active');
          pillBusiness.classList.remove('active');
          sidebarFounder.style.display = 'block';
          sidebarBusiness.style.display = 'none';
          sidebarTenantName.textContent = 'Platform Root';
          this.showView('founder');
        } else {
          pillFounder.classList.remove('active');
          pillBusiness.classList.add('active');
          sidebarFounder.style.display = 'none';
          sidebarBusiness.style.display = 'block';
          sidebarTenantName.textContent = 'Apex Global Ltd';
          this.showView('dashboard');
        }
      },

      showView(viewId) {
        this.currentView = viewId;
        // Hide all views
        document.querySelectorAll('.view-panel, .ws-view-content').forEach(el => el.style.display = 'none');
        
        // Show target view
        const targetView = document.getElementById('view-' + viewId) || document.getElementById('ws-view-' + viewId);
        if (targetView) targetView.style.display = 'block';

        // Update nav items
        document.querySelectorAll('.nav-item, .workspace-nav-item').forEach(el => {
          el.classList.remove('active');
          if (el.classList.contains('workspace-nav-item')) {
            el.style.background = 'transparent';
            el.style.color = 'var(--text-secondary)';
            el.style.fontWeight = '500';
            el.style.borderLeft = 'none';
          }
        });

        const activeNav = document.getElementById('nav-' + viewId) || document.getElementById('ws-nav-' + viewId);
        if (activeNav) {
          activeNav.classList.add('active');
          if (activeNav.classList.contains('workspace-nav-item')) {
            activeNav.style.background = 'rgba(189,150,82,0.15)';
            activeNav.style.color = '#E0CB9F';
            activeNav.style.fontWeight = '600';
            activeNav.style.borderLeft = '3px solid #BD9652';
          }
        }

        const viewport = document.querySelector('.content-viewport');
        if (viewport) viewport.scrollTop = 0;
      },

      openEnrollModal() {
        const modal = document.getElementById('enroll-modal-backdrop');
        if (modal) modal.style.display = 'flex';
      },

      closeEnrollModal() {
        const modal = document.getElementById('enroll-modal-backdrop');
        if (modal) modal.style.display = 'none';
      },

      handleEnrollSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('new-company-name').value;
        const slug = document.getElementById('new-company-slug').value;
        const owner = document.getElementById('new-owner-name').value;
        const email = document.getElementById('new-owner-email').value;
        const currency = document.getElementById('new-currency-code').value;
        const tier = document.getElementById('new-subscription-tier').value;

        // Append to table live
        const tbody = document.querySelector('.tenant-directory-container tbody');
        if (tbody) {
          const tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid var(--border)';
          tr.innerHTML = \`
            <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary);">
              <div>\${name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">slug: \${slug} • id: ten_\${slug.replace(/[^a-z0-9]/g, '_')}</div>
            </td>
            <td style="padding: 14px 16px; color: var(--text-secondary); font-size: 0.875rem;">
              <div>\${owner}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">\${email}</div>
            </td>
            <td style="padding: 14px 16px;">
              <span style="background: rgba(189,150,82,0.18); color: #BD9652; border: 1px solid #BD9652; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">\${tier}</span>
            </td>
            <td style="padding: 14px 16px; color: var(--text-secondary); font-size: 0.8125rem;">
              1 co / 1 branch
            </td>
            <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">
              \${currency} 0.00
            </td>
            <td style="padding: 14px 16px;">
              <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
            </td>
            <td style="padding: 14px 16px; text-align: right;">
              <button onclick="window.stokrovaApp.toggleTenantStatus(this)" style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: #2C1518; color: #F87171; border: 1px solid #5C1D24;">Suspend</button>
            </td>
          \`;
          tbody.prepend(tr);
        }

        this.closeEnrollModal();
        this.showToast(\`✓ Enrolled \${name}! Tenant '\${slug}' provisioned with owner \${email}.\`);
      },

      toggleTenantStatus(btn) {
        if (btn && btn.textContent) {
          const isSuspending = btn.textContent.trim() === 'Suspend';
          btn.textContent = isSuspending ? 'Reactivate' : 'Suspend';
          btn.style.background = isSuspending ? '#14291F' : '#2C1518';
          btn.style.color = isSuspending ? '#4ADE80' : '#F87171';
          btn.style.borderColor = isSuspending ? '#1E4620' : '#5C1D24';
          const row = btn.closest('tr');
          if (row) {
            const badge = row.querySelector('td:nth-child(6) span');
            if (badge) {
              badge.textContent = isSuspending ? 'SUSPENDED' : 'ACTIVE';
              badge.style.background = isSuspending ? '#2C1518' : '#14291F';
              badge.style.color = isSuspending ? '#F87171' : '#4ADE80';
              badge.style.borderColor = isSuspending ? '#5C1D24' : '#1E4620';
            }
          }
        }
        this.showToast('Tenant status updated. Multi-tenant isolation preserved (Rule 21).');
      },

      inspectTenant(id) {
        this.switchMode('BUSINESS');
        this.showToast(\`Viewing workspace for tenant \${id}\`);
      },

      handlePersonaChange(persona) {
        if (persona === 'FOUNDER') {
          this.switchMode('FOUNDER');
          this.showToast('Switched to Platform Founder (Global Super-Admin)');
          return;
        }

        this.switchMode('BUSINESS');
        const isCashier = persona === 'CASHIER';
        const isPicker = persona === 'PICKER';
        const isManager = persona === 'MANAGER';

        const allNavItems = document.querySelectorAll('.workspace-nav-item');
        allNavItems.forEach(item => {
          const vId = item.getAttribute('data-view-id');
          if (isCashier) {
            item.style.display = (vId === 'pos' || vId === 'catalog' || vId === 'orders') ? 'flex' : 'none';
          } else if (isPicker) {
            item.style.display = (vId === 'inventory' || vId === 'picking' || vId === 'locations' || vId === 'ledger') ? 'flex' : 'none';
          } else if (isManager) {
            item.style.display = (vId === 'org' || vId === 'compliance') ? 'none' : 'flex';
          } else {
            // Owner has FULL wildcard access across all 28 views!
            item.style.display = 'flex';
          }
        });

        if (isCashier) {
          this.showView('pos');
          this.showToast('Active Persona: Emma Watson (Cashier - Front Counter)');
        } else if (isPicker) {
          this.showView('picking');
          this.showToast('Active Persona: Samuel Adebayo (Warehouse Picker)');
        } else if (isManager) {
          this.showView('dashboard');
          this.showToast('Active Persona: David O\\'Connor (Store Manager)');
        } else {
          this.showView('dashboard');
          this.showToast('Active Persona: Victoria Sterling (Business Owner - Full Access)');
        }
      },

      addItemToCart(sku, name, price) {
        const existing = this.cart.find(i => i.sku === sku);
        if (existing) {
          existing.qty += 1;
        } else {
          this.cart.push({ sku, name, price, qty: 1 });
        }
        this.renderCart();
        this.showToast(\`Added 1x \${name} to register ticket.\`);
      },

      addBarcodeToCart() {
        const input = document.getElementById('pos-barcode-input');
        if (!input) return;
        const code = input.value.trim().toUpperCase();
        input.value = '';
        if (code.includes('LAPTOP') || code === '5011000000018') {
          this.addItemToCart('LAPTOP-PRO-16', 'Apex Pro 16 Laptop', 2499.00);
        } else if (code.includes('PHONE') || code === '5011000000025') {
          this.addItemToCart('SMARTPHONE-ULTRA-5G', 'Apex Ultra 5G Phone', 999.00);
        } else {
          this.addItemToCart('SHIRT-OXFORD-BLU-M', 'Oxford Cotton Shirt', 65.00);
        }
      },

      renderCart() {
        const container = document.getElementById('pos-cart-items');
        const totalEl = document.getElementById('pos-cart-total');
        const checkoutBtn = document.getElementById('pos-checkout-btn');
        if (!container || !totalEl || !checkoutBtn) return;

        if (this.cart.length === 0) {
          container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px 0;">Till ticket is empty. Scan an item to ring up sale.</div>';
          totalEl.textContent = '$0.00';
          checkoutBtn.disabled = true;
          checkoutBtn.style.background = 'var(--border)';
          checkoutBtn.style.color = 'var(--text-muted)';
          checkoutBtn.style.cursor = 'not-allowed';
          return;
        }

        let total = 0;
        let html = '';
        this.cart.forEach((item, idx) => {
          const lineTotal = item.price * item.qty;
          total += lineTotal;
          html += \`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
              <div>
                <div style="font-weight: 600; color: var(--text-primary);">\${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--stokrova-font-mono);">\${item.sku} × \${item.qty}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-weight: 700; font-family: var(--stokrova-font-mono); color: var(--text-primary);">$\${lineTotal.toFixed(2)}</span>
                <button onclick="window.stokrovaApp.removeItemFromCart(\${idx})" style="background: transparent; border: none; color: #F85149; cursor: pointer; font-size: 1rem;">×</button>
              </div>
            </div>
          \`;
        });

        container.innerHTML = html;
        totalEl.textContent = '$' + total.toFixed(2);
        checkoutBtn.disabled = false;
        checkoutBtn.style.background = 'var(--primary)';
        checkoutBtn.style.color = '#0E1116';
        checkoutBtn.style.cursor = 'pointer';
      },

      removeItemFromCart(idx) {
        this.cart.splice(idx, 1);
        this.renderCart();
      },

      completeSale() {
        if (this.cart.length === 0) return;
        let total = 0;
        this.cart.forEach(i => total += (i.price * i.qty));
        const saleRef = 'POS-SALE-' + Math.floor(100000 + Math.random() * 900000);
        const journalRef = 'JRNL-' + Date.now().toString().slice(-6);

        this.todayRevenue += total;
        const revEl = document.querySelector('#ws-view-dashboard .stokrova-net-revenue');
        if (revEl) {
          revEl.textContent = '$' + this.todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        const ledgerContainer = document.getElementById('ws-ledger-entries');
        if (ledgerContainer) {
          const entryDiv = document.createElement('div');
          entryDiv.className = 'ledger-row';
          entryDiv.style.borderBottom = '1px solid var(--border)';
          entryDiv.style.paddingBottom = '12px';
          entryDiv.innerHTML = \`
            <div style="color: #4ADE80; margin-bottom: 4px;">✓ \${journalRef} | Receipt \${saleRef}</div>
            <div style="color: var(--text-secondary); margin-left: 20px;">DR 1010 Cash at Bank: $\${total.toFixed(2)}</div>
            <div style="color: var(--text-secondary); margin-left: 20px;">CR 4010 Retail Revenue: $\${total.toFixed(2)}</div>
            <div style="color: var(--text-muted); font-size: 0.75rem; margin-left: 20px; margin-top: 2px;">Delta: $0.00 (Balanced Double-Entry)</div>
          \`;
          ledgerContainer.insertBefore(entryDiv, ledgerContainer.firstChild);
        }

        this.cart = [];
        this.renderCart();
        this.showToast(\`✓ Sale \${saleRef} completed! Cash collected: $\${total.toFixed(2)}. Ledger balanced.\`);
      },

      showToast(msg) {
        const toast = document.getElementById('toast-notification');
        const toastMsg = document.getElementById('toast-message');
        if (toast && toastMsg) {
          toastMsg.textContent = msg;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }
      },

      // ==========================================
      // Rebranding & Custom Corporate Identity
      // ==========================================
      selectBrandAccent(hex) {
        const picker = document.getElementById('rebrand-color-picker');
        const textInput = document.getElementById('rebrand-hex-input');
        if (picker) picker.value = hex;
        if (textInput) textInput.value = hex;
        this.updateBrandPreview();
      },

      updateBrandPreview() {
        const hex = document.getElementById('rebrand-hex-input')?.value || '#BD9652';
        const name = document.getElementById('rebrand-company-name')?.value || 'Apex Global Retail & Logistics Ltd';
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Luxury Lifestyle & Electronics • Flagship Branch';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ APEX';

        const headEl = document.getElementById('preview-brand-header');
        if (headEl) {
          headEl.textContent = logo;
          headEl.style.color = hex;
        }
        const badgeEl = document.getElementById('preview-branch-badge');
        if (badgeEl) {
          badgeEl.style.color = hex;
        }
        const posBtn = document.getElementById('preview-pos-btn');
        if (posBtn) posBtn.style.background = hex;
        const scanBox = document.getElementById('preview-scanner-box');
        if (scanBox) scanBox.style.borderColor = hex;
        const scanTxt = document.getElementById('preview-scanner-text');
        if (scanTxt) scanTxt.style.color = hex;
        const pickBtn = document.getElementById('preview-pick-btn');
        if (pickBtn) pickBtn.style.background = hex;
        const rcptName = document.getElementById('preview-receipt-name');
        if (rcptName) rcptName.textContent = name;
        const rcptSlogan = document.getElementById('preview-receipt-slogan');
        if (rcptSlogan) rcptSlogan.textContent = slogan;
        const saveBtn = document.getElementById('btn-save-rebranding');
        if (saveBtn) saveBtn.style.background = hex;
      },

      saveCompanyRebranding() {
        const hex = document.getElementById('rebrand-hex-input')?.value || '#BD9652';
        const name = document.getElementById('rebrand-company-name')?.value || 'Apex Global Retail & Logistics Ltd';
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Luxury Lifestyle & Electronics • Flagship Branch';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ APEX';

        document.documentElement.style.setProperty('--primary', hex);
        document.documentElement.style.setProperty('--primary-hover', hex);
        
        try {
          localStorage.setItem('stokrova_tenant_brand', JSON.stringify({ hex, name, slogan, logo }));
        } catch (_) {}

        this.showToast(\`✓ Corporate rebrand saved! Brand accent (\${hex}) & company logo updated across all staff terminals, POS registers, and mobile devices.\`);
      },

      loadBrandSettings() {
        try {
          const raw = localStorage.getItem('stokrova_tenant_brand');
          if (!raw) return;
          const { hex, name, slogan, logo } = JSON.parse(raw);
          if (hex) {
            document.documentElement.style.setProperty('--primary', hex);
            document.documentElement.style.setProperty('--primary-hover', hex);
            const picker = document.getElementById('rebrand-color-picker');
            const textInput = document.getElementById('rebrand-hex-input');
            if (picker) picker.value = hex;
            if (textInput) textInput.value = hex;
          }
          if (name) {
            const compInput = document.getElementById('rebrand-company-name');
            if (compInput) compInput.value = name;
          }
          if (slogan) {
            const slogInput = document.getElementById('rebrand-receipt-slogan');
            if (slogInput) slogInput.value = slogan;
          }
          if (logo) {
            const logoInput = document.getElementById('rebrand-logo-text');
            if (logoInput) logoInput.value = logo;
          }
          this.updateBrandPreview();
        } catch (_) {}
      },

      // ==========================================
      // Staff Roster & Invitation Management
      // ==========================================
      openStaffInviteModal() {
        const modal = document.getElementById('modal-invite-staff');
        if (modal) modal.style.display = 'flex';
      },

      closeStaffInviteModal() {
        const modal = document.getElementById('modal-invite-staff');
        if (modal) modal.style.display = 'none';
      },

      handleStaffInviteSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('invite-staff-name').value.trim();
        const email = document.getElementById('invite-staff-email').value.trim();
        const role = document.getElementById('invite-staff-role').value;
        const branch = document.getElementById('invite-staff-branch').value;
        const pin = document.getElementById('invite-staff-pin').value.trim();

        if (!name || !email) {
          this.showToast('Please enter both staff member name and work email.');
          return;
        }

        const tableBody = document.getElementById('staff-table-body');
        if (tableBody) {
          const row = document.createElement('tr');
          row.style.borderBottom = '1px solid var(--border)';
          row.innerHTML = \`
            <td style="padding: 12px 14px;">
              <div style="font-weight: 600;">\${name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">\${email}</div>
            </td>
            <td style="padding: 12px 14px;">
              <span style="background: rgba(189,150,82,0.15); color: #BD9652; border: 1px solid #BD9652; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">\${role}</span>
            </td>
            <td style="padding: 12px 14px; font-size: 0.8125rem; color: var(--text-secondary);">Branch: \${branch}</td>
            <td style="padding: 12px 14px; text-align: center;">
              <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
            </td>
            <td style="padding: 12px 14px; text-align: right;">
              <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">PIN: \${pin}</span>
            </td>
          \`;
          tableBody.appendChild(row);
        }

        const countBadge = document.getElementById('staff-count-badge');
        if (countBadge && tableBody) {
          countBadge.textContent = \`\${tableBody.querySelectorAll('tr').length} Staff Members Active\`;
        }

        const inviteList = document.getElementById('pending-invitations-list');
        if (inviteList) {
          const invToken = \`tok_invite_\${Date.now()}\`;
          const row = document.createElement('tr');
          row.style.borderBottom = '1px solid var(--border)';
          row.innerHTML = \`
            <td style="padding: 10px 14px;">
              <div style="font-weight: 600;">\${name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">\${email}</div>
            </td>
            <td style="padding: 10px 14px; font-size: 0.8125rem;">\${role}</td>
            <td style="padding: 10px 14px; font-size: 0.8125rem; color: var(--text-secondary);">\${branch}</td>
            <td style="padding: 10px 14px; font-size: 0.75rem; font-family: var(--stokrova-font-mono); color: var(--primary);">https://stokrova.com/invite/\${invToken}...</td>
            <td style="padding: 10px 14px; text-align: right;">
              <button onclick="navigator.clipboard?.writeText('https://stokrova.com/invite/\${invToken}'); window.stokrovaApp.showToast('Copied invitation link to clipboard!')" style="padding: 4px 8px; border-radius: 4px; background: var(--card); border: 1px solid var(--border-strong); color: var(--text-primary); font-size: 0.75rem; cursor: pointer;">Copy Link</button>
            </td>
          \`;
          inviteList.insertBefore(row, inviteList.firstChild);
        }

        this.closeStaffInviteModal();
        this.showToast(\`✓ Staff member '\${name}' invited and added to workspace roster!\`);
      }
    };

    // Attach globals for inline events
    window.selectBrandAccent = (hex) => window.stokrovaApp.selectBrandAccent(hex);
    window.updateBrandPreview = () => window.stokrovaApp.updateBrandPreview();
    window.saveCompanyRebranding = () => window.stokrovaApp.saveCompanyRebranding();
    window.openStaffInviteModal = () => window.stokrovaApp.openStaffInviteModal();
    window.closeStaffInviteModal = () => window.stokrovaApp.closeStaffInviteModal();
    window.handleStaffInviteSubmit = (e) => window.stokrovaApp.handleStaffInviteSubmit(e);

    // Initialize brand settings
    window.stokrovaApp.loadBrandSettings();

    // Polyfill window.stokrovaFounder to link to stokrovaApp
    window.stokrovaFounder = {
      openEnrollModal: () => window.stokrovaApp.openEnrollModal(),
      closeEnrollModal: () => window.stokrovaApp.closeEnrollModal(),
      handleEnrollSubmit: (e) => window.stokrovaApp.handleEnrollSubmit(e),
      toggleTenantStatus: (btn) => window.stokrovaApp.toggleTenantStatus(btn),
      inspectTenant: (id) => window.stokrovaApp.inspectTenant(id),
      switchToBusinessMode: () => window.stokrovaApp.switchMode('BUSINESS'),
    };
  </script>
</body>
</html>
`;

// 4. Write to dist/index.html
const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), completeAppHtml.trim(), 'utf-8');
console.log('✅ Generated STOKROVA Interactive Platform Founder & Complete Business Console index.html at', path.join(distDir, 'index.html'));
