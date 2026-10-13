import { describe, it, expect } from 'vitest';
import { PosDesktopShell } from '../src/index.js';

describe('Phase 23 @stokrova/pos-desktop — High-Speed Terminal Suite', () => {
  const baseConfig = {
    tillSessionId: 'session_reg1_001',
    registerId: 'REG-01',
    cashierId: 'user_cashier_7',
    cashierName: 'Alex Vance',
    branchName: 'Main Retail Store',
    currencyCode: 'USD',
  };

  it('initializes session and manages cart items accurately', () => {
    const pos = new PosDesktopShell(baseConfig);
    expect(pos.getCartItems()).toHaveLength(0);

    const line = pos.addItem({
      variantId: 'var_prod_1',
      sku: 'SKU-COFFEE-01',
      title: 'Espresso Roast 1kg',
      unitPriceMinor: 2500n, // $25.00
      quantity: 2,
      discountMinor: 0n,
      taxMinor: 250n, // $2.50 tax
    });

    expect(line.sku).toBe('SKU-COFFEE-01');
    expect(pos.getCartItems()).toHaveLength(1);

    const summary = pos.getCartSummary();
    expect(summary.subtotalMinor).toBe(5000n);
    expect(summary.grandTotalMinor).toBe(5250n); // $52.50
  });

  it('increments quantity when duplicate SKU is scanned', () => {
    const pos = new PosDesktopShell(baseConfig);
    pos.addItem({
      variantId: 'v1',
      sku: 'SKU-MILK',
      title: 'Fresh Milk 1L',
      unitPriceMinor: 300n,
      quantity: 1,
      discountMinor: 0n,
      taxMinor: 0n,
    });

    pos.addItem({
      variantId: 'v1',
      sku: 'SKU-MILK',
      title: 'Fresh Milk 1L',
      unitPriceMinor: 300n,
      quantity: 2,
      discountMinor: 0n,
      taxMinor: 0n,
    });

    const items = pos.getCartItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(3);
  });

  it('handles split tender payment with cash change return', () => {
    const pos = new PosDesktopShell(baseConfig);
    pos.addItem({
      variantId: 'v1',
      sku: 'SKU-EXPENSIVE',
      title: 'Deluxe Tool Kit',
      unitPriceMinor: 10000n, // $100.00
      quantity: 1,
      discountMinor: 1000n,  // $10.00 discount
      taxMinor: 500n,        // $5.00 tax
    }); // Total = 9500n ($95.00)

    // Tender 1: $50.00 Card
    pos.addTender({ tenderType: 'CARD', amountMinor: 5000n });
    let calc = pos.getPaymentCalculation();
    expect(calc.isFullySettled).toBe(false);
    expect(calc.remainingDueMinor).toBe(4500n);

    // Tender 2: $50.00 Cash (total $100.00 tendered for $95.00 total)
    pos.addTender({ tenderType: 'CASH', amountMinor: 5000n });
    calc = pos.getPaymentCalculation();
    expect(calc.isFullySettled).toBe(true);
    expect(calc.remainingDueMinor).toBe(0n);
    expect(calc.changeDueMinor).toBe(500n); // $5.00 change due
  });

  it('holds and recalls tickets safely', () => {
    const pos = new PosDesktopShell(baseConfig);
    pos.addItem({
      variantId: 'v1',
      sku: 'SKU-HOLD-ME',
      title: 'Holding Item',
      unitPriceMinor: 1200n,
      quantity: 1,
      discountMinor: 0n,
      taxMinor: 0n,
    });

    const holdId = pos.holdActiveTicket('Customer fetching wallet');
    expect(pos.getHeldTicketsCount()).toBe(1);
    expect(pos.getCartItems()).toHaveLength(0);

    pos.recallTicket(holdId);
    expect(pos.getHeldTicketsCount()).toBe(0);
    expect(pos.getCartItems()).toHaveLength(1);
    expect(pos.getCartItems()[0]?.sku).toBe('SKU-HOLD-ME');
  });

  it('completes checkout and returns receipt payload', () => {
    const pos = new PosDesktopShell(baseConfig);
    pos.addItem({
      variantId: 'v1',
      sku: 'SKU-QUICK',
      title: 'Quick Sale',
      unitPriceMinor: 1500n,
      quantity: 1,
      discountMinor: 0n,
      taxMinor: 0n,
    });

    pos.addTender({ tenderType: 'CASH', amountMinor: 2000n });

    const checkout = pos.completeCheckout();
    expect(checkout.transactionId).toBeDefined();
    expect(checkout.changeDueMinor).toBe(500n); // $5.00 change
    expect(pos.getCartItems()).toHaveLength(0); // Cart cleared
  });

  it('renders POS terminal HTML layout with hardware indicators and quick keys', () => {
    const pos = new PosDesktopShell(baseConfig);
    const html = pos.renderPosShellHtml();

    expect(html).toContain('stokrova-pos-terminal');
    expect(html).toContain('REG-01');
    expect(html).toContain('Alex Vance');
    expect(html).toContain('🖨️ Printer');
    expect(html).toContain('Total Due:');
    expect(html).toContain('F12');
  });
});
