/**
 * Customer & Credit Limit Domain Logic (Zero-dependency pure domain)
 * Enforces credit limits, account status invariants, and tenant isolation rules.
 */

export class CustomerDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerDomainError';
  }
}

export class CustomerCreditLimitExceededError extends CustomerDomainError {
  constructor(
    customerCode: string,
    currentOutstandingMinor: bigint,
    newOrderMinor: bigint,
    creditLimitMinor: bigint,
  ) {
    const totalExposure = currentOutstandingMinor + newOrderMinor;
    super(
      `Credit limit exceeded for customer '${customerCode}'. Credit limit: ${creditLimitMinor.toString()}, Current balance: ${currentOutstandingMinor.toString()}, Order exposure: ${newOrderMinor.toString()}, Total exposure: ${totalExposure.toString()}.`,
    );
    this.name = 'CustomerCreditLimitExceededError';
  }
}

export class InactiveCustomerError extends CustomerDomainError {
  constructor(customerCode: string, status: string) {
    super(`Customer '${customerCode}' is not active (current status: '${status}'). Commercial orders cannot be placed.`);
    this.name = 'InactiveCustomerError';
  }
}

export const CustomerStatuses = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type CustomerStatusCode = (typeof CustomerStatuses)[keyof typeof CustomerStatuses];

/**
 * Validates that placing a new order on credit does not exceed the customer's authorized limit.
 * If creditLimitMinor is 0n, customer operates on immediate cash/prepayment terms unless authorized.
 */
export function assertCustomerCreditLimitValid(
  customerCode: string,
  currentOutstandingMinor: bigint,
  newOrderMinor: bigint,
  creditLimitMinor: bigint,
): void {
  if (newOrderMinor <= 0n) {
    return;
  }

  if (creditLimitMinor <= 0n) {
    throw new CustomerCreditLimitExceededError(
      customerCode,
      currentOutstandingMinor,
      newOrderMinor,
      creditLimitMinor,
    );
  }

  const projectedTotal = currentOutstandingMinor + newOrderMinor;
  if (projectedTotal > creditLimitMinor) {
    throw new CustomerCreditLimitExceededError(
      customerCode,
      currentOutstandingMinor,
      newOrderMinor,
      creditLimitMinor,
    );
  }
}

/**
 * Validates that customer is in an active commercial status.
 */
export function assertCustomerCanTransact(customerCode: string, status: string): void {
  if (status !== CustomerStatuses.ACTIVE) {
    throw new InactiveCustomerError(customerCode, status);
  }
}
