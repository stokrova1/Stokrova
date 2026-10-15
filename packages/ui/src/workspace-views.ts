/**
 * STOKROVA Workspace Views & Master Navigation Engine
 * Pure TypeScript UI rendering engine providing comprehensive, interactive,
 * high-density views for all 12 platform domains, 8 master sections, and 28+ modules.
 * WCAG AAA compliant, zero runtime dependencies, strictly typed.
 */

import { themeTokens, brandColors, semanticTokens } from './tokens.js';

export interface WorkspaceSidebarOptions {
  activeViewId?: string;
  userRole?: string;
  tenantName?: string;
  branchName?: string;
  theme?: 'light' | 'dark';
  onItemClickFnName?: string; // e.g. "window.stokrovaCustomerApp.showWsView" or "window.stokrovaApp.showView"
}

export interface WorkspaceViewsOptions {
  theme?: 'light' | 'dark';
  tenantName?: string;
  branchName?: string;
  currencyCode?: string;
  onActionToastFnName?: string; // e.g. "window.stokrovaCustomerApp.showToast" or "window.stokrovaApp.showToast"
  isDemo?: boolean;
}

/**
 * Returns the mapping of navigation item ID to view key.
 */
export function getViewIdFromNavId(navId: string): string {
  const map: Record<string, string> = {
    nav_pos: 'pos',
    nav_orders: 'orders',
    nav_invoices: 'invoices',
    nav_quotes: 'quotes',
    nav_crm: 'crm',
    nav_catalog: 'catalog',
    nav_ledger: 'ledger',
    nav_locations: 'locations',
    nav_availability: 'availability',
    nav_suppliers: 'suppliers',
    nav_po: 'po',
    nav_receiving: 'receiving',
    nav_picking: 'picking',
    nav_dispatch: 'dispatch',
    nav_fleet: 'fleet',
    nav_bom: 'bom',
    nav_mo: 'mo',
    nav_registers: 'registers',
    nav_gl: 'gl',
    nav_accountant: 'accountant',
    nav_cashier_desk: 'cashier-desk',
    nav_tax: 'tax',
    nav_dashboards: 'dashboard',
    nav_abc: 'abc',
    nav_audit: 'audit',
    nav_compliance: 'compliance',
    nav_org: 'org',
    nav_rebranding: 'rebranding',
    nav_rbac: 'rbac',
    nav_devices: 'devices',
    nav_integrations: 'integrations',
    nav_workflows: 'workflows',
  };
  return map[navId] || navId.replace('nav_', '');
}

/**
 * Friendly emoji icons for each navigation module
 */
export const MODULE_EMOJIS: Record<string, string> = {
  nav_pos: '💳',
  nav_orders: '🛍️',
  nav_invoices: '🧾',
  nav_quotes: '📑',
  nav_crm: '👥',
  nav_catalog: '🏷️',
  nav_ledger: '📦',
  nav_locations: '📍',
  nav_availability: '🗃️',
  nav_suppliers: '🚚',
  nav_po: '📋',
  nav_receiving: '☑️',
  nav_picking: '📦',
  nav_dispatch: '📤',
  nav_fleet: '🧭',
  nav_bom: '⚙️',
  nav_mo: '🏭',
  nav_registers: '💵',
  nav_gl: '⚖️',
  nav_accountant: '⚖️',
  nav_cashier_desk: '🧾',
  nav_tax: '🧾',
  nav_dashboards: '📊',
  nav_abc: '📈',
  nav_audit: '🛡️',
  nav_compliance: '🔒',
  nav_org: '🏛️',
  nav_rebranding: '🎨',
  nav_rbac: '👤',
  nav_devices: '🖨️',
  nav_integrations: '🔌',
  nav_workflows: '🔀',
};

/**
 * Renders the complete, grouped, high-density Master Navigation Sidebar.
 */
export function renderMasterSidebarHtml(options: WorkspaceSidebarOptions = {}): string {
  const theme = options.theme || 'dark';
  const tokens = themeTokens[theme];
  const isDark = theme === 'dark';
  const activeViewId = options.activeViewId || 'dashboard';
  const clickFn = options.onItemClickFnName || 'window.stokrovaCustomerApp.showWsView';

  // 9 Canonical Domain Groupings (Overview, Sell, Stock, Buy, Move, Make, Money, Control, Settings)
  const domainSections = [
    {
      id: 'overview',
      title: 'Overview',
      items: [
        { id: 'nav_dashboards', label: 'Executive Command Center', path: '/analytics/dashboards', icon: 'bar-chart-2', shortcut: 'D' },
        { id: 'nav_abc', label: 'ABC Velocity & Dead Stock', path: '/analytics/inventory', icon: 'pie-chart' },
      ],
    },
    {
      id: 'commerce',
      title: 'Sell',
      items: [
        { id: 'nav_pos', label: 'Point of Sale (POS)', path: '/pos', icon: 'calculator', shortcut: 'F1' },
        { id: 'nav_cashier_desk', label: 'Cashier Shift & Terminal Desk', path: '/pos/cashier-desk', icon: 'clipboard' },
        { id: 'nav_orders', label: 'Sales Orders', path: '/orders', icon: 'shopping-bag', shortcut: 'O' },
        { id: 'nav_invoices', label: 'Invoices & Payments', path: '/invoices', icon: 'credit-card', shortcut: 'I' },
        { id: 'nav_quotes', label: 'Quotations & B2B', path: '/quotes', icon: 'file-text' },
        { id: 'nav_crm', label: 'CRM & Accounts', path: '/crm', icon: 'users', shortcut: 'C' },
        { id: 'nav_pricing', label: 'Price Lists & Contracts', path: '/pricing/price-lists', icon: 'dollar-sign' },
        { id: 'nav_promotions', label: 'Promotions & Coupons', path: '/pricing/promotions', icon: 'percent' },
        { id: 'nav_loyalty', label: 'Loyalty Rewards', path: '/loyalty', icon: 'gift' },
      ],
    },
    {
      id: 'inventory',
      title: 'Stock',
      items: [
        { id: 'nav_catalog', label: 'Products & Variants', path: '/catalog/products', icon: 'tag', shortcut: 'P' },
        { id: 'nav_ledger', label: 'Stock Movement Ledger', path: '/inventory/ledger', icon: 'layers', shortcut: 'M' },
        { id: 'nav_locations', label: 'Warehouses & 8-Tier Bins', path: '/inventory/locations', icon: 'map-pin' },
        { id: 'nav_availability', label: 'Stock Availability Engine', path: '/inventory/availability', icon: 'box' },
      ],
    },
    {
      id: 'procurement',
      title: 'Buy',
      items: [
        { id: 'nav_suppliers', label: 'Suppliers & Catalogs', path: '/procurement/suppliers', icon: 'truck' },
        { id: 'nav_po', label: 'Purchase Orders (PO)', path: '/procurement/orders', icon: 'clipboard' },
        { id: 'nav_receiving', label: 'Goods Receipt & 3-Way Match', path: '/procurement/receiving', icon: 'check-square' },
      ],
    },
    {
      id: 'logistics',
      title: 'Move',
      items: [
        { id: 'nav_picking', label: 'Wave & Zone Picking', path: '/logistics/picking', icon: 'package' },
        { id: 'nav_dispatch', label: 'Containerization & BOL', path: '/logistics/dispatch', icon: 'send' },
        { id: 'nav_fleet', label: 'Fleet & Proof of Delivery', path: '/logistics/fleet', icon: 'navigation' },
      ],
    },
    {
      id: 'manufacturing',
      title: 'Make',
      items: [
        { id: 'nav_bom', label: 'Bills of Materials (BOM)', path: '/manufacturing/boms', icon: 'cpu' },
        { id: 'nav_mo', label: 'Production Work Orders', path: '/manufacturing/orders', icon: 'activity' },
      ],
    },
    {
      id: 'finance',
      title: 'Money',
      items: [
        { id: 'nav_accountant', label: 'Accountant Desk & Reconciliations', path: '/finance/accountant', icon: 'award' },
        { id: 'nav_registers', label: 'Till Sessions & Cash Count', path: '/registers', icon: 'dollar-sign', shortcut: 'R' },
        { id: 'nav_gl', label: 'Double-Entry General Ledger', path: '/finance/ledger', icon: 'book' },
        { id: 'nav_tax', label: 'Fiscal E-Invoicing & Taxes', path: '/finance/tax', icon: 'percent' },
        { id: 'nav_treasury', label: 'Treasury & Bank Feeds', path: '/finance/treasury', icon: 'briefcase' },
        { id: 'nav_consolidation', label: 'Multi-Entity Consolidation', path: '/finance/consolidation', icon: 'globe' },
      ],
    },
    {
      id: 'intelligence',
      title: 'Control',
      items: [
        { id: 'nav_audit', label: 'Audit Forensics & Merkle Ledger', path: '/audit/forensics', icon: 'shield', shortcut: 'S' },
        { id: 'nav_compliance', label: 'GDPR & SOX 404 Compliance', path: '/compliance', icon: 'lock' },
        { id: 'nav_workflows', label: 'DAG Workflows Studio', path: '/workflows', icon: 'git-branch', shortcut: 'W' },
      ],
    },
    {
      id: 'settings',
      title: 'Settings',
      items: [
        { id: 'nav_org', label: 'Organization Topology', path: '/settings/organization', icon: 'briefcase' },
        { id: 'nav_rebranding', label: 'Rebranding & Theme', path: '/settings/rebranding', icon: 'palette' },
        { id: 'nav_rbac', label: 'Roles & Staff', path: '/settings/roles', icon: 'user-check' },
        { id: 'nav_devices', label: 'Hardware Peripherals', path: '/settings/devices', icon: 'printer' },
        { id: 'nav_integrations', label: 'Webhooks & EDI', path: '/settings/integrations', icon: 'git-pull-request' },
      ],
    },
  ];

  const sectionsHtml = domainSections
    .map((sec) => {
      const itemsHtml = sec.items
        .map((item) => {
          const viewId = getViewIdFromNavId(item.id);
          const isActive = viewId === activeViewId;
          const emoji = MODULE_EMOJIS[item.id] || '◆';
          const shortcutHtml = item.shortcut
            ? `<kbd style="border: 1px solid ${tokens.borderStrong}; background: ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}; padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono, monospace);">${item.shortcut}</kbd>`
            : '';

          // Exact official design system active/inactive styling
          const activeStyle = isDark
            ? `background: rgba(189,150,82,0.15); color: #E0CB9F; font-weight: 600; border-left: 3px solid #BD9652;`
            : `background: #FDFBF7; color: #85642D; font-weight: 600; border-left: 3px solid #BD9652;`;

          const inactiveStyle = isDark
            ? `color: #ACB8C3; font-weight: 500; border-left: 3px solid transparent;`
            : `color: #586A78; font-weight: 500; border-left: 3px solid transparent;`;

          return `
            <div id="ws-nav-${viewId}" class="workspace-nav-item ${isActive ? 'active' : ''}" data-view-id="${viewId}" data-nav-id="${item.id}" onclick="${clickFn}('${viewId}')" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; margin: 1px 4px; border-radius: 6px; font-size: 0.8125rem; cursor: pointer; text-decoration: none; transition: all 0.12s ease; ${isActive ? activeStyle : inactiveStyle}">
              <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="font-size: 0.95rem; line-height: 1;">${emoji}</span>
                <span class="nav-label" style="overflow: hidden; text-overflow: ellipsis;">${item.label}</span>
              </div>
              ${shortcutHtml}
            </div>
          `.trim();
        })
        .join('\n');

      return `
        <div class="workspace-nav-section" id="ws-sec-${sec.id}" style="margin-bottom: 10px;">
          <div style="padding: 6px 12px 3px 12px; font-size: 11px; font-weight: 700; color: ${tokens.textMuted}; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; justify-content: space-between;">
            <span>${sec.title}</span>
            <span style="font-size: 0.65rem; color: ${tokens.borderStrong}; font-family: monospace;">${sec.items.length}</span>
          </div>
          <div class="section-items-list">${itemsHtml}</div>
        </div>
      `.trim();
    })
    .join('\n');

  return `
    <aside class="workspace-sidebar" style="width: 272px; min-width: 272px; background: ${tokens.surface}; border-right: 1px solid ${tokens.border}; padding: 10px 4px; display: flex; flex-direction: column; overflow-y: auto; height: 100%; box-sizing: border-box;">
      <div class="sidebar-scrollable" style="flex: 1; overflow-y: auto; overflow-x: hidden;">
        ${sectionsHtml}
      </div>
      <div class="sidebar-footer" style="margin-top: auto; padding: 12px 14px; border-top: 1px solid ${tokens.border}; font-size: 0.75rem; color: ${tokens.textMuted}; display: flex; flex-direction: column; gap: 4px; background: ${tokens.surface};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Tenant Scope:</span>
          <span style="color: ${tokens.textPrimary}; font-weight: 600;">${options.tenantName || 'Organization Workspace'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Branch:</span>
          <span style="color: ${isDark ? '#E0CB9F' : '#85642D'}; font-weight: 600;">${options.branchName || 'Primary Branch'}</span>
        </div>
        <div style="font-size: 0.6875rem; color: #16A34A; margin-top: 2px; font-weight: 600;">● Tenant Isolation Active</div>
      </div>
    </aside>
  `.trim();
}

/**
 * Generates all 28 view panels + DAG workflows with realistic, high-density operational data.
 */
export function renderAllWorkspaceViewsHtml(options: WorkspaceViewsOptions = {}): string {
  const theme = options.theme || 'dark';
  const isDark = theme === 'dark';
  const goldText = isDark ? '#E0CB9F' : '#85642D';
  const tokens = themeTokens[theme];
  const st = semanticTokens;
  const toastFn = options.onActionToastFnName || 'window.stokrovaCustomerApp.showToast';
  const tenantName = options.tenantName || 'Organization Workspace';
  const branchName = options.branchName || 'Primary Branch';
  const isDemo = options.isDemo !== false;

  const gmvDisplay = isDemo ? '$4,850,000.00' : '$0.00';
  const gmvTrend = isDemo ? '▲ +18.4% vs last month' : 'No prior comparison data';
  const netRevenueDisplay = isDemo ? '$382,000.00' : '$0.00';
  const marginDisplay = isDemo ? 'Gross Margin: <strong>38.50%</strong> (3850 bps)' : 'Gross Margin: <strong>0.00%</strong> (0 bps)';
  const stockoutDisplay = isDemo ? '4 / 100' : '0 / 100';
  const warehouseDisplay = isDemo ? 'Warehouse Utilization: <strong>78.5%</strong>' : 'Warehouse Utilization: <strong>0.0%</strong>';
  const varianceDisplay = isDemo ? '$0.00' : '$0.00';
  const tillSessionsDisplay = isDemo ? '<strong>6 Active Till Sessions</strong> across 3 stores' : '<strong>0 Active Till Sessions</strong>';

  const velocityChartHtml = isDemo ? `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 4px;">
                <span>Store POS Walk-in Counters ($184,200.00)</span>
                <span style="font-weight: 700; color: ${tokens.textPrimary};">48.2%</span>
              </div>
              <div style="height: 10px; background: rgba(255,255,255,0.06); border-radius: 9999px; overflow: hidden;">
                <div style="height: 100%; width: 48.2%; background: ${brandColors.gold[500]};"></div>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 4px;">
                <span>Wholesale & B2B Invoiced ($141,800.00)</span>
                <span style="font-weight: 700; color: ${tokens.textPrimary};">37.1%</span>
              </div>
              <div style="height: 10px; background: rgba(255,255,255,0.06); border-radius: 9999px; overflow: hidden;">
                <div style="height: 100%; width: 37.1%; background: #3B82F6;"></div>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 4px;">
                <span>Mobile Field Scanning & Online ($56,000.00)</span>
                <span style="font-weight: 700; color: ${tokens.textPrimary};">14.7%</span>
              </div>
              <div style="height: 10px; background: rgba(255,255,255,0.06); border-radius: 9999px; overflow: hidden;">
                <div style="height: 100%; width: 14.7%; background: #10B981;"></div>
              </div>
            </div>
          </div>
  ` : `
          <div style="height: 140px; display: flex; align-items: center; justify-content: center; border: 1px dashed ${tokens.borderStrong}; border-radius: 6px; color: ${tokens.textMuted}; font-size: 0.8125rem; text-align: center; padding: 16px;">
            No transaction velocity recorded yet. Run POS sales or dispatch orders to visualize revenue streams.
          </div>
  `;

  const alertsPanelHtml = isDemo ? `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="border-left: 3px solid #3B82F6; background: ${tokens.cardHover}; padding: 10px; border-radius: 4px;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #3B82F6;">INFO: Inter-Branch Transfer</div>
              <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; margin-top: 2px;">TR-LON-BIR-042 dispatched to Birmingham DC (20 units in-transit).</div>
            </div>
            <div style="border-left: 3px solid #F59E0B; background: ${tokens.cardHover}; padding: 10px; border-radius: 4px;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #F59E0B;">WARNING: Discount Override</div>
              <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; margin-top: 2px;">B2B Quote QT-2026-042 requested 14% discount (exceeds 10% manager threshold).</div>
            </div>
            <div style="border-left: 3px solid #10B981; background: ${tokens.cardHover}; padding: 10px; border-radius: 4px;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #10B981;">SUCCESS: Daily Register Reconciled</div>
              <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; margin-top: 2px;">All London store tills balanced with 0 float discrepancies.</div>
            </div>
          </div>
  ` : `
          <div style="padding: 24px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem;">
            ✓ All systems operational. Zero critical exceptions or alerts.
          </div>
  `;

  return `
    <!-- ========================================== -->
    <!-- 1. EXECUTIVE DASHBOARD (/analytics/dashboards) -->
    <!-- ========================================== -->
    <div id="ws-view-dashboard" class="ws-view-content" style="display: block;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.6rem; color: ${tokens.textPrimary}; font-weight: 800;">Executive Operations Command Center</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Consolidated cross-branch telemetry, live margins, inventory velocity, and cashier variance.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <span style="background: rgba(189,150,82,0.12); border: 1px solid ${brandColors.gold[500]}; color: ${brandColors.gold[400]}; padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
            🏢 ${tenantName} (All Branches)
          </span>
          <button onclick="window.stokrovaApp?.exportExecutiveBriefing ? window.stokrovaApp.exportExecutiveBriefing(this) : ${toastFn}('Exporting executive board analytics as sanitized CSV / PDF...')" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; padding: 6px 14px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
            📥 Export Report
          </button>
        </div>
      </div>

      <!-- Top 4 Executive KPI Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Gross Merchandise Value (GMV)</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono); margin-top: 6px;">${gmvDisplay}</div>
          <div style="font-size: 0.75rem; color: ${st.success[theme].text}; margin-top: 4px;">${gmvTrend}</div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Today's Net Revenue</div>
          <div class="stokrova-net-revenue" style="font-size: 1.8rem; font-weight: 800; color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono); margin-top: 6px;">${netRevenueDisplay}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">${marginDisplay}</div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Stockout Risk Index</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #4ADE80; font-family: var(--stokrova-font-mono); margin-top: 6px;">${stockoutDisplay}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">${warehouseDisplay}</div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Till Cashier Variance</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #4ADE80; font-family: var(--stokrova-font-mono); margin-top: 6px;">${varianceDisplay}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">${tillSessionsDisplay}</div>
        </div>
      </div>

      <!-- Velocity Graph & Operational Alerts Panel -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 1rem; color: ${tokens.textPrimary};">Multi-Channel Revenue Velocity</h3>
            <span style="font-size: 0.75rem; color: ${tokens.textMuted};">Throughput Streams</span>
          </div>
          ${velocityChartHtml}
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: ${tokens.textPrimary};">Live Operational Alerts</h3>
          ${alertsPanelHtml}
        </div>
      </div>

      <!-- Capital Efficiency Intelligence -->
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: ${tokens.textPrimary};">Working Capital & Inventory Efficiency</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Inventory Turnover Ratio (ITR)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">${isDemo ? '8.4x / year' : '0.0x / year'}</div>
          </div>
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Days Inventory Outstanding (DIO)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">${isDemo ? '43.4 Days' : '0.0 Days'}</div>
          </div>
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">GMROI (Gross Margin Return)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin-top: 4px;">${isDemo ? '285%' : '0.00%'}</div>
          </div>
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Tied-Up Working Capital</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${brandColors.gold[400]}; margin-top: 4px;">${isDemo ? '$1,240,000.00' : '$0.00'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 2. POINT OF SALE (/pos) -->
    <!-- ========================================== -->
    <div id="ws-view-pos" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">High-Speed POS Register (Till 01)</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Acoustic barcode feedback, rapid tender, and offline-first queue synchronization.</p>
        </div>
        <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid #1E4620; padding: 6px 14px; border-radius: 6px; font-size: 0.8125rem; color: #4ADE80; font-weight: 600;">
          ● Shift Float: $250.00 Active
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: ${tokens.textPrimary};">Barcode Scanner & Quick Ringing</h3>
          <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <input id="pos-barcode-input" type="text" placeholder="Scan barcode (5011...) or type SKU..." style="flex: 1; padding: 10px 12px; background: ${tokens.background}; border: 1px solid ${tokens.border}; border-radius: 6px; color: ${tokens.textPrimary}; font-size: 0.875rem;" onkeydown="if(event.key==='Enter') (window.stokrovaCustomerApp || window.stokrovaApp).addBarcodeToCart()" />
            <button type="button" onclick="(window.stokrovaCustomerApp || window.stokrovaApp).addBarcodeToCart()" style="padding: 10px 18px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Scan SKU</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button type="button" onclick="(window.stokrovaCustomerApp || window.stokrovaApp).addItemToCart('LAPTOP-PRO-16', 'Pro 16 Workstation Laptop', 2499.00)" style="padding: 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; text-align: left; cursor: pointer; color: ${tokens.textPrimary};">
              <div style="font-weight: 700; font-size: 0.875rem;">Pro 16 Workstation Laptop</div>
              <div style="color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; margin-top: 4px;">$2,499.00</div>
            </button>
            <button type="button" onclick="(window.stokrovaCustomerApp || window.stokrovaApp).addItemToCart('SMARTPHONE-ULTRA-5G', 'Ultra 5G Smartphone 256GB', 999.00)" style="padding: 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; text-align: left; cursor: pointer; color: ${tokens.textPrimary};">
              <div style="font-weight: 700; font-size: 0.875rem;">Ultra 5G Smartphone 256GB</div>
              <div style="color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; margin-top: 4px;">$999.00</div>
            </button>
            <button type="button" onclick="(window.stokrovaCustomerApp || window.stokrovaApp).addItemToCart('SHIRT-OXFORD-BLU-M', 'Oxford Cotton Shirt', 65.00)" style="padding: 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; text-align: left; cursor: pointer; color: ${tokens.textPrimary};">
              <div style="font-weight: 700; font-size: 0.875rem;">Oxford Cotton Shirt</div>
              <div style="color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; margin-top: 4px;">$65.00</div>
            </button>
          </div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; display: flex; flex-direction: column;">
          <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: ${tokens.textPrimary};">Current Register Ticket</h3>
          <div id="pos-cart-items" style="flex: 1; min-height: 140px; border-bottom: 1px solid ${tokens.border}; margin-bottom: 14px; font-size: 0.875rem;">
            <div style="color: ${tokens.textMuted}; text-align: center; padding: 40px 0;">Till ticket is empty. Scan an item to ring up sale.</div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 1.125rem; font-weight: 800; margin-bottom: 16px;">
            <span>TOTAL DUE:</span>
            <span id="pos-cart-total" style="color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono);">$0.00</span>
          </div>

          <button id="pos-checkout-btn" disabled onclick="(window.stokrovaCustomerApp || window.stokrovaApp).completeSale()" style="width: 100%; padding: 12px; background: ${tokens.border}; color: ${tokens.textMuted}; border: none; border-radius: 6px; font-weight: 700; font-size: 0.9375rem; cursor: not-allowed; transition: all 0.15s ease;">
            Complete Sale & Post to Ledger
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 3. SALES ORDERS PIPELINE (/orders) -->
    <!-- ========================================== -->
    <div id="ws-view-orders" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Omnichannel Sales Orders Pipeline</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Tracking order progression: Draft → Approved → Picked → Packed → Invoiced → Paid → Dispatched.</p>
        </div>
        <button onclick="${toastFn}('Creating new wholesale sales order draft...')" style="padding: 8px 16px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          + New Sales Order
        </button>
      </div>

      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead style="background: rgba(255,255,255,0.03); border-bottom: 1px solid ${tokens.border}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.75rem;">
            <tr>
              <th style="padding: 12px 16px; text-align: left;">Order #</th>
              <th style="padding: 12px 16px; text-align: left;">Customer</th>
              <th style="padding: 12px 16px; text-align: left;">Channel</th>
              <th style="padding: 12px 16px; text-align: left;">Status</th>
              <th style="padding: 12px 16px; text-align: right;">Total Amount</th>
              <th style="padding: 12px 16px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${isDemo ? `
            <tr style="border-bottom: 1px solid ${tokens.border};">
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">SO-2026-901</td>
              <td style="padding: 14px 16px;">Trans-European Freight Logistics SA</td>
              <td style="padding: 14px 16px;">Wholesale B2B</td>
              <td style="padding: 14px 16px;"><span style="background: #14291F; color: #4ADE80; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">PAID</span></td>
              <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$14,400.00</td>
              <td style="padding: 14px 16px; text-align: right;"><button onclick="${toastFn}('Generating packing slip for SO-2026-901...')" style="padding: 4px 10px; background: transparent; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Packing Slip</button></td>
            </tr>
            <tr style="border-bottom: 1px solid ${tokens.border};">
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">POS-LON-8812</td>
              <td style="padding: 14px 16px;">Walk-in Retail Customer</td>
              <td style="padding: 14px 16px;">${branchName} POS</td>
              <td style="padding: 14px 16px;"><span style="background: #1E293B; color: #94A3B8; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">DISPATCHED</span></td>
              <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$3,149.00</td>
              <td style="padding: 14px 16px; text-align: right;"><button onclick="${toastFn}('Reprinting thermal receipt for POS-LON-8812...')" style="padding: 4px 10px; background: transparent; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Receipt</button></td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">SO-2026-903</td>
              <td style="padding: 14px 16px;">Metro Department Stores PLC</td>
              <td style="padding: 14px 16px;">Direct Contract</td>
              <td style="padding: 14px 16px;"><span style="background: rgba(189,150,82,0.18); color: ${brandColors.gold[400]}; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">APPROVED</span></td>
              <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$28,900.00</td>
              <td style="padding: 14px 16px; text-align: right;"><button onclick="${toastFn}('Releasing wave pick for SO-2026-903...')" style="padding: 4px 10px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Pick Wave</button></td>
            </tr>
            ` : `
            <tr>
              <td colspan="6" style="padding: 36px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem;">
                No sales orders recorded yet. Omnichannel customer orders will appear here.
              </td>
            </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 4. INVOICES & PAYMENTS (/invoices) -->
    <!-- ========================================== -->
    <div id="ws-view-invoices" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Invoices & Accounts Receivable</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Commercial billing, Net 30 payment terms, customer credit tracking, and tax compliance.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        ${isDemo ? `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${tokens.border}; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <div style="font-weight: 700;">INV-2026-084 • Trans-European Logistics</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Issued: 2026-10-10 • Due: 2026-11-09 (Net 30)</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-family: var(--stokrova-font-mono); color: #4ADE80;">$14,400.00 PAID</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Wire Transfer #TRX-99812</div>
          </div>
        </div>
        <button onclick="${toastFn}('Generating Statement of Account for customer...')" style="padding: 8px 16px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 6px; font-size: 0.8125rem; cursor: pointer;">Export Statement</button>
        ` : `
        <div style="padding: 24px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem;">
          No invoices issued yet. Commercial invoices generated from sales orders or quotes will appear here.
        </div>
        `}
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 5. QUOTATIONS & B2B (/quotes) -->
    <!-- ========================================== -->
    <div id="ws-view-quotes" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Quotations & Wholesale B2B Contracts</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Price tiering, margin protection rules, and quotation conversion workflows.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        ${isDemo ? `
        <div style="font-weight: 600; margin-bottom: 8px;">Active Quote: QT-2026-042 (Metro Stores PLC)</div>
        <p style="font-size: 0.875rem; color: ${tokens.textSecondary}; margin: 0 0 16px 0;">Quote Amount: $45,000.00 • Calculated Gross Margin: 24.20% (Pre-Approved)</p>
        <button onclick="${toastFn}('Quotation converted to confirmed Sales Order SO-2026-904!')" style="padding: 8px 16px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          Convert to Confirmed Sales Order →
        </button>
        ` : `
        <div style="padding: 24px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem;">
          No quotations drafted yet. Create a B2B quotation to initiate customer pricing.
        </div>
        `}
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 6. CRM & ACCOUNTS (/crm) -->
    <!-- ========================================== -->
    <div id="ws-view-crm" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="background: rgba(189,150,82,0.15); color: ${goldText}; border: 1px solid #BD9652; padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
              Sales Representative Workspace
            </span>
            <span style="font-size: 0.8125rem; color: ${tokens.textSecondary};">
              ${isDemo ? 'Account Executive: <strong>Clara Oswald</strong> • Commercial B2B Accounts' : 'Commercial B2B Accounts & Corporate Wholesale'}
            </span>
          </div>
          <h1 style="margin: 0; font-size: 1.5rem; color: ${tokens.textPrimary}; font-weight: 800;">
            CRM & Customer Accounts Directory
          </h1>
          <p style="margin: 4px 0 0 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">
            Personal deal pipeline, credit limits, quotation conversion, and client account health.
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="${toastFn}('New wholesale opportunity modal opened.')" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; font-weight: 700; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>+ New B2B Deal</span>
          </button>
          <button onclick="${toastFn}('Drafting wholesale quotation for customer...')" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
            <span>📑 Draft Quote</span>
          </button>
        </div>
      </div>

      <!-- 4 Personal Sales KPIs -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">My Active Deals</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">${isDemo ? '12 deals' : '0 deals'}</div>
          <div style="font-size: 0.75rem; color: ${goldText}; font-weight: 600;">${isDemo ? '8 quotes pending decision' : '0 pending quotes'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Pipeline Value (MTD)</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">${isDemo ? '$184,500.00' : '$0.00'}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">${isDemo ? 'Weighted: $122,000.00' : 'Weighted: $0.00'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Quote Conversion Rate</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">${isDemo ? '34.5%' : '0.0%'}</div>
          <div style="font-size: 0.75rem; color: #4ADE80; font-weight: 600;">${isDemo ? '▲ +4.2% vs team baseline' : 'Baseline calculated from live deals'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Monthly Quota Progress</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">${isDemo ? '78.2%' : '0.0%'}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">${isDemo ? '$156,400 / $200,000 target' : '$0 / $0 target'}</div>
        </div>
      </div>

      <!-- Active Assigned Pipeline Table -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 1.05rem; font-weight: 700; color: ${tokens.textPrimary};">My Assigned Pipeline Opportunities</h3>
        <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border: 1px solid ${tokens.border}; border-radius: 8px; background: ${tokens.surface};">
          <table style="width: 100%; min-width: 680px; border-collapse: collapse; font-size: 0.8125rem;">
            <thead>
              <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; color: ${tokens.textSecondary};">
                <th style="padding: 12px 14px;">Deal Ref</th>
                <th style="padding: 12px 14px;">Account / Client</th>
                <th style="padding: 12px 14px; text-align: right;">Deal Value</th>
                <th style="padding: 12px 14px; text-align: center;">Stage</th>
                <th style="padding: 12px 14px; text-align: center;">Probability</th>
                <th style="padding: 12px 14px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${isDemo ? `
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 14px; font-weight: 700; font-family: var(--stokrova-font-mono);">OPP-2026-104</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">Metro Department Stores PLC</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Q4 Electronics Bulk Replenishment</div>
                </td>
                <td style="padding: 12px 14px; text-align: right; font-weight: 700; font-family: var(--stokrova-font-mono);">$65,000.00</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: ${goldText}; font-weight: 700;">PROPOSAL PRESENTED</span></td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #4ADE80;">70%</td>
                <td style="padding: 12px 14px; text-align: right;"><button onclick="window.stokrovaApp?.convertQuoteToSalesOrder ? window.stokrovaApp.convertQuoteToSalesOrder('OPP-2026-104', this) : ${toastFn}('Converting quote QT-2026-042 to Sales Order...')" style="min-height: 40px; padding: 6px 14px; border-radius: 6px; border: none; background: ${brandColors.gold[500]}; color: #0E1116; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Convert to SO →</button></td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; font-weight: 700; font-family: var(--stokrova-font-mono);">OPP-2026-108</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">Trans-European Logistics</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Barcode Scanner Fleet Hardware Upgrade</div>
                </td>
                <td style="padding: 12px 14px; text-align: right; font-weight: 700; font-family: var(--stokrova-font-mono);">$28,500.00</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: #3B82F6; font-weight: 700;">TECHNICAL EVALUATION</span></td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700;">50%</td>
                <td style="padding: 12px 14px; text-align: right;"><button onclick="window.stokrovaApp?.dispatchSampleDemo ? window.stokrovaApp.dispatchSampleDemo('OPP-2026-108', this) : ${toastFn}('Dispatching sample scanner unit...')" style="min-height: 40px; padding: 6px 14px; border-radius: 6px; border: 1px solid ${tokens.borderStrong}; background: ${tokens.surface}; color: ${tokens.textPrimary}; font-size: 0.75rem; font-weight: 600; cursor: pointer;">Send Demo</button></td>
              </tr>
              ` : `
              <tr>
                <td colspan="6" style="padding: 32px 14px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem;">
                  No assigned pipeline opportunities yet. Click "+ New B2B Deal" to start prospecting.
                </td>
              </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Client Accounts Summary -->
      <h3 style="margin: 0 0 12px 0; font-size: 1.05rem; font-weight: 700; color: ${tokens.textPrimary};">Managed Key Accounts</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
        ${isDemo ? `
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-weight: 700; font-size: 1rem;">Trans-European Freight Logistics</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Credit Limit: $500,000.00 • Score: A+</div>
          <div style="font-size: 0.75rem; color: #4ADE80; margin-top: 8px;">● 0 Overdue Invoices</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-weight: 700; font-size: 1rem;">Metro Department Stores PLC</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Credit Limit: $1,000,000.00 • Score: A</div>
          <div style="font-size: 0.75rem; color: #4ADE80; margin-top: 8px;">● $28,900.00 Current Invoiced Balance</div>
        </div>
        ` : `
        <div style="padding: 24px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem; grid-column: 1 / -1; border: 1px dashed ${tokens.borderStrong}; border-radius: 8px;">
          No managed client accounts registered yet. Added B2B customer accounts and corporate credit limits will display here.
        </div>
        `}
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 7. PRODUCTS CATALOG (/catalog/products) -->
    <!-- ========================================== -->
    <div id="ws-view-catalog" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Product Catalog & Variant Matrix</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Central item master, serial tracking, barcode aliases, and attribute dimensions.</p>
        </div>
        <button onclick="window.stokrovaApp?.openProductModal ? window.stokrovaApp.openProductModal() : ${toastFn}('Opening SKU / Variant creation modal...')" style="padding: 8px 16px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          + Add Product / Variant
        </button>
      </div>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead style="background: #151921; border-bottom: 1px solid ${tokens.border}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.75rem;">
            <tr>
              <th style="padding: 12px 16px; text-align: left;">SKU</th>
              <th style="padding: 12px 16px; text-align: left;">Product Name</th>
              <th style="padding: 12px 16px; text-align: left;">Barcode</th>
              <th style="padding: 12px 16px; text-align: left;">Stock</th>
              <th style="padding: 12px 16px; text-align: right;">Cost Price</th>
              <th style="padding: 12px 16px; text-align: right;">Retail Price</th>
            </tr>
          </thead>
          <tbody>
            ${isDemo ? `
            <tr style="border-bottom: 1px solid ${tokens.border};">
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">LAPTOP-PRO-16</td>
              <td style="padding: 14px 16px;">Pro 16-inch Workstation Laptop</td>
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono);">5011000000018</td>
              <td style="padding: 14px 16px; color: #4ADE80; font-weight: 600;">40 units</td>
              <td style="padding: 14px 16px; text-align: right; color: ${tokens.textMuted};">$1,200.00</td>
              <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$2,499.00</td>
            </tr>
            <tr style="border-bottom: 1px solid ${tokens.border};">
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">SMARTPHONE-ULTRA-5G</td>
              <td style="padding: 14px 16px;">Ultra 5G Smartphone 256GB</td>
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono);">5011000000025</td>
              <td style="padding: 14px 16px; color: #4ADE80; font-weight: 600;">85 units</td>
              <td style="padding: 14px 16px; text-align: right; color: ${tokens.textMuted};">$450.00</td>
              <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$999.00</td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">SHIRT-OXFORD-BLU-M</td>
              <td style="padding: 14px 16px;">Royal Oxford Cotton Shirt (Blue/M)</td>
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono);">5012000000011</td>
              <td style="padding: 14px 16px; color: #4ADE80; font-weight: 600;">120 units</td>
              <td style="padding: 14px 16px; text-align: right; color: ${tokens.textMuted};">$15.00</td>
              <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$65.00</td>
            </tr>
            ` : `
            <tr>
              <td colspan="6" style="padding: 36px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem;">
                No products in catalog yet. Click "+ Add Product / Variant" to configure your items.
              </td>
            </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 8. STOCK MOVEMENT LEDGER (/inventory/ledger) -->
    <!-- ========================================== -->
    <div id="ws-view-ledger" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Double-Entry Stock Movement Ledger</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Immutable audit trail of every stock increase, decrease, transfer, and adjustment.</p>
      <div id="ws-stock-movements" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; display: flex; flex-direction: column; gap: 12px;">
        ${isDemo ? `
        <div style="border-bottom: 1px solid ${tokens.border}; padding-bottom: 10px;">
          <div style="color: ${brandColors.gold[400]};">MVMT-2026-10-8812 | LAPTOP-PRO-16</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 16px;">RECEIVING-DOCK → A-01-02-03 (Qty: +20) • Op: samuel.adebayo • Reason: PURCHASE_RECEIPT</div>
        </div>
        <div>
          <div style="color: ${brandColors.gold[400]};">MVMT-2026-10-8811 | SHIRT-OXFORD-BLU-M</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 16px;">A-01-02-04 → DISPATCH-BAY-1 (Qty: -12) • Op: david.oconnor • Reason: POS_SALE</div>
        </div>
        ` : `
        <div style="padding: 24px 16px; text-align: center; color: ${tokens.textMuted};">
          No stock movements recorded yet. Receipts, transfers, and POS sales will post immutable double-entry entries here.
        </div>
        `}
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 9. WAREHOUSES & 8-TIER BINS (/inventory/locations) -->
    <!-- ========================================== -->
    <div id="ws-view-locations" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Warehouses & 8-Tier Bin Hierarchy</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Company → Division → Facility → Zone → Aisle → Rack → Shelf → Bin.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        ${isDemo ? `
        <div style="font-weight: 700; margin-bottom: 12px; color: ${brandColors.gold[400]};">🏢 London Central Distribution Hub (FCL-LON-01)</div>
        <div style="margin-left: 20px; border-left: 2px dashed ${tokens.borderStrong}; padding-left: 16px; font-size: 0.875rem;">
          <div style="margin-bottom: 8px;">📦 <strong>Zone A (High-Value Tech)</strong> • Aisle 01 • Rack 02 • Shelf 03 • <code>Bin A-01-02-03</code> (Capacity: 80% Occupied)</div>
          <div style="margin-bottom: 8px;">❄️ <strong>Zone B (Cold-Chain 2-8°C)</strong> • Aisle 02 • Rack 01 • Shelf 01 • <code>Bin B-02-01-01</code> (Vaccine Ampoules)</div>
          <div>🚚 <strong>Outbound Dispatch Dock</strong> • Bay 01 & 02 • Active Pallet Staging Area</div>
        </div>
        ` : `
        <div style="padding: 24px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem;">
          No warehouse facilities or bins configured yet. Configure warehouse zones and racking to track physical locations.
        </div>
        `}
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 10. STOCK AVAILABILITY & ATP (/inventory/availability) -->
    <!-- ========================================== -->
    <div id="ws-view-availability" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Stock Availability & Available-To-Promise (ATP)</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Decomposes physical balances against customer reservations and confirmed inbound POs.</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Physical Stock On Hand</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">${isDemo ? '245 Units' : '0 Units'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Active Customer Reservations</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #F59E0B; margin-top: 4px;">${isDemo ? '35 Units' : '0 Units'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Confirmed Inbound (PO-89)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #3B82F6; margin-top: 4px;">${isDemo ? '+100 Units' : '0 Units'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Available To Promise (ATP)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #4ADE80; margin-top: 4px;">${isDemo ? '310 Units' : '0 Units'}</div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 11. SUPPLIERS & CATALOGS (/procurement/suppliers) -->
    <!-- ========================================== -->
    <div id="ws-view-suppliers" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Suppliers & Procurement Catalogs</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Vendor directory, contractual lead times, and performance ratings.</p>
      ${isDemo ? `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${tokens.border}; padding-bottom: 10px; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 700;">Intel Corporation UK Ltd</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Lead Time: 5 Days • On-Time Rating: 99.2% • Currency: USD</div>
          </div>
          <button onclick="window.stokrovaApp?.requestSupplierRfq ? window.stokrovaApp.requestSupplierRfq('SUPP-INTEL', this) : ${toastFn}('Requesting Request for Quotation (RFQ)...')" style="padding: 6px 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Request RFQ</button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700;">Samsung Electronics Logistics Europe</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Lead Time: 7 Days • On-Time Rating: 98.4% • Currency: EUR</div>
          </div>
          <button onclick="window.stokrovaApp?.requestSupplierRfq ? window.stokrovaApp.requestSupplierRfq('SUPP-SAMSUNG', this) : ${toastFn}('Requesting Request for Quotation (RFQ)...')" style="padding: 6px 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Request RFQ</button>
        </div>
      </div>
      ` : `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 36px 20px; text-align: center; color: ${tokens.textMuted};">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">🏢</div>
        <div style="font-weight: 600; color: ${tokens.textSecondary};">No suppliers registered yet</div>
        <div style="font-size: 0.8125rem; margin-top: 4px;">Connect with authorized suppliers and manage purchase agreements.</div>
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- 12. PURCHASE ORDERS (/procurement/orders) -->
    <!-- ========================================== -->
    <div id="ws-view-po" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Purchase Orders (PO) Management</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Issuing purchase requisitions, landed cost allocations, and goods receiving.</p>
      ${isDemo ? `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700; color: ${brandColors.gold[400]};">PO-2026-089 • Intel Corporation ($48,000.00 USD)</div>
        <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-top: 4px;">Status: PARTIALLY_RECEIVED • 20/40 Workstations received at London Dock</div>
        <div style="margin-top: 12px;">
          <button onclick="window.stokrovaApp?.recordInboundGRN ? window.stokrovaApp.recordInboundGRN('PO-2026-089', this) : ${toastFn}('Recording inbound receiving for PO-2026-089...')" style="padding: 6px 14px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 4px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">Receive Goods (GRN)</button>
        </div>
      </div>
      ` : `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 36px 20px; text-align: center; color: ${tokens.textMuted};">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">📦</div>
        <div style="font-weight: 600; color: ${tokens.textSecondary};">No purchase orders created yet</div>
        <div style="font-size: 0.8125rem; margin-top: 4px;">Issue purchase requisitions and manage landed cost allocations.</div>
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- 13. GOODS RECEIPT & 3-WAY MATCH (/procurement/receiving) -->
    <!-- ========================================== -->
    <div id="ws-view-receiving" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Goods Receipt & 3-Way Match Matrix</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Automated verification between Purchase Order, Goods Receipt Note (GRN), and Supplier Invoice.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
          <thead style="background: #151921; color: ${tokens.textMuted}; text-transform: uppercase;">
            <tr>
              <th style="padding: 10px 14px; text-align: left;">Item SKU</th>
              <th style="padding: 10px 14px; text-align: center;">PO Qty</th>
              <th style="padding: 10px 14px; text-align: center;">GRN Qty</th>
              <th style="padding: 10px 14px; text-align: center;">Invoice Qty</th>
              <th style="padding: 10px 14px; text-align: center;">3-Way Match</th>
            </tr>
          </thead>
          <tbody>
            ${isDemo ? `
            <tr>
              <td style="padding: 12px 14px; font-weight: 600;">LAPTOP-PRO-16</td>
              <td style="padding: 12px 14px; text-align: center;">20</td>
              <td style="padding: 12px 14px; text-align: center;">20</td>
              <td style="padding: 12px 14px; text-align: center;">20</td>
              <td style="padding: 12px 14px; text-align: center;"><span style="color: #4ADE80; font-weight: 700;">✓ MATCHED</span></td>
            </tr>
            ` : `
            <tr>
              <td colspan="5" style="padding: 32px 14px; text-align: center; color: ${tokens.textMuted};">
                No goods receipts or supplier invoices awaiting 3-way match.
              </td>
            </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 14. WAVE & ZONE PICKING (/logistics/picking) -->
    <!-- ========================================== -->
    <div id="ws-view-picking" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="background: rgba(189,150,82,0.15); color: ${goldText}; border: 1px solid #BD9652; padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
              Warehouse Picker Workbench
            </span>
            <span style="font-size: 0.8125rem; color: ${tokens.textSecondary};">
              Operator: <strong>${isDemo ? 'Samuel Adebayo' : 'Active Operator'}</strong> • ${branchName} (Zone A & B)
            </span>
          </div>
          <h1 style="margin: 0; font-size: 1.5rem; color: ${tokens.textPrimary}; font-weight: 800;">
            Wave & Zone Warehouse Picking
          </h1>
          <p style="margin: 4px 0 0 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">
            Route-optimized pick sequence, bin verification scans, and batch staging telemetry.
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="window.stokrovaApp?.completeAndStageWave ? window.stokrovaApp.completeAndStageWave('WAVE-LON-042', this) : ${toastFn}('Active pick wave submitted to container packing dock!')" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; font-weight: 700; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>✓ Complete & Stage Wave</span>
          </button>
          <button onclick="window.stokrovaApp?.calibrateScanner ? window.stokrovaApp.calibrateScanner(this) : ${toastFn}('Scanner calibrated. Ready for barcode scan.')" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
            <span>🔍 Calibrate Scanner</span>
          </button>
        </div>
      </div>

      <!-- 5 Personal Picker KPIs -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Active Wave</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">${isDemo ? 'WAVE-LON-042' : 'None Active'}</div>
          <div style="font-size: 0.75rem; color: ${goldText}; font-weight: 600;">${isDemo ? 'Zone A (High-Velocity)' : 'No wave in progress'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Lines Picked Today</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">${isDemo ? '64 / 72' : '0 / 0'} <span style="font-size: 0.8rem; font-weight: 500; color: ${tokens.textSecondary};">lines</span></div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">${isDemo ? '88.9% wave progress' : '0% wave progress'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Units Handled</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">${isDemo ? '128 units' : '0 units'}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">FEFO rule enforced</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Pick Accuracy</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">${isDemo ? '99.8%' : '100%'}</div>
          <div style="font-size: 0.75rem; color: #4ADE80; font-weight: 600;">${isDemo ? '0 mispicks flagged' : 'No mispicks recorded'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Average Pick Pace</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">${isDemo ? '42s' : '-- s'} <span style="font-size: 0.8rem; font-weight: 500; color: ${tokens.textSecondary};">/ item</span></div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">Target: &lt; 50s / unit</div>
        </div>
      </div>

      <!-- Active Pick List Table with Responsive Wrapper -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 1.05rem; font-weight: 700; color: ${tokens.textPrimary};">Active Pick Sequence (Route Optimized)</h3>
        <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border: 1px solid ${tokens.border}; border-radius: 8px; background: ${tokens.surface};">
          <table style="width: 100%; min-width: 680px; border-collapse: collapse; font-size: 0.8125rem;">
            <thead>
              <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; color: ${tokens.textSecondary};">
                <th style="padding: 12px 14px;">Bin Location</th>
                <th style="padding: 12px 14px;">SKU & Item Name</th>
                <th style="padding: 12px 14px; text-align: center;">Required Qty</th>
                <th style="padding: 12px 14px; text-align: center;">Picked Qty</th>
                <th style="padding: 12px 14px; text-align: center;">Verification</th>
                <th style="padding: 12px 14px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${isDemo ? `
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 14px; font-family: var(--stokrova-font-mono); font-weight: 700; color: ${goldText};">A-02-01-B</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">LAPTOP-PRO-16</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Pro 16 Workstation • Lot #LOT-2026-088</div>
                </td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700;">6</td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #4ADE80;">6</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: #4ADE80; font-weight: 700;">✓ SCANNED</span></td>
                <td style="padding: 12px 14px; text-align: right;"><button disabled style="min-height: 40px; padding: 6px 14px; border-radius: 6px; border: 1px solid #1E4620; background: #14291F; color: #4ADE80; font-size: 0.75rem; font-weight: 600;">Picked ✓</button></td>
              </tr>
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 14px; font-family: var(--stokrova-font-mono); font-weight: 700; color: ${goldText};">A-03-04-A</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">PHONE-ULTRA-5G</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Ultra 5G Phone • Serial Tracked</div>
                </td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700;">10</td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #4ADE80;">10</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: #4ADE80; font-weight: 700;">✓ SCANNED</span></td>
                <td style="padding: 12px 14px; text-align: right;"><button disabled style="min-height: 40px; padding: 6px 14px; border-radius: 6px; border: 1px solid #1E4620; background: #14291F; color: #4ADE80; font-size: 0.75rem; font-weight: 600;">Picked ✓</button></td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; font-family: var(--stokrova-font-mono); font-weight: 700; color: ${goldText};">B-01-02-C</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">SHIRT-OXFORD-BLU</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Oxford Cotton Shirt (Medium Blue)</div>
                </td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700;">20</td>
                <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: ${goldText};">12</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: ${goldText}; font-weight: 700;">IN PROGRESS</span></td>
                <td style="padding: 12px 14px; text-align: right;"><button onclick="window.stokrovaApp?.scanPickItem ? window.stokrovaApp.scanPickItem('SHIRT-OXFORD-BLU', this) : ${toastFn}('Scan barcode for Oxford Shirt...')" style="min-height: 40px; padding: 6px 14px; border-radius: 6px; border: none; background: ${brandColors.gold[500]}; color: #0E1116; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Scan Unit (8 left)</button></td>
              </tr>
              ` : `
              <tr>
                <td colspan="6" style="padding: 32px 14px; text-align: center; color: ${tokens.textMuted};">
                  No active pick waves queued for this branch.
                </td>
              </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 15. CONTAINERIZATION & BOL (/logistics/dispatch) -->
    <!-- ========================================== -->
    <div id="ws-view-dispatch" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Containerization & Bills of Lading (BOL)</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Pallet SSCC-18 barcodes, container gross weight checks, and carrier manifests.</p>
      ${isDemo ? `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;">
        <div>PALLET SSCC-18: 006141411234567890</div>
        <div style="color: ${tokens.textSecondary}; margin-top: 4px;">Cartons: 24 • Gross Weight: 420 kg • Destination: Central Logistics Hub</div>
        <div style="margin-top: 14px;">
          <button onclick="window.stokrovaApp?.printBillOfLading ? window.stokrovaApp.printBillOfLading(this) : ${toastFn}('Printing official Bill of Lading (BOL)...')" style="min-height: 44px; padding: 10px 18px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center;">Print BOL Manifest</button>
        </div>
      </div>
      ` : `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 36px 20px; text-align: center; color: ${tokens.textMuted};">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">📤</div>
        <div style="font-weight: 600; color: ${tokens.textSecondary};">No consignments staged for carrier dispatch</div>
        <div style="font-size: 0.8125rem; margin-top: 4px;">Stage pick waves into containers to generate SSCC-18 pallets and Bills of Lading.</div>
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- 16. FLEET & PROOF OF DELIVERY (/logistics/fleet) -->
    <!-- ========================================== -->
    <div id="ws-view-fleet" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="background: rgba(74, 222, 128, 0.15); color: #4ADE80; border: 1px solid #1E4620; padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
              ● Active Driver Manifest
            </span>
            <span style="font-size: 0.8125rem; color: ${tokens.textSecondary};">
              Driver: <strong>${isDemo ? 'Marcus Bennett' : 'Active Fleet Driver'}</strong> • ${isDemo ? 'Mercedes Sprinter (Reg: LK26 XYZ)' : branchName}
            </span>
          </div>
          <h1 style="margin: 0; font-size: 1.5rem; color: ${tokens.textPrimary}; font-weight: 800;">
            Fleet Delivery Route & Proof of Delivery (POD)
          </h1>
          <p style="margin: 4px 0 0 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">
            Turn-by-turn route dispatch, recipient digital signature capture, and delivery compliance telemetry.
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="window.stokrovaApp?.openPodSignatureModal ? window.stokrovaApp.openPodSignatureModal() : ${toastFn}('Digital POD signature pad opened for current drop.')" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; font-weight: 700; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>✍️ Capture POD Signature</span>
          </button>
          <button onclick="window.stokrovaApp?.syncRouteTelemetry ? window.stokrovaApp.syncRouteTelemetry(this) : ${toastFn}('Syncing GPS coordinates and offline drop queue...')" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
            <span>🧭 Sync Route Telemetry</span>
          </button>
        </div>
      </div>

      <!-- 4 Personal Driver KPIs -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Current Route Run</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">${isDemo ? 'RUN-LON-04' : 'None Assigned'}</div>
          <div style="font-size: 0.75rem; color: ${goldText}; font-weight: 600;">${isDemo ? 'London Zone 2 North' : 'No active dispatch route'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Drops Completed</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">${isDemo ? '12 / 14' : '0 / 0'} <span style="font-size: 0.8rem; font-weight: 500; color: ${tokens.textSecondary};">drops</span></div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">${isDemo ? '85.7% route progress' : 'No route active'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">On-Time Delivery Rate</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">100%</div>
          <div style="font-size: 0.75rem; color: #4ADE80; font-weight: 600;">0 SLA delivery breaches</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">POD Signatures Captured</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">${isDemo ? '12 / 12' : '0 / 0'}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">${isDemo ? 'Photos + Signatures verified' : 'No signatures collected yet'}</div>
        </div>
      </div>

      <!-- Driver Route Stop Manifest Table with Responsive Wrapper -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 1.05rem; font-weight: 700; color: ${tokens.textPrimary};">Route Stops Manifest</h3>
        <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border: 1px solid ${tokens.border}; border-radius: 8px; background: ${tokens.surface};">
          <table style="width: 100%; min-width: 680px; border-collapse: collapse; font-size: 0.8125rem;">
            <thead>
              <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; color: ${tokens.textSecondary};">
                <th style="padding: 12px 14px;">Stop #</th>
                <th style="padding: 12px 14px;">Recipient & Destination</th>
                <th style="padding: 12px 14px;">Packages / Consignment</th>
                <th style="padding: 12px 14px; text-align: center;">Status</th>
                <th style="padding: 12px 14px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${isDemo ? `
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 14px; font-weight: 700; font-family: var(--stokrova-font-mono);">#12</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">Camden Tech Solutions Ltd</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">14 Chalk Farm Rd, NW1 8EH</div>
                </td>
                <td style="padding: 12px 14px;">2x Workstations (BOL-8849)</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: #4ADE80; font-weight: 700;">✓ DELIVERED (14:22)</span></td>
                <td style="padding: 12px 14px; text-align: right;"><button disabled style="min-height: 40px; padding: 6px 12px; border-radius: 6px; border: 1px solid #1E4620; background: #14291F; color: #4ADE80; font-size: 0.75rem; font-weight: 600;">POD Signed ✓</button></td>
              </tr>
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 14px; font-weight: 700; font-family: var(--stokrova-font-mono); color: ${goldText};">#13</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">Islington High Street Retail</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">82 Upper Street, N1 0NU</div>
                </td>
                <td style="padding: 12px 14px;">4x Cartons Apparel (BOL-8850)</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: ${goldText}; font-weight: 700;">NEXT STOP (ETA 15:15)</span></td>
                <td style="padding: 12px 14px; text-align: right;"><button onclick="window.stokrovaApp?.deliverAndSignPod ? window.stokrovaApp.deliverAndSignPod('DROP-13', this) : ${toastFn}('Arrived at Islington. Capturing recipient signature...')" style="min-height: 40px; padding: 6px 14px; border-radius: 6px; border: none; background: ${brandColors.gold[500]}; color: #0E1116; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Deliver & Sign</button></td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; font-weight: 700; font-family: var(--stokrova-font-mono);">#14</td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600;">Highbury Distribution Annex</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">20 Highbury Park, N5 2AB</div>
                </td>
                <td style="padding: 12px 14px;">1x Pallet Container (BOL-8851)</td>
                <td style="padding: 12px 14px; text-align: center;"><span style="color: ${tokens.textMuted}; font-weight: 600;">QUEUED (ETA 16:00)</span></td>
                <td style="padding: 12px 14px; text-align: right;"><button disabled style="min-height: 40px; padding: 6px 12px; border-radius: 6px; border: 1px solid ${tokens.borderStrong}; background: ${tokens.surface}; color: ${tokens.textMuted}; font-size: 0.75rem;">Pending</button></td>
              </tr>
              ` : `
              <tr>
                <td colspan="5" style="padding: 32px 14px; text-align: center; color: ${tokens.textMuted};">
                  No delivery stops assigned for current shift.
                </td>
              </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 17. BILLS OF MATERIALS (/manufacturing/boms) -->
    <!-- ========================================== -->
    <div id="ws-view-bom" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Bills of Materials (BOM) & Recipes</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Multi-level assembly trees, component quantities, scrap factors, and standard costing.</p>
      ${isDemo ? `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700; color: ${brandColors.gold[400]};">Finished Good: LAPTOP-PRO-16 (Rev 2.1)</div>
        <div style="margin-top: 10px; font-size: 0.8125rem; color: ${tokens.textSecondary}; line-height: 1.6;">
          • 1x Motherboard Assembly (Cost: $650.00)<br>
          • 1x 16-inch Mini-LED Display Panel (Cost: $280.00)<br>
          • 1x CNC Aluminum Chassis Unibody (Cost: $120.00)<br>
          • 1x 99.6Wh Lithium Polymer Battery Pack (Cost: $95.00)<br>
          <strong>Total Standard Assembly Cost: $1,145.00 (Scrap allowance: 1.2%)</strong>
        </div>
      </div>
      ` : `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 36px 20px; text-align: center; color: ${tokens.textMuted};">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">⚙️</div>
        <div style="font-weight: 600; color: ${tokens.textSecondary};">No Bills of Materials (BOM) configured</div>
        <div style="font-size: 0.8125rem; margin-top: 4px;">Define assembly hierarchies, sub-components, and scrap allowances.</div>
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- 18. PRODUCTION ORDERS (/manufacturing/orders) -->
    <!-- ========================================== -->
    <div id="ws-view-mo" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Production Work Orders</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Work center scheduling, raw material reservations, and output recording.</p>
      ${isDemo ? `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700;">WO-2026-014 • Work Center: Assembly Bay 01</div>
        <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-top: 4px;">Target: 50x LAPTOP-PRO-16 • Status: IN_PROGRESS (30/50 assembled)</div>
        <div style="margin-top: 12px;">
          <button onclick="window.stokrovaApp?.recordAssemblyOutput ? window.stokrovaApp.recordAssemblyOutput('WO-2026-014', 10, this) : ${toastFn}('Output logged: 10 finished laptops posted to inventory asset ledger.')" style="padding: 6px 14px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 4px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">Record Output (10 units)</button>
        </div>
      </div>
      ` : `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 36px 20px; text-align: center; color: ${tokens.textMuted};">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">🏭</div>
        <div style="font-weight: 600; color: ${tokens.textSecondary};">No active production work orders</div>
        <div style="font-size: 0.8125rem; margin-top: 4px;">Schedule manufacturing work orders across production work centers.</div>
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- 19. TILL SESSIONS & CASH COUNT (/registers) -->
    <!-- ========================================== -->
    <div id="ws-view-registers" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Till Sessions & Blind Cash Reconciliation</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Daily opening float, mid-shift drops, blind closing count, and cash variance audit.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-weight: 700;">Till Register 01 (${branchName})</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Cashier: Assigned Cashier • Float: ${isDemo ? '$250.00' : '$0.00'} • Active Sales: ${isDemo ? '$3,450.00' : '$0.00'}</div>
          <div style="font-size: 0.75rem; color: ${isDemo ? '#4ADE80' : tokens.textSecondary}; margin-top: 8px;">${isDemo ? '● 0 Cashier Discrepancy' : '● Register Closed / Ready for Shift Float'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-weight: 700;">Till Register 02 (${branchName})</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Cashier: Terminal Cashier • Float: ${isDemo ? '$250.00' : '$0.00'} • Active Sales: ${isDemo ? '$2,890.00' : '$0.00'}</div>
          <div style="font-size: 0.75rem; color: ${isDemo ? '#4ADE80' : tokens.textSecondary}; margin-top: 8px;">${isDemo ? '● 0 Cashier Discrepancy' : '● Register Closed / Ready for Shift Float'}</div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 20. GENERAL LEDGER (/finance/ledger) -->
    <!-- ========================================== -->
    <div id="ws-view-gl" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Double-Entry General Ledger</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Authoritative financial truth. Debits equal Credits at all times.</p>
      ${isDemo ? `
      <div id="ws-ledger-entries" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; display: flex; flex-direction: column; gap: 14px;">
        <div class="ledger-row" style="border-bottom: 1px solid ${tokens.border}; padding-bottom: 12px;">
          <div style="color: #4ADE80; margin-bottom: 4px;">✓ JRNL-2026-10-001 | Sales Order SO-2026-001</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 20px;">DR 1010 Cash at Bank: $2,499.00</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 20px;">CR 4010 Retail Revenue: $2,499.00</div>
          <div style="color: ${tokens.textMuted}; font-size: 0.75rem; margin-left: 20px; margin-top: 2px;">Delta: $0.00 (Balanced Double-Entry)</div>
        </div>
      </div>
      ` : `
      <div id="ws-ledger-entries" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 36px 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; text-align: center; color: ${tokens.textMuted};">
        No journal entries recorded in general ledger yet. Balanced debits and credits will post here automatically.
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- 21. FISCAL E-INVOICING & TAX (/finance/tax) -->
    <!-- ========================================== -->
    <div id="ws-view-tax" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Fiscal E-Invoicing & Taxes</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Multi-jurisdiction VAT/sales tax schedules, QR fiscal stamps, and compliance exports.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700;">Standard VAT 20.00% (Accrued: ${isDemo ? '$63,666.67' : '$0.00'})</div>
        <p style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin: 4px 0 14px 0;">All transactions signed with SHA-256 tamper-proof fiscal hash chain.</p>
        <button onclick="window.stokrovaApp?.exportFiscalAudit ? window.stokrovaApp.exportFiscalAudit(this) : ${toastFn}('Exporting fiscal tax package for HM Revenue & Customs...')" style="padding: 8px 16px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 6px; font-size: 0.8125rem; cursor: pointer;">Export Fiscal Audit File</button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 22. ABC VELOCITY & DEAD STOCK (/analytics/inventory) -->
    <!-- ========================================== -->
    <div id="ws-view-abc" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">ABC Velocity Classification & Dead Stock Pipeline</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Cumulative Pareto analysis (80/15/5) and carrying cost liquidation triggers.</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.75rem; color: #4ADE80; font-weight: 700;">CLASS A (TOP 80% REVENUE)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">${isDemo ? '12 SKUs' : '0 SKUs'}</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">${isDemo ? 'Revenue: $305,600.00 • High Replenishment Priority' : 'Revenue: $0.00 • No sales recorded'}</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.75rem; color: #F59E0B; font-weight: 700;">DEAD STOCK ALERT (180+ DAYS)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #F59E0B; margin-top: 4px;">${isDemo ? '2 SKUs' : '0 SKUs'}</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">${isDemo ? 'Tied-Up Capital: $18,400.00 • Markdown Recommended' : 'Tied-Up Capital: $0.00 • No dead stock detected'}</div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 23. AUDIT FORENSICS (/audit/forensics) -->
    <!-- ========================================== -->
    <div id="ws-view-audit" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Audit Forensics & Merkle Ledger</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Cryptographic hash verification of all state changes across every workspace.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;">
        <div style="color: #4ADE80; margin-bottom: 6px;">✓ MERKLE_ROOT: ${isDemo ? '8f49a2c3e1b7...' : '000000000000...'} (${isDemo ? 'Tree verified intact' : 'Genesis Root Initialized'})</div>
        <div style="color: ${tokens.textSecondary}; line-height: 1.6;">
          ${isDemo ? `
          • [2026-10-14 14:22:01] EVENT: POS_CHECKOUT | Actor: cashier.operator | Ref: POS-SALE-9912<br>
          • [2026-10-14 13:45:10] EVENT: STOCK_TRANSFER | Actor: logistics.operator | Ref: TR-LON-BIR-042<br>
          • [2026-10-14 11:15:30] EVENT: USER_LOGIN | Actor: system.admin | IP: 192.168.1.42
          ` : `
          • System initialized. Audit logging active across all operations.
          `}
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 24. COMPLIANCE (/compliance) -->
    <!-- ========================================== -->
    <div id="ws-view-compliance" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">GDPR & SOX 404 Compliance</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Segregation of duties (SOD), access audit logs, and data retention policies.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="color: #4ADE80; font-weight: 700;">✓ Segregation of Duties Matrix: 0 Violations Detected</div>
        <p style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin: 6px 0 0 0;">Cashiers cannot alter inventory; Warehouse operators cannot modify payments or ledgers.</p>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 25. TENANT & COMPANIES (/settings/organization) -->
    <!-- ========================================== -->
    <div id="ws-view-org" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Tenant Organization & Subsidiary Companies</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Multi-company legal entity governance and regional retail branch assignments.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700; color: ${brandColors.gold[400]};">Holding: ${tenantName}</div>
        <div style="margin-left: 16px; margin-top: 8px; font-size: 0.8125rem; color: ${tokens.textSecondary}; line-height: 1.6;">
          • Primary Legal Entity (${options.currencyCode || 'USD'} • Active Operations)<br>
          • Registered Commercial Facility: ${branchName}
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 26. WHITE-LABEL & REBRANDING STUDIO (/settings/rebranding) -->
    <!-- ========================================== -->
    <div id="ws-view-rebranding" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Company Rebranding & White-Label Studio</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Customize corporate identity, accent palette, and receipt typography. Changes cascade dynamically to every worker, till, and mobile device under this company.</p>
        </div>
        <button id="btn-save-rebranding" onclick="window.saveCompanyRebranding ? window.saveCompanyRebranding() : (window.stokrovaCustomerApp?.saveCompanyRebranding ? window.stokrovaCustomerApp.saveCompanyRebranding() : window.stokrovaApp?.saveCompanyRebranding())" style="padding: 10px 20px; border-radius: 6px; background: var(--primary, ${brandColors.gold[500]}); color: #0E1116; border: none; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          💾 Save & Apply Rebrand to All Workspaces
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; align-items: start;">
        <!-- Left Column: Branding Controls -->
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 24px;">
          <h3 style="margin: 0 0 16px 0; font-size: 1.1rem; color: ${tokens.textPrimary};">1. Corporate Identity & Receipt Headers</h3>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">COMPANY LEGAL & DISPLAY NAME</label>
            <input id="rebrand-company-name" type="text" value="${tenantName}" placeholder="e.g. Acme Enterprises Ltd" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" oninput="window.updateBrandPreview && window.updateBrandPreview()" />
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">RECEIPT & INVOICE SUBTITLE</label>
            <input id="rebrand-receipt-slogan" type="text" value="Premium Retail & Logistics • Flagship Branch" placeholder="e.g. Authorized Premium Retailer" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" oninput="window.updateBrandPreview && window.updateBrandPreview()" />
          </div>

          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">BRAND MONOGRAM / LOGO TEXT</label>
            <div style="display: flex; gap: 10px;">
              <input id="rebrand-logo-text" type="text" value="◆ STOKROVA" placeholder="e.g. ❖ BRAND" style="flex: 1; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" oninput="window.updateBrandPreview && window.updateBrandPreview()" />
            </div>
          </div>

          <h3 style="margin: 0 0 16px 0; font-size: 1.1rem; color: ${tokens.textPrimary};">2. Primary Brand Color Palette</h3>
          <p style="margin: 0 0 12px 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Select a corporate preset or define custom HEX color for all worker interfaces.</p>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <button type="button" onclick="window.selectBrandAccent('#BD9652')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 2px solid #BD9652; color: #BD9652; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #BD9652; margin: 0 auto 6px auto;"></div>
              STOKROVA Gold
            </button>
            <button type="button" onclick="window.selectBrandAccent('#10B981')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 1px solid ${tokens.borderStrong}; color: #10B981; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #10B981; margin: 0 auto 6px auto;"></div>
              Emerald Green
            </button>
            <button type="button" onclick="window.selectBrandAccent('#2563EB')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 1px solid ${tokens.borderStrong}; color: #2563EB; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #2563EB; margin: 0 auto 6px auto;"></div>
              Sapphire Blue
            </button>
            <button type="button" onclick="window.selectBrandAccent('#6366F1')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 1px solid ${tokens.borderStrong}; color: #6366F1; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #6366F1; margin: 0 auto 6px auto;"></div>
              Deep Indigo
            </button>
            <button type="button" onclick="window.selectBrandAccent('#8B5CF6')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 1px solid ${tokens.borderStrong}; color: #8B5CF6; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #8B5CF6; margin: 0 auto 6px auto;"></div>
              Royal Violet
            </button>
            <button type="button" onclick="window.selectBrandAccent('#E11D48')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 1px solid ${tokens.borderStrong}; color: #E11D48; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #E11D48; margin: 0 auto 6px auto;"></div>
              Crimson Rose
            </button>
            <button type="button" onclick="window.selectBrandAccent('#0D9488')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 1px solid ${tokens.borderStrong}; color: #0D9488; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #0D9488; margin: 0 auto 6px auto;"></div>
              Cyber Teal
            </button>
            <button type="button" onclick="window.selectBrandAccent('#F59E0B')" style="padding: 10px; border-radius: 6px; background: #1F242C; border: 1px solid ${tokens.borderStrong}; color: #F59E0B; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center;">
              <div style="width: 18px; height: 18px; border-radius: 50%; background: #F59E0B; margin: 0 auto 6px auto;"></div>
              Solar Amber
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 14px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; padding: 12px 16px; border-radius: 6px;">
            <label style="font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary};">CUSTOM HEX:</label>
            <input id="rebrand-color-picker" type="color" value="#BD9652" onchange="window.selectBrandAccent(this.value)" style="width: 38px; height: 38px; border: none; border-radius: 4px; cursor: pointer; background: transparent;" />
            <input id="rebrand-hex-input" type="text" value="#BD9652" maxlength="7" oninput="window.selectBrandAccent(this.value)" style="width: 110px; padding: 6px 10px; border-radius: 4px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;" />
            <span style="font-size: 0.75rem; color: ${tokens.textMuted};">Live CSS Variable Cascade</span>
          </div>
        </div>

        <!-- Right Column: Live Multi-Surface Preview -->
        <div>
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 16px 0; font-size: 1.1rem; color: ${tokens.textPrimary};">3. Real-Time Worker Surface Previews</h3>

            <!-- Preview 1: POS Screen Header & Buttons -->
            <div style="background: #090B0E; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; padding: 14px; margin-bottom: 14px;">
              <div style="font-size: 0.7rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Cashier POS Terminal Appearance</div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${tokens.border}; padding-bottom: 8px; margin-bottom: 10px;">
                <span id="preview-brand-header" style="font-weight: 800; color: #BD9652; font-size: 0.85rem;">◆ ${tenantName}</span>
                <span style="font-size: 0.7rem; background: rgba(189,150,82,0.18); color: #BD9652; padding: 2px 6px; border-radius: 4px; font-weight: 600;" id="preview-branch-badge">${branchName}</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" id="preview-pos-btn" style="flex: 1; padding: 8px; background: #BD9652; color: #0E1116; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Complete Cashier Sale ($0.00)</button>
              </div>
            </div>

            <!-- Preview 2: Mobile Handheld Scanner -->
            <div style="background: #090B0E; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; padding: 14px; margin-bottom: 14px;">
              <div style="font-size: 0.7rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Warehouse Handheld Scanner Viewfinder</div>
              <div style="border: 2px dashed #BD9652; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 8px;" id="preview-scanner-box">
                <span style="font-size: 0.75rem; color: #BD9652; font-weight: 700;" id="preview-scanner-text">⚡ ALIGN BARCODE [AISLE 04 - BIN B-12]</span>
              </div>
              <button type="button" id="preview-pick-btn" style="width: 100%; padding: 6px; background: #BD9652; color: #0E1116; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Confirm Picked Units (20/20)</button>
            </div>

            <!-- Preview 3: Thermal Receipt Output -->
            <div style="background: #FFFFFF; color: #0E1116; border-radius: 6px; padding: 14px; font-family: var(--stokrova-font-mono); font-size: 0.7rem; line-height: 1.4;">
              <div style="text-align: center; font-weight: 800; font-size: 0.85rem;" id="preview-receipt-name">${tenantName}</div>
              <div style="text-align: center; font-size: 0.65rem; color: #555555; margin-bottom: 6px;" id="preview-receipt-slogan">Official Fiscal Receipt • ${branchName}</div>
              <div style="border-top: 1px dashed #000000; border-bottom: 1px dashed #000000; padding: 4px 0; margin: 4px 0;">
                1x Standard Merchandise Line ........... $0.00
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 700;">
                <span>TOTAL PAID (CASH):</span>
                <span>$0.00</span>
              </div>
              <div style="text-align: center; margin-top: 6px; font-size: 0.6rem; color: #444444;">
                QR CRYPTOGRAPHIC VERIFICATION • FISCAL SEAL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 27. SCOPED RBAC & STAFF MANAGEMENT (/settings/roles) -->
    <!-- ========================================== -->
    <div id="ws-view-rbac" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Staff Roster & Scoped Dynamic RBAC</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Manage employee accounts, assign granular role boundaries, and dispatch instant onboarding invitations.</p>
        </div>
        <button onclick="window.openStaffInviteModal ? window.openStaffInviteModal() : (window.stokrovaCustomerApp?.openStaffInviteModal ? window.stokrovaCustomerApp.openStaffInviteModal() : window.stokrovaApp?.openStaffInviteModal())" style="padding: 10px 20px; border-radius: 6px; background: var(--primary, ${brandColors.gold[500]}); color: #0E1116; border: none; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          + Invite / Add Staff Member
        </button>
      </div>

      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <div style="padding: 14px 18px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.9rem; color: ${tokens.textPrimary};">Active Company Staff Directory</span>
          <span style="font-size: 0.75rem; color: ${tokens.textMuted};" id="staff-count-badge">${isDemo ? '4 Staff Members Active' : '0 Staff Members Active'}</span>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.7rem;">
                <th style="padding: 12px 16px;">Staff Member & Email</th>
                <th style="padding: 12px 16px;">Assigned Role</th>
                <th style="padding: 12px 16px;">Operational Scope</th>
                <th style="padding: 12px 16px; text-align: center;">Status</th>
                <th style="padding: 12px 16px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="staff-table-body">
              ${isDemo ? `
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 16px; font-weight: 600;">
                  <div>Victoria Sterling</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">victoria@apex.com</div>
                </td>
                <td style="padding: 12px 16px;">
                  <span style="background: rgba(189,150,82,0.18); color: var(--primary, #BD9652); border: 1px solid var(--primary, #BD9652); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Business Owner</span>
                </td>
                <td style="padding: 12px 16px; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Tenant-Wide Wildcard (All Entities)</td>
                <td style="padding: 12px 16px; text-align: center;">
                  <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                  <span style="font-size: 0.75rem; color: ${tokens.textMuted};">Primary Owner</span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 16px; font-weight: 600;">
                  <div>David O'Connor</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">david@apex.com</div>
                </td>
                <td style="padding: 12px 16px;">
                  <span style="background: rgba(59,130,246,0.15); color: #3B82F6; border: 1px solid #3B82F6; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Store Manager</span>
                </td>
                <td style="padding: 12px 16px; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Branch: London Flagship</td>
                <td style="padding: 12px 16px; text-align: center;">
                  <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                  <button onclick="window.stokrovaApp?.resetStaffPin ? window.stokrovaApp.resetStaffPin('usr_david', this) : ${toastFn}('PIN reset email sent to david@apex.com')" style="padding: 4px 8px; border-radius: 4px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">Reset PIN</button>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 16px; font-weight: 600;">
                  <div>Emma Watson</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">emma@apex.com</div>
                </td>
                <td style="padding: 12px 16px;">
                  <span style="background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid #10B981; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Head Cashier</span>
                </td>
                <td style="padding: 12px 16px; color: ${tokens.textSecondary}; font-size: 0.8125rem;">London Flagship: Till REG-01</td>
                <td style="padding: 12px 16px; text-align: center;">
                  <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                  <button onclick="window.stokrovaApp?.auditStaffPermissions ? window.stokrovaApp.auditStaffPermissions('usr_emma', this) : ${toastFn}('Cash drawer permissions audited for Emma Watson')" style="padding: 4px 8px; border-radius: 4px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">Permissions</button>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 12px 16px; font-weight: 600;">
                  <div>Samuel Adebayo</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">samuel@apex.com</div>
                </td>
                <td style="padding: 12px 16px;">
                  <span style="background: rgba(245,158,11,0.15); color: #F59E0B; border: 1px solid #F59E0B; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Warehouse Operator</span>
                </td>
                <td style="padding: 12px 16px; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Birmingham DC: Zones A & B</td>
                <td style="padding: 12px 16px; text-align: center;">
                  <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                  <button onclick="window.stokrovaApp?.verifyDeviceFingerprint ? window.stokrovaApp.verifyDeviceFingerprint('usr_samuel', this) : ${toastFn}('Scanner device fingerprint verified for Samuel Adebayo')" style="padding: 4px 8px; border-radius: 4px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">Device Auth</button>
                </td>
              </tr>
              ` : `
              <tr id="staff-empty-row">
                <td colspan="5" style="padding: 24px; text-align: center; color: ${tokens.textMuted}; font-size: 0.875rem;">
                  No additional staff members provisioned. Click "+ Invite / Add Staff Member" to add team members.
                </td>
              </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pending Invitations Section -->
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
        <div style="padding: 14px 18px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border};">
          <span style="font-weight: 700; font-size: 0.9rem; color: ${tokens.textPrimary};">Pending Single-Sign-On Staff Invitations</span>
        </div>
        <div id="pending-invitations-list" style="padding: 16px 18px;">
          ${isDemo ? `
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${tokens.border}; padding-bottom: 10px; margin-bottom: 10px;">
            <div>
              <div style="font-weight: 600; font-size: 0.875rem;">Sarah Jenkins (sarah.j@apex.com)</div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Role: <strong>Inventory Specialist</strong> • Scope: <strong>Birmingham DC</strong></div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="navigator.clipboard?.writeText('https://stokrova.com/invite/tok_sso_sarah9912'); ${toastFn}('Copied secure invitation link to clipboard!')" style="padding: 5px 10px; border-radius: 4px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">Copy Invite Link</button>
              <button onclick="window.stokrovaApp?.resendStaffInvite ? window.stokrovaApp.resendStaffInvite('sarah.j@apex.com', this) : ${toastFn}('Invitation resent to sarah.j@apex.com')" style="padding: 5px 10px; border-radius: 4px; background: transparent; border: 1px solid ${tokens.border}; color: ${tokens.textSecondary}; font-size: 0.75rem; cursor: pointer;">Resend</button>
            </div>
          </div>
          ` : `
          <div id="pending-invitations-empty" style="text-align: center; color: ${tokens.textMuted}; font-size: 0.8125rem; padding: 12px;">
            No pending staff invitations.
          </div>
          `}
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- STAFF INVITATION MODAL DIALOG -->
    <!-- ========================================== -->
    <div id="modal-invite-staff" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; width: 100%; max-width: 520px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; color: ${tokens.textPrimary}; font-weight: 700;">Invite & Add Staff Member</h3>
            <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Provision worker account with role-scoped operational permissions</p>
          </div>
          <button onclick="window.closeStaffInviteModal ? window.closeStaffInviteModal() : (window.stokrovaCustomerApp?.closeStaffInviteModal ? window.stokrovaCustomerApp.closeStaffInviteModal() : window.stokrovaApp?.closeStaffInviteModal())" style="background: none; border: none; font-size: 1.4rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
        </div>

        <form id="form-invite-staff" onsubmit="window.handleStaffInviteSubmit ? window.handleStaffInviteSubmit(event) : (window.stokrovaCustomerApp?.handleStaffInviteSubmit ? window.stokrovaCustomerApp.handleStaffInviteSubmit(event) : window.stokrovaApp?.handleStaffInviteSubmit(event))">
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">STAFF FULL NAME *</label>
            <input id="invite-staff-name" type="text" required placeholder="e.g. Alex Morgan" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">WORK EMAIL ADDRESS *</label>
            <input id="invite-staff-email" type="email" required placeholder="staff@company.com" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">ASSIGNED ROLE *</label>
              <select id="invite-staff-role" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                <option value="Store Manager">Store Manager</option>
                <option value="Head Cashier" selected>Head Cashier</option>
                <option value="Warehouse Operator">Warehouse Operator</option>
                <option value="Procurement Officer">Procurement Officer</option>
                <option value="Financial Controller">Financial Controller</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">BRANCH / FACILITY *</label>
              <select id="invite-staff-branch" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                <option value="${branchName}" selected>${branchName}</option>
                <option value="All Branches (Tenant Wide)">All Branches (Tenant Wide)</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">TEMPORARY ACCESS PIN / PASSWORD *</label>
            <input id="invite-staff-pin" type="text" required placeholder="4-digit PIN (e.g. 1234)" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem; font-family: var(--stokrova-font-mono);" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button type="button" onclick="window.closeStaffInviteModal ? window.closeStaffInviteModal() : (window.stokrovaCustomerApp?.closeStaffInviteModal ? window.stokrovaCustomerApp.closeStaffInviteModal() : window.stokrovaApp?.closeStaffInviteModal())" style="padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
              Cancel
            </button>
            <button type="submit" style="padding: 10px 22px; border-radius: 6px; border: none; background: var(--primary, ${brandColors.gold[500]}); color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
              Send Invite & Add Staff →
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 27. HARDWARE PERIPHERALS (/settings/devices) -->
    <!-- ========================================== -->
    <div id="ws-view-devices" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Hardware Peripherals & ESC/POS Devices</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Hardware discovery, USB/Ethernet thermal printers, barcode scanners, and cash drawers.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 700;">Epson TM-T88VI Thermal Receipt Printer</div>
            <div style="font-size: 0.75rem; color: #4ADE80;">● Online (USB / Raw 9100)</div>
          </div>
          <button onclick="window.stokrovaApp?.testPrintHardware ? window.stokrovaApp.testPrintHardware(this) : ${toastFn}('Hardware test print job sent to Epson TM-T88VI!')" style="padding: 6px 14px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">Test Print</button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 28. WEBHOOKS & EDI EXCHANGE (/settings/integrations) -->
    <!-- ========================================== -->
    <div id="ws-view-integrations" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Webhooks, API Keys & EDI Exchange</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Outbound event webhooks, scoped REST/GraphQL credentials, and EDIFACT standard interchange.</p>
      ${isDemo ? `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700;">Outbound Webhooks Configured (3 Active)</div>
        <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-top: 4px; line-height: 1.6;">
          • <code>order.completed</code> → https://api.apex-logistics.eu/webhooks/orders<br>
          • <code>stock.depleted</code> → https://api.apex-logistics.eu/webhooks/inventory<br>
          • <code>till.variance_alert</code> → https://compliance.apex-logistics.eu/alerts
        </div>
      </div>
      ` : `
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 36px 20px; text-align: center; color: ${tokens.textMuted};">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">🔌</div>
        <div style="font-weight: 600; color: ${tokens.textSecondary};">No outbound webhooks or EDI connections configured</div>
        <div style="font-size: 0.8125rem; margin-top: 4px;">Connect external ERPs, eCommerce storefronts, or carrier telemetry webhooks.</div>
      </div>
      `}
    </div>

    <!-- ========================================== -->
    <!-- 29. WORKFLOW AUTOMATION STUDIO (/workflows) -->
    <!-- ========================================== -->
    <div id="ws-view-workflows" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Visual Workflow Automation Studio</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Orchestrates automated business logic with validated multi-step execution flows.</p>
        </div>
        <button onclick="window.stokrovaApp?.simulateWorkflowDryRun ? window.stokrovaApp.simulateWorkflowDryRun(this) : ${toastFn}('Workflow dry-run simulation executed: 0 cycles, 3 steps completed.')" style="padding: 8px 16px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          ▶ Run Workflow Test
        </button>
      </div>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 24px;">
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div style="background: ${tokens.cardHover}; border: 1px solid ${brandColors.gold[500]}; padding: 14px 18px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.7rem; color: ${brandColors.gold[400]}; font-weight: 700;">TRIGGER</div>
            <div style="font-weight: 700; font-size: 0.875rem; margin-top: 2px;">Wholesale Order Placed</div>
          </div>
          <span style="color: ${brandColors.gold[400]}; font-weight: 900; font-size: 1.2rem;">→</span>
          <div style="background: ${tokens.cardHover}; border: 1px solid #3B82F6; padding: 14px 18px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.7rem; color: #3B82F6; font-weight: 700;">CONDITION</div>
            <div style="font-weight: 700; font-size: 0.875rem; margin-top: 2px;">Credit Limit & Balance OK</div>
          </div>
          <span style="color: ${brandColors.gold[400]}; font-weight: 900; font-size: 1.2rem;">→</span>
          <div style="background: ${tokens.cardHover}; border: 1px solid #4ADE80; padding: 14px 18px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.7rem; color: #4ADE80; font-weight: 700;">ACTION</div>
            <div style="font-weight: 700; font-size: 0.875rem; margin-top: 2px;">Auto-Reserve Serial Stock</div>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Renders the standalone Executive Operations Command Center dashboard view.
 */
export function renderWorkspaceDashboard(options: WorkspaceViewsOptions = {}): string {
  const fullHtml = renderAllWorkspaceViewsHtml(options);
  const match = fullHtml.match(/<div id="ws-view-dashboard"[\s\S]*?<\/div>\s*<!-- ========================================== -->\s*<!-- 2\. POINT OF SALE/);
  if (match) {
    return match[0].replace(/<!-- ========================================== -->\s*<!-- 2\. POINT OF SALE/, '').trim();
  }
  return fullHtml;
}

/**
 * Renders the standalone Staff Roster & Scoped Dynamic RBAC workspace view.
 */
export function renderStaffRosterWorkspace(options: WorkspaceViewsOptions = {}): string {
  const fullHtml = renderAllWorkspaceViewsHtml(options);
  const startIdx = fullHtml.indexOf('id="ws-view-rbac"');
  if (startIdx !== -1) {
    const endIdx = fullHtml.indexOf('id="ws-view-devices"', startIdx);
    if (endIdx !== -1) {
      return fullHtml.slice(startIdx - 5, endIdx - 20).trim();
    }
  }
  return fullHtml;
}

/**
 * Renders the standalone Rebranding & Corporate Identity workspace view.
 */
export function renderRebrandingStudioWorkspace(options: WorkspaceViewsOptions = {}): string {
  const fullHtml = renderAllWorkspaceViewsHtml(options);
  const startIdx = fullHtml.indexOf('id="ws-view-rebranding"');
  if (startIdx !== -1) {
    const endIdx = fullHtml.indexOf('id="ws-view-rbac"', startIdx);
    if (endIdx !== -1) {
      return fullHtml.slice(startIdx - 5, endIdx - 20).trim();
    }
  }
  return fullHtml;
}

