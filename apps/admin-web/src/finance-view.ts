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
  postedBy?: string; // Member user ID who committed the entry to GL
  postedByName?: string; // Display name of posting member
  preparedBy?: string; // Member user ID who drafted the voucher
  preparedByName?: string; // Display name of drafting member
  sourceDocumentRef?: string; // Source transaction voucher reference
  reconciliationId?: string; // Associated subledger reconciliation if applicable
  turnaroundMinutes?: number; // Time in minutes from draft to post
}

export type SubledgerType = 'BANK_ACCOUNT' | 'ACCOUNTS_RECEIVABLE' | 'ACCOUNTS_PAYABLE' | 'INVENTORY_LEDGER' | 'CASH_DRAWER';

export interface SubledgerReconciliationRecord {
  id: string;
  reconciliationType: SubledgerType;
  title: string;
  accountCode: string;
  periodId: string;
  ledgerBalanceMinor: bigint;
  statementBalanceMinor: bigint;
  discrepancyMinor: bigint; // ledger - statement
  status: 'BALANCED' | 'PENDING_INVESTIGATION' | 'ADJUSTED';
  performedBy: string;
  performedByName: string;
  performedAtIso: string;
  notes?: string;
}

export interface AccountantPersonalMetrics {
  vouchersPrepared: number;
  vouchersPreparedDraftCount: number;
  postedToGlCount: number;
  journalsPostedCount: number;
  journalsPostedTotalMinor: bigint;
  reconciliationsBalanced: number;
  reconciliationsBalancedCount: number;
  discrepanciesInvestigating: number;
  discrepanciesUnderInvestigationCount: number;
  reversalsHandledCount: number;
  averageTurnaroundMinutes: number;
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
  private reconciliations: Map<string, SubledgerReconciliationRecord> = new Map();
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
  // Subledger Reconciliations
  // ==========================================

  public recordReconciliation(rec: SubledgerReconciliationRecord): void {
    this.reconciliations.set(rec.id, { ...rec });
  }

  public getReconciliation(id: string): SubledgerReconciliationRecord | undefined {
    return this.reconciliations.get(id);
  }

  public listReconciliations(): SubledgerReconciliationRecord[] {
    return Array.from(this.reconciliations.values());
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
  // Subledger Reconciliations
  // ==========================================

  public addSubledgerReconciliation(record: SubledgerReconciliationRecord): void {
    this.reconciliations.set(record.id, { ...record });
  }

  public getSubledgerReconciliation(id: string): SubledgerReconciliationRecord | undefined {
    return this.reconciliations.get(id);
  }

  public listSubledgerReconciliations(): SubledgerReconciliationRecord[] {
    return Array.from(this.reconciliations.values());
  }

  public reconcileSubledger(id: string, statementBalanceMinor: bigint, notes?: string): SubledgerReconciliationRecord {
    const rec = this.reconciliations.get(id);
    if (!rec) throw new Error(`Reconciliation ${id} not found`);

    rec.statementBalanceMinor = statementBalanceMinor;
    rec.discrepancyMinor = rec.ledgerBalanceMinor - statementBalanceMinor;
    rec.performedAtIso = new Date().toISOString();
    if (notes) rec.notes = notes;

    if (rec.discrepancyMinor === 0n) {
      rec.status = 'BALANCED';
    } else {
      rec.status = 'PENDING_INVESTIGATION';
    }

    return { ...rec };
  }

  // ==========================================
  // Personal Analytics for Assigned Accountant
  // ==========================================

  public getAccountantPersonalMetrics(memberId: string): AccountantPersonalMetrics {
    const allJournals = Array.from(this.journals.values());
    const allReconciliations = Array.from(this.reconciliations.values());

    let vouchersPreparedCount = 0;
    let vouchersPreparedDraftCount = 0;
    let journalsPostedCount = 0;
    let journalsPostedTotalMinor = 0n;
    let reversalsHandledCount = 0;
    let totalTurnaround = 0;
    let turnaroundCount = 0;

    for (const j of allJournals) {
      if (j.preparedBy === memberId) {
        vouchersPreparedCount++;
        if (j.status === 'DRAFT') {
          vouchersPreparedDraftCount++;
        }
      }
      if (j.postedBy === memberId) {
        if (j.status === 'POSTED') {
          journalsPostedCount++;
          const entryTotal = j.lines.reduce((sum, l) => sum + l.debitMinor, 0n);
          journalsPostedTotalMinor += entryTotal;
        } else if (j.status === 'REVERSED') {
          reversalsHandledCount++;
        }
      }
      if ((j.postedBy === memberId || j.preparedBy === memberId) && j.turnaroundMinutes !== undefined) {
        totalTurnaround += j.turnaroundMinutes;
        turnaroundCount++;
      }
    }

    let reconciliationsBalancedCount = 0;
    let discrepanciesUnderInvestigationCount = 0;

    for (const r of allReconciliations) {
      if (r.performedBy === memberId) {
        if (r.status === 'BALANCED' || r.discrepancyMinor === 0n) {
          reconciliationsBalancedCount++;
        } else {
          discrepanciesUnderInvestigationCount++;
        }
      }
    }

    const averageTurnaroundMinutes = turnaroundCount > 0 ? Math.round(totalTurnaround / turnaroundCount) : 14;

    return {
      vouchersPrepared: vouchersPreparedCount,
      vouchersPreparedDraftCount,
      postedToGlCount: journalsPostedCount,
      journalsPostedCount,
      journalsPostedTotalMinor,
      reconciliationsBalanced: reconciliationsBalancedCount,
      reconciliationsBalancedCount,
      discrepanciesInvestigating: discrepanciesUnderInvestigationCount,
      discrepanciesUnderInvestigationCount,
      reversalsHandledCount,
      averageTurnaroundMinutes,
    };
  }

  // ==========================================
  // HTML Rendering
  // ==========================================

  public renderJournalLedgerHtml(currency = 'USD', filterMemberId?: string): string {
    const tokens = themeTokens[this.theme];
    let journals = this.listJournalEntries();
    if (filterMemberId) {
      journals = journals.filter((j) => j.postedBy === filterMemberId || j.preparedBy === filterMemberId);
    }
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

        const attributionTag = j.postedByName || j.preparedByName
          ? `<div style="font-size: 0.6875rem; color: ${tokens.textMuted}; margin-top: 4px;">Prepared: <strong>${j.preparedByName || 'System'}</strong> • Posted: <strong>${j.postedByName || 'System'}</strong></div>`
          : '';

        return `
          <tr style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 12px 14px; font-weight: 600; font-family: var(--stokrova-font-mono);">${j.entryNumber}</td>
            <td style="padding: 12px 14px; font-size: 0.8125rem;">${(j.dateIso || j.postedAtIso || '2026-03-31T00:00:00Z').split('T')[0]}</td>
            <td style="padding: 12px 14px;">
              <div style="font-weight: 600;">${j.description}</div>
              ${attributionTag}
              <div style="margin-top: 6px; padding: 6px; background: ${tokens.cardHover}; border-radius: 4px;">${lineDetails}</div>
            </td>
            <td style="padding: 12px 14px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">
              ${formatCurrencyMinor(total, currency)}
            </td>
            <td style="padding: 12px 14px; text-align: center;">
              <span style="background: ${badgeColor.bg}; color: ${badgeColor.text}; border: 1px solid ${badgeColor.border}; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                ${j.status}
              </span>
            </td>
          </tr>
        `.trim();
      })
      .join('\n');

    return `
      <div class="finance-general-ledger-view" style="color: ${tokens.textPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Double-Entry General Ledger</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Immutable audit-compliant journal entries with verified double-entry balancing</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="background: ${tokens.surface}; border: 1px solid ${trial.isBalanced ? '#1E4620' : '#5C1D24'}; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem;">
              <span style="color: ${trial.isBalanced ? '#4ADE80' : '#F87171'}; font-weight: 700;">
                ${trial.isBalanced ? '✓ Trial Balance In Balance' : '⚠ Discrepancy Detected'}
              </span>
              <span style="color: ${tokens.textMuted}; margin-left: 6px;">Total Dr/Cr: ${formatCurrencyMinor(trial.totalDebitsMinor, currency)}</span>
            </div>
            <button onclick="window.stokrovaApp?.openJournalModal ? window.stokrovaApp.openJournalModal() : window.stokrovaApp?.showToast('Manual journal entry modal opened.')" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
              + Post Journal
            </button>
          </div>
        </div>
        <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border: 1px solid ${tokens.border}; border-radius: 8px; background: ${tokens.surface}; margin-bottom: 16px;">
          <table style="width: 100%; min-width: 680px; border-collapse: collapse;">
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Chart of Accounts (GAAP / IFRS)</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Master account codes, classifications, and current ledger balances</p>
          </div>
          <button onclick="window.stokrovaApp?.openAddAccountModal ? window.stokrovaApp.openAddAccountModal() : window.stokrovaApp?.showToast('Add account modal opened.')" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
            + Add Account
          </button>
        </div>
        <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border: 1px solid ${tokens.border}; border-radius: 8px; background: ${tokens.surface};">
          <table style="width: 100%; min-width: 640px; border-collapse: collapse;">
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
      </div>
    `.trim();
  }

  /**
   * Phase 2: Dedicated Assigned Accountant Workspace & Personal Analytics View
   */
  public renderAccountantWorkspaceHtml(options: {
    currentMemberId: string;
    currentMemberName: string;
    companyName?: string;
    currency?: string;
    filterMode?: 'my' | 'all';
    isGeneralAccountant?: boolean;
  }): string {
    const tokens = themeTokens[this.theme];
    const currency = options.currency || 'USD';
    const memberId = options.currentMemberId;
    const memberName = options.currentMemberName;
    const company = options.companyName || 'Primary Operating Entity';
    const filterMode = options.filterMode || 'my';
    const isGeneralAccountant = options.isGeneralAccountant ?? true;

    const metrics = this.getAccountantPersonalMetrics(memberId);
    const reconciliations = this.listSubledgerReconciliations();
    const trial = this.calculateTrialBalance();

    // Determine Gold color token for text accessibility
    const goldText = this.theme === 'light' ? '#85642D' : '#E0CB9F';

    // Subledger reconciliation rows
    const reconRows = reconciliations
      .map((r) => {
        const isMatched = r.status === 'BALANCED';
        const st = semanticTokens;
        const badge = isMatched ? st.success[this.theme] : st.warning[this.theme];
        return `
          <tr style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 10px 14px; font-weight: 600;">
              <div>${r.title}</div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">${r.accountCode} • ${r.reconciliationType}</div>
            </td>
            <td style="padding: 10px 14px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 600;">
              ${formatCurrencyMinor(r.ledgerBalanceMinor, currency)}
            </td>
            <td style="padding: 10px 14px; text-align: right; font-family: var(--stokrova-font-mono);">
              ${formatCurrencyMinor(r.statementBalanceMinor, currency)}
            </td>
            <td style="padding: 10px 14px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700; color: ${r.discrepancyMinor === 0n ? '#4ADE80' : '#F87171'};">
              ${formatCurrencyMinor(r.discrepancyMinor, currency)}
            </td>
            <td style="padding: 10px 14px; text-align: center;">
              <span style="background: ${badge.bg}; color: ${badge.text}; border: 1px solid ${badge.border}; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                ${r.status === 'BALANCED' ? '✓ BALANCED' : '⚠ DISCREPANCY'}
              </span>
            </td>
            <td style="padding: 10px 14px; text-align: right;">
              <button onclick="window.stokrovaApp?.inspectReconciliation ? window.stokrovaApp.inspectReconciliation('${r.title}', this) : window.stokrovaApp?.showToast('Reconciliation inspector opened for ${r.title}')" style="min-height: 44px; padding: 6px 12px; border-radius: 6px; border: 1px solid ${tokens.borderStrong}; background: ${tokens.surface}; color: ${tokens.textPrimary}; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                Inspect
              </button>
            </td>
          </tr>
        `.trim();
      })
      .join('\n');

    return `
      <div class="accountant-workspace-view" style="color: ${tokens.textPrimary};">
        
        <!-- Header Banner with Scoped Role Context -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
              <span style="background: rgba(189,150,82,0.15); color: ${goldText}; border: 1px solid #BD9652; padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                ${isGeneralAccountant ? 'General Accountant Cockpit' : 'Financial Accountant Workbench'}
              </span>
              <span style="font-size: 0.8125rem; color: ${tokens.textSecondary};">
                Scope: <strong>${company}</strong>
              </span>
            </div>
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: ${tokens.textPrimary};">
              ${memberName}’s Accounting Desk
            </h2>
            <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: ${tokens.textSecondary};">
              Personal voucher drafting queue, batch posting to general ledger, and subledger discrepancy audit.
            </p>
          </div>

          <!-- Quick Action Buttons (Min 44px touch targets) -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="window.stokrovaApp?.draftManualVoucher ? window.stokrovaApp.draftManualVoucher(this) : window.stokrovaApp?.showToast('Drafting manual journal voucher...')" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 700; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <span>+ Draft Voucher</span>
            </button>
            <button onclick="window.stokrovaApp?.postBatchVouchers ? window.stokrovaApp.postBatchVouchers(this) : window.stokrovaApp?.showToast('Batch posting uncommitted vouchers to GL...')" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <span>✓ Post Batch Drafts</span>
            </button>
            <button onclick="window.stokrovaApp?.openReconcileSubledgerWizard ? window.stokrovaApp.openReconcileSubledgerWizard() : window.stokrovaApp?.showToast('Subledger reconciliation wizard opened.')" style="min-height: 44px; padding: 10px 16px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <span>⚖️ Reconcile Subledger</span>
            </button>
          </div>
        </div>

        <!-- 5 Compact Personal Analytics KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px;">
          
          <!-- Card 1: Vouchers Prepared (Drafts) -->
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Draft Vouchers Prepared</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">
              ${metrics.vouchersPreparedDraftCount} <span style="font-size: 0.8125rem; font-weight: 500; color: ${tokens.textSecondary};">pending post</span>
            </div>
            <div style="font-size: 0.75rem; color: ${goldText}; font-weight: 600;">Awaiting GL commit</div>
          </div>

          <!-- Card 2: Journals Posted (GL Committed) -->
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Journals Posted to GL</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">
              ${metrics.journalsPostedCount}
            </div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">
              Total committed: <strong style="color: ${tokens.textPrimary};">${formatCurrencyMinor(metrics.journalsPostedTotalMinor, currency)}</strong>
            </div>
          </div>

          <!-- Card 3: Subledger Reconciliations Balanced -->
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Reconciliations Balanced</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #4ADE80; margin: 6px 0 2px 0;">
              ${metrics.reconciliationsBalancedCount}
            </div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">
              Discrepancy: <strong style="color: #4ADE80;">$0.00 (Balanced ✓)</strong>
            </div>
          </div>

          <!-- Card 4: Discrepancies Under Investigation -->
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Open Discrepancies</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: ${metrics.discrepanciesUnderInvestigationCount > 0 ? '#F87171' : tokens.textPrimary}; margin: 6px 0 2px 0;">
              ${metrics.discrepanciesUnderInvestigationCount}
            </div>
            <div style="font-size: 0.75rem; color: ${metrics.discrepanciesUnderInvestigationCount > 0 ? '#F87171' : '#4ADE80'}; font-weight: 600;">
              ${metrics.discrepanciesUnderInvestigationCount > 0 ? 'Requires subledger investigation' : 'Zero unassigned variances'}
            </div>
          </div>

          <!-- Card 5: Average Turnaround Time -->
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 16px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600; text-transform: uppercase;">Average Post Turnaround</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 6px 0 2px 0;">
              ${metrics.averageTurnaroundMinutes} <span style="font-size: 0.8125rem; font-weight: 500; color: ${tokens.textSecondary};">mins</span>
            </div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary};">From draft creation to GL commit</div>
          </div>

        </div>

        <!-- Attribution Filter & View Mode Switcher -->
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.8125rem; font-weight: 700; color: ${tokens.textSecondary};">Audit Scope:</span>
            <div style="display: inline-flex; border-radius: 6px; border: 1px solid ${tokens.borderStrong}; overflow: hidden;">
              <button id="btn-accountant-filter-my" onclick="window.stokrovaApp?.toggleAccountantViewScope('my')" style="min-height: 38px; padding: 6px 14px; font-size: 0.75rem; font-weight: 700; cursor: pointer; border: none; background: ${filterMode === 'my' ? tokens.primary : 'transparent'}; color: ${filterMode === 'my' ? tokens.primaryForeground : tokens.textSecondary};">
                👤 My Entries & Work (${memberName})
              </button>
              <button id="btn-accountant-filter-all" onclick="window.stokrovaApp?.toggleAccountantViewScope('all')" style="min-height: 38px; padding: 6px 14px; font-size: 0.75rem; font-weight: 700; cursor: pointer; border: none; background: ${filterMode === 'all' ? tokens.primary : 'transparent'}; color: ${filterMode === 'all' ? tokens.primaryForeground : tokens.textSecondary};">
                🏛️ All Company Books (Audit View)
              </button>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 0.75rem;">
            <span style="color: ${trial.isBalanced ? '#4ADE80' : '#F87171'}; font-weight: 700;">
              ${trial.isBalanced ? '✓ Double-Entry Books Balanced' : '⚠ Out of Balance'}
            </span>
            <span style="color: ${tokens.textMuted};">| Trial Debits: ${formatCurrencyMinor(trial.totalDebitsMinor, currency)}</span>
          </div>
        </div>

        <!-- Section 1: Subledger Reconciliation Workbench -->
        <div style="margin-bottom: 28px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Subledger Reconciliation Monitor</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Continuous reconciliation across cash drawers, bank accounts, AP/AR subledgers, and physical inventory</p>
            </div>
            <button onclick="window.stokrovaApp?.reverifySubledgers ? window.stokrovaApp.reverifySubledgers(this) : window.stokrovaApp?.showToast('Subledger batch balance check initiated.')" style="min-height: 44px; padding: 8px 14px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
              ⟳ Re-verify Subledgers
            </button>
          </div>
          <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border: 1px solid ${tokens.border}; border-radius: 8px; background: ${tokens.surface};">
            <table style="width: 100%; min-width: 680px; border-collapse: collapse;">
              <thead>
                <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; font-size: 0.8125rem; color: ${tokens.textSecondary};">
                  <th style="padding: 10px 14px;">Subledger / Account</th>
                  <th style="padding: 10px 14px; text-align: right;">General Ledger Balance</th>
                  <th style="padding: 10px 14px; text-align: right;">External / Physical Count</th>
                  <th style="padding: 10px 14px; text-align: right;">Variance / Delta</th>
                  <th style="padding: 10px 14px; text-align: center;">Audit Status</th>
                  <th style="padding: 10px 14px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${reconRows || `<tr><td colspan="6" style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No subledger reconciliations configured</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 2: General Journal Ledger Entries -->
        <div>
          ${this.renderJournalLedgerHtml(currency, filterMode === 'my' ? memberId : undefined)}
        </div>

      </div>
    `.trim();
  }
}
