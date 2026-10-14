/**
 * STOKROVA Admin Web — Cash Registers & Till Session Operations View
 * Blind cash reconciliation auditing, opening float verification,
 * and live cashier variance detection across retail store registers.
 */

import { formatCurrencyMinor, themeTokens, semanticTokens } from '@stokrova/ui';

export interface TillSessionOverviewItem {
  id: string;
  registerCode: string;
  registerName: string;
  branchName: string;
  cashierName: string;
  openedAtIso: string;
  closedAtIso?: string;
  openingFloatMinor: bigint;
  cashSalesMinor: bigint;
  cashInMinor: bigint;
  cashOutMinor: bigint;
  expectedClosingCashMinor: bigint;
  actualClosingCashMinor?: bigint;
  varianceMinor?: bigint;
  status: 'OPEN' | 'RECONCILED' | 'VARIANCE_ALERT';
}

export class RegistersViewModel {
  private sessions: Map<string, TillSessionOverviewItem> = new Map();
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public addSession(session: TillSessionOverviewItem): void {
    this.sessions.set(session.id, { ...session });
  }

  public getSession(id: string): TillSessionOverviewItem | undefined {
    return this.sessions.get(id);
  }

  public listSessions(): TillSessionOverviewItem[] {
    return Array.from(this.sessions.values());
  }

  public reconcileSession(sessionId: string, actualCountMinor: bigint): TillSessionOverviewItem {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Till session ${sessionId} not found`);

    session.actualClosingCashMinor = actualCountMinor;
    session.varianceMinor = actualCountMinor - session.expectedClosingCashMinor;
    session.closedAtIso = new Date().toISOString();

    if (session.varianceMinor === 0n) {
      session.status = 'RECONCILED';
    } else {
      session.status = 'VARIANCE_ALERT';
    }

    return { ...session };
  }

  public renderSessionsTableHtml(currency = 'USD'): string {
    const tokens = themeTokens[this.theme];
    const sessions = this.listSessions();

    const rows = sessions
      .map((s) => {
        const st = semanticTokens;
        let badgeColor: { readonly bg: string; readonly text: string; readonly border: string } = st.info[this.theme];
        if (s.status === 'RECONCILED') badgeColor = st.success[this.theme];
        if (s.status === 'VARIANCE_ALERT') badgeColor = st.error[this.theme];

        const varianceStr = s.varianceMinor !== undefined
          ? formatCurrencyMinor(s.varianceMinor, currency)
          : '—';

        return `
          <tr style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 12px 14px; font-weight: 600; font-family: var(--stokrova-font-mono);">${s.registerCode}</td>
            <td style="padding: 12px 14px;">
              <div style="font-weight: 600;">${s.registerName}</div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Cashier: <strong>${s.cashierName}</strong> (${s.branchName})</div>
            </td>
            <td style="padding: 12px 14px; text-align: right; font-family: var(--stokrova-font-mono);">${formatCurrencyMinor(s.openingFloatMinor, currency)}</td>
            <td style="padding: 12px 14px; text-align: right; font-family: var(--stokrova-font-mono);">${formatCurrencyMinor(s.cashSalesMinor, currency)}</td>
            <td style="padding: 12px 14px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 600;">${formatCurrencyMinor(s.expectedClosingCashMinor, currency)}</td>
            <td style="padding: 12px 14px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700; color: ${(s.varianceMinor ?? 0n) < 0n ? st.error[this.theme].text : 'inherit'};">
              ${varianceStr}
            </td>
            <td style="padding: 12px 14px; text-align: center;">
              <span style="background: ${badgeColor.bg}; color: ${badgeColor.text}; border: 1px solid ${badgeColor.border}; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                ${s.status}
              </span>
            </td>
          </tr>
        `.trim();
      })
      .join('\n');

    return `
      <div class="registers-oversight-view" style="color: ${tokens.textPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Till Sessions & Cash Drawer Reconciliation</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Live register float tracking, cash movements, and blind audit variance control (Rule 7 & 20)</p>
          </div>
          <button onclick="window.stokrovaApp?.showToast('Refreshed active till session registers.')" style="padding: 8px 16px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
            ⟳ Refresh Sessions
          </button>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px;">
          <thead>
            <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; font-size: 0.8125rem; color: ${tokens.textSecondary};">
              <th style="padding: 12px 14px;">Register Code</th>
              <th style="padding: 12px 14px;">Station & Cashier</th>
              <th style="padding: 12px 14px; text-align: right;">Opening Float</th>
              <th style="padding: 12px 14px; text-align: right;">Cash Sales</th>
              <th style="padding: 12px 14px; text-align: right;">Expected Balance</th>
              <th style="padding: 12px 14px; text-align: right;">Closing Variance</th>
              <th style="padding: 12px 14px; text-align: center;">Session Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="7" style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No till sessions recorded</td></tr>`}
          </tbody>
        </table>
      </div>
    `.trim();
  }
}
