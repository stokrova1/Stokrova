/**
 * STOKROVA Mobile — Camera / Laser Barcode Viewfinder Overlay
 * Viewfinder reticle with targeting brackets, torch toggle,
 * symbology classification, and audio/haptic feedback triggers.
 */

import {
  type MobileScanFeedback,
  getBarcodeScanFeedback,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

export type BarcodeSymbology =
  | 'UPC_A'
  | 'EAN_13'
  | 'CODE_128'
  | 'GS1_128'
  | 'DATA_MATRIX'
  | 'QR_CODE'
  | 'UNKNOWN';

export interface ViewfinderScanResult {
  rawBarcode: string;
  symbology: BarcodeSymbology;
  timestampIso: string;
  feedback: MobileScanFeedback;
}

export class MobileViewfinderViewModel {
  private torchEnabled = false;
  private continuousScanMode = false;
  private scanHistory: ViewfinderScanResult[] = [];

  constructor(torchDefault = false, continuous = false) {
    this.torchEnabled = torchDefault;
    this.continuousScanMode = continuous;
  }

  public toggleTorch(): boolean {
    this.torchEnabled = !this.torchEnabled;
    return this.torchEnabled;
  }

  public isTorchOn(): boolean {
    return this.torchEnabled;
  }

  public setContinuousScanMode(enabled: boolean): void {
    this.continuousScanMode = enabled;
  }

  public isContinuousScan(): boolean {
    return this.continuousScanMode;
  }

  /**
   * Infers symbology type from barcode character patterns.
   */
  public detectSymbology(code: string): BarcodeSymbology {
    const clean = code.trim();
    if (/^\d{12}$/.test(clean)) return 'UPC_A';
    if (/^\d{13}$/.test(clean)) return 'EAN_13';
    if (clean.startsWith('(01)') || clean.startsWith('(00)') || clean.includes('~217')) return 'GS1_128';
    if (/^[A-Za-z0-9\-\.\ \$\/\+\%]{3,}$/.test(clean) && clean.length <= 30) return 'CODE_128';
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('STOKROVA:')) return 'QR_CODE';
    if (clean.length > 30) return 'DATA_MATRIX';
    return 'UNKNOWN';
  }

  public recordScan(
    rawCode: string,
    validationStatus: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS',
  ): ViewfinderScanResult {
    const symbology = this.detectSymbology(rawCode);
    const feedback = getBarcodeScanFeedback(validationStatus);

    const result: ViewfinderScanResult = {
      rawBarcode: rawCode.trim(),
      symbology,
      timestampIso: new Date().toISOString(),
      feedback,
    };

    this.scanHistory.unshift(result);
    return result;
  }

  public getScanHistory(): ViewfinderScanResult[] {
    return [...this.scanHistory];
  }

  public clearHistory(): void {
    this.scanHistory = [];
  }

  public renderViewfinderOverlayHtml(): string {
    const tokens = themeTokens.dark;
    const lastScan = this.scanHistory[0];
    const borderCol = lastScan ? lastScan.feedback.visualBorderColor : tokens.borderStrong;

    return `
      <div class="mobile-viewfinder" style="position: relative; width: 100%; height: 280px; background: #000; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 16px;">
        
        <div class="viewfinder-top-bar" style="display: flex; justify-content: space-between; align-items: center; z-index: 10;">
          <button class="torch-toggle-btn" style="background: ${this.torchEnabled ? brandColors.gold[500] : 'rgba(255,255,255,0.2)'}; color: ${this.torchEnabled ? '#000' : '#fff'}; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
            ⚡ Torch: ${this.torchEnabled ? 'ON' : 'OFF'}
          </button>
          <span class="symbology-indicator" style="color: #fff; font-size: 0.75rem; font-family: var(--stokrova-font-mono); background: rgba(0,0,0,0.6); padding: 3px 8px; border-radius: 4px;">
            ${lastScan ? `${lastScan.symbology} (${lastScan.feedback.type})` : 'READY'}
          </span>
        </div>

        <div class="reticle-box" style="position: absolute; inset: 40px; border: 2px dashed ${borderCol}; border-radius: 10px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div class="laser-beam" style="width: 90%; height: 2px; background: #EF4444; box-shadow: 0 0 8px #EF4444;"></div>
        </div>

        <div class="viewfinder-bottom-prompt" style="text-align: center; color: rgba(255,255,255,0.7); font-size: 0.75rem; z-index: 10;">
          ${lastScan ? `Last Scanned: ${lastScan.rawBarcode}` : 'Center barcode in viewfinder reticle'}
        </div>

      </div>
    `.trim();
  }
}
