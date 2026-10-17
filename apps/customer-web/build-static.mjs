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
  tenantName: isDemo ? 'Sample Company Ltd' : 'Organization Workspace',
  branchName: isDemo ? 'Main Branch' : 'Main Branch',
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
    branchName: 'Main Branch Store',
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
    fullName: 'Sample Owner',
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
    scope: { tenantId: 'ten_apex_global', branchId: 'brn_london_flagship', branchName: 'Main Branch' },
    status: 'ACTIVE',
    joinedDateIso: '2026-02-15T00:00:00Z',
  });
  rbacModel.addStaffMember({
    id: 'usr_emma',
    fullName: 'Emma Watson',
    email: 'emma@apex.com',
    roleCode: 'CASHIER',
    roleName: 'Head Cashier',
    scope: { tenantId: 'ten_apex_global', branchId: 'brn_london_flagship', branchName: 'Main Branch' },
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
    name: 'Main Branch Store',
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
  branchName: isDemo ? 'Main Branch Store' : 'Main Branch',
  currency: 'USD',
});

const baseWorkspaceViewsHtml = renderAllWorkspaceViewsHtml({
  theme: 'dark',
  tenantName: isDemo ? 'Sample Company Ltd' : 'Organization Workspace',
  branchName: isDemo ? 'Main Branch' : 'Main Branch',
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&family=Syne:wght@700;800;900&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
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
      --font-heading-industrial: 'Syne', -apple-system, sans-serif;
      --font-tech: 'Space Grotesk', -apple-system, sans-serif;
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

    /* Toast Notification (Closer & Top-Centered Glassmorphic Pill) */
    #toast-notification {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(22, 27, 30, 0.96);
      backdrop-filter: blur(12px);
      border: 1px solid var(--primary, #BD9652);
      color: #F8FAFC;
      padding: 10px 22px;
      border-radius: 9999px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.65), 0 0 20px rgba(189,150,82,0.18);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.84rem;
      font-weight: 600;
      z-index: 100000;
      animation: stkToastDrop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      cursor: pointer;
    }
    @keyframes stkToastDrop { from { transform: translate(-50%, -16px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    @keyframes stkSpin { to { transform: rotate(360deg); } }

    /* Cosmic Motions & High-Industrial Multi-Step Stepper */
    .signup-stepper-card {
      background: radial-gradient(circle at 50% 0%, #1c2328 0%, #13171a 100%) !important;
      border: 1px solid #414F5A !important;
      box-shadow: 0 35px 85px rgba(0,0,0,0.85), 0 0 30px rgba(189,150,82,0.18), inset 0 1px 0 rgba(255,255,255,0.06) !important;
      border-radius: 16px !important;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .stk-industrial-title {
      font-family: var(--font-heading-industrial, 'Syne', sans-serif) !important;
      font-weight: 800 !important;
      letter-spacing: -0.02em !important;
      text-transform: uppercase !important;
    }
    .stk-step-nav-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 6px;
      background: rgba(20,24,27,0.7);
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }
    .stk-step-nav-item.active {
      border-color: var(--primary) !important;
      background: rgba(189,150,82,0.12) !important;
      box-shadow: 0 0 14px rgba(189,150,82,0.18) !important;
    }
    .stk-step-nav-num {
      font-family: var(--stokrova-font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 0.05em;
    }
    .stk-step-nav-label {
      font-family: var(--font-heading-industrial, 'Syne', sans-serif);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .stk-industrial-label {
      font-family: var(--font-tech, 'Space Grotesk', sans-serif);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 6px;
      display: block;
    }
    .stk-currency-select {
      font-size: 0.8125rem !important;
      font-weight: 600 !important;
      font-family: var(--stokrova-font-mono) !important;
      height: 38px !important;
      min-height: 38px !important;
      padding: 6px 12px !important;
      background: #14181B !important;
      border: 1px solid var(--border) !important;
      color: var(--text) !important;
      border-radius: 6px !important;
    }
    .stk-industrial-btn-primary {
      font-family: var(--font-heading-industrial, 'Syne', sans-serif) !important;
      font-weight: 800 !important;
      letter-spacing: 0.03em !important;
      text-transform: uppercase !important;
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
          <span id="ws-tenant-display">${isDemo ? 'Sample Company Ltd' : 'Organization Workspace'}</span>
        </div>
        <span style="font-size: 0.75rem; background: rgba(189,150,82,0.18); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: 600;" id="ws-branch-display">${isDemo ? 'Main Branch' : 'Main Branch'}</span>
        <span style="font-size: 0.75rem; background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">LIVE PRODUCTION</span>
      </div>

      <div style="display: flex; align-items: center; gap: 14px;">
        <button onclick="window.stokrovaCustomerApp.startTour()" style="background: rgba(189,150,82,0.18); color: var(--primary); border: 1px solid var(--primary); padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
          <span>🌍</span> <span>Take Tour ✦</span>
        </button>
        <div style="font-size: 0.8125rem; color: var(--text-secondary);">
          Signed in as: <strong id="ws-user-display" style="color: var(--text);">${isDemo ? 'Sample Owner' : 'Business Owner'}</strong>
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
    /** Creates the company workspace for the signed-in owner; never reports success unless the server confirms it. */
    const submitOnboarding = async (accessToken, pending, email) => {
      if (!pending || !pending.companyName || !pending.slug) return { ok: false, message: 'Your company details were not found. Please register again.' };
      try {
        const res = await fetch(SUPABASE_CONFIG.apiBase + '/auth/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
          body: JSON.stringify({
            name: pending.companyName,
            slug: pending.slug,
            owner_email: email || pending.ownerEmail,
            owner_full_name: pending.ownerName,
            default_currency: pending.currency,
            initial_branch_name: pending.branchName,
            plan_tier: pending.tier,
          }),
        });
        if (res.ok) {
          try { localStorage.removeItem('stokrova_pending_onboarding'); } catch (_) {}
          return { ok: true };
        }
        let message = 'We could not create your workspace (' + res.status + ').';
        try { const body = await res.json(); message = body?.error?.message || body?.message || message; } catch (_) {}
        if (res.status === 409) message = 'That workspace address is already taken. Please choose another one.';
        return { ok: false, message };
      } catch (_) {
        return { ok: false, message: 'We could not reach Stokrova to create your workspace. Please check your connection and try again.' };
      }
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
      todayRevenue: 382000.00,

      // Multi-Step Registration State & Cosmic Engine
      currentSignupStep: 1,
      cosmicAnimId: null,
      cosmicParticles: [],
      pendingTenant: null,
      verifiedStaffData: null,

      openRegisterModal(planId) {
        const navDrawer = document.getElementById('mobile-nav-drawer');
        if (navDrawer) navDrawer.style.display = 'none';
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

          const badge = document.getElementById('step-badge-' + i);
          if (badge) {
            if (i === step) {
              badge.classList.add('active');
            } else {
              badge.classList.remove('active');
            }
          }
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
        if (pctEl && widths[step - 1]) pctEl.textContent = 'Site Registration';
        if (fillEl && widths[step - 1]) fillEl.style.width = widths[step - 1];
      },

      nextSignupStep(current) {
        let btn = null;
        if (current === 1) {
          const comp = document.getElementById('reg-company-name');
          const slug = document.getElementById('reg-slug');
          const compVal = comp ? comp.value.trim() : '';
          const slugVal = slug ? slug.value.trim() : '';
          if (!compVal || !slugVal) {
            this.showToast('Please enter your business legal name and workspace slug.');
            return;
          }
          btn = document.getElementById('btn-signup-step1');
        } else if (current === 2) {
          const branch = document.getElementById('reg-branch-name');
          const branchVal = branch ? branch.value.trim() : '';
          if (!branchVal) {
            this.showToast('Please enter your flagship store or warehouse branch name.');
            return;
          }
          btn = document.getElementById('btn-signup-step2');
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
          btn = document.getElementById('btn-signup-step3');
        }

        // Geometry-locked responsive loading placed directly in the center of the button
        let stopStepLoading = () => {};
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const origWidth = rect.width;
          const origHeight = rect.height;
          btn.style.width = Math.max(origWidth, 180) + 'px';
          btn.style.minWidth = Math.max(origWidth, 180) + 'px';
          btn.style.height = Math.max(origHeight, 44) + 'px';
          const orig = btn.innerHTML;
          btn.disabled = true;
          btn.style.pointerEvents = 'none';
          btn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;gap:8px;"><span class="stk-btn-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.25);border-top-color:currentColor;border-radius:50%;animation:stkSpin 0.6s linear infinite;vertical-align:middle;"></span><span style="font-weight:800;letter-spacing:0.02em;">Confirming\u2026</span></div>';
          stopStepLoading = () => {
            btn.innerHTML = orig;
            btn.style.width = '';
            btn.style.minWidth = '';
            btn.style.height = '';
            btn.style.pointerEvents = '';
            btn.disabled = false;
          };
        }

        // Dedicated Page Loading State: hide current step & show inter-step transition
        const currentPane = document.getElementById('reg-step-' + current);
        const loader = document.getElementById('signup-step-loader');
        const header = document.getElementById('signup-stepper-header');
        const loaderTitle = document.getElementById('signup-loader-title');
        const loaderSub = document.getElementById('signup-loader-sub');

        setTimeout(() => {
          if (currentPane) currentPane.style.display = 'none';
          if (header) header.style.display = 'none';
          if (loader) loader.style.display = 'block';
          if (loaderTitle) loaderTitle.textContent = 'Confirming & Loading Next Page...';
          if (loaderSub) loaderSub.textContent = 'Calibrating your business parameters and security settings...';

          setTimeout(() => {
            stopStepLoading();
            this.setSignupStep(current + 1);
          }, 320);
        }, 180);
      },

      prevSignupStep(current) {
        if (current > 1) {
          this.setSignupStep(current - 1);
        }
      },

      onPlanCurrencyChange(currency) {
        const baseCur = document.getElementById('reg-currency');
        if (baseCur) baseCur.value = currency;
        const planCur = document.getElementById('reg-plan-currency');
        if (planCur) planCur.value = currency;

        const symbols = {
          USD: { sym: '$', starter: '49', growth: '149', ent: '399' },
          GBP: { sym: '£', starter: '39', growth: '119', ent: '319' },
          EUR: { sym: '€', starter: '45', growth: '139', ent: '369' },
          NGN: { sym: '₦', starter: '65,000', growth: '195,000', ent: '520,000' },
          KES: { sym: 'KSh ', starter: '6,500', growth: '19,500', ent: '52,000' },
          ZAR: { sym: 'R ', starter: '890', growth: '2,690', ent: '7,200' },
        };
        const c = symbols[currency] || symbols.USD;
        const pStart = document.getElementById('plan-price-starter');
        const pGrowth = document.getElementById('plan-price-growth');
        const pEnt = document.getElementById('plan-price-enterprise');
        if (pStart) pStart.textContent = c.sym + c.starter;
        if (pGrowth) pGrowth.textContent = c.sym + c.growth;
        if (pEnt) pEnt.textContent = c.sym + c.ent;

        const tierSelect = document.getElementById('reg-tier');
        if (tierSelect) {
          const selVal = tierSelect.value;
          tierSelect.innerHTML = '<option value="starter">Starter — ' + c.sym + c.starter + '/mo</option>' +
            '<option value="growth">Growth — ' + c.sym + c.growth + '/mo (Recommended)</option>' +
            '<option value="enterprise">Enterprise — ' + c.sym + c.ent + '/mo</option>';
          tierSelect.value = selVal;
        }
      },

      onBaseCurrencyChange(currency) {
        this.onPlanCurrencyChange(currency);
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
              card.style.boxShadow = '0 0 20px rgba(189,150,82,0.25)';
            } else {
              card.style.borderColor = 'var(--border)';
              card.style.borderWidth = '1px';
              card.style.boxShadow = 'none';
            }
          }
        });
      },

      startCosmicParticles() {
        const canvas = document.getElementById('signup-cosmic-canvas');
        if (!canvas || typeof canvas.getContext !== 'function') return;
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
        const companyName = document.getElementById('reg-company-name')?.value.trim() || '';
        const slug = document.getElementById('reg-slug')?.value.trim().toLowerCase() || '';
        const currency = document.getElementById('reg-currency')?.value || 'USD';
        const branchName = document.getElementById('reg-branch-name')?.value.trim() || 'Main Branch';
        const ownerName = document.getElementById('reg-owner-name')?.value.trim() || '';
        const ownerEmail = document.getElementById('reg-owner-email')?.value.trim().toLowerCase() || '';
        const password = document.getElementById('reg-password')?.value || '';
        const tier = document.getElementById('reg-tier')?.value || 'growth';
        const phone = document.getElementById('reg-owner-phone')?.value.trim() || '';

        if (!companyName || !slug || !ownerName || !ownerEmail) {
          this.showToast('Please fill in your company name, workspace address, your name and email.');
          return;
        }

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

        // Persist locally for callback continuity
        try {
          localStorage.setItem('stokrova_pending_onboarding', JSON.stringify(tenantData));
        } catch (_) {}

        const sb = getSupabase();
        if (sb) {
          const submitBtn = document.getElementById('btn-submit-registration');
          let stopRegLoading = () => {};
          if (submitBtn) {
            const rect = submitBtn.getBoundingClientRect();
            submitBtn.style.width = Math.max(rect.width, 240) + 'px';
            submitBtn.style.minWidth = Math.max(rect.width, 240) + 'px';
            submitBtn.style.height = Math.max(rect.height, 46) + 'px';
            const orig = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.style.pointerEvents = 'none';
            submitBtn.style.opacity = '0.9';
            submitBtn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;gap:8px;"><span class="stk-btn-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.25);border-top-color:currentColor;border-radius:50%;animation:stkSpin 0.6s linear infinite;vertical-align:middle;"></span><span style="font-weight:800;letter-spacing:0.02em;">Registering Business\u2026</span></div>';
            stopRegLoading = () => {
              submitBtn.innerHTML = orig;
              submitBtn.style.width = '';
              submitBtn.style.minWidth = '';
              submitBtn.style.height = '';
              submitBtn.style.pointerEvents = '';
              submitBtn.style.opacity = '';
              submitBtn.disabled = false;
            };
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
              stopRegLoading();
              return;
            }

            // Check if Supabase session is issued or confirmation required
            if (data.session && data.session.access_token) {
              // Immediate session (autoconfirm enabled): Call transactional NestJS onboarding API
              const result = await submitOnboarding(data.session.access_token, tenantData, ownerEmail);
              if (!result.ok) {
                this.showToast(result.message);
                stopRegLoading();
                return;
              }
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
            stopRegLoading();
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
        let stopCheckLoading = () => {};
        if (btn) {
          const rect = btn.getBoundingClientRect();
          btn.style.width = Math.max(rect.width, 160) + 'px';
          btn.style.minWidth = Math.max(rect.width, 160) + 'px';
          const orig = btn.innerHTML;
          btn.disabled = true;
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.85';
          btn.innerHTML = '<span class="stk-btn-spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.25);border-top-color:currentColor;border-radius:50%;animation:stkSpin 0.6s linear infinite;margin-right:6px;vertical-align:middle;"></span><span>Verifying identity\u2026</span>';
          stopCheckLoading = () => {
            btn.innerHTML = orig;
            btn.style.width = '';
            btn.style.minWidth = '';
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
            btn.disabled = false;
          };
        }
        try {
          const { data: { session }, error } = await sb.auth.getSession();
          if (session && session.access_token) {
            const pending = this.pendingTenant || JSON.parse(localStorage.getItem('stokrova_pending_onboarding') || '{}');
            const result = await submitOnboarding(session.access_token, pending, session.user?.email);
            if (!result.ok) {
              this.showToast(result.message);
              return;
            }
            this.showToast('✓ Identity confirmed! Deploying workspace...');
            this.populateCustomizationAndSimulate(pending.companyName, pending.branchName, pending.ownerName, pending.slug);
          } else {
            this.showToast('Email confirmation pending. Please check your inbox and click the verification link.');
          }
        } catch (err) {
          this.showToast('Verification check: ' + err.message);
        } finally {
          stopCheckLoading();
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
        const t = this.pendingTenant || {
          companyName: 'Sample Company Ltd',
          branchName: 'Main Branch',
          ownerName: 'Sample Owner',
        };
        this.launchWorkspace({
          tenantName: t.companyName,
          branchName: t.branchName,
          userName: t.ownerName,
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
      currentUserName: 'Sample Owner',
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
              snippet: '📊 12-Month Net Revenue: $382,000.00 | Gross Margin: 38.50% | Till Variance: $0.00'
            },
            {
              viewId: 'pos',
              targetSelector: '.pos-preview-wrapper',
              title: 'Offline-Tolerant Point of Sale & Laser Buffer',
              desc: 'Ring up sales at counter speed. Hardware laser scanners are detected automatically (<50ms). If retail internet goes down, sales persist in encrypted local SQLite outbox queues and sync automatically upon reconnection.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateTourScan()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">⚡ Test Laser Barcode Scan (5011000000018)</button>'
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
              snippet: '⚖️ Pure Double-Entry: DR 1010 Bank Cash $86.40 = CR 4010 Retail Sales $86.40 (Delta: $0.00)'
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
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateTourScan()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">⚡ Test Laser Barcode Scan (5011000000018)</button>'
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
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateSplitTender()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">💳 Simulate Split Payment ($20.00 Cash + $66.40 Card)</button>'
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
              snippet: '<button onclick="window.stokrovaCustomerApp.simulatePickItem()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">📦 Verify Pick Item (Wave #WAVE-LON-042)</button>'
            },
            {
              viewId: 'inventory',
              targetSelector: '.workspace-viewport',
              title: 'Strict FEFO Lot Expiry Enforcement',
              desc: 'Enforce product freshness. STOKROVA strictly requires First-Expired, First-Out lot picking for perishable and dated goods, preventing pickers from selecting newer lots prematurely.',
              snippet: '🏷️ Lot Verification: LOT-2026-A12 (Exp: 2026-12-31) • Inventory Rotation Active ✓'
            },
            {
              viewId: 'locations',
              targetSelector: '.workspace-viewport',
              title: 'Aisle, Rack & Bin Location Mapping',
              desc: 'Navigate multi-tier racking maps with bin capacities and barcode verification. Scan bin barcodes directly to transfer stock between picking shelves and reserve bulk storage.',
              snippet: '📍 Bin R-04-B2: Capacity 85% • Barcode Verified • Zero Phantom Stock Discrepancies'
            },
            {
              viewId: 'receiving',
              targetSelector: '.workspace-viewport',
              title: 'Blind Receiving & Transfer Custody',
              desc: 'Eliminate phantom stock with blind count receiving. Goods arriving from suppliers or sister branches are counted independently before release to active inventory.',
              snippet: '🛡️ Blind Count Receiving: 120 Units Counted vs PO Manifest • Variance: 0.00%'
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
              snippet: '📈 Branch Revenue: $24,850.00 Today • Customer Count: 312 • Average Basket: $79.65'
            },
            {
              viewId: 'registers',
              targetSelector: '.workspace-viewport',
              title: 'Till Drawer Audits & Shift Approvals',
              desc: 'Authorize cashier shift open/close audits. Perform blind drawer counts and sign off till variances with verified supervisor approvals.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateManagerAudit()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">🛡️ Sign Off Shift Till (Zero Variance Verified)</button>'
            },
            {
              viewId: 'po',
              targetSelector: '.workspace-viewport',
              title: 'Purchase Orders & Low-Stock Alerts',
              desc: 'Prevent stockouts before they happen. Review automatic reorder triggers when inventory breaches safety thresholds and approve supplier POs with a single click.',
              snippet: '⚠️ Reorder Trigger: 4 SKUs below minimum buffer • PO-2026-088 Drafted'
            },
            {
              viewId: 'org',
              targetSelector: '.workspace-viewport',
              title: 'Staff Shift Rostering & Permission Scopes',
              desc: 'Manage store team members and active shift schedules. Configure terminal access and supervisor permissions with strict enterprise authorization enforcement.',
              snippet: '👥 Active Store Roster: 6 Staff On Shift • Granular RBAC Enforced'
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
              snippet: '⚖️ GL Balance: Total Debits $1,420,950.00 = Total Credits $1,420,950.00 (Delta: $0.00)'
            },
            {
              viewId: 'accountant',
              targetSelector: '.workspace-viewport',
              title: 'Bank & Subledger Automated Matching',
              desc: 'Run 3-way matching between Purchase Orders, Receiving Notes, and Invoices. Match clearing bank accounts automatically and resolve variances with audited adjustments.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateReconcileAccount()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">📊 Reconcile Bank Feed (99.8% Auto-Matched)</button>'
            },
            {
              viewId: 'tax',
              targetSelector: '.workspace-viewport',
              title: 'Tax & VAT Statutory Reporting',
              desc: 'Automatic input vs output VAT schedules, multi-jurisdiction sales tax calculations, and exportable financial summaries ready for revenue and customs authorities.',
              snippet: '🏛️ VAT Summary: Output VAT $18,420.00 - Input VAT $9,110.00 = Net Due $9,310.00'
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
              snippet: '🚚 Run #RUN-LON-04: 8 Delivery Drops • Route Optimized • Total Distance: 28.4 mi'
            },
            {
              viewId: 'fleet',
              targetSelector: '.workspace-viewport',
              title: 'Electronic Proof-of-Delivery (ePOD)',
              desc: 'Capture customer signatures, delivery photo verification, and GPS timestamps at the doorstep. Completed delivery records update customer orders instantly.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateDriverEpod()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">✍️ Test Capture ePOD Signature (Drop #3 Delivered)</button>'
            },
            {
              viewId: 'dispatch',
              targetSelector: '.workspace-viewport',
              title: 'Vehicle Custody Scan & Return Processing',
              desc: 'Confirm vehicle loading with quick barcode scans. Safely log undelivered goods or customer returns back into warehouse custody with zero discrepancy.',
              snippet: '📦 Custody Status: 8/8 Parcels Loaded • 0 Unaccounted Items'
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
              snippet: '💼 Portfolio: 18 Enterprise Accounts • Total Pipeline Value: $420,000.00'
            },
            {
              viewId: 'quotes',
              targetSelector: '.workspace-viewport',
              title: 'Dynamic Wholesale Quotes & Price Lists',
              desc: 'Draft bespoke customer quotes with negotiated tiered pricing. The system checks margin thresholds automatically before dispatching formal proposals.',
              snippet: '<button onclick="window.stokrovaCustomerApp.simulateQuoteApprove()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">📄 Generate B2B Quote (Tier 2 Wholesale Discount)</button>'
            },
            {
              viewId: 'orders',
              targetSelector: '.workspace-viewport',
              title: 'Fulfillment & Dispatch Visibility',
              desc: 'Keep clients updated with end-to-end order tracking. Monitor warehouse picking, dispatch manifests, and invoice payment statuses in real time.',
              snippet: '🚚 Order #ORD-8921: Dispatched from DC • Est. Delivery Tomorrow 10:00 AM'
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
              snippet: '🔍 Universal Search: Over 12,000 active SKUs indexed across all categories'
            },
            {
              viewId: 'availability',
              targetSelector: '.workspace-viewport',
              title: 'Live Multi-Branch Stock Availability',
              desc: 'Instantly check whether an out-of-stock item is available at nearby sister branches or central distribution centers for customer transfer.',
              snippet: '🏬 Availability: 14 units at Main Branch • 42 units at Central DC'
            },
            {
              viewId: 'orders',
              targetSelector: '.workspace-viewport',
              title: 'Customer Orders & Click-and-Collect',
              desc: 'Track click-and-collect orders, layaways, and customer holds. Verify pickup readiness and hand goods over to customers with fast receipt verification.',
              snippet: '📋 Order Lookup: ORD-2026-904 (Ready for Collection at Customer Service)'
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
        this.addItemToCart('LAPTOP-PRO-16', 'Apex Pro 16 Laptop', 2499.00);
        this.showToast('⚡ Laser Scanner Triggered: Added 1x Apex Pro 16 Laptop (<42ms hardware buffer)!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Scanner Buffer Fired:</span> 1x LAPTOP-PRO-16 added to cart. DR 1010 Bank = CR 4010 Sales balanced!';
        }
      },

      simulateSplitTender() {
        this.showToast('💳 Split Payment Simulation: $20.00 Cash + $66.40 Card processed and balanced!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Split Payment Approved:</span> $20.00 Cash (Till change: $0.00) + $66.40 Card Auth #99142. DR 1010/1020 balanced!';
        }
      },

      simulatePickItem() {
        this.showToast('📦 Pick Verified: Item picked from Bin R-04-B2 with FEFO Lot LOT-2026-A12!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Pick Complete:</span> Item scanned from Bin R-04-B2. Pick Accuracy: 100% • Route optimized!';
        }
      },

      simulateManagerAudit() {
        this.showToast('🛡️ Till Audit Signed: Shift register balanced with $0.00 variance!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Till Audit Approved:</span> Physical Cash $450.00 = System Expected $450.00 (Zero Till Variance Verified)';
        }
      },

      simulateReconcileAccount() {
        this.showToast('📊 Bank Feed Reconciled: 14 transactions auto-matched to general ledger!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Bank Matching Succeeded:</span> 14 entries reconciled with 0 unallocated funds. GL integrity verified!';
        }
      },

      simulateDriverEpod() {
        this.showToast('✍️ ePOD Captured: Electronic proof of delivery saved with GPS and signature!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Delivery Confirmed:</span> Recipient signature captured. Drop #3 marked DELIVERED in fleet manifest.';
        }
      },

      simulateQuoteApprove() {
        this.showToast('📄 B2B Quote Generated: Tier 2 wholesale discount approved with 38% gross margin!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Quote QTE-2026-042 Ready:</span> 15% wholesale tier applied. Profit margin confirmed.';
        }
      },

      openLoginModal() {
        const navDrawer = document.getElementById('mobile-nav-drawer');
        if (navDrawer) navDrawer.style.display = 'none';
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
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
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
        this.launchWorkspace({
          tenantName: 'Sample Company Ltd',
          branchName: 'Main Branch',
          userName: 'Sample Owner',
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
        const slugEl = document.getElementById('login-slug');

        const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
        const password = passEl ? passEl.value : '';
        let slug = slugEl ? slugEl.value.trim().toLowerCase() : '';

        if (!email || !password) {
          this.showToast('Please enter your staff work email and password.');
          return;
        }

        const loginSubmitBtn = document.getElementById('btn-submit-login');
        let stopLoginLoading = () => {};
        if (loginSubmitBtn) {
          const rect = loginSubmitBtn.getBoundingClientRect();
          loginSubmitBtn.style.width = Math.max(rect.width, 160) + 'px';
          loginSubmitBtn.style.minWidth = Math.max(rect.width, 160) + 'px';
          loginSubmitBtn.style.height = Math.max(rect.height, 44) + 'px';
          const orig = loginSubmitBtn.innerHTML;
          loginSubmitBtn.disabled = true;
          loginSubmitBtn.style.pointerEvents = 'none';
          loginSubmitBtn.style.opacity = '0.9';
          loginSubmitBtn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;gap:8px;"><span class="stk-btn-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.25);border-top-color:currentColor;border-radius:50%;animation:stkSpin 0.6s linear infinite;vertical-align:middle;"></span><span style="font-weight:800;letter-spacing:0.02em;">Signing in\u2026</span></div>';
          stopLoginLoading = () => {
            loginSubmitBtn.innerHTML = orig;
            loginSubmitBtn.style.width = '';
            loginSubmitBtn.style.minWidth = '';
            loginSubmitBtn.style.height = '';
            loginSubmitBtn.style.pointerEvents = '';
            loginSubmitBtn.style.opacity = '';
            loginSubmitBtn.disabled = false;
          };
        }

        // Switch to Step 2: Searching & Verifying
        const step1 = document.getElementById('login-step-credentials');
        const step2 = document.getElementById('login-step-verification');
        const searchState = document.getElementById('login-searching-state');
        const verifiedState = document.getElementById('login-verified-state');
        const progressFill = document.getElementById('login-verify-progress-fill');

        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        if (searchState) searchState.style.display = 'block';
        if (verifiedState) verifiedState.style.display = 'none';
        if (progressFill) progressFill.style.width = '25%';

        let tenantName = 'My Organization';
        let branch = 'Primary Branch';
        let name = email ? email.split('@')[0] : 'Staff Member';
        let role = 'Business Member';
        let lastActive = 'Today • Active Session';

        const sb = getSupabase();
        if (sb) {
          try {
            if (progressFill) progressFill.style.width = '50%';
            const { data, error } = await sb.auth.signInWithPassword({
              email: email,
              password: password,
            });

            if (error) {
              if (step1) step1.style.display = 'block';
              if (step2) step2.style.display = 'none';
              stopLoginLoading();
              if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
                this.showToast('Please confirm your email address before signing in. Check your inbox.');
              } else {
                this.showToast('Sign in failed: ' + error.message);
              }
              return;
            }

            if (progressFill) progressFill.style.width = '75%';

            // Check authoritative membership and onboarding status via backend API
            if (data.session && data.session.access_token) {
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
                  role = sessData.active_tenant.role === 'owner' ? 'Business Owner (Administrator)' : (sessData.active_tenant.role || role);
                  slug = sessData.active_tenant.workspace_slug || slug || 'apex';
                  lastActive = 'Just Now • Verified';
                } else if (sessData.onboarding_status === 'ONBOARDING_REQUIRED') {
                  let pending = null;
                  try { pending = JSON.parse(localStorage.getItem('stokrova_pending_onboarding') || 'null'); } catch (_) {}
                  if (pending && pending.ownerEmail && pending.ownerEmail.toLowerCase() === email) {
                    const result = await submitOnboarding(data.session.access_token, pending, email);
                    if (result.ok) {
                      tenantName = pending.companyName;
                      branch = pending.branchName;
                      name = pending.ownerName;
                      slug = pending.slug;
                    } else {
                      window.stokrovaCustomerApp?.showToast?.(result.message);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Supabase auth flow note:', err);
          }
        }

        if (!slug) slug = 'workspace';

        if (progressFill) progressFill.style.width = '100%';

        this.verifiedStaffData = {
          tenantName: tenantName,
          branchName: branch,
          userName: name,
          userRole: role,
        };

        // Reveal verified card with green checkmarks
        setTimeout(() => {
          const compEl = document.getElementById('login-dyn-company');
          const slugEl = document.getElementById('login-dyn-slug');
          const nameEl = document.getElementById('login-dyn-name');
          const roleEl = document.getElementById('login-dyn-role');
          const lastEl = document.getElementById('login-dyn-last-active');

          if (compEl) compEl.textContent = tenantName;
          if (slugEl) slugEl.textContent = slug + '.stokrova.com';
          if (nameEl) nameEl.textContent = name;
          if (roleEl) roleEl.textContent = role;
          if (lastEl) lastEl.textContent = lastActive;

          if (searchState) searchState.style.display = 'none';
          if (verifiedState) verifiedState.style.display = 'block';

          this.showToast('✓ Workspace found & verified for ' + name);
        }, 300);
      },

      confirmLoginLaunch() {
        const confirmBtn = document.getElementById('btn-confirm-login');
        if (confirmBtn) {
          const rect = confirmBtn.getBoundingClientRect();
          confirmBtn.style.width = Math.max(rect.width, 220) + 'px';
          confirmBtn.style.minWidth = Math.max(rect.width, 220) + 'px';
          confirmBtn.style.height = Math.max(rect.height, 44) + 'px';
          confirmBtn.disabled = true;
          confirmBtn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;gap:8px;"><span class="stk-btn-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.25);border-top-color:currentColor;border-radius:50%;animation:stkSpin 0.6s linear infinite;vertical-align:middle;"></span><span style="font-weight:800;letter-spacing:0.02em;">Entering Dashboard\u2026</span></div>';
        }
        setTimeout(() => {
          this.closeLoginModal();
          const data = this.verifiedStaffData || {
            tenantName: 'My Organization',
            branchName: 'Primary Branch',
            userName: 'Staff Member',
            userRole: 'Business Member',
          };
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
            // Automatic and immediate on first login
            this.scheduleAutoTour(350, role);
          }
        }, 180);
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

      launchWorkspace({ tenantName, branchName, userName, userRole }) {
        if (sessionStorage.getItem('stokrova_tenant_suspended')) {
          let saved = null;
          try { saved = JSON.parse(sessionStorage.getItem('stokrova_tenant_suspended')); } catch (_) {}
          this.showSuspendedScreen(saved || { tenantName });
          return;
        }

        this.currentUserName = userName;
        this.currentWorkspaceRole = userRole;

        document.getElementById('customer-public-surface').style.display = 'none';
        const ws = document.getElementById('business-workspace-container');
        ws.style.display = 'flex';

        document.getElementById('ws-tenant-display').textContent = tenantName;
        document.getElementById('ws-branch-display').textContent = branchName;
        document.getElementById('ws-user-display').textContent = userName;
        document.getElementById('ws-role-display').textContent = userRole;

        const isCashier = userRole.includes('Cashier');
        const isPicker = userRole.includes('Picker') || userRole.includes('Warehouse');
        const isManager = userRole.includes('Manager');
        const isAccountant = userRole.includes('Accountant') || userRole.includes('Finance') || userRole.includes('Audit');
        const isDriver = userRole.includes('Driver') || userRole.includes('Logistics') || userRole.includes('Fleet');
        const isSales = userRole.includes('Sales') || userRole.includes('Executive');

        const allNavItems = document.querySelectorAll('.workspace-nav-item');
        allNavItems.forEach(item => {
          const vId = item.getAttribute('data-view-id');
          if (isCashier) {
            item.style.display = (vId === 'pos' || vId === 'catalog' || vId === 'orders' || vId === 'cashier-desk') ? 'flex' : 'none';
          } else if (isPicker) {
            item.style.display = (vId === 'inventory' || vId === 'picking' || vId === 'locations' || vId === 'receiving' || vId === 'dispatch') ? 'flex' : 'none';
          } else if (isAccountant) {
            item.style.display = (vId === 'ledger' || vId === 'gl' || vId === 'accountant' || vId === 'tax' || vId === 'audit' || vId === 'invoices') ? 'flex' : 'none';
          } else if (isDriver) {
            item.style.display = (vId === 'fleet' || vId === 'dispatch' || vId === 'orders') ? 'flex' : 'none';
          } else if (isSales) {
            item.style.display = (vId === 'crm' || vId === 'quotes' || vId === 'orders' || vId === 'invoices' || vId === 'catalog') ? 'flex' : 'none';
          } else if (isManager) {
            item.style.display = (vId === 'org' || vId === 'compliance') ? 'none' : 'flex';
          } else {
            // Business Owner has FULL access across all 28 views!
            item.style.display = 'flex';
          }
        });

        if (isCashier) {
          this.showWsView('pos');
        } else if (isPicker) {
          this.showWsView('picking');
        } else if (isAccountant) {
          this.showWsView('accountant');
        } else if (isDriver) {
          this.showWsView('fleet');
        } else if (isSales) {
          this.showWsView('crm');
        } else {
          this.showWsView('dashboard');
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
        document.getElementById('business-workspace-container').style.display = 'none';
        document.getElementById('customer-public-surface').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showToast('You have signed out of your STOKROVA business workspace.');
      },

      showWsView(viewId) {
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
          clearTimeout(this._toastTimer);
          this._toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
          toast.onclick = () => { toast.style.display = 'none'; };
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
        const name = document.getElementById('rebrand-company-name')?.value || 'Sample Company Ltd';
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Luxury Lifestyle & Electronics';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ APEX';

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
        const name = document.getElementById('rebrand-company-name')?.value || 'Sample Company Ltd';
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Luxury Lifestyle & Electronics';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ APEX';

        const saveBtn = document.getElementById('btn-save-rebranding');
        let stopSaveLoading = () => {};
        if (saveBtn) {
          const rect = saveBtn.getBoundingClientRect();
          saveBtn.style.width = Math.max(rect.width, 100) + 'px';
          saveBtn.style.minWidth = Math.max(rect.width, 100) + 'px';
          const orig = saveBtn.innerHTML;
          saveBtn.disabled = true;
          saveBtn.style.pointerEvents = 'none';
          saveBtn.style.opacity = '0.85';
          saveBtn.innerHTML = '<span class="stk-btn-spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.25);border-top-color:currentColor;border-radius:50%;animation:stkSpin 0.6s linear infinite;margin-right:6px;vertical-align:middle;"></span><span>Saving\u2026</span>';
          stopSaveLoading = () => {
            saveBtn.innerHTML = orig;
            saveBtn.style.width = '';
            saveBtn.style.minWidth = '';
            saveBtn.style.pointerEvents = '';
            saveBtn.style.opacity = '';
            saveBtn.disabled = false;
          };
        }

        setTimeout(() => {
          document.documentElement.style.setProperty('--primary', hex);
          document.documentElement.style.setProperty('--primary-hover', hex);
          
          const tenantDisplay = document.getElementById('ws-tenant-display');
          if (tenantDisplay) tenantDisplay.textContent = name;

          try {
            localStorage.setItem('stokrova_tenant_brand', JSON.stringify({ hex, name, slogan, logo }));
          } catch (_) {}

          stopSaveLoading();
          this.showToast('✓ Corporate rebrand saved! Brand accent (' + hex + ') & company logo updated across all staff terminals, POS registers, and mobile devices.');
        }, 300);
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

      // Staff Roster helpers
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
            <td style="padding: 12px 16px; font-weight: 600;">
              <div>\${name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">\${email}</div>
            </td>
            <td style="padding: 12px 16px;">
              <span style="background: rgba(189,150,82,0.18); color: var(--primary); border: 1px solid var(--primary); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">\${role}</span>
            </td>
            <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 0.8125rem;">\${branch}</td>
            <td style="padding: 12px 16px; text-align: center;">
              <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
            </td>
            <td style="padding: 12px 16px; text-align: right;">
              <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">PIN: \${pin}</span>
            </td>
          \`;
          tableBody.appendChild(row);
        }

        const countBadge = document.getElementById('staff-count-badge');
        if (countBadge && tableBody) {
          countBadge.textContent = \`\${tableBody.querySelectorAll('tr').length} Staff Members Active\`;
        }

        this.closeStaffInviteModal();
        this.showToast(\`✓ Staff member '\${name}' invited and added to workspace roster!\`);
      }
    };

    // Attach globals for inline events
    window.selectBrandAccent = (hex) => window.stokrovaCustomerApp.selectBrandAccent(hex);
    window.updateBrandPreview = () => window.stokrovaCustomerApp.updateBrandPreview();
    window.saveCompanyRebranding = () => window.stokrovaCustomerApp.saveCompanyRebranding();
    window.openStaffInviteModal = () => window.stokrovaCustomerApp.openStaffInviteModal();
    window.closeStaffInviteModal = () => window.stokrovaCustomerApp.closeStaffInviteModal();
    window.handleStaffInviteSubmit = (e) => window.stokrovaCustomerApp.handleStaffInviteSubmit(e);

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

    // Automatic Live Supabase Session Restoration & Onboarding Recovery
    window.addEventListener('DOMContentLoaded', async () => {
      if (sessionStorage.getItem('stokrova_tenant_suspended')) {
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('stokrova_tenant_suspended')); } catch (_) {}
        window.stokrovaCustomerApp.showSuspendedScreen(saved || {});
        return;
      }

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
              btn.onclick = () => window.stokrovaCustomerApp.launchWorkspace({
                tenantName: res.active_tenant.tenant_name,
                branchName: res.active_tenant.branch_name || 'Primary Branch',
                userName: res.user?.name || res.user?.email || 'Owner',
                userRole: res.active_tenant.role === 'owner' ? 'Business Owner (Administrator)' : (res.active_tenant.role || 'Staff'),
              });
            });
          }
        }
      } catch (_) {}

      sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session && session.access_token) {
          let pending = null;
          try { pending = JSON.parse(localStorage.getItem('stokrova_pending_onboarding') || 'null'); } catch (_) {}
          if (pending && session.user && session.user.email && pending.ownerEmail && pending.ownerEmail.toLowerCase() === session.user.email.toLowerCase()) {
            const result = await submitOnboarding(session.access_token, pending, session.user.email);
            window.stokrovaCustomerApp.showToast(result.ok ? "✓ Identity confirmed & business '" + pending.companyName + "' provisioned!" : result.message);
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
  <script type="module" src="./workspace-enhancements.js"></script>
  <script src="plan-prices-live.js"></script>
</body>
</html>
`;

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), completeWebsiteHtml.trim(), 'utf-8');
// Workspace scripts: presentation enhancements, live executive figures and live company records.
for (const file of ['workspace-enhancements.js', 'executive-metrics.js', 'executive-live.js', 'workspace-live.js', 'pos-live.js', 'tickets-live.js', 'plan-prices-live.js', 'insights-live.js', 'operations-live.js']) {
  fs.copyFileSync(path.join(__dirname, file), path.join(distDir, file));
}
console.log('✅ Generated STOKROVA Customer Website & Complete Business Portal index.html at', path.join(distDir, 'index.html'));
