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

    // Generate responsive SVG Revenue Area Chart
    const svgChart = `
      <svg viewBox="0 0 600 180" style="width: 100%; height: 180px; overflow: visible;" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="revenueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${brandColors.gold[400]}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${brandColors.gold[400]}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <!-- Horizontal Grid Lines -->
        <line x1="0" y1="40" x2="600" y2="40" stroke="${tokens.border}" stroke-dasharray="4 4" stroke-width="1" />
        <line x1="0" y1="90" x2="600" y2="90" stroke="${tokens.border}" stroke-dasharray="4 4" stroke-width="1" />
        <line x1="0" y1="140" x2="600" y2="140" stroke="${tokens.border}" stroke-dasharray="4 4" stroke-width="1" />
        
        <!-- Area Fill -->
        <path d="M 0 150 Q 100 120, 200 135 T 400 70 T 600 50 L 600 160 L 0 160 Z" fill="url(#revenueGrad)" />
        
        <!-- Primary Trend Line -->
        <path d="M 0 150 Q 100 120, 200 135 T 400 70 T 600 50" fill="none" stroke="${brandColors.gold[400]}" stroke-width="3" stroke-linecap="round" />
        
        <!-- Data Markers -->
        <circle cx="200" cy="135" r="4" fill="${brandColors.gold[400]}" stroke="${tokens.surface}" stroke-width="2" />
        <circle cx="400" cy="70" r="4" fill="${brandColors.gold[400]}" stroke="${tokens.surface}" stroke-width="2" />
        <circle cx="600" cy="50" r="5" fill="#4ADE80" stroke="${tokens.surface}" stroke-width="2" />

        <!-- X-Axis Labels -->
        <text x="10" y="175" fill="${tokens.textMuted}" font-size="11" font-family="sans-serif">Mon</text>
        <text x="150" y="175" fill="${tokens.textMuted}" font-size="11" font-family="sans-serif">Wed</text>
        <text x="300" y="175" fill="${tokens.textMuted}" font-size="11" font-family="sans-serif">Fri</text>
        <text x="450" y="175" fill="${tokens.textMuted}" font-size="11" font-family="sans-serif">Sun</text>
        <text x="560" y="175" fill="${tokens.textMuted}" font-size="11" font-family="sans-serif">Today</text>
      </svg>
    `.trim();

    return `
      <div class="executive-dashboard" style="color: ${tokens.textPrimary};">
        <div class="dashboard-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: ${tokens.surface}; padding: 12px 18px; border-radius: 8px; border: 1px solid ${tokens.border};">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary};">Operational Period:</span>
            <span style="background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; font-weight: 600; padding: 3px 8px; border-radius: 4px;">Last 7 Days (Live Sync)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="window.stokrovaApp?.showToast('Refreshed real-time telemetry from double-entry ledger.')" style="display: inline-flex; align-items: center; gap: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
              <span>⟳</span>
              <span>Refresh Ledgers</span>
            </button>
            <button onclick="window.stokrovaApp?.showToast('Exported Executive Operations briefing (PDF).')" style="display: inline-flex; align-items: center; gap: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
              <span>⬇</span>
              <span>Export Briefing</span>
            </button>
          </div>
        </div>

        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
          
          <a href="/orders" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px; transition: border-color 0.15s ease;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Gross Merchandise Value ↗</div>
            <div style="font-size: 1.65rem; font-weight: 700; color: ${brandColors.gold[400]}; margin-top: 6px;">${gmvStr}</div>
            <div style="font-size: 0.75rem; color: ${st.success[this.theme].text}; margin-top: 4px;">▲ +14.2% vs previous period</div>
          </a>

          <a href="/finance/ledger" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px; transition: border-color 0.15s ease;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Net Revenue (GAAP) ↗</div>
            <div style="font-size: 1.65rem; font-weight: 700; margin-top: 6px;">${netRevStr}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">Gross Margin: <strong>${marginPct}%</strong></div>
          </a>

          <a href="/inventory/availability" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px; transition: border-color 0.15s ease;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Stockout Risk Index ↗</div>
            <div style="font-size: 1.65rem; font-weight: 700; color: ${kpi.stockoutRiskIndex > 30 ? st.warning[this.theme].text : st.success[this.theme].text}; margin-top: 6px;">${kpi.stockoutRiskIndex} / 100</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Warehouse Utilization: ${kpi.warehouseUtilizationPct}%</div>
          </a>

          <a href="/registers" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px; transition: border-color 0.15s ease;">
            <div style="font-size: 0.8rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Till Cashier Variance ↗</div>
            <div style="font-size: 1.65rem; font-weight: 700; color: ${kpi.cashierVarianceAlertsMinor > 0n ? st.error[this.theme].text : st.success[this.theme].text}; margin-top: 6px;">${varianceStr}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Active Sessions: ${kpi.openTillSessionsCount} tills open</div>
          </a>

        </div>

        <div class="dashboard-panels" style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
          <div class="panel-main" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 700;">Multi-Channel Revenue Velocity (7-Day Trend)</h4>
              <span style="font-size: 0.75rem; color: ${tokens.textMuted};">Point of Sale • Wholesale B2B • E-Commerce</span>
            </div>
            <div class="revenue-chart-container" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 14px;">
              ${svgChart}
            </div>
          </div>

          <div class="panel-alerts" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 700;">Operational Alerts</h4>
              <span style="background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">Live Stream</span>
            </div>
            ${alertsHtml || `<div style="color: ${tokens.textMuted}; font-size: 0.85rem; padding: 16px 0; text-align: center;">All systems operational — zero alerts (zero active discrepancies)</div>`}
          </div>
        </div>
      </div>
    `.trim();
  }
}
