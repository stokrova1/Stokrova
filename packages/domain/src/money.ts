/**
 * Monetary Value Objects & Invariants
 * Defined in ARCHITECTURE.md (Rule 8: Integer minor units)
 */

export interface Money {
  amount_minor: bigint;
  currency_code: string;
}

export function createMoney(amountMinor: bigint | number, currencyCode: string): Money {
  return {
    amount_minor: BigInt(amountMinor),
    currency_code: currencyCode.toUpperCase(),
  };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency_code !== b.currency_code) {
    throw new Error(
      `Cannot add different currencies: ${a.currency_code} and ${b.currency_code}`,
    );
  }
  return {
    amount_minor: a.amount_minor + b.amount_minor,
    currency_code: a.currency_code,
  };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency_code !== b.currency_code) {
    throw new Error(
      `Cannot subtract different currencies: ${a.currency_code} and ${b.currency_code}`,
    );
  }
  return {
    amount_minor: a.amount_minor - b.amount_minor,
    currency_code: a.currency_code,
  };
}
