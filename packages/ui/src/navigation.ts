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

export interface CompanyBranding {
  companyLogoUrl?: string;
  logo_url?: string;
  companyName?: string;
  company_name?: string;
  brandPrimaryColor?: string;
  primary_color?: string;
  brandAccentColor?: string;
  accent_color?: string;
  currencySymbol?: string;
  currency_symbol?: string;
  receiptHeader?: {
    storeName?: string;
    storeAddress?: string;
    phone?: string;
    taxId?: string;
  };
  receiptFooter?: string;
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
  branding?: CompanyBranding;
}

export const MASTER_NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    id: 'commerce',
    title: 'Commerce & Sales',
    items: [
      { id: 'nav_pos', label: 'Point of Sale (POS)', path: '/pos', icon: 'calculator', shortcut: 'F1', requiredPermission: 'pos.checkout' },
      { id: 'nav_orders', label: 'Sales Orders', path: '/orders', icon: 'shopping-bag', shortcut: 'O', requiredPermission: 'sales.order.view' },
      { id: 'nav_invoices', label: 'Invoices & Payments', path: '/invoices', icon: 'credit-card', shortcut: 'I', requiredPermission: 'sales.invoice.view' },
      { id: 'nav_quotes', label: 'Quotations & B2B', path: '/quotes', icon: 'file-text', requiredPermission: 'sales.quotation.view' },
      { id: 'nav_crm', label: 'CRM & Accounts', path: '/crm', icon: 'users', shortcut: 'C', requiredPermission: 'customers.view' },
      { id: 'nav_pricing', label: 'Price Lists & Contracts', path: '/pricing/price-lists', icon: 'dollar-sign', requiredPermission: 'pricing.contracts.manage' },
      { id: 'nav_promotions', label: 'Promotions & Coupons', path: '/pricing/promotions', icon: 'percent', requiredPermission: 'promotions.campaign.manage' },
      { id: 'nav_loyalty', label: 'Loyalty Rewards', path: '/loyalty', icon: 'gift', requiredPermission: 'loyalty.program.manage' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory & Locations',
    items: [
      { id: 'nav_catalog', label: 'Products & Variants', path: '/catalog/products', icon: 'tag', shortcut: 'P', requiredPermission: 'catalog.view' },
      { id: 'nav_ledger', label: 'Stock Movement Ledger', path: '/inventory/ledger', icon: 'layers', shortcut: 'M', requiredPermission: 'inventory.view' },
      { id: 'nav_locations', label: 'Warehouses & 8-Tier Bins', path: '/inventory/locations', icon: 'map-pin', requiredPermission: 'warehouses.view' },
      { id: 'nav_availability', label: 'Stock Availability Engine', path: '/inventory/availability', icon: 'box', requiredPermission: 'inventory.view' },
    ],
  },
  {
    id: 'procurement',
    title: 'Procurement & Supply',
    items: [
      { id: 'nav_suppliers', label: 'Suppliers & Catalogs', path: '/procurement/suppliers', icon: 'truck', requiredPermission: 'suppliers.view' },
      { id: 'nav_po', label: 'Purchase Orders (PO)', path: '/procurement/orders', icon: 'clipboard', requiredPermission: 'procurement.order.view' },
      { id: 'nav_receiving', label: 'Goods Receipt & 3-Way Match', path: '/procurement/receiving', icon: 'check-square', requiredPermission: 'procurement.receipt.create' },
    ],
  },
  {
    id: 'logistics',
    title: 'Logistics & Delivery',
    items: [
      { id: 'nav_picking', label: 'Wave & Zone Picking', path: '/logistics/picking', icon: 'package', requiredPermission: 'inventory.pick' },
      { id: 'nav_dispatch', label: 'Containerization & BOL', path: '/logistics/dispatch', icon: 'send', requiredPermission: 'logistics.shipment.dispatch' },
      { id: 'nav_fleet', label: 'Fleet & Proof of Delivery', path: '/logistics/fleet', icon: 'navigation', requiredPermission: 'logistics.delivery_run.view' },
    ],
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    items: [
      { id: 'nav_bom', label: 'Bills of Materials (BOM)', path: '/manufacturing/boms', icon: 'cpu', requiredPermission: 'manufacturing.bom.view' },
      { id: 'nav_mo', label: 'Production Work Orders', path: '/manufacturing/orders', icon: 'activity', requiredPermission: 'manufacturing.order.view' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Cash Truth',
    items: [
      { id: 'nav_registers', label: 'Till Sessions & Cash Count', path: '/registers', icon: 'dollar-sign', shortcut: 'R', requiredPermission: 'registers.manage' },
      { id: 'nav_gl', label: 'Double-Entry General Ledger', path: '/finance/ledger', icon: 'book', requiredPermission: 'accounting.journals.view' },
      { id: 'nav_tax', label: 'Fiscal E-Invoicing & Taxes', path: '/finance/tax', icon: 'percent', requiredPermission: 'tax.view' },
      { id: 'nav_treasury', label: 'Treasury & Bank Feeds', path: '/finance/treasury', icon: 'briefcase', requiredPermission: 'treasury.view' },
      { id: 'nav_consolidation', label: 'Multi-Entity Consolidation', path: '/finance/consolidation', icon: 'globe', requiredPermission: 'consolidation.view' },
    ],
  },
  {
    id: 'intelligence',
    title: 'Analytics & Governance',
    items: [
      { id: 'nav_dashboards', label: 'Executive Dashboard', path: '/analytics/dashboards', icon: 'bar-chart-2', shortcut: 'D', requiredPermission: 'reporting.dashboard.view' },
      { id: 'nav_abc', label: 'ABC Velocity & Dead Stock', path: '/analytics/inventory', icon: 'pie-chart', requiredPermission: 'analytics.view' },
      { id: 'nav_audit', label: 'Audit Forensics & Merkle Ledger', path: '/audit/forensics', icon: 'shield', shortcut: 'S', requiredPermission: 'audit.view' },
      { id: 'nav_compliance', label: 'GDPR & SOX 404 Compliance', path: '/compliance', icon: 'lock', requiredPermission: 'audit.view' },
    ],
  },
  {
    id: 'settings',
    title: 'Platform Administration',
    items: [
      { id: 'nav_org', label: 'Tenant & Companies', path: '/settings/organization', icon: 'briefcase', requiredPermission: 'branches.manage' },
      { id: 'nav_rbac', label: 'Scoped RBAC & Staff Roles', path: '/settings/roles', icon: 'user-check', requiredPermission: 'roles.manage' },
      { id: 'nav_devices', label: 'Hardware Peripherals & ESC/POS', path: '/settings/devices', icon: 'printer', requiredPermission: 'devices.manage' },
      { id: 'nav_integrations', label: 'Webhooks & EDI Exchange', path: '/settings/integrations', icon: 'git-pull-request', requiredPermission: 'integration.manage' },
      { id: 'nav_workflows', label: 'DAG Workflows Studio', path: '/workflows', icon: 'git-branch', requiredPermission: 'workflows.manage' },
    ],
  },
];

/**
 * Mapping of canonical permissions to legacy aliases and module wildcards.
 * Guarantees that users with canonical permissions, legacy aliases, or module wildcards
 * seamlessly receive their authorized navigation items.
 */
export const PERMISSION_EQUIVALENTS: Record<string, string[]> = {
  'pos.transact': ['pos.checkout', 'pos.*'],
  'pos.checkout': ['pos.transact', 'pos.*'],
  'sales.read': ['sales.order.view', 'sales.quotation.view', 'sales.invoice.view', 'sales.*'],
  'sales.order.view': ['sales.read', 'sales.*'],
  'sales.invoice.view': ['finance.read', 'sales.read', 'sales.*', 'finance.*'],
  'sales.quotation.view': ['sales.read', 'sales.*'],
  'customers.read': ['customers.view', 'customers.*'],
  'customers.view': ['customers.read', 'customers.*'],
  'catalog.read': ['catalog.view', 'catalog.*'],
  'catalog.view': ['catalog.read', 'catalog.*'],
  'inventory.read': ['inventory.view', 'inventory.*'],
  'inventory.view': ['inventory.read', 'inventory.*'],
  'warehouse.read': ['warehouses.view', 'warehouse.*', 'inventory.*'],
  'warehouses.view': ['warehouse.read', 'warehouse.*', 'inventory.*'],
  'procurement.read': ['suppliers.view', 'procurement.order.view', 'procurement.*'],
  'suppliers.view': ['procurement.read', 'procurement.*'],
  'procurement.order.view': ['procurement.read', 'procurement.*'],
  'procurement.write': ['procurement.receipt.create', 'purchases.receive', 'procurement.*'],
  'procurement.receipt.create': ['procurement.write', 'purchases.receive', 'procurement.*'],
  'warehouse.pick': ['inventory.pick', 'warehouse.*', 'inventory.*'],
  'inventory.pick': ['warehouse.pick', 'warehouse.*', 'inventory.*'],
  'warehouse.dispatch': ['logistics.shipment.dispatch', 'warehouse.*', 'logistics.*'],
  'logistics.shipment.dispatch': ['warehouse.dispatch', 'logistics.*'],
  'delivery.read': ['logistics.delivery_run.view', 'delivery.*', 'logistics.*'],
  'logistics.delivery_run.view': ['delivery.read', 'delivery.*', 'logistics.*'],
  'manufacturing.read': ['manufacturing.bom.view', 'manufacturing.order.view', 'manufacturing.*'],
  'manufacturing.bom.view': ['manufacturing.read', 'manufacturing.*'],
  'manufacturing.order.view': ['manufacturing.read', 'manufacturing.*'],
  'finance.read': ['finance.view', 'accounting.journals.view', 'finance.*'],
  'finance.view': ['finance.read', 'finance.*'],
  'finance.gl.read': ['accounting.journals.view', 'finance.read', 'finance.*'],
  'accounting.journals.view': ['finance.gl.read', 'finance.read', 'finance.*'],
  'finance.tax.manage': ['tax.view', 'tax.manage', 'tax.*', 'finance.*'],
  'tax.view': ['finance.tax.manage', 'tax.manage', 'tax.*', 'finance.*'],
  'analytics.read': ['reporting.dashboard.view', 'analytics.view', 'analytics.*', 'reporting.*'],
  'reporting.dashboard.view': ['analytics.read', 'analytics.*', 'reporting.*'],
  'analytics.view': ['analytics.read', 'analytics.*'],
  'audit.read': ['audit.view', 'audit.*'],
  'audit.view': ['audit.read', 'compliance.read', 'audit.*'],
  'compliance.read': ['audit.view', 'audit.read', 'audit.*'],
  'tenancy.manage': ['branches.manage', 'tenancy.*'],
  'branches.manage': ['tenancy.manage', 'tenancy.*'],
  'rbac.manage': ['roles.manage', 'staff.manage', 'rbac.*'],
  'roles.manage': ['rbac.manage', 'rbac.*'],
  'staff.manage': ['rbac.manage', 'roles.manage', 'staff.*'],
  'devices.manage': ['devices.*'],
  'integrations.manage': ['integration.manage', 'integrations.*', 'integration.*'],
  'integration.manage': ['integrations.manage', 'integrations.*', 'integration.*'],
  'pricing.contracts.manage': ['pricing.*'],
  'promotions.campaign.manage': ['promotions.*', 'pricing.*'],
  'loyalty.program.manage': ['loyalty.*'],
  'treasury.view': ['treasury.*', 'finance.*'],
  'consolidation.view': ['consolidation.*', 'finance.*'],
  'workflows.manage': ['workflows.*'],
};

/**
 * Checks whether user has an item's required permission, supporting exact match,
 * superuser wildcard, module wildcard (e.g. 'sales.*'), and bidirectional aliases.
 */
function hasEffectivePermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes('*') || userPermissions.includes('admin.*')) {
    return true;
  }
  if (userPermissions.includes(required)) {
    return true;
  }
  const modulePrefix = required.split('.')[0] + '.*';
  if (userPermissions.includes(modulePrefix)) {
    return true;
  }
  const equivalents = PERMISSION_EQUIVALENTS[required] ?? [];
  for (const eq of equivalents) {
    if (userPermissions.includes(eq)) {
      return true;
    }
  }
  // Check if any user permission maps to this required permission
  for (const uPerm of userPermissions) {
    const userEquivalents = PERMISSION_EQUIVALENTS[uPerm] ?? [];
    if (userEquivalents.includes(required)) {
      return true;
    }
  }
  return false;
}

/**
 * Filters the master navigation tree based on active user permissions.
 * If user has wildcard permissions ('*' or 'admin.*'), all items are accessible.
 */
export function buildUserNavigation(
  userPermissions: string[],
  sections: NavigationSection[] = MASTER_NAVIGATION_SECTIONS,
): NavigationSection[] {
  return sections
    .map((sec) => {
      const allowedItems = sec.items.filter((item) => {
        if (!item.requiredPermission) return true;
        return hasEffectivePermission(userPermissions, item.requiredPermission);
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
