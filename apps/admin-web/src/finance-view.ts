/**
 * STOKROVA Admin Web — Finance, Double-Entry General Ledger & Chart of Accounts
 * Pure mathematical double-entry accounting (Debits = Credits), fiscal period control,
 * trial balance integrity, and financial statements.
 */

import { formatCurrencyMinor, themeTokens, semanticTokens } from '@stokrova/ui';

export type AccountClassification = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface ChartOfAccountItem {
  id: string;
  code: string; // e.g. "1010" Cash on Hand
  name: string;
  classification: AccountClassification;
  currencyCode: string;
  currentBalanceMinor: bigint;
  normalBalance: 'DEBIT' | 'CREDIT';
  isActive: boolean;
}

export interface JournalLineItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitMinor: bigint;
  creditMinor: bigint;
  memo?: string;
}

export interface GeneralJournalEntry {
  id: string;
  entryNumber: string;
  dateIso: string;
  description: string;
  reference?: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  postedAtIso?: string;
  lines: JournalLineItem[];
  currencyCode: string;
}

export interface FiscalPeriodRecord {
  id: string;
  periodName: string; // e.g. "2026-Q1" or "2026-10"
  startDateIso: string;
  endDateIso: string;
  isClosed: boolean;
  closedAtIso?: string;
}

export class FinanceViewModel {
  private accounts: Map<string, ChartOfAccountItem> = new Map();
  private journals: Map<string, GeneralJournalEntry> = new Map();
  private periods: FiscalPeriodRecord[] = [];
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  // ==========================================
  // Chart of Accounts
  // ==========================================

  public addAccount(account: ChartOfAccountItem): void {
    this.accounts.set(account.code, { ...account });
  }

  public getAccount(code: string): ChartOfAccountItem | undefined {
    return this.accounts.get(code);
  }

  public listAccounts(): ChartOfAccountItem[] {
    return Array.from(this.accounts.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  // ==========================================
  // General Journal Entries
  // ==========================================

  public addJournalEntry(entry: GeneralJournalEntry): void {
    // Validate double-entry invariant: Sum(Debits) === Sum(Credits)
    const totalDebits = entry.lines.reduce((acc, l) => acc + l.debitMinor, 0n);
    const totalCredits = entry.lines.reduce((acc, l) => acc + l.creditMinor, 0n);

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Double-entry imbalance: Total debits (${totalDebits}) must equal total credits (${totalCredits})`,
      );
    }

    this.journals.set(entry.id, { ...entry, lines: [...entry.lines] });
  }

  public getJournalEntry(id: string): GeneralJournalEntry | undefined {
    const j = this.journals.get(id);
    return j ? { ...j, lines: [...j.lines] } : undefined;
  }

  public listJournalEntries(): GeneralJournalEntry[] {
    return Array.from(this.journals.values());
  }

  public reverseJournalEntry(id: string, reversalNumber: string): GeneralJournalEntry {
    const original = this.journals.get(id);
    if (!original) throw new Error(`Journal ${id} not found`);
    if (original.status !== 'POSTED') throw new Error(`Cannot reverse unposted journal`);

    // Invert debits and credits
    const reversalLines: JournalLineItem[] = original.lines.map((l) => ({
      accountId: l.accountId,
      accountCode: l.accountCode,
      accountName: l.accountName,
      debitMinor: l.creditMinor,
      creditMinor: l.debitMinor,
      memo: `Reversal of ${original.entryNumber}: ${l.memo ?? ''}`,
    }));

    const reversal: GeneralJournalEntry = {
      id: `rev_${Date.now()}`,
      entryNumber: reversalNumber,
      dateIso: new Date().toISOString(),
      description: `Reversal of ${original.entryNumber} — ${original.description}`,
      reference: original.entryNumber,
      status: 'POSTED',
      postedAtIso: new Date().toISOString(),
      lines: reversalLines,
      currencyCode: original.currencyCode,
    };

    original.status = 'REVERSED';
    this.journals.set(reversal.id, reversal);
    return reversal;
  }

  // ==========================================
  // Fiscal Periods
  // ==========================================

  public setPeriods(periods: FiscalPeriodRecord[]): void {
    this.periods = [...periods];
  }

  public listPeriods(): FiscalPeriodRecord[] {
    return [...this.periods];
  }

  public closePeriod(periodId: string): void {
    const period = this.periods.find((p) => p.id === periodId);
    if (!period) throw new Error(`Period ${periodId} not found`);
    period.isClosed = true;
    period.closedAtIso = new Date().toISOString();
  }

  // ==========================================
  // Trial Balance & Integrity
  // ==========================================

  public calculateTrialBalance(): {
    totalDebitsMinor: bigint;
    totalCreditsMinor: bigint;
    isBalanced: boolean;
  } {
    let debits = 0n;
    let credits = 0n;

    for (const j of this.journals.values()) {
      if (j.status === 'POSTED') {
        for (const line of j.lines) {
          debits += line.debitMinor;
          credits += line.creditMinor;
        }
      }
    }

    return {
      totalDebitsMinor: debits,
      totalCreditsMinor: credits,
      isBalanced: debits === credits,
    };
  }

  // ==========================================
  // HTML Rendering
  // ==========================================

  public renderJournalLedgerHtml(currency = 'USD'): string {
    const tokens = themeTokens[this.theme];
    const journals = this.listJournalEntries();
    const trial = this.calculateTrialBalance();

    const rows = journals
      .map((j) => {
        const total = j.lines.reduce((acc, l) => acc + l.debitMinor, 0n);
        const st = semanticTokens;
        let badgeColor: { readonly bg: string; readonly text: string; readonly border: string } = st.info[this.theme];
        if (j.status === 'POSTED') badgeColor = st.success[this.theme];
        if (j.status === 'REVERSED') badgeColor = st.warning[this.theme];

        const lineDetails = j.lines
          .map((l) => `
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; padding: 2px 0; color: ${tokens.textSecondary};">
              <span><strong style="font-family: var(--stokrova-font-mono);">${l.accountCode}</strong> ${l.accountName}</span>
              <span style="font-family: var(--stokrova-font-mono);">
                ${l.debitMinor > 0n ? `Dr: ${formatCurrencyMinor(l.debitMinor, currency)}` : `Cr: ${formatCurrencyMinor(l.creditMinor, currency)}`}
              </span>
            </div>
          `.trim())
          .join('');

        return `
          <tr style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 12px 14px; font-weight: 600; font-family: var(--stokrova-font-mono);">${j.entryNumber}</td>
            <td style="padding: 12px 14px; font-size: 0.8125rem;">${j.dateIso.split('T')[0]}</td>
            <td style="padding: 12px 14px;">
              <div style="font-weight: 600;">${j.description}</div>
              <div style="margin-top: 6px; padding: 6px; background: ${tokens.cardHover}; border-radius: 4px;">${lineDetails}</div>
            </td>
            <td style="padding: 12px 14px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">
              ${formatCurrencyMinor(total, currency)}
            </td>
            <td style="padding: 12px 14px; text-align: center;">
              <span style="background: ${badgeColor.bg}; color: ${badgeColor.text}; border: 1px solid ${badgeColor.border}; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                ${j.status}
              </span>
            </td>
          </tr>
        `.trim();
      })
      .join('\n');

    return `
      <div class="finance-general-ledger-view" style="color: ${tokens.textPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Double-Entry General Ledger</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Immutable journal entries (Rule 11: never silently delete financial history)</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: ${tokens.surface}; border: 1px solid ${trial.isBalanced ? '#1E4620' : '#5C1D24'}; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem;">
              <span style="color: ${trial.isBalanced ? '#4ADE80' : '#F87171'}; font-weight: 700;">
                ${trial.isBalanced ? '✓ Trial Balance In Balance' : '⚠ Discrepancy Detected'}
              </span>
              <span style="color: ${tokens.textMuted}; margin-left: 6px;">Total Dr/Cr: ${formatCurrencyMinor(trial.totalDebitsMinor, currency)}</span>
            </div>
            <button onclick="window.stokrovaApp?.showToast('Manual journal entry modal opened.')" style="padding: 8px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
              + Post Journal
            </button>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px;">
          <thead>
            <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; font-size: 0.8125rem; color: ${tokens.textSecondary};">
              <th style="padding: 12px 14px;">Entry #</th>
              <th style="padding: 12px 14px;">Date</th>
              <th style="padding: 12px 14px;">Description & Account Allocation</th>
              <th style="padding: 12px 14px; text-align: right;">Total Amount</th>
              <th style="padding: 12px 14px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="5" style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No general journal entries posted</td></tr>`}
          </tbody>
        </table>
      </div>
    `.trim();
  }

  public renderChartOfAccountsHtml(currency = 'USD'): string {
    const tokens = themeTokens[this.theme];
    const accounts = this.listAccounts();

    const rows = accounts
      .map((a) => `
        <tr style="border-bottom: 1px solid ${tokens.border};">
          <td style="padding: 10px 14px; font-weight: 600; font-family: var(--stokrova-font-mono);">${a.code}</td>
          <td style="padding: 10px 14px; font-weight: 600;">${a.name}</td>
          <td style="padding: 10px 14px;">
            <span style="background: ${tokens.cardHover}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${a.classification}</span>
          </td>
          <td style="padding: 10px 14px; font-size: 0.8125rem;">${a.normalBalance}</td>
          <td style="padding: 10px 14px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">
            ${formatCurrencyMinor(a.currentBalanceMinor, currency)}
          </td>
        </tr>
      `.trim())
      .join('\n');

    return `
      <div class="chart-of-accounts-view" style="color: ${tokens.textPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Chart of Accounts (GAAP / IFRS)</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Master account codes, classifications, and current ledger balances</p>
          </div>
          <button onclick="window.stokrovaApp?.showToast('Add account modal opened.')" style="padding: 8px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
            + Add Account
          </button>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px;">
          <thead>
            <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; font-size: 0.8125rem; color: ${tokens.textSecondary};">
              <th style="padding: 10px 14px;">Account Code</th>
              <th style="padding: 10px 14px;">Account Title</th>
              <th style="padding: 10px 14px;">Type</th>
              <th style="padding: 10px 14px;">Normal Balance</th>
              <th style="padding: 10px 14px; text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="5" style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No accounts established</td></tr>`}
          </tbody>
        </table>
      </div>
    `.trim();
  }
}
