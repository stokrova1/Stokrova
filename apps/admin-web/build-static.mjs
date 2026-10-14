import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AdminWebShell,
  DashboardViewModel,
  CatalogViewModel,
  InventoryViewModel,
  OrdersViewModel,
  WorkflowsStudioViewModel,
  PlatformFounderView,
} from './dist/index.js';

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

const dashboardView = new DashboardViewModel({
  grossMerchandiseValueMinor: 485000000n,
  netRevenueMinor: 382000000n,
  grossMarginBps: 3450,
  stockoutRiskIndex: 4,
  warehouseUtilizationPct: 78.5,
  openTillSessionsCount: 6,
  cashierVarianceAlertsMinor: 0n,
  activeWorkflowsRunning: 8,
  currencyCode: 'USD',
});

const catalogView = new CatalogViewModel('dark');
catalogView.addProduct({
  id: 'prod_1',
  sku: 'LAPTOP-PRO-16',
  barcode: '5011000000018',
  name: 'Apex Pro 16-inch Workstation Laptop',
  category: 'Electronics',
  attributes: { processor: 'M4 Max', ram: '64GB', storage: '2TB' },
  costPriceMinor: 120000n,
  retailPriceMinor: 249900n,
  wholesalePriceMinor: 180000n,
  stockOnHand: 40,
  isArchived: false,
});
catalogView.addProduct({
  id: 'prod_2',
  sku: 'SMARTPHONE-ULTRA-5G',
  barcode: '5011000000025',
  name: 'Apex Ultra 5G Smartphone 256GB',
  category: 'Electronics',
  attributes: { color: 'Titanium Black', storage: '256GB' },
  costPriceMinor: 45000n,
  retailPriceMinor: 99900n,
  wholesalePriceMinor: 72000n,
  stockOnHand: 85,
  isArchived: false,
});
catalogView.addProduct({
  id: 'prod_3',
  sku: 'SHIRT-OXFORD-BLU-M',
  barcode: '5012000000011',
  name: 'Royal Oxford Cotton Shirt (Blue/M)',
  category: 'Apparel',
  attributes: { color: 'Blue', size: 'M' },
  costPriceMinor: 1500n,
  retailPriceMinor: 6500n,
  wholesalePriceMinor: 3800n,
  stockOnHand: 120,
  isArchived: false,
});

const inventoryView = new InventoryViewModel('dark');
inventoryView.addLot({
  lotNumber: 'LOT-2026-MED-001',
  sku: 'MED-VACCINE-AMP',
  productName: 'Cold-Chain Sterile Vaccine 5ml Ampoule',
  binLocationCode: 'B-02-01-01',
  quantity: 500,
  expiryDateIso: '2027-01-15T00:00:00Z',
  holdStatus: 'ACTIVE',
  receivedDateIso: '2026-10-10T00:00:00Z',
});
inventoryView.addLot({
  lotNumber: 'LOT-2026-BEV-042',
  sku: 'BEV-ESPRESSO-BEANS-1KG',
  productName: 'Artisan Roast Espresso Beans 1kg Bag',
  binLocationCode: 'A-01-02-03',
  quantity: 300,
  expiryDateIso: '2026-11-20T00:00:00Z',
  holdStatus: 'ACTIVE',
  receivedDateIso: '2026-09-01T00:00:00Z',
});
inventoryView.transferStock(
  'LAPTOP-PRO-16',
  'RECEIVING-DOCK',
  'A-01-02-03',
  20,
  'usr_sam',
  'PO-2026-089 Inbound',
);
inventoryView.transferStock(
  'SHIRT-OXFORD-BLU-M',
  'A-01-02-04',
  'DISPATCH-BAY-1',
  12,
  'usr_david',
  'WAVE-LON-042 Dispatch',
);

const ordersView = new OrdersViewModel('dark');
ordersView.addSalesOrder({
  orderId: 'ord_apex_901',
  orderNumber: 'SO-2026-901',
  customerName: 'Trans-European Freight Logistics SA',
  status: 'PAID',
  totalMinor: 1440000n, // $14,400.00
  currencyCode: 'USD',
  createdAtIso: new Date(Date.now() - 7200000).toISOString(),
  lines: [
    {
      sku: 'LAPTOP-PRO-16',
      productName: 'Apex Pro 16-inch Workstation Laptop',
      quantity: 6,
      unitPriceMinor: 180000n,
      lineTotalMinor: 1080000n,
    },
    {
      sku: 'SMARTPHONE-ULTRA-5G',
      productName: 'Apex Ultra 5G Smartphone 256GB',
      quantity: 5,
      unitPriceMinor: 72000n,
      lineTotalMinor: 360000n,
    },
  ],
});
ordersView.addSalesOrder({
  orderId: 'ord_apex_902',
  orderNumber: 'POS-LON-8812',
  customerName: 'Walk-in Retail Customer',
  status: 'DISPATCHED',
  totalMinor: 314900n, // $3,149.00
  currencyCode: 'USD',
  createdAtIso: new Date(Date.now() - 2400000).toISOString(),
  lines: [
    {
      sku: 'LAPTOP-PRO-16',
      productName: 'Apex Pro 16-inch Workstation Laptop',
      quantity: 1,
      unitPriceMinor: 249900n,
      lineTotalMinor: 249900n,
    },
    {
      sku: 'SHIRT-OXFORD-BLU-M',
      productName: 'Royal Oxford Cotton Shirt (Blue/M)',
      quantity: 10,
      unitPriceMinor: 6500n,
      lineTotalMinor: 65000n,
    },
  ],
});

const workflowsView = new WorkflowsStudioViewModel('dark');
workflowsView.addNode({
  id: 'node_trigger',
  label: 'Wholesale Order Placed',
  type: 'TRIGGER',
  description: 'Triggers on SO creation with terms > 15 days',
  config: { event: 'ORDER_PLACED' },
  position: { x: 40, y: 160 },
});
workflowsView.addNode({
  id: 'node_condition',
  label: 'Credit Limit Check',
  type: 'CONDITION',
  description: 'Checks balance against $500k credit limit',
  config: { rule: 'AR_WITHIN_LIMIT' },
  position: { x: 260, y: 160 },
});
workflowsView.addNode({
  id: 'node_action',
  label: 'Allocate Warehouse Stock',
  type: 'ACTION',
  description: 'Reserves serial units in double-entry ledger',
  config: { service: 'StockLedger' },
  position: { x: 480, y: 160 },
});
workflowsView.addEdge({
  id: 'edge_1',
  sourceNodeId: 'node_trigger',
  targetNodeId: 'node_condition',
  conditionLabel: 'Amount > $5k',
});
workflowsView.addEdge({
  id: 'edge_2',
  sourceNodeId: 'node_condition',
  targetNodeId: 'node_action',
  conditionLabel: 'Credit OK',
});

// 2. Render View HTML Blocks
const founderHtml = founderView.renderPlatformFounderPortalHtml();
const dashboardHtml = dashboardView.renderDashboardHtml();
const catalogHtml = catalogView.renderCatalogTableHtml();
const inventoryHtml = inventoryView.renderFefoExplorerHtml();
const ordersHtml = ordersView.renderPipelineHtml();
const workflowsHtml = workflowsView.renderStudioGraphHtml();

// 3. Assemble Complete Interactive Application HTML
const completeAppHtml = `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — Platform Founder & Enterprise Operations</title>
  <link rel="icon" type="image/png" href="https://assets.stokrova.com/icon-32.png" />
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
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
      width: 250px;
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
          🏢 Business Operations Console
        </div>
      </div>
    </div>

    <div class="persona-selector">
      <span style="color: var(--text-muted); font-size: 0.75rem;">Simulated Active Persona:</span>
      <select id="persona-select" class="persona-select" onchange="window.stokrovaApp.handlePersonaChange(this.value)">
        <option value="FOUNDER">👑 Platform Founder (Global Super-Admin)</option>
        <option value="OWNER">🏢 Business Owner (Victoria Sterling - Apex Global)</option>
        <option value="MANAGER">🏪 Store Manager (David O'Connor - London Branch)</option>
        <option value="CASHIER">💳 Head Cashier (Emma Watson - POS Terminal)</option>
        <option value="PICKER">📦 Warehouse Operator (Samuel Adebayo - Wave Picking)</option>
      </select>
    </div>
  </div>

  <!-- Main App Shell -->
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
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

      <div id="sidebar-business-menu" style="display: none;">
        <div class="sidebar-section-title" id="business-sidebar-title">Apex Global Operations</div>
        <div class="nav-item" id="nav-dashboard" onclick="window.stokrovaApp.showView('dashboard')">
          <span>📊 Executive Dashboard</span>
        </div>
        <div class="nav-item" id="nav-catalog" onclick="window.stokrovaApp.showView('catalog')">
          <span>🏷️ Products & Catalog</span>
        </div>
        <div class="nav-item" id="nav-inventory" onclick="window.stokrovaApp.showView('inventory')">
          <span>📦 Stock Ledger & FEFO</span>
        </div>
        <div class="nav-item" id="nav-orders" onclick="window.stokrovaApp.showView('orders')">
          <span>🛍️ Sales Orders Pipeline</span>
        </div>
        <div class="nav-item" id="nav-workflows" onclick="window.stokrovaApp.showView('workflows')">
          <span>⚙️ DAG Workflows Studio</span>
        </div>
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

      <!-- 2. Business Dashboard View -->
      <div id="view-dashboard" class="view-panel">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0 0 4px 0; font-size: 1.6rem; color: var(--text-primary);">Executive Operations Command Center</h1>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">Apex Global Retail & Logistics Ltd • London Flagship</p>
          </div>
          <button onclick="window.stokrovaApp.switchMode('FOUNDER')" style="padding: 6px 14px; border-radius: 6px; background: var(--surface); color: var(--text-primary); border: 1px solid var(--borderStrong); font-size: 0.75rem; font-weight: 600; cursor: pointer;">
            ← Back to Platform Founder Console
          </button>
        </div>
        ${dashboardHtml}
      </div>

      <!-- 3. Catalog View -->
      <div id="view-catalog" class="view-panel">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0 0 4px 0; font-size: 1.6rem; color: var(--text-primary);">Products Catalog & Variant Matrix</h1>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">Central item master, serial tracking, and attribute dimensions</p>
          </div>
        </div>
        ${catalogHtml}
      </div>

      <!-- 4. Inventory Ledger View -->
      <div id="view-inventory" class="view-panel">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0 0 4px 0; font-size: 1.6rem; color: var(--text-primary);">Authoritative FEFO Inventory & Lot Explorer</h1>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">Immutable audit trail of all warehouse lots, quarantine holds, and expiration dates</p>
          </div>
        </div>
        ${inventoryHtml}
      </div>

      <!-- 5. Orders Pipeline View -->
      <div id="view-orders" class="view-panel">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0 0 4px 0; font-size: 1.6rem; color: var(--text-primary);">Omnichannel Sales Orders Pipeline</h1>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">Real-time status progression from Draft to Dispatched</p>
          </div>
        </div>
        ${ordersHtml}
      </div>

      <!-- 6. Workflows Studio View -->
      <div id="view-workflows" class="view-panel">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0 0 4px 0; font-size: 1.6rem; color: var(--text-primary);">Visual DAG Workflows Engine</h1>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">Orchestrates business processes with strict cycle detection (Kahn's algorithm)</p>
          </div>
        </div>
        ${workflowsHtml}
      </div>
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
        document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
        const targetView = document.getElementById('view-' + viewId);
        if (targetView) targetView.classList.add('active');

        // Update nav items active state
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.getElementById('nav-' + viewId);
        if (activeNav) activeNav.classList.add('active');
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
        const title = document.getElementById('business-sidebar-title');
        const navDashboard = document.getElementById('nav-dashboard');
        const navCatalog = document.getElementById('nav-catalog');
        const navInventory = document.getElementById('nav-inventory');
        const navOrders = document.getElementById('nav-orders');
        const navWorkflows = document.getElementById('nav-workflows');

        if (persona === 'FOUNDER') {
          this.switchMode('FOUNDER');
          this.showToast('Switched to Platform Founder (Global Super-Admin)');
        } else if (persona === 'OWNER') {
          this.switchMode('BUSINESS');
          if (title) title.textContent = 'Apex Global Executive';
          [navDashboard, navCatalog, navInventory, navOrders, navWorkflows].forEach(el => el && (el.style.display = 'flex'));
          this.showToast('Active Persona: Victoria Sterling (Executive Admin)');
        } else if (persona === 'MANAGER') {
          this.switchMode('BUSINESS');
          if (title) title.textContent = 'London Flagship (Manager)';
          if (navDashboard) navDashboard.style.display = 'flex';
          if (navCatalog) navCatalog.style.display = 'flex';
          if (navOrders) navOrders.style.display = 'flex';
          if (navInventory) navInventory.style.display = 'flex';
          if (navWorkflows) navWorkflows.style.display = 'none'; // Managers cannot edit DAG workflows
          this.showToast('Active Persona: David O\\'Connor (Store Manager)');
        } else if (persona === 'CASHIER') {
          this.switchMode('BUSINESS');
          if (title) title.textContent = 'London POS Till (Cashier)';
          if (navDashboard) navDashboard.style.display = 'none';
          if (navCatalog) navCatalog.style.display = 'flex'; // view catalog
          if (navOrders) navOrders.style.display = 'flex'; // view orders
          if (navInventory) navInventory.style.display = 'none'; // restricted
          if (navWorkflows) navWorkflows.style.display = 'none';
          this.showView('orders');
          this.showToast('Active Persona: Emma Watson (Cashier - POS Only)');
        } else if (persona === 'PICKER') {
          this.switchMode('BUSINESS');
          if (title) title.textContent = 'Amsterdam DC (Warehouse)';
          if (navDashboard) navDashboard.style.display = 'none';
          if (navCatalog) navCatalog.style.display = 'none';
          if (navOrders) navOrders.style.display = 'none';
          if (navInventory) navInventory.style.display = 'flex'; // bin movements only
          if (navWorkflows) navWorkflows.style.display = 'none';
          this.showView('inventory');
          this.showToast('Active Persona: Samuel Adebayo (Warehouse Picker)');
        }
      },

      showToast(msg) {
        const toast = document.getElementById('toast-notification');
        const toastMsg = document.getElementById('toast-message');
        if (toast && toastMsg) {
          toastMsg.textContent = msg;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }
      }
    };

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
console.log('✅ Generated STOKROVA Interactive Platform Founder & Business Console index.html at', path.join(distDir, 'index.html'));
