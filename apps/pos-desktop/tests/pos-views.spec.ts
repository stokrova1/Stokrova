import { describe, it, expect } from 'vitest';
import {
  PosRegisterViewModel,
  PosSplitTenderModal,
  PosReconciliationModal,
  PosHeldTicketsModal,
  PosReceiptEngine,
} from '../src/index.js';

describe('Phase 26B @stokrova/pos-desktop — Interactive POS Terminal Suite', () => {
  describe('PosRegisterViewModel', () => {
    it('manages fast-touch item matrix tiles and category filtering', () => {
      const vm = new PosRegisterViewModel([
        {
          sku: 'COFFEE-MED',
          name: 'House Blend Drip Coffee',
          category: 'Beverages',
          unitPriceMinor: 350n, // $3.50
          taxRateBps: 800,
          barcode: '7110001',
          hotkey: 'F1',
        },
        {
          sku: 'CROISSANT-BUTTER',
          name: 'Butter Croissant',
          category: 'Bakery',
          unitPriceMinor: 400n, // $4.00
          taxRateBps: 800,
          barcode: '7110002',
          hotkey: 'F2',
        },
      ]);

      expect(vm.getCategories()).toContain('Beverages');
      expect(vm.getCategories()).toContain('Bakery');
      expect(vm.getFastTiles('Beverages')).toHaveLength(1);

      const html = vm.renderFastTileGridHtml();
      expect(html).toContain('House Blend Drip Coffee');
      expect(html).toContain('$3.50');
      expect(html).toContain('F1');
    });

    it('processes hardware barcode scanner high-speed keystroke bursts', () => {
      const vm = new PosRegisterViewModel();
      let t = 1000;

      // Simulate laser scanner spitting digits rapidly (10ms apart)
      expect(vm.handleKeyInput('7', (t += 10)).isBarcodeScanned).toBe(false);
      expect(vm.handleKeyInput('1', (t += 10)).isBarcodeScanned).toBe(false);
      expect(vm.handleKeyInput('1', (t += 10)).isBarcodeScanned).toBe(false);
      expect(vm.handleKeyInput('0', (t += 10)).isBarcodeScanned).toBe(false);
      expect(vm.handleKeyInput('0', (t += 10)).isBarcodeScanned).toBe(false);
      expect(vm.handleKeyInput('1', (t += 10)).isBarcodeScanned).toBe(false);

      // Trailing Enter key from hardware scanner
      const enterResult = vm.handleKeyInput('Enter', (t += 10));
      expect(enterResult.isBarcodeScanned).toBe(true);
      expect(enterResult.scannedBarcode).toBe('711001');
    });

    it('enforces line discount boundaries', () => {
      const vm = new PosRegisterViewModel();
      const item = {
        id: 'l_1',
        variantId: 'var_shirt_1',
        sku: 'SHIRT',
        barcode: '123',
        title: 'T-Shirt',
        quantity: 1,
        unitPriceMinor: 2500n,
        discountMinor: 0n,
        taxMinor: 250n,
      };

      const discounted = vm.applyLineDiscount(item, 500n);
      expect(discounted.discountMinor).toBe(500n);

      // Discount exceeding unit price must throw
      expect(() => vm.applyLineDiscount(item, 3000n)).toThrow(/cannot exceed unit price/);
    });
  });

  describe('PosSplitTenderModal', () => {
    it('handles split tender payments across Card and Cash with change computation', () => {
      // Grand total $65.00
      const modal = new PosSplitTenderModal(6500n, 'USD');
      modal.open();
      expect(modal.isModalOpen()).toBe(true);

      // Tender 1: $40.00 via Card
      const step1 = modal.addTender('CARD', 4000n, 'AUTH_9988');
      expect(step1.remainingDueMinor).toBe(2500n);
      expect(step1.isFullySettled).toBe(false);

      // Tender 2: $30.00 via Cash (overpaying remaining $25.00)
      const step2 = modal.addTender('CASH', 3000n);
      expect(step2.isFullySettled).toBe(true);
      expect(step2.changeDueMinor).toBe(500n); // $5.00 change

      // Quick cash presets
      const presets = modal.getQuickCashPresets();
      expect(presets.length).toBeGreaterThan(0);

      // Render Modal HTML
      const html = modal.renderModalHtml();
      expect(html).toContain('AUTH_9988');
      expect(html).toContain('$5.00');
      expect(html).toContain('Finalize Sale');
    });

    it('strictly forbids non-cash tender overpayment', () => {
      const modal = new PosSplitTenderModal(5000n, 'USD'); // $50.00
      expect(() => modal.addTender('CARD', 6000n)).toThrow(/Non-cash tenders cannot exceed/);
    });
  });

  describe('PosReconciliationModal', () => {
    it('calculates register reconciliation with opening float, drops, and blind count variance', () => {
      const recon = new PosReconciliationModal('session_001', 'REG-01', 'cashier_alice', 'USD');

      // 1. Opening float $200.00
      recon.setOpeningFloat(20000n);
      expect(recon.getOpeningFloat()).toBe(20000n);

      // 2. Cash sales during day: $550.00
      recon.recordCashSale(55000n);

      // 3. Mid-day safe drop: $300.00
      recon.recordCashDrop(30000n, 'Afternoon safe drop');

      // Expected cash in drawer: 200 + 550 - 300 = $450.00 (45000n)

      // 4. Blind cash count:
      // 4 x $100 bill = $400.00
      // 2 x $20 bill = $40.00
      // 1 x $10 bill = $10.00
      // Total counted: $450.00 (Exact balance)
      recon.setDenominationCount(10000n, 4);
      recon.setDenominationCount(2000n, 2);
      recon.setDenominationCount(1000n, 1);

      expect(recon.getActualCountedTotalMinor()).toBe(45000n);
      const balancedResult = recon.calculateReconciliation();
      expect(balancedResult.expectedCashMinor).toBe(45000n);
      expect(balancedResult.varianceMinor).toBe(0n);
      expect(balancedResult.isBalanced).toBe(true);

      // Simulate a shortage: count 1 less $10 bill ($440.00 actual)
      recon.setDenominationCount(1000n, 0);
      const shortResult = recon.calculateReconciliation();
      expect(shortResult.actualCountedMinor).toBe(44000n);
      expect(shortResult.varianceMinor).toBe(-1000n); // -$10.00 short
      expect(shortResult.isBalanced).toBe(false);

      // Render blind count HTML
      const html = recon.renderBlindCountHtml();
      expect(html).toContain('Blind Cash Drawer Count');
      expect(html).toContain('REG-01');
      expect(html).toContain('$440.00');
    });
  });

  describe('PosHeldTicketsModal', () => {
    it('parks, recalls, and enforces maximum slot limits for held customer orders', () => {
      const held = new PosHeldTicketsModal('USD', 2); // Max 2 slots for test

      const cart1 = [
        {
          id: '1',
          variantId: 'v_a',
          sku: 'A',
          barcode: '1',
          title: 'Item A',
          quantity: 2,
          unitPriceMinor: 1000n,
          discountMinor: 0n,
          taxMinor: 0n,
        },
      ];
      const cart2 = [
        {
          id: '2',
          variantId: 'v_b',
          sku: 'B',
          barcode: '2',
          title: 'Item B',
          quantity: 1,
          unitPriceMinor: 2500n,
          discountMinor: 0n,
          taxMinor: 0n,
        },
      ];

      const ticket1 = held.parkTicket(cart1, 'John Doe', 'Waiting on wallet');
      expect(held.getHeldCount()).toBe(1);

      const ticket2 = held.parkTicket(cart2, 'Jane Smith');
      expect(held.getHeldCount()).toBe(2);

      // Exceeding limit throws
      expect(() => held.parkTicket(cart1)).toThrow(/Maximum held ticket limit reached/);

      // Recall ticket 1
      const recalled = held.recallTicket(ticket1.ticketId);
      expect(recalled.customerName).toBe('John Doe');
      expect(held.getHeldCount()).toBe(1);

      // HTML Render
      const html = held.renderHeldTicketsModalHtml();
      expect(html).toContain('Jane Smith');
      expect(html).toContain('$25.00');
    });
  });

  describe('PosReceiptEngine', () => {
    it('formats 80mm monospace receipts and produces binary ESC/POS command sequences', () => {
      const engine = new PosReceiptEngine();

      const receiptData = {
        header: {
          storeName: 'APEX FLAGSHIP STORE',
          storeAddress: '100 Piccadilly, London, UK',
          taxRegistrationNumber: 'GB-99887766',
          phone: '+44 20 7946 0912',
          registerId: 'REG-01',
          cashierName: 'Emma Watson',
          receiptNumber: 'RCP-2026-9041',
          timestampIso: '2026-10-12T14:30:00Z',
        },
        items: [
          {
            id: 'l1',
            variantId: 'v1',
            sku: 'COFFEE-MED',
            barcode: '111',
            title: 'House Blend Coffee',
            quantity: 2,
            unitPriceMinor: 350n,
            discountMinor: 50n,
            taxMinor: 60n,
          },
          {
            id: 'l2',
            variantId: 'v2',
            sku: 'CROISSANT',
            barcode: '222',
            title: 'Butter Croissant',
            quantity: 1,
            unitPriceMinor: 400n,
            discountMinor: 0n,
            taxMinor: 40n,
          },
        ],
        subtotalMinor: 1000n,
        taxMinor: 100n,
        grandTotalMinor: 1100n,
        tenders: [{ tenderType: 'CASH' as const, amountMinor: 2000n }],
        changeDueMinor: 900n,
        currencyCode: 'GBP',
      };

      // 1. Monospace text format
      const monoText = engine.renderMonospaceText(receiptData);
      expect(monoText).toContain('APEX FLAGSHIP STORE');
      expect(monoText).toContain('2x House Blend Coffee');
      expect(monoText).toContain('TOTAL DUE:');
      expect(monoText).toContain('CHANGE DUE:');

      // 2. Binary ESC/POS command generation
      const binary = engine.generateEscPosBinary(receiptData, true);
      expect(binary).toBeInstanceOf(Uint8Array);
      expect(binary.length).toBeGreaterThan(monoText.length);
      // ESC @ init bytes
      expect(binary[0]).toBe(0x1b);
      expect(binary[1]).toBe(0x40);

      // 3. HTML Visual Preview
      const html = engine.renderVisualReceiptHtml(receiptData);
      expect(html).toContain('thermal-receipt-preview');
      expect(html).toContain('RCP-2026-9041');
    });
  });
});
