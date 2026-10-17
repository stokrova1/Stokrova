/**
 * STOKROVA Mobile & Desktop Shell — Unified Dynamic Role Router
 * One single application for all roles:
 * - Automatically detects user role upon login and loads their workspace.
 * - Sub-tab architecture prevents screen crowding and visual congestion.
 * - Fresh, concise headers with zero technical jargon.
 * - Compact mobile touch targets and balanced desktop typography.
 */

import { themeTokens, brandColors } from '@stokrova/ui';
import { MobileWorkSessionDock } from './work-session-dock.js';
import { MobileExecutiveOverviewViewModel } from './executive-overview-view.js';
import { MobilePickRouteViewModel } from './pick-route-view.js';
import { MobileCashierTillViewModel } from './cashier-till-view.js';

export type UserRoleType =
  | 'BUSINESS_OWNER'
  | 'BRANCH_MANAGER'
  | 'CASHIER'
  | 'SALES_CLERK'
  | 'WAREHOUSE_PICKER'
  | 'WAREHOUSE_CHECKER'
  | 'INVENTORY_CONTROLLER'
  | 'ACCOUNTANT'
  | 'AUDITOR';

export interface AuthenticatedUserProfile {
  userId: string;
  userName: string;
  roleCode: UserRoleType;
  tenantId: string;
  tenantName: string;
  branchName: string;
}

export class MobileRoleRouter {
  private profile: AuthenticatedUserProfile;
  private sessionDock: MobileWorkSessionDock;
  private activeSubTab = 'overview';

  // Sub-controllers
  public executiveVm?: MobileExecutiveOverviewViewModel;
  public cashierVm?: MobileCashierTillViewModel;
  public pickerVm?: MobilePickRouteViewModel;

  constructor(profile: AuthenticatedUserProfile) {
    this.profile = profile;
    this.sessionDock = new MobileWorkSessionDock(
      profile.tenantId,
      profile.userId,
      profile.roleCode,
    );
    this.initRoleController();
  }

  private initRoleController(): void {
    switch (this.profile.roleCode) {
      case 'BUSINESS_OWNER':
      case 'BRANCH_MANAGER':
        this.executiveVm = new MobileExecutiveOverviewViewModel(
          'br_main',
          [{ branchId: 'br_main', branchName: this.profile.branchName, isCentralHub: true }],
          {
            grossSalesMinor: 0,
            historicalCogsMinor: 0,
            cashInTillMinor: 0,
            bankTransferMinor: 0,
            salesGrowthPct: 0,
          },
        );
        break;

      case 'CASHIER':
      case 'SALES_CLERK':
        this.cashierVm = new MobileCashierTillViewModel();
        break;

      case 'WAREHOUSE_PICKER':
      case 'WAREHOUSE_CHECKER':
        this.pickerVm = new MobilePickRouteViewModel('WAVE-01', []);
        break;

      default:
        break;
    }
  }

  public getProfile(): AuthenticatedUserProfile {
    return { ...this.profile };
  }

  public getSessionDock(): MobileWorkSessionDock {
    return this.sessionDock;
  }

  public getActiveSubTab(): string {
    return this.activeSubTab;
  }

  public setSubTab(subTab: string): void {
    this.activeSubTab = subTab;
  }

  /**
   * Returns clean, fresh sub-tabs tailored to the role.
   * Keeps screens lightweight and separated into dedicated sub-shells.
   */
  public getRoleSubTabs(): Array<{ id: string; label: string }> {
    switch (this.profile.roleCode) {
      case 'BUSINESS_OWNER':
      case 'BRANCH_MANAGER':
        return [
          { id: 'revenue', label: 'Revenue & Margin' },
          { id: 'floor', label: 'On-Duty Roster' },
          { id: 'alerts', label: 'Stock Alerts' },
        ];
      case 'CASHIER':
      case 'SALES_CLERK':
        return [
          { id: 'till', label: 'Till & Scan' },
          { id: 'cart', label: 'Cart' },
          { id: 'history', label: 'Shift Sales' },
        ];
      case 'WAREHOUSE_PICKER':
      case 'WAREHOUSE_CHECKER':
        return [
          { id: 'route', label: 'Pick Route' },
          { id: 'bins', label: 'Bin Map' },
          { id: 'exceptions', label: 'Exceptions' },
        ];
      default:
        return [
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: 'Tasks' },
        ];
    }
  }

  /**
   * Renders the unified header: shortened, fresh, beautiful, zero technical jargon.
   */
  public renderFreshHeaderHtml(): string {
    const tokens = themeTokens.dark;
    const gold = brandColors.gold[500] || '#BD9652';

    return `
      <header class="stk-fresh-header" style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; font-weight: 500;">${this.profile.tenantName}</div>
          <div style="font-size: 1rem; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 0.4rem;">
            <span>${this.profile.branchName}</span>
            <span style="font-size: 0.7rem; color: #4ADE80; font-family: monospace;">● Online</span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.85rem; font-weight: 600; color: #FFFFFF;">${this.profile.userName}</div>
          <div style="font-size: 0.7rem; color: ${gold}; font-weight: 600; text-transform: uppercase;">${this.profile.roleCode.replace('_', ' ')}</div>
        </div>
      </header>
    `.trim();
  }

  /**
   * Renders sub-tab bar to prevent overcrowding.
   */
  public renderSubTabBarHtml(): string {
    const tokens = themeTokens.dark;
    const gold = brandColors.gold[500] || '#BD9652';
    const subTabs = this.getRoleSubTabs();

    return `
      <nav class="stk-subtab-bar" style="background: ${tokens.background}; padding: 0.5rem 1rem; border-bottom: 1px solid ${tokens.border}; display: flex; gap: 0.4rem; overflow-x: auto;">
        ${subTabs
          .map((tab) => {
            const isActive = tab.id === this.activeSubTab;
            const style = isActive
              ? `background: ${gold}; color: #161B1E; font-weight: 700;`
              : `background: ${tokens.surface}; color: ${tokens.textSecondary}; font-weight: 500;`;
            return `
              <button class="stk-subtab-pill" style="padding: 6px 12px; font-size: 0.78rem; border-radius: 999px; border: 1px solid ${tokens.border}; cursor: pointer; white-space: nowrap; ${style}">
                ${tab.label}
              </button>
            `.trim();
          })
          .join('\n')}
      </nav>
    `.trim();
  }
}
