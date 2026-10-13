/**
 * STOKROVA Mobile — Directed Serpentine Pick Route Checklist
 * S-shape aisle sequencing visualizer, high-contrast target cards,
 * short-pick exception handling, and wave completion telemetry.
 */

import {
  type MobilePickTaskItem,
  sortPickingTasksByRoute,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

export type ShortPickReason = 'DAMAGED_STOCK' | 'EMPTY_BIN' | 'MISPLACED' | 'BARCODE_UNREADABLE';

export interface ShortPickException {
  lineId: string;
  sku: string;
  binLocationCode: string;
  quantityShort: number;
  reason: ShortPickReason;
  timestampIso: string;
}

export class MobilePickRouteViewModel {
  private waveId: string;
  private tasks: MobilePickTaskItem[] = [];
  private exceptions: ShortPickException[] = [];

  constructor(waveId: string, initialTasks: MobilePickTaskItem[] = []) {
    this.waveId = waveId;
    this.tasks = initialTasks.map((t) => ({ ...t }));
  }

  public getWaveId(): string {
    return this.waveId;
  }

  public setTasks(tasks: MobilePickTaskItem[]): void {
    this.tasks = tasks.map((t) => ({ ...t }));
  }

  public getTasksSorted(): MobilePickTaskItem[] {
    return sortPickingTasksByRoute(this.tasks);
  }

  public getActiveTargetTask(): MobilePickTaskItem | null {
    const sorted = this.getTasksSorted();
    return sorted.find((t) => !t.isComplete) ?? null;
  }

  public confirmPickQuantity(lineId: string, quantityPicked: number): MobilePickTaskItem {
    const task = this.tasks.find((t) => t.lineId === lineId);
    if (!task) {
      throw new Error(`Pick task line ${lineId} not found`);
    }
    if (quantityPicked <= 0) {
      throw new Error('Picked quantity must be positive');
    }

    task.quantityPicked += quantityPicked;
    if (task.quantityPicked >= task.quantityRequired) {
      task.isComplete = true;
    }
    return { ...task };
  }

  public reportShortPick(
    lineId: string,
    quantityShort: number,
    reason: ShortPickReason,
  ): ShortPickException {
    const task = this.tasks.find((t) => t.lineId === lineId);
    if (!task) {
      throw new Error(`Pick task line ${lineId} not found`);
    }

    const remainingNeeded = task.quantityRequired - task.quantityPicked;
    if (quantityShort > remainingNeeded) {
      throw new Error(`Short quantity cannot exceed remaining required (${remainingNeeded})`);
    }

    const ex: ShortPickException = {
      lineId,
      sku: task.sku,
      binLocationCode: task.binLocationCode,
      quantityShort,
      reason,
      timestampIso: new Date().toISOString(),
    };

    // Mark task complete as short-picked
    task.isComplete = true;
    this.exceptions.push(ex);
    return ex;
  }

  public getExceptions(): ShortPickException[] {
    return [...this.exceptions];
  }

  public getProgress(): {
    totalTasks: number;
    completedTasks: number;
    percentage: number;
    isWaveFinished: boolean;
  } {
    const total = this.tasks.length;
    if (total === 0) {
      return { totalTasks: 0, completedTasks: 0, percentage: 100, isWaveFinished: true };
    }
    const completed = this.tasks.filter((t) => t.isComplete).length;
    const percentage = Math.round((completed / total) * 100);
    return {
      totalTasks: total,
      completedTasks: completed,
      percentage,
      isWaveFinished: completed === total,
    };
  }

  public renderPickRouteHtml(): string {
    const tokens = themeTokens.dark;
    const active = this.getActiveTargetTask();
    const sorted = this.getTasksSorted();
    const progress = this.getProgress();

    const activeCardHtml = active
      ? `
        <div class="active-target-card" style="background: ${tokens.card}; border: 2px solid ${brandColors.gold[500]}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: ${brandColors.gold[400]}; text-transform: uppercase;">Next Pick Target</div>
          <div style="font-size: 2rem; font-weight: 800; font-family: var(--stokrova-font-mono); color: #fff; margin: 8px 0;">
            ${active.binLocationCode}
          </div>
          <div style="font-size: 1rem; font-weight: 600;">${active.productName}</div>
          <div style="font-size: 0.85rem; color: ${tokens.textSecondary}; font-family: var(--stokrova-font-mono); margin-top: 2px;">
            SKU: ${active.sku} | Barcode: ${active.barcode}
          </div>
          <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-size: 0.9rem; color: ${tokens.textMuted};">Progress:</span>
            <span style="font-size: 1.25rem; font-weight: 700;">${active.quantityPicked} / ${active.quantityRequired} units</span>
          </div>
        </div>
      `.trim()
      : `
        <div class="all-picks-complete" style="background: ${tokens.card}; border: 1px solid #16A34A; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #4ADE80;">✓ Wave Pick Complete!</h3>
          <p style="font-size: 0.85rem; color: ${tokens.textSecondary}; margin-top: 8px;">All scheduled bins have been confirmed and staged.</p>
        </div>
      `.trim();

    const itemsListHtml = sorted
      .map((t) => {
        const isCurrent = active && active.lineId === t.lineId;
        const statusColor = t.isComplete ? '#4ADE80' : isCurrent ? brandColors.gold[400] : tokens.textMuted;

        return `
          <div class="route-item-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: ${isCurrent ? tokens.cardHover : tokens.surface}; border-bottom: 1px solid ${tokens.border};">
            <div>
              <span style="font-family: var(--stokrova-font-mono); font-weight: 700; color: ${statusColor};">${t.binLocationCode}</span>
              <div style="font-size: 0.8rem; color: ${tokens.textPrimary}; margin-top: 2px;">${t.productName}</div>
            </div>
            <div style="text-align: right; font-family: var(--stokrova-font-mono); font-size: 0.85rem;">
              <span>${t.quantityPicked}/${t.quantityRequired}</span>
              <span style="margin-left: 8px;">${t.isComplete ? '✓' : '○'}</span>
            </div>
          </div>
        `.trim();
      })
      .join('\n');

    return `
      <div class="mobile-pick-route-view" style="color: ${tokens.textPrimary};">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 1.1rem;">Wave: ${this.waveId}</h3>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Serpentine S-Route Traversal</div>
          </div>
          <div style="font-weight: 700; color: ${brandColors.gold[400]};">
            ${progress.percentage}% Done
          </div>
        </header>

        ${activeCardHtml}

        <div class="route-checklist" style="border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
          ${itemsListHtml}
        </div>
      </div>
    `.trim();
  }
}
