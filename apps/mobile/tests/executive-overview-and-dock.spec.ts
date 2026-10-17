import { describe, it, expect } from 'vitest';
import {
  MobileWorkSessionDock,
  MobileExecutiveOverviewViewModel,
} from '../src/index.js';

describe('Phase 27 — Mobile Work Session Dock & Executive Overview Suite', () => {
  describe('MobileWorkSessionDock', () => {
    it('manages work session lifecycle: idle -> active -> break -> closed', () => {
      const dock = new MobileWorkSessionDock('tenant_1', 'user_1', 'CASHIER', 'POS-MOBI-01');

      expect(dock.isWorkActive()).toBe(false);
      expect(dock.getSession()).toBeNull();

      // Start Work
      const session = dock.startWork('2026-10-17T08:00:00.000Z');
      expect(session.status).toBe('ACTIVE');
      expect(session.startedAtIso).toBe('2026-10-17T08:00:00.000Z');
      expect(dock.isWorkActive()).toBe(true);

      // Record Activity
      dock.recordActivity(5, 125000); // 5 items, $1,250.00 minor
      expect(dock.getSession()?.itemsProcessed).toBe(5);
      expect(dock.getSession()?.totalSalesMinor).toBe(125000);

      // Pause Work for Break
      dock.pauseWork();
      expect(dock.getSession()?.status).toBe('ON_BREAK');
      expect(dock.isWorkActive()).toBe(false);

      // Resume Work
      dock.resumeWork();
      expect(dock.getSession()?.status).toBe('ACTIVE');
      expect(dock.isWorkActive()).toBe(true);

      // End Work
      const closed = dock.endWork('2026-10-17T16:30:00.000Z');
      expect(closed.status).toBe('CLOSED');
      expect(closed.endedAtIso).toBe('2026-10-17T16:30:00.000Z');
      expect(dock.getSession()).toBeNull();
      expect(dock.getHistory()).toHaveLength(1);
      expect(dock.getHistory()[0].itemsProcessed).toBe(5);

      // Mark Synced
      dock.markSynced(closed.sessionId);
      expect(dock.getHistory()[0].syncedToCloud).toBe(true);
    });

    it('renders thumb-zone HTML with Imperial Gold button when idle and action buttons when active', () => {
      const dock = new MobileWorkSessionDock('tenant_1', 'user_1', 'CASHIER');
      const idleHtml = dock.renderDockHtml();
      expect(idleHtml).toContain('START MY WORK');
      expect(idleHtml).toContain('#BD9652'); // Gold

      dock.startWork();
      dock.recordActivity(12);
      const activeHtml = dock.renderDockHtml();
      expect(activeHtml).toContain('SHIFT:');
      expect(activeHtml).toContain('12 items processed');
      expect(activeHtml).toContain('BREAK');
      expect(activeHtml).toContain('END WORK');
    });
  });

  describe('MobileExecutiveOverviewViewModel', () => {
    const mockBranches = [
      { branchId: 'br_01', branchName: 'Depot #04 - Central', isCentralHub: true },
      { branchId: 'br_02', branchName: 'Branch #02 - Northside', isCentralHub: false },
    ];

    const mockFinancials = {
      grossSalesMinor: 1842500, // $18,425.00
      historicalCogsMinor: 1328500, // $13,285.00
      cashInTillMinor: 582000, // $5,820.00
      bankTransferMinor: 1260500, // $12,605.00
      salesGrowthPct: 14.8,
    };

    it('calculates true gross profit and margin percent strictly from minor units', () => {
      const vm = new MobileExecutiveOverviewViewModel('br_01', mockBranches, mockFinancials);

      // Gross profit: 1842500 - 1328500 = 514000 minor ($5,140.00)
      expect(vm.calculateGrossProfitMinor()).toBe(514000);

      // Margin: (514000 / 1842500) * 100 = ~27.9%
      expect(vm.calculateMarginPercent()).toBe(27.9);
    });

    it('manages branch switching and operator roster', () => {
      const vm = new MobileExecutiveOverviewViewModel('br_01', mockBranches, mockFinancials);
      expect(vm.getActiveBranch()?.branchName).toBe('Depot #04 - Central');

      vm.switchBranch('br_02');
      expect(vm.getActiveBranch()?.branchName).toBe('Branch #02 - Northside');

      expect(() => vm.switchBranch('br_nonexistent')).toThrowError('does not exist');

      vm.setOperatorsOnDuty([
        {
          operatorId: 'op_1',
          operatorName: 'J. Vance',
          roleCode: 'FLOOR_ASSOCIATE',
          terminalId: 'HHD-07',
          status: 'ACTIVE',
          shiftStartedAtIso: '2026-10-17T07:00:00.000Z',
          metricLabel: '$3,840.50 Sales',
        },
      ]);
      expect(vm.getOperatorsOnDuty()).toHaveLength(1);
    });

    it('executes EOD audit lock and takings calculation', () => {
      const vm = new MobileExecutiveOverviewViewModel('br_01', mockBranches, mockFinancials);
      expect(vm.isEodLocked()).toBe(false);

      const audit = vm.lockEodAudit();
      expect(vm.isEodLocked()).toBe(true);
      // Total takings = cash + transfer = 582000 + 1260500 = 1842500
      expect(audit.summaryTakingsMinor).toBe(1842500);

      const html = vm.renderOverviewHtml();
      expect(html).toContain('EOD AUDIT LOCKED');
      expect(html).toContain('Depot #04 - Central');
      expect(html).toContain("Today's Revenue");
    });
  });
});

