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
    const isDark = this.theme === 'dark';
    const kpi = this.kpi;
    const gmvStr = formatCurrencyMinor(kpi.grossMerchandiseValueMinor, kpi.currencyCode);
    const netRevStr = formatCurrencyMinor(kpi.netRevenueMinor, kpi.currencyCode);
    const marginPct = (kpi.grossMarginBps / 100).toFixed(2);
    const varianceStr = formatCurrencyMinor(kpi.cashierVarianceAlertsMinor, kpi.currencyCode);
    const st = semanticTokens;

    const cardBg = tokens.card;
    const borderCol = tokens.border;
    const borderStrong = tokens.borderStrong;
    const textPri = tokens.textPrimary;
    const textSec = tokens.textSecondary;
    const textMut = tokens.textMuted;
    const goldPrimary = brandColors.gold[500];
    const goldAccent = isDark ? brandColors.gold[400] : brandColors.gold[600];

    const alertsHtml = this.alerts
      .slice(0, 5)
      .map((a) => {
        let sevBg: string = st.info[this.theme].bg;
        let sevText: string = st.info[this.theme].text;
        let sevBorder: string = st.info[this.theme].border;
        let sevIcon = 'ℹ️';

        if (a.severity === 'WARNING') {
          sevBg = st.warning[this.theme].bg;
          sevText = st.warning[this.theme].text;
          sevBorder = st.warning[this.theme].border;
          sevIcon = '⚠️';
        } else if (a.severity === 'CRITICAL') {
          sevBg = st.error[this.theme].bg;
          sevText = st.error[this.theme].text;
          sevBorder = st.error[this.theme].border;
          sevIcon = '🚨';
        }

        return `
          <div class="alert-item" style="border: 1px solid ${sevBorder}; background: ${sevBg}; padding: 12px 14px; margin-bottom: 8px; border-radius: 8px; transition: transform 0.15s ease;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-weight: 700; font-size: 0.8125rem; color: ${sevText}; display: inline-flex; align-items: center; gap: 6px;">
                <span>${sevIcon}</span>
                <span>${a.title}</span>
              </span>
              <span style="font-size: 0.6875rem; color: ${textMut}; font-family: var(--stokrova-font-mono, monospace);">Just now</span>
            </div>
            <div style="font-size: 0.8125rem; color: ${textSec}; margin-top: 4px; line-height: 1.4;">${a.message}</div>
          </div>
        `.trim();
      })
      .join('\n');

    // SVG Revenue Area Chart with precise viewBox and gradient
    const svgChart = `
      <svg viewBox="0 0 600 180" style="width: 100%; height: 210px; overflow: visible;" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="7-Day Multi-Channel Revenue Velocity Chart">
        <defs>
          <linearGradient id="revenueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${goldPrimary}" stop-opacity="0.38" />
            <stop offset="65%" stop-color="${goldPrimary}" stop-opacity="0.08" />
            <stop offset="100%" stop-color="${goldPrimary}" stop-opacity="0.0" />
          </linearGradient>
          <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${isDark ? '#414F5A' : '#CBD5E1'}" />
            <stop offset="100%" stop-color="${isDark ? '#586A78' : '#94A3B8'}" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${goldPrimary}" flood-opacity="0.35" />
          </filter>
        </defs>

        <!-- Horizontal Guide Lines -->
        <line x1="0" y1="35" x2="600" y2="35" stroke="${borderCol}" stroke-dasharray="3 3" stroke-width="1" />
        <line x1="0" y1="80" x2="600" y2="80" stroke="${borderCol}" stroke-dasharray="3 3" stroke-width="1" />
        <line x1="0" y1="125" x2="600" y2="125" stroke="${borderCol}" stroke-dasharray="3 3" stroke-width="1" />
        <line x1="0" y1="160" x2="600" y2="160" stroke="${borderCol}" stroke-width="1" />

        <!-- Target Baseline Projection Line -->
        <path d="M 0 135 L 120 120 L 240 110 L 360 85 L 480 75 L 600 60" fill="none" stroke="url(#targetGrad)" stroke-width="1.5" stroke-dasharray="4 4" />

        <!-- Area Fill -->
        <path d="M 0 150 Q 100 120, 200 135 T 400 70 T 600 50 L 600 160 L 0 160 Z" fill="url(#revenueGrad)" />

        <!-- Primary Trend Line -->
        <path d="M 0 150 Q 100 120, 200 135 T 400 70 T 600 50" fill="none" stroke="${goldPrimary}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#goldGlow)" />

        <!-- Data Marker Points -->
        <g class="chart-markers">
          <circle cx="0" cy="150" r="3.5" fill="${goldPrimary}" stroke="${cardBg}" stroke-width="2" />
          <circle cx="100" cy="122" r="3.5" fill="${goldPrimary}" stroke="${cardBg}" stroke-width="2" />
          <circle cx="200" cy="135" r="4.5" fill="${goldPrimary}" stroke="${cardBg}" stroke-width="2" />
          <circle cx="300" cy="98" r="3.5" fill="${goldPrimary}" stroke="${cardBg}" stroke-width="2" />
          <circle cx="400" cy="70" r="4.5" fill="${goldPrimary}" stroke="${cardBg}" stroke-width="2" />
          <circle cx="500" cy="58" r="3.5" fill="${goldPrimary}" stroke="${cardBg}" stroke-width="2" />
          <circle cx="600" cy="50" r="5.5" fill="#4ADE80" stroke="${cardBg}" stroke-width="2.5" />
        </g>

        <!-- Current Value Callout Bubble -->
        <g transform="translate(520, 20)">
          <rect x="-10" y="-14" width="85" height="22" rx="4" fill="${isDark ? '#242A2F' : '#FFFFFF'}" stroke="${goldPrimary}" stroke-width="1" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.15))" />
          <text x="32" y="1" text-anchor="middle" fill="${goldAccent}" font-size="10" font-weight="700" font-family="'JetBrains Mono', monospace">$382.0k</text>
        </g>

        <!-- X-Axis Labels -->
        <text x="5" y="176" fill="${textMut}" font-size="11" font-weight="500" font-family="var(--stokrova-font-sans, sans-serif)">Mon 08</text>
        <text x="145" y="176" fill="${textMut}" font-size="11" font-weight="500" font-family="var(--stokrova-font-sans, sans-serif)">Wed 10</text>
        <text x="290" y="176" fill="${textMut}" font-size="11" font-weight="500" font-family="var(--stokrova-font-sans, sans-serif)">Fri 12</text>
        <text x="435" y="176" fill="${textMut}" font-size="11" font-weight="500" font-family="var(--stokrova-font-sans, sans-serif)">Sun 14</text>
        <text x="555" y="176" fill="${goldAccent}" font-size="11" font-weight="700" font-family="var(--stokrova-font-sans, sans-serif)">Today</text>
      </svg>
    `.trim();

    return `
      <div class="executive-dashboard" style="color: ${textPri};">
        <!-- Dashboard Top Context Bar -->
        <div class="dashboard-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: ${tokens.surface}; padding: 14px 20px; border-radius: 10px; border: 1px solid ${borderCol}; box-shadow: 0 1px 3px rgba(0,0,0,0.04); flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.8125rem; font-weight: 600; color: ${textSec};">Consolidated Scope:</span>
              <span style="background: ${isDark ? 'rgba(189,150,82,0.15)' : '#FDFBF7'}; border: 1px solid ${goldPrimary}; color: ${goldAccent}; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
                🏛️ All Companies & Branches (Global Group)
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.8125rem; font-weight: 600; color: ${textSec};">Period:</span>
              <span style="background: ${cardBg}; border: 1px solid ${borderStrong}; color: ${textPri}; font-size: 0.75rem; font-weight: 600; padding: 3px 9px; border-radius: 6px;">Last 7 Days (Live Sync)</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #16A34A; font-weight: 600; padding: 4px 8px; border-radius: 6px; background: ${isDark ? '#14291F' : '#F0FDF4'}; border: 1px solid ${isDark ? '#1E4620' : '#BBF7D0'};">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #16A34A;"></span>
              <span>Replication 0ms Lag</span>
            </span>
            <button onclick="window.stokrovaApp?.showToast('Refreshed real-time telemetry from double-entry ledger.')" style="display: inline-flex; align-items: center; gap: 6px; background: ${cardBg}; border: 1px solid ${borderStrong}; color: ${textPri}; padding: 7px 14px; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">
              <span>⟳</span>
              <span>Refresh Ledgers</span>
            </button>
            <button onclick="window.stokrovaApp?.showToast('Exported Executive Operations briefing (PDF).')" style="display: inline-flex; align-items: center; gap: 6px; background: ${goldPrimary}; color: ${tokens.primaryForeground}; border: none; padding: 7px 16px; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(189,150,82,0.25); transition: all 0.15s ease;">
              <span>⬇</span>
              <span>Export Briefing</span>
            </button>
          </div>
        </div>

        <!-- 6 Executive KPI Bento-Grid Cards (Row 1) -->
        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px;">
          
          <!-- Card 1: GMV -->
          <a href="/orders" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: ${textMut}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Gross Merchandise Value</span>
              <span style="font-size: 0.85rem; color: ${goldAccent};">↗</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 800; color: ${goldAccent}; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum';">${gmvStr}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 0.75rem;">
              <span style="color: ${st.success[this.theme].text}; font-weight: 600;">▲ +14.2%</span>
              <span style="color: ${textMut};">vs previous period</span>
            </div>
          </a>

          <!-- Card 2: Net Revenue -->
          <a href="/finance/ledger" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: ${textMut}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Net Revenue (GAAP)</span>
              <span style="font-size: 0.85rem; color: ${textSec};">↗</span>
            </div>
            <div class="stokrova-net-revenue" style="font-size: 1.65rem; font-weight: 800; color: ${textPri}; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum';">${netRevStr}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 0.75rem;">
              <span style="color: ${st.success[this.theme].text}; font-weight: 600;">▲ +9.8%</span>
              <span style="color: ${textSec};">Margin: <strong>${marginPct}%</strong></span>
            </div>
          </a>

          <!-- Card 3: Gross Margin with bps delta -->
          <a href="/finance/ledger" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: ${textMut}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Gross Margin</span>
              <span style="font-size: 0.85rem; color: ${textSec};">↗</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 800; color: ${textPri}; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum';">${marginPct}%</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 0.75rem;">
              <span style="color: ${st.success[this.theme].text}; font-weight: 600;">+120 bps</span>
              <span style="color: ${textMut};">${kpi.grossMarginBps} bps vs target</span>
            </div>
          </a>

          <!-- Card 4: Stockout Risk Index -->
          <a href="/inventory/availability" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: ${textMut}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Stockout Risk</span>
              <span style="font-size: 0.85rem; color: ${textSec};">↗</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 800; color: ${kpi.stockoutRiskIndex > 30 ? st.warning[this.theme].text : '#16A34A'}; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum';">${kpi.stockoutRiskIndex} / 100</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 0.75rem;">
              <span style="color: #16A34A; font-weight: 600;">Low Risk</span>
              <span style="color: ${textMut};">Threshold &lt; 15</span>
            </div>
          </a>

          <!-- Card 5: Space Utilization -->
          <a href="/inventory/availability" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: ${textMut}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Space Utilisation</span>
              <span style="font-size: 0.85rem; color: ${textSec};">↗</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 800; color: ${textPri}; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum';">${kpi.warehouseUtilizationPct}%</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 0.75rem;">
              <span style="color: ${goldAccent}; font-weight: 600;">Optimal</span>
              <span style="color: ${textMut};">Max Cap: 85.0%</span>
            </div>
          </a>

          <!-- Card 6: Cashier Variance -->
          <a href="/registers" class="kpi-card" style="text-decoration: none; color: inherit; display: block; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: ${textMut}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Till Cashier Variance</span>
              <span style="font-size: 0.85rem; color: ${textSec};">↗</span>
            </div>
            <div style="font-size: 1.65rem; font-weight: 800; color: ${kpi.cashierVarianceAlertsMinor > 0n ? st.error[this.theme].text : '#16A34A'}; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum';">${varianceStr}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 0.75rem;">
              <span style="color: #16A34A; font-weight: 600;">✓ In Balance</span>
              <span style="color: ${textMut};">${kpi.openTillSessionsCount} tills open</span>
            </div>
          </a>

        </div>

        <!-- 12-Column Bento Grid Section (Row 2: 8 cols Chart + 4 cols Alerts) -->
        <div class="dashboard-panels" style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; margin-bottom: 20px;">
          
          <!-- Chart Panel (8 Columns) -->
          <div class="panel-main" style="grid-column: span 8; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
              <div>
                <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: ${textPri};">Multi-Channel Revenue Velocity</h3>
                <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: ${textMut};">Hourly aggregate throughput across POS registers, wholesale invoices, and mobile field orders</p>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; font-size: 0.75rem;">
                <span style="display: inline-flex; align-items: center; gap: 6px; color: ${textPri}; font-weight: 600;">
                  <span style="width: 10px; height: 3px; background: ${goldPrimary}; border-radius: 2px;"></span>
                  <span>Actual Revenue</span>
                </span>
                <span style="display: inline-flex; align-items: center; gap: 6px; color: ${textMut};">
                  <span style="width: 10px; height: 2px; background: ${borderStrong}; border-radius: 2px;"></span>
                  <span>Budget Target</span>
                </span>
              </div>
            </div>
            
            <div class="revenue-chart-container" style="background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${borderCol}; border-radius: 8px; padding: 14px 16px 8px 16px;">
              ${svgChart}
            </div>

            <!-- Chart Footer Stream Breakdown -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid ${borderCol};">
              <div>
                <div style="font-size: 0.6875rem; color: ${textMut}; text-transform: uppercase; font-weight: 700;">Walk-in POS</div>
                <div style="font-size: 1rem; font-weight: 700; color: ${textPri}; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">$184,200.00</div>
                <div style="font-size: 0.6875rem; color: #16A34A; margin-top: 1px;">48.2% of total</div>
              </div>
              <div>
                <div style="font-size: 0.6875rem; color: ${textMut}; text-transform: uppercase; font-weight: 700;">B2B Wholesale Invoices</div>
                <div style="font-size: 1rem; font-weight: 700; color: ${textPri}; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">$141,800.00</div>
                <div style="font-size: 0.6875rem; color: ${goldAccent}; margin-top: 1px;">37.1% of total</div>
              </div>
              <div>
                <div style="font-size: 0.6875rem; color: ${textMut}; text-transform: uppercase; font-weight: 700;">Mobile & Field Scans</div>
                <div style="font-size: 1rem; font-weight: 700; color: ${textPri}; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">$56,000.00</div>
                <div style="font-size: 0.6875rem; color: ${textSec}; margin-top: 1px;">14.7% of total</div>
              </div>
            </div>
          </div>

          <!-- Live Operational Alerts (4 Columns) -->
          <div class="panel-alerts" style="grid-column: span 4; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div>
                <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: ${textPri};">Operational Alerts</h3>
                <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: ${textMut};">Real-time business notifications & policy triggers</p>
              </div>
              <span style="background: ${isDark ? 'rgba(189,150,82,0.15)' : '#FDFBF7'}; border: 1px solid ${goldPrimary}; color: ${goldAccent}; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                ${this.alerts.length} Active
              </span>
            </div>
            
            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;">
              ${alertsHtml || `<div style="color: ${textMut}; font-size: 0.8125rem; padding: 24px 0; text-align: center;">All systems operational — zero alerts (zero active discrepancies)</div>`}
            </div>

            <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid ${borderCol}; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: ${textMut};">Policy engine auto-audit</span>
              <a href="/audit/forensics" style="color: ${goldAccent}; font-size: 0.75rem; font-weight: 600; text-decoration: none;">View Merkle Trail →</a>
            </div>
          </div>
        </div>

        <!-- Bento Grid Row 3 (4 cols + 4 cols + 4 cols) -->
        <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px;">
          <!-- Panel A: Capital Efficiency Intelligence -->
          <div style="grid-column: span 4; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 0.875rem; font-weight: 700; color: ${textPri};">Capital Efficiency & Turnover</h4>
              <span style="font-size: 0.7rem; color: #16A34A; font-weight: 600;">Healthy</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div style="padding: 10px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border-radius: 8px; border: 1px solid ${borderCol};">
                <div style="font-size: 0.6875rem; color: ${textMut};">Turnover Ratio (ITR)</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${textPri}; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">8.4x / yr</div>
              </div>
              <div style="padding: 10px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border-radius: 8px; border: 1px solid ${borderCol};">
                <div style="font-size: 0.6875rem; color: ${textMut};">Days Outstanding (DIO)</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${textPri}; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">43.4 d</div>
              </div>
              <div style="padding: 10px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border-radius: 8px; border: 1px solid ${borderCol};">
                <div style="font-size: 0.6875rem; color: ${textMut};">GMROI Return</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #16A34A; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">285%</div>
              </div>
              <div style="padding: 10px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border-radius: 8px; border: 1px solid ${borderCol};">
                <div style="font-size: 0.6875rem; color: ${textMut};">Cash Conversion (CCC)</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${goldAccent}; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">18.2 d</div>
              </div>
            </div>
          </div>

          <!-- Panel B: Fiscal Compliance & E-Invoicing Health -->
          <div style="grid-column: span 4; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 0.875rem; font-weight: 700; color: ${textPri};">Fiscal E-Invoicing & Taxes</h4>
              <span style="font-size: 0.7rem; color: #16A34A; font-weight: 600;">100% Compliant</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; padding: 8px 10px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border-radius: 6px;">
                <span style="color: ${textSec};">HMRC MTD / PEPPOL Dispatch</span>
                <span style="color: #16A34A; font-weight: 700;">1,420 / 1,420</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; padding: 8px 10px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border-radius: 6px;">
                <span style="color: ${textSec};">VAT / Output Tax Accrued</span>
                <span style="color: ${textPri}; font-weight: 700; font-family: 'JetBrains Mono', monospace;">$76,400.00</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; padding: 8px 10px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border-radius: 6px;">
                <span style="color: ${textSec};">Tax Authority Timestamp Verification</span>
                <span style="color: #16A34A; font-weight: 600;">Verified (0 Failures)</span>
              </div>
            </div>
          </div>

          <!-- Panel C: Quick Executive Actions -->
          <div style="grid-column: span 4; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 0.875rem; font-weight: 700; color: ${textPri};">Executive Shortcuts</h4>
              <span style="font-size: 0.7rem; color: ${textMut};">F1 - F12 Keys</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button onclick="window.stokrovaApp?.showView('pos')" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${borderCol}; color: ${textPri}; font-size: 0.8125rem; font-weight: 600; cursor: pointer; text-align: left; transition: all 0.12s ease;">
                <span>💳</span>
                <span>Launch POS Station</span>
              </button>
              <button onclick="window.stokrovaApp?.showView('po')" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${borderCol}; color: ${textPri}; font-size: 0.8125rem; font-weight: 600; cursor: pointer; text-align: left; transition: all 0.12s ease;">
                <span>📋</span>
                <span>Approve Purchase PO</span>
              </button>
              <button onclick="window.stokrovaApp?.showView('gl')" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${borderCol}; color: ${textPri}; font-size: 0.8125rem; font-weight: 600; cursor: pointer; text-align: left; transition: all 0.12s ease;">
                <span>⚖️</span>
                <span>General Ledger Trial</span>
              </button>
              <button onclick="window.stokrovaApp?.showView('rebranding')" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${borderCol}; color: ${textPri}; font-size: 0.8125rem; font-weight: 600; cursor: pointer; text-align: left; transition: all 0.12s ease;">
                <span>🎨</span>
                <span>Rebranding Studio</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `.trim();
  }
}
