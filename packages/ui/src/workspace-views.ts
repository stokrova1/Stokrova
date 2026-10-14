/**
 * STOKROVA Workspace Views & Master Navigation Engine
 * Pure TypeScript UI rendering engine providing comprehensive, interactive,
 * high-density views for all 12 platform domains, 8 master sections, and 28+ modules.
 * WCAG AAA compliant, zero runtime dependencies, strictly typed.
 */

import { themeTokens, brandColors, semanticTokens } from './tokens.js';
import { MASTER_NAVIGATION_SECTIONS, type NavigationSection } from './navigation.js';

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
    nav_tax: 'tax',
    nav_dashboards: 'dashboard',
    nav_abc: 'abc',
    nav_audit: 'audit',
    nav_compliance: 'compliance',
    nav_org: 'org',
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
  nav_tax: '🧾',
  nav_dashboards: '📊',
  nav_abc: '📈',
  nav_audit: '🛡️',
  nav_compliance: '🔒',
  nav_org: '🏛️',
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
  const activeViewId = options.activeViewId || 'dashboard';
  const clickFn = options.onItemClickFnName || 'window.stokrovaCustomerApp.showWsView';

  // Sections with Workflows attached to Platform Administration
  const sections: NavigationSection[] = [
    ...MASTER_NAVIGATION_SECTIONS,
    {
      id: 'automation',
      title: 'Workflow Automation',
      items: [
        {
          id: 'nav_workflows',
          label: 'DAG Workflows Studio',
          path: '/workflows',
          icon: 'git-branch',
          shortcut: 'W',
          requiredPermission: 'workflows.manage',
        },
      ],
    },
  ];

  const sectionsHtml = sections
    .map((sec) => {
      const itemsHtml = sec.items
        .map((item) => {
          const viewId = getViewIdFromNavId(item.id);
          const isActive = viewId === activeViewId;
          const emoji = MODULE_EMOJIS[item.id] || '◆';
          const shortcutHtml = item.shortcut
            ? `<kbd style="border: 1px solid ${tokens.borderStrong}; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono, monospace);">${item.shortcut}</kbd>`
            : '';

          return `
            <div id="ws-nav-${viewId}" class="workspace-nav-item ${isActive ? 'active' : ''}" data-view-id="${viewId}" data-nav-id="${item.id}" onclick="${clickFn}('${viewId}')" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; margin: 1px 4px; border-radius: 6px; font-size: 0.8125rem; cursor: pointer; text-decoration: none; transition: all 0.12s ease; ${
            isActive
              ? `background: rgba(189,150,82,0.15); color: ${brandColors.gold[400]}; font-weight: 600; border-left: 3px solid ${brandColors.gold[500]};`
              : `color: ${tokens.textSecondary};`
          }">
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
        <div class="workspace-nav-section" id="ws-sec-${sec.id}" style="margin-bottom: 12px;">
          <div style="padding: 8px 12px 4px 12px; font-size: 0.6875rem; font-weight: 700; color: ${tokens.textMuted}; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; justify-content: space-between;">
            <span>${sec.title}</span>
            <span style="font-size: 0.65rem; color: ${tokens.borderStrong}; font-family: monospace;">${sec.items.length}</span>
          </div>
          <div class="section-items-list">${itemsHtml}</div>
        </div>
      `.trim();
    })
    .join('\n');

  return `
    <aside class="workspace-sidebar" style="width: 270px; background: ${tokens.surface}; border-right: 1px solid ${tokens.border}; padding: 12px 4px; display: flex; flex-direction: column; overflow-y: auto; height: 100%;">
      ${sectionsHtml}
      <div style="margin-top: auto; padding: 12px 14px; border-top: 1px solid ${tokens.border}; font-size: 0.75rem; color: ${tokens.textMuted}; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Tenant Scope:</span>
          <span style="color: ${tokens.textPrimary}; font-weight: 600;">${options.tenantName || 'Apex Global Ltd'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Branch:</span>
          <span style="color: ${brandColors.gold[400]}; font-weight: 600;">${options.branchName || 'London Flagship'}</span>
        </div>
        <div style="font-size: 0.6875rem; color: #4ADE80; margin-top: 2px;">● Rule 21 Tenant Isolation Active</div>
      </div>
    </aside>
  `.trim();
}

/**
 * Generates all 28 view panels + DAG workflows with realistic, high-density operational data.
 */
export function renderAllWorkspaceViewsHtml(options: WorkspaceViewsOptions = {}): string {
  const theme = options.theme || 'dark';
  const tokens = themeTokens[theme];
  const st = semanticTokens;
  const toastFn = options.onActionToastFnName || 'window.stokrovaCustomerApp.showToast';

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
            🏢 Apex Global Retail Ltd (All Branches)
          </span>
          <button onclick="${toastFn}('Exporting executive board analytics as sanitized CSV / PDF...')" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; padding: 6px 14px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
            📥 Export Report
          </button>
        </div>
      </div>

      <!-- Top 4 Executive KPI Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Gross Merchandise Value (GMV)</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono); margin-top: 6px;">$4,850,000.00</div>
          <div style="font-size: 0.75rem; color: ${st.success[theme].text}; margin-top: 4px;">▲ +18.4% vs last month</div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Today's Net Revenue</div>
          <div class="stokrova-net-revenue" style="font-size: 1.8rem; font-weight: 800; color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono); margin-top: 6px;">$382,000.00</div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">Gross Margin: <strong>38.50%</strong> (3850 bps)</div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Stockout Risk Index</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #4ADE80; font-family: var(--stokrova-font-mono); margin-top: 6px;">4 / 100</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Warehouse Utilization: <strong>78.5%</strong></div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 700; text-transform: uppercase;">Till Cashier Variance</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #4ADE80; font-family: var(--stokrova-font-mono); margin-top: 6px;">$0.00</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;"><strong>6 Active Till Sessions</strong> across 3 stores</div>
        </div>
      </div>

      <!-- Velocity Graph & Operational Alerts Panel -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 1rem; color: ${tokens.textPrimary};">Multi-Channel Revenue Velocity</h3>
            <span style="font-size: 0.75rem; color: ${tokens.textMuted};">Throughput Streams</span>
          </div>
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
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
          <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: ${tokens.textPrimary};">Live Operational Alerts</h3>
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
        </div>
      </div>

      <!-- Capital Efficiency Intelligence -->
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: ${tokens.textPrimary};">Working Capital & Inventory Efficiency (Rule 26)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Inventory Turnover Ratio (ITR)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">8.4x / year</div>
          </div>
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Days Inventory Outstanding (DIO)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">43.4 Days</div>
          </div>
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">GMROI (Gross Margin Return)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #4ADE80; margin-top: 4px;">285%</div>
          </div>
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid ${tokens.border};">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Tied-Up Working Capital</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${brandColors.gold[400]}; margin-top: 4px;">$1,240,000.00</div>
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
            <button type="button" onclick="(window.stokrovaCustomerApp || window.stokrovaApp).addItemToCart('LAPTOP-PRO-16', 'Apex Pro 16 Laptop', 2499.00)" style="padding: 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; text-align: left; cursor: pointer; color: ${tokens.textPrimary};">
              <div style="font-weight: 700; font-size: 0.875rem;">Apex Pro 16 Laptop</div>
              <div style="color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; margin-top: 4px;">$2,499.00</div>
            </button>
            <button type="button" onclick="(window.stokrovaCustomerApp || window.stokrovaApp).addItemToCart('SMARTPHONE-ULTRA-5G', 'Apex Ultra 5G Phone', 999.00)" style="padding: 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; text-align: left; cursor: pointer; color: ${tokens.textPrimary};">
              <div style="font-weight: 700; font-size: 0.875rem;">Apex Ultra 5G Phone</div>
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
            <span>Total Due:</span>
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
              <td style="padding: 14px 16px;">London Flagship POS</td>
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
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 5. QUOTATIONS & B2B (/quotes) -->
    <!-- ========================================== -->
    <div id="ws-view-quotes" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Quotations & Wholesale B2B Contracts</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Price tiering, margin protection rules, and quotation conversion workflows.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Active Quote: QT-2026-042 (Metro Stores PLC)</div>
        <p style="font-size: 0.875rem; color: ${tokens.textSecondary}; margin: 0 0 16px 0;">Quote Amount: $45,000.00 • Calculated Gross Margin: 24.20% (Pre-Approved)</p>
        <button onclick="${toastFn}('Quotation converted to confirmed Sales Order SO-2026-904!')" style="padding: 8px 16px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          Convert to Confirmed Sales Order →
        </button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 6. CRM & ACCOUNTS (/crm) -->
    <!-- ========================================== -->
    <div id="ws-view-crm" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">CRM & Customer Accounts Directory</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Credit balances, payment reliability ratings, and contact profiles.</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
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
        <button onclick="${toastFn}('Opening SKU / Variant creation modal...')" style="padding: 8px 16px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
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
            <tr style="border-bottom: 1px solid ${tokens.border};">
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">LAPTOP-PRO-16</td>
              <td style="padding: 14px 16px;">Apex Pro 16-inch Workstation Laptop</td>
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono);">5011000000018</td>
              <td style="padding: 14px 16px; color: #4ADE80; font-weight: 600;">40 units</td>
              <td style="padding: 14px 16px; text-align: right; color: ${tokens.textMuted};">$1,200.00</td>
              <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$2,499.00</td>
            </tr>
            <tr style="border-bottom: 1px solid ${tokens.border};">
              <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">SMARTPHONE-ULTRA-5G</td>
              <td style="padding: 14px 16px;">Apex Ultra 5G Smartphone 256GB</td>
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
        <div style="border-bottom: 1px solid ${tokens.border}; padding-bottom: 10px;">
          <div style="color: ${brandColors.gold[400]};">MVMT-2026-10-8812 | LAPTOP-PRO-16</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 16px;">RECEIVING-DOCK → A-01-02-03 (Qty: +20) • Op: samuel.adebayo • Reason: PURCHASE_RECEIPT</div>
        </div>
        <div>
          <div style="color: ${brandColors.gold[400]};">MVMT-2026-10-8811 | SHIRT-OXFORD-BLU-M</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 16px;">A-01-02-04 → DISPATCH-BAY-1 (Qty: -12) • Op: david.oconnor • Reason: POS_SALE</div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 9. WAREHOUSES & 8-TIER BINS (/inventory/locations) -->
    <!-- ========================================== -->
    <div id="ws-view-locations" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Warehouses & 8-Tier Bin Hierarchy</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Company → Division → Facility → Zone → Aisle → Rack → Shelf → Bin.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700; margin-bottom: 12px; color: ${brandColors.gold[400]};">🏢 London Central Distribution Hub (FCL-LON-01)</div>
        <div style="margin-left: 20px; border-left: 2px dashed ${tokens.borderStrong}; padding-left: 16px; font-size: 0.875rem;">
          <div style="margin-bottom: 8px;">📦 <strong>Zone A (High-Value Tech)</strong> • Aisle 01 • Rack 02 • Shelf 03 • <code>Bin A-01-02-03</code> (Capacity: 80% Occupied)</div>
          <div style="margin-bottom: 8px;">❄️ <strong>Zone B (Cold-Chain 2-8°C)</strong> • Aisle 02 • Rack 01 • Shelf 01 • <code>Bin B-02-01-01</code> (Vaccine Ampoules)</div>
          <div>🚚 <strong>Outbound Dispatch Dock</strong> • Bay 01 & 02 • Active Pallet Staging Area</div>
        </div>
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
          <div style="font-size: 1.5rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">245 Units</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Active Customer Reservations</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #F59E0B; margin-top: 4px;">35 Units</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Confirmed Inbound (PO-89)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #3B82F6; margin-top: 4px;">+100 Units</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Available To Promise (ATP)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #4ADE80; margin-top: 4px;">310 Units</div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 11. SUPPLIERS & CATALOGS (/procurement/suppliers) -->
    <!-- ========================================== -->
    <div id="ws-view-suppliers" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Suppliers & Procurement Catalogs</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Vendor directory, contractual lead times, and performance ratings.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${tokens.border}; padding-bottom: 10px; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 700;">Intel Corporation UK Ltd</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Lead Time: 5 Days • On-Time Rating: 99.2% • Currency: USD</div>
          </div>
          <button onclick="${toastFn}('Requesting Request for Quotation (RFQ)...')" style="padding: 6px 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Request RFQ</button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700;">Samsung Electronics Logistics Europe</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Lead Time: 7 Days • On-Time Rating: 98.4% • Currency: EUR</div>
          </div>
          <button onclick="${toastFn}('Requesting Request for Quotation (RFQ)...')" style="padding: 6px 12px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Request RFQ</button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 12. PURCHASE ORDERS (/procurement/orders) -->
    <!-- ========================================== -->
    <div id="ws-view-po" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Purchase Orders (PO) Management</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Issuing purchase requisitions, landed cost allocations, and goods receiving.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700; color: ${brandColors.gold[400]};">PO-2026-089 • Intel Corporation ($48,000.00 USD)</div>
        <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-top: 4px;">Status: PARTIALLY_RECEIVED • 20/40 Workstations received at London Dock</div>
        <div style="margin-top: 12px;">
          <button onclick="${toastFn}('Recording inbound receiving for PO-2026-089...')" style="padding: 6px 14px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 4px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">Receive Goods (GRN)</button>
        </div>
      </div>
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
            <tr>
              <td style="padding: 12px 14px; font-weight: 600;">LAPTOP-PRO-16</td>
              <td style="padding: 12px 14px; text-align: center;">20</td>
              <td style="padding: 12px 14px; text-align: center;">20</td>
              <td style="padding: 12px 14px; text-align: center;">20</td>
              <td style="padding: 12px 14px; text-align: center;"><span style="color: #4ADE80; font-weight: 700;">✓ MATCHED</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 14. WAVE & ZONE PICKING (/logistics/picking) -->
    <!-- ========================================== -->
    <div id="ws-view-picking" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Wave & Zone Warehouse Picking</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Route-optimized pick lists, barcode scan verification, and batch staging.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700;">WAVE-LON-042 • Zone A & B</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Picker: Samuel Adebayo • 18 Items • 75% Completed</div>
          </div>
          <button onclick="${toastFn}('Wave-042 marked completed and sent to packing dock.')" style="padding: 6px 12px; background: #14291F; color: #4ADE80; border: 1px solid #1E4620; border-radius: 6px; font-weight: 600; font-size: 0.75rem; cursor: pointer;">Complete Wave</button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 15. CONTAINERIZATION & BOL (/logistics/dispatch) -->
    <!-- ========================================== -->
    <div id="ws-view-dispatch" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Containerization & Bills of Lading (BOL)</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Pallet SSCC-18 barcodes, container gross weight checks, and carrier manifests.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;">
        <div>PALLET SSCC-18: 006141411234567890</div>
        <div style="color: ${tokens.textSecondary}; margin-top: 4px;">Cartons: 24 • Gross Weight: 420 kg • Destination: Birmingham Hub</div>
        <div style="margin-top: 14px;">
          <button onclick="${toastFn}('Printing official Bill of Lading (BOL)...')" style="padding: 6px 14px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 4px; font-weight: 700; cursor: pointer;">Print BOL Manifest</button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 16. FLEET & PROOF OF DELIVERY (/logistics/fleet) -->
    <!-- ========================================== -->
    <div id="ws-view-fleet" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Fleet & Proof of Delivery (POD)</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Delivery manifests, vehicle tracking, GPS waypoints, and recipient signatures.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700;">Delivery Route RUN-LON-01 • Mercedes Sprinter (Reg: LK26 XYZ)</div>
        <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-top: 4px;">Driver: Mark Davies • 4/6 Drops Complete (All with signature POD & photo)</div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 17. BILLS OF MATERIALS (/manufacturing/boms) -->
    <!-- ========================================== -->
    <div id="ws-view-bom" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Bills of Materials (BOM) & Recipes</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Multi-level assembly trees, component quantities, scrap factors, and standard costing.</p>
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
    </div>

    <!-- ========================================== -->
    <!-- 18. PRODUCTION ORDERS (/manufacturing/orders) -->
    <!-- ========================================== -->
    <div id="ws-view-mo" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Production Work Orders</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Work center scheduling, raw material reservations, and output recording.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700;">WO-2026-014 • Work Center: Assembly Bay 01</div>
        <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-top: 4px;">Target: 50x LAPTOP-PRO-16 • Status: IN_PROGRESS (30/50 assembled)</div>
        <div style="margin-top: 12px;">
          <button onclick="${toastFn}('Output logged: 10 finished laptops posted to inventory asset ledger.')" style="padding: 6px 14px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 4px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">Record Output (10 units)</button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 19. TILL SESSIONS & CASH COUNT (/registers) -->
    <!-- ========================================== -->
    <div id="ws-view-registers" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Till Sessions & Blind Cash Reconciliation</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Daily opening float, mid-shift drops, blind closing count, and cash variance audit.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-weight: 700;">Till Register 01 (London Flagship)</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Cashier: Emma Watson • Float: $250.00 • Active Sales: $3,450.00</div>
          <div style="font-size: 0.75rem; color: #4ADE80; margin-top: 8px;">● 0 Cashier Discrepancy</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-weight: 700;">Till Register 02 (London Flagship)</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Cashier: Liam Vance • Float: $250.00 • Active Sales: $2,890.00</div>
          <div style="font-size: 0.75rem; color: #4ADE80; margin-top: 8px;">● 0 Cashier Discrepancy</div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 20. GENERAL LEDGER (/finance/ledger) -->
    <!-- ========================================== -->
    <div id="ws-view-gl" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Double-Entry General Ledger</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Authoritative financial truth. Debits equal Credits at all times (Rule 11).</p>
      <div id="ws-ledger-entries" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; display: flex; flex-direction: column; gap: 14px;">
        <div class="ledger-row" style="border-bottom: 1px solid ${tokens.border}; padding-bottom: 12px;">
          <div style="color: #4ADE80; margin-bottom: 4px;">✓ JRNL-2026-10-001 | Sales Order SO-2026-001</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 20px;">DR 1010 Cash at Bank: $2,499.00</div>
          <div style="color: ${tokens.textSecondary}; margin-left: 20px;">CR 4010 Retail Revenue: $2,499.00</div>
          <div style="color: ${tokens.textMuted}; font-size: 0.75rem; margin-left: 20px; margin-top: 2px;">Delta: $0.00 (Balanced Double-Entry)</div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 21. FISCAL E-INVOICING & TAX (/finance/tax) -->
    <!-- ========================================== -->
    <div id="ws-view-tax" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Fiscal E-Invoicing & Taxes</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Multi-jurisdiction VAT/sales tax schedules, QR fiscal stamps, and compliance exports.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700;">UK Standard VAT 20.00% (Accrued: $63,666.67)</div>
        <p style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin: 4px 0 14px 0;">All transactions signed with SHA-256 tamper-proof fiscal hash chain.</p>
        <button onclick="${toastFn}('Exporting fiscal tax package for HM Revenue & Customs...')" style="padding: 8px 16px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 6px; font-size: 0.8125rem; cursor: pointer;">Export Fiscal Audit File</button>
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
          <div style="font-size: 1.5rem; font-weight: 800; color: ${tokens.textPrimary}; margin-top: 4px;">12 SKUs</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Revenue: $305,600.00 • High Replenishment Priority</div>
        </div>
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.75rem; color: #F59E0B; font-weight: 700;">DEAD STOCK ALERT (180+ DAYS)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #F59E0B; margin-top: 4px;">2 SKUs</div>
          <div style="font-size: 0.8125rem; color: ${tokens.textMuted}; margin-top: 4px;">Tied-Up Capital: $18,400.00 • Markdown Recommended</div>
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
        <div style="color: #4ADE80; margin-bottom: 6px;">✓ MERKLE_ROOT: 8f49a2c3e1b7... (Tree verified intact)</div>
        <div style="color: ${tokens.textSecondary}; line-height: 1.6;">
          • [2026-10-14 14:22:01] EVENT: POS_CHECKOUT | Actor: emma.watson | Ref: POS-SALE-9912<br>
          • [2026-10-14 13:45:10] EVENT: STOCK_TRANSFER | Actor: samuel.adebayo | Ref: TR-LON-BIR-042<br>
          • [2026-10-14 11:15:30] EVENT: USER_LOGIN | Actor: victoria.sterling | IP: 192.168.1.42
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
        <div style="font-weight: 700; color: ${brandColors.gold[400]};">Holding: Apex Global Retail & Logistics Ltd</div>
        <div style="margin-left: 16px; margin-top: 8px; font-size: 0.8125rem; color: ${tokens.textSecondary}; line-height: 1.6;">
          • Subsidiary 1: Apex Retail UK Ltd (GBP • 3 Storefronts)<br>
          • Subsidiary 2: Apex US Distribution Inc (USD • 2 Distribution Centers)
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 26. SCOPED RBAC & ROLES (/settings/roles) -->
    <!-- ========================================== -->
    <div id="ws-view-rbac" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Scoped Dynamic RBAC & Staff Accounts</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Assign roles across specific branches, warehouses, or registers with cryptographic security PINs.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.875rem;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid ${tokens.border}; padding-bottom: 8px;">
            <span>Victoria Sterling (victoria@apex.com)</span>
            <span style="color: ${brandColors.gold[400]}; font-weight: 700;">Business Owner (Full Wildcard Access)</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid ${tokens.border}; padding-bottom: 8px;">
            <span>David O'Connor (david@apex.com)</span>
            <span style="color: #3B82F6; font-weight: 600;">Store Manager (London Flagship)</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid ${tokens.border}; padding-bottom: 8px;">
            <span>Emma Watson (emma@apex.com)</span>
            <span style="color: #10B981; font-weight: 600;">Cashier (Register 01)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Samuel Adebayo (samuel@apex.com)</span>
            <span style="color: #F59E0B; font-weight: 600;">Warehouse Operator (Zone A & B)</span>
          </div>
        </div>
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
          <button onclick="${toastFn}('Hardware test print job sent to Epson TM-T88VI!')" style="padding: 6px 14px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">Test Print</button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 28. WEBHOOKS & EDI EXCHANGE (/settings/integrations) -->
    <!-- ========================================== -->
    <div id="ws-view-integrations" class="ws-view-content" style="display: none;">
      <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Webhooks, API Keys & EDI Exchange</h1>
      <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Outbound event webhooks, scoped REST/GraphQL credentials, and EDIFACT standard interchange.</p>
      <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
        <div style="font-weight: 700;">Outbound Webhooks Configured (3 Active)</div>
        <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; margin-top: 4px; line-height: 1.6;">
          • <code>order.completed</code> → https://api.apex-logistics.eu/webhooks/orders<br>
          • <code>stock.depleted</code> → https://api.apex-logistics.eu/webhooks/inventory<br>
          • <code>till.variance_alert</code> → https://compliance.apex-logistics.eu/alerts
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 29. DAG WORKFLOWS STUDIO (/workflows) -->
    <!-- ========================================== -->
    <div id="ws-view-workflows" class="ws-view-content" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: ${tokens.textPrimary};">Visual DAG Workflows Studio</h1>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Orchestrates automated business logic with Kahn's algorithm cycle detection.</p>
        </div>
        <button onclick="${toastFn}('Workflow dry-run simulation executed: 0 cycles, 3 steps completed.')" style="padding: 8px 16px; background: ${brandColors.gold[500]}; color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
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
