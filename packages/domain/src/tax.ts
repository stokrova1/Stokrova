// ============================================================================
// STOKROVA — Tax Compliance Domain Logic & Invariants
// Benchmark: Avalara, Vertex, Thomson Reuters ONESOURCE
// Rule 7, 8, 11: Versioned tax rates, deterministic return preparation,
// GL control account reconciliation, submission auditability
// ============================================================================

export type TaxReturnStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'VALIDATED'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED';

/**
 * Calculates tax amount in minor units from taxable amount and rate in basis points (10000 = 100.00%).
 */
export function calculateTaxAmountFromBasisPoints(
  taxableAmountMinor: string,
  rateBasisPoints: number,
): string {
  if (rateBasisPoints < 0) {
    throw new Error('Tax rate basis points cannot be negative');
  }
  const taxable = BigInt(taxableAmountMinor);
  const rate = BigInt(rateBasisPoints);
  const tax = (taxable * rate) / 10000n;
  return tax.toString();
}

/**
 * Calculates net tax due (Output Tax minus Recoverable Input Tax).
 * Positive = Net Tax Payable to Authority.
 * Negative = Net Tax Refund / Credit from Authority.
 */
export function calculateNetTaxDue(
  outputTaxMinor: string,
  recoverableInputTaxMinor: string,
): string {
  const outputTax = BigInt(outputTaxMinor);
  const inputTax = BigInt(recoverableInputTaxMinor);
  const netDue = outputTax - inputTax;
  return netDue.toString();
}

/**
 * Validates tax return lifecycle state machine transitions.
 */
export function assertValidTaxReturnStatusTransition(
  currentStatus: TaxReturnStatus,
  targetStatus: TaxReturnStatus,
): void {
  const allowedTransitions: Record<TaxReturnStatus, TaxReturnStatus[]> = {
    DRAFT: ['PREPARED'],
    PREPARED: ['VALIDATED', 'DRAFT'],
    VALIDATED: ['APPROVED', 'PREPARED'],
    APPROVED: ['SUBMITTED'],
    SUBMITTED: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: [],
    REJECTED: ['PREPARED', 'DRAFT'],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid tax return status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}

/**
 * Reconciles statutory tax return calculation against GL Tax Control Account balance.
 */
export function reconcileTaxWithGl(
  calculatedTaxMinor: string,
  glControlBalanceMinor: string,
): {
  discrepancy_minor: string;
  is_balanced: boolean;
} {
  const calc = BigInt(calculatedTaxMinor);
  const gl = BigInt(glControlBalanceMinor);
  const diff = calc - gl;

  return {
    discrepancy_minor: diff.toString(),
    is_balanced: diff === 0n,
  };
}
