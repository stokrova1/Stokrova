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
  generateCssVariableString,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize View Models in Light Mode (Default)
const founderView = new PlatformFounderView('light');

const defaultContext = {
  tenantId: 'ten_apex_global',
  tenantName: 'Apex Global Retail & Logistics Ltd',
  companyId: 'cmp_apex_uk',
  companyName: 'Apex Retail UK Ltd',
  branchId: 'brn_london_flagship',
  branchName: 'London Flagship Store',
  userRoleCodes: ['BUSINESS_OWNER', 'SUPER_ADMIN'],
  userPermissions: ['*'], // Super user
};

const shell = new AdminWebShell({ context: defaultContext, theme: 'light' });

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
}, 'light');

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

const procurementModel = new ProcurementViewModel('light');
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

const financeModel = new FinanceViewModel('light');
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
  preparedBy: 'usr_arthur',
  preparedByName: 'Arthur Pendelton',
  postedBy: 'usr_arthur',
  postedByName: 'Arthur Pendelton',
  turnaroundMinutes: 12,
  lines: [
    { accountCode: '1010', accountName: 'Cash at Bank', debitMinor: 249900n, creditMinor: 0n },
    { accountCode: '4010', accountName: 'Retail Revenue', debitMinor: 0n, creditMinor: 249900n },
  ],
});

financeModel.addJournalEntry({
  id: 'jrnl_002',
  entryNumber: 'JRNL-2026-10-002',
  reference: 'PO-2026-089',
  description: 'Intel Workstation partial intake inventory asset capitalisation',
  dateIso: '2026-10-14T11:30:00Z',
  status: 'POSTED',
  currencyCode: 'USD',
  preparedBy: 'usr_arthur',
  preparedByName: 'Arthur Pendelton',
  postedBy: 'usr_arthur',
  postedByName: 'Arthur Pendelton',
  turnaroundMinutes: 16,
  lines: [
    { accountCode: '1400', accountName: 'Inventory Asset', debitMinor: 2400000n, creditMinor: 0n },
    { accountCode: '2010', accountName: 'Accounts Payable', debitMinor: 0n, creditMinor: 2400000n },
  ],
});

financeModel.addJournalEntry({
  id: 'jrnl_003',
  entryNumber: 'JRNL-2026-10-003',
  reference: 'EXP-OCT-01',
  description: 'Regional logistics hub facility maintenance voucher',
  dateIso: '2026-10-14T14:00:00Z',
  status: 'DRAFT',
  currencyCode: 'USD',
  preparedBy: 'usr_arthur',
  preparedByName: 'Arthur Pendelton',
  lines: [
    { accountCode: '5010', accountName: 'Cost of Goods Sold (COGS)', debitMinor: 150000n, creditMinor: 0n },
    { accountCode: '1010', accountName: 'Cash at Bank', debitMinor: 0n, creditMinor: 150000n },
  ],
});

// Subledger reconciliations
financeModel.addSubledgerReconciliation({
  id: 'recon_bank_01',
  reconciliationType: 'BANK_ACCOUNT',
  title: 'Barclays Commercial Operating Account',
  accountCode: '1010',
  periodId: '2026-10',
  ledgerBalanceMinor: 45000000n,
  statementBalanceMinor: 45000000n,
  discrepancyMinor: 0n,
  status: 'BALANCED',
  performedBy: 'usr_arthur',
  performedByName: 'Arthur Pendelton',
  performedAtIso: '2026-10-14T16:00:00Z',
  notes: 'Direct Open Banking feed matched statement line items with zero variance.',
});

financeModel.addSubledgerReconciliation({
  id: 'recon_ar_01',
  reconciliationType: 'ACCOUNTS_RECEIVABLE',
  title: 'B2B Trade Debtors Subledger (A/R)',
  accountCode: '1200',
  periodId: '2026-10',
  ledgerBalanceMinor: 1440000n,
  statementBalanceMinor: 1440000n,
  discrepancyMinor: 0n,
  status: 'BALANCED',
  performedBy: 'usr_arthur',
  performedByName: 'Arthur Pendelton',
  performedAtIso: '2026-10-14T16:15:00Z',
  notes: 'All open trade invoices reconciled against posted remittances.',
});

financeModel.addSubledgerReconciliation({
  id: 'recon_inv_01',
  reconciliationType: 'INVENTORY_LEDGER',
  title: 'London DC Physical Valuation vs General Ledger',
  accountCode: '1400',
  periodId: '2026-10',
  ledgerBalanceMinor: 124000000n,
  statementBalanceMinor: 124000000n,
  discrepancyMinor: 0n,
  status: 'BALANCED',
  performedBy: 'usr_arthur',
  performedByName: 'Arthur Pendelton',
  performedAtIso: '2026-10-14T16:30:00Z',
  notes: 'Quarterly perpetual cycle count matches GL Asset 1400 without shrinkage adjustments.',
});

financeModel.addSubledgerReconciliation({
  id: 'recon_cash_01',
  reconciliationType: 'CASH_DRAWER',
  title: 'Store Front Counter Till Sessions Float Audit',
  accountCode: '1010',
  periodId: '2026-10',
  ledgerBalanceMinor: 684000n,
  statementBalanceMinor: 684000n,
  discrepancyMinor: 0n,
  status: 'BALANCED',
  performedBy: 'usr_arthur',
  performedByName: 'Arthur Pendelton',
  performedAtIso: '2026-10-14T16:45:00Z',
  notes: 'Blind cashier closing counts for Reg 01 and Reg 02 verified against expected balance.',
});

const registersModel = new RegistersViewModel('light');
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

const rbacModel = new RbacViewModel('light');
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
rbacModel.addStaffMember({
  id: 'usr_arthur',
  fullName: 'Arthur Pendelton',
  email: 'arthur@apex.com',
  roleCode: 'GENERAL_ACCOUNTANT',
  roleName: 'Lead Financial Accountant',
  scope: { tenantId: 'ten_apex_global', companyId: 'cmp_apex_uk', companyName: 'Apex Retail UK Ltd' },
  status: 'ACTIVE',
  joinedDateIso: '2026-02-01T00:00:00Z',
});
rbacModel.addStaffMember({
  id: 'usr_marcus',
  fullName: 'Marcus Bennett',
  email: 'marcus@apex.com',
  roleCode: 'DELIVERY_DRIVER',
  roleName: 'Route Logistics Driver',
  scope: { tenantId: 'ten_apex_global', branchId: 'brn_london_flagship', branchName: 'London Flagship' },
  status: 'ACTIVE',
  joinedDateIso: '2026-03-15T00:00:00Z',
});
rbacModel.addStaffMember({
  id: 'usr_clara',
  fullName: 'Clara Oswald',
  email: 'clara@apex.com',
  roleCode: 'SALES_REPRESENTATIVE',
  roleName: 'Senior B2B Account Executive',
  scope: { tenantId: 'ten_apex_global', companyId: 'cmp_apex_uk', companyName: 'Apex Retail UK Ltd' },
  status: 'ACTIVE',
  joinedDateIso: '2026-01-15T00:00:00Z',
});

const organizationModel = new OrganizationViewModel('light');
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
  theme: 'light',
  onItemClickFnName: 'window.stokrovaApp.showView',
});

const baseBusinessViewsHtml = renderAllWorkspaceViewsHtml({
  theme: 'light',
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

// Dedicated Personal Staff Workspaces
const accountantHtml = financeModel.renderAccountantWorkspaceHtml({
  currentMemberId: 'usr_arthur',
  currentMemberName: 'Arthur Pendelton',
  companyName: 'Apex Retail UK Ltd',
  currency: 'USD',
  filterMode: 'my',
  isGeneralAccountant: true,
});

const cashierWorkspaceHtml = registersModel.renderCashierPersonalWorkspaceHtml({
  cashierId: 'usr_emma',
  cashierName: 'Emma Watson',
  branchName: 'London Flagship Store',
  currency: 'USD',
});

allBusinessViewsHtml += `
    <!-- ========================================== -->
    <!-- ACCOUNTANT WORKSPACE (/finance/accountant) -->
    <!-- ========================================== -->
    <div id="ws-view-accountant" class="ws-view-content" style="display: none;">
      ${accountantHtml}
    </div>

    <!-- ========================================== -->
    <!-- CASHIER SHIFT & DESK (/pos/cashier-desk) -->
    <!-- ========================================== -->
    <div id="ws-view-cashier-desk" class="ws-view-content" style="display: none;">
      ${cashierWorkspaceHtml}
    </div>
`;

// 3. Assemble Complete Interactive Application HTML
const completeAppHtml = `
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — Platform Founder & Enterprise Operations</title>
  <link rel="icon" type="image/png" href="https://assets.stokrova.com/icon-32.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
${generateCssVariableString('light')}
${generateCssVariableString('dark')}

    :root {
      --bg: var(--stokrova-bg);
      --surface: var(--stokrova-surface);
      --card: var(--stokrova-card);
      --card-hover: var(--stokrova-card-hover);
      --border: var(--stokrova-border);
      --border-strong: var(--stokrova-border-strong);
      --borderStrong: var(--stokrova-border-strong);
      --primary: var(--stokrova-primary);
      --primary-hover: var(--stokrova-primary-hover);
      --primary-fg: var(--stokrova-primary-fg);
      --text-primary: var(--stokrova-text-primary);
      --text-secondary: var(--stokrova-text-secondary);
      --text-muted: var(--stokrova-text-muted);
      --success: var(--stokrova-status-success-text);
      --error: var(--stokrova-status-error-text);
      --font-sans: var(--stokrova-font-sans);
      --stokrova-font-mono: var(--stokrova-font-mono);
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
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 6px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8125rem;
      min-height: 40px;
      z-index: 999;
    }
    .mode-pills { display: flex; gap: 8px; align-items: center; }
    .mode-pill {
      padding: 4px 14px;
      border-radius: 9999px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.75rem;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    .mode-pill.active {
      background: var(--primary);
      color: var(--primary-fg);
      box-shadow: 0 0 10px rgba(189,150,82,0.25);
    }
    .mode-pill:not(.active) {
      background: var(--card);
      color: var(--text-secondary);
      border-color: var(--border);
    }
    .mode-pill:hover:not(.active) {
      color: var(--text-primary);
      border-color: var(--border-strong);
    }
    .persona-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .persona-select {
      background: var(--card);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
      padding: 4px 10px;
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
      width: 272px;
      min-width: 272px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .sidebar-section-title {
      padding: 14px 16px 6px 16px;
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
      padding: 8px 14px;
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
      background: var(--card-hover);
      color: var(--text-primary);
    }
    .nav-item.active {
      background: rgba(189,150,82,0.12);
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

    /* Palette item hover */
    .palette-item:hover {
      background: var(--surface) !important;
    }

    /* Modal Animation */
    @keyframes modalIn {
      from { transform: scale(0.97) translateY(-8px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Toast Notification */
    #toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--card);
      border: 1px solid var(--primary);
      color: var(--text-primary);
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* Accessibility: Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* Custom Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
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
        <div id="pill-business" class="mode-pill active" onclick="window.stokrovaApp.switchMode('BUSINESS')">
          🏢 Business Operations Console (31 Pages / 9 Domains)
        </div>
        <div id="pill-founder" class="mode-pill" onclick="window.stokrovaApp.switchMode('FOUNDER')">
          👑 Platform Founder Console
        </div>
      </div>
    </div>

    <div class="persona-selector">
      <span style="color: var(--text-muted); font-size: 0.75rem;">Simulated Active Persona:</span>
      <select id="persona-select" class="persona-select" onchange="window.stokrovaApp.handlePersonaChange(this.value)">
        <option value="OWNER" selected>🏢 Business Owner (Victoria Sterling - Full Access)</option>
        <option value="ACCOUNTANT">⚖️ Lead Financial Accountant (Arthur Pendelton - General Ledger & Reconciliation)</option>
        <option value="FOUNDER">👑 Platform Founder (Global Super-Admin)</option>
        <option value="MANAGER">🏪 Store Manager (David O'Connor - Operations)</option>
        <option value="CASHIER">💳 Head Cashier (Emma Watson - POS Terminal & Shift Desk)</option>
        <option value="PICKER">📦 Warehouse Operator (Samuel Adebayo - Wave Picking)</option>
        <option value="DRIVER">🚚 Logistics Driver (Marcus Bennett - Route & POD)</option>
        <option value="SALES_REP">💼 B2B Sales Executive (Clara Oswald - Quotes & Accounts)</option>
      </select>
    </div>
  </div>

  <!-- Business Executive Shell Header (Rendered for Business Operations) -->
  <div id="business-header" style="display: block;">
    ${shell.renderHeaderHtml()}
  </div>

  <!-- Main App Shell -->
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- 1. Founder Menu (Hidden by default) -->
      <div id="sidebar-founder-menu" style="display: none;">
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

      <!-- 2. Master Business Navigation Menu (9 Canonical Domains & 31 Pages) -->
      <div id="sidebar-business-menu" style="display: block; height: 100%;">
        ${masterBusinessSidebarHtml}
      </div>

      <div style="margin-top: auto; padding: 16px; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted);">
        <div>Active Tenant: <strong id="sidebar-tenant-name" style="color: var(--text-primary);">Apex Global Ltd</strong></div>
        <div style="margin-top: 2px;">Multi-Tenant Isolation Active</div>
      </div>
    </aside>

    <!-- Content Viewport -->
    <main class="content-viewport">
      <!-- 1. Founder Portal View (Hidden by default) -->
      <div id="view-founder" class="view-panel" style="display: none;">
        ${founderHtml}
      </div>

      <!-- 2. Business Operations Views (All Canonical Domains + DAG Workflows) -->
      ${allBusinessViewsHtml}
    </main>
  </div>

  <!-- Command Palette Modal (Cmd+K / Ctrl+K) -->
  <div id="command-palette-backdrop" class="modal-backdrop" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); z-index: 10000; align-items: flex-start; justify-content: center; padding-top: 12vh;" onclick="if(event.target === this) window.stokrovaApp.closeQuickSearch()">
    <div class="command-palette-modal" style="background: var(--card); border: 1px solid var(--border-strong); border-radius: 12px; width: 560px; max-width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden; animation: modalIn 0.15s ease-out;">
      <div style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border);">
        <span style="font-size: 1.1rem; color: var(--text-muted);">🔍</span>
        <input id="palette-search-input" type="text" placeholder="Type a page, command, or module (e.g. products, ledger, pos, orders)..." oninput="window.stokrovaApp.filterCommandPalette(this.value)" onkeydown="window.stokrovaApp.handlePaletteKeydown(event)" style="flex: 1; background: transparent; border: none; outline: none; font-size: 0.9375rem; color: var(--text-primary); font-family: var(--font-sans);" autofocus />
        <kbd style="border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; font-size: 0.6875rem; font-family: var(--stokrova-font-mono);">ESC</kbd>
      </div>
      <div id="palette-results-list" style="max-height: 340px; overflow-y: auto; padding: 8px;">
        <!-- Populated dynamically -->
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-top: 1px solid var(--border); background: var(--surface); font-size: 0.75rem; color: var(--text-muted);">
        <div style="display: flex; gap: 12px;">
          <span><kbd style="border: 1px solid var(--border-strong); padding: 1px 4px; border-radius: 3px;">↑</kbd> <kbd style="border: 1px solid var(--border-strong); padding: 1px 4px; border-radius: 3px;">↓</kbd> Navigate</span>
          <span><kbd style="border: 1px solid var(--border-strong); padding: 1px 4px; border-radius: 3px;">↵</kbd> Select</span>
        </div>
        <span>STOKROVA Quick Actions</span>
      </div>
    </div>
  </div>

  <!-- Native Desktop App Download Modal -->
  ${shell.renderDesktopDownloadModalHtml()}

  <!-- Mobile Scanner QR Pairing Modal -->
  ${shell.renderMobilePairingModalHtml()}

  <!-- Toast Notification -->
  <div id="toast-notification">
    <span id="toast-icon">✓</span>
    <span id="toast-message">Action successful</span>
  </div>

  <!-- Interactive Client Controller Script -->
  <script>
    window.stokrovaApp = {
      currentMode: 'BUSINESS',
      currentView: 'dashboard',
      cart: [],
      todayRevenue: 382000.00,

      paletteCommands: [
        { id: 'dashboard', title: 'Executive Operations Command Center', group: 'Overview', icon: '📊', shortcut: 'D' },
        { id: 'velocity', title: 'ABC Velocity & Dead Stock Analysis', group: 'Overview', icon: '📈' },
        { id: 'pos', title: 'POS Register Terminal (Cashier Till)', group: 'Sell', icon: '💳', shortcut: 'P' },
        { id: 'orders', title: 'Sales Orders & Fulfillment', group: 'Sell', icon: '🛒', shortcut: 'O' },
        { id: 'quotations', title: 'Quotations & B2B Proformas', group: 'Sell', icon: '📝' },
        { id: 'invoices', title: 'Fiscal Invoices & AR Receipts', group: 'Sell', icon: '🧾' },
        { id: 'crm', title: 'Customer Accounts & Credit Limits', group: 'Sell', icon: '👥' },
        { id: 'pricing', title: 'Tiered Price Lists & Rules', group: 'Sell', icon: '🏷️' },
        { id: 'promotions', title: 'Campaigns & Basket Promotions', group: 'Sell', icon: '🎁' },
        { id: 'loyalty', title: 'Loyalty Tiers & Reward Points', group: 'Sell', icon: '⭐' },
        { id: 'catalog', title: 'Products, Variants & Matrix Grid', group: 'Stock', icon: '📦' },
        { id: 'ledger', title: 'Inventory Valuation Ledger', group: 'Stock', icon: '📑' },
        { id: 'inventory', title: 'Multi-Location Stock Availability', group: 'Stock', icon: '🏢', shortcut: 'S' },
        { id: 'suppliers', title: 'Vendor Directory & Scorecards', group: 'Buy', icon: '🏭' },
        { id: 'receiving', title: 'Purchase Orders & 3-Way Match', group: 'Buy', icon: '📥' },
        { id: 'picking', title: 'Wave, Batch & Zone Picking', group: 'Move', icon: '⚡' },
        { id: 'bol', title: 'Containerization & Bills of Lading', group: 'Move', icon: '🚢' },
        { id: 'fleet', title: 'Fleet Tracking & Proof of Delivery', group: 'Move', icon: '🚚' },
        { id: 'bom', title: 'Bills of Materials (BOM)', group: 'Make', icon: '⚙️' },
        { id: 'production', title: 'Production Work Orders & Assembly', group: 'Make', icon: '🏭' },
        { id: 'registers', title: 'Till Sessions, Floats & Cash Count', group: 'Money', icon: '💰' },
        { id: 'accountant', title: 'Accountant Desk & Subledger Reconciliations', group: 'Money', icon: '⚖️', shortcut: 'A' },
        { id: 'cashier-desk', title: 'Cashier Shift & Terminal Desk', group: 'Sell', icon: '🧾' },
        { id: 'gl', title: 'Double-Entry General Ledger & Accounts', group: 'Money', icon: '⚖️' },
        { id: 'compliance', title: 'Fiscal E-Invoicing & VAT/Tax Audit', group: 'Money', icon: '🛡️' },
        { id: 'consolidation', title: 'Multi-Entity Group Consolidation', group: 'Money', icon: '🌐' },
        { id: 'treasury', title: 'Treasury & Bank Feed Reconciliation', group: 'Money', icon: '🏦' },
        { id: 'forensics', title: 'Audit Forensics & Immutable Trail', group: 'Control', icon: '🔍' },
        { id: 'workflows', title: 'DAG Workflows Studio & Rules Engine', group: 'Control', icon: '🔀' },
        { id: 'org', title: 'Organization Topology & Branch Tree', group: 'Settings', icon: '🏛️' },
        { id: 'rebranding', title: 'Corporate Identity & White-Label Theme', group: 'Settings', icon: '🎨' },
        { id: 'rbac', title: 'Staff Roster & Granular Permissions', group: 'Settings', icon: '🔐' },
        { id: 'peripherals', title: 'Hardware Peripherals & ESC/POS Devices', group: 'Settings', icon: '🖨️' },
        { id: 'webhooks', title: 'Webhooks, EDI & Event Subscriptions', group: 'Settings', icon: '🔌' },
      ],

      switchMode(mode) {
        this.currentMode = mode;
        const pillFounder = document.getElementById('pill-founder');
        const pillBusiness = document.getElementById('pill-business');
        const sidebarFounder = document.getElementById('sidebar-founder-menu');
        const sidebarBusiness = document.getElementById('sidebar-business-menu');
        const sidebarTenantName = document.getElementById('sidebar-tenant-name');
        const businessHeader = document.getElementById('business-header');

        if (mode === 'FOUNDER') {
          if (pillFounder) pillFounder.classList.add('active');
          if (pillBusiness) pillBusiness.classList.remove('active');
          if (sidebarFounder) sidebarFounder.style.display = 'block';
          if (sidebarBusiness) sidebarBusiness.style.display = 'none';
          if (businessHeader) businessHeader.style.display = 'none';
          if (sidebarTenantName) sidebarTenantName.textContent = 'Platform Root';
          this.showView('founder');
        } else {
          if (pillFounder) pillFounder.classList.remove('active');
          if (pillBusiness) pillBusiness.classList.add('active');
          if (sidebarFounder) sidebarFounder.style.display = 'none';
          if (sidebarBusiness) sidebarBusiness.style.display = 'block';
          if (businessHeader) businessHeader.style.display = 'block';
          if (sidebarTenantName) sidebarTenantName.textContent = 'Apex Global Ltd';
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
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            activeNav.style.background = isDark ? 'rgba(189,150,82,0.15)' : '#FDFBF7';
            activeNav.style.color = isDark ? '#E0CB9F' : '#85642D';
            activeNav.style.fontWeight = '600';
            activeNav.style.borderLeft = '3px solid #BD9652';
          }
        }

        const viewport = document.querySelector('.content-viewport');
        if (viewport) viewport.scrollTop = 0;
      },

      toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        try {
          localStorage.setItem('stokrova_theme', nextTheme);
        } catch (_) {}
        const themeBtn = document.querySelector('.theme-toggle-btn span');
        if (themeBtn) {
          themeBtn.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
        }
        // Refresh active nav item colors for theme
        const activeNav = document.querySelector('.workspace-nav-item.active');
        if (activeNav) {
          activeNav.style.background = nextTheme === 'dark' ? 'rgba(189,150,82,0.15)' : '#FDFBF7';
          activeNav.style.color = nextTheme === 'dark' ? '#E0CB9F' : '#85642D';
        }
        this.showToast('Theme switched to ' + (nextTheme === 'dark' ? 'Dark' : 'Light') + ' mode');
      },

      toggleBranchDropdown(e) {
        if (e && e.stopPropagation) e.stopPropagation();
        const dd = document.getElementById('branch-switcher-dropdown');
        if (dd) {
          dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        }
      },

      selectBranch(cmpId, cmpName, brnId, brnName) {
        const pill = document.querySelector('.workspace-pill');
        if (pill) {
          pill.textContent = cmpName + ' / ' + brnName;
        }
        const compTitle = document.querySelector('.company-brand-name');
        if (compTitle) {
          compTitle.textContent = cmpName;
        }
        const dd = document.getElementById('branch-switcher-dropdown');
        if (dd) dd.style.display = 'none';
        this.showToast('Switched branch to ' + brnName + ' (' + cmpName + ')');
      },

      toggleNotificationsDropdown(e) {
        if (e && e.stopPropagation) e.stopPropagation();
        this.showToast('3 operational notifications: 1 stock transfer in-transit, 1 discount approval pending, 1 tax batch ready.');
      },

      openQuickSearch() {
        const modal = document.getElementById('command-palette-backdrop');
        if (modal) {
          modal.style.display = 'flex';
          const input = document.getElementById('palette-search-input');
          if (input) {
            input.value = '';
            input.focus();
          }
          this.filterCommandPalette('');
        }
      },

      closeQuickSearch() {
        const modal = document.getElementById('command-palette-backdrop');
        if (modal) modal.style.display = 'none';
      },

      filterCommandPalette(q) {
        const query = (q || '').toLowerCase().trim();
        const container = document.getElementById('palette-results-list');
        if (!container) return;
        const matches = this.paletteCommands.filter(c => 
          !query || 
          c.title.toLowerCase().includes(query) || 
          c.group.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
        );
        if (matches.length === 0) {
          container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.875rem;">No matching pages or commands found.</div>';
          return;
        }
        let html = '';
        matches.forEach((cmd, idx) => {
          const shortcutBadge = cmd.shortcut ? '<kbd style="border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-secondary); padding: 2px 6px; border-radius: 4px; font-size: 0.6875rem; font-family: var(--stokrova-font-mono);">' + cmd.shortcut + '</kbd>' : '';
          const activeBg = idx === 0 ? 'background: var(--surface);' : '';
          html += '<div class="palette-item" onclick="window.stokrovaApp.executePaletteCommand(\\'' + cmd.id + '\\')" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: background 0.1s ease; ' + activeBg + '">' +
            '<div style="display: flex; align-items: center; gap: 12px;">' +
              '<span style="font-size: 1.15rem;">' + cmd.icon + '</span>' +
              '<div>' +
                '<div style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">' + cmd.title + '</div>' +
                '<div style="font-size: 0.75rem; color: var(--text-muted);">' + cmd.group + '</div>' +
              '</div>' +
            '</div>' +
            shortcutBadge +
          '</div>';
        });
        container.innerHTML = html;
      },

      executePaletteCommand(viewId) {
        this.closeQuickSearch();
        this.showView(viewId);
      },

      handlePaletteKeydown(e) {
        if (e.key === 'Escape') {
          this.closeQuickSearch();
        } else if (e.key === 'Enter') {
          const firstItem = document.querySelector('.palette-item');
          if (firstItem) firstItem.click();
        }
      },

      openDesktopModal() {
        const modal = document.getElementById('desktop-modal-backdrop');
        if (modal) modal.style.display = 'flex';
      },

      closeDesktopModal() {
        const modal = document.getElementById('desktop-modal-backdrop');
        if (modal) modal.style.display = 'none';
      },

      openMobileModal() {
        const modal = document.getElementById('mobile-modal-backdrop');
        if (modal) modal.style.display = 'flex';
      },

      closeMobileModal() {
        const modal = document.getElementById('mobile-modal-backdrop');
        if (modal) modal.style.display = 'none';
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
        this.showToast('Tenant status updated. Multi-tenant isolation preserved.');
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
        const isAccountant = persona === 'ACCOUNTANT';
        const isDriver = persona === 'DRIVER';
        const isSalesRep = persona === 'SALES_REP';

        const allNavItems = document.querySelectorAll('.workspace-nav-item');
        allNavItems.forEach(item => {
          const vId = item.getAttribute('data-view-id');
          if (isAccountant) {
            item.style.display = (vId === 'accountant' || vId === 'gl' || vId === 'registers' || vId === 'invoices' || vId === 'tax' || vId === 'treasury') ? 'flex' : 'none';
          } else if (isCashier) {
            item.style.display = (vId === 'cashier-desk' || vId === 'pos' || vId === 'catalog' || vId === 'orders' || vId === 'registers') ? 'flex' : 'none';
          } else if (isPicker) {
            item.style.display = (vId === 'picking' || vId === 'inventory' || vId === 'locations' || vId === 'ledger') ? 'flex' : 'none';
          } else if (isDriver) {
            item.style.display = (vId === 'fleet' || vId === 'dispatch' || vId === 'orders') ? 'flex' : 'none';
          } else if (isSalesRep) {
            item.style.display = (vId === 'crm' || vId === 'quotes' || vId === 'pricing' || vId === 'orders') ? 'flex' : 'none';
          } else if (isManager) {
            item.style.display = (vId === 'org' || vId === 'compliance') ? 'none' : 'flex';
          } else {
            // Owner has FULL wildcard access across all views!
            item.style.display = 'flex';
          }
        });

        if (isAccountant) {
          this.showView('accountant');
          this.showToast('Active Persona: Arthur Pendelton (Lead Financial Accountant)');
        } else if (isCashier) {
          this.showView('cashier-desk');
          this.showToast('Active Persona: Emma Watson (Head Cashier - Shift Desk)');
        } else if (isPicker) {
          this.showView('picking');
          this.showToast('Active Persona: Samuel Adebayo (Warehouse Picker - Zone A)');
        } else if (isDriver) {
          this.showView('fleet');
          this.showToast('Active Persona: Marcus Bennett (Logistics Driver - Route 4)');
        } else if (isSalesRep) {
          this.showView('crm');
          this.showToast('Active Persona: Clara Oswald (Senior B2B Account Executive)');
        } else if (isManager) {
          this.showView('dashboard');
          this.showToast("Active Persona: David O'Connor (Store Manager)");
        } else {
          this.showView('dashboard');
          this.showToast('Active Persona: Victoria Sterling (Business Owner - Full Access)');
        }
      },

      toggleAccountantViewScope(scope) {
        const rows = document.querySelectorAll('#accountant-journals-table tr[data-posted-by]');
        const btnMy = document.getElementById('btn-accountant-filter-my');
        const btnAll = document.getElementById('btn-accountant-filter-all');
        if (btnMy && btnAll) {
          if (scope === 'my') {
            btnMy.style.background = '#BD9652';
            btnMy.style.color = '#FFFFFF';
            btnAll.style.background = 'transparent';
            btnAll.style.color = 'var(--text-secondary)';
          } else {
            btnAll.style.background = '#BD9652';
            btnAll.style.color = '#FFFFFF';
            btnMy.style.background = 'transparent';
            btnMy.style.color = 'var(--text-secondary)';
          }
        }
        rows.forEach(r => {
          if (scope === 'my') {
            const author = r.getAttribute('data-posted-by');
            r.style.display = (author === 'usr_arthur') ? '' : 'none';
          } else {
            r.style.display = '';
          }
        });
        this.showToast(scope === 'my' ? "Filtered to Arthur Pendelton's attributed postings" : 'Showing all company general journal entries');
      },

      reconcileSubledger(recId) {
        const row = document.querySelector(\`tr[data-rec-id="\${recId}"]\`);
        if (row) {
          const statusCell = row.querySelector('.rec-status-badge');
          if (statusCell) {
            statusCell.textContent = 'BALANCED';
            statusCell.style.background = '#14291F';
            statusCell.style.color = '#4ADE80';
            statusCell.style.borderColor = '#1E4620';
          }
          const diffCell = row.querySelector('.rec-diff-cell');
          if (diffCell) {
            diffCell.textContent = '$0.00';
            diffCell.style.color = '#4ADE80';
          }
          const actionBtn = row.querySelector('.rec-action-btn');
          if (actionBtn) {
            actionBtn.disabled = true;
            actionBtn.textContent = 'Balanced ✓';
            actionBtn.style.opacity = '0.5';
            actionBtn.style.cursor = 'default';
          }
        }
        this.showToast(\`✓ Subledger reconciliation \${recId} verified and balanced to General Ledger.\`);
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
        checkoutBtn.style.color = 'var(--primary-fg)';
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
    window.toggleAccountantViewScope = (scope) => window.stokrovaApp.toggleAccountantViewScope(scope);
    window.reconcileSubledger = (recId) => window.stokrovaApp.reconcileSubledger(recId);

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

    // Global keyboard listener
    document.addEventListener('keydown', (e) => {
      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.stokrovaApp.openQuickSearch();
        return;
      }
      // Escape
      if (e.key === 'Escape') {
        window.stokrovaApp.closeQuickSearch();
        window.stokrovaApp.closeDesktopModal();
        window.stokrovaApp.closeMobileModal();
        window.stokrovaApp.closeEnrollModal();
        window.stokrovaApp.closeStaffInviteModal();
        const dd = document.getElementById('branch-switcher-dropdown');
        if (dd) dd.style.display = 'none';
        return;
      }
      // Skip single keys if typing in input / textarea
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        window.stokrovaApp.openQuickSearch();
      } else if (e.key === 'd' || e.key === 'D') {
        window.stokrovaApp.showView('dashboard');
      } else if (e.key === 'o' || e.key === 'O') {
        window.stokrovaApp.showView('orders');
      } else if (e.key === 'p' || e.key === 'P') {
        window.stokrovaApp.showView('pos');
      } else if (e.key === 'm' || e.key === 'M') {
        window.stokrovaApp.openMobileModal();
      } else if (e.key === 's' || e.key === 'S') {
        window.stokrovaApp.showView('inventory');
      }
    });

    // Outside click dismiss for dropdowns
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('branch-switcher-dropdown');
      const btn = document.getElementById('branch-switcher-btn');
      if (dd && dd.style.display === 'block') {
        if (!dd.contains(e.target) && (!btn || !btn.contains(e.target))) {
          dd.style.display = 'none';
        }
      }
    });

    // Theme initialization
    try {
      const savedTheme = localStorage.getItem('stokrova_theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      const themeBtn = document.querySelector('.theme-toggle-btn span');
      if (themeBtn) {
        themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
      }
    } catch (_) {}
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
