/**
 * STOKROVA High-Speed POS Desktop Terminal — Application Shell Architecture
 * Designed for rapid barcode scanning, touch-screen interactions,
 * split tender payments, till session reconciliation, and peripheral monitoring.
 */

import {
  type PosCartItem,
  type PosCartSummary,
  type PosTenderSplit,
  type PosPaymentCalculation,
  type PosHardwareStatus,
  calculatePosCartSummary,
  calculatePosPaymentState,
  formatCurrencyMinor,
  POS_QUICK_KEYS,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

export interface PosSessionConfig {
  tillSessionId: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  branchName: string;
  currencyCode?: string;
}

export class PosDesktopShell {
  private config: PosSessionConfig;
  private cartItems: PosCartItem[] = [];
  private tenders: PosTenderSplit[] = [];
  private heldTickets = new Map<string, { items: PosCartItem[]; note?: string; heldAt: string }>();
  private hardware: PosHardwareStatus = {
    printerConnected: true,
    scaleWeightGrams: 0,
    drawerOpen: false,
    scannerReady: true,
    lastHeartbeatIso: new Date().toISOString(),
  };

  constructor(config: PosSessionConfig) {
    this.config = { currencyCode: 'USD', ...config };
  }

  // ==========================================
  // Cart & Line Operations
  // ==========================================

  public addItem(item: Omit<PosCartItem, 'id'>): PosCartItem {
    // If SKU already in cart, increment quantity
    const existing = this.cartItems.find((i) => i.sku === item.sku);
    if (existing) {
      existing.quantity += item.quantity;
      return existing;
    }

    const newItem: PosCartItem = {
      id: `line_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...item,
    };
    this.cartItems.push(newItem);
    return newItem;
  }

  public updateQuantity(lineId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(lineId);
      return;
    }
    const item = this.cartItems.find((i) => i.id === lineId);
    if (item) {
      item.quantity = quantity;
    }
  }

  public removeItem(lineId: string): void {
    this.cartItems = this.cartItems.filter((i) => i.id !== lineId);
  }

  public clearCart(): void {
    this.cartItems = [];
    this.tenders = [];
  }

  public getCartItems(): PosCartItem[] {
    return [...this.cartItems];
  }

  public getCartSummary(): PosCartSummary {
    return calculatePosCartSummary(this.cartItems);
  }

  // ==========================================
  // Tender & Split Payment Processing
  // ==========================================

  public addTender(tender: PosTenderSplit): PosPaymentCalculation {
    if (tender.amountMinor <= 0n) {
      throw new Error('Tender amount must be greater than zero');
    }
    this.tenders.push({ ...tender });
    return this.getPaymentCalculation();
  }

  public clearTenders(): void {
    this.tenders = [];
  }

  public getTenders(): PosTenderSplit[] {
    return [...this.tenders];
  }

  public getPaymentCalculation(): PosPaymentCalculation {
    const summary = this.getCartSummary();
    return calculatePosPaymentState(summary.grandTotalMinor, this.tenders);
  }

  // ==========================================
  // Hold & Recall Tickets
  // ==========================================

  public holdActiveTicket(note?: string): string {
    if (this.cartItems.length === 0) {
      throw new Error('Cannot hold an empty cart');
    }
    const ticketId = `hold_${Date.now()}`;
    this.heldTickets.set(ticketId, {
      items: [...this.cartItems],
      note,
      heldAt: new Date().toISOString(),
    });
    this.clearCart();
    return ticketId;
  }

  public recallTicket(ticketId: string): void {
    const held = this.heldTickets.get(ticketId);
    if (!held) {
      throw new Error(`Held ticket ${ticketId} not found`);
    }
    this.cartItems = [...held.items];
    this.tenders = [];
    this.heldTickets.delete(ticketId);
  }

  public getHeldTicketsCount(): number {
    return this.heldTickets.size;
  }

  // ==========================================
  // Checkout Finalization
  // ==========================================

  public completeCheckout(): {
    transactionId: string;
    tillSessionId: string;
    cashierId: string;
    cashierName: string;
    summary: PosCartSummary;
    tenders: PosTenderSplit[];
    changeDueMinor: bigint;
  } {
    if (this.cartItems.length === 0) {
      throw new Error('Cannot checkout empty ticket');
    }
    const payment = this.getPaymentCalculation();
    if (!payment.isFullySettled) {
      throw new Error(`Insufficient tender: balance due of ${formatCurrencyMinor(payment.remainingDueMinor, this.config.currencyCode)}`);
    }

    const receipt = {
      transactionId: `pos_tx_${Date.now()}`,
      tillSessionId: this.config.tillSessionId,
      cashierId: this.config.cashierId,
      cashierName: this.config.cashierName,
      summary: this.getCartSummary(),
      tenders: [...this.tenders],
      changeDueMinor: payment.changeDueMinor,
    };

    this.clearCart();
    return receipt;
  }


  // ==========================================
  // Hardware Telemetry
  // ==========================================

  public getHardwareStatus(): PosHardwareStatus {
    return { ...this.hardware };
  }

  public updateHardwareStatus(update: Partial<PosHardwareStatus>): void {
    this.hardware = { ...this.hardware, ...update, lastHeartbeatIso: new Date().toISOString() };
  }

  // ==========================================
  // Render Terminal HTML Layout
  // ==========================================

  public renderPosShellHtml(): string {
    const tokens = themeTokens.dark;
    const summary = this.getCartSummary();
    const grandTotalStr = formatCurrencyMinor(summary.grandTotalMinor, this.config.currencyCode);

    const quickKeysHtml = POS_QUICK_KEYS.map(
      (k) => `<button class="pos-key"><span class="k-label">${k.label}</span><kbd>${k.key}</kbd></button>`,
    ).join(' ');

    return `
      <div class="stokrova-pos-terminal" style="background: ${tokens.background}; color: ${tokens.textPrimary};">
        <header class="pos-header" style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border};">
          <div class="pos-session-badge">
            <strong>Register:</strong> ${this.config.registerId} | 
            <strong>Cashier:</strong> ${this.config.cashierName} | 
            <strong>Branch:</strong> ${this.config.branchName}
          </div>
          <div class="hardware-indicators">
            <span class="hw-chip ${this.hardware.printerConnected ? 'online' : 'offline'}">🖨️ Printer</span>
            <span class="hw-chip ${this.hardware.scannerReady ? 'online' : 'offline'}">📷 Scanner</span>
            <span class="hw-chip">${this.hardware.scaleWeightGrams}g Scale</span>
          </div>
        </header>

        <main class="pos-body">
          <section class="pos-left-catalog" style="border-right: 1px solid ${tokens.border};">
            <div class="barcode-input-container">
              <input type="text" placeholder="Scan barcode or enter SKU (F1)..." autofocus />
            </div>
            <div class="quick-category-tabs">
              <span class="tab active">Top Sellers</span>
              <span class="tab">Beverages</span>
              <span class="tab">Grocery</span>
              <span class="tab">Hardware</span>
            </div>
            <div class="product-matrix-grid">
              <!-- Fast moving item tiles -->
            </div>
          </section>

          <section class="pos-right-ticket">
            <div class="ticket-header" style="border-bottom: 1px solid ${tokens.border};">
              <h3>Active Sale (${summary.itemCount} items)</h3>
              <span class="held-count" style="color: ${tokens.primary};">Held: ${this.heldTickets.size}</span>
            </div>
            <div class="ticket-lines-viewport">
              <!-- Cart Line Items -->
            </div>
            <div class="ticket-summary-panel" style="background: ${tokens.surface}; border-top: 1px solid ${tokens.border};">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>${formatCurrencyMinor(summary.subtotalMinor, this.config.currencyCode)}</span>
              </div>
              <div class="summary-row grand-total" style="color: ${brandColors.gold[400]}; font-size: 1.5rem; font-weight: 700;">
                <span>Total Due:</span>
                <span>${grandTotalStr}</span>
              </div>
            </div>
            <footer class="pos-quick-keypad" style="border-top: 1px solid ${tokens.border};">
              ${quickKeysHtml}
            </footer>
          </section>
        </main>
      </div>
    `.trim();
  }
}

export interface DesktopUserSession {
  userId: string;
  userName: string;
  userRoleCodes: string[];
  tenantName: string;
  companyName: string;
  branchName: string;
  companyLogoUrl?: string;
  primaryColor?: string;
}

/**
 * Renders adaptive desktop shell wrapper tailored to the authenticated role:
 * - Cashiers launch into High-Speed Checkout Till
 * - Accountants launch into Finance & General Ledger
 * - Managers / Owners launch into Branch Management & Operational KPIs
 */
export function renderAdaptiveDesktopLauncherHtml(
  session: DesktopUserSession,
  posShellHtml?: string,
): string {
  const isCashier = session.userRoleCodes.includes('CASHIER');
  const isAccountant = session.userRoleCodes.some(
    (r) => r.includes('ACCOUNTANT') || r.includes('CONTROLLER'),
  );
  const isManager =
    session.userRoleCodes.includes('BRANCH_MANAGER') ||
    session.userRoleCodes.includes('BUSINESS_OWNER');

  const primary = session.primaryColor || brandColors.gold[500];
  const companyName = session.companyName || session.tenantName;

  if (isCashier && posShellHtml) {
    return posShellHtml;
  }

  const workspaceTitle = isAccountant
    ? 'Finance & General Ledger Workspace'
    : isManager
    ? 'Branch Management & Operations Console'
    : 'Enterprise Business Operating Workspace';

  const logoHtml = session.companyLogoUrl
    ? `<img src="${session.companyLogoUrl}" alt="${companyName}" style="height: 28px; max-width: 140px; object-fit: contain; margin-right: 10px;" />`
    : `<span style="color: ${primary}; font-size: 1.2rem; margin-right: 8px;">◆</span>`;

  return `
    <div class="stokrova-native-desktop-window" style="background: #161B1E; color: #F8FAFC; min-height: 100vh; font-family: 'Inter', sans-serif;">
      <header class="desktop-titlebar" style="background: #1E2428; border-bottom: 1px solid #333D46; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          ${logoHtml}
          <span style="font-weight: 700; font-size: 1rem; color: #F8FAFC;">${companyName}</span>
          <span style="border: 1px solid #414F5A; color: #ACB8C3; font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px; margin-left: 10px;">${session.branchName}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; font-size: 0.8125rem; color: #ACB8C3;">
          <span>👤 ${session.userName} (${session.userRoleCodes.join(', ')})</span>
          <span style="color: #16A34A; font-weight: 600;">● Desktop Sync Online</span>
        </div>
      </header>

      <main style="padding: 24px 30px;">
        <div style="background: #242A2F; border: 1px solid #333D46; border-radius: 8px; padding: 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h2 style="margin: 0 0 6px 0; font-size: 1.25rem; color: #F8FAFC;">Welcome to your ${workspaceTitle}</h2>
            <p style="margin: 0; font-size: 0.875rem; color: #ACB8C3;">Connected locally with offline resilience and secure device encryption.</p>
          </div>
          <div style="background: #1E2428; border: 1px solid #414F5A; padding: 8px 14px; border-radius: 6px; font-size: 0.8125rem; color: ${primary}; font-weight: 600;">
            Status: Active Shift
          </div>
        </div>
        <div class="desktop-workspace-viewport">
          <!-- Desktop Workspace Modules & Financial Ledgers -->
        </div>
      </main>
    </div>
  `.trim();
}

export * from './register-view.js';
export * from './split-tender-modal.js';
export * from './reconciliation-modal.js';
export * from './held-tickets-modal.js';
export * from './receipt-engine.js';

