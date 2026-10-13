/**
 * STOKROVA POS Desktop — Shift & Register Float Reconciliation Modal
 * Opening float declaration, mid-shift cash drops, blind cash count entry,
 * expected vs actual variance calculation, and session close receipts.
 */

import { formatCurrencyMinor, themeTokens, brandColors } from '@stokrova/ui';

export interface CashMovementRecord {
  id: string;
  type: 'OPENING_FLOAT' | 'CASH_DROP' | 'PAYOUT' | 'FLOAT_ADD';
  amountMinor: bigint;
  timestampIso: string;
  reason?: string;
}

export interface DenominationCount {
  denominationMinor: bigint; // e.g. 10000n = $100.00
  label: string; // e.g. "$100 bill"
  count: number;
}

export interface ReconciliationResult {
  sessionId: string;
  cashierId: string;
  openingFloatMinor: bigint;
  cashSalesMinor: bigint;
  cashDropsMinor: bigint;
  expectedCashMinor: bigint;
  actualCountedMinor: bigint;
  varianceMinor: bigint; // positive = over, negative = short, 0 = exact
  isBalanced: boolean;
}

export class PosReconciliationModal {
  private sessionId: string;
  private registerId: string;
  private cashierId: string;
  private currencyCode: string;
  private openingFloatMinor = 0n;
  private cashSalesMinor = 0n;
  private cashMovements: CashMovementRecord[] = [];
  private denominationCounts: DenominationCount[] = [];

  constructor(sessionId: string, registerId: string, cashierId: string, currencyCode = 'USD') {
    this.sessionId = sessionId;
    this.registerId = registerId;
    this.cashierId = cashierId;
    this.currencyCode = currencyCode;

    // Standard default US currency denominations
    this.denominationCounts = [
      { denominationMinor: 10000n, label: '$100 Bill', count: 0 },
      { denominationMinor: 5000n, label: '$50 Bill', count: 0 },
      { denominationMinor: 2000n, label: '$20 Bill', count: 0 },
      { denominationMinor: 1000n, label: '$10 Bill', count: 0 },
      { denominationMinor: 500n, label: '$5 Bill', count: 0 },
      { denominationMinor: 100n, label: '$1 Bill', count: 0 },
      { denominationMinor: 25n, label: '25¢ Quarter', count: 0 },
      { denominationMinor: 10n, label: '10¢ Dime', count: 0 },
      { denominationMinor: 5n, label: '5¢ Nickel', count: 0 },
      { denominationMinor: 1n, label: '1¢ Penny', count: 0 },
    ];
  }

  public setOpeningFloat(amountMinor: bigint): void {
    if (amountMinor < 0n) {
      throw new Error('Opening float cannot be negative');
    }
    this.openingFloatMinor = amountMinor;
    this.cashMovements.push({
      id: `mvt_float_${Date.now()}`,
      type: 'OPENING_FLOAT',
      amountMinor,
      timestampIso: new Date().toISOString(),
      reason: 'Opening register float',
    });
  }

  public getOpeningFloat(): bigint {
    return this.openingFloatMinor;
  }

  public recordCashSale(amountMinor: bigint): void {
    this.cashSalesMinor += amountMinor;
  }

  public recordCashDrop(amountMinor: bigint, reason = 'Safe drop'): CashMovementRecord {
    if (amountMinor <= 0n) {
      throw new Error('Cash drop amount must be greater than zero');
    }
    const mvt: CashMovementRecord = {
      id: `mvt_drop_${Date.now()}`,
      type: 'CASH_DROP',
      amountMinor,
      timestampIso: new Date().toISOString(),
      reason,
    };
    this.cashMovements.push(mvt);
    return mvt;
  }

  public setDenominationCount(denominationMinor: bigint, count: number): void {
    if (count < 0) {
      throw new Error('Count cannot be negative');
    }
    const den = this.denominationCounts.find((d) => d.denominationMinor === denominationMinor);
    if (den) {
      den.count = count;
    }
  }

  public getActualCountedTotalMinor(): bigint {
    let total = 0n;
    for (const d of this.denominationCounts) {
      total += d.denominationMinor * BigInt(d.count);
    }
    return total;
  }

  public calculateReconciliation(): ReconciliationResult {
    let dropsTotal = 0n;
    for (const m of this.cashMovements) {
      if (m.type === 'CASH_DROP' || m.type === 'PAYOUT') {
        dropsTotal += m.amountMinor;
      }
    }

    const expected = this.openingFloatMinor + this.cashSalesMinor - dropsTotal;
    const actual = this.getActualCountedTotalMinor();
    const variance = actual - expected;

    return {
      sessionId: this.sessionId,
      cashierId: this.cashierId,
      openingFloatMinor: this.openingFloatMinor,
      cashSalesMinor: this.cashSalesMinor,
      cashDropsMinor: dropsTotal,
      expectedCashMinor: expected,
      actualCountedMinor: actual,
      varianceMinor: variance,
      isBalanced: variance === 0n,
    };
  }

  public getCashierId(): string {
    return this.cashierId;
  }

  public renderBlindCountHtml(): string {
    const tokens = themeTokens.dark;
    const countedTotalStr = formatCurrencyMinor(this.getActualCountedTotalMinor(), this.currencyCode);

    const rowsHtml = this.denominationCounts
      .map(
        (d) => `
          <div class="denom-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid ${tokens.border};">
            <span style="font-size: 0.85rem;">${d.label}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="number" min="0" value="${d.count}" data-denom="${d.denominationMinor.toString()}" style="width: 70px; background: ${tokens.card}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; border-radius: 4px; padding: 4px; text-align: right; font-family: var(--stokrova-font-mono);" />
              <span style="width: 80px; text-align: right; font-family: var(--stokrova-font-mono); font-size: 0.8rem; color: ${tokens.textSecondary};">
                ${formatCurrencyMinor(d.denominationMinor * BigInt(d.count), this.currencyCode)}
              </span>
            </div>
          </div>
        `.trim(),
      )
      .join('\n');

    return `
      <div class="pos-reconciliation-view" style="color: ${tokens.textPrimary}; max-width: 480px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 20px;">
        <header style="border-bottom: 1px solid ${tokens.border}; padding-bottom: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0;">Blind Cash Drawer Count</h3>
          <div style="font-size: 0.8rem; color: ${tokens.textMuted}; margin-top: 4px;">Session: ${this.sessionId} | Register: ${this.registerId}</div>
        </header>

        <section class="denomination-inputs" style="margin-bottom: 16px;">
          ${rowsHtml}
        </section>

        <footer style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600;">Total Cash Counted:</span>
          <span style="font-size: 1.25rem; font-weight: 700; color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono);">${countedTotalStr}</span>
        </footer>
      </div>
    `.trim();
  }
}
