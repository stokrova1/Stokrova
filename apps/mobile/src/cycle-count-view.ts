/**
 * STOKROVA Mobile — Cycle Counting & Stock Take Assistant
 * Location-guided blind physical counts, perpetual stock variance calculations,
 * and supervisory approval escalation triggers.
 */

import { themeTokens, brandColors } from '@stokrova/ui';

export interface CycleCountTask {
  taskId: string;
  binLocationCode: string;
  sku: string;
  productName: string;
  theoreticalStock: number; // Stored system balance
  countedQuantity?: number;
  varianceUnits?: number;
  requiresSupervisorApproval: boolean;
  status: 'PENDING' | 'COUNTED' | 'APPROVED';
}

export class MobileCycleCountViewModel {
  private auditBatchId: string;
  private tasks: CycleCountTask[] = [];
  private readonly maxToleranceUnits = 2; // Discrepancies > 2 units trigger supervisor approval

  constructor(auditBatchId: string, tasks: CycleCountTask[] = []) {
    this.auditBatchId = auditBatchId;
    this.tasks = tasks.map((t) => ({ ...t }));
  }

  public getBatchId(): string {
    return this.auditBatchId;
  }

  public getTasks(): CycleCountTask[] {
    return this.tasks.map((t) => ({ ...t }));
  }

  public getNextPendingTask(): CycleCountTask | null {
    return this.tasks.find((t) => t.status === 'PENDING') ?? null;
  }

  public submitBlindCount(taskId: string, countedQty: number): CycleCountTask {
    if (countedQty < 0) {
      throw new Error('Counted quantity cannot be negative');
    }
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (!task) {
      throw new Error(`Cycle count task ${taskId} not found`);
    }

    const variance = countedQty - task.theoreticalStock;
    const absDiff = Math.abs(variance);
    const requiresApproval = absDiff > this.maxToleranceUnits;

    task.countedQuantity = countedQty;
    task.varianceUnits = variance;
    task.requiresSupervisorApproval = requiresApproval;
    task.status = requiresApproval ? 'COUNTED' : 'APPROVED';

    return { ...task };
  }

  public getSummary(): {
    totalBins: number;
    countedBins: number;
    discrepancyCount: number;
    requiresApprovalCount: number;
  } {
    let counted = 0;
    let disc = 0;
    let appr = 0;

    for (const t of this.tasks) {
      if (t.status !== 'PENDING') {
        counted++;
        if (t.varianceUnits !== 0) disc++;
        if (t.requiresSupervisorApproval) appr++;
      }
    }

    return {
      totalBins: this.tasks.length,
      countedBins: counted,
      discrepancyCount: disc,
      requiresApprovalCount: appr,
    };
  }

  public renderCycleCountHtml(): string {
    const tokens = themeTokens.dark;
    const next = this.getNextPendingTask();
    const summary = this.getSummary();

    const activeViewHtml = next
      ? `
        <div class="active-count-card" style="background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; text-transform: uppercase;">Active Audit Bin</div>
          <div style="font-size: 1.75rem; font-weight: 700; color: ${brandColors.gold[400]}; font-family: var(--stokrova-font-mono); margin: 6px 0;">
            ${next.binLocationCode}
          </div>
          <div style="font-size: 0.95rem; font-weight: 600;">${next.productName}</div>
          <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; font-family: var(--stokrova-font-mono); margin-top: 2px;">
            SKU: ${next.sku}
          </div>
          <div style="margin-top: 16px;">
            <input type="number" min="0" placeholder="Enter physical count..." style="width: 100%; box-sizing: border-box; background: ${tokens.surface}; color: #fff; border: 1px solid ${tokens.borderStrong}; border-radius: 8px; padding: 12px; font-size: 1.25rem; font-family: var(--stokrova-font-mono); text-align: center;" />
            <button style="width: 100%; background: ${tokens.primary}; color: #000; font-weight: 700; border: none; padding: 12px; border-radius: 8px; margin-top: 10px; cursor: pointer;">
              Confirm Count (Blind)
            </button>
          </div>
        </div>
      `.trim()
      : `
        <div style="background: ${tokens.card}; padding: 24px; text-align: center; border-radius: 12px; color: #4ADE80;">
          ✓ All scheduled bins in batch counted!
        </div>
      `.trim();

    return `
      <div class="mobile-cycle-count-view" style="color: ${tokens.textPrimary};">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 1.1rem;">Batch: ${this.auditBatchId}</h3>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Perpetual Stock Audit</div>
          </div>
          <div style="font-size: 0.8rem; text-align: right;">
            <div>Progress: <strong>${summary.countedBins}/${summary.totalBins}</strong></div>
            <div style="color: ${summary.requiresApprovalCount > 0 ? '#FBBF24' : tokens.textMuted};">Approvals: ${summary.requiresApprovalCount}</div>
          </div>
        </header>

        ${activeViewHtml}
      </div>
    `.trim();
  }
}
