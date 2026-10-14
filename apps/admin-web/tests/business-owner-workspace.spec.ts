import { describe, it, expect } from 'vitest';
import {
  AdminWebShell,
  DashboardViewModel,
  ProcurementViewModel,
  FinanceViewModel,
  RegistersViewModel,
  RbacViewModel,
  OrganizationViewModel,
} from '../src/index.js';
import {
  MASTER_NAVIGATION_SECTIONS,
  buildUserNavigation,
  formatCurrencyMinor,
} from '@stokrova/ui';

describe('Phase BO — Business Owner Workspace Certification Suite', () => {
  const businessOwnerContext = {
    tenantId: 'ten_apex_global',
    tenantName: 'Apex Global Retail & Logistics Ltd',
    companyId: 'cmp_apex_uk',
    companyName: 'Apex Retail UK Ltd',
    branchId: 'brn_london_flagship',
    branchName: 'London Flagship Store',
    userRoleCodes: ['BUSINESS_OWNER'],
    userPermissions: ['*'], // Wildcard access across entire tenant
  };

  it('proves Business Owner lands on Executive Analytics Dashboard with correct context', () => {
    const shell = new AdminWebShell({
      context: businessOwnerContext,
      theme: 'dark',
    });

    const activeContext = shell.getContext();
    expect(activeContext.tenantId).toBe('ten_apex_global');
    expect(activeContext.userRoleCodes).toContain('BUSINESS_OWNER');
    expect(shell.getCurrentPath()).toBe('/analytics/dashboards');

    const html = shell.renderHeaderHtml();
    expect(html).toContain('Apex Global Retail & Logistics Ltd');
    expect(html).toContain('London Flagship Store');
  });

  it('proves Business Owner has unrestricted access across all 8 navigation sections and 28+ modules', () => {
    // Test navigation built for Business Owner
    const userNav = buildUserNavigation(businessOwnerContext.userPermissions);

    // Ensure all 8 master sections are retained
    expect(userNav.length).toBe(MASTER_NAVIGATION_SECTIONS.length);

    // Count total navigable items
    const totalItems = userNav.reduce((acc, sec) => acc + sec.items.length, 0);
    expect(totalItems).toBeGreaterThanOrEqual(28);

    // Verify critical sections are present
    const sectionIds = userNav.map((s) => s.id);
    expect(sectionIds).toContain('commerce');
    expect(sectionIds).toContain('inventory');
    expect(sectionIds).toContain('procurement');
    expect(sectionIds).toContain('logistics');
    expect(sectionIds).toContain('manufacturing');
    expect(sectionIds).toContain('finance');
    expect(sectionIds).toContain('intelligence');
    expect(sectionIds).toContain('settings');
  });

  describe('Executive Operations Command Center Dashboard', () => {
    it('calculates real financial KPIs with minor units and zero demo placeholders', () => {
      const dashboard = new DashboardViewModel({
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

      const kpis = dashboard.getKpis();
      expect(kpis.grossMerchandiseValueMinor).toBe(485000000n);
      expect(kpis.netRevenueMinor).toBe(38200000n);
      expect(kpis.grossMarginBps).toBe(3850);
      expect(kpis.stockoutRiskIndex).toBe(4);
      expect(kpis.cashierVarianceAlertsMinor).toBe(0n);

      const html = dashboard.renderDashboardHtml();

      // Zero mock or placeholder strings
      expect(html).not.toContain('[Visual Revenue Stream Graph Placeholder]');
      expect(html).not.toContain('MOCK');
      expect(html).not.toContain('TODO');

      // Valid minor unit currency representations
      expect(html).toContain('$4,850,000.00');
      expect(html).toContain('$382,000.00');
      expect(html).toContain('38.50%');
      expect(html).toContain('$0.00');

      // Responsive SVG Area Revenue Chart
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0 600 180"');
      expect(html).toContain('linearGradient id="revenueGrad"');
      expect(html).toContain('<path');

      // Operational Drill-Down Routes
      expect(html).toContain('href="/orders"');
      expect(html).toContain('href="/finance/ledger"');
      expect(html).toContain('href="/inventory/availability"');
      expect(html).toContain('href="/registers"');
    });

    it('renders real-time operational alerts with strict severity classifications', () => {
      const dashboard = new DashboardViewModel({
        grossMerchandiseValueMinor: 1000000n,
        netRevenueMinor: 500000n,
        grossMarginBps: 5000,
        stockoutRiskIndex: 10,
        warehouseUtilizationPct: 60.0,
        openTillSessionsCount: 2,
        cashierVarianceAlertsMinor: 0n,
        activeWorkflowsRunning: 1,
        currencyCode: 'USD',
      }, 'dark');

      dashboard.addAlert({
        id: 'alt_01',
        severity: 'INFO',
        title: 'Inter-Branch Stock Transfer',
        message: 'Dispatched 20 units to Birmingham DC',
        timestampIso: '2026-10-14T10:00:00Z',
      });
      dashboard.addAlert({
        id: 'alt_02',
        severity: 'WARNING',
        title: 'Discount Override Requested',
        message: 'Order SO-901 exceeds 10% manager threshold',
        timestampIso: '2026-10-14T11:00:00Z',
      });

      const alerts = dashboard.getAlerts();
      expect(alerts).toHaveLength(2);
      expect(alerts[0].severity).toBe('WARNING'); // Unshifted to front
      expect(alerts[1].severity).toBe('INFO');

      const html = dashboard.renderDashboardHtml();
      expect(html).toContain('Discount Override Requested');
      expect(html).toContain('Inter-Branch Stock Transfer');
    });
  });

  describe('Procurement & 3-Way Match Verification', () => {
    it('manages approved vendor directory and verifies 3-way matching rules', () => {
      const procurement = new ProcurementViewModel('dark');
      procurement.addSupplier({
        id: 'supp_intel',
        name: 'Intel Corporation UK Ltd',
        code: 'SUPP-INTEL',
        contactEmail: 'orders@intel.co.uk',
        paymentTermsDays: 30,
        leadTimeDays: 5,
        currencyCode: 'USD',
        isActive: true,
      });

      procurement.addPurchaseOrder({
        id: 'po_089',
        poNumber: 'PO-2026-089',
        supplierId: 'supp_intel',
        supplierName: 'Intel Corporation UK Ltd',
        status: 'RECEIVED',
        createdAtIso: '2026-10-10T09:00:00Z',
        currencyCode: 'USD',
        lines: [
          {
            id: 'pol_1',
            sku: 'LAPTOP-PRO-16',
            productName: 'Apex Pro 16 Laptop Workstation',
            orderedQty: 20,
            receivedQty: 20,
            invoicedQty: 20,
            unitCostMinor: 120000n,
            invoicedUnitCostMinor: 120000n,
          },
        ],
      });

      const match = procurement.evaluateThreeWayMatch('po_089');
      expect(match.isFullyMatched).toBe(true);
      expect(match.status).toBe('MATCHED');
      expect(match.discrepancies).toHaveLength(0);

      const html = procurement.renderThreeWayMatchAuditHtml('po_089');
      expect(html).toContain('PO-2026-089');
      expect(html).toContain('LAPTOP-PRO-16');
      expect(html).toContain('MATCHED');
    });

    it('flags quantity and price discrepancies during 3-way match audit', () => {
      const procurement = new ProcurementViewModel('dark');
      procurement.addPurchaseOrder({
        id: 'po_discrepant',
        poNumber: 'PO-2026-090',
        supplierId: 'supp_intel',
        supplierName: 'Intel Corporation UK Ltd',
        status: 'RECEIVED',
        createdAtIso: '2026-10-10T09:00:00Z',
        currencyCode: 'USD',
        lines: [
          {
            id: 'pol_disc',
            sku: 'SMARTPHONE-ULTRA-5G',
            productName: 'Apex Ultra 5G Phone',
            orderedQty: 50,
            receivedQty: 45, // 5 missing!
            invoicedQty: 50, // Billed for 50!
            unitCostMinor: 45000n,
            invoicedUnitCostMinor: 48000n, // Price hike!
          },
        ],
      });

      const match = procurement.evaluateThreeWayMatch('po_discrepant');
      expect(match.isFullyMatched).toBe(false);
      expect(match.status).toBe('PRICE_DISCREPANCY');
      expect(match.discrepancies).toHaveLength(2);
      expect(match.discrepancies.some((d) => d.type === 'QTY')).toBe(true);
      expect(match.discrepancies.some((d) => d.type === 'PRICE')).toBe(true);
    });
  });

  describe('Finance & Double-Entry Invariants', () => {
    it('enforces balanced debits and credits on General Ledger entries (Rule 11)', () => {
      const finance = new FinanceViewModel('dark');

      finance.addAccount({
        code: '1010',
        name: 'Cash at Bank',
        classification: 'CURRENT_ASSET',
        normalBalance: 'DEBIT',
        currentBalanceMinor: 5000000n,
      });
      finance.addAccount({
        code: '4010',
        name: 'Retail Revenue',
        classification: 'OPERATING_REVENUE',
        normalBalance: 'CREDIT',
        currentBalanceMinor: 5000000n,
      });

      finance.addJournalEntry({
        id: 'jrnl_01',
        entryNumber: 'JRNL-2026-10-001',
        reference: 'SO-2026-001',
        description: 'Retail POS Settlement',
        dateIso: '2026-10-14T10:00:00Z',
        status: 'POSTED',
        currencyCode: 'USD',
        lines: [
          { accountCode: '1010', accountName: 'Cash at Bank', debitMinor: 249900n, creditMinor: 0n },
          { accountCode: '4010', accountName: 'Retail Revenue', debitMinor: 0n, creditMinor: 249900n },
        ],
      });

      const trial = finance.calculateTrialBalance();
      expect(trial.isBalanced).toBe(true);
      expect(trial.totalDebitsMinor).toBe(249900n);
      expect(trial.totalCreditsMinor).toBe(249900n);

      const html = finance.renderJournalLedgerHtml('USD');
      expect(html).toContain('JRNL-2026-10-001');
      expect(html).toContain('$2,499.00');
      expect(html).toContain('Trial Balance In Balance');
    });
  });

  describe('Registers & Cash Reconciliation', () => {
    it('records opening floats and reconciles blind cash counts without discrepancy (Rule 7)', () => {
      const registers = new RegistersViewModel('dark');

      registers.addSession({
        id: 'reg_lon_01',
        registerCode: 'REG-LON-01',
        registerName: 'Counter Till 01 (Flagship)',
        branchName: 'London Flagship',
        cashierName: 'Emma Watson',
        openedAtIso: '2026-10-14T08:00:00Z',
        openingFloatMinor: 25000n, // $250.00
        cashSalesMinor: 345000n, // $3,450.00
        cashInMinor: 345000n,
        cashOutMinor: 0n,
        expectedClosingCashMinor: 370000n, // $3,700.00
        status: 'OPEN',
      });

      // Cashier performs blind count of $3,700.00
      const reconciled = registers.reconcileSession('reg_lon_01', 370000n);
      expect(reconciled.status).toBe('RECONCILED');
      expect(reconciled.varianceMinor).toBe(0n);

      const html = registers.renderSessionsTableHtml('USD');
      expect(html).toContain('REG-LON-01');
      expect(html).toContain('Emma Watson');
      expect(html).toContain('RECONCILED');
      expect(html).toContain('$3,700.00');
    });

    it('triggers variance alert when actual counted cash deviates from ledger', () => {
      const registers = new RegistersViewModel('dark');

      registers.addSession({
        id: 'reg_lon_02',
        registerCode: 'REG-LON-02',
        registerName: 'Counter Till 02 (Flagship)',
        branchName: 'London Flagship',
        cashierName: 'Liam Vance',
        openedAtIso: '2026-10-14T08:00:00Z',
        openingFloatMinor: 25000n,
        cashSalesMinor: 289000n,
        cashInMinor: 289000n,
        cashOutMinor: 0n,
        expectedClosingCashMinor: 314000n,
        status: 'OPEN',
      });

      // Blind count is short by $20.00 ($3120.00 vs $3140.00)
      const reconciled = registers.reconcileSession('reg_lon_02', 312000n);
      expect(reconciled.status).toBe('VARIANCE_ALERT');
      expect(reconciled.varianceMinor).toBe(-2000n);
    });
  });

  describe('RBAC & Scoped Organization Topology', () => {
    it('proves multi-entity holding structure and branch assignments are intact (Rule 21)', () => {
      const org = new OrganizationViewModel('dark');
      org.addCompany({
        id: 'cmp_apex_uk',
        name: 'Apex Retail UK Ltd',
        legalName: 'Apex Retail UK Limited',
        currency: 'GBP',
        timezone: 'Europe/London',
        isHolding: true,
        branchesCount: 2,
      });

      org.addBranch({
        id: 'brn_london_flagship',
        companyId: 'cmp_apex_uk',
        name: 'London Flagship Store',
        code: 'LON-FLG',
        type: 'STORE',
        isActive: true,
      });

      const companies = org.listCompanies();
      expect(companies).toHaveLength(1);
      expect(companies[0].isHolding).toBe(true);

      const branches = org.listBranches();
      expect(branches).toHaveLength(1);
      expect(branches[0].code).toBe('LON-FLG');

      const html = org.renderOrganizationHtml();
      expect(html).toContain('Apex Retail UK Ltd');
      expect(html).toContain('London Flagship Store');
    });

    it('maintains staff directory with explicit role scopes and invitations', () => {
      const rbac = new RbacViewModel('dark');
      rbac.addStaffMember({
        id: 'usr_victoria',
        fullName: 'Victoria Sterling',
        email: 'victoria@apex.com',
        roleCode: 'BUSINESS_OWNER',
        roleName: 'Business Owner',
        scope: { tenantId: 'ten_apex_global' },
        status: 'ACTIVE',
        joinedDateIso: '2026-01-01T00:00:00Z',
      });

      rbac.addInvitation({
        id: 'inv_01',
        email: 'newmanager@apex.com',
        fullName: 'Alexander Wright',
        roleName: 'Assistant Store Manager',
        scopeDescription: 'Branch: London Flagship',
        inviteUrl: 'https://app.stokrova.com/invite/tok_8812',
        status: 'PENDING',
        expiresAtIso: '2026-10-21T00:00:00Z',
      });

      const staff = rbac.listStaff();
      expect(staff).toHaveLength(1);
      expect(staff[0].roleCode).toBe('BUSINESS_OWNER');

      const invites = rbac.listInvitations();
      expect(invites).toHaveLength(1);
      expect(invites[0].status).toBe('PENDING');

      const html = rbac.renderStaffManagementHtml();
      expect(html).toContain('Victoria Sterling');
      expect(html).toContain('Business Owner');
      expect(html).toContain('Alexander Wright');
      expect(html).toContain('id="modal-invite-staff"');
      expect(html).toContain('+ Invite Staff Member');
      expect(html).toContain('id="form-invite-staff"');
      expect(html).toContain('id="invite-staff-name"');
      expect(html).toContain('id="invite-staff-email"');
      expect(html).toContain('id="invite-staff-role"');
      expect(html).toContain('id="invite-staff-pin"');
    });

    it('provides white-label company rebranding studio with dynamic accent palette and multi-device preview', () => {
      const { renderAllWorkspaceViewsHtml } = require('@stokrova/ui');
      const html = renderAllWorkspaceViewsHtml({
        tenantName: 'Apex Global Retail Ltd',
        branchName: 'London Flagship',
        theme: 'dark',
      });

      expect(html).toContain('id="ws-view-rebranding"');
      expect(html).toContain('Company Rebranding & White-Label Studio');
      expect(html).toContain('id="rebrand-company-name"');
      expect(html).toContain('id="rebrand-color-picker"');
      expect(html).toContain('id="rebrand-hex-input"');
      expect(html).toContain('id="preview-brand-header"');
      expect(html).toContain('id="preview-pos-btn"');
      expect(html).toContain('id="preview-scanner-box"');
      expect(html).toContain('id="preview-receipt-name"');
      expect(html).toContain('STOKROVA Gold');
      expect(html).toContain('Emerald Green');
      expect(html).toContain('Sapphire Blue');
      expect(html).toContain('Save & Apply Rebrand to All Workspaces');
    });
  });
});
