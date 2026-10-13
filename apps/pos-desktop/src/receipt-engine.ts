/**
 * STOKROVA POS Desktop — ESC/POS Thermal Receipt Engine & Visual Preview
 * 80mm / 42-column fixed width thermal receipt generation, monospace formatting,
 * binary ESC/POS hardware print command streams, and cash drawer kick pulses.
 */

import {
  type PosCartItem,
  type PosTenderSplit,
  formatCurrencyMinor,
} from '@stokrova/ui';

export interface ReceiptHeader {
  storeName: string;
  storeAddress: string;
  taxRegistrationNumber: string;
  phone: string;
  registerId: string;
  cashierName: string;
  receiptNumber: string;
  timestampIso: string;
}

export interface ReceiptData {
  header: ReceiptHeader;
  items: PosCartItem[];
  subtotalMinor: bigint;
  taxMinor: bigint;
  grandTotalMinor: bigint;
  tenders: PosTenderSplit[];
  changeDueMinor: bigint;
  currencyCode?: string;
  footerNotes?: string[];
}

export interface PackingSlipHeader {
  storeName: string;
  storeAddress: string;
  ticketNumber: string;
  orderReference?: string;
  stationName: string;
  packerName: string;
  timestampIso: string;
}

export interface PackingSlipData {
  header: PackingSlipHeader;
  items: PosCartItem[];
  totalUnits: number;
  notes?: string[];
}


function encodeUtf8(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

export class PosReceiptEngine {
  private readonly charsPerLine = 42; // Standard 80mm thermal receipt font A width

  /**
   * Pads string to fixed width with left and right alignment.
   * e.g. "Item Name" ............ "$12.00"
   */
  public formatJustifiedLine(left: string, right: string, fillChar = ' '): string {
    const spaceAvailable = this.charsPerLine - right.length;
    if (spaceAvailable <= 0) {
      return (left.slice(0, this.charsPerLine - 10) + ' ' + right).slice(0, this.charsPerLine);
    }
    const truncatedLeft = left.slice(0, spaceAvailable - 1);
    const padding = fillChar.repeat(Math.max(1, this.charsPerLine - truncatedLeft.length - right.length));
    return truncatedLeft + padding + right;
  }

  public centerText(text: string): string {
    const trimmed = text.slice(0, this.charsPerLine);
    const leftPad = Math.max(0, Math.floor((this.charsPerLine - trimmed.length) / 2));
    return ' '.repeat(leftPad) + trimmed;
  }

  public renderMonospaceText(data: ReceiptData): string {
    const currency = data.currencyCode ?? 'USD';
    const lines: string[] = [];
    const divider = '-'.repeat(this.charsPerLine);
    const doubleDivider = '='.repeat(this.charsPerLine);

    // Header
    lines.push(this.centerText(data.header.storeName));
    lines.push(this.centerText(data.header.storeAddress));
    lines.push(this.centerText(`TEL: ${data.header.phone}`));
    lines.push(this.centerText(`TAX ID: ${data.header.taxRegistrationNumber}`));
    lines.push(divider);

    lines.push(this.formatJustifiedLine(`RECEIPT: ${data.header.receiptNumber}`, `REG: ${data.header.registerId}`));
    lines.push(this.formatJustifiedLine(`DATE: ${data.header.timestampIso.split('T')[0]}`, `CASHIER: ${data.header.cashierName}`));
    lines.push(divider);

    // Item Lines
    lines.push(this.formatJustifiedLine('QTY  DESCRIPTION', 'AMOUNT'));
    lines.push(divider);

    for (const item of data.items) {
      const lineTotal = (item.unitPriceMinor - item.discountMinor) * BigInt(item.quantity);
      const leftPart = `${item.quantity}x ${item.title}`;
      const rightPart = formatCurrencyMinor(lineTotal, currency);
      lines.push(this.formatJustifiedLine(leftPart, rightPart));
      if (item.discountMinor > 0n) {
        lines.push(this.formatJustifiedLine(`  Disc: -${formatCurrencyMinor(item.discountMinor * BigInt(item.quantity), currency)}`, ''));
      }
    }

    lines.push(divider);

    // Totals
    lines.push(this.formatJustifiedLine('SUBTOTAL:', formatCurrencyMinor(data.subtotalMinor, currency)));
    lines.push(this.formatJustifiedLine('TAX / VAT:', formatCurrencyMinor(data.taxMinor, currency)));
    lines.push(doubleDivider);
    lines.push(this.formatJustifiedLine('TOTAL DUE:', formatCurrencyMinor(data.grandTotalMinor, currency)));
    lines.push(doubleDivider);

    // Tenders
    for (const t of data.tenders) {
      lines.push(this.formatJustifiedLine(`PAID (${t.tenderType}):`, formatCurrencyMinor(t.amountMinor, currency)));
    }
    lines.push(this.formatJustifiedLine('CHANGE DUE:', formatCurrencyMinor(data.changeDueMinor, currency)));
    lines.push(divider);

    // Footer
    lines.push(this.centerText('THANK YOU FOR YOUR PATRONAGE!'));
    if (data.footerNotes && data.footerNotes.length > 0) {
      for (const note of data.footerNotes) {
        lines.push(this.centerText(note));
      }
    } else {
      lines.push(this.centerText(`THANK YOU FOR SHOPPING AT ${data.header.storeName.toUpperCase()}`));
    }

    return lines.join('\n');
  }

  /**
   * Generates standard ESC/POS binary command buffer (Uint8Array)
   * Suitable for direct socket / USB / Bluetooth transmission to thermal printers.
   */
  public generateEscPosBinary(data: ReceiptData, triggerDrawer = true): Uint8Array {
    const text = this.renderMonospaceText(data);
    const textBytes = encodeUtf8(text + '\n\n\n\n');

    const commands: number[] = [];

    // ESC @: Initialize printer
    commands.push(0x1b, 0x40);

    // Optional Cash Drawer Kick Pulse (DLE DC4)
    if (triggerDrawer) {
      commands.push(0x10, 0x14, 0x01, 0x01, 0x05);
    }

    // Merge ESC/POS init + encoded body
    const headerBytes = new Uint8Array(commands);
    // GS V 65 0: Full cut with paper feed
    const cutBytes = new Uint8Array([0x1d, 0x56, 0x41, 0x00]);

    const totalLen = headerBytes.length + textBytes.length + cutBytes.length;
    const finalBuffer = new Uint8Array(totalLen);

    finalBuffer.set(headerBytes, 0);
    finalBuffer.set(textBytes, headerBytes.length);
    finalBuffer.set(cutBytes, headerBytes.length + textBytes.length);

    return finalBuffer;
  }

  public renderVisualReceiptHtml(data: ReceiptData): string {
    const text = this.renderMonospaceText(data);

    return `
      <div class="thermal-receipt-preview" style="background: #FFFDF9; color: #111; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.35; padding: 24px 20px; width: 340px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border-radius: 4px; border: 1px solid #E2E8F0; margin: 0 auto; white-space: pre; overflow-x: auto;">
${text}
      </div>
    `.trim();
  }

  public renderPackingSlipText(data: PackingSlipData): string {
    const lines: string[] = [];
    const divider = '-'.repeat(this.charsPerLine);
    const doubleDivider = '='.repeat(this.charsPerLine);

    lines.push(this.centerText(data.header.storeName));
    lines.push(this.centerText(data.header.storeAddress));
    lines.push(divider);
    lines.push(this.centerText('GOODS PACKING SLIP & COLLECTION'));
    lines.push(divider);
    lines.push(this.formatJustifiedLine(`TICKET: ${data.header.ticketNumber}`, `STN: ${data.header.stationName}`));
    if (data.header.orderReference) {
      lines.push(this.formatJustifiedLine(`REF: ${data.header.orderReference}`, `PACKER: ${data.header.packerName}`));
    } else {
      lines.push(this.formatJustifiedLine(`PACKER: ${data.header.packerName}`, ''));
    }
    lines.push(this.formatJustifiedLine(`DATE: ${data.header.timestampIso.split('T')[0]}`, `UNITS: ${data.totalUnits}`));

    lines.push(divider);
    lines.push(this.formatJustifiedLine('QTY  DESCRIPTION', 'STATUS'));
    lines.push(divider);

    for (const item of data.items) {
      const left = `${item.quantity}x ${item.title}`;
      lines.push(this.formatJustifiedLine(left, '[PACKED]'));
    }

    lines.push(doubleDivider);
    lines.push(this.centerText('STATUS: VERIFIED & PACKED'));
    lines.push(doubleDivider);
    if (data.notes && data.notes.length > 0) {
      for (const note of data.notes) {
        lines.push(this.centerText(note));
      }
    } else {
      lines.push(this.centerText('PRESENT WITH CASHIER PAYMENT RECEIPT'));
      lines.push(this.centerText('FOR FINAL EXIT RELEASE'));
    }

    return lines.join('\n');
  }

  public renderVisualPackingSlipHtml(data: PackingSlipData): string {
    const text = this.renderPackingSlipText(data);

    return `
      <div class="thermal-packing-slip-preview" style="background: #FFFDF9; color: #111; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.35; padding: 24px 20px; width: 340px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border-radius: 4px; border: 1px dashed #64748B; margin: 0 auto; white-space: pre; overflow-x: auto;">
${text}
      </div>
    `.trim();
  }
}

