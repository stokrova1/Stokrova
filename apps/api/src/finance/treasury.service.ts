import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  BankAccount,
  BankTransaction,
  CashTransfer,
  CashForecast,
  GroupCashPositionReport,
  CreateBankAccountRequest,
  InitiateCashTransferRequest,
  SyncBankFeedRequest,
} from '@stokrova/contracts';
import {
  calculateCashPosition,
  calculateCashForecast,
  assertValidCashTransferTransition,
  assertValidBankTransactionImport,
} from '@stokrova/domain';

@Injectable()
export class TreasuryService {
  private bankAccounts: Map<string, BankAccount> = new Map();
  private bankTransactions: Map<string, BankTransaction> = new Map(); // key: tenantId:accId:extTxId
  private cashTransfers: Map<string, CashTransfer> = new Map();
  private cashForecasts: Map<string, CashForecast> = new Map();

  // ==========================================================================
  // Bank Account Registry
  // ==========================================================================

  async createBankAccount(
    tenantId: string,
    req: CreateBankAccountRequest,
  ): Promise<BankAccount> {
    const masked = `****${req.account_number.slice(-4)}`;
    const existing = Array.from(this.bankAccounts.values()).find(
      (b) =>
        b.tenant_id === tenantId &&
        b.company_id === req.company_id &&
        b.account_number_masked === masked,
    );
    if (existing) {
      throw new ConflictException('Bank account with this number already exists');
    }

    const account: BankAccount = {
      id: `bnk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      company_id: req.company_id,
      bank_name: req.bank_name,
      account_name: req.account_name,
      account_number_masked: masked,
      currency: req.currency || 'USD',
      gl_account_id: req.gl_account_id,
      current_balance_minor: '0',
      statement_balance_minor: '0',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.bankAccounts.set(account.id, account);
    return account;
  }

  async getBankAccount(
    tenantId: string,
    accountId: string,
  ): Promise<BankAccount | null> {
    const account = this.bankAccounts.get(accountId);
    if (!account || account.tenant_id !== tenantId) {
      return null;
    }
    return account;
  }

  async setAccountBalance(
    tenantId: string,
    accountId: string,
    balanceMinor: string,
  ): Promise<BankAccount> {
    const account = await this.getBankAccount(tenantId, accountId);
    if (!account) {
      throw new NotFoundException(`Bank account ${accountId} not found`);
    }
    account.current_balance_minor = balanceMinor;
    account.updated_at = new Date().toISOString();
    return account;
  }

  // ==========================================================================
  // Bank Feed Synchronization & Idempotency
  // ==========================================================================

  async syncBankFeed(
    tenantId: string,
    req: SyncBankFeedRequest,
  ): Promise<{ imported_count: number; skipped_duplicates: number }> {
    const account = await this.getBankAccount(tenantId, req.bank_account_id);
    if (!account) {
      throw new NotFoundException(`Bank account ${req.bank_account_id} not found`);
    }

    let importedCount = 0;
    let skippedDuplicates = 0;

    for (const tx of req.transactions) {
      assertValidBankTransactionImport(tx.amount_minor, tx.transaction_date);

      const uniqueKey = `${tenantId}:${account.id}:${tx.external_transaction_id}`;
      if (this.bankTransactions.has(uniqueKey)) {
        skippedDuplicates++;
        continue; // Idempotent: already imported, do not duplicate
      }

      const bankTx: BankTransaction = {
        id: `btx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tenant_id: tenantId,
        bank_account_id: account.id,
        external_transaction_id: tx.external_transaction_id,
        transaction_date: tx.transaction_date,
        amount_minor: tx.amount_minor,
        currency: account.currency,
        transaction_type: tx.transaction_type || 'OTHER',
        description: tx.description,
        matching_status: 'UNMATCHED',
        created_at: new Date().toISOString(),
      };

      this.bankTransactions.set(uniqueKey, bankTx);
      importedCount++;
    }

    return { imported_count: importedCount, skipped_duplicates: skippedDuplicates };
  }

  async listBankTransactions(
    tenantId: string,
    bankAccountId: string,
  ): Promise<BankTransaction[]> {
    return Array.from(this.bankTransactions.values()).filter(
      (tx) => tx.tenant_id === tenantId && tx.bank_account_id === bankAccountId,
    );
  }

  // ==========================================================================
  // Cash Transfers & Dual Approval Controls
  // ==========================================================================

  async initiateCashTransfer(
    tenantId: string,
    req: InitiateCashTransferRequest,
  ): Promise<CashTransfer> {
    // Idempotency check via operation_id
    const existing = Array.from(this.cashTransfers.values()).find(
      (t) => t.tenant_id === tenantId && t.operation_id === req.operation_id,
    );
    if (existing) {
      return existing;
    }

    const sourceAcc = await this.getBankAccount(tenantId, req.source_bank_account_id);
    if (!sourceAcc) {
      throw new NotFoundException(`Source bank account ${req.source_bank_account_id} not found`);
    }

    const destAcc = await this.getBankAccount(tenantId, req.destination_bank_account_id);
    if (!destAcc) {
      throw new NotFoundException(`Destination bank account ${req.destination_bank_account_id} not found`);
    }

    const isIntercompany = req.source_company_id !== req.destination_company_id;
    // Dual approval required for large transfers >= 1,000,000 minor units ($10,000)
    const amountVal = BigInt(req.amount_minor);
    const requiresDualApproval = amountVal >= 1000000n;

    const transfer: CashTransfer = {
      id: `txfr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      transfer_number: `TRF-${Date.now()}`,
      operation_id: req.operation_id,
      source_company_id: req.source_company_id,
      source_bank_account_id: req.source_bank_account_id,
      destination_company_id: req.destination_company_id,
      destination_bank_account_id: req.destination_bank_account_id,
      amount_minor: req.amount_minor,
      currency: req.currency || sourceAcc.currency,
      is_intercompany: isIntercompany,
      status: 'AWAITING_APPROVAL',
      requires_dual_approval: requiresDualApproval,
      initiated_by: req.initiated_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.cashTransfers.set(transfer.id, transfer);
    return transfer;
  }

  async approveCashTransfer(
    tenantId: string,
    transferId: string,
    approverId: string,
  ): Promise<CashTransfer> {
    const transfer = this.cashTransfers.get(transferId);
    if (!transfer || transfer.tenant_id !== tenantId) {
      throw new NotFoundException(`Cash transfer ${transferId} not found`);
    }

    if (transfer.requires_dual_approval) {
      if (!transfer.approved_by) {
        transfer.approved_by = approverId;
        // Still requires second approval
        transfer.updated_at = new Date().toISOString();
        return transfer;
      } else if (!transfer.second_approved_by) {
        if (transfer.approved_by === approverId) {
          throw new BadRequestException('Second approver must be different from the first approver');
        }
        transfer.second_approved_by = approverId;
        assertValidCashTransferTransition(transfer.status, 'APPROVED', true, true);
        transfer.status = 'APPROVED';
        transfer.updated_at = new Date().toISOString();
        return transfer;
      }
    } else {
      transfer.approved_by = approverId;
      assertValidCashTransferTransition(transfer.status, 'APPROVED', false, true);
      transfer.status = 'APPROVED';
      transfer.updated_at = new Date().toISOString();
      return transfer;
    }

    return transfer;
  }

  async settleCashTransfer(
    tenantId: string,
    transferId: string,
    _settlerId: string,
  ): Promise<CashTransfer> {
    const transfer = this.cashTransfers.get(transferId);
    if (!transfer || transfer.tenant_id !== tenantId) {
      throw new NotFoundException(`Cash transfer ${transferId} not found`);
    }

    if (transfer.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot settle transfer in status '${transfer.status}', must be 'APPROVED'`);
    }

    const sourceAcc = await this.getBankAccount(tenantId, transfer.source_bank_account_id);
    const destAcc = await this.getBankAccount(tenantId, transfer.destination_bank_account_id);
    if (!sourceAcc || !destAcc) {
      throw new NotFoundException('Source or destination account missing during settlement');
    }

    // Deduct from source, add to destination
    const transferAmt = BigInt(transfer.amount_minor);
    const sourceBal = BigInt(sourceAcc.current_balance_minor);
    const destBal = BigInt(destAcc.current_balance_minor);

    sourceAcc.current_balance_minor = (sourceBal - transferAmt).toString();
    destAcc.current_balance_minor = (destBal + transferAmt).toString();

    transfer.status = 'SETTLED';
    transfer.settled_at = new Date().toISOString();
    transfer.updated_at = new Date().toISOString();

    return transfer;
  }

  // ==========================================================================
  // Cash Position & Liquidity Forecasting
  // ==========================================================================

  async getCashPosition(
    tenantId: string,
    companyId?: string,
  ): Promise<GroupCashPositionReport> {
    const accounts = Array.from(this.bankAccounts.values()).filter(
      (b) => b.tenant_id === tenantId && (!companyId || b.company_id === companyId),
    );

    const companyMap = new Map<string, string[]>();
    for (const acc of accounts) {
      const list = companyMap.get(acc.company_id) || [];
      list.push(acc.current_balance_minor);
      companyMap.set(acc.company_id, list);
    }

    const companies = Array.from(companyMap.entries()).map(([comp, balances]) => ({
      company_id: comp,
      total_bank_cash_minor: calculateCashPosition(balances),
      unreconciled_transactions_count: 0,
      unreconciled_amount_minor: '0',
      currency: 'USD',
    }));

    const allBalances = accounts.map((a) => a.current_balance_minor);
    const totalGroup = calculateCashPosition(allBalances);

    return {
      as_of_date: new Date().toISOString(),
      reporting_currency: 'USD',
      companies,
      total_group_cash_minor: totalGroup,
    };
  }

  async generateCashForecast(
    tenantId: string,
    companyId: string,
    horizonDays: number = 30,
    expectedInflows: string[] = [],
    expectedOutflows: string[] = [],
  ): Promise<CashForecast> {
    const accounts = Array.from(this.bankAccounts.values()).filter(
      (b) => b.tenant_id === tenantId && b.company_id === companyId,
    );
    const openingBalances = accounts.map((a) => a.current_balance_minor);
    const openingCash = calculateCashPosition(openingBalances);

    const forecastCalc = calculateCashForecast(
      openingCash,
      expectedInflows,
      expectedOutflows,
    );

    const forecast: CashForecast = {
      id: `cforecast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      company_id: companyId,
      forecast_date: new Date().toISOString(),
      horizon_days: horizonDays,
      currency: 'USD',
      opening_cash_minor: forecastCalc.opening_cash_minor,
      projected_inflows_minor: forecastCalc.total_inflows_minor,
      projected_outflows_minor: forecastCalc.total_outflows_minor,
      projected_closing_minor: forecastCalc.projected_closing_minor,
      created_at: new Date().toISOString(),
    };

    this.cashForecasts.set(forecast.id, forecast);
    return forecast;
  }
}
