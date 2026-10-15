import { describe, it, expect } from 'vitest';
import {
  FinanceViewModel,
  RegistersViewModel,
  ProcurementViewModel,
  RbacViewModel,
} from '../src/index.js';
import {
  renderMasterSidebarHtml,
  renderAllWorkspaceViewsHtml,
  getViewIdFromNavId,
} from '@stokrova/ui';

describe('Staff Workspaces & Personal Analytics Suite', () => {
  describe('1. Accountant Desk & Subledger Reconciliations (FinanceViewModel)', () => {
    it('computes personal throughput KPIs accurately based on attributed member ID', () => {
      const finance = new FinanceViewModel('light');

      // Add general accounts
      finance.addAccount({ code: '1010', name: 'Cash at Bank - Operating', type: 'ASSET', currency: 'USD', balanceMinor: 50000000n });
      finance.addAccount({ code: '4010', name: 'Wholesale Revenue', type: 'REVENUE', currency: 'USD', balanceMinor: 50000000n });

      // Add journals posted by Arthur
      finance.addJournalEntry({
        id: 'jrnl_001',
        entryNumber: 'JE-2026-001',
        dateIso: '2026-03-31T10:00:00Z',
        reference: 'INV-APEX-001',
        description: 'Wholesale Invoice Revenue Booking',
        status: 'POSTED',
        postedAtIso: '2026-03-31T10:00:00Z',
        currencyCode: 'USD',
        postedBy: 'usr_arthur',
        postedByName: 'Arthur Pendelton',
        preparedBy: 'usr_arthur',
        preparedByName: 'Arthur Pendelton',
        turnaroundMinutes: 25,
        lines: [
          { id: 'jl_1', accountCode: '1010', accountName: 'Cash', debitMinor: 250000n, creditMinor: 0n },
          { id: 'jl_2', accountCode: '4010', accountName: 'Revenue', debitMinor: 0n, creditMinor: 250000n },
        ],
      });

      finance.addJournalEntry({
        id: 'jrnl_002',
        entryNumber: 'JE-2026-002',
        dateIso: '2026-03-31T11:00:00Z',
        reference: 'VOUCHER-042',
        description: 'Office Supplies Expense Accrual',
        status: 'DRAFT',
        postedAtIso: undefined,
        currencyCode: 'USD',
        postedBy: undefined,
        preparedBy: 'usr_arthur',
        preparedByName: 'Arthur Pendelton',
        turnaroundMinutes: 15,
        lines: [
          { id: 'jl_3', accountCode: '1010', accountName: 'Cash', debitMinor: 0n, creditMinor: 5000n },
          { id: 'jl_4', accountCode: '4010', accountName: 'Revenue', debitMinor: 5000n, creditMinor: 0n },
        ],
      });

      // Add a journal posted by another accountant (Elena Vance)
      finance.addJournalEntry({
        id: 'jrnl_003',
        entryNumber: 'JE-2026-003',
        dateIso: '2026-03-31T12:00:00Z',
        reference: 'PAYROLL-03',
        description: 'Monthly Payroll Allocation',
        status: 'POSTED',
        postedAtIso: '2026-03-31T12:00:00Z',
        currencyCode: 'USD',
        postedBy: 'usr_elena',
        postedByName: 'Elena Vance',
        preparedBy: 'usr_elena',
        preparedByName: 'Elena Vance',
        turnaroundMinutes: 45,
        lines: [
          { id: 'jl_5', accountCode: '1010', accountName: 'Cash', debitMinor: 0n, creditMinor: 1000000n },
          { id: 'jl_6', accountCode: '4010', accountName: 'Revenue', debitMinor: 1000000n, creditMinor: 0n },
        ],
      });

      // Add subledger reconciliations
      finance.addSubledgerReconciliation({
        id: 'rec_ar_01',
        reconciliationType: 'ACCOUNTS_RECEIVABLE',
        title: 'Trade Debtors Aging Reconciliation',
        accountCode: '1100',
        periodId: '2026-03',
        ledgerBalanceMinor: 4500000n,
        statementBalanceMinor: 4500000n,
        discrepancyMinor: 0n,
        status: 'BALANCED',
        performedBy: 'usr_arthur',
        performedByName: 'Arthur Pendelton',
        performedAtIso: '2026-03-31T14:00:00Z',
        notes: 'AR subledger matches aged receivables report.',
      });

      finance.addSubledgerReconciliation({
        id: 'rec_bank_01',
        reconciliationType: 'BANK_ACCOUNT',
        title: 'Barclays Operating Bank Feed',
        accountCode: '1010',
        periodId: '2026-03',
        ledgerBalanceMinor: 12500000n,
        statementBalanceMinor: 12450000n,
        discrepancyMinor: 50000n, // $500 discrepancy
        status: 'PENDING_INVESTIGATION',
        performedBy: 'usr_arthur',
        performedByName: 'Arthur Pendelton',
        performedAtIso: '2026-03-31T14:30:00Z',
        notes: 'Bank feed unallocated merchant fee variance.',
      });

      // Compute Arthur's personal metrics
      const arthurMetrics = finance.getAccountantPersonalMetrics('usr_arthur');
      expect(arthurMetrics.vouchersPrepared).toBe(2); // jrnl_001 and jrnl_002
      expect(arthurMetrics.postedToGlCount).toBe(1); // jrnl_001
      expect(arthurMetrics.reconciliationsBalanced).toBe(1); // rec_ar_01
      expect(arthurMetrics.discrepanciesInvestigating).toBe(1); // rec_bank_01
      expect(arthurMetrics.averageTurnaroundMinutes).toBe(20); // (25 + 15) / 2

      // Verify company-wide isolation: Elena Vance has 1 post, 0 draft, 0 recs
      const elenaMetrics = finance.getAccountantPersonalMetrics('usr_elena');
      expect(elenaMetrics.vouchersPrepared).toBe(1);
      expect(elenaMetrics.postedToGlCount).toBe(1);
      expect(elenaMetrics.reconciliationsBalanced).toBe(0);
      expect(elenaMetrics.discrepanciesInvestigating).toBe(0);
      expect(elenaMetrics.averageTurnaroundMinutes).toBe(45);
    });

    it('reconciles subledger items and updates General Ledger status', () => {
      const finance = new FinanceViewModel('light');

      finance.addSubledgerReconciliation({
        id: 'rec_inv_01',
        reconciliationType: 'INVENTORY_LEDGER',
        title: 'Perpetual Physical Inventory Count',
        accountCode: '1300',
        periodId: '2026-03',
        ledgerBalanceMinor: 8900000n,
        statementBalanceMinor: 8850000n,
        discrepancyMinor: 50000n,
        status: 'PENDING_INVESTIGATION',
        performedBy: 'usr_arthur',
        performedByName: 'Arthur Pendelton',
        performedAtIso: '2026-03-31T10:00:00Z',
        notes: 'Goods in-transit pending receipt confirmation.',
      });

      expect(finance.getSubledgerReconciliation('rec_inv_01')?.status).toBe('PENDING_INVESTIGATION');

      // Reconcile with matching balance (8900000n)
      const updated = finance.reconcileSubledger('rec_inv_01', 8900000n, 'Matched GRN-LON-042 to in-transit ledger.');
      expect(updated).toBeDefined();
      expect(updated.status).toBe('BALANCED');
      expect(updated.discrepancyMinor).toBe(0n);
      expect(updated.performedAtIso).toBeDefined();

      const recs = finance.listSubledgerReconciliations();
      expect(recs[0]?.status).toBe('BALANCED');
    });

    it('renders Accountant Workspace HTML with responsive containers and accessible contrast', () => {
      const finance = new FinanceViewModel('light');

      finance.addAccount({ code: '1010', name: 'Operating Bank Account', type: 'ASSET', currency: 'USD', balanceMinor: 10000000n });
      finance.addAccount({ code: '4010', name: 'Retail Sales Revenue', type: 'REVENUE', currency: 'USD', balanceMinor: 10000000n });

      finance.addJournalEntry({
        id: 'jrnl_01',
        entryNumber: 'JE-01',
        dateIso: '2026-03-31T00:00:00Z',
        reference: 'REF-01',
        description: 'Weekly Settlement',
        status: 'POSTED',
        postedAtIso: '2026-03-31T00:00:00Z',
        currencyCode: 'USD',
        postedBy: 'usr_arthur',
        postedByName: 'Arthur Pendelton',
        preparedBy: 'usr_arthur',
        preparedByName: 'Arthur Pendelton',
        turnaroundMinutes: 20,
        lines: [
          { id: 'l1', accountCode: '1010', accountName: 'Bank', debitMinor: 10000n, creditMinor: 0n },
          { id: 'l2', accountCode: '4010', accountName: 'Revenue', debitMinor: 0n, creditMinor: 10000n },
        ],
      });

      finance.addSubledgerReconciliation({
        id: 'rec_01',
        reconciliationType: 'BANK_ACCOUNT',
        title: 'Operating Bank Account Feed',
        accountCode: '1010',
        periodId: '2026-03',
        ledgerBalanceMinor: 10000000n,
        statementBalanceMinor: 10000000n,
        discrepancyMinor: 0n,
        status: 'BALANCED',
        performedBy: 'usr_arthur',
        performedByName: 'Arthur Pendelton',
        performedAtIso: '2026-03-31T00:00:00Z',
      });

      const html = finance.renderAccountantWorkspaceHtml({
        currentMemberId: 'usr_arthur',
        currentMemberName: 'Arthur Pendelton',
        companyName: 'Apex Retail UK Ltd',
        currency: 'USD',
        filterMode: 'my',
        isGeneralAccountant: true,
      });

      // Verify title and member attribution
      expect(html).toContain('Accounting Desk');
      expect(html).toContain('Arthur Pendelton');
      expect(html).toContain('Apex Retail UK Ltd');

      // Verify personal throughput KPI cards
      expect(html).toContain('Draft Vouchers Prepared');
      expect(html).toContain('Journals Posted to GL');
      expect(html).toContain('Reconciliations Balanced');
      expect(html).toContain('Open Discrepancies');
      expect(html).toContain('Average Post Turnaround');

      // Verify scope filter buttons
      expect(html).toContain('id="btn-accountant-filter-my"');
      expect(html).toContain('id="btn-accountant-filter-all"');
      expect(html).toContain('toggleAccountantViewScope');

      // Verify responsive table container
      expect(html).toContain('class="stokrova-table-responsive"');
      expect(html).toContain('overflow-x: auto');

      // Verify min-height touch targets (44px)
      expect(html).toContain('min-height: 44px');

      // Verify WCAG AA accessible contrast for Imperial Gold on light theme (#85642D)
      expect(html).toContain('#85642D');
    });
  });

  describe('2. Cashier Personal Shift Desk (RegistersViewModel)', () => {
    it('computes cashier personal shift metrics with zero float discrepancies', () => {
      const registers = new RegistersViewModel('light');

      // Register session for Emma Watson
      registers.addSession({
        id: 'sess_lon_01',
        registerCode: 'REG-LON-01',
        registerName: 'Main Storefront Till 01',
        branchId: 'brn_london_flagship',
        branchName: 'London Flagship Store',
        cashierId: 'usr_emma',
        cashierName: 'Emma Watson',
        openedAtIso: '2026-03-31T08:00:00Z',
        closedAtIso: undefined,
        openingFloatMinor: 25000n, // $250.00
        cashSalesMinor: 142000n, // $1,420.00
        cardSalesMinor: 284000n, // $2,840.00
        cashInMinor: 0n,
        cashOutMinor: 0n,
        expectedClosingCashMinor: 167000n,
        salesCount: 48,
        averageRingSeconds: 26,
        status: 'OPEN',
      });

      // Register session for David O'Connor on another till
      registers.addSession({
        id: 'sess_lon_02',
        registerCode: 'REG-LON-02',
        registerName: 'Drive-Thru / Click & Collect Till',
        branchId: 'brn_london_flagship',
        branchName: 'London Flagship Store',
        cashierId: 'usr_david',
        cashierName: "David O'Connor",
        openedAtIso: '2026-03-31T08:30:00Z',
        closedAtIso: undefined,
        openingFloatMinor: 30000n,
        cashSalesMinor: 50000n,
        cardSalesMinor: 75000n,
        cashInMinor: 0n,
        cashOutMinor: 0n,
        expectedClosingCashMinor: 80000n,
        salesCount: 15,
        averageRingSeconds: 32,
        status: 'OPEN',
      });

      const emmaMetrics = registers.getCashierPersonalShiftMetrics('usr_emma');
      expect(emmaMetrics.totalGrossSalesMinor).toBe(426000n); // 142000 + 284000 = $4,260.00
      expect(emmaMetrics.cashSalesMinor).toBe(142000n);
      expect(emmaMetrics.cardSalesMinor).toBe(284000n);
      expect(emmaMetrics.ticketsCount).toBe(48);
      expect(emmaMetrics.openingFloatMinor).toBe(25000n);
      expect(emmaMetrics.expectedDrawerCashMinor).toBe(167000n); // 25000 + 142000
      expect(emmaMetrics.drawerVarianceMinor).toBe(0n);
      expect(emmaMetrics.averageRingSeconds).toBe(26);
    });

    it('renders Cashier Personal Workspace HTML with split tender breakdown and hardware status', () => {
      const registers = new RegistersViewModel('light');

      registers.addSession({
        id: 'sess_lon_01',
        registerCode: 'REG-LON-01',
        registerName: 'Main Storefront Till 01',
        branchId: 'brn_london_flagship',
        branchName: 'London Flagship Store',
        cashierId: 'usr_emma',
        cashierName: 'Emma Watson',
        openedAtIso: '2026-03-31T08:00:00Z',
        closedAtIso: undefined,
        openingFloatMinor: 25000n,
        cashSalesMinor: 142000n,
        cardSalesMinor: 284000n,
        cashInMinor: 0n,
        cashOutMinor: 0n,
        expectedClosingCashMinor: 167000n,
        salesCount: 48,
        averageRingSeconds: 26,
        status: 'OPEN',
      });

      const html = registers.renderCashierPersonalWorkspaceHtml({
        cashierId: 'usr_emma',
        cashierName: 'Emma Watson',
        branchName: 'London Flagship Store',
        currency: 'USD',
      });

      // Verify headers
      expect(html).toContain('Counter Desk');
      expect(html).toContain('Emma Watson');
      expect(html).toContain('London Flagship Store');

      // Verify KPI metrics
      expect(html).toContain('My Shift Gross Sales');
      expect(html).toContain('$4,260.00');
      expect(html).toContain('Tickets Processed');
      expect(html).toContain('48');
      expect(html).toContain('Opening Cash Float');
      expect(html).toContain('$250.00');
      expect(html).toContain('Expected Cash in Till');
      expect(html).toContain('$1,670.00');
      expect(html).toContain('Cash Drawer Variance');
      expect(html).toContain('$0.00');

      // Verify hardware status indicators
      expect(html).toContain('ESC/POS 80mm Receipt Thermal');
      expect(html).toContain('Hardware Laser Scanner Buffer');
      expect(html).toContain('RJ11 Automated Cash Drawer');

      // Verify split tender breakdown
      expect(html).toContain('Cash Collected');
      expect(html).toContain('Chip & PIN / Contactless');

      // Verify responsive container and touch actions
      expect(registers.renderSessionsTableHtml('USD')).toContain('class="stokrova-table-responsive"');
      expect(html).toContain('min-height: 44px');
    });
  });

  describe('3. Procurement & Operational Mobile Layouts', () => {
    it('wraps procurement tables in responsive horizontal containers', () => {
      const procurement = new ProcurementViewModel('light');
      procurement.addSupplier({
        id: 'sup_1',
        supplierCode: 'SUP-001',
        name: 'Apex Manufacturing Ltd',
        category: 'Hardware',
        country: 'GB',
        leadTimeDays: 7,
        onTimeDeliveryRate: 98.5,
        rating: 4.8,
        status: 'ACTIVE',
      });

      // Add a PO to ensure three-way match table is populated
      procurement.addPurchaseOrder({
        id: 'po_1',
        poNumber: 'PO-2026-001',
        supplierId: 'sup_1',
        supplierName: 'Apex Manufacturing Ltd',
        orderDateIso: '2026-03-01T00:00:00Z',
        currencyCode: 'USD',
        status: 'RECEIVED',
        totalAmountMinor: 100000n,
        lines: [
          {
            id: 'pol_1',
            sku: 'SKU-001',
            productName: 'Part 1',
            orderedQty: 10,
            receivedQty: 10,
            invoicedQty: 10,
            unitCostMinor: 10000n,
            invoicedUnitCostMinor: 10000n,
          },
        ],
      });

      const suppliersHtml = procurement.renderSuppliersTableHtml();
      expect(suppliersHtml).toContain('class="stokrova-table-responsive"');
      expect(suppliersHtml).toContain('overflow-x: auto');

      const matchHtml = procurement.renderThreeWayMatchAuditHtml();
      expect(matchHtml).toContain('class="stokrova-table-responsive"');
      expect(matchHtml).toContain('overflow-x: auto');
    });

    it('renders responsive picker, driver, and sales rep views with personal metrics in UI workspace', () => {
      const viewsHtml = renderAllWorkspaceViewsHtml({
        theme: 'light',
        tenantName: 'Apex Global Ltd',
        branchName: 'London Flagship',
        currencyCode: 'USD',
      });

      // Picking view has personal KPIs
      expect(viewsHtml).toContain('WAVE-LON-042');
      expect(viewsHtml).toContain('Pick Accuracy');
      expect(viewsHtml).toContain('99.8%');
      expect(viewsHtml).toContain('Active Pick Sequence (Route Optimized)');

      // Fleet view has driver personal metrics
      expect(viewsHtml).toContain('RUN-LON-04');
      expect(viewsHtml).toContain('On-Time Delivery Rate');
      expect(viewsHtml).toContain('100%');
      expect(viewsHtml).toContain('POD Signatures Captured');

      // CRM view has sales rep personal metrics
      expect(viewsHtml).toContain('Clara Oswald');
      expect(viewsHtml).toContain('My Active Deals');
      expect(viewsHtml).toContain('12 deals');
      expect(viewsHtml).toContain('OPP-2026-104');
    });
  });

  describe('4. Master Navigation & Role Mapping', () => {
    it('maps nav_accountant and nav_cashier_desk correctly to their view IDs', () => {
      expect(getViewIdFromNavId('nav_accountant')).toBe('accountant');
      expect(getViewIdFromNavId('nav_cashier_desk')).toBe('cashier-desk');
    });

    it('renders accountant and cashier desk items in master sidebar', () => {
      const sidebarHtml = renderMasterSidebarHtml({
        theme: 'light',
        activeViewId: 'accountant',
      });

      expect(sidebarHtml).toContain('nav_accountant');
      expect(sidebarHtml).toContain('Accountant Desk & Reconciliations');
      expect(sidebarHtml).toContain('nav_cashier_desk');
      expect(sidebarHtml).toContain('Cashier Shift & Terminal Desk');
    });
  });

  describe('5. RBAC Staff Management Attribution', () => {
    it('registers staff roles for all operational members with granular scopes', () => {
      const rbac = new RbacViewModel('light');

      rbac.addStaffMember({
        id: 'usr_arthur',
        fullName: 'Arthur Pendelton',
        email: 'arthur@apex.com',
        roleCode: 'GENERAL_ACCOUNTANT',
        roleName: 'Lead Financial Accountant',
        scope: { companyName: 'Apex Retail UK Ltd' },
        status: 'ACTIVE',
        joinedDateIso: '2026-02-01T00:00:00Z',
      });

      rbac.addStaffMember({
        id: 'usr_marcus',
        fullName: 'Marcus Bennett',
        email: 'marcus@apex.com',
        roleCode: 'DELIVERY_DRIVER',
        roleName: 'Route Logistics Driver',
        scope: { branchName: 'London Flagship' },
        status: 'ACTIVE',
        joinedDateIso: '2026-03-15T00:00:00Z',
      });

      rbac.addStaffMember({
        id: 'usr_clara',
        fullName: 'Clara Oswald',
        email: 'clara@apex.com',
        roleCode: 'SALES_REPRESENTATIVE',
        roleName: 'Senior B2B Account Executive',
        scope: { companyName: 'Apex Retail UK Ltd' },
        status: 'ACTIVE',
        joinedDateIso: '2026-01-15T00:00:00Z',
      });

      const members = rbac.listStaff();
      expect(members.some((m) => m.fullName === 'Arthur Pendelton')).toBe(true);
      expect(members.some((m) => m.fullName === 'Marcus Bennett')).toBe(true);
      expect(members.some((m) => m.fullName === 'Clara Oswald')).toBe(true);

      const html = rbac.renderStaffManagementHtml();
      expect(html).toContain('Arthur Pendelton');
      expect(html).toContain('Lead Financial Accountant');
      expect(html).toContain('Marcus Bennett');
      expect(html).toContain('Route Logistics Driver');
      expect(html).toContain('Clara Oswald');
      expect(html).toContain('Senior B2B Account Executive');
    });
  });
});
