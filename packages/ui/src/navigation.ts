/**
 * STOKROVA Master Navigation Blueprint & App Shell Models
 * Maps the 12 platform domains into ergonomic, role-filtered navigation items.
 */

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  shortcut?: string;
  badge?: string;
  requiredPermission?: string;
}

export interface NavigationSection {
  id: string;
  title: string;
  items: NavigationItem[];
}

export interface WorkspaceContext {
  tenantId: string;
  tenantName: string;
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  activeTillSessionId?: string | null;
  userRoleCodes: string[];
  userPermissions: string[];
}

export const MASTER_NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    id: 'commerce',
    title: 'Commerce & Sales',
    items: [
      { id: 'nav_pos', label: 'Point of Sale (POS)', path: '/pos', icon: 'calculator', shortcut: 'F1', requiredPermission: 'pos.transact' },
      { id: 'nav_orders', label: 'Sales Orders', path: '/orders', icon: 'shopping-bag', shortcut: 'O', requiredPermission: 'sales.read' },
      { id: 'nav_invoices', label: 'Invoices & Payments', path: '/invoices', icon: 'credit-card', shortcut: 'I', requiredPermission: 'finance.read' },
      { id: 'nav_quotes', label: 'Quotations & B2B', path: '/quotes', icon: 'file-text', requiredPermission: 'sales.read' },
      { id: 'nav_crm', label: 'CRM & Accounts', path: '/crm', icon: 'users', shortcut: 'C', requiredPermission: 'customers.read' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory & Locations',
    items: [
      { id: 'nav_catalog', label: 'Products & Variants', path: '/catalog/products', icon: 'tag', shortcut: 'P', requiredPermission: 'catalog.read' },
      { id: 'nav_ledger', label: 'Stock Movement Ledger', path: '/inventory/ledger', icon: 'layers', shortcut: 'M', requiredPermission: 'inventory.read' },
      { id: 'nav_locations', label: 'Warehouses & 8-Tier Bins', path: '/inventory/locations', icon: 'map-pin', requiredPermission: 'warehouse.read' },
      { id: 'nav_availability', label: 'Stock Availability Engine', path: '/inventory/availability', icon: 'box', requiredPermission: 'inventory.read' },
    ],
  },
  {
    id: 'procurement',
    title: 'Procurement & Supply',
    items: [
      { id: 'nav_suppliers', label: 'Suppliers & Catalogs', path: '/procurement/suppliers', icon: 'truck', requiredPermission: 'procurement.read' },
      { id: 'nav_po', label: 'Purchase Orders (PO)', path: '/procurement/orders', icon: 'clipboard', requiredPermission: 'procurement.read' },
      { id: 'nav_receiving', label: 'Goods Receipt & 3-Way Match', path: '/procurement/receiving', icon: 'check-square', requiredPermission: 'procurement.write' },
    ],
  },
  {
    id: 'logistics',
    title: 'Logistics & Delivery',
    items: [
      { id: 'nav_picking', label: 'Wave & Zone Picking', path: '/logistics/picking', icon: 'package', requiredPermission: 'warehouse.pick' },
      { id: 'nav_dispatch', label: 'Containerization & BOL', path: '/logistics/dispatch', icon: 'send', requiredPermission: 'warehouse.dispatch' },
      { id: 'nav_fleet', label: 'Fleet & Proof of Delivery', path: '/logistics/fleet', icon: 'navigation', requiredPermission: 'delivery.read' },
    ],
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    items: [
      { id: 'nav_bom', label: 'Bills of Materials (BOM)', path: '/manufacturing/boms', icon: 'cpu', requiredPermission: 'manufacturing.read' },
      { id: 'nav_mo', label: 'Production Work Orders', path: '/manufacturing/orders', icon: 'activity', requiredPermission: 'manufacturing.read' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Cash Truth',
    items: [
      { id: 'nav_registers', label: 'Till Sessions & Cash Count', path: '/registers', icon: 'dollar-sign', shortcut: 'R', requiredPermission: 'registers.manage' },
      { id: 'nav_gl', label: 'Double-Entry General Ledger', path: '/finance/ledger', icon: 'book', requiredPermission: 'finance.gl.read' },
      { id: 'nav_tax', label: 'Fiscal E-Invoicing & Taxes', path: '/finance/tax', icon: 'percent', requiredPermission: 'finance.tax.manage' },
    ],
  },
  {
    id: 'intelligence',
    title: 'Analytics & Governance',
    items: [
      { id: 'nav_dashboards', label: 'Executive Dashboard', path: '/analytics/dashboards', icon: 'bar-chart-2', shortcut: 'D', requiredPermission: 'analytics.read' },
      { id: 'nav_abc', label: 'ABC Velocity & Dead Stock', path: '/analytics/inventory', icon: 'pie-chart', requiredPermission: 'analytics.read' },
      { id: 'nav_audit', label: 'Audit Forensics & Merkle Ledger', path: '/audit/forensics', icon: 'shield', shortcut: 'S', requiredPermission: 'audit.read' },
      { id: 'nav_compliance', label: 'GDPR & SOX 404 Compliance', path: '/compliance', icon: 'lock', requiredPermission: 'compliance.read' },
    ],
  },
  {
    id: 'settings',
    title: 'Platform Administration',
    items: [
      { id: 'nav_org', label: 'Tenant & Companies', path: '/settings/organization', icon: 'briefcase', requiredPermission: 'tenancy.manage' },
      { id: 'nav_rbac', label: 'Scoped RBAC & Staff Roles', path: '/settings/roles', icon: 'user-check', requiredPermission: 'rbac.manage' },
      { id: 'nav_devices', label: 'Hardware Peripherals & ESC/POS', path: '/settings/devices', icon: 'printer', requiredPermission: 'devices.manage' },
      { id: 'nav_integrations', label: 'Webhooks & EDI Exchange', path: '/settings/integrations', icon: 'git-pull-request', requiredPermission: 'integrations.manage' },
    ],
  },
];

/**
 * Filters the master navigation tree based on active user permissions.
 * If user has wildcard permissions ('*' or 'admin.*'), all items are accessible.
 */
export function buildUserNavigation(
  userPermissions: string[],
  sections: NavigationSection[] = MASTER_NAVIGATION_SECTIONS,
): NavigationSection[] {
  const isSuperUser = userPermissions.includes('*') || userPermissions.includes('admin.*');

  return sections
    .map((sec) => {
      const allowedItems = sec.items.filter((item) => {
        if (!item.requiredPermission || isSuperUser) return true;
        return userPermissions.includes(item.requiredPermission);
      });
      return { ...sec, items: allowedItems };
    })
    .filter((sec) => sec.items.length > 0);
}

/**
 * Searches navigation items for keyboard-driven quick launcher (Cmd+K / Ctrl+K).
 */
export function searchNavigationShortcuts(
  query: string,
  sections: NavigationSection[] = MASTER_NAVIGATION_SECTIONS,
): NavigationItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: NavigationItem[] = [];
  for (const sec of sections) {
    for (const item of sec.items) {
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchPath = item.path.toLowerCase().includes(q);
      const matchShortcut = item.shortcut?.toLowerCase() === q;
      if (matchLabel || matchPath || matchShortcut) {
        results.push(item);
      }
    }
  }
  return results;
}
