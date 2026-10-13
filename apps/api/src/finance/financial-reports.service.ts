import { Injectable } from '@nestjs/common';
import type {
  TrialBalanceReport,
  BalanceSheetReport,
  IncomeStatementReport,
  BalanceSheetSection,
  CashFlowReport,
  GeneralLedgerActivityReport,
} from '@stokrova/contracts';
import {
  calculateTrialBalance,
  calculateCashFlowStatement,
} from '@stokrova/domain';
import { AccountsService } from './accounts.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';

@Injectable()
export class FinancialReportsService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly glService: GeneralLedgerService,
  ) {}

  // ==========================================================================
  // Trial Balance
  // ==========================================================================

  async getTrialBalance(
    tenantId: string,
    companyId: string,
    asOfDate?: string,
  ): Promise<TrialBalanceReport> {
    const accounts = await this.accountsService.listAccounts(tenantId, {
      company_id: companyId,
      is_active: true,
    });

    const entries = await this.glService.listJournalEntries(tenantId, {
      company_id: companyId,
      status: 'POSTED',
      end_date: asOfDate,
    });

    const lines = entries.flatMap((e) =>
      e.lines.map((l) => ({
        account_id: l.account_id,
        debit_minor: l.debit_minor,
        credit_minor: l.credit_minor,
      })),
    );

    const calculated = calculateTrialBalance(accounts, lines);

    return {
      tenant_id: tenantId,
      company_id: companyId,
      as_of_date: asOfDate ?? new Date().toISOString(),
      total_debit_minor: calculated.total_debit_minor,
      total_credit_minor: calculated.total_credit_minor,
      is_balanced: calculated.is_balanced,
      rows: calculated.rows,
    };
  }

  // ==========================================================================
  // Balance Sheet (Assets = Liabilities + Equity)
  // ==========================================================================

  async getBalanceSheet(
    tenantId: string,
    companyId: string,
    asOfDate?: string,
  ): Promise<BalanceSheetReport> {
    const trialBalance = await this.getTrialBalance(tenantId, companyId, asOfDate);

    const assetRows = trialBalance.rows.filter((r) => r.account_type === 'ASSET');
    const liabilityRows = trialBalance.rows.filter((r) => r.account_type === 'LIABILITY');
    const equityRows = trialBalance.rows.filter((r) => r.account_type === 'EQUITY');
    const revenueRows = trialBalance.rows.filter((r) => r.account_type === 'REVENUE');
    const expenseRows = trialBalance.rows.filter((r) => r.account_type === 'EXPENSE');

    const totalAssets = assetRows.reduce((acc, r) => acc + BigInt(r.net_balance_minor), 0n);
    const totalLiabilities = liabilityRows.reduce((acc, r) => acc + BigInt(r.net_balance_minor), 0n);
    let totalEquity = equityRows.reduce((acc, r) => acc + BigInt(r.net_balance_minor), 0n);

    // Current period net income calculation: Revenue - Expenses
    const totalRevenue = revenueRows.reduce((acc, r) => acc + BigInt(r.net_balance_minor), 0n);
    const totalExpenses = expenseRows.reduce((acc, r) => acc + BigInt(r.net_balance_minor), 0n);
    const netIncome = totalRevenue - totalExpenses;

    const equityAccounts = equityRows.map((r) => ({
      account_id: r.account_id,
      code: r.account_code,
      name: r.account_name,
      balance_minor: r.net_balance_minor,
    }));

    if (netIncome !== 0n) {
      equityAccounts.push({
        account_id: 'current-net-income',
        code: '3999',
        name: 'Current Period Retained Earnings',
        balance_minor: netIncome.toString(),
      });
      totalEquity += netIncome;
    }

    const assetsSection: BalanceSheetSection = {
      type: 'ASSET',
      total_minor: totalAssets.toString(),
      accounts: assetRows.map((r) => ({
        account_id: r.account_id,
        code: r.account_code,
        name: r.account_name,
        balance_minor: r.net_balance_minor,
      })),
    };

    const liabilitiesSection: BalanceSheetSection = {
      type: 'LIABILITY',
      total_minor: totalLiabilities.toString(),
      accounts: liabilityRows.map((r) => ({
        account_id: r.account_id,
        code: r.account_code,
        name: r.account_name,
        balance_minor: r.net_balance_minor,
      })),
    };

    const equitySection: BalanceSheetSection = {
      type: 'EQUITY',
      total_minor: totalEquity.toString(),
      accounts: equityAccounts,
    };

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      tenant_id: tenantId,
      company_id: companyId,
      as_of_date: trialBalance.as_of_date,
      assets: assetsSection,
      liabilities: liabilitiesSection,
      equity: equitySection,
      total_assets_minor: totalAssets.toString(),
      total_liabilities_equity_minor: totalLiabilitiesAndEquity.toString(),
      is_balanced: totalAssets === totalLiabilitiesAndEquity,
    };
  }

  // ==========================================================================
  // Income Statement (Profit & Loss)
  // ==========================================================================

  async getIncomeStatement(
    tenantId: string,
    companyId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<IncomeStatementReport> {
    const accounts = await this.accountsService.listAccounts(tenantId, {
      company_id: companyId,
      is_active: true,
    });

    const entries = await this.glService.listJournalEntries(tenantId, {
      company_id: companyId,
      status: 'POSTED',
      start_date: startDate,
      end_date: endDate,
    });

    const lines = entries.flatMap((e) =>
      e.lines.map((l) => ({
        account_id: l.account_id,
        debit_minor: l.debit_minor,
        credit_minor: l.credit_minor,
      })),
    );

    const trialBalance = calculateTrialBalance(accounts, lines);

    const revenueRows = trialBalance.rows.filter((r) => r.account_type === 'REVENUE');
    const cogsRows = trialBalance.rows.filter(
      (r) => r.account_type === 'EXPENSE' && r.account_code.startsWith('501'),
    );
    const operatingExpenseRows = trialBalance.rows.filter(
      (r) => r.account_type === 'EXPENSE' && !r.account_code.startsWith('501'),
    );

    const totalRevenue = revenueRows.reduce((acc, r) => acc + BigInt(r.net_balance_minor), 0n);
    const totalCogs = cogsRows.reduce((acc, r) => acc + BigInt(r.net_balance_minor), 0n);
    const grossProfit = totalRevenue - totalCogs;
    const totalExpenses = operatingExpenseRows.reduce(
      (acc, r) => acc + BigInt(r.net_balance_minor),
      0n,
    );
    const netIncome = grossProfit - totalExpenses;

    return {
      tenant_id: tenantId,
      company_id: companyId,
      start_date: startDate ?? '1970-01-01T00:00:00Z',
      end_date: endDate ?? new Date().toISOString(),
      revenue_total_minor: totalRevenue.toString(),
      cogs_total_minor: totalCogs.toString(),
      gross_profit_minor: grossProfit.toString(),
      expenses_total_minor: totalExpenses.toString(),
      net_income_minor: netIncome.toString(),
      revenue_accounts: revenueRows.map((r) => ({
        code: r.account_code,
        name: r.account_name,
        amount_minor: r.net_balance_minor,
      })),
      cogs_accounts: cogsRows.map((r) => ({
        code: r.account_code,
        name: r.account_name,
        amount_minor: r.net_balance_minor,
      })),
      expense_accounts: operatingExpenseRows.map((r) => ({
        code: r.account_code,
        name: r.account_name,
        amount_minor: r.net_balance_minor,
      })),
    };
  }

  // ==========================================================================
  // Cash Flow Statement (Operating, Investing, Financing)
  // ==========================================================================

  async getCashFlowStatement(
    tenantId: string,
    companyId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CashFlowReport> {
    const accounts = await this.accountsService.listAccounts(tenantId, {
      company_id: companyId,
      is_active: true,
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const entries = await this.glService.listJournalEntries(tenantId, {
      company_id: companyId,
      status: 'POSTED',
      start_date: startDate,
      end_date: endDate,
    });

    const lines = entries.flatMap((e) =>
      e.lines.map((l) => {
        const acc = accountMap.get(l.account_id);
        return {
          account_type: acc?.type ?? 'EXPENSE',
          account_subtype: acc?.subtype ?? 'OPERATING_EXPENSE',
          debit_minor: l.debit_minor,
          credit_minor: l.credit_minor,
        };
      }),
    );

    // Compute opening cash balance before startDate
    const priorEntries = await this.glService.listJournalEntries(tenantId, {
      company_id: companyId,
      status: 'POSTED',
      end_date: startDate ? new Date(new Date(startDate).getTime() - 1).toISOString() : undefined,
    });

    let openingCash = 0n;
    if (startDate) {
      for (const pe of priorEntries) {
        for (const line of pe.lines) {
          const acc = accountMap.get(line.account_id);
          if (acc?.subtype === 'CASH' || acc?.subtype === 'BANK') {
            openingCash += BigInt(line.debit_minor || '0') - BigInt(line.credit_minor || '0');
          }
        }
      }
    }

    const calculated = calculateCashFlowStatement(lines, openingCash.toString());

    return {
      tenant_id: tenantId,
      company_id: companyId,
      start_date: startDate ?? '1970-01-01T00:00:00Z',
      end_date: endDate ?? new Date().toISOString(),
      operating_activities_minor: calculated.operating_activities_minor,
      investing_activities_minor: calculated.investing_activities_minor,
      financing_activities_minor: calculated.financing_activities_minor,
      net_cash_flow_minor: calculated.net_cash_flow_minor,
      opening_cash_minor: calculated.opening_cash_minor,
      closing_cash_minor: calculated.closing_cash_minor,
      ending_cash_minor: calculated.closing_cash_minor,
    };
  }

  // ==========================================================================
  // General Ledger Account Activity Register
  // ==========================================================================

  async getGeneralLedgerActivity(
    tenantId: string,
    companyId: string,
    accountId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GeneralLedgerActivityReport> {
    return this.glService.getAccountActivity(
      tenantId,
      companyId,
      accountId,
      startDate,
      endDate,
    );
  }

  async getAccountActivityReport(
    tenantId: string,
    companyId: string,
    accountCodeOrId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GeneralLedgerActivityReport> {
    const acc =
      (await this.accountsService.getAccountByCode(tenantId, companyId, accountCodeOrId)) ??
      (await this.accountsService.getAccountById(tenantId, accountCodeOrId));
    return this.glService.getAccountActivity(tenantId, companyId, acc.id, startDate, endDate);
  }
}

