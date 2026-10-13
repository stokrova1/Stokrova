// ============================================================================
// STOKROVA — Double-Entry Financial Accounting, General Ledger & Tax Domain Engine
// Benchmark: SAP S/4HANA Finance, NetSuite, Odoo Accounting
// Rules 7, 8, 11, 26: Pure integer minor unit math (zero floats), immutable entries,
// exact balance sum(debit) == sum(credit), non-destructive reversals
// ============================================================================

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE';

export type NormalBalance = 'DEBIT' | 'CREDIT';

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

export interface TaxLineBreakdown {
  tax_rate_id: string;
  tax_code: string;
  rate_basis_points: number;
  tax_amount_minor: string;
  liability_account_id: string;
}

export interface TaxCalculationResult {
  subtotal_minor: string;
  tax_total_minor: string;
  total_minor: string;
  breakdowns: TaxLineBreakdown[];
}

export interface TrialBalanceAccountRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  debit_minor: string;
  credit_minor: string;
  net_balance_minor: string;
}

export type FinanceErrorCode =
  | 'JOURNAL_ENTRY_UNBALANCED'
  | 'INVALID_JOURNAL_STATUS_TRANSITION'
  | 'JOURNAL_ENTRY_EMPTY_LINES'
  | 'ACCOUNT_INACTIVE'
  | 'INVALID_LINE_AMOUNT'
  | 'ENTRY_ALREADY_REVERSED'
  | 'CANNOT_REVERSE_UNPOSTED_ENTRY'
  | 'INVALID_ACCOUNT_CODE'
  | 'INVALID_TAX_CALCULATION'
  | 'PERIOD_CLOSED_OR_LOCKED'
  | 'POSTING_DATE_OUT_OF_PERIOD_RANGE'
  | 'INVALID_PERIOD_STATUS_TRANSITION'
  | 'CIRCULAR_ACCOUNT_HIERARCHY'
  | 'POSTING_RULE_INVALID'
  | 'RECONCILIATION_FAILED';

export class FinanceDomainError extends Error {
  constructor(
    public readonly code: FinanceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'FinanceDomainError';
  }
}

/**
 * Normal balance mapping according to US GAAP / IFRS standards:
 * - Assets & Expenses: Normal Balance = DEBIT (increases with Debit)
 * - Liabilities, Equity & Revenue: Normal Balance = CREDIT (increases with Credit)
 */
export function getNormalBalanceForAccountType(type: AccountType): NormalBalance {
  switch (type) {
    case 'ASSET':
    case 'EXPENSE':
      return 'DEBIT';
    case 'LIABILITY':
    case 'EQUITY':
    case 'REVENUE':
      return 'CREDIT';
    default:
      throw new FinanceDomainError(
        'INVALID_ACCOUNT_CODE',
        `Unknown account type: ${String(type)}`,
      );
  }
}

export interface BalancedJournalLineInput {
  account_id: string;
  debit_minor?: string | null;
  credit_minor?: string | null;
}

/**
 * Verifies the fundamental invariant of double-entry bookkeeping:
 * \sum \text{Debits} = \sum \text{Credits} in pure integer minor units.
 */
export function assertJournalEntryBalanced(
  lines: BalancedJournalLineInput[],
): { total_debit_minor: string; total_credit_minor: string } {
  if (!lines || lines.length < 2) {
    throw new FinanceDomainError(
      'JOURNAL_ENTRY_EMPTY_LINES',
      'A valid journal entry must contain at least two lines for double-entry balance',
    );
  }

  let totalDebit = 0n;
  let totalCredit = 0n;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const drStr = line.debit_minor ?? '0';
    const crStr = line.credit_minor ?? '0';

    if (!/^\d+$/.test(drStr) || !/^\d+$/.test(crStr)) {
      throw new FinanceDomainError(
        'INVALID_LINE_AMOUNT',
        `Line ${i + 1}: Debit and credit amounts must be non-negative integer minor unit strings`,
        { lineIndex: i, debit_minor: drStr, credit_minor: crStr },
      );
    }

    const dr = BigInt(drStr);
    const cr = BigInt(crStr);

    if (dr > 0n && cr > 0n) {
      throw new FinanceDomainError(
        'INVALID_LINE_AMOUNT',
        `Line ${i + 1}: Line cannot specify both a debit (${drStr}) and a credit (${crStr}) amount`,
        { lineIndex: i },
      );
    }

    if (dr === 0n && cr === 0n) {
      throw new FinanceDomainError(
        'INVALID_LINE_AMOUNT',
        `Line ${i + 1}: Line must specify either a non-zero debit or a non-zero credit amount`,
        { lineIndex: i },
      );
    }

    totalDebit += dr;
    totalCredit += cr;
  }

  if (totalDebit !== totalCredit) {
    const variance = totalDebit > totalCredit ? totalDebit - totalCredit : totalCredit - totalDebit;
    throw new FinanceDomainError(
      'JOURNAL_ENTRY_UNBALANCED',
      `Journal entry is out of balance by ${variance.toString()} minor units. Total Debits: ${totalDebit.toString()}, Total Credits: ${totalCredit.toString()}`,
      {
        total_debit_minor: totalDebit.toString(),
        total_credit_minor: totalCredit.toString(),
        variance_minor: variance.toString(),
      },
    );
  }

  return {
    total_debit_minor: totalDebit.toString(),
    total_credit_minor: totalCredit.toString(),
  };
}

/**
 * Validates state transitions for a Journal Entry:
 * DRAFT -> POSTED -> REVERSED
 * (Rule 11: Posted entries are permanent; only reversible via compensating entries)
 */
export function assertValidJournalEntryTransition(
  currentStatus: JournalEntryStatus,
  targetStatus: JournalEntryStatus,
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const validTransitions: Record<JournalEntryStatus, JournalEntryStatus[]> = {
    DRAFT: ['POSTED'],
    POSTED: ['REVERSED'],
    REVERSED: [],
  };

  const allowed = validTransitions[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new FinanceDomainError(
      'INVALID_JOURNAL_STATUS_TRANSITION',
      `Cannot transition journal entry from ${currentStatus} to ${targetStatus}`,
      { currentStatus, targetStatus },
    );
  }
}

export interface ReversibleLineInput {
  account_id: string;
  debit_minor: string;
  credit_minor: string;
  currency: string;
  description?: string | null;
  reference_entity_type?: string | null;
  reference_entity_id?: string | null;
}

/**
 * Generates exact compensating/reversing journal entry lines.
 * Inverts Debits to Credits, and Credits to Debits.
 */
export function createReversingJournalEntryLines(
  lines: ReversibleLineInput[],
): ReversibleLineInput[] {
  if (!lines || lines.length === 0) {
    throw new FinanceDomainError(
      'JOURNAL_ENTRY_EMPTY_LINES',
      'Cannot generate reversing lines for an empty journal entry',
    );
  }

  return lines.map((line) => ({
    account_id: line.account_id,
    debit_minor: line.credit_minor, // Invert: former credit is new debit
    credit_minor: line.debit_minor, // Invert: former debit is new credit
    currency: line.currency,
    description: line.description ? `[REVERSAL] ${line.description}` : '[REVERSAL]',
    reference_entity_type: line.reference_entity_type ?? null,
    reference_entity_id: line.reference_entity_id ?? null,
  }));
}

export interface TaxRateInput {
  id: string;
  code: string;
  rate_bp: number; // e.g. 750 = 7.5%
  is_inclusive: boolean;
  liability_account_id: string;
}

/**
 * Pure integer tax calculation supporting both tax-inclusive and tax-exclusive amounts.
 * Uses exact integer scaling with half-up rounding in minor units. Zero float drift.
 */
export function calculateTaxAmounts(
  amount_minor: string,
  taxRates: TaxRateInput[],
  is_inclusive_override?: boolean,
): TaxCalculationResult {
  if (!/^\d+$/.test(amount_minor)) {
    throw new FinanceDomainError(
      'INVALID_TAX_CALCULATION',
      `Base amount must be a positive integer minor unit string, received: ${amount_minor}`,
    );
  }

  const baseAmount = BigInt(amount_minor);
  if (baseAmount === 0n || taxRates.length === 0) {
    return {
      subtotal_minor: amount_minor,
      tax_total_minor: '0',
      total_minor: amount_minor,
      breakdowns: [],
    };
  }

  const isInclusive = is_inclusive_override !== undefined
    ? is_inclusive_override
    : taxRates.some((r) => r.is_inclusive);

  if (!isInclusive) {
    // Exclusive: subtotal is baseAmount, tax is added on top
    let totalTax = 0n;
    const breakdowns = taxRates.map((rate) => {
      const rateBp = BigInt(rate.rate_bp);
      // Half-up integer rounding: (amount * rateBp + 5000n) / 10000n
      const taxAmount = (baseAmount * rateBp + 5000n) / 10000n;
      totalTax += taxAmount;
      return {
        tax_rate_id: rate.id,
        tax_code: rate.code,
        rate_basis_points: rate.rate_bp,
        tax_amount_minor: taxAmount.toString(),
        liability_account_id: rate.liability_account_id,
      };
    });

    const total = baseAmount + totalTax;
    return {
      subtotal_minor: baseAmount.toString(),
      tax_total_minor: totalTax.toString(),
      total_minor: total.toString(),
      breakdowns,
    };
  } else {
    // Inclusive: total is baseAmount, subtotal and taxes extracted from inside
    const totalRateBp = taxRates.reduce((acc, r) => acc + BigInt(r.rate_bp), 0n);
    const denominator = 10000n + totalRateBp;

    let accumulatedTax = 0n;
    const breakdowns = taxRates.map((rate, index) => {
      const rateBp = BigInt(rate.rate_bp);
      // For last item, reconcile penny variance if applicable
      let taxAmount: bigint;
      if (index === taxRates.length - 1 && taxRates.length > 1) {
        // Total expected inclusive tax:
        const expectedTotalTax = (baseAmount * totalRateBp + denominator / 2n) / denominator;
        taxAmount = expectedTotalTax - accumulatedTax;
      } else {
        taxAmount = (baseAmount * rateBp + denominator / 2n) / denominator;
        accumulatedTax += taxAmount;
      }

      return {
        tax_rate_id: rate.id,
        tax_code: rate.code,
        rate_basis_points: rate.rate_bp,
        tax_amount_minor: taxAmount.toString(),
        liability_account_id: rate.liability_account_id,
      };
    });

    const taxTotal = breakdowns.reduce((acc, b) => acc + BigInt(b.tax_amount_minor), 0n);
    const subtotal = baseAmount - taxTotal;

    return {
      subtotal_minor: subtotal.toString(),
      tax_total_minor: taxTotal.toString(),
      total_minor: baseAmount.toString(),
      breakdowns,
    };
  }
}

export interface AccountMetadata {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
}

export interface AggregatedLine {
  account_id: string;
  debit_minor: string;
  credit_minor: string;
}

/**
 * Pure Trial Balance aggregator. Computes net balances per account and verifies
 * overall ledger equilibrium \sum \text{Debits} = \sum \text{Credits}.
 */
export function calculateTrialBalance(
  accounts: AccountMetadata[],
  lines: AggregatedLine[],
): {
  rows: TrialBalanceAccountRow[];
  total_debit_minor: string;
  total_credit_minor: string;
  is_balanced: boolean;
} {
  const accountMap = new Map<string, AccountMetadata>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  const debitTotals = new Map<string, bigint>();
  const creditTotals = new Map<string, bigint>();

  let grandDebit = 0n;
  let grandCredit = 0n;

  for (const line of lines) {
    const dr = BigInt(line.debit_minor || '0');
    const cr = BigInt(line.credit_minor || '0');

    grandDebit += dr;
    grandCredit += cr;

    const currentDr = debitTotals.get(line.account_id) ?? 0n;
    debitTotals.set(line.account_id, currentDr + dr);

    const currentCr = creditTotals.get(line.account_id) ?? 0n;
    creditTotals.set(line.account_id, currentCr + cr);
  }

  const rows: TrialBalanceAccountRow[] = [];

  for (const acc of accounts) {
    const totalDr = debitTotals.get(acc.id) ?? 0n;
    const totalCr = creditTotals.get(acc.id) ?? 0n;

    // Only include accounts with activity or all active chart accounts
    let netBalance: bigint;
    if (acc.normal_balance === 'DEBIT') {
      netBalance = totalDr - totalCr;
    } else {
      netBalance = totalCr - totalDr;
    }

    rows.push({
      account_id: acc.id,
      account_code: acc.code,
      account_name: acc.name,
      account_type: acc.type,
      normal_balance: acc.normal_balance,
      debit_minor: totalDr.toString(),
      credit_minor: totalCr.toString(),
      net_balance_minor: netBalance.toString(),
    });
  }

  // Sort rows deterministically by account code
  rows.sort((a, b) => a.account_code.localeCompare(b.account_code));

  return {
    rows,
    total_debit_minor: grandDebit.toString(),
    total_credit_minor: grandCredit.toString(),
    is_balanced: grandDebit === grandCredit,
  };
}

/**
 * Period control invariant (Rule 9):
 * Verifies that the period is OPEN and the posting date falls within its range.
 */
export function assertPeriodAllowsPosting(
  periodStatus: 'OPEN' | 'CLOSED' | 'LOCKED',
  postingDate: string,
  startDate: string,
  endDate: string,
): void {
  if (periodStatus !== 'OPEN') {
    throw new FinanceDomainError(
      'PERIOD_CLOSED_OR_LOCKED',
      `Cannot post to accounting period with status '${periodStatus}'. Posting is blocked.`,
      { periodStatus, postingDate },
    );
  }

  const pDate = new Date(postingDate).getTime();
  const sDate = new Date(startDate).getTime();
  const eDate = new Date(endDate).getTime();

  if (pDate < sDate || pDate > eDate) {
    throw new FinanceDomainError(
      'POSTING_DATE_OUT_OF_PERIOD_RANGE',
      `Posting date '${postingDate}' is outside period range [${startDate} to ${endDate}].`,
      { postingDate, startDate, endDate },
    );
  }
}

/**
 * Validates fiscal period status transition:
 * OPEN -> CLOSED -> LOCKED
 * CLOSED -> OPEN (reopening requires authorized justification)
 */
export function assertValidPeriodStatusTransition(
  currentStatus: 'OPEN' | 'CLOSED' | 'LOCKED',
  targetStatus: 'OPEN' | 'CLOSED' | 'LOCKED',
): void {
  if (currentStatus === targetStatus) return;

  const validTransitions: Record<string, string[]> = {
    OPEN: ['CLOSED'],
    CLOSED: ['OPEN', 'LOCKED'],
    LOCKED: [], // Permanently frozen fiscal year
  };

  const allowed = validTransitions[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new FinanceDomainError(
      'INVALID_PERIOD_STATUS_TRANSITION',
      `Cannot transition period from status '${currentStatus}' to '${targetStatus}'.`,
      { currentStatus, targetStatus },
    );
  }
}

/**
 * Enforces tree hierarchy and prevents circular parent account chains.
 */
export function assertNoCircularParentAccount(
  accountId: string,
  proposedParentId: string,
  getParentId: (id: string) => string | null | undefined,
): void {
  if (accountId === proposedParentId) {
    throw new FinanceDomainError(
      'CIRCULAR_ACCOUNT_HIERARCHY',
      `Account '${accountId}' cannot be its own parent.`,
    );
  }

  let currentId: string | null | undefined = proposedParentId;
  const visited = new Set<string>([accountId]);

  while (currentId) {
    if (visited.has(currentId)) {
      throw new FinanceDomainError(
        'CIRCULAR_ACCOUNT_HIERARCHY',
        `Circular parent relationship detected involving account '${currentId}'.`,
      );
    }
    visited.add(currentId);
    currentId = getParentId(currentId);
  }
}

/**
 * Validates configurable posting rule definition.
 */
export function assertValidPostingRule(
  ruleCode: string,
  debitAccountCode: string,
  creditAccountCode: string,
): void {
  if (!ruleCode || ruleCode.trim() === '') {
    throw new FinanceDomainError('POSTING_RULE_INVALID', 'Posting rule code cannot be empty.');
  }
  if (!debitAccountCode || !creditAccountCode) {
    throw new FinanceDomainError(
      'POSTING_RULE_INVALID',
      'Posting rule must define both debit and credit account codes.',
    );
  }
  if (debitAccountCode === creditAccountCode) {
    throw new FinanceDomainError(
      'POSTING_RULE_INVALID',
      'Debit account code and credit account code cannot be identical.',
    );
  }
}

/**
 * Subledger-to-GL reconciliation discrepancy calculator.
 * Discrepancy = GL Balance - Subledger Balance.
 */
export function calculateReconciliationDiscrepancy(
  glBalanceMinor: string,
  subledgerBalanceMinor: string,
): {
  discrepancy_minor: string;
  status: 'BALANCED' | 'DISCREPANCY';
} {
  const gl = BigInt(glBalanceMinor || '0');
  const sub = BigInt(subledgerBalanceMinor || '0');
  const diff = gl - sub;

  return {
    discrepancy_minor: diff.toString(),
    status: diff === 0n ? 'BALANCED' : 'DISCREPANCY',
  };
}

export interface CashFlowLineInput {
  account_type: AccountType;
  account_subtype: string;
  debit_minor: string;
  credit_minor: string;
}

/**
 * Pure Cash Flow Statement calculator using the indirect/direct classified approach.
 */
export function calculateCashFlowStatement(
  lines: CashFlowLineInput[],
  openingCashMinor = '0',
): {
  operating_activities_minor: string;
  investing_activities_minor: string;
  financing_activities_minor: string;
  net_cash_flow_minor: string;
  opening_cash_minor: string;
  closing_cash_minor: string;
} {
  let operating = 0n;
  let investing = 0n;
  let financing = 0n;

  for (const line of lines) {
    const dr = BigInt(line.debit_minor || '0');
    const cr = BigInt(line.credit_minor || '0');
    // For cash flow: Cash inflow is Debit, Cash outflow is Credit (or net income contributions)
    if (line.account_subtype === 'CASH' || line.account_subtype === 'BANK') {
      // Cash itself is the asset being tracked; skip direct self-lines
      continue;
    }

    if (line.account_type === 'REVENUE') {
      // Revenue increases operating cash flow
      operating += cr - dr;
    } else if (line.account_type === 'EXPENSE') {
      // Expense reduces operating cash flow
      operating -= dr - cr;
    } else if (line.account_subtype === 'FIXED_ASSET') {
      // Fixed assets investment
      investing -= dr - cr;
    } else if (line.account_subtype === 'OWNER_EQUITY' || line.account_subtype === 'CAPITAL') {
      // Financing activities
      financing += cr - dr;
    } else if (line.account_subtype === 'LONG_TERM_LIABILITY') {
      // Borrowings
      financing += cr - dr;
    } else {
      // Working capital changes (AR, AP, Inventory)
      if (line.account_subtype === 'ACCOUNTS_RECEIVABLE') {
        // Increase in AR is cash outflow
        operating -= dr - cr;
      } else if (line.account_subtype === 'INVENTORY' || line.account_subtype === 'WORK_IN_PROCESS') {
        // Increase in inventory is cash outflow
        operating -= dr - cr;
      } else if (line.account_subtype === 'ACCOUNTS_PAYABLE' || line.account_subtype === 'TAX_PAYABLE') {
        // Increase in AP is cash inflow
        operating += cr - dr;
      }
    }
  }

  const netCash = operating + investing + financing;
  const opening = BigInt(openingCashMinor);
  const closing = opening + netCash;

  return {
    operating_activities_minor: operating.toString(),
    investing_activities_minor: investing.toString(),
    financing_activities_minor: financing.toString(),
    net_cash_flow_minor: netCash.toString(),
    opening_cash_minor: opening.toString(),
    closing_cash_minor: closing.toString(),
  };
}

