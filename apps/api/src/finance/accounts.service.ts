import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  GetAccountsFilter,
} from '@stokrova/contracts';
import {
  CreateAccountSchema,
  UpdateAccountSchema,
} from '@stokrova/validation';
import {
  getNormalBalanceForAccountType,
  assertNoCircularParentAccount,
  FinanceDomainError,
} from '@stokrova/domain';

@Injectable()
export class AccountsService {
  private readonly accounts = new DurableMap<Account>('chart_of_accounts');

  // ==========================================================================
  // Accounts CRUD & Queries
  // ==========================================================================

  async createAccount(
    tenantId: string,
    req: CreateAccountRequest,
  ): Promise<Account> {
    const parsed = CreateAccountSchema.parse(req);

    // Verify uniqueness of code within tenant and company
    const existingCode = Array.from(this.accounts.values()).find(
      (a) =>
        a.tenant_id === tenantId &&
        a.company_id === parsed.company_id &&
        a.code.toUpperCase() === parsed.code.toUpperCase(),
    );

    if (existingCode) {
      throw new ConflictException(
        `Account code '${parsed.code}' already exists for company '${parsed.company_id}'.`,
      );
    }

    if (parsed.parent_account_id) {
      const parent = this.accounts.get(parsed.parent_account_id);
      if (!parent || parent.tenant_id !== tenantId || parent.company_id !== parsed.company_id) {
        throw new NotFoundException(
          `Parent account '${parsed.parent_account_id}' does not exist for this company.`,
        );
      }
    }

    const now = new Date().toISOString();
    const normalBalance = getNormalBalanceForAccountType(parsed.type);

    const account: Account = {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: parsed.company_id,
      book_id: parsed.book_id ?? null,
      code: parsed.code.trim().toUpperCase(),
      name: parsed.name.trim(),
      type: parsed.type,
      subtype: parsed.subtype,
      normal_balance: normalBalance,
      parent_account_id: parsed.parent_account_id ?? null,
      currency: (parsed.currency ?? 'USD').toUpperCase(),
      is_active: parsed.is_active ?? true,
      is_reconciled: false,
      created_at: now,
      updated_at: now,
    };

    this.accounts.set(account.id, account);
    return account;
  }

  async updateAccount(
    tenantId: string,
    accountId: string,
    req: UpdateAccountRequest,
  ): Promise<Account> {
    const parsed = UpdateAccountSchema.parse(req);
    const account = await this.getAccountById(tenantId, accountId);

    if (parsed.parent_account_id !== undefined) {
      if (parsed.parent_account_id) {
        const parent = this.accounts.get(parsed.parent_account_id);
        if (!parent || parent.tenant_id !== tenantId || parent.company_id !== account.company_id) {
          throw new NotFoundException(
            `Parent account '${parsed.parent_account_id}' does not exist.`,
          );
        }

        try {
          assertNoCircularParentAccount(
            accountId,
            parsed.parent_account_id,
            (id) => this.accounts.get(id)?.parent_account_id,
          );
        } catch (err: unknown) {
          if (err instanceof FinanceDomainError) {
            throw new ConflictException(err.message);
          }
          throw err;
        }
      }
      account.parent_account_id = parsed.parent_account_id ?? null;
    }

    if (parsed.name !== undefined) {
      account.name = parsed.name.trim();
    }
    if (parsed.subtype !== undefined) {
      account.subtype = parsed.subtype;
    }
    if (parsed.is_active !== undefined) {
      account.is_active = parsed.is_active;
    }

    account.updated_at = new Date().toISOString();
    return account;
  }

  async getAccountById(tenantId: string, accountId: string): Promise<Account> {
    const account = this.accounts.get(accountId);
    if (!account || account.tenant_id !== tenantId) {
      throw new NotFoundException(`Account '${accountId}' not found.`);
    }
    return account;
  }

  async getAccountByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<Account | null> {
    const formattedCode = code.trim().toUpperCase();
    return (
      Array.from(this.accounts.values()).find(
        (a) =>
          a.tenant_id === tenantId &&
          a.company_id === companyId &&
          a.code === formattedCode,
      ) ?? null
    );
  }

  async listAccounts(
    tenantId: string,
    filter?: GetAccountsFilter,
  ): Promise<Account[]> {
    return Array.from(this.accounts.values())
      .filter((a) => {
        if (a.tenant_id !== tenantId) return false;
        if (filter?.company_id && a.company_id !== filter.company_id) return false;
        if (filter?.book_id && a.book_id !== filter.book_id) return false;
        if (filter?.type && a.type !== filter.type) return false;
        if (filter?.is_active !== undefined && a.is_active !== filter.is_active) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  // ==========================================================================
  // Standard Chart of Accounts Seeder
  // ==========================================================================

  async seedDefaultChartOfAccounts(
    tenantId: string,
    companyId: string,
    bookId?: string | null,
    includeAdvanced = false,
  ): Promise<Account[]> {
    const baseDefaults: CreateAccountRequest[] = [
      // 1000 - Assets
      { company_id: companyId, book_id: bookId, code: '1010', name: 'Cash on Hand (Tills)', type: 'ASSET', subtype: 'CASH' },
      { company_id: companyId, book_id: bookId, code: '1020', name: 'Operating Bank Account', type: 'ASSET', subtype: 'BANK' },
      { company_id: companyId, book_id: bookId, code: '1100', name: 'Accounts Receivable', type: 'ASSET', subtype: 'ACCOUNTS_RECEIVABLE' },
      { company_id: companyId, book_id: bookId, code: '1200', name: 'Inventory Asset', type: 'ASSET', subtype: 'INVENTORY' },
      // 2000 - Liabilities
      { company_id: companyId, book_id: bookId, code: '2010', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'ACCOUNTS_PAYABLE' },
      { company_id: companyId, book_id: bookId, code: '2100', name: 'Sales Tax / VAT Payable', type: 'LIABILITY', subtype: 'TAX_PAYABLE' },
      { company_id: companyId, book_id: bookId, code: '2200', name: 'Customer Advance Deposits', type: 'LIABILITY', subtype: 'CUSTOMER_DEPOSIT' },
      // 3000 - Equity
      { company_id: companyId, book_id: bookId, code: '3010', name: 'Retained Earnings', type: 'EQUITY', subtype: 'RETAINED_EARNINGS' },
      { company_id: companyId, book_id: bookId, code: '3020', name: 'Owner Capital', type: 'EQUITY', subtype: 'OWNER_EQUITY' },
      // 4000 - Revenue
      { company_id: companyId, book_id: bookId, code: '4010', name: 'Retail Sales Revenue', type: 'REVENUE', subtype: 'SALES_REVENUE' },
      { company_id: companyId, book_id: bookId, code: '4020', name: 'Wholesale Sales Revenue', type: 'REVENUE', subtype: 'SALES_REVENUE' },
      { company_id: companyId, book_id: bookId, code: '4030', name: 'Sales Returns & Allowances', type: 'REVENUE', subtype: 'SALES_REVENUE' },
      // 5000 - Expenses
      { company_id: companyId, book_id: bookId, code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', subtype: 'COST_OF_GOODS_SOLD' },
      { company_id: companyId, book_id: bookId, code: '5020', name: 'Operating Expenses', type: 'EXPENSE', subtype: 'OPERATING_EXPENSE' },
    ];

    const advancedDefaults: CreateAccountRequest[] = [
      { company_id: companyId, book_id: bookId, code: '1400', name: 'Work in Process (WIP)', type: 'ASSET', subtype: 'WORK_IN_PROCESS' },
      { company_id: companyId, book_id: bookId, code: '2020', name: 'Goods Received Not Invoiced (GRNI)', type: 'LIABILITY', subtype: 'GRNI_CLEARING' },
      { company_id: companyId, book_id: bookId, code: '2110', name: 'Tax Recoverable / Input VAT', type: 'ASSET', subtype: 'CURRENT_ASSET' },
      { company_id: companyId, book_id: bookId, code: '4040', name: 'Cash Over/Short Revenue', type: 'REVENUE', subtype: 'OTHER_REVENUE' },
      { company_id: companyId, book_id: bookId, code: '5030', name: 'Purchase Price Variance', type: 'EXPENSE', subtype: 'PURCHASE_VARIANCE' },
      { company_id: companyId, book_id: bookId, code: '5040', name: 'Cash Shortage Expense', type: 'EXPENSE', subtype: 'CASH_VARIANCE_EXPENSE' },
      { company_id: companyId, book_id: bookId, code: '5050', name: 'Freight & Landed Logistics Expense', type: 'EXPENSE', subtype: 'OPERATING_EXPENSE' },
    ];

    const defaults = includeAdvanced ? [...baseDefaults, ...advancedDefaults] : baseDefaults;

    const seeded: Account[] = [];
    for (const def of defaults) {
      const existing = await this.getAccountByCode(tenantId, companyId, def.code);
      if (!existing) {
        seeded.push(await this.createAccount(tenantId, def));
      } else {
        seeded.push(existing);
      }
    }
    return seeded;
  }

  async seedExpandedChartOfAccounts(
    tenantId: string,
    companyId: string,
    bookId?: string | null,
  ): Promise<Account[]> {
    return this.seedDefaultChartOfAccounts(tenantId, companyId, bookId, true);
  }
}
