/**
 * STOKROVA POS Desktop — Split Tender & Multi-Payment Modal
 * Interactive tender allocation (Cash, Card, Mobile Money, Store Credit),
 * quick-cash bills, change computation, and zero-float validation.
 */

import {
  type PosTenderSplit,
  type PosPaymentCalculation,
  calculatePosPaymentState,
  formatCurrencyMinor,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

export interface QuickCashPreset {
  label: string;
  amountMinor: bigint;
}

export class PosSplitTenderModal {
  private grandTotalMinor: bigint;
  private currencyCode: string;
  private tenders: PosTenderSplit[] = [];
  private isOpen = false;

  constructor(grandTotalMinor: bigint, currencyCode = 'USD') {
    this.grandTotalMinor = grandTotalMinor;
    this.currencyCode = currencyCode;
  }

  public open(): void {
    this.isOpen = true;
  }

  public close(): void {
    this.isOpen = false;
  }

  public isModalOpen(): boolean {
    return this.isOpen;
  }

  public setGrandTotal(totalMinor: bigint): void {
    this.grandTotalMinor = totalMinor;
  }

  public addTender(
    tenderType: PosTenderSplit['tenderType'],
    amountMinor: bigint,
    ref?: string,
  ): PosPaymentCalculation {
    if (amountMinor <= 0n) {
      throw new Error('Tender amount must be greater than zero');
    }

    const calc = this.getCalculation();
    // Non-cash tenders cannot exceed remaining due
    if (tenderType !== 'CASH' && amountMinor > calc.remainingDueMinor) {
      throw new Error(`Non-cash tenders cannot exceed remaining balance due of ${formatCurrencyMinor(calc.remainingDueMinor, this.currencyCode)}`);
    }

    this.tenders.push({
      tenderType,
      amountMinor,
      reference: ref,
    });

    return this.getCalculation();
  }

  public removeTender(index: number): void {
    if (index >= 0 && index < this.tenders.length) {
      this.tenders.splice(index, 1);
    }
  }

  public clearTenders(): void {
    this.tenders = [];
  }

  public getTenders(): PosTenderSplit[] {
    return [...this.tenders];
  }

  public getCalculation(): PosPaymentCalculation {
    return calculatePosPaymentState(this.grandTotalMinor, this.tenders);
  }

  public getQuickCashPresets(): QuickCashPreset[] {
    const calc = this.getCalculation();
    const remaining = calc.remainingDueMinor;

    return [
      { label: 'Exact Due', amountMinor: remaining > 0n ? remaining : 0n },
      { label: '$10.00', amountMinor: 1000n },
      { label: '$20.00', amountMinor: 2000n },
      { label: '$50.00', amountMinor: 5000n },
      { label: '$100.00', amountMinor: 10000n },
    ];
  }

  public renderModalHtml(): string {
    const tokens = themeTokens.dark;
    const calc = this.getCalculation();
    const grandTotalStr = formatCurrencyMinor(this.grandTotalMinor, this.currencyCode);
    const paidStr = formatCurrencyMinor(calc.totalTenderedMinor, this.currencyCode);
    const remainingStr = formatCurrencyMinor(calc.remainingDueMinor, this.currencyCode);
    const changeStr = formatCurrencyMinor(calc.changeDueMinor, this.currencyCode);

    const tendersListHtml = this.tenders
      .map(
        (t, idx) => `
          <div class="tender-line" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid ${tokens.border}; font-size: 0.85rem;">
            <span><strong>${t.tenderType}</strong> ${t.reference ? `(${t.reference})` : ''}</span>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span style="font-family: var(--stokrova-font-mono);">${formatCurrencyMinor(t.amountMinor, this.currencyCode)}</span>
              <button data-index="${idx}" style="background: none; border: none; color: ${tokens.textMuted}; cursor: pointer;">✕</button>
            </div>
          </div>
        `.trim(),
      )
      .join('');

    const presetsHtml = this.getQuickCashPresets()
      .map(
        (p) => `
          <button class="quick-cash-btn" data-amount="${p.amountMinor.toString()}" style="background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer;">
            ${p.label}
          </button>
        `.trim(),
      )
      .join(' ');

    return `
      <div class="split-tender-modal-overlay" style="display: ${this.isOpen ? 'flex' : 'none'}; position: fixed; inset: 0; background: rgba(0,0,0,0.7); justify-content: center; align-items: center; z-index: 1300;">
        <div class="split-tender-dialog" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; width: 540px; border-radius: 12px; overflow: hidden; color: ${tokens.textPrimary}; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <header style="background: ${tokens.card}; padding: 16px 20px; border-bottom: 1px solid ${tokens.border}; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 1.1rem;">Payment & Split Tender</h3>
            <span style="font-size: 1.25rem; font-weight: 700; color: ${brandColors.gold[400]};">${grandTotalStr}</span>
          </header>

          <main style="padding: 20px;">
            <div class="payment-metrics" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; text-align: center;">
              <div style="background: ${tokens.card}; padding: 10px; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Tendered</div>
                <div style="font-weight: 700; font-family: var(--stokrova-font-mono); margin-top: 4px;">${paidStr}</div>
              </div>
              <div style="background: ${tokens.card}; padding: 10px; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Balance Due</div>
                <div style="font-weight: 700; font-family: var(--stokrova-font-mono); color: ${calc.remainingDueMinor > 0n ? '#FBBF24' : tokens.textPrimary}; margin-top: 4px;">${remainingStr}</div>
              </div>
              <div style="background: ${tokens.card}; padding: 10px; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Change Due</div>
                <div style="font-weight: 700; font-family: var(--stokrova-font-mono); color: #4ADE80; margin-top: 4px;">${changeStr}</div>
              </div>
            </div>

            <div class="quick-cash-section" style="margin-bottom: 16px;">
              <div style="font-size: 0.8rem; color: ${tokens.textMuted}; margin-bottom: 8px;">Quick Cash Bills:</div>
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                ${presetsHtml}
              </div>
            </div>

            <div class="applied-tenders-list" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 6px; min-height: 80px; max-height: 140px; overflow-y: auto;">
              ${tendersListHtml || `<div style="padding: 24px; text-align: center; color: ${tokens.textMuted}; font-size: 0.8rem;">No tender applied yet</div>`}
            </div>
          </main>

          <footer style="padding: 16px 20px; background: ${tokens.card}; border-top: 1px solid ${tokens.border}; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn-cancel" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; padding: 10px 16px; border-radius: 6px; cursor: pointer;">Cancel</button>
            <button class="btn-settle" ${!calc.isFullySettled ? 'disabled' : ''} style="background: ${calc.isFullySettled ? tokens.primary : tokens.borderStrong}; color: #000; font-weight: 700; border: none; padding: 10px 24px; border-radius: 6px; cursor: ${calc.isFullySettled ? 'pointer' : 'not-allowed'};">
              Finalize Sale (Space)
            </button>
          </footer>

        </div>
      </div>
    `.trim();
  }
}
