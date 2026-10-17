/**
 * STOKROVA Mobile — Executive Store Overview & Founder Telemetry View
 * Mobile dashboard for business owners and store managers:
 * zero-custody payment split, true gross margin from minor units,
 * on-duty operator tracking, critical stock alerts, and EOD audit lock.
 */

import { themeTokens, brandColors } from '@stokrova/ui';

export interface MobileExecutiveBranch {
  branchId: string;
  branchName: string;
  isCentralHub: boolean;
}

export interface MobileOperatorOnDuty {
  operatorId: string;
  operatorName: string;
  roleCode: string;
  terminalId: string;
  status: 'ACTIVE' | 'BREAK' | 'IN_TRANSIT';
  shiftStartedAtIso: string;
  metricLabel: string;
}

export interface MobileReorderAlert {
  sku: string;
  productName: string;
  unitsRemaining: number;
  minThreshold: number;
  urgency: 'CRITICAL' | 'WARNING';
}

export interface MobileExecutiveFinancials {
  grossSalesMinor: number;
  historicalCogsMinor: number;
  cashInTillMinor: number;
  bankTransferMinor: number;
  salesGrowthPct: number;
}

export class MobileExecutiveOverviewViewModel {
  private activeBranchId: string;
  private branches: MobileExecutiveBranch[] = [];
  private financials: MobileExecutiveFinancials;
  private operators: MobileOperatorOnDuty[] = [];
  private reorderAlerts: MobileReorderAlert[] = [];
  private eodAuditLocked = false;

  constructor(
    initialBranchId: string,
    branches: MobileExecutiveBranch[],
    financials: MobileExecutiveFinancials,
  ) {
    this.activeBranchId = initialBranchId;
    this.branches = [...branches];
    this.financials = { ...financials };
  }

  public getActiveBranch(): MobileExecutiveBranch | undefined {
    return this.branches.find((b) => b.branchId === this.activeBranchId);
  }

  public switchBranch(branchId: string): void {
    const target = this.branches.find((b) => b.branchId === branchId);
    if (!target) {
      throw new Error(`Branch ${branchId} does not exist`);
    }
    this.activeBranchId = branchId;
  }

  public setFinancials(financials: MobileExecutiveFinancials): void {
    this.financials = { ...financials };
  }

  public getFinancials(): MobileExecutiveFinancials {
    return { ...this.financials };
  }

  public calculateGrossProfitMinor(): number {
    return this.financials.grossSalesMinor - this.financials.historicalCogsMinor;
  }

  public calculateMarginPercent(): number {
    if (this.financials.grossSalesMinor <= 0) return 0;
    const profit = this.calculateGrossProfitMinor();
    return Math.round((profit / this.financials.grossSalesMinor) * 1000) / 10;
  }

  public setOperatorsOnDuty(operators: MobileOperatorOnDuty[]): void {
    this.operators = [...operators];
  }

  public getOperatorsOnDuty(): MobileOperatorOnDuty[] {
    return [...this.operators];
  }

  public setReorderAlerts(alerts: MobileReorderAlert[]): void {
    this.reorderAlerts = [...alerts];
  }

  public getReorderAlerts(): MobileReorderAlert[] {
    return [...this.reorderAlerts];
  }

  public lockEodAudit(): { lockedAtIso: string; summaryTakingsMinor: number } {
    this.eodAuditLocked = true;
    return {
      lockedAtIso: new Date().toISOString(),
      summaryTakingsMinor: this.financials.cashInTillMinor + this.financials.bankTransferMinor,
    };
  }

  public isEodLocked(): boolean {
    return this.eodAuditLocked;
  }

  /**
   * Renders the executive mobile dashboard card stack.
   */
  public renderOverviewHtml(): string {
    const tokens = themeTokens.dark;
    const gold = brandColors.gold[400];
    const branch = this.getActiveBranch();
    const branchTitle = branch ? branch.branchName : 'Unknown Facility';

    const grossSalesFormatted = (this.financials.grossSalesMinor / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    const cashFormatted = (this.financials.cashInTillMinor / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    const transferFormatted = (this.financials.bankTransferMinor / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    const profitFormatted = (this.calculateGrossProfitMinor() / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    const marginPct = this.calculateMarginPercent();

    return `
      <div class="mobile-executive-dashboard" style="background: ${tokens.background}; color: ${tokens.textPrimary}; padding: 1rem;">
        <!-- Top Branch & Telemetry -->
        <header style="margin-bottom: 1rem; border-bottom: 1px solid ${tokens.border}; padding-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <span style="color: ${gold}; font-weight: 700; letter-spacing: 0.05em; font-size: 0.85rem;">
              STOKROVA INDUSTRIAL GROUP
            </span>
            <span style="color: #4ADE80; font-family: monospace; font-size: 0.75rem;">[LIVE TELEMETRY]</span>
          </div>
          <div style="font-size: 1.1rem; font-weight: 600;">${branchTitle}</div>
        </header>

        <!-- Hero Revenue Card -->
        <div class="hero-revenue-card" style="background: ${tokens.card}; border: 1px solid ${gold}; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-size: 0.75rem; text-transform: uppercase; color: ${tokens.textSecondary};">Today's Revenue</span>
            <span style="color: #4ADE80; font-weight: 700; font-size: 0.8rem;">+${this.financials.salesGrowthPct}% vs Yest</span>
          </div>
          <div style="font-size: 2rem; font-weight: 800; color: #FFFFFF; margin: 0.25rem 0 1rem 0;">
            ${grossSalesFormatted}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; border-top: 1px solid ${tokens.border}; padding-top: 0.75rem;">
            <div>
              <div style="font-size: 0.7rem; color: ${tokens.textSecondary};">Cash in Drawer</div>
              <div style="font-size: 1rem; font-weight: 700; color: ${gold};">${cashFormatted}</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: ${tokens.textSecondary};">Bank Wire Transfer</div>
              <div style="font-size: 1rem; font-weight: 700; color: #FFFFFF;">${transferFormatted}</div>
            </div>
          </div>

          <div style="margin-top: 0.75rem; font-size: 0.75rem; color: ${tokens.textSecondary}; border-top: 1px dashed ${tokens.border}; padding-top: 0.5rem;">
            Gross Profit: <strong style="color: #4ADE80;">${profitFormatted}</strong> (${marginPct}% Margin)
          </div>
        </div>

        <!-- On-Duty Shift Roster -->
        <div style="margin-bottom: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: ${tokens.textSecondary}; margin-bottom: 0.5rem;">
            On-Duty Shift Roster (${this.operators.length} Active)
          </div>
          ${this.operators
            .map(
              (op) => `
            <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 0.6rem 0.8rem; margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.85rem; font-weight: 600;">${op.operatorName} (${op.roleCode})</div>
                <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">${op.metricLabel}</div>
              </div>
              <span style="font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.4rem; border-radius: 4px; background: #14291F; color: #4ADE80;">
                ${op.status}
              </span>
            </div>
          `,
            )
            .join('')}
        </div>

        <!-- EOD Action -->
        <button style="width: 100%; height: 48px; background: ${tokens.surface}; border: 1px solid ${gold}; color: ${gold}; font-weight: 700; border-radius: 6px; cursor: pointer;">
          ${this.eodAuditLocked ? '✔ EOD AUDIT LOCKED' : '🔒 RUN EOD AUDIT & TAKINGS LOCK'}
        </button>
      </div>
    `.trim();
  }
}
