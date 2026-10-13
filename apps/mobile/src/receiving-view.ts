/**
 * STOKROVA Mobile — Goods Inward & Pallet Receiving Workflow
 * Purchase order lookup, blind vs expected quantity verification,
 * lot number & expiration date capture, and GS1 SSCC-18 pallet generation.
 */

import { themeTokens, brandColors } from '@stokrova/ui';

export interface InboundReceiptLine {
  poLineId: string;
  sku: string;
  productName: string;
  expectedUnits: number;
  receivedUnits: number;
  lotNumber?: string;
  expiryDateIso?: string;
  targetBinLocationCode: string;
  ssccPalletId?: string;
  isInspected: boolean;
}

export class MobileReceivingViewModel {
  private poNumber: string;
  private supplierName: string;
  private lines: InboundReceiptLine[] = [];

  constructor(poNumber: string, supplierName: string, lines: InboundReceiptLine[] = []) {
    this.poNumber = poNumber;
    this.supplierName = supplierName;
    this.lines = lines.map((l) => ({ ...l }));
  }

  public getPoNumber(): string {
    return this.poNumber;
  }

  public getSupplierName(): string {
    return this.supplierName;
  }

  public getLines(): InboundReceiptLine[] {
    return this.lines.map((l) => ({ ...l }));
  }

  /**
   * Generates standard GS1 SSCC-18 (Serial Shipping Container Code)
   * Format: 00 + GS1 Company Prefix + Serial Reference (total 17 digits) + Mod 10 Check Digit
   */
  public generateSscc18(companyPrefix = '1234567', serialNumber: number): string {
    const paddedSerial = serialNumber.toString().padStart(9, '0');
    const base17 = `0${companyPrefix}${paddedSerial}`;

    // Calculate GS1 Modulo 10 check digit
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const digit = parseInt(base17[i] ?? '0', 10);
      sum += (i % 2 === 0 ? 3 : 1) * digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return `${base17}${checkDigit}`;
  }

  public recordLineReceipt(
    poLineId: string,
    quantityReceived: number,
    lotNumber: string,
    expiryDateIso: string,
    targetBin: string,
    ssccPalletId?: string,
  ): InboundReceiptLine {
    const line = this.lines.find((l) => l.poLineId === poLineId);
    if (!line) {
      throw new Error(`PO Line ${poLineId} not found`);
    }
    if (quantityReceived <= 0) {
      throw new Error('Received quantity must be positive');
    }

    line.receivedUnits = quantityReceived;
    line.lotNumber = lotNumber;
    line.expiryDateIso = expiryDateIso;
    line.targetBinLocationCode = targetBin;
    line.ssccPalletId = ssccPalletId;
    line.isInspected = true;

    return { ...line };
  }

  public getReceivingSummary(): {
    totalExpected: number;
    totalReceived: number;
    completedLines: number;
    totalLines: number;
    hasDiscrepancies: boolean;
  } {
    let exp = 0;
    let rec = 0;
    let comp = 0;
    let disc = false;

    for (const l of this.lines) {
      exp += l.expectedUnits;
      rec += l.receivedUnits;
      if (l.isInspected) comp++;
      if (l.isInspected && l.receivedUnits !== l.expectedUnits) disc = true;
    }

    return {
      totalExpected: exp,
      totalReceived: rec,
      completedLines: comp,
      totalLines: this.lines.length,
      hasDiscrepancies: disc,
    };
  }

  public renderReceivingHtml(): string {
    const tokens = themeTokens.dark;
    const summary = this.getReceivingSummary();

    const linesHtml = this.lines
      .map(
        (l) => `
          <div class="receiving-line-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.9rem;">
              <span>${l.productName}</span>
              <span style="font-family: var(--stokrova-font-mono); color: ${l.isInspected ? '#4ADE80' : tokens.textMuted};">
                ${l.receivedUnits} / ${l.expectedUnits}
              </span>
            </div>
            <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; font-family: var(--stokrova-font-mono); margin-top: 4px;">
              SKU: ${l.sku} | Target: ${l.targetBinLocationCode}
            </div>
            ${
              l.isInspected
                ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed ${tokens.border}; font-size: 0.75rem; color: ${tokens.textMuted}; display: flex; justify-content: space-between;">
                <span>Lot: <strong>${l.lotNumber}</strong></span>
                <span>Exp: ${l.expiryDateIso?.split('T')[0]}</span>
                ${l.ssccPalletId ? `<span>Pallet: ${l.ssccPalletId.slice(-6)}</span>` : ''}
              </div>
            `
                : ''
            }
          </div>
        `.trim(),
      )
      .join('\n');

    return `
      <div class="mobile-receiving-view" style="color: ${tokens.textPrimary};">
        <header style="margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 1.1rem;">Inbound: ${this.poNumber}</h3>
          <div style="font-size: 0.8rem; color: ${tokens.textSecondary};">Supplier: ${this.supplierName}</div>
          <div style="font-size: 0.85rem; font-weight: 700; color: ${brandColors.gold[400]}; margin-top: 6px;">
            Received: ${summary.totalReceived} / ${summary.totalExpected} units (${summary.completedLines}/${summary.totalLines} lines)
          </div>
        </header>

        <section class="lines-list">
          ${linesHtml}
        </section>
      </div>
    `.trim();
  }
}
