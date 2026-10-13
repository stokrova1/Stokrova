/**
 * STOKROVA Admin Web — Executive Operations & Analytics Dashboards
 * High-impact KPI summaries (Gross Margin, GMV, Stockout Risk, Space Utilization, Cashier Variance Alerts).
 */

import { formatCurrencyMinor, themeTokens, brandColors, semanticTokens } from '@stokrova/ui';

export interface ExecutiveKpiSnapshot {
  grossMerchandiseValueMinor: bigint;
  netRevenueMinor: bigint;
  grossMarginBps: number; // e.g. 3850 = 38.50%
  stockoutRiskIndex: number; // 0-100 scale
  warehouseUtilizationPct: number; // e.g. 84.5%
  openTillSessionsCount: number;
  cashierVarianceAlertsMinor: bigint;
  activeWorkflowsRunning: number;
  currencyCode: string;
}

export interface KpiAlertItem {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestampIso: string;
}

export class DashboardViewModel {
  private kpi: ExecutiveKpiSnapshot;
  private alerts: KpiAlertItem[] = [];
  private theme: 'light' | 'dark';

  constructor(initialKpi: ExecutiveKpiSnapshot, theme: 'light' | 'dark' = 'dark') {
    this.kpi = { ...initialKpi };
    this.theme = theme;
  }

  public getKpis(): ExecutiveKpiSnapshot {
    return { ...this.kpi };
  }

  public updateKpi(update: Partial<ExecutiveKpiSnapshot>): void {
    this.kpi = { ...this.kpi, ...update };
  }

  public addAlert(alert: KpiAlertItem): void {
    this.alerts.unshift({ ...alert });
  }

  public getAlerts(): KpiAlertItem[] {
    return [...this.alerts];
  }

  // ==========================================
  // HTML Rendering
  // ==========================================

  public renderDashboardHtml(): string {
    const tokens = themeTokens[this.theme];
    const kpi = this.kpi;
    const gmvStr = formatCurrencyMinor(kpi.grossMerchandiseValueMinor, kpi.currencyCode);
    const netRevStr = formatCurrencyMinor(kpi.netRevenueMinor, kpi.currencyCode);
    const marginPct = (kpi.grossMarginBps / 100).toFixed(2);
    const varianceStr = formatCurrencyMinor(kpi.cashierVarianceAlertsMinor, kpi.currencyCode);

    const alertsHtml = this.alerts
      .slice(0, 5)
      .map((a) => {
        const st = semanticTokens;
        let sevColor: string = st.info[this.theme].text;
        if (a.severity === 'WARNING') sevColor = st.warning[this.theme].text;
        if (a.severity === 'CRITICAL') sevColor = st.error[this.theme].text;

        return `
          <div class="alert-item" style="border-left: 3px solid ${sevColor}; background: ${tokens.surface}; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
            <div style="font-weight: 600; font-size: 0.85rem; color: ${sevColor};">${a.title}</div>
            <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; margin-top: 2px;">${a.message}</div>
          </div>
        `.trim();
      })
      .join('\n');

    const st = semanticTokens;

    return `
      <div class="executive-dashboard" style="color: ${tokens.textPrimary};">
        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
          
          <div class="kpi-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase;">Gross Merchandise Value</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: ${brandColors.gold[400]}; margin-top: 6px;">${gmvStr}</div>
            <div style="font-size: 0.75rem; color: ${st.success[this.theme].text}; margin-top: 4px;">▲ +14.2% vs last week</div>
          </div>

          <div class="kpi-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase;">Net Revenue</div>
            <div style="font-size: 1.5rem; font-weight: 700; margin-top: 6px;">${netRevStr}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">Gross Margin: <strong>${marginPct}%</strong></div>
          </div>

          <div class="kpi-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase;">Stockout Risk Index</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: ${kpi.stockoutRiskIndex > 30 ? st.warning[this.theme].text : st.success[this.theme].text}; margin-top: 6px;">${kpi.stockoutRiskIndex} / 100</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Warehouse Utilization: ${kpi.warehouseUtilizationPct}%</div>
          </div>

          <div class="kpi-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase;">Till Cashier Variance</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: ${kpi.cashierVarianceAlertsMinor > 0n ? st.error[this.theme].text : st.success[this.theme].text}; margin-top: 6px;">${varianceStr}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Active Sessions: ${kpi.openTillSessionsCount}</div>
          </div>

        </div>

        <div class="dashboard-panels" style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
          <div class="panel-main" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
            <h4 style="margin-top: 0;">Multi-Channel Revenue Velocity</h4>
            <div style="height: 180px; display: flex; align-items: center; justify-content: center; background: ${tokens.card}; border: 1px dashed ${tokens.borderStrong}; border-radius: 6px; color: ${tokens.textMuted};">
              [Visual Revenue Stream Graph Placeholder]
            </div>
          </div>

          <div class="panel-alerts" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
            <h4 style="margin-top: 0;">Operational Alerts</h4>
            ${alertsHtml || `<div style="color: ${tokens.textMuted}; font-size: 0.85rem;">All systems operational — zero alerts</div>`}
          </div>
        </div>
      </div>
    `.trim();
  }
}
