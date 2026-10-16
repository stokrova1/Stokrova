import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  JournalEntry,
  JournalEntryLine,
  CreateJournalEntryRequest,
  ReverseJournalEntryRequest,
  GetJournalEntriesFilter,
  GeneralLedgerActivityReport,
  GeneralLedgerActivityLine,
} from '@stokrova/contracts';
import {
  CreateJournalEntrySchema,
  ReverseJournalEntrySchema,
} from '@stokrova/validation';
import {
  assertJournalEntryBalanced,
  assertValidJournalEntryTransition,
  createReversingJournalEntryLines,
  assertPeriodAllowsPosting,
  FinanceDomainError,
} from '@stokrova/domain';
import { AccountsService } from './accounts.service.js';
import { AccountingBooksService } from './accounting-books.service.js';

@Injectable()
export class GeneralLedgerService {
  private readonly journalEntries = new DurableMap<JournalEntry>('journal_entries');
  private readonly operationEntries = new DurableMap<JournalEntry>('journal_entries');

  constructor(
    private readonly accountsService: AccountsService,
    @Optional() private readonly accountingBooksService?: AccountingBooksService,
  ) {}

  // ==========================================================================
  // Manual & Automated Journal Entry Creation
  // ==========================================================================

  async createJournalEntry(
    tenantId: string,
    req: CreateJournalEntryRequest,
    autoPost = true,
    userId?: string,
  ): Promise<JournalEntry> {
    const parsed = CreateJournalEntrySchema.parse(req);

    // 1. Durable Idempotency Check (Rule 4)
    if (parsed.operation_id) {
      const existing = this.operationEntries.get(`${tenantId}:${parsed.operation_id}`);
      if (existing) {
        return existing;
      }
    }

    // 2. Period Validation (Rule 9)
    let periodId = parsed.period_id ?? null;
    if (this.accountingBooksService) {
      if (periodId) {
        const period = await this.accountingBooksService.getPeriodById(tenantId, periodId);
        try {
          assertPeriodAllowsPosting(period.status, parsed.posting_date, period.start_date, period.end_date);
        } catch (err: unknown) {
          if (err instanceof FinanceDomainError) {
            throw new BadRequestException(err.message);
          }
          throw err;
        }
      } else {
        const matchingPeriod = await this.accountingBooksService.getPeriodForDate(
          tenantId,
          parsed.company_id,
          parsed.posting_date,
        );
        if (matchingPeriod) {
          periodId = matchingPeriod.id;
          try {
            assertPeriodAllowsPosting(matchingPeriod.status, parsed.posting_date, matchingPeriod.start_date, matchingPeriod.end_date);
          } catch (err: unknown) {
            if (err instanceof FinanceDomainError) {
              throw new BadRequestException(err.message);
            }
            throw err;
          }
        }
      }
    }

    // 3. Verify all referenced accounts exist, belong to this tenant/company, and are active
    for (let i = 0; i < parsed.lines.length; i++) {
      const line = parsed.lines[i]!;
      const account = await this.accountsService.getAccountById(tenantId, line.account_id);
      if (account.company_id !== parsed.company_id) {
        throw new BadRequestException(
          `Line ${i + 1}: Account '${account.code}' belongs to company '${account.company_id}', not '${parsed.company_id}'.`,
        );
      }
      if (!account.is_active) {
        throw new BadRequestException(
          `Line ${i + 1}: Account '${account.code}' is inactive and cannot accept postings.`,
        );
      }
    }

    // 4. Verify strict double-entry balance: \sum(Debits) === \sum(Credits) (Rule 1)
    let balanceResult: { total_debit_minor: string; total_credit_minor: string };
    try {
      balanceResult = assertJournalEntryBalanced(parsed.lines);
    } catch (err: unknown) {
      if (err instanceof FinanceDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const entryId = randomUUID();
    const entryNumber = `JE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const lines: JournalEntryLine[] = parsed.lines.map((l) => ({
      id: randomUUID(),
      journal_entry_id: entryId,
      account_id: l.account_id,
      debit_minor: l.debit_minor ?? '0',
      credit_minor: l.credit_minor ?? '0',
      currency: (l.currency ?? parsed.currency ?? 'USD').toUpperCase(),
      description: l.description ?? null,
      reference_entity_type: l.reference_entity_type ?? null,
      reference_entity_id: l.reference_entity_id ?? null,
      created_at: now,
    }));

    const entry: JournalEntry = {
      id: entryId,
      tenant_id: tenantId,
      company_id: parsed.company_id,
      book_id: parsed.book_id ?? null,
      period_id: periodId,
      entry_number: entryNumber,
      status: autoPost ? 'POSTED' : 'DRAFT',
      source_type: parsed.source_type ?? 'MANUAL',
      source_id: parsed.source_id ?? null,
      reversal_of_entry_id: null,
      reversal_entry_id: null,
      narration: parsed.narration.trim(),
      posting_date: parsed.posting_date,
      total_debit_minor: balanceResult.total_debit_minor,
      total_credit_minor: balanceResult.total_credit_minor,
      currency: (parsed.currency ?? 'USD').toUpperCase(),
      lines,
      posted_at: autoPost ? now : null,
      posted_by: autoPost ? (userId ?? null) : null,
      created_at: now,
      updated_at: now,
    };

    this.journalEntries.set(entry.id, entry);

    if (parsed.operation_id) {
      this.operationEntries.set(`${tenantId}:${parsed.operation_id}`, entry);
    }

    return entry;
  }

  async postJournalEntry(
    tenantId: string,
    entryId: string,
    userId?: string,
  ): Promise<JournalEntry> {
    const entry = await this.getJournalEntryById(tenantId, entryId);

    try {
      assertValidJournalEntryTransition(entry.status, 'POSTED');
    } catch (err: unknown) {
      if (err instanceof FinanceDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    entry.status = 'POSTED';
    entry.posted_at = new Date().toISOString();
    entry.posted_by = userId ?? null;
    entry.updated_at = new Date().toISOString();

    return entry;
  }

  // ==========================================================================
  // Reversing Journal Entries (Rule 11: Never Silently Delete Financial History)
  // ==========================================================================

  async reverseJournalEntry(
    tenantId: string,
    entryId: string,
    req: ReverseJournalEntryRequest,
    userId?: string,
  ): Promise<{ original: JournalEntry; reversal: JournalEntry }> {
    const parsed = ReverseJournalEntrySchema.parse(req);
    const original = await this.getJournalEntryById(tenantId, entryId);

    if (original.status !== 'POSTED') {
      throw new BadRequestException(
        `Cannot reverse journal entry in '${original.status}' status. Only posted entries can be reversed.`,
      );
    }

    if (original.reversal_entry_id) {
      throw new BadRequestException(
        `Journal entry '${original.entry_number}' has already been reversed by entry '${original.reversal_entry_id}'.`,
      );
    }

    // Invert original lines: dr -> cr, cr -> dr
    const reversingLines = createReversingJournalEntryLines(
      original.lines.map((l) => ({
        account_id: l.account_id,
        debit_minor: l.debit_minor,
        credit_minor: l.credit_minor,
        currency: l.currency,
        description: l.description,
        reference_entity_type: l.reference_entity_type,
        reference_entity_id: l.reference_entity_id,
      })),
    );

    const now = new Date().toISOString();
    const reversalId = randomUUID();
    const reversalNumber = `REV-${original.entry_number}`;

    const reversalEntryLines: JournalEntryLine[] = reversingLines.map((l) => ({
      id: randomUUID(),
      journal_entry_id: reversalId,
      account_id: l.account_id,
      debit_minor: l.debit_minor,
      credit_minor: l.credit_minor,
      currency: l.currency,
      description: l.description ?? null,
      reference_entity_type: l.reference_entity_type ?? null,
      reference_entity_id: l.reference_entity_id ?? null,
      created_at: now,
    }));

    const reversal: JournalEntry = {
      id: reversalId,
      tenant_id: tenantId,
      company_id: original.company_id,
      book_id: original.book_id,
      period_id: original.period_id,
      entry_number: reversalNumber,
      status: 'POSTED',
      source_type: 'REVERSAL',
      source_id: original.id,
      reversal_of_entry_id: original.id,
      reversal_entry_id: null,
      narration: parsed.narration
        ? parsed.narration.trim()
        : `Reversal of entry ${original.entry_number} (${original.narration})`,
      posting_date: parsed.reversal_date,
      total_debit_minor: original.total_credit_minor, // Inverted balance totals
      total_credit_minor: original.total_debit_minor,
      currency: original.currency,
      lines: reversalEntryLines,
      posted_at: now,
      posted_by: userId ?? null,
      created_at: now,
      updated_at: now,
    };

    // Update original entry
    original.status = 'REVERSED';
    original.reversal_entry_id = reversal.id;
    original.updated_at = now;

    this.journalEntries.set(reversal.id, reversal);
    return { original, reversal };
  }

  async getJournalEntryById(
    tenantId: string,
    entryId: string,
  ): Promise<JournalEntry> {
    const entry = this.journalEntries.get(entryId);
    if (!entry || entry.tenant_id !== tenantId) {
      throw new NotFoundException(`Journal entry '${entryId}' not found.`);
    }
    return entry;
  }

  async listJournalEntries(
    tenantId: string,
    filter?: GetJournalEntriesFilter,
  ): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter((e) => {
        if (e.tenant_id !== tenantId) return false;
        if (filter?.company_id && e.company_id !== filter.company_id) return false;
        if (filter?.book_id && e.book_id !== filter.book_id) return false;
        if (filter?.period_id && e.period_id !== filter.period_id) return false;
        if (filter?.status && e.status !== filter.status) return false;
        if (filter?.source_type && e.source_type !== filter.source_type) return false;
        if (filter?.start_date && e.posting_date < filter.start_date) return false;
        if (filter?.end_date && e.posting_date > filter.end_date) return false;
        return true;
      })
      .sort((a, b) => b.posting_date.localeCompare(a.posting_date));
  }

  // ==========================================================================
  // General Ledger Account Activity Register
  // ==========================================================================

  async getAccountActivity(
    tenantId: string,
    companyId: string,
    accountId: string,
    startDate = '1970-01-01T00:00:00Z',
    endDate = new Date().toISOString(),
  ): Promise<GeneralLedgerActivityReport> {
    const account = await this.accountsService.getAccountById(tenantId, accountId);

    const allPosted = Array.from(this.journalEntries.values()).filter(
      (e) => e.tenant_id === tenantId && e.company_id === companyId && e.status === 'POSTED',
    );

    // Calculate opening balance before startDate
    let openingDr = 0n;
    let openingCr = 0n;
    const priorEntries = allPosted.filter((e) => e.posting_date < startDate);
    for (const pe of priorEntries) {
      for (const line of pe.lines) {
        if (line.account_id === accountId) {
          openingDr += BigInt(line.debit_minor || '0');
          openingCr += BigInt(line.credit_minor || '0');
        }
      }
    }

    let runningBalance: bigint;
    if (account.normal_balance === 'DEBIT') {
      runningBalance = openingDr - openingCr;
    } else {
      runningBalance = openingCr - openingDr;
    }
    const openingBalanceMinor = runningBalance.toString();

    // Collect activity lines in date range
    const rangeEntries = allPosted
      .filter((e) => e.posting_date >= startDate && e.posting_date <= endDate)
      .sort((a, b) => a.posting_date.localeCompare(b.posting_date));

    const activityLines: GeneralLedgerActivityLine[] = [];

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const e of rangeEntries) {
      for (const line of e.lines) {
        if (line.account_id === accountId) {
          const dr = BigInt(line.debit_minor || '0');
          const cr = BigInt(line.credit_minor || '0');
          totalDebit += dr;
          totalCredit += cr;

          if (account.normal_balance === 'DEBIT') {
            runningBalance += dr - cr;
          } else {
            runningBalance += cr - dr;
          }

          activityLines.push({
            entry_id: e.id,
            entry_number: e.entry_number,
            posting_date: e.posting_date,
            narration: line.description || e.narration,
            debit_minor: line.debit_minor,
            credit_minor: line.credit_minor,
            running_balance_minor: runningBalance.toString(),
            source_type: e.source_type,
            source_id: e.source_id,
          });
        }
      }
    }

    return {
      tenant_id: tenantId,
      company_id: companyId,
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      account_type: account.type,
      normal_balance: account.normal_balance,
      start_date: startDate,
      end_date: endDate,
      opening_balance_minor: openingBalanceMinor,
      closing_balance_minor: runningBalance.toString(),
      total_debit_minor: totalDebit.toString(),
      total_credit_minor: totalCredit.toString(),
      lines: activityLines,
      entries: activityLines,
    };
  }

  // ==========================================================================
  // Automated Sub-Ledger Posting Adapters
  // ==========================================================================

  async postCommercialSale(
    tenantId: string,
    params: {
      companyId: string;
      saleId: string;
      cashAccountId: string;
      revenueAccountId: string;
      cogsAccountId: string;
      inventoryAssetAccountId: string;
      grossSaleMinor: string;
      cogsMinor: string;
      taxLiabilityAccountId?: string;
      taxMinor?: string;
      currency?: string;
      operationId?: string;
    },
  ): Promise<JournalEntry> {
    const tax = params.taxMinor ? BigInt(params.taxMinor) : 0n;
    const gross = BigInt(params.grossSaleMinor);
    const netRevenue = gross - tax;

    const lines = [
      {
        account_id: params.cashAccountId,
        debit_minor: gross.toString(),
        credit_minor: '0',
        description: `Cash settlement for sale ${params.saleId}`,
        reference_entity_type: 'ORDER',
        reference_entity_id: params.saleId,
      },
      {
        account_id: params.revenueAccountId,
        debit_minor: '0',
        credit_minor: netRevenue.toString(),
        description: `Recognized revenue for sale ${params.saleId}`,
        reference_entity_type: 'ORDER',
        reference_entity_id: params.saleId,
      },
    ];

    if (tax > 0n && params.taxLiabilityAccountId) {
      lines.push({
        account_id: params.taxLiabilityAccountId,
        debit_minor: '0',
        credit_minor: tax.toString(),
        description: `Sales tax liability for sale ${params.saleId}`,
        reference_entity_type: 'ORDER',
        reference_entity_id: params.saleId,
      });
    }

    const cogs = BigInt(params.cogsMinor);
    if (cogs > 0n) {
      lines.push(
        {
          account_id: params.cogsAccountId,
          debit_minor: cogs.toString(),
          credit_minor: '0',
          description: `Direct COGS for sale ${params.saleId}`,
          reference_entity_type: 'ORDER',
          reference_entity_id: params.saleId,
        },
        {
          account_id: params.inventoryAssetAccountId,
          debit_minor: '0',
          credit_minor: cogs.toString(),
          description: `Inventory reduction for sale ${params.saleId}`,
          reference_entity_type: 'ORDER',
          reference_entity_id: params.saleId,
        },
      );
    }

    return this.createJournalEntry(tenantId, {
      company_id: params.companyId,
      posting_date: new Date().toISOString(),
      narration: `Automated journal entry for sale ${params.saleId}`,
      source_type: 'POS_SALE',
      source_id: params.saleId,
      operation_id: params.operationId,
      currency: params.currency ?? 'USD',
      lines,
    });
  }

  async postInventoryIntake(
    tenantId: string,
    params: {
      companyId: string;
      poId: string;
      inventoryAssetAccountId: string;
      apAccountId: string;
      totalIntakeMinor: string;
      currency?: string;
      operationId?: string;
    },
  ): Promise<JournalEntry> {
    return this.createJournalEntry(tenantId, {
      company_id: params.companyId,
      posting_date: new Date().toISOString(),
      narration: `Inventory asset intake from PO ${params.poId}`,
      source_type: 'PO_RECEIPT',
      source_id: params.poId,
      operation_id: params.operationId,
      currency: params.currency ?? 'USD',
      lines: [
        {
          account_id: params.inventoryAssetAccountId,
          debit_minor: params.totalIntakeMinor,
          credit_minor: '0',
          description: `Inventory capitalized from PO ${params.poId}`,
          reference_entity_type: 'PURCHASE_ORDER',
          reference_entity_id: params.poId,
        },
        {
          account_id: params.apAccountId,
          debit_minor: '0',
          credit_minor: params.totalIntakeMinor,
          description: `Accounts payable liability from PO ${params.poId}`,
          reference_entity_type: 'PURCHASE_ORDER',
          reference_entity_id: params.poId,
        },
      ],
    });
  }
}
