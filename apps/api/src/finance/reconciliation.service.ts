import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ReconciliationRecord,
  ReconciliationType,
} from '@stokrova/contracts';
import { calculateReconciliationDiscrepancy } from '@stokrova/domain';
import { AccountsService } from './accounts.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';

@Injectable()
export class ReconciliationService {
  private readonly reconciliations = new DurableMap<ReconciliationRecord>('reconciliation_records');

  constructor(
    private readonly accountsService: AccountsService,
    private readonly glService: GeneralLedgerService,
  ) {}

  private async getAccountNetBalance(
    tenantId: string,
    companyId: string,
    accountCode: string,
    asOfDate?: string,
  ): Promise<{ accountId: string; netBalanceMinor: string }> {
    const acc = await this.accountsService.getAccountByCode(tenantId, companyId, accountCode);
    if (!acc) {
      throw new NotFoundException(`Account with code '${accountCode}' not found.`);
    }

    const entries = await this.glService.listJournalEntries(tenantId, {
      company_id: companyId,
      status: 'POSTED',
      end_date: asOfDate,
    });

    let totalDr = 0n;
    let totalCr = 0n;
    for (const e of entries) {
      for (const line of e.lines) {
        if (line.account_id === acc.id) {
          totalDr += BigInt(line.debit_minor || '0');
          totalCr += BigInt(line.credit_minor || '0');
        }
      }
    }

    const net = acc.normal_balance === 'DEBIT' ? totalDr - totalCr : totalCr - totalDr;
    return { accountId: acc.id, netBalanceMinor: net.toString() };
  }

  async reconcileSubledger(
    tenantId: string,
    reqOrCompanyId:
      | string
      | {
          company_id: string;
          book_id?: string;
          subledger_type?: string;
          reconciliation_type?: ReconciliationType;
          subledger_balance_minor: string;
          performed_by?: string;
          as_of_date?: string;
          notes?: string;
        },
    bookIdArg?: string,
    typeArg?: ReconciliationType,
    subledgerBalanceMinorArg?: string,
    performedByArg?: string,
    asOfDateArg?: string,
    notesArg?: string,
  ): Promise<ReconciliationRecord> {
    let companyId: string;
    let bookId: string;
    let rawType: string;
    let subledgerBalanceMinor: string;
    let performedBy: string;
    let asOfDate: string;
    let notes: string | null;

    if (typeof reqOrCompanyId === 'object') {
      companyId = reqOrCompanyId.company_id;
      bookId = reqOrCompanyId.book_id ?? 'MAIN';
      rawType = reqOrCompanyId.reconciliation_type ?? reqOrCompanyId.subledger_type ?? 'AR';
      subledgerBalanceMinor = reqOrCompanyId.subledger_balance_minor;
      performedBy = reqOrCompanyId.performed_by ?? 'SYSTEM';
      asOfDate = reqOrCompanyId.as_of_date ?? new Date().toISOString();
      notes = reqOrCompanyId.notes ?? null;
    } else {
      companyId = reqOrCompanyId;
      bookId = bookIdArg ?? 'MAIN';
      rawType = typeArg ?? 'AR';
      subledgerBalanceMinor = subledgerBalanceMinorArg ?? '0';
      performedBy = performedByArg ?? 'SYSTEM';
      asOfDate = asOfDateArg ?? new Date().toISOString();
      notes = notesArg ?? null;
    }

    const normalizedTypeMap: Record<string, ReconciliationType> = {
      AR: 'AR',
      ACCOUNTS_RECEIVABLE: 'AR',
      AP: 'AP',
      ACCOUNTS_PAYABLE: 'AP',
      INVENTORY: 'INVENTORY',
      GRNI: 'GRNI',
      GRNI_CLEARING: 'GRNI',
      CASH: 'CASH',
      WIP: 'WIP',
      WORK_IN_PROCESS: 'WIP',
    };
    const type = normalizedTypeMap[rawType.toUpperCase()] ?? 'AR';

    const accountCodeMap: Record<ReconciliationType, string> = {
      AR: '1100',
      AP: '2010',
      INVENTORY: '1200',
      GRNI: '2020',
      CASH: '1010',
      WIP: '1400',
    };

    const targetAccountCode = accountCodeMap[type];
    const { accountId, netBalanceMinor: glBalance } = await this.getAccountNetBalance(
      tenantId,
      companyId,
      targetAccountCode,
      asOfDate,
    );

    const result = calculateReconciliationDiscrepancy(glBalance, subledgerBalanceMinor);

    const record: ReconciliationRecord = {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: companyId,
      book_id: bookId,
      reconciliation_type: type,
      as_of_date: asOfDate,
      gl_account_id: accountId,
      gl_balance_minor: glBalance,
      subledger_balance_minor: subledgerBalanceMinor,
      discrepancy_minor: result.discrepancy_minor,
      status: result.status,
      performed_by: performedBy,
      notes,
      created_at: new Date().toISOString(),
    };

    this.reconciliations.set(record.id, record);
    return record;
  }

  async listReconciliations(
    tenantId: string,
    companyId?: string,
    type?: ReconciliationType,
  ): Promise<ReconciliationRecord[]> {
    return Array.from(this.reconciliations.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (companyId && r.company_id !== companyId) return false;
      if (type && r.reconciliation_type !== type) return false;
      return true;
    });
  }
}
