/**
 * STOKROVA POS Desktop — Cash Register Front-End View
 * Rapid barcode scanner buffer listener, fast-tile touch grid,
 * and live cart ledger with inline quantity/discount adjustments.
 */

import {
  type PosCartItem,
  formatCurrencyMinor,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

export interface PosFastTileItem {
  sku: string;
  name: string;
  category: string;
  unitPriceMinor: bigint;
  taxRateBps: number;
  barcode: string;
  hotkey?: string;
  colorHex?: string;
}

export class PosRegisterViewModel {
  private fastTiles: PosFastTileItem[] = [];
  private selectedCategory = 'ALL';
  private barcodeBuffer = '';
  private lastKeyTimestamp = 0;
  private readonly barcodeScannerThresholdMs = 50; // Hardware scanners emit keystrokes < 50ms apart

  constructor(initialTiles: PosFastTileItem[] = []) {
    this.fastTiles = [...initialTiles];
  }

  public getScannerThresholdMs(): number {
    return this.barcodeScannerThresholdMs;
  }

  public setFastTiles(tiles: PosFastTileItem[]): void {
    this.fastTiles = [...tiles];
  }

  public getFastTiles(category?: string): PosFastTileItem[] {
    const filter = category ?? this.selectedCategory;
    if (filter === 'ALL') {
      return [...this.fastTiles];
    }
    return this.fastTiles.filter((t) => t.category === filter);
  }

  public setSelectedCategory(category: string): void {
    this.selectedCategory = category;
  }

  public getCategories(): string[] {
    const cats = new Set<string>(['ALL']);
    for (const t of this.fastTiles) {
      cats.add(t.category);
    }
    return Array.from(cats);
  }

  /**
   * Hardware barcode scanner buffer processor.
   * Detects rapid keystroke bursts (< 50ms interval) terminated by Enter key.
   */
  public handleKeyInput(
    key: string,
    now: number = Date.now(),
  ): { isBarcodeScanned: boolean; scannedBarcode?: string } {
    const interval = now - this.lastKeyTimestamp;
    this.lastKeyTimestamp = now;

    if (key === 'Enter') {
      if (this.barcodeBuffer.length >= 3) {
        const barcode = this.barcodeBuffer;
        this.barcodeBuffer = '';
        return { isBarcodeScanned: true, scannedBarcode: barcode };
      }
      this.barcodeBuffer = '';
      return { isBarcodeScanned: false };
    }

    // If typing too slowly (> 150ms gap), reset buffer (assumed manual keyboard entry, not laser scan)
    if (interval > 150 && this.barcodeBuffer.length > 0) {
      this.barcodeBuffer = '';
    }

    // Append printable character
    if (key.length === 1) {
      this.barcodeBuffer += key;
    }

    return { isBarcodeScanned: false };
  }

  public applyLineDiscount(
    item: PosCartItem,
    discountMinor: bigint,
  ): PosCartItem {
    if (discountMinor < 0n || discountMinor > item.unitPriceMinor) {
      throw new Error('Line discount cannot exceed unit price or be negative');
    }
    return {
      ...item,
      discountMinor,
    };
  }

  public renderFastTileGridHtml(currency = 'USD'): string {
    const tokens = themeTokens.dark;
    const tiles = this.getFastTiles();

    const tilesHtml = tiles
      .map((tile) => {
        const bg = tile.colorHex ?? tokens.card;
        const hotkeyLabel = tile.hotkey ? `<span class="tile-hotkey" style="position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.6); padding: 1px 5px; border-radius: 3px; font-size: 0.7rem; font-family: var(--stokrova-font-mono);">${tile.hotkey}</span>` : '';

        return `
          <button class="pos-fast-tile" data-sku="${tile.sku}" style="position: relative; background: ${bg}; border: 1px solid ${tokens.borderStrong}; border-radius: 8px; padding: 12px; text-align: left; cursor: pointer; color: ${tokens.textPrimary}; display: flex; flex-direction: column; justify-content: space-between; min-height: 90px;">
            ${hotkeyLabel}
            <div style="font-weight: 600; font-size: 0.85rem; line-height: 1.2;">${tile.name}</div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px;">
              <span style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">${tile.sku}</span>
              <span style="font-weight: 700; color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono);">${formatCurrencyMinor(tile.unitPriceMinor, currency)}</span>
            </div>
          </button>
        `.trim();
      })
      .join('\n');

    return `
      <div class="pos-tile-matrix" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; padding: 10px;">
        ${tilesHtml}
      </div>
    `.trim();
  }
}
