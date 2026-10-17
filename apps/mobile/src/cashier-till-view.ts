/**
 * STOKROVA Mobile — Cashier Till & Floor Associate View Model
 * Uncluttered view model with dedicated sub-tabs:
 * - 'till': Active barcode scan & quick item grid
 * - 'cart': Current cart review & tender payment
 * - 'history': Shift transaction logs & held orders
 */

import { themeTokens, brandColors } from '@stokrova/ui';

export type CashierSubTab = 'till' | 'cart' | 'history';

export interface MobileCartItem {
  sku: string;
  productName: string;
  unitPriceMinor: number;
  quantity: number;
}

export interface MobileTenderResult {
  orderId: string;
  totalMinor: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  timestampIso: string;
}

export class MobileCashierTillViewModel {
  private activeSubTab: CashierSubTab = 'till';
  private cart: MobileCartItem[] = [];
  private orderHistory: MobileTenderResult[] = [];
  private terminalId: string;

  constructor(terminalId = 'TILL-M-01') {
    this.terminalId = terminalId;
  }

  public getTerminalId(): string {
    return this.terminalId;
  }


  public getActiveSubTab(): CashierSubTab {
    return this.activeSubTab;
  }

  public setSubTab(subTab: CashierSubTab): void {
    this.activeSubTab = subTab;
  }

  public getCart(): MobileCartItem[] {
    return [...this.cart];
  }

  public addToCart(item: Omit<MobileCartItem, 'quantity'>, quantity = 1): MobileCartItem {
    const existing = this.cart.find((i) => i.sku === item.sku);
    if (existing) {
      existing.quantity += quantity;
      return { ...existing };
    }
    const newItem: MobileCartItem = { ...item, quantity };
    this.cart.push(newItem);
    return { ...newItem };
  }

  public updateCartQuantity(sku: string, delta: number): void {
    const item = this.cart.find((i) => i.sku === sku);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter((i) => i.sku !== sku);
    }
  }

  public clearCart(): void {
    this.cart = [];
  }

  public getCartTotalMinor(): number {
    return this.cart.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
  }

  public getCartItemCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  public tenderSale(paymentMethod: 'CASH' | 'BANK_TRANSFER'): MobileTenderResult {
    const totalMinor = this.getCartTotalMinor();
    if (totalMinor <= 0) {
      throw new Error('Cannot tender an empty cart');
    }

    const receipt: MobileTenderResult = {
      orderId: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      totalMinor,
      paymentMethod,
      timestampIso: new Date().toISOString(),
    };

    this.orderHistory.unshift(receipt);
    this.clearCart();
    this.activeSubTab = 'till';
    return receipt;
  }

  public getOrderHistory(): MobileTenderResult[] {
    return [...this.orderHistory];
  }

  /**
   * Renders sub-tab navigation and the active focused view.
   * Prevents crowding by showing only one sub-panel at a time.
   */
  public renderHtml(): string {
    const tokens = themeTokens.dark;
    const gold = brandColors.gold[500] || '#BD9652';
    const totalCount = this.getCartItemCount();

    const tabsHtml = `
      <div class="stk-subtabs" style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid ${tokens.border}; padding-bottom: 0.5rem;">
        <button style="flex: 1; padding: 6px 10px; font-size: 0.8rem; border-radius: 6px; font-weight: 600; background: ${this.activeSubTab === 'till' ? gold : tokens.surface}; color: ${this.activeSubTab === 'till' ? '#161B1E' : tokens.textSecondary}; border: none; cursor: pointer;">
          Catalog
        </button>
        <button style="flex: 1; padding: 6px 10px; font-size: 0.8rem; border-radius: 6px; font-weight: 600; background: ${this.activeSubTab === 'cart' ? gold : tokens.surface}; color: ${this.activeSubTab === 'cart' ? '#161B1E' : tokens.textSecondary}; border: none; cursor: pointer;">
          Cart (${totalCount})
        </button>
        <button style="flex: 1; padding: 6px 10px; font-size: 0.8rem; border-radius: 6px; font-weight: 600; background: ${this.activeSubTab === 'history' ? gold : tokens.surface}; color: ${this.activeSubTab === 'history' ? '#161B1E' : tokens.textSecondary}; border: none; cursor: pointer;">
          History (${this.orderHistory.length})
        </button>
      </div>
    `.trim();

    return `
      <div class="mobile-cashier-till" style="background: ${tokens.background}; color: ${tokens.textPrimary};">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem 0.25rem;">
          <h2 style="font-size: 1.05rem; font-weight: 700; margin: 0;">Cashier Till</h2>
          <span style="font-size: 0.75rem; color: #4ADE80; font-family: monospace;">● Online</span>
        </header>
        ${tabsHtml}
      </div>
    `.trim();
  }
}
