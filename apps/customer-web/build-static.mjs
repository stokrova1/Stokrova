import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LandingViewModel } from './dist/index.js';
import { renderMasterSidebarHtml, renderAllWorkspaceViewsHtml } from '@stokrova/ui';
import {
  DashboardViewModel,
  ProcurementViewModel,
  FinanceViewModel,
  RegistersViewModel,
  RbacViewModel,
  OrganizationViewModel,
} from '../admin-web/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Copy UI assets (official logo, symbol, favicons) to dist/assets
const uiAssetsDir = path.resolve(__dirname, '../../packages/ui/assets');
const distDir = path.resolve(__dirname, 'dist');
const distAssetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}

if (fs.existsSync(uiAssetsDir)) {
  const files = fs.readdirSync(uiAssetsDir);
  for (const file of files) {
    try {
      fs.copyFileSync(path.join(uiAssetsDir, file), path.join(distAssetsDir, file));
    } catch (err) {
      if (err.code !== 'EBUSY') throw err;
    }
  }
}

// 2. Instantiate View Model & Render Sections
const landingView = new LandingViewModel('dark');

const headerHtml = landingView.renderHeaderHtml();
const heroHtml = landingView.renderHeroHtml();
const moneyFlowHtml = landingView.renderMoneyFlowStripHtml();
const featuresHtml = landingView.renderFeaturesGridHtml();
const architectureHtml = landingView.renderArchitectureSectionHtml();
const posHtml = landingView.renderPosSectionHtml();
const whoItsForHtml = landingView.renderWhoItsForSectionHtml();
const pricingHtml = landingView.renderPricingSectionHtml();
const faqHtml = landingView.renderFaqSectionHtml();
const closingCtaHtml = landingView.renderClosingCtaHtml();

const registerModalHtml = landingView.renderRegisterModalHtml();
const loginModalHtml = landingView.renderLoginModalHtml();
const demoConfirmModalHtml = landingView.renderDemoConfirmModalHtml();
const legalModalHtml = landingView.renderLegalModalHtml();
const tourOverlayHtml = landingView.renderTourOverlayHtml();

const footerHtml = landingView.renderFooterHtml();

const isDemo = process.env.STOKROVA_DEMO_MODE === 'true' || process.argv.includes('--demo');

const masterSidebarHtml = renderMasterSidebarHtml({
  activeViewId: 'dashboard',
  tenantName: isDemo ? 'Apex Global Retail Ltd' : 'Organization Workspace',
  branchName: isDemo ? 'London Flagship' : 'Main Branch',
  theme: 'dark',
  onItemClickFnName: 'window.stokrovaCustomerApp.showWsView',
});

const dashboardModel = new DashboardViewModel(isDemo ? {
  grossMerchandiseValueMinor: 485000000n, // $4,850,000.00
  netRevenueMinor: 38200000n, // $382,000.00
  grossMarginBps: 3850, // 38.50%
  stockoutRiskIndex: 4,
  warehouseUtilizationPct: 78.5,
  openTillSessionsCount: 6,
  cashierVarianceAlertsMinor: 0n,
  activeWorkflowsRunning: 3,
  currencyCode: 'USD',
} : {
  grossMerchandiseValueMinor: 0n,
  netRevenueMinor: 0n,
  grossMarginBps: 0,
  stockoutRiskIndex: 0,
  warehouseUtilizationPct: 0,
  openTillSessionsCount: 0,
  cashierVarianceAlertsMinor: 0n,
  activeWorkflowsRunning: 0,
  currencyCode: 'USD',
}, 'dark');

if (isDemo) {

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
}

const procurementModel = new ProcurementViewModel('dark');
if (isDemo) {
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
    createdAtIso: '2026-10-12T10:00:00Z',
    expectedDeliveryIso: '2026-10-17T00:00:00Z',
    currencyCode: 'USD',
    status: 'PARTIALLY_RECEIVED',
    lines: [
      {
        id: 'pol_01',
        sku: 'SKU-CPU-I9',
        productName: 'Intel Core i9-14900K Processor',
        orderedQty: 20,
        receivedQty: 20,
        invoicedQty: 20,
        unitCostMinor: 58000n,
        invoicedUnitCostMinor: 58000n,
      },
      {
        id: 'pol_02',
        sku: 'SKU-MB-Z790',
        productName: 'ASUS ROG Maximus Z790 Hero Motherboard',
        orderedQty: 15,
        receivedQty: 10,
        invoicedQty: 10,
        unitCostMinor: 62000n,
        invoicedUnitCostMinor: 62000n,
      },
      {
        id: 'pol_03',
        sku: 'SKU-SSD-2TB',
        productName: 'Samsung 990 PRO 2TB NVMe SSD',
        orderedQty: 30,
        receivedQty: 0,
        invoicedQty: 0,
        unitCostMinor: 18000n,
        invoicedUnitCostMinor: 18000n,
      },
    ],
  });
}

const financeModel = new FinanceViewModel('dark');
if (isDemo) {
  financeModel.addJournalEntry({
    id: 'jrnl_001',
    entryNumber: 'JRNL-2026-10-001',
    reference: 'POS-CLOSE-042',
    description: 'Daily counter register settlement and merchant settlement transfer',
    dateIso: '2026-10-14T18:00:00Z',
    status: 'POSTED',
    currencyCode: 'USD',
    preparedBy: 'usr_arthur',
    preparedByName: 'Arthur Pendelton',
    postedBy: 'usr_arthur',
    postedByName: 'Arthur Pendelton',
    turnaroundMinutes: 24,
    lines: [
      { accountCode: '1010', accountName: 'Cash at Bank (Operating)', debitMinor: 284050n, creditMinor: 0n },
      { accountCode: '4010', accountName: 'Retail Counter Sales', debitMinor: 0n, creditMinor: 284050n },
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
}

const registersModel = new RegistersViewModel('dark');
if (isDemo) {
  registersModel.addSession({
    id: 'reg_lon_01',
    registerCode: 'REG-LON-01',
    registerName: 'Main Store Checkout Till 01',
    branchId: 'brn_london_flagship',
    branchName: 'London Flagship Store',
    cashierId: 'usr_emma',
    cashierName: 'Emma Watson',
    openedAtIso: '2026-10-14T08:00:00Z',
    openingFloatMinor: 35000n,
    cashSalesMinor: 113500n,
    cardSalesMinor: 170550n,
    cashInMinor: 0n,
    cashOutMinor: 0n,
    expectedClosingCashMinor: 148500n,
    actualClosingCashMinor: 148500n,
    varianceMinor: 0n,
    salesCount: 42,
    averageRingSeconds: 24,
    status: 'OPEN',
  });
}

const rbacModel = new RbacViewModel('dark');
if (isDemo) {
  rbacModel.addStaffMember({
    id: 'usr_victoria',
    fullName: 'Victoria Sterling',
    email: 'founder.victoria@apex-global.com',
    roleCode: 'BUSINESS_OWNER',
    roleName: 'Executive Business Owner',
    scope: { tenantId: 'ten_apex_global' },
    status: 'ACTIVE',
    joinedDateIso: '2026-01-15T00:00:00Z',
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
    id: 'usr_arthur',
    fullName: 'Arthur Pendelton',
    email: 'arthur@apex.com',
    roleCode: 'GENERAL_ACCOUNTANT',
    roleName: 'Lead Financial Accountant',
    scope: { tenantId: 'ten_apex_global', companyId: 'cmp_apex_uk', companyName: 'Apex Retail UK Ltd' },
    status: 'ACTIVE',
    joinedDateIso: '2026-02-01T00:00:00Z',
  });
}

const organizationModel = new OrganizationViewModel('dark');
if (isDemo) {
  organizationModel.addCompany({
    id: 'cmp_apex_uk',
    name: 'Apex Retail UK Ltd',
    legalName: 'Apex Retail UK Limited',
    currency: 'GBP',
    timezone: 'Europe/London',
    isHolding: true,
    branchesCount: 2,
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
}

const accountantHtml = financeModel.renderAccountantWorkspaceHtml({
  currentMemberId: isDemo ? 'usr_arthur' : 'usr_accountant',
  currentMemberName: isDemo ? 'Arthur Pendelton' : 'Assigned Accountant',
  companyName: isDemo ? 'Apex Retail UK Ltd' : 'Organization Workspace',
  currency: 'USD',
  filterMode: 'my',
  isGeneralAccountant: true,
});

const cashierWorkspaceHtml = registersModel.renderCashierPersonalWorkspaceHtml({
  cashierId: isDemo ? 'usr_emma' : 'usr_cashier',
  cashierName: isDemo ? 'Emma Watson' : 'Front Counter Cashier',
  branchName: isDemo ? 'London Flagship Store' : 'Main Branch',
  currency: 'USD',
});

const baseWorkspaceViewsHtml = renderAllWorkspaceViewsHtml({
  theme: 'dark',
  tenantName: isDemo ? 'Apex Global Retail Ltd' : 'Organization Workspace',
  branchName: isDemo ? 'London Flagship' : 'Main Branch',
  currencyCode: 'USD',
  onActionToastFnName: 'window.stokrovaCustomerApp.showToast',
  isDemo,
});

function replaceViewBlock(html, viewId, innerHtml) {
  const pattern = new RegExp(
    `<div id="ws-view-${viewId}" class="ws-view-content"[^>]*>[\\s\\S]*?(?=(?:<!-- =+ -->|<div id="ws-view-|$))`,
    'g'
  );
  const replaced = html.replace(pattern, `<div id="ws-view-${viewId}" class="ws-view-content" style="${viewId === 'dashboard' ? 'display: block;' : 'display: none;'}">\n      ${innerHtml}\n    </div>\n\n    `);
  return replaced;
}

let allWorkspaceViewsHtml = baseWorkspaceViewsHtml;
if (isDemo) {
  allWorkspaceViewsHtml = replaceViewBlock(allWorkspaceViewsHtml, 'dashboard', dashboardModel.renderDashboardHtml());
  allWorkspaceViewsHtml = replaceViewBlock(allWorkspaceViewsHtml, 'suppliers', procurementModel.renderSuppliersTableHtml());
  allWorkspaceViewsHtml = replaceViewBlock(allWorkspaceViewsHtml, 'receiving', procurementModel.renderThreeWayMatchAuditHtml());
  allWorkspaceViewsHtml = replaceViewBlock(allWorkspaceViewsHtml, 'registers', registersModel.renderSessionsTableHtml('USD'));
  allWorkspaceViewsHtml = replaceViewBlock(allWorkspaceViewsHtml, 'gl', `${financeModel.renderJournalLedgerHtml()}\n<div style="margin-top: 24px;">\n${financeModel.renderChartOfAccountsHtml()}\n</div>`);
  allWorkspaceViewsHtml = replaceViewBlock(allWorkspaceViewsHtml, 'org', organizationModel.renderOrganizationHtml());
  allWorkspaceViewsHtml = replaceViewBlock(allWorkspaceViewsHtml, 'rbac', rbacModel.renderStaffManagementHtml());
}

allWorkspaceViewsHtml += `
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

const completeWebsiteHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — Enterprise Multi-Branch Inventory & POS Operating System</title>
  <link rel="icon" type="image/png" sizes="32x32" href="./assets/favicon-32x32.png">
  <link rel="apple-touch-icon" href="./assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    :root {
      /* Official STOKROVA Brand Tokens (Strictly Preserved) */
      --bg: #161B1E;             /* Midnight pitch dark background */
      --surface: #1E2428;        /* Dark slate elevated surface */
      --card-hover: #293136;     /* Wordmark slate */
      --border: #333D46;         /* Structural border */
      --border-strong: #414F5A;  /* Elevated component border */
      --primary: #BD9652;        /* Core Imperial Gold */
      --primary-hover: #CEB274;  /* Luminous Gold Hover */
      --text: #F8FAFC;           /* High-contrast crisp foreground */
      --text-secondary: #ACB8C3; /* Mid slate reading text (WCAG AAA) */
      --text-muted: #7E919F;     /* Subtle metadata */
      --teal: #2D8A9E;           /* Restrained Reconciliation Series */
      --green: #4ADE80;          /* Semantic Balanced / Success */
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --stokrova-font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Tabular numbers across all monetary and numerical elements */
    [font-variant-numeric~="tabular-nums"],
    .kpi-num,
    table,
    td,
    th {
      font-variant-numeric: tabular-nums;
    }

    a { color: var(--primary); }
    button { font-family: var(--font-sans); }
    input, select { font-family: var(--font-sans); }

    /* Focus visible ring discipline */
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    a:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    /* Visually Hidden Helper (WCAG AAA Compliance) */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Sticky Header Scrolled state */
    #main-header.scrolled {
      background: rgba(30, 36, 40, 0.9) !important;
      backdrop-filter: blur(12px) !important;
      border-bottom: 1px solid var(--border-strong) !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    /* Hero Command Center Animations */
    @keyframes glowBreathe {
      0% { opacity: 0.55; transform: scale(0.98); }
      100% { opacity: 0.95; transform: scale(1.02); }
    }
    .command-center-glow {
      animation: glowBreathe 6s ease-in-out infinite alternate;
    }

    @keyframes pulseDot {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }

    /* Revenue line chart drawing animation */
    @keyframes drawRevenueLine {
      from { stroke-dashoffset: 1000; }
      to { stroke-dashoffset: 0; }
    }
    .chart-revenue-line {
      stroke-dasharray: 1000;
      stroke-dashoffset: 0;
      animation: drawRevenueLine 1.2s ease-out forwards;
    }

    /* Card Hover Lift */
    .features-enhanced-grid > div,
    .money-flow-step,
    #architecture ol,
    #who-its-for > div > div {
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .features-enhanced-grid > div:hover,
    .money-flow-step:hover,
    #who-its-for > div > div:hover {
      transform: translateY(-2px);
      border-color: rgba(189, 150, 82, 0.4) !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    /* Details FAQ styling */
    details > summary::-webkit-details-marker { display: none; }
    details[open] summary span:last-child {
      transform: rotate(45deg);
    }
    details[open] {
      border-color: var(--primary) !important;
    }

    /* Toast Notification */
    #toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--surface);
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

    /* Cosmic Motions & Multi-Step Stepper Enhancements */
    .signup-stepper-card {
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .industry-choice-label:hover {
      border-color: var(--primary) !important;
      background: rgba(189,150,82,0.08) !important;
    }
    .signup-plan-card:hover {
      border-color: var(--primary) !important;
      transform: translateY(-2px);
    }
    @keyframes spinPulse {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .btn-spinner {
      display: inline-block;
      animation: spinPulse 0.8s linear infinite;
    }

    /* World-Class Guided Tour Overlay Styles */
    #stokrova-tour-spotlight {
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #stokrova-tour-card {
      animation: slideUpTour 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUpTour {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Logged-In Business Workspace Container */
    #business-workspace-container {
      display: none;
      min-height: 100vh;
      background: var(--bg);
      flex-direction: column;
    }
    .workspace-topbar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .workspace-body {
      display: flex;
      flex: 1;
      height: calc(100vh - 61px);
      overflow: hidden;
    }
    .workspace-sidebar {
      width: 270px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 12px 4px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .workspace-nav-section {
      margin-bottom: 12px;
    }
    .workspace-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 10px;
      margin: 1px 4px;
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.12s ease;
    }
    .workspace-nav-item:hover {
      background: rgba(255,255,255,0.04);
      color: var(--text);
    }
    .workspace-nav-item.active {
      background: rgba(189,150,82,0.15);
      color: #E0CB9F;
      font-weight: 600;
      border-left: 3px solid var(--primary);
    }
    .workspace-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 28px;
      background: var(--bg);
    }
    .ws-view-content {
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ==========================================================================
       Mobile Refinement & Responsive Breakpoint Discipline
       - Main heading: 26–30px (controlled, no continuous fluid collapse)
       - Section headings: 20–24px
       - Card titles: 15–17px
       - Body copy: 14–16px (16px on inputs to prevent iOS auto-zoom)
       - Key finance numbers: 20–26px tabular-nums
       - Page gutters: 16px (12px on <= 360px)
       - Card internal spacing: 12–16px
       - Section spacing: 24–36px
       - Touch targets: >= 44x44px on all interactive controls
       - Zero page-level horizontal overflow
       ========================================================================== */

    html, body {
      max-width: 100vw;
      overflow-x: hidden;
    }

    /* iOS auto-zoom prevention: inputs & selects must be at least 16px */
    input, select, textarea {
      font-size: 16px !important;
    }

    button, .mobile-hamburger, .pos-tab-btn, summary {
      touch-action: manipulation;
    }

    @media (max-width: 960px) {
      .command-center-window { transform: none !important; }
      .floating-depth-card { display: none !important; }
      .kpi-tiles-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .chart-dual-panel { grid-template-columns: 1fr !important; }
    }

    @media (max-width: 768px) {
      /* Header & Nav */
      #main-header {
        padding: 12px 16px !important;
      }
      .desktop-nav { display: none !important; }
      .desktop-auth-actions { display: none !important; }
      .mobile-hamburger { display: inline-flex !important; }

      /* Section Spacing & Gutters: 24–36px vertical, 16px horizontal */
      .landing-section {
        padding-top: 32px !important;
        padding-bottom: 32px !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      .hero-section {
        padding-top: 36px !important;
        padding-bottom: 28px !important;
      }
      footer {
        padding: 32px 16px 24px 16px !important;
      }

      /* Mobile Headings & Typography Discipline */
      .hero-h1 {
        font-size: 28px !important;
        line-height: 1.2 !important;
        letter-spacing: -0.01em !important;
        margin-bottom: 12px !important;
      }
      .section-h2, .closing-cta-h2 {
        font-size: 22px !important;
        line-height: 1.25 !important;
        letter-spacing: -0.01em !important;
        margin-bottom: 8px !important;
      }
      .card-h3, h3 {
        font-size: 16px !important;
        line-height: 1.3 !important;
      }
      .hero-sub, .section-sub {
        font-size: 14.5px !important;
        line-height: 1.55 !important;
      }

      /* Key Finance Numbers: 20–26px */
      .kpi-num {
        font-size: 22px !important;
        line-height: 1.2 !important;
      }
      .pricing-card-price {
        font-size: 26px !important;
      }

      /* Command Center & Finance Visuals */
      .command-center-outer-wrapper {
        margin-top: 24px !important;
      }
      .command-center-window {
        transform: none !important;
        border-radius: 10px !important;
      }
      .command-center-window > div:nth-child(2) {
        padding: 14px 12px !important;
      }
      .floating-depth-card {
        display: none !important;
      }
      .kpi-tiles-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
      }
      .chart-dual-panel {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }

      /* Money Flow Pipeline Strip */
      .money-flow-track {
        flex-direction: column !important;
        gap: 10px !important;
      }
      .money-flow-step {
        border-left: 3px solid var(--primary) !important;
        padding: 14px 12px !important;
      }

      /* Card Internal Spacing: 12–16px */
      .feature-card,
      .arch-card,
      .who-card,
      .pricing-card,
      .pos-benefit-card,
      .pos-preview-wrapper {
        padding: 16px 14px !important;
      }
      .wide-feature-card {
        padding: 18px 14px !important;
      }
      .wide-feature-card > div {
        flex-direction: column !important;
        gap: 16px !important;
      }
      .wide-feature-card > div > div {
        min-width: 100% !important;
      }

      /* Modal Sizing & Scrolling */
      .modal-dialog-inner {
        padding: 20px 16px !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      .modal-grid-2col {
        grid-template-columns: 1fr !important;
        gap: 10px !important;
      }
    }

    @media (max-width: 480px) {
      .landing-section {
        padding-top: 28px !important;
        padding-bottom: 28px !important;
      }
      .hero-h1 {
        font-size: 26px !important;
      }
      .hero-cta-btns {
        flex-direction: column !important;
        width: 100% !important;
      }
      .hero-cta-btns button {
        width: 100% !important;
      }
      .command-center-addr {
        font-size: 0.6875rem !important;
        padding: 2px 8px !important;
      }
      .kpi-tiles-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      .kpi-tiles-grid > div:last-child {
        grid-column: 1 / -1 !important;
      }
      .pos-tab-btn {
        padding: 8px 10px !important;
        font-size: 0.75rem !important;
      }
      .pricing-card {
        padding: 20px 16px !important;
      }
    }

    @media (max-width: 360px) {
      /* Extra narrow viewports: 12px page gutters */
      #main-header,
      .landing-section,
      footer {
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      .hero-h1 {
        font-size: 24px !important;
      }
      .section-h2, .closing-cta-h2 {
        font-size: 20px !important;
      }
      .kpi-tiles-grid {
        grid-template-columns: 1fr !important;
      }
      .kpi-tiles-grid > div:last-child {
        grid-column: auto !important;
      }
      .modal-dialog-inner {
        padding: 16px 12px !important;
      }
    }

    /* Accessibility: Reduced Motion Override */
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      .command-center-glow { animation: none !important; }
      .chart-revenue-line { animation: none !important; stroke-dasharray: none !important; }
    }
  </style>
</head>
<body>

  <!-- PUBLIC CUSTOMER SURFACE -->
  <div id="customer-public-surface">
    ${headerHtml}
    <main>
      ${heroHtml}
      ${moneyFlowHtml}
      ${featuresHtml}
      ${architectureHtml}
      ${posHtml}
      ${whoItsForHtml}
      ${pricingHtml}
      ${faqHtml}
      ${closingCtaHtml}
    </main>
    ${footerHtml}
  </div>

  <!-- AUTH & DIALOG MODALS -->
  ${registerModalHtml}
  ${loginModalHtml}
  ${demoConfirmModalHtml}
  ${legalModalHtml}
  ${tourOverlayHtml}

  <!-- BRANDED INTERRUPTION SCREEN: BUSINESS ACCESS SUSPENDED -->
  <div id="stokrova-suspended-screen" style="display: none; position: fixed; inset: 0; background: #0E1116; z-index: 100000; flex-direction: column; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; overflow-y: auto;">
    <div style="max-width: 580px; width: 100%; background: #161B1E; border: 1px solid #333D46; border-radius: 12px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); overflow: hidden;">
      <!-- Top Crimson Security Warning Bar -->
      <div style="background: rgba(248,113,113,0.12); border-bottom: 1px solid rgba(248,113,113,0.25); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.1rem;">🔒</span>
          <span style="font-size: 0.75rem; font-weight: 800; color: #F87171; letter-spacing: 0.08em; text-transform: uppercase;">Security & Access Enforcement</span>
        </div>
        <span id="suspended-badge-status" style="background: rgba(248,113,113,0.2); color: #F87171; border: 1px solid #F87171; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700;">SUSPENDED</span>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 28px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <span style="color: #BD9652; font-size: 1.25rem;">◆</span>
          <span style="font-size: 1.15rem; font-weight: 900; letter-spacing: 0.05em; color: #BD9652;">STOKROVA</span>
        </div>

        <h1 style="margin: 0 0 8px 0; font-size: 1.5rem; font-weight: 800; color: #F8FAFC;">Business Access Suspended</h1>
        <p style="margin: 0 0 20px 0; font-size: 0.875rem; color: #ACB8C3; line-height: 1.5;">Operations for this enterprise organization have been temporarily interrupted by Platform Administration.</p>

        <!-- Organization Snapshot Card -->
        <div style="background: #1E2428; border: 1px solid #333D46; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.8125rem;">
            <div>
              <span style="color: #7E919F; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Business Entity</span>
              <div id="suspended-tenant-name-display" style="font-weight: 700; color: #F8FAFC; margin-top: 2px;">Your Organization</div>
            </div>
            <div>
              <span style="color: #7E919F; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Operational State</span>
              <div style="font-weight: 700; color: #F87171; margin-top: 2px;">Locked by Platform Super-Admin</div>
            </div>
          </div>
        </div>

        <!-- Restriction Details Notice -->
        <div style="background: rgba(248,113,113,0.06); border-left: 3px solid #F87171; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px; font-size: 0.8125rem; color: #E2E8F0; line-height: 1.6;">
          <strong>Why is this workspace locked?</strong><br>
          Platform Administration has placed this business tenant in a suspended state. All active operations—including till transactions, POS checkout, warehouse dispatch, procurement 3-way matching, stock ledger movements, and financial journals—are strictly denied until reactivated.
        </div>

        <!-- Resolution Steps -->
        <div style="margin-bottom: 28px;">
          <h4 style="margin: 0 0 10px 0; font-size: 0.8125rem; font-weight: 700; color: #BD9652; text-transform: uppercase; letter-spacing: 0.05em;">Required Resolution Steps</h4>
          <ol style="margin: 0; padding-left: 18px; font-size: 0.8125rem; color: #ACB8C3; line-height: 1.7;">
            <li>Verify billing, commercial contract standing, or compliance notices sent to your primary business owner email.</li>
            <li>Contact STOKROVA Platform Administration directly at <strong style="color: #F8FAFC;">support@stokrova.com</strong> to initiate reactivation review.</li>
            <li>Once Platform Super-Admin issues the reactivation order, full multi-tenant access is restored immediately without data loss.</li>
          </ol>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
          <button onclick="window.stokrovaCustomerApp.signOutAndReturnHome()" style="padding: 10px 18px; border-radius: 6px; background: #1E2428; border: 1px solid #414F5A; color: #F8FAFC; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.15s ease;">
            Sign Out / Return to Home
          </button>
          <a href="mailto:support@stokrova.com?subject=Business%20Suspension%20Resolution%20Inquiry" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 6px; background: #BD9652; border: 1px solid #CEB274; color: #0E1116; font-weight: 700; font-size: 0.875rem; text-decoration: none; cursor: pointer; transition: all 0.15s ease;">
            <span>✉</span> Contact Platform Support
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- AUTHENTICATED BUSINESS WORKSPACE (LAUNCHED ON SIGN IN, REGISTER OR DEMO) -->
  <div id="business-workspace-container" style="display: none;">
    <div class="workspace-topbar">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: var(--primary);">
          <span>◆</span>
          <span id="ws-tenant-display">${isDemo ? 'Apex Global Retail Ltd' : 'Organization Workspace'}</span>
        </div>
        <span style="font-size: 0.75rem; background: rgba(189,150,82,0.18); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: 600;" id="ws-branch-display">${isDemo ? 'London Flagship' : 'Main Branch'}</span>
        <span style="font-size: 0.75rem; background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">LIVE PRODUCTION</span>
      </div>

      <div style="display: flex; align-items: center; gap: 14px;">
        <button onclick="window.stokrovaCustomerApp.startTour()" style="background: rgba(189,150,82,0.18); color: var(--primary); border: 1px solid var(--primary); padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
          <span>🌍</span> <span>Take Tour ✦</span>
        </button>
        <div style="font-size: 0.8125rem; color: var(--text-secondary);">
          Signed in as: <strong id="ws-user-display" style="color: var(--text);">${isDemo ? 'Victoria Sterling' : 'Business Owner'}</strong>
          (<span id="ws-role-display" style="color: var(--primary); font-weight: 600;">${isDemo ? 'Business Owner' : 'Administrator'}</span>)
        </div>
        <button onclick="window.stokrovaCustomerApp.signOut()" style="background: rgba(248,81,73,0.1); color: #F87171; border: 1px solid #5C1D24; padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600;">
          Sign Out →
        </button>
      </div>
    </div>

    <div class="workspace-body">
      ${masterSidebarHtml}
      <main class="workspace-viewport">
        ${allWorkspaceViewsHtml}
      </main>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast-notification">
    <span style="color: var(--primary);">◆</span>
    <span id="toast-message">Notification</span>
  </div>

  <!-- Client Application Script -->
  <script>
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const SUPABASE_CONFIG = {
      url: 'https://vbtuccvxtgjhaywijmwa.supabase.co',
      anonKey: 'sb_publishable_SQZZBnrGJ4wwY4rUeZjtag_-jtZxCVp',
      apiBase: isLocalhost && window.location.port !== '3000' && window.location.port !== '' ? 'http://localhost:3000/v1' : '/v1',
    };
    const getSupabase = () => {
      if (window._stokrovaSupabase) return window._stokrovaSupabase;
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        window._stokrovaSupabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        return window._stokrovaSupabase;
      }
      return null;
    };

    window.stokrovaCustomerApp = {
      cart: [],
      todayRevenue: isDemo ? 382000.00 : 0.00,

      // Multi-Step Registration State & Cosmic Engine
      currentSignupStep: 1,
      cosmicAnimId: null,
      cosmicParticles: [],
      pendingTenant: null,
      verifiedStaffData: null,

      openRegisterModal(planId) {
        const modal = document.getElementById('modal-register');
        if (modal) {
          modal.style.display = 'flex';
          this.setSignupStep(1);
          this.startCosmicParticles();
          const firstInput = document.getElementById('reg-company-name');
          if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
        if (planId) {
          this.selectSignupPlan(planId);
        }
      },

      closeRegisterModal() {
        if (this.welcomeCountdownTimer) {
          clearInterval(this.welcomeCountdownTimer);
          this.welcomeCountdownTimer = null;
        }
        const modal = document.getElementById('modal-register');
        if (modal) modal.style.display = 'none';
        this.stopCosmicParticles();
      },

      setSignupStep(step) {
        this.currentSignupStep = step;
        const widths = ['25%', '50%', '75%', '100%', '100%'];
        
        for (let i = 1; i <= 5; i++) {
          const pane = document.getElementById('reg-step-' + i);
          if (pane) pane.style.display = (i === step) ? 'block' : 'none';
        }

        const loader = document.getElementById('signup-step-loader');
        if (loader) loader.style.display = 'none';

        const stepperHeader = document.getElementById('signup-stepper-header');
        if (stepperHeader) {
          stepperHeader.style.display = (step === 5) ? 'none' : 'block';
        }

        const numEl = document.getElementById('signup-current-step-num');
        const pctEl = document.getElementById('signup-step-percent');
        const fillEl = document.getElementById('signup-progress-fill');

        if (numEl) numEl.textContent = String(Math.min(step, 4));
        if (pctEl && widths[step - 1]) pctEl.textContent = widths[step - 1];
        if (fillEl && widths[step - 1]) fillEl.style.width = widths[step - 1];
      },

      nextSignupStep(current) {
        if (current === 1) {
          const comp = document.getElementById('reg-company-name');
          const slug = document.getElementById('reg-slug');
          const compVal = comp ? comp.value.trim() : '';
          const slugVal = slug ? slug.value.trim() : '';
          if (!compVal || !slugVal) {
            this.showToast('Please enter your business legal name and workspace slug.');
            return;
          }
        } else if (current === 2) {
          const branch = document.getElementById('reg-branch-name');
          const branchVal = branch ? branch.value.trim() : '';
          if (!branchVal) {
            this.showToast('Please enter your flagship store or warehouse branch name.');
            return;
          }
        } else if (current === 3) {
          const ownerName = document.getElementById('reg-owner-name');
          const ownerEmail = document.getElementById('reg-owner-email');
          const pass = document.getElementById('reg-password');
          const nameVal = ownerName ? ownerName.value.trim() : '';
          const emailVal = ownerEmail ? ownerEmail.value.trim() : '';
          const passVal = pass ? pass.value : '';
          if (!nameVal || !emailVal || !passVal) {
            this.showToast('Please enter owner full name, work email, and master password.');
            return;
          }
        }

        // Dedicated Page Loading State: hide current step & show loader
        const currentPane = document.getElementById('reg-step-' + current);
        const loader = document.getElementById('signup-step-loader');
        const header = document.getElementById('signup-stepper-header');
        const loaderTitle = document.getElementById('signup-loader-title');

        if (currentPane) currentPane.style.display = 'none';
        if (header) header.style.display = 'none';
        if (loader) loader.style.display = 'block';
        if (loaderTitle) loaderTitle.textContent = 'Calibrating Step ' + (current + 1) + '...';

        setTimeout(() => {
          this.setSignupStep(current + 1);
        }, 320);
      },

      prevSignupStep(current) {
        if (current > 1) {
          this.setSignupStep(current - 1);
        }
      },

      autoSuggestSlug(val) {
        const slugInput = document.getElementById('reg-slug');
        if (slugInput && !slugInput.dataset.manuallyEdited) {
          slugInput.value = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }
      },

      selectSignupPlan(tier) {
        const select = document.getElementById('reg-tier');
        if (select) select.value = tier;
        ['starter', 'growth', 'enterprise'].forEach(t => {
          const card = document.getElementById('plan-card-' + t);
          if (card) {
            if (t === tier) {
              card.style.borderColor = 'var(--primary)';
              card.style.borderWidth = '2px';
            } else {
              card.style.borderColor = 'var(--border)';
              card.style.borderWidth = '1px';
            }
          }
        });
      },

      startCosmicParticles() {
        const canvas = document.getElementById('signup-cosmic-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth || window.innerWidth;
        canvas.height = canvas.offsetHeight || window.innerHeight;

        this.cosmicParticles = [];
        const count = 45;
        for (let i = 0; i < count; i++) {
          this.cosmicParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1,
            color: (Math.random() > 0.4) ? '#BD9652' : '#E0CB9F',
            alpha: Math.random() * 0.6 + 0.2
          });
        }

        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw connections
          for (let i = 0; i < this.cosmicParticles.length; i++) {
            for (let j = i + 1; j < this.cosmicParticles.length; j++) {
              const dx = this.cosmicParticles[i].x - this.cosmicParticles[j].x;
              const dy = this.cosmicParticles[i].y - this.cosmicParticles[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 80) {
                ctx.strokeStyle = 'rgba(189, 150, 82, ' + (0.15 * (1 - dist / 80)) + ')';
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(this.cosmicParticles[i].x, this.cosmicParticles[i].y);
                ctx.lineTo(this.cosmicParticles[j].x, this.cosmicParticles[j].y);
                ctx.stroke();
              }
            }
          }

          // Draw particles
          this.cosmicParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;

          this.cosmicAnimId = requestAnimationFrame(render);
        };

        if (this.cosmicAnimId) cancelAnimationFrame(this.cosmicAnimId);
        this.cosmicAnimId = requestAnimationFrame(render);
      },

      stopCosmicParticles() {
        if (this.cosmicAnimId) {
          cancelAnimationFrame(this.cosmicAnimId);
          this.cosmicAnimId = null;
        }
      },

      async handleRegisterSubmit(e) {
        e.preventDefault();
        const companyName = document.getElementById('reg-company-name')?.value.trim() || 'My Business Organization';
        const slug = document.getElementById('reg-slug')?.value.trim().toLowerCase() || 'workspace';
        const currency = document.getElementById('reg-currency')?.value || 'USD';
        const branchName = document.getElementById('reg-branch-name')?.value.trim() || 'Main Branch';
        const ownerName = document.getElementById('reg-owner-name')?.value.trim() || 'Business Owner';
        const ownerEmail = document.getElementById('reg-owner-email')?.value.trim().toLowerCase() || '';
        const password = document.getElementById('reg-password')?.value || '';
        const tier = document.getElementById('reg-tier')?.value || 'growth';
        const phone = document.getElementById('reg-owner-phone')?.value.trim() || '';

        if (!password) {
          this.showToast('Please enter a secure password for your owner account.');
          return;
        }

        const tenantData = {
          companyName,
          slug,
          currency,
          branchName,
          ownerName,
          ownerEmail,
          tier,
          phone,
          registeredAt: new Date().toISOString()
        };

        this.pendingTenant = tenantData;

        // Persist locally for immediate session and callback continuity
        try {
          localStorage.setItem('stokrova_active_tenant', JSON.stringify(tenantData));
          localStorage.setItem('stokrova_pending_onboarding', JSON.stringify(tenantData));
        } catch (_) {}

        const sb = getSupabase();
        if (sb) {
          const submitBtn = document.getElementById('btn-submit-registration');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';
          }
          try {
            const { data, error } = await sb.auth.signUp({
              email: ownerEmail,
              password: password,
              options: {
                data: {
                  full_name: ownerName,
                  company_name: companyName,
                  workspace_slug: slug,
                  plan_tier: tier,
                  branch_name: branchName,
                  default_currency: currency,
                  phone: phone || undefined,
                },
                emailRedirectTo: window.location.origin,
              }
            });

            if (error) {
              this.showToast('Registration Failed: ' + error.message);
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Provision Workspace & Customize →';
              }
              return;
            }

            // Check if Supabase session is issued or confirmation required
            if (data.session && data.session.access_token) {
              // Immediate session (autoconfirm enabled): Call transactional NestJS onboarding API
              try {
                await fetch(SUPABASE_CONFIG.apiBase + '/auth/onboard', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + data.session.access_token,
                  },
                  body: JSON.stringify({
                    name: companyName,
                    slug: slug,
                    owner_full_name: ownerName,
                    default_currency: currency,
                    initial_branch_name: branchName,
                    plan_tier: tier,
                  })
                });
                localStorage.removeItem('stokrova_pending_onboarding');
              } catch (_) {}

              this.populateCustomizationAndSimulate(companyName, branchName, ownerName, slug);
            } else {
              // Supabase email confirmation required
              this.showEmailConfirmationScreen({
                email: ownerEmail,
                companyName,
                slug,
              });
            }
          } catch (err) {
            this.showToast('Registration Error: ' + (err.message || 'Network error'));
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Provision Workspace & Customize →';
            }
          }
        } else {
          // Graceful fallback if offline
          this.populateCustomizationAndSimulate(companyName, branchName, ownerName, slug);
        }
      },

      showEmailConfirmationScreen({ email, companyName, slug }) {
        const stepperHeader = document.getElementById('signup-stepper-header');
        if (stepperHeader) stepperHeader.style.display = 'none';
        for (let i = 1; i <= 5; i++) {
          const p = document.getElementById('reg-step-' + i);
          if (p) p.style.display = 'none';
        }
        const confirmPane = document.getElementById('reg-step-confirm-email');
        const targetEmail = document.getElementById('confirm-email-target');
        const targetSlug = document.getElementById('confirm-slug-target');
        if (targetEmail) targetEmail.textContent = email;
        if (targetSlug) targetSlug.textContent = slug;
        if (confirmPane) confirmPane.style.display = 'block';
        this.showToast('✓ Verification link dispatched to ' + email + '. Please check your inbox.');
      },

      async resendConfirmationEmail() {
        const sb = getSupabase();
        if (!sb) return;
        const email = this.pendingTenant ? this.pendingTenant.ownerEmail : document.getElementById('reg-owner-email')?.value.trim();
        if (!email) {
          this.showToast('No owner email specified for resend.');
          return;
        }
        const btn = document.getElementById('btn-resend-confirm-email');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Sending...';
        }
        try {
          const { error } = await sb.auth.resend({ type: 'signup', email });
          if (error) {
            this.showToast('Resend failed: ' + error.message);
          } else {
            this.showToast('✓ Confirmation link resent to ' + email + '!');
          }
        } catch (err) {
          this.showToast('Resend error: ' + err.message);
        } finally {
          if (btn) {
            setTimeout(() => {
              btn.disabled = false;
              btn.textContent = 'Resend Confirmation Email';
            }, 3000);
          }
        }
      },

      async checkSessionAfterEmailConfirmation() {
        const sb = getSupabase();
        if (!sb) return;
        const btn = document.getElementById('btn-check-confirmed');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Verifying identity...';
        }
        try {
          const { data: { session }, error } = await sb.auth.getSession();
          if (session && session.access_token) {
            const pending = this.pendingTenant || JSON.parse(localStorage.getItem('stokrova_pending_onboarding') || '{}');
            await fetch(SUPABASE_CONFIG.apiBase + '/auth/onboard', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.access_token,
              },
              body: JSON.stringify({
                name: pending.companyName || 'My Business Organization',
                slug: pending.slug || 'workspace',
                owner_full_name: pending.ownerName || session.user.email,
                default_currency: pending.currency || 'USD',
                initial_branch_name: pending.branchName || 'Main Branch',
                plan_tier: pending.tier || 'growth',
              })
            }).catch(() => {});
            localStorage.removeItem('stokrova_pending_onboarding');
            this.showToast('✓ Identity confirmed! Deploying workspace...');
            this.populateCustomizationAndSimulate(
              pending.companyName || 'My Business Organization',
              pending.branchName || 'Main Branch',
              pending.ownerName || 'Business Owner',
              pending.slug || 'workspace'
            );
          } else {
            this.showToast('Email confirmation pending. Please check your inbox and click the verification link.');
          }
        } catch (err) {
          this.showToast('Verification check: ' + err.message);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'I Have Confirmed My Email →';
          }
        }
      },

      populateCustomizationAndSimulate(companyName, branchName, ownerName, slug) {
        const compEl = document.getElementById('prov-dyn-company');
        const brnEl = document.getElementById('prov-dyn-branch');
        const ownEl = document.getElementById('prov-dyn-owner');
        const slugEl = document.getElementById('prov-dyn-slug');
        const welEl = document.getElementById('prov-dyn-welcome');

        if (compEl) compEl.textContent = companyName;
        if (brnEl) brnEl.textContent = branchName;
        if (ownEl) ownEl.textContent = ownerName;
        if (slugEl) slugEl.textContent = slug;
        if (welEl) welEl.textContent = ownerName;

        this.setSignupStep(5);
        this.runCustomizationSimulation();
      },

      runCustomizationSimulation() {
        const pctEl = document.getElementById('prov-percent');
        const fillEl = document.getElementById('prov-progress-fill');
        const lblEl = document.getElementById('prov-stage-label');
        const actionsEl = document.getElementById('prov-completion-actions');

        let pct = 0;
        const milestones = [
          { at: 15, id: 'm-step-1', label: 'Dedicated business organization privacy established...' },
          { at: 35, id: 'm-step-2', label: 'Configuring company chart of accounts...' },
          { at: 55, id: 'm-step-3', label: 'Setting up flagship till laser buffers...' },
          { at: 75, id: 'm-step-4', label: 'Authorizing double-entry ledger truth...' },
          { at: 90, id: 'm-step-5', label: 'Activating secure organization workspace...' },
          { at: 100, id: 'm-step-6', label: 'Workspace online and live!' },
        ];

        const timer = setInterval(() => {
          pct += 5;
          if (pct > 100) pct = 100;

          if (pctEl) pctEl.textContent = pct + '%';
          if (fillEl) fillEl.style.width = pct + '%';

          milestones.forEach(m => {
            if (pct >= m.at) {
              const el = document.getElementById(m.id);
              if (el) {
                el.style.color = '#4ADE80';
                const icon = el.querySelector('.m-icon');
                if (icon) icon.textContent = '✓';
              }
              if (lblEl) lblEl.textContent = m.label;
            }
          });

          if (pct >= 100) {
            clearInterval(timer);
            if (actionsEl) actionsEl.style.display = 'block';
            this.showToast('✓ Workspace calibrated! Launching dashboard...');

            let countdown = 3;
            const cdEl = document.getElementById('prov-countdown-sec');
            if (cdEl) cdEl.textContent = String(countdown);
            if (this.welcomeCountdownTimer) {
              clearInterval(this.welcomeCountdownTimer);
            }
            this.welcomeCountdownTimer = setInterval(() => {
              countdown -= 1;
              const cdSpan = document.getElementById('prov-countdown-sec');
              if (cdSpan) cdSpan.textContent = String(Math.max(0, countdown));
              if (countdown <= 0) {
                if (this.welcomeCountdownTimer) {
                  clearInterval(this.welcomeCountdownTimer);
                  this.welcomeCountdownTimer = null;
                }
                const modal = document.getElementById('modal-register');
                if (modal && modal.style.display !== 'none') {
                  this.launchWorkspaceFromWelcome();
                }
              }
            }, 1000);
          }
        }, 45);
      },

      welcomeCountdownTimer: null,
      autoTourTimer: null,

      scheduleAutoTour(delayMs = 350) {
        if (this.autoTourTimer) {
          clearTimeout(this.autoTourTimer);
        }
        this.autoTourTimer = setTimeout(() => {
          const ws = document.getElementById('business-workspace-container');
          if (ws && ws.style.display !== 'none') {
            this.startTour();
          }
        }, delayMs);
      },

      launchWorkspaceFromWelcome() {
        if (this.welcomeCountdownTimer) {
          clearInterval(this.welcomeCountdownTimer);
          this.welcomeCountdownTimer = null;
        }
        this.closeRegisterModal();
        let t = this.pendingTenant;
        if (!t) {
          try {
            t = JSON.parse(localStorage.getItem('stokrova_active_tenant') || '{}');
          } catch (_) {}
        }
        const tenantName = (t && t.companyName) || 'My Business Organization';
        const branchName = (t && t.branchName) || 'Main Branch';
        const ownerName = (t && t.ownerName) || 'Business Owner';

        this.launchWorkspace({
          tenantName,
          branchName,
          userName: ownerName,
          userRole: 'Business Owner (Administrator)'
        });
        this.showToast('✦ Welcome to your dashboard! Starting guided walkthrough...');
        // Tour starts immediately upon arrival
        this.scheduleAutoTour(350);
      },

      launchWorkspaceWithTour() {
        this.launchWorkspaceFromWelcome();
      },

      launchWorkspaceDirect() {
        this.launchWorkspaceFromWelcome();
      },

      // World-Class Interactive Guided Tour Engine for ALL Roles
      currentTourStep: 1,
      currentTourList: [],
      currentTourRoleTitle: 'Business Owner',
      currentUserName: 'Business Owner',
      currentWorkspaceRole: 'Business Owner (Administrator)',

      roleTours: {
        owner: {
          roleTitle: 'Business Owner',
          defaultView: 'dashboard',
          steps: [
            {
              viewId: 'dashboard',
              targetSelector: '.workspace-topbar',
              title: 'Universal Operations Command Bar',
              desc: 'Control every high-street branch, pop-up store, and regional distribution warehouse from a single pane of glass. Your business operates with dedicated enterprise security and zero cross-account data leakage.',
              snippet: '🌍 Multi-Branch Switcher Active • Status: Live Production (Tenant Isolation Active ✓)'
            },
            {
              viewId: 'dashboard',
              targetSelector: '.kpi-tiles-grid',
              title: 'Executive Telemetry & Financial Pulse',
              desc: 'Monitor GMV, real-time net revenue, and gross margins across all stores. Because STOKROVA uses pure integer minor currency units, every figure is penny-perfect with zero floating-point rounding errors.',
              snippet: '📊 Executive Telemetry: Real-time GMV • Profit margins • Integer minor unit precision'
            },
            {
              viewId: 'pos',
              targetSelector: '.pos-preview-wrapper',
              title: 'Offline-Tolerant Point of Sale & Laser Buffer',
              desc: 'Ring up sales at counter speed. Hardware laser scanners are detected automatically (<50ms). If retail internet goes down, sales persist in encrypted local SQLite outbox queues and sync automatically upon reconnection.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateTourScan()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">⚡ Test Laser Barcode Scan (<42ms Hardware Buffer)</button>'
            },
            {
              viewId: 'inventory',
              targetSelector: '.workspace-viewport',
              title: 'Authoritative FEFO Lots & In-Transit Transfers',
              desc: 'Eliminate phantom stock. When goods move between branches, they sit in an audited IN-TRANSIT GL custody account until verified by destination receiving. Perishables enforce First-Expired, First-Out picking.',
              snippet: '📦 Chain of Custody: Central DC Dispatch → In-Transit Custody → Blind Receiving Verified'
            },
            {
              viewId: 'ledger',
              targetSelector: '.workspace-viewport',
              title: 'Immutable Double-Entry Ledger & Till Audits',
              desc: 'Pure accounting truth. Every till sale, inventory movement, and customer refund automatically writes balanced double-entry journals (Debits = Credits). Blind session variance counts ensure drawer integrity.',
              snippet: '⚖️ Pure Double-Entry: Balanced journal ledger (DR = CR) • Zero unallocated drift'
            }
          ]
        },
        cashier: {
          roleTitle: 'Front Counter Cashier',
          defaultView: 'pos',
          steps: [
            {
              viewId: 'pos',
              targetSelector: '.pos-preview-wrapper',
              title: 'High-Speed Checkout Counter & Laser Buffer',
              desc: 'Ring up products with zero interface lag. Barcode laser scans are buffered instantly (<42ms). Quick keys and live SKU search keep customer queues moving fast during rush hours.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateTourScan()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">⚡ Test Laser Barcode Scan (<42ms Hardware Buffer)</button>'
            },
            {
              viewId: 'pos',
              targetSelector: '.pos-preview-wrapper',
              title: 'Basket Adjustments & Tax Breakdown',
              desc: 'Easily modify line item quantities, apply supervisor-approved discounts, or set tax exemptions. Item subtotals and dynamic tax calculations update in memory on every keystroke.',
              snippet: '🛒 Active Basket: Dynamic Tax Breakdown (VAT/Sales Tax) • Minor currency integer truth'
            },
            {
              viewId: 'pos',
              targetSelector: '.pos-preview-wrapper',
              title: 'Split Tender & Flexible Payment Options',
              desc: 'Accept multi-tender split transactions across Cash, Contactless Card, QR, or Store Credit. Exact drawer change and minor currency rounding are handled automatically.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateSplitTender()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">💳 Test Multi-Tender Split Payment</button>'
            },
            {
              viewId: 'pos',
              targetSelector: '.workspace-topbar',
              title: '100% Offline Outbox Journaling',
              desc: 'Keep checking out customers even if network connectivity is completely severed. Transactions persist in encrypted local storage and sync in monotonic sequence when online.',
              snippet: '🔒 Offline Journal: Monotonic Sequence Active • Continuous Offline Operation Active'
            }
          ]
        },
        picker: {
          roleTitle: 'Warehouse Lead & Picker',
          defaultView: 'picking',
          steps: [
            {
              viewId: 'picking',
              targetSelector: '.workspace-viewport',
              title: 'Priority Digital Pick Queue & Routing',
              desc: 'Execute pick waves with route-optimized walking paths. Customer orders are batched by warehouse zone and bin sequence to minimize picker walking time and turnaround.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulatePickItem()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">📦 Test Pick Verification (FEFO Wave Allocation)</button>'
            },
            {
              viewId: 'inventory',
              targetSelector: '.workspace-viewport',
              title: 'Strict FEFO Lot Expiry Enforcement',
              desc: 'Enforce product freshness. STOKROVA strictly requires First-Expired, First-Out lot picking for perishable and dated goods, preventing pickers from selecting newer lots prematurely.',
              snippet: '🏷️ Lot Verification: Strict FEFO sequencing • Expiry date tracking • Zero expired dispatch'
            },
            {
              viewId: 'locations',
              targetSelector: '.workspace-viewport',
              title: 'Aisle, Rack & Bin Location Mapping',
              desc: 'Navigate multi-tier racking maps with bin capacities and barcode verification. Scan bin barcodes directly to transfer stock between picking shelves and reserve bulk storage.',
              snippet: '📍 Bin Intelligence: Dynamic bin capacity • Barcode verification • Zero phantom stock'
            },
            {
              viewId: 'receiving',
              targetSelector: '.workspace-viewport',
              title: 'Blind Receiving & Transfer Custody',
              desc: 'Eliminate phantom stock with blind count receiving. Goods arriving from suppliers or sister branches are counted independently before release to active inventory.',
              snippet: '🛡️ Blind Receiving: Independent blind count vs PO manifest • Audited variance reporting'
            }
          ]
        },
        manager: {
          roleTitle: 'Store Operations Manager',
          defaultView: 'dashboard',
          steps: [
            {
              viewId: 'dashboard',
              targetSelector: '.workspace-topbar',
              title: 'Branch Real-Time Performance Telemetry',
              desc: "Keep fingers on the pulse of the store. Track today's gross sales, customer footfall, average basket size, and individual cashier till throughput in real time.",
              snippet: '📈 Branch Operations: Gross sales tracking • Footfall monitoring • Cashier shift summaries'
            },
            {
              viewId: 'registers',
              targetSelector: '.workspace-viewport',
              title: 'Till Drawer Audits & Shift Approvals',
              desc: 'Authorize cashier shift open/close audits. Perform blind drawer counts and sign off till variances with verified supervisor approvals.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateManagerAudit()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">🛡️ Sign Off Shift Till Drawer</button>'
            },
            {
              viewId: 'po',
              targetSelector: '.workspace-viewport',
              title: 'Purchase Orders & Low-Stock Alerts',
              desc: 'Prevent stockouts before they happen. Review automatic reorder triggers when inventory breaches safety thresholds and approve supplier POs with a single click.',
              snippet: '⚠️ Reorder Triggers: Safety stock alerts • Dynamic PO creation'
            },
            {
              viewId: 'org',
              targetSelector: '.workspace-viewport',
              title: 'Staff Shift Rostering & Permission Scopes',
              desc: 'Manage store team members and active shift schedules. Configure terminal access and supervisor permissions with strict enterprise authorization enforcement.',
              snippet: '👥 Staff Management: Role-based access control (RBAC) • Shift assignment'
            }
          ]
        },
        accountant: {
          roleTitle: 'Financial Accountant & Auditor',
          defaultView: 'ledger',
          steps: [
            {
              viewId: 'ledger',
              targetSelector: '.workspace-viewport',
              title: 'Immutable Double-Entry Ledger Truth',
              desc: 'Inspect financial journals where Debits always equal Credits down to fractional minor currency units. Till transactions, supplier invoices, and inventory write-offs post balanced entries.',
              snippet: '⚖️ General Ledger: Balanced double-entry integrity (Total Debits = Total Credits)'
            },
            {
              viewId: 'accountant',
              targetSelector: '.workspace-viewport',
              title: 'Bank & Subledger Automated Matching',
              desc: 'Run 3-way matching between Purchase Orders, Receiving Notes, and Invoices. Match clearing bank accounts automatically and resolve variances with audited adjustments.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateReconcileAccount()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">📊 Reconcile Bank Subledger (Auto-Matched Transactions)</button>'
            },
            {
              viewId: 'tax',
              targetSelector: '.workspace-viewport',
              title: 'Tax & VAT Statutory Reporting',
              desc: 'Automatic input vs output VAT schedules, multi-jurisdiction sales tax calculations, and exportable financial summaries ready for revenue and customs authorities.',
              snippet: '🏛️ Tax Compliance: Output vs Input VAT schedules • Multi-jurisdiction statutory export'
            },
            {
              viewId: 'audit',
              targetSelector: '.workspace-viewport',
              title: 'Audit Trail & Compliance Log',
              desc: 'Tamper-evident system logs. Financial records are immutable and never overwritten. Every transaction is permanently recorded with full user attribution.',
              snippet: '🔒 Audit Integrity: SHA-256 Ledger Signature Verified • Immutable Journal History'
            }
          ]
        },
        driver: {
          roleTitle: 'Route Logistics Driver',
          defaultView: 'fleet',
          steps: [
            {
              viewId: 'fleet',
              targetSelector: '.workspace-viewport',
              title: 'Multi-Stop Delivery Route Manifest',
              desc: 'Follow route-optimized delivery manifests directly from your phone or mobile terminal. Track turn-by-turn drop sequences and live customer delivery ETAs.',
              snippet: '🚚 Delivery Manifest: Route optimization • Turn-by-turn drop sequencing • Live customer ETAs'
            },
            {
              viewId: 'fleet',
              targetSelector: '.workspace-viewport',
              title: 'Electronic Proof-of-Delivery (ePOD)',
              desc: 'Capture customer signatures, delivery photo verification, and GPS timestamps at the doorstep. Completed delivery records update customer orders instantly.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateDriverEpod()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">✍️ Test Capture ePOD Signature</button>'
            },
            {
              viewId: 'dispatch',
              targetSelector: '.workspace-viewport',
              title: 'Vehicle Custody Scan & Return Processing',
              desc: 'Confirm vehicle loading with quick barcode scans. Safely log undelivered goods or customer returns back into warehouse custody with zero discrepancy.',
              snippet: '📦 Vehicle Custody: Barcode loading verification • Manifest reconciliation'
            }
          ]
        },
        sales: {
          roleTitle: 'B2B Account Executive',
          defaultView: 'crm',
          steps: [
            {
              viewId: 'crm',
              targetSelector: '.workspace-viewport',
              title: 'Corporate Accounts & Deal Pipeline',
              desc: 'Manage wholesale accounts, buyer contacts, and corporate purchasing limits. Track sales pipeline stages from initial lead to closed-won wholesale contracts.',
              snippet: '💼 B2B Commercial Pipeline: Account purchasing limits • Tiered discount structures'
            },
            {
              viewId: 'quotes',
              targetSelector: '.workspace-viewport',
              title: 'Dynamic Wholesale Quotes & Price Lists',
              desc: 'Draft bespoke customer quotes with negotiated tiered pricing. The system checks margin thresholds automatically before dispatching formal proposals.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateQuoteApprove()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">📄 Generate B2B Wholesale Quote (Margin Verified)</button>'
            },
            {
              viewId: 'orders',
              targetSelector: '.workspace-viewport',
              title: 'Fulfillment & Dispatch Visibility',
              desc: 'Keep clients updated with end-to-end order tracking. Monitor warehouse picking, dispatch manifests, and invoice payment statuses in real time.',
              snippet: '🚚 Real-Time Order Tracking: Pick wave progress • Dispatch custody • Invoice status'
            }
          ]
        },
        staff: {
          roleTitle: 'Store Operations Staff',
          defaultView: 'catalog',
          steps: [
            {
              viewId: 'catalog',
              targetSelector: '.workspace-viewport',
              title: 'Universal Product & Barcode Catalog',
              desc: 'Look up product specifications, SKUs, barcode identifiers, and current pricing across all retail and warehouse departments.',
              snippet: '🔍 Universal Barcode Catalog: Real-time SKU and barcode search across categories'
            },
            {
              viewId: 'availability',
              targetSelector: '.workspace-viewport',
              title: 'Live Multi-Branch Stock Availability',
              desc: 'Instantly check whether an out-of-stock item is available at nearby sister branches or central distribution centers for customer transfer.',
              snippet: '🏬 Multi-Location Stock: Inter-branch transfer requests • ATP verification'
            },
            {
              viewId: 'orders',
              targetSelector: '.workspace-viewport',
              title: 'Customer Orders & Click-and-Collect',
              desc: 'Track click-and-collect orders, layaways, and customer holds. Verify pickup readiness and hand goods over to customers with fast receipt verification.',
              snippet: '📋 Customer Order Management: Click-and-collect orders • Layaways • Receipt verification'
            }
          ]
        }
      },

      get tourData() {
        return (this.currentTourList && this.currentTourList.length > 0)
          ? this.currentTourList
          : this.roleTours.owner.steps;
      },

      getTourDataForRole(roleStr) {
        const r = (roleStr || '').toLowerCase();
        if (r.includes('cashier')) return this.roleTours.cashier;
        if (r.includes('picker') || r.includes('warehouse')) return this.roleTours.picker;
        if (r.includes('manager')) return this.roleTours.manager;
        if (r.includes('accountant') || r.includes('finance') || r.includes('audit')) return this.roleTours.accountant;
        if (r.includes('driver') || r.includes('fleet') || r.includes('logistics')) return this.roleTours.driver;
        if (r.includes('sales') || r.includes('representative') || r.includes('crm')) return this.roleTours.sales;
        if (r.includes('owner') || r.includes('admin')) return this.roleTours.owner;
        return this.roleTours.staff;
      },

      startTour(roleStr) {
        const overlay = document.getElementById('stokrova-tour-overlay');
        if (!overlay) return;

        const effectiveRole = roleStr || this.currentWorkspaceRole || 'Business Owner (Administrator)';
        const roleSuite = this.getTourDataForRole(effectiveRole);
        this.currentTourList = roleSuite.steps;
        this.currentTourRoleTitle = roleSuite.roleTitle;
        this.currentTourStep = 1;

        overlay.style.display = 'block';
        this.renderTourStep(1);
        this.showToast('🌍 Welcome! Starting your ' + roleSuite.roleTitle + ' guided walkthrough...');
      },

      renderTourStep(stepNum) {
        this.currentTourStep = stepNum;
        const data = this.tourData[stepNum - 1];
        if (!data) return;

        // Switch to the relevant workspace view
        if (data.viewId) {
          this.showWsView(data.viewId);
        }

        const numEl = document.getElementById('tour-step-num');
        const totalEl = document.getElementById('tour-step-total');
        const roleEl = document.getElementById('tour-role-badge');
        const titleEl = document.getElementById('tour-card-title');
        const descEl = document.getElementById('tour-card-desc');
        const snippetEl = document.getElementById('tour-action-snippet');
        const btnPrev = document.getElementById('tour-btn-prev');
        const btnNext = document.getElementById('tour-btn-next');
        const spotlight = document.getElementById('stokrova-tour-spotlight');

        if (numEl) numEl.textContent = String(stepNum);
        if (totalEl) totalEl.textContent = String(this.tourData.length);
        if (roleEl) roleEl.textContent = this.currentTourRoleTitle;
        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
        if (snippetEl) snippetEl.innerHTML = data.snippet;

        if (btnPrev) {
          btnPrev.style.display = (stepNum === 1) ? 'none' : 'inline-block';
        }

        if (btnNext) {
          if (stepNum === this.tourData.length) {
            btnNext.textContent = 'Finish Tour & Start Operating ✓';
            btnNext.style.background = '#4ADE80';
            btnNext.style.color = '#0E1116';
          } else {
            btnNext.textContent = 'Next';
            btnNext.style.background = 'var(--primary)';
            btnNext.style.color = '#0E1116';
          }
        }

        // Position Spotlight
        setTimeout(() => {
          if (spotlight && data.targetSelector) {
            const target = document.querySelector(data.targetSelector);
            if (target) {
              const rect = target.getBoundingClientRect();
              spotlight.style.opacity = '1';
              spotlight.style.top = Math.max(0, rect.top - 6) + 'px';
              spotlight.style.left = Math.max(0, rect.left - 6) + 'px';
              spotlight.style.width = (rect.width + 12) + 'px';
              spotlight.style.height = (rect.height + 12) + 'px';
            } else {
              spotlight.style.opacity = '0';
            }
          }
        }, 80);
      },

      nextTourStep() {
        if (this.currentTourStep < this.tourData.length) {
          this.renderTourStep(this.currentTourStep + 1);
        } else {
          this.endTour(true);
        }
      },

      prevTourStep() {
        if (this.currentTourStep > 1) {
          this.renderTourStep(this.currentTourStep - 1);
        }
      },

      endTour(completed = false) {
        if (this.autoTourTimer) {
          clearTimeout(this.autoTourTimer);
          this.autoTourTimer = null;
        }
        const overlay = document.getElementById('stokrova-tour-overlay');
        if (overlay) overlay.style.display = 'none';
        const spotlight = document.getElementById('stokrova-tour-spotlight');
        if (spotlight) spotlight.style.opacity = '0';

        // Mark as completed once-off in localStorage for this user and role
        const userKey = this.currentUserName || 'User';
        const roleKey = this.currentWorkspaceRole || 'Staff';
        try {
          localStorage.setItem('stokrova_tour_completed_' + encodeURIComponent(userKey + '_' + roleKey), 'true');
        } catch (e) {}

        // Return user to their primary role view
        const effectiveRole = this.currentWorkspaceRole || 'Business Owner (Administrator)';
        const suite = this.getTourDataForRole(effectiveRole);
        this.showWsView(suite.defaultView || 'dashboard');

        if (completed) {
          this.showToast('✦ Tour complete! You have full command of your ' + (this.currentTourRoleTitle || 'role') + ' workspace.');
        } else {
          this.showToast('Tour dismissed. Click "Take Tour ✦" anytime to reopen.');
        }
      },

      simulateTourScan() {
        this.addItemToCart('SKU-1001', 'Pro Workstation Laptop', 2499.00);
        this.showToast('⚡ Laser Scanner Triggered: Added 1x Pro Workstation Laptop (<42ms hardware buffer)!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Scanner Buffer Fired:</span> 1x SKU-1001 added to cart. Balanced double-entry journal created!';
        }
      },

      simulateSplitTender() {
        this.showToast('💳 Split Payment Simulation: Multi-tender payment processed and balanced!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Split Payment Approved:</span> Split payment confirmed with zero till variance. Balanced GL journal recorded!';
        }
      },

      simulatePickItem() {
        this.showToast('📦 Pick Verified: Item picked with verified FEFO rotation!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Pick Complete:</span> Item scanned from bin location. FEFO rotation verified!';
        }
      },

      simulateManagerAudit() {
        this.showToast('🛡️ Till Audit Signed: Shift register balanced with zero discrepancy!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Till Audit Approved:</span> Physical drawer counted and verified against system balance!';
        }
      },

      simulateReconcileAccount() {
        this.showToast('📊 Bank Feed Reconciled: Transactions auto-matched to general ledger!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Bank Matching Succeeded:</span> Reconciled against general ledger entries with zero variance!';
        }
      },

      simulateDriverEpod() {
        this.showToast('✍️ ePOD Captured: Electronic proof of delivery saved with signature!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Delivery Confirmed:</span> Recipient signature captured. Delivery manifest updated.';
        }
      },

      simulateQuoteApprove() {
        this.showToast('📄 B2B Quote Generated: Wholesale discount tier approved with margin verification!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Quote Ready:</span> Negotiated wholesale tier applied and margin verified!';
        }
      },

      openLoginModal() {
        const modal = document.getElementById('modal-login');
        if (modal) {
          modal.style.display = 'flex';
          const step1 = document.getElementById('login-step-credentials');
          const step2 = document.getElementById('login-step-verification');
          if (step1) step1.style.display = 'block';
          if (step2) step2.style.display = 'none';
          const firstInput = document.getElementById('login-email');
          if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
      },

      closeLoginModal() {
        const modal = document.getElementById('modal-login');
        if (modal) modal.style.display = 'none';
      },

      backToLoginCredentials() {
        const step1 = document.getElementById('login-step-credentials');
        const step2 = document.getElementById('login-step-verification');
        const notFound = document.getElementById('login-not-found-state');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        if (notFound) notFound.style.display = 'none';
        const firstInput = document.getElementById('login-email');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
      },

      confirmOpenDemo() {
        const modal = document.getElementById('modal-demo-confirm');
        if (modal) modal.style.display = 'flex';
      },

      closeDemoConfirmModal() {
        const modal = document.getElementById('modal-demo-confirm');
        if (modal) modal.style.display = 'none';
      },

      proceedToDemo() {
        this.closeDemoConfirmModal();
        let t = null;
        try { t = JSON.parse(localStorage.getItem('stokrova_active_tenant') || 'null'); } catch (_) {}
        this.launchWorkspace({
          tenantName: t?.companyName || 'Interactive Preview Workspace',
          branchName: t?.branchName || 'Main Store',
          userName: t?.ownerName || 'Workspace Administrator',
          userRole: 'Business Owner (Administrator)'
        });
      },

      showSuspendedScreen(data = {}) {
        const tenantName = data.tenantName || 'Your Business Organization';
        const scr = document.getElementById('stokrova-suspended-screen');
        const pub = document.getElementById('customer-public-surface');
        const ws = document.getElementById('business-workspace-container');
        const modalLogin = document.getElementById('modal-login');
        const modalReg = document.getElementById('modal-register');

        if (modalLogin) modalLogin.style.display = 'none';
        if (modalReg) modalReg.style.display = 'none';
        if (ws) ws.style.display = 'none';
        if (pub) pub.style.display = 'none';

        const nameEl = document.getElementById('suspended-tenant-name-display');
        if (nameEl) nameEl.textContent = tenantName;

        if (scr) scr.style.display = 'flex';

        sessionStorage.setItem('stokrova_tenant_suspended', JSON.stringify({
          suspended: true,
          tenantName: tenantName,
          timestamp: new Date().toISOString()
        }));
      },

      signOutAndReturnHome() {
        sessionStorage.removeItem('stokrova_tenant_suspended');
        const scr = document.getElementById('stokrova-suspended-screen');
        const pub = document.getElementById('customer-public-surface');
        const ws = document.getElementById('business-workspace-container');

        if (scr) scr.style.display = 'none';
        if (ws) ws.style.display = 'none';
        if (pub) pub.style.display = 'block';

        const sb = getSupabase();
        if (sb) {
          sb.auth.signOut().catch(() => {});
        }
        window.location.hash = '';
      },

      openLegalModal(topic) {
        const modal = document.getElementById('modal-legal');
        if (modal) modal.style.display = 'flex';
      },

      closeLegalModal() {
        const modal = document.getElementById('modal-legal');
        if (modal) modal.style.display = 'none';
      },

      toggleMobileMenu() {
        const drawer = document.getElementById('mobile-nav-drawer');
        if (drawer) {
          drawer.style.display = (drawer.style.display === 'flex') ? 'none' : 'flex';
        }
      },

      switchPosTab(tab) {
        const scanTab = document.getElementById('tab-content-scanner');
        const rcptTab = document.getElementById('tab-content-receipt');
        const btnScan = document.getElementById('btn-tab-pos-scanner');
        const btnRcpt = document.getElementById('btn-tab-pos-receipt');

        if (tab === 'scanner') {
          if (scanTab) scanTab.style.display = 'block';
          if (rcptTab) rcptTab.style.display = 'none';
          if (btnScan) {
            btnScan.style.background = 'var(--primary)';
            btnScan.style.color = '#0E1116';
            btnScan.style.fontWeight = '700';
          }
          if (btnRcpt) {
            btnRcpt.style.background = 'transparent';
            btnRcpt.style.color = 'var(--text-secondary)';
            btnRcpt.style.fontWeight = '600';
          }
        } else {
          if (scanTab) scanTab.style.display = 'none';
          if (rcptTab) rcptTab.style.display = 'block';
          if (btnScan) {
            btnScan.style.background = 'transparent';
            btnScan.style.color = 'var(--text-secondary)';
            btnScan.style.fontWeight = '600';
          }
          if (btnRcpt) {
            btnRcpt.style.background = 'var(--primary)';
            btnRcpt.style.color = '#0E1116';
            btnRcpt.style.fontWeight = '700';
          }
        }
      },

      async handleLoginSubmit(e) {
        e.preventDefault();
        const emailEl = document.getElementById('login-email');
        const passEl = document.getElementById('login-password');

        const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
        const password = passEl ? passEl.value : '';

        if (!email || !password) {
          this.showToast('Please enter your staff work email and password.');
          return;
        }

        // Switch to Step 2: Searching & Verifying
        const step1 = document.getElementById('login-step-credentials');
        const step2 = document.getElementById('login-step-verification');
        const searchState = document.getElementById('login-searching-state');
        const verifiedState = document.getElementById('login-verified-state');
        const notFoundState = document.getElementById('login-not-found-state');
        const progressFill = document.getElementById('login-verify-progress-fill');

        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        if (searchState) searchState.style.display = 'block';
        if (verifiedState) verifiedState.style.display = 'none';
        if (notFoundState) notFoundState.style.display = 'none';
        if (progressFill) progressFill.style.width = '30%';

        let activeTenant = null;
        try {
          activeTenant = JSON.parse(localStorage.getItem('stokrova_active_tenant') || 'null');
        } catch (_) {}

        let tenantName = activeTenant?.companyName || '';
        let branch = activeTenant?.branchName || 'Main Branch';
        let slug = activeTenant?.slug || '';
        let name = '';
        let role = '';
        let verified = false;

        // 1. Authenticate credentials if online
        const sb = getSupabase();
        if (sb) {
          try {
            if (progressFill) progressFill.style.width = '60%';
            const { data, error } = await sb.auth.signInWithPassword({
              email: email,
              password: password,
            });

            if (!error && data.session && data.session.access_token) {
              const sessionRes = await fetch(SUPABASE_CONFIG.apiBase + '/auth/session', {
                headers: { 'Authorization': 'Bearer ' + data.session.access_token }
              }).catch(() => null);

              if (sessionRes && sessionRes.ok) {
                const sessData = await sessionRes.json();
                if (sessData.authenticated && sessData.active_tenant) {
                  if (sessData.active_tenant.status === 'SUSPENDED' || sessData.active_tenant.quarantine_status === 'BUSINESS_SUSPENDED') {
                    if (step1) step1.style.display = 'block';
                    if (step2) step2.style.display = 'none';
                    this.showSuspendedScreen({
                      tenantName: sessData.active_tenant.tenant_name || tenantName
                    });
                    return;
                  }
                  tenantName = sessData.active_tenant.tenant_name || tenantName;
                  branch = sessData.active_tenant.branch_name || branch;
                  name = sessData.user.name || (data.user?.user_metadata?.full_name) || email.split('@')[0];
                  role = sessData.active_tenant.role === 'owner' ? 'Business Owner (Administrator)' : (sessData.active_tenant.role || 'Staff Member');
                  slug = sessData.active_tenant.workspace_slug || slug;
                  verified = true;
                }
              }
            }
          } catch (sbErr) {
            console.warn('Authentication status note:', sbErr);
          }
        }

        // 2. Search local authoritative tenant and staff roster if not already authenticated
        if (!verified) {
          // Check if user is the registered owner of the tenant
          if (activeTenant && activeTenant.ownerEmail && activeTenant.ownerEmail.toLowerCase() === email) {
            tenantName = activeTenant.companyName || 'My Business Organization';
            branch = activeTenant.branchName || 'Main Branch';
            slug = activeTenant.slug || 'workspace';
            name = activeTenant.ownerName || 'Business Owner';
            role = 'Business Owner (Administrator)';
            verified = true;
          } else {
            // Check if user is in the tenant's invited staff roster
            const roster = this.getStaffRoster();
            const found = roster.find(m => m.email && m.email.toLowerCase() === email);
            if (found) {
              tenantName = activeTenant?.companyName || 'My Business Organization';
              branch = found.branch || activeTenant?.branchName || 'Main Branch';
              slug = activeTenant?.slug || 'workspace';
              name = found.name;
              role = found.role || 'Store Operations Staff';
              verified = true;
            }
          }
        }

        if (progressFill) progressFill.style.width = '100%';

        // 3. Truthful unverified handling: Display Not Found screen
        if (!verified) {
          setTimeout(() => {
            if (searchState) searchState.style.display = 'none';
            if (notFoundState) {
              notFoundState.style.display = 'block';
              const nfEmail = document.getElementById('login-not-found-email');
              if (nfEmail) nfEmail.textContent = email;
            } else {
              this.backToLoginCredentials();
              this.showToast('No registered workspace found for ' + email + '.');
            }
          }, 350);
          return;
        }

        this.verifiedStaffData = {
          tenantName: tenantName || 'My Business Organization',
          branchName: branch,
          userName: name,
          userRole: role,
          slug: slug || 'workspace',
          email: email,
        };

        // Reveal verified card with green checkmarks
        setTimeout(() => {
          const compEl = document.getElementById('login-dyn-company');
          const slugEl = document.getElementById('login-dyn-slug');
          const nameEl = document.getElementById('login-dyn-name');
          const roleEl = document.getElementById('login-dyn-role');
          const lastEl = document.getElementById('login-dyn-last-active');

          if (compEl) compEl.textContent = this.verifiedStaffData.tenantName;
          if (slugEl) slugEl.textContent = this.verifiedStaffData.slug + '.stokrova.com';
          if (nameEl) nameEl.textContent = this.verifiedStaffData.userName;
          if (roleEl) roleEl.textContent = this.verifiedStaffData.userRole;
          if (lastEl) lastEl.textContent = 'Today • Verified Active Session';

          if (searchState) searchState.style.display = 'none';
          if (verifiedState) verifiedState.style.display = 'block';

          this.showToast('✓ Workspace found & verified for ' + this.verifiedStaffData.userName);
        }, 300);
      },

      confirmLoginLaunch() {
        this.closeLoginModal();
        const data = this.verifiedStaffData;
        if (!data) return;

        this.showToast('✓ Access granted: Welcome back, ' + data.userName + '!');
        this.launchWorkspace(data);

        // Check if first-login tour should start automatically (once-off per staff member & role)
        const role = data.userRole || 'Store Operations Staff';
        const userName = data.userName || 'Staff';
        let tourAlreadyDone = false;
        try {
          tourAlreadyDone = !!localStorage.getItem('stokrova_tour_completed_' + encodeURIComponent(userName + '_' + role));
        } catch (e) {
          tourAlreadyDone = false;
        }

        if (!tourAlreadyDone) {
          this.scheduleAutoTour(350, role);
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
          this.addItemToCart('SKU-1001', 'Pro Workstation Laptop', 2499.00);
        } else if (code.includes('PHONE') || code === '5011000000025') {
          this.addItemToCart('SKU-1002', 'Ultra 5G Smartphone', 999.00);
        } else {
          this.addItemToCart('SKU-1003', 'Oxford Cotton Shirt', 65.00);
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
                <div style="font-weight: 600; color: var(--text);">\${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--stokrova-font-mono);">\${item.sku} × \${item.qty}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-weight: 700; font-family: var(--stokrova-font-mono); color: var(--text);">$\${lineTotal.toFixed(2)}</span>
                <button onclick="window.stokrovaCustomerApp.removeItemFromCart(\${idx})" style="background: transparent; border: none; color: #F85149; cursor: pointer; font-size: 1rem;">×</button>
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

        // Update Today's Net Revenue
        this.todayRevenue += total;
        const revEl = document.querySelector('#ws-view-dashboard .stokrova-net-revenue');
        if (revEl) {
          revEl.textContent = '$' + this.todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Post balanced transaction to general ledger
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

      isViewAllowedForRole(viewId, userRole) {
        const r = (userRole || '').toLowerCase();
        if (r.includes('owner') || r.includes('admin')) {
          return true; // Business Owner has full access to all 28 views!
        }
        if (r.includes('cashier')) {
          return ['pos', 'cashier-desk', 'catalog', 'orders'].includes(viewId);
        }
        if (r.includes('picker') || r.includes('warehouse')) {
          return ['picking', 'inventory', 'locations', 'receiving', 'dispatch'].includes(viewId);
        }
        if (r.includes('accountant') || r.includes('finance') || r.includes('audit')) {
          return ['accountant', 'ledger', 'gl', 'tax', 'invoices', 'audit', 'analytics'].includes(viewId);
        }
        if (r.includes('driver') || r.includes('fleet') || r.includes('logistics')) {
          return ['fleet', 'dispatch', 'orders'].includes(viewId);
        }
        if (r.includes('sales') || r.includes('representative') || r.includes('crm')) {
          return ['crm', 'quotes', 'orders', 'invoices', 'catalog'].includes(viewId);
        }
        if (r.includes('manager')) {
          return viewId !== 'org';
        }
        return ['catalog', 'availability', 'orders', 'pos'].includes(viewId);
      },

      applyRbacFilter(userRole) {
        const allNavItems = document.querySelectorAll('.workspace-nav-item');
        allNavItems.forEach(item => {
          const vId = item.getAttribute('data-view-id');
          if (!vId) return;
          const allowed = this.isViewAllowedForRole(vId, userRole);
          item.style.display = allowed ? 'flex' : 'none';
        });
      },

      launchWorkspace({ tenantName, branchName, userName, userRole }) {
        if (sessionStorage.getItem('stokrova_tenant_suspended')) {
          let saved = null;
          try { saved = JSON.parse(sessionStorage.getItem('stokrova_tenant_suspended')); } catch (_) {}
          this.showSuspendedScreen(saved || { tenantName });
          return;
        }

        this.currentUserName = userName;
        this.currentWorkspaceRole = userRole;

        // Persist session to localStorage for robust refresh & deep linking
        try {
          localStorage.setItem('stokrova_active_session', JSON.stringify({
            tenantName,
            branchName,
            userName,
            userRole,
            sessionStartedAt: new Date().toISOString()
          }));
        } catch (_) {}

        const pub = document.getElementById('customer-public-surface');
        if (pub) pub.style.display = 'none';
        const ws = document.getElementById('business-workspace-container');
        if (ws) ws.style.display = 'flex';

        const tEl = document.getElementById('ws-tenant-display');
        const bEl = document.getElementById('ws-branch-display');
        const uEl = document.getElementById('ws-user-display');
        const rEl = document.getElementById('ws-role-display');

        if (tEl) tEl.textContent = tenantName;
        if (bEl) bEl.textContent = branchName;
        if (uEl) uEl.textContent = userName;
        if (rEl) rEl.textContent = userRole;

        // Populate dynamic staff roster from storage
        this.renderStaffRoster();

        // Apply RBAC nav filtering
        this.applyRbacFilter(userRole);

        // Determine destination view: if URL hash is on an allowed workspace view, keep it; else route to role default
        const suite = this.getTourDataForRole(userRole);
        const currentHash = window.location.hash || '';
        const hashParts = currentHash.split('/');
        const hashView = (hashParts[1] === 'workspace' && hashParts[2]) ? hashParts[2] : null;
        if (hashView && this.isViewAllowedForRole(hashView, userRole)) {
          this.showWsView(hashView);
        } else {
          const defaultView = suite.defaultView || 'dashboard';
          this.showWsView(defaultView);
        }
      },

      async signOut() {
        const sb = getSupabase();
        if (sb) {
          try { await sb.auth.signOut(); } catch (_) {}
        }
        if (this.autoTourTimer) {
          clearTimeout(this.autoTourTimer);
          this.autoTourTimer = null;
        }
        try {
          localStorage.removeItem('stokrova_active_session');
        } catch (_) {}

        document.getElementById('business-workspace-container').style.display = 'none';
        document.getElementById('customer-public-surface').style.display = 'block';
        window.location.hash = '#/';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showToast('You have signed out of your STOKROVA business workspace.');
      },

      showWsView(viewId) {
        const role = this.currentWorkspaceRole || 'Business Owner (Administrator)';
        if (!this.isViewAllowedForRole(viewId, role)) {
          const suite = this.getTourDataForRole(role);
          const fallbackView = suite.defaultView || 'dashboard';
          this.showToast('Access restricted: View "' + viewId + '" is not authorized for your role.');
          if (viewId !== fallbackView) {
            this.showWsView(fallbackView);
          }
          return;
        }

        // Update URL Hash for bookmarking and history back/forward!
        if (window.location.hash !== '#/workspace/' + viewId) {
          window.location.hash = '#/workspace/' + viewId;
        }

        const allPanels = document.querySelectorAll('.ws-view-content');
        allPanels.forEach(p => p.style.display = 'none');
        const target = document.getElementById('ws-view-' + viewId);
        if (target) target.style.display = 'block';

        const allNavs = document.querySelectorAll('.workspace-nav-item');
        allNavs.forEach(n => {
          n.classList.remove('active');
          n.style.background = 'transparent';
          n.style.color = 'var(--text-secondary)';
          n.style.fontWeight = '500';
          n.style.borderLeft = 'none';
        });
        const activeNav = document.getElementById('ws-nav-' + viewId);
        if (activeNav) {
          activeNav.classList.add('active');
          activeNav.style.background = 'rgba(189,150,82,0.15)';
          activeNav.style.color = '#E0CB9F';
          activeNav.style.fontWeight = '600';
          activeNav.style.borderLeft = '3px solid #BD9652';
        }

        const viewport = document.querySelector('.workspace-viewport');
        if (viewport) viewport.scrollTop = 0;
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

      // Corporate Rebranding helpers
      selectBrandAccent(hex) {
        const picker = document.getElementById('rebrand-color-picker');
        const textInput = document.getElementById('rebrand-hex-input');
        if (picker) picker.value = hex;
        if (textInput) textInput.value = hex;
        this.updateBrandPreview();
      },

      updateBrandPreview() {
        const hex = document.getElementById('rebrand-hex-input')?.value || '#BD9652';
        const name = document.getElementById('rebrand-company-name')?.value || (document.getElementById('ws-tenant-display')?.textContent || 'My Business Organization');
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Retail & Wholesale Operations';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ STOKROVA';

        const headEl = document.getElementById('preview-brand-header');
        if (headEl) {
          headEl.textContent = logo;
          headEl.style.color = hex;
        }
        const badgeEl = document.getElementById('preview-branch-badge');
        if (badgeEl) badgeEl.style.color = hex;
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
        const name = document.getElementById('rebrand-company-name')?.value || (document.getElementById('ws-tenant-display')?.textContent || 'My Business Organization');
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Retail & Wholesale Operations';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ STOKROVA';

        document.documentElement.style.setProperty('--primary', hex);
        document.documentElement.style.setProperty('--primary-hover', hex);
        
        const tenantDisplay = document.getElementById('ws-tenant-display');
        if (tenantDisplay) tenantDisplay.textContent = name;

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
            const tenantDisplay = document.getElementById('ws-tenant-display');
            if (tenantDisplay) tenantDisplay.textContent = name;
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

      // Authoritative Persistent Staff Roster Management
      openStaffInviteModal() {
        const modal = document.getElementById('modal-invite-staff');
        if (modal) modal.style.display = 'flex';
      },

      closeStaffInviteModal() {
        const modal = document.getElementById('modal-invite-staff');
        if (modal) modal.style.display = 'none';
      },

      getStaffRoster() {
        try {
          return JSON.parse(localStorage.getItem('stokrova_staff_roster') || '[]');
        } catch (_) {
          return [];
        }
      },

      saveStaffRoster(roster) {
        try {
          localStorage.setItem('stokrova_staff_roster', JSON.stringify(roster));
        } catch (_) {}
      },

      renderStaffRoster() {
        const tableBody = document.getElementById('staff-table-body');
        const emptyRow = document.getElementById('staff-empty-row');
        const countBadge = document.getElementById('staff-count-badge');
        if (!tableBody) return;

        const roster = this.getStaffRoster();
        const existingDynamic = tableBody.querySelectorAll('tr.stokrova-dynamic-staff-row');
        existingDynamic.forEach(r => r.remove());

        if (roster.length === 0) {
          if (emptyRow) emptyRow.style.display = 'table-row';
          if (countBadge) countBadge.textContent = '0 Staff Members Active';
          return;
        }

        if (emptyRow) emptyRow.style.display = 'none';
        if (countBadge) countBadge.textContent = roster.length + ' Staff Member' + (roster.length > 1 ? 's' : '') + ' Active';

        roster.forEach((member, idx) => {
          const row = document.createElement('tr');
          row.className = 'stokrova-dynamic-staff-row';
          row.style.borderBottom = '1px solid var(--border)';
          row.innerHTML = \`
            <td style="padding: 12px 16px; font-weight: 600;">
              <div>\${member.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">\${member.email}</div>
            </td>
            <td style="padding: 12px 16px;">
              <span style="background: rgba(189,150,82,0.18); color: var(--primary); border: 1px solid var(--primary); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">\${member.role}</span>
            </td>
            <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 0.8125rem;">\${member.branch || 'Main Branch'}</td>
            <td style="padding: 12px 16px; text-align: center;">
              <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
            </td>
            <td style="padding: 12px 16px; text-align: right;">
              <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">PIN: \${member.pin || '••••'}</span>
              <button onclick="window.stokrovaCustomerApp.removeStaffMember(\${idx})" title="Remove staff member" style="background: transparent; border: none; color: #F85149; margin-left: 8px; cursor: pointer; font-size: 0.85rem;">✕</button>
            </td>
          \`;
          tableBody.appendChild(row);
        });
      },

      removeStaffMember(idx) {
        const roster = this.getStaffRoster();
        roster.splice(idx, 1);
        this.saveStaffRoster(roster);
        this.renderStaffRoster();
        this.showToast('Staff member removed from workspace roster.');
      },

      handleStaffInviteSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('invite-staff-name')?.value.trim();
        const email = document.getElementById('invite-staff-email')?.value.trim().toLowerCase();
        const role = document.getElementById('invite-staff-role')?.value || 'Store Operations Staff';
        const branch = document.getElementById('invite-staff-branch')?.value || 'Main Branch';
        const pin = document.getElementById('invite-staff-pin')?.value.trim() || '1234';

        if (!name || !email) {
          this.showToast('Please enter both staff member name and work email.');
          return;
        }

        const roster = this.getStaffRoster();
        const existingIdx = roster.findIndex(m => m.email && m.email.toLowerCase() === email);
        if (existingIdx >= 0) {
          roster[existingIdx] = { name, email, role, branch, pin, updatedAt: new Date().toISOString() };
        } else {
          roster.push({ name, email, role, branch, pin, createdAt: new Date().toISOString() });
        }
        this.saveStaffRoster(roster);
        this.renderStaffRoster();

        this.closeStaffInviteModal();
        this.showToast(\`✓ Staff member '\${name}' invited and assigned role: \${role}\`);
      }
    };

    // Attach globals for inline events
    window.selectBrandAccent = (hex) => window.stokrovaCustomerApp.selectBrandAccent(hex);
    window.updateBrandPreview = () => window.stokrovaCustomerApp.updateBrandPreview();
    window.saveCompanyRebranding = () => window.stokrovaCustomerApp.saveCompanyRebranding();
    window.openStaffInviteModal = () => window.stokrovaCustomerApp.openStaffInviteModal();
    window.closeStaffInviteModal = () => window.stokrovaCustomerApp.closeStaffInviteModal();
    window.handleStaffInviteSubmit = (e) => window.stokrovaCustomerApp.handleStaffInviteSubmit(e);
    window.removeStaffMember = (idx) => window.stokrovaCustomerApp.removeStaffMember(idx);

    // Initialize brand settings
    window.stokrovaCustomerApp.loadBrandSettings();

    // Global 403 TENANT_SUSPENDED Interceptor
    const _origFetch = window.fetch;
    window.fetch = async function(...args) {
      const res = await _origFetch.apply(this, args);
      if (res && res.status === 403) {
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (data && (data.code === 'TENANT_SUSPENDED' || data.message?.includes('TENANT_SUSPENDED') || data.message?.includes('suspended'))) {
            window.stokrovaCustomerApp.showSuspendedScreen({
              tenantName: document.getElementById('ws-tenant-display')?.textContent || 'Your Business Organization'
            });
          }
        } catch (_) {}
      }
      return res;
    };

    // Central Hash Router with Session Restoration and RBAC Enforcement
    function handleRoute() {
      const hash = window.location.hash || '';

      if (sessionStorage.getItem('stokrova_tenant_suspended')) {
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('stokrova_tenant_suspended')); } catch (_) {}
        window.stokrovaCustomerApp.showSuspendedScreen(saved || {});
        return;
      }

      if (hash.startsWith('#/workspace')) {
        let activeSession = null;
        try {
          activeSession = JSON.parse(localStorage.getItem('stokrova_active_session') || 'null');
        } catch (_) {}

        if (!activeSession) {
          // No active session: redirect to login
          window.stokrovaCustomerApp.showToast('Please sign in to access your business workspace.');
          window.location.hash = '#/login';
          return;
        }

        // Restore workspace session if not already displayed
        const ws = document.getElementById('business-workspace-container');
        if (!ws || ws.style.display === 'none') {
          window.stokrovaCustomerApp.launchWorkspace(activeSession);
        }

        const parts = hash.split('/');
        const viewId = parts[2] || '';
        if (viewId) {
          window.stokrovaCustomerApp.showWsView(viewId);
        }
        return;
      }

      if (hash === '#/login' || hash === '#/staff-login') {
        const ws = document.getElementById('business-workspace-container');
        if (ws) ws.style.display = 'none';
        const pub = document.getElementById('customer-public-surface');
        if (pub) pub.style.display = 'block';
        window.stokrovaCustomerApp.closeRegisterModal();
        window.stokrovaCustomerApp.openLoginModal();
        return;
      }

      if (hash === '#/register' || hash === '#/signup') {
        const ws = document.getElementById('business-workspace-container');
        if (ws) ws.style.display = 'none';
        const pub = document.getElementById('customer-public-surface');
        if (pub) pub.style.display = 'block';
        window.stokrovaCustomerApp.closeLoginModal();
        window.stokrovaCustomerApp.openRegisterModal();
        return;
      }

      // Default route: Public landing page
      const ws = document.getElementById('business-workspace-container');
      if (ws) ws.style.display = 'none';
      const pub = document.getElementById('customer-public-surface');
      if (pub) pub.style.display = 'block';
      window.stokrovaCustomerApp.closeLoginModal();
      window.stokrovaCustomerApp.closeRegisterModal();
      window.stokrovaCustomerApp.closeDemoConfirmModal();
      window.stokrovaCustomerApp.closeLegalModal();
    }

    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('load', handleRoute);

    // Automatic Live Supabase Session Restoration & Onboarding Recovery
    window.addEventListener('DOMContentLoaded', async () => {
      // Execute initial route check
      handleRoute();

      const sb = getSupabase();
      if (!sb) return;

      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session && session.access_token) {
          const res = await fetch(SUPABASE_CONFIG.apiBase + '/auth/session', {
            headers: { 'Authorization': 'Bearer ' + session.access_token }
          }).then(r => r.json()).catch(() => null);

          if (res && res.authenticated && res.active_tenant) {
            if (res.active_tenant.status === 'SUSPENDED') {
              window.stokrovaCustomerApp.showSuspendedScreen({
                tenantName: res.active_tenant.tenant_name
              });
              return;
            }

            const signinBtns = document.querySelectorAll('button[onclick*="openLoginModal"]');
            signinBtns.forEach(btn => {
              btn.textContent = res.active_tenant.tenant_name + ' (' + (res.user?.email || '').split('@')[0] + ') →';
              btn.onclick = () => {
                const sessData = {
                  tenantName: res.active_tenant.tenant_name,
                  branchName: res.active_tenant.branch_name || 'Primary Branch',
                  userName: res.user?.name || res.user?.email || 'Owner',
                  userRole: res.active_tenant.role === 'owner' ? 'Business Owner (Administrator)' : (res.active_tenant.role || 'Staff'),
                };
                window.stokrovaCustomerApp.launchWorkspace(sessData);
              };
            });
          }
        }
      } catch (_) {}

      sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session && session.access_token) {
          let pending = null;
          try { pending = JSON.parse(localStorage.getItem('stokrova_pending_onboarding') || 'null'); } catch (_) {}
          if (pending && session.user && session.user.email && pending.ownerEmail.toLowerCase() === session.user.email.toLowerCase()) {
            try {
              await fetch(SUPABASE_CONFIG.apiBase + '/auth/onboard', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + session.access_token,
                },
                body: JSON.stringify({
                  name: pending.companyName,
                  slug: pending.slug,
                  owner_full_name: pending.ownerName,
                  default_currency: pending.currency,
                  initial_branch_name: pending.branchName,
                  plan_tier: pending.tier,
                })
              });
              localStorage.removeItem('stokrova_pending_onboarding');
              window.stokrovaCustomerApp.showToast("✓ Identity confirmed & business '" + pending.companyName + "' provisioned!");
            } catch (_) {}
          }
        }
      });
    });

    // Sticky Header Scroll Listener
    window.addEventListener('scroll', () => {
      const header = document.getElementById('main-header');
      if (header) {
        if (window.scrollY > 24) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    }, { passive: true });

    // Keyboard Escape Key listener for accessibility
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.stokrovaCustomerApp.endTour();
        window.stokrovaCustomerApp.closeRegisterModal();
        window.stokrovaCustomerApp.closeLoginModal();
        window.stokrovaCustomerApp.closeDemoConfirmModal();
        window.stokrovaCustomerApp.closeLegalModal();
        const drawer = document.getElementById('mobile-nav-drawer');
        if (drawer) drawer.style.display = 'none';
      }
    });
  </script>
</body>
</html>
`;

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), completeWebsiteHtml.trim(), 'utf-8');
console.log('✅ Generated STOKROVA Customer Website & Complete Business Portal index.html at', path.join(distDir, 'index.html'));
