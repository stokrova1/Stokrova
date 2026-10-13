/**
 * Sales Invoicing Domain Logic (Zero-dependency pure domain)
 * Enforces invoice state transitions, numbering rules, and balance calculations.
 */

export class InvoiceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceDomainError';
  }
}

export class InvalidInvoiceStateTransitionError extends InvoiceDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition Sales Invoice from '${fromStatus}' to '${toStatus}'.`);
    this.name = 'InvalidInvoiceStateTransitionError';
  }
}

export const SalesInvoiceStatuses = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  VOID: 'VOID',
  CREDITED: 'CREDITED',
} as const;

export type SalesInvoiceStatusCode =
  (typeof SalesInvoiceStatuses)[keyof typeof SalesInvoiceStatuses];

/**
 * Validates legal sales invoice state machine transitions.
 */
export function canTransitionSalesInvoiceStatus(
  currentStatus: string,
  targetStatus: string,
): boolean {
  if (currentStatus === SalesInvoiceStatuses.DRAFT) {
    return (
      targetStatus === SalesInvoiceStatuses.ISSUED ||
      targetStatus === SalesInvoiceStatuses.VOID
    );
  }
  if (currentStatus === SalesInvoiceStatuses.ISSUED) {
    return (
      targetStatus === SalesInvoiceStatuses.PARTIALLY_PAID ||
      targetStatus === SalesInvoiceStatuses.PAID ||
      targetStatus === SalesInvoiceStatuses.VOID
    );
  }
  if (currentStatus === SalesInvoiceStatuses.PARTIALLY_PAID) {
    return (
      targetStatus === SalesInvoiceStatuses.PAID ||
      targetStatus === SalesInvoiceStatuses.CREDITED
    );
  }
  if (currentStatus === SalesInvoiceStatuses.PAID) {
    return targetStatus === SalesInvoiceStatuses.CREDITED;
  }
  return false;
}
