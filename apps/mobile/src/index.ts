/**
 * STOKROVA Mobile Warehouse & Handheld Scanner — Application Shell Architecture
 * Ergonomic thumb-zone navigation, sensory audio/haptic feedback,
 * serpentine pick route sequencing, and offline outbox telemetry.
 */

import {
  type MobilePickTaskItem,
  type MobileScanFeedback,
  type MobileNavigationTab,
  MOBILE_NAVIGATION_TABS,
  getBarcodeScanFeedback,
  sortPickingTasksByRoute,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

export interface MobileShellConfig {
  warehouseId: string;
  warehouseName: string;
  operatorId: string;
  operatorName: string;
  initialTab?: 'scan' | 'pick' | 'receive' | 'audit';
}

export class MobileWarehouseShell {
  private config: MobileShellConfig;
  private currentTab: 'scan' | 'pick' | 'receive' | 'audit';
  private pickTasks: MobilePickTaskItem[] = [];
  private scanHistory: Array<{
    barcode: string;
    timestamp: string;
    status: 'SUCCESS' | 'WARNING' | 'ERROR';
  }> = [];
  private pendingOutboxMutationsCount = 0;

  constructor(config: MobileShellConfig) {
    this.config = config;
    this.currentTab = config.initialTab ?? 'scan';
  }

  // ==========================================
  // Tab & Navigation State
  // ==========================================

  public getActiveTab(): 'scan' | 'pick' | 'receive' | 'audit' {
    return this.currentTab;
  }

  public setActiveTab(tab: 'scan' | 'pick' | 'receive' | 'audit'): void {
    this.currentTab = tab;
  }

  public getNavigationTabs(): MobileNavigationTab[] {
    const incompletePicks = this.pickTasks.filter((t) => !t.isComplete).length;
    return MOBILE_NAVIGATION_TABS.map((tab: MobileNavigationTab) => {
      if (tab.id === 'pick') {
        return { ...tab, badgeCount: incompletePicks > 0 ? incompletePicks : undefined };
      }
      return tab;
    });
  }

  // ==========================================
  // Wave Picking Operations
  // ==========================================

  public loadPickWave(tasks: MobilePickTaskItem[]): void {
    this.pickTasks = tasks.map((t) => ({ ...t }));
  }

  public getOrderedPickTasks(): MobilePickTaskItem[] {
    return sortPickingTasksByRoute(this.pickTasks);
  }

  public getNextActivePickTask(): MobilePickTaskItem | null {
    const ordered = this.getOrderedPickTasks();
    return ordered.find((t) => !t.isComplete) ?? null;
  }

  public confirmPick(lineId: string, quantity: number): {
    task: MobilePickTaskItem;
    isComplete: boolean;
    remainingIncompleteCount: number;
  } {
    const task = this.pickTasks.find((t) => t.lineId === lineId);
    if (!task) {
      throw new Error(`Pick task line ${lineId} not found`);
    }

    task.quantityPicked += quantity;
    if (task.quantityPicked >= task.quantityRequired) {
      task.isComplete = true;
    }

    this.pendingOutboxMutationsCount++;

    const remaining = this.pickTasks.filter((t) => !t.isComplete).length;
    return {
      task,
      isComplete: task.isComplete,
      remainingIncompleteCount: remaining,
    };
  }

  // ==========================================
  // Barcode Scanning & Verification
  // ==========================================

  public processBarcodeScan(barcode: string): {
    feedback: MobileScanFeedback;
    matchedTask: MobilePickTaskItem | null;
  } {
    const cleanBarcode = barcode.trim();
    const nextTask = this.getNextActivePickTask();

    let status: 'SUCCESS' | 'WARNING' | 'ERROR' = 'ERROR';
    let matched: MobilePickTaskItem | null = null;

    if (nextTask && (nextTask.barcode === cleanBarcode || nextTask.sku === cleanBarcode)) {
      status = 'SUCCESS';
      matched = nextTask;
    } else {
      // Check if it belongs to any other task in the wave (wrong sequence = WARNING)
      const otherMatch = this.pickTasks.find(
        (t) => (t.barcode === cleanBarcode || t.sku === cleanBarcode) && !t.isComplete,
      );
      if (otherMatch) {
        status = 'WARNING';
        matched = otherMatch;
      }
    }

    const feedback = getBarcodeScanFeedback(status);
    this.scanHistory.push({
      barcode: cleanBarcode,
      timestamp: new Date().toISOString(),
      status,
    });

    return { feedback, matchedTask: matched };
  }

  public getScanHistory() {
    return [...this.scanHistory];
  }

  public getPendingOutboxCount(): number {
    return this.pendingOutboxMutationsCount;
  }

  // ==========================================
  // Mobile HTML Shell Layout
  // ==========================================

  public renderMobileShellHtml(): string {
    const tokens = themeTokens.dark;
    const nextTask = this.getNextActivePickTask();
    const tabs = this.getNavigationTabs();

    const tabsHtml = tabs
      .map((tab) => {
        const isActive = tab.id === this.currentTab;
        const activeStyle = isActive
          ? `color: ${tokens.primary}; font-weight: 700; border-top: 3px solid ${tokens.primary};`
          : `color: ${tokens.textSecondary};`;
        const badgeHtml = tab.badgeCount ? `<span class="tab-badge">${tab.badgeCount}</span>` : '';
        return `
          <button class="mobile-tab-btn" style="${activeStyle}">
            <span class="tab-icon">${tab.icon}</span>
            <span class="tab-label">${tab.label}</span>
            ${badgeHtml}
          </button>
        `.trim();
      })
      .join('\n');

    const nextTaskHtml = nextTask
      ? `
        <div class="active-pick-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border};">
          <div class="bin-indicator" style="color: ${brandColors.gold[400]}; font-size: 1.25rem; font-weight: 700;">
            Bin: ${nextTask.binLocationCode}
          </div>
          <div class="sku-name">${nextTask.productName} (${nextTask.sku})</div>
          <div class="pick-progress">Pick: ${nextTask.quantityPicked} / ${nextTask.quantityRequired}</div>
        </div>
      `.trim()
      : '<div class="empty-wave">No active wave loaded</div>';

    return `
      <div class="stokrova-mobile-shell" style="background: ${tokens.background}; color: ${tokens.textPrimary};">
        <header class="mobile-header" style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border};">
          <div class="operator-badge">
            <span class="warehouse-title">${this.config.warehouseName}</span>
            <span class="operator-name">${this.config.operatorName}</span>
          </div>
          <div class="outbox-chip ${this.pendingOutboxMutationsCount > 0 ? 'pending' : 'synced'}">
            ⚡ Outbox: ${this.pendingOutboxMutationsCount}
          </div>
        </header>

        <main class="mobile-viewport">
          <div class="scanner-viewfinder-overlay" style="border: 2px dashed ${tokens.borderStrong};">
            <div class="reticle-target"></div>
            <span class="scanner-prompt">Aim laser / camera at barcode</span>
          </div>
          <section class="task-instructions">
            ${nextTaskHtml}
          </section>
        </main>

        <nav class="thumb-zone-bottom-bar" style="background: ${tokens.surface}; border-top: 1px solid ${tokens.border};">
          ${tabsHtml}
        </nav>
      </div>
    `.trim();
  }
}

export * from './viewfinder-view.js';
export * from './pick-route-view.js';
export * from './receiving-view.js';
export * from './cycle-count-view.js';
export * from './sync-telemetry-view.js';

