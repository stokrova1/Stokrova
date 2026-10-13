/**
 * Quotation Lifecycle & Conversion Domain Engine (Zero-dependency pure domain)
 * Enforces quotation state transitions, expiration validations, and conversion invariants.
 */

export class QuotationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotationDomainError';
  }
}

export class InvalidQuotationStateTransitionError extends QuotationDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition Quotation from '${fromStatus}' to '${toStatus}'.`);
    this.name = 'InvalidQuotationStateTransitionError';
  }
}

export class QuotationExpiredError extends QuotationDomainError {
  constructor(quotationNumber: string, validUntil: string) {
    super(`Quotation '${quotationNumber}' expired on ${validUntil} and cannot be converted.`);
    this.name = 'QuotationExpiredError';
  }
}

export class QuotationAlreadyConvertedError extends QuotationDomainError {
  constructor(quotationNumber: string, orderId: string) {
    super(`Quotation '${quotationNumber}' has already been converted to Sales Order '${orderId}'. Duplicate conversion rejected.`);
    this.name = 'QuotationAlreadyConvertedError';
  }
}

export const QuotationStatuses = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  CONVERTED: 'CONVERTED',
} as const;

export type QuotationStatusCode = (typeof QuotationStatuses)[keyof typeof QuotationStatuses];

/**
 * Validates legal quotation state machine transitions.
 */
export function canTransitionQuotationStatus(
  currentStatus: string,
  targetStatus: string,
): boolean {
  if (currentStatus === QuotationStatuses.DRAFT) {
    return (
      targetStatus === QuotationStatuses.SENT ||
      targetStatus === QuotationStatuses.ACCEPTED ||
      targetStatus === QuotationStatuses.CANCELLED
    );
  }
  if (currentStatus === QuotationStatuses.SENT) {
    return (
      targetStatus === QuotationStatuses.ACCEPTED ||
      targetStatus === QuotationStatuses.EXPIRED ||
      targetStatus === QuotationStatuses.CANCELLED
    );
  }
  if (currentStatus === QuotationStatuses.ACCEPTED) {
    return (
      targetStatus === QuotationStatuses.CONVERTED ||
      targetStatus === QuotationStatuses.CANCELLED
    );
  }
  return false;
}

/**
 * Verifies that a quotation is valid and eligible for conversion to a Sales Order.
 */
export function assertQuotationCanBeConverted(
  quotationNumber: string,
  status: string,
  validUntil: string | null,
  convertedOrderId: string | null,
  currentTimestamp: Date = new Date(),
): void {
  if (status === QuotationStatuses.CONVERTED || convertedOrderId) {
    throw new QuotationAlreadyConvertedError(
      quotationNumber,
      convertedOrderId || 'EXISTING_ORDER',
    );
  }

  if (status !== QuotationStatuses.ACCEPTED && status !== QuotationStatuses.SENT && status !== QuotationStatuses.DRAFT) {
    throw new QuotationDomainError(
      `Quotation '${quotationNumber}' in status '${status}' cannot be converted to a Sales Order. Must be ACCEPTED or valid.`,
    );
  }

  if (validUntil) {
    const expiry = new Date(validUntil);
    if (currentTimestamp.getTime() > expiry.getTime()) {
      throw new QuotationExpiredError(quotationNumber, validUntil);
    }
  }
}
