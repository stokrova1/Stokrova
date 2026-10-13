// ============================================================================
// STOKROVA — Multi-Company Consolidation, Inter-Company & Integrations Domain
// Benchmark: SAP S/4HANA Corporate, NetSuite OneWorld, Stripe Webhooks
// Rules 7, 11, 26: Pure integer currency consolidation, automated elimination,
// HMAC-SHA256 signed webhooks, reprint tracking
// ============================================================================


export type DomainAccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE';

export type DomainInterCompanyStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type IntegrationsErrorCode =
  | 'INVALID_HOLDING_HIERARCHY'
  | 'SUBSIDIARY_CANNOT_BE_PARENT'
  | 'INTER_COMPANY_SAME_ENTITY'
  | 'INVALID_INTER_COMPANY_TRANSITION'
  | 'INVALID_WEBHOOK_URL'
  | 'INVALID_HMAC_SIGNATURE'
  | 'WEBHOOK_RETRY_EXHAUSTED';

export class IntegrationsDomainError extends Error {
  constructor(
    public readonly code: IntegrationsErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'IntegrationsDomainError';
  }
}

/**
 * Validates holding group structure:
 * - Parent company cannot be in subsidiaries list.
 * - Subsidiaries cannot be empty.
 * - No duplicate subsidiaries.
 */
export function assertValidHoldingGroupHierarchy(
  parentCompanyId: string,
  subsidiaryCompanyIds: string[],
): void {
  if (!parentCompanyId || parentCompanyId.trim() === '') {
    throw new IntegrationsDomainError(
      'INVALID_HOLDING_HIERARCHY',
      'Parent holding company ID is required.',
    );
  }

  if (!subsidiaryCompanyIds || subsidiaryCompanyIds.length === 0) {
    throw new IntegrationsDomainError(
      'INVALID_HOLDING_HIERARCHY',
      'At least one subsidiary company is required for a holding group.',
    );
  }

  const uniqueSubsidiaries = new Set(subsidiaryCompanyIds);
  if (uniqueSubsidiaries.size !== subsidiaryCompanyIds.length) {
    throw new IntegrationsDomainError(
      'INVALID_HOLDING_HIERARCHY',
      'Duplicate subsidiary companies found in holding group declaration.',
    );
  }

  if (uniqueSubsidiaries.has(parentCompanyId)) {
    throw new IntegrationsDomainError(
      'SUBSIDIARY_CANNOT_BE_PARENT',
      `Parent company '${parentCompanyId}' cannot be listed as its own subsidiary.`,
      { parentCompanyId },
    );
  }
}

export interface InterCompanyItemInput {
  variant_id: string;
  sku: string;
  quantity: number;
  unit_transfer_price_minor: string;
}

/**
 * Validates inter-company transfer prerequisites:
 * - Source and Destination must be distinct legal entities.
 * - Items list cannot be empty and quantities/prices must be valid.
 */
export function assertValidInterCompanyTransfer(
  sourceCompanyId: string,
  destinationCompanyId: string,
  items: InterCompanyItemInput[],
): { total_amount_minor: string } {
  if (sourceCompanyId === destinationCompanyId) {
    throw new IntegrationsDomainError(
      'INTER_COMPANY_SAME_ENTITY',
      'Source and destination companies must be distinct legal entities for inter-company transfer.',
      { sourceCompanyId, destinationCompanyId },
    );
  }

  if (!items || items.length === 0) {
    throw new IntegrationsDomainError(
      'INVALID_HOLDING_HIERARCHY',
      'Inter-company transfer must contain at least one item.',
    );
  }

  let totalAmount = 0n;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (item.quantity <= 0) {
      throw new IntegrationsDomainError(
        'INVALID_HOLDING_HIERARCHY',
        `Item ${i + 1} (${item.sku}): Quantity must be greater than zero.`,
      );
    }
    if (!/^\d+$/.test(item.unit_transfer_price_minor)) {
      throw new IntegrationsDomainError(
        'INVALID_HOLDING_HIERARCHY',
        `Item ${i + 1} (${item.sku}): Unit transfer price must be a non-negative integer minor string.`,
      );
    }

    const price = BigInt(item.unit_transfer_price_minor);
    const qty = BigInt(item.quantity);
    totalAmount += price * qty;
  }

  return { total_amount_minor: totalAmount.toString() };
}

/**
 * State machine for Inter-Company Transfers:
 * PROPOSED -> APPROVED -> IN_TRANSIT -> COMPLETED
 * or CANCELLED from PROPOSED / APPROVED
 */
export function assertInterCompanyTransition(
  currentStatus: DomainInterCompanyStatus,
  targetStatus: DomainInterCompanyStatus,
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const validTransitions: Record<DomainInterCompanyStatus, DomainInterCompanyStatus[]> = {
    PROPOSED: ['APPROVED', 'CANCELLED'],
    APPROVED: ['IN_TRANSIT', 'CANCELLED'],
    IN_TRANSIT: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  const allowed = validTransitions[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new IntegrationsDomainError(
      'INVALID_INTER_COMPANY_TRANSITION',
      `Cannot transition inter-company transfer from '${currentStatus}' to '${targetStatus}'.`,
      { currentStatus, targetStatus },
    );
  }
}

export interface InterCompanyMirrorJournalResult {
  sellerLines: Array<{ account_id: string; debit_minor: string; credit_minor: string; description: string }>;
  buyerLines: Array<{ account_id: string; debit_minor: string; credit_minor: string; description: string }>;
  eliminationLines: Array<{ account_id: string; debit_minor: string; credit_minor: string; description: string }>;
}

/**
 * Generates paired mirror journal entry lines and balancing elimination lines:
 * - Seller: Dr Inter-Company Receivable, Cr Inventory/Revenue
 * - Buyer: Dr Inventory Asset, Cr Inter-Company Payable
 * - Elimination: Dr Inter-Company Payable, Cr Inter-Company Receivable
 */
export function generateInterCompanyMirrorJournalLines(params: {
  transferAmountMinor: string;
  sellerReceivableAccountId: string;
  sellerRevenueAccountId: string;
  buyerAssetAccountId: string;
  buyerPayableAccountId: string;
  eliminationPayableAccountId: string;
  eliminationReceivableAccountId: string;
  transferNumber: string;
}): InterCompanyMirrorJournalResult {
  const amount = params.transferAmountMinor;

  const sellerLines = [
    {
      account_id: params.sellerReceivableAccountId,
      debit_minor: amount,
      credit_minor: '0',
      description: `Inter-company receivable from transfer ${params.transferNumber}`,
    },
    {
      account_id: params.sellerRevenueAccountId,
      debit_minor: '0',
      credit_minor: amount,
      description: `Inter-company transfer shipment for ${params.transferNumber}`,
    },
  ];

  const buyerLines = [
    {
      account_id: params.buyerAssetAccountId,
      debit_minor: amount,
      credit_minor: '0',
      description: `Inventory intake from inter-company transfer ${params.transferNumber}`,
    },
    {
      account_id: params.buyerPayableAccountId,
      debit_minor: '0',
      credit_minor: amount,
      description: `Inter-company payable for transfer ${params.transferNumber}`,
    },
  ];

  const eliminationLines = [
    {
      account_id: params.eliminationPayableAccountId,
      debit_minor: amount,
      credit_minor: '0',
      description: `Consolidation elimination of inter-company payable ${params.transferNumber}`,
    },
    {
      account_id: params.eliminationReceivableAccountId,
      debit_minor: '0',
      credit_minor: amount,
      description: `Consolidation elimination of inter-company receivable ${params.transferNumber}`,
    },
  ];

  return { sellerLines, buyerLines, eliminationLines };
}

/**
 * Verifies webhook signatures using constant-time string comparison.
 * Eliminates side-channel timing attacks across all runtimes (Node, Browser, SQLite workers).
 */
export function isSignatureValidConstantTime(
  signatureA: string,
  signatureB: string,
): boolean {
  if (typeof signatureA !== 'string' || typeof signatureB !== 'string') {
    return false;
  }
  if (signatureA.length !== signatureB.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < signatureA.length; i++) {
    result |= signatureA.charCodeAt(i) ^ signatureB.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Exponential backoff interval in seconds for webhook delivery retries:
 * Attempt 1: 60s (1 min)
 * Attempt 2: 300s (5 min)
 * Attempt 3: 900s (15 min)
 * Attempt 4: 3600s (1 hr)
 * Attempt 5+: 14400s (4 hrs)
 */
export function calculateWebhookRetryBackoffSeconds(attemptNumber: number): number {
  if (attemptNumber <= 1) return 60;
  if (attemptNumber === 2) return 300;
  if (attemptNumber === 3) return 900;
  if (attemptNumber === 4) return 3600;
  return 14400;
}

export interface CompanyTrialBalanceInput {
  companyId: string;
  rows: Array<{
    account_code: string;
    account_name: string;
    account_type: DomainAccountType;
    debit_minor: string;
    credit_minor: string;
    net_balance_minor: string;
  }>;
}

export interface EliminationLineInput {
  account_code: string;
  debit_minor: string;
  credit_minor: string;
}

/**
 * Computes consolidated trial balance across multiple companies with elimination adjustments.
 */
export function calculateConsolidatedTrialBalance(
  companyBalances: CompanyTrialBalanceInput[],
  eliminations: EliminationLineInput[],
): {
  rows: Array<{
    account_code: string;
    account_name: string;
    account_type: DomainAccountType;
    total_debit_minor: string;
    total_credit_minor: string;
    elimination_debit_minor: string;
    elimination_credit_minor: string;
    net_consolidated_minor: string;
  }>;
  total_debit_minor: string;
  total_credit_minor: string;
  total_eliminations_minor: string;
  is_balanced: boolean;
} {
  const accountsMap = new Map<
    string,
    {
      code: string;
      name: string;
      type: DomainAccountType;
      debit: bigint;
      credit: bigint;
      elimDebit: bigint;
      elimCredit: bigint;
    }
  >();

  let grandDebit = 0n;
  let grandCredit = 0n;
  let grandEliminations = 0n;

  // Aggregate across all subsidiaries
  for (const comp of companyBalances) {
    for (const r of comp.rows) {
      const dr = BigInt(r.debit_minor);
      const cr = BigInt(r.credit_minor);
      grandDebit += dr;
      grandCredit += cr;

      const existing = accountsMap.get(r.account_code);
      if (existing) {
        existing.debit += dr;
        existing.credit += cr;
      } else {
        accountsMap.set(r.account_code, {
          code: r.account_code,
          name: r.account_name,
          type: r.account_type,
          debit: dr,
          credit: cr,
          elimDebit: 0n,
          elimCredit: 0n,
        });
      }
    }
  }

  // Apply elimination adjustments
  for (const elim of eliminations) {
    const elimDr = BigInt(elim.debit_minor);
    const elimCr = BigInt(elim.credit_minor);
    grandEliminations += elimDr + elimCr;

    const existing = accountsMap.get(elim.account_code);
    if (existing) {
      existing.elimDebit += elimDr;
      existing.elimCredit += elimCr;
    }
  }

  const rows = Array.from(accountsMap.values())
    .map((acc) => {
      // Net consolidated = (debit - elimDebit) - (credit - elimCredit) or vice-versa
      const netDebit = acc.debit - acc.elimDebit;
      const netCredit = acc.credit - acc.elimCredit;
      const netConsolidated =
        acc.type === 'ASSET' || acc.type === 'EXPENSE'
          ? netDebit - netCredit
          : netCredit - netDebit;

      return {
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        total_debit_minor: acc.debit.toString(),
        total_credit_minor: acc.credit.toString(),
        elimination_debit_minor: acc.elimDebit.toString(),
        elimination_credit_minor: acc.elimCredit.toString(),
        net_consolidated_minor: netConsolidated.toString(),
      };
    })
    .sort((a, b) => a.account_code.localeCompare(b.account_code));

  return {
    rows,
    total_debit_minor: grandDebit.toString(),
    total_credit_minor: grandCredit.toString(),
    total_eliminations_minor: grandEliminations.toString(),
    is_balanced: grandDebit === grandCredit,
  };
}
