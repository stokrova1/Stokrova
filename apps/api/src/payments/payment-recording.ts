/**
 * Stokrova never processes customer money. Staff only record how the customer paid:
 * cash into the drawer, or a transfer into the business's bank account.
 * "Card" is paid by transfer to the business account, so it is recorded as a transfer.
 */
export function recordedMethod<T extends string>(method: T): T | 'BANK_TRANSFER' {
  return method === 'CARD' ? 'BANK_TRANSFER' : method;
}

/** Splits recorded takings into what should be in the drawer and what should be in the bank. */
export function splitTakings(
  rows: { method: string; amount_minor: bigint }[],
): { cash_minor: bigint; transfer_minor: bigint; other_minor: bigint } {
  let cash = 0n, transfer = 0n, other = 0n;
  for (const r of rows) {
    const m = recordedMethod(r.method);
    if (m === 'CASH') cash += r.amount_minor;
    else if (m === 'BANK_TRANSFER') transfer += r.amount_minor;
    else other += r.amount_minor;
  }
  return { cash_minor: cash, transfer_minor: transfer, other_minor: other };
}
