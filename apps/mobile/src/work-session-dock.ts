/**
 * STOKROVA Mobile — Thumb-Zone Work Session Dock & Shift Lifecycle Controller
 * Offline-first session tracking with local timestamp capture,
 * Imperial Gold start action, Charcoal Slate closeout, and sync telemetry.
 */

import { themeTokens, brandColors } from '@stokrova/ui';

export type MobileSessionStatus = 'IDLE' | 'ACTIVE' | 'ON_BREAK' | 'CLOSED';

export interface MobileWorkSessionRecord {
  sessionId: string;
  tenantId: string;
  userId: string;
  roleCode: string;
  deviceFingerprint: string;
  startedAtIso: string;
  endedAtIso: string | null;
  status: MobileSessionStatus;
  itemsProcessed: number;
  totalSalesMinor: number;
  syncedToCloud: boolean;
}

export class MobileWorkSessionDock {
  private currentSession: MobileWorkSessionRecord | null = null;
  private sessionHistory: MobileWorkSessionRecord[] = [];
  private tenantId: string;
  private userId: string;
  private roleCode: string;
  private deviceFingerprint: string;

  constructor(tenantId: string, userId: string, roleCode: string, deviceFingerprint = 'HHD-M-01') {
    this.tenantId = tenantId;
    this.userId = userId;
    this.roleCode = roleCode;
    this.deviceFingerprint = deviceFingerprint;
  }

  public getSession(): MobileWorkSessionRecord | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  public isWorkActive(): boolean {
    return this.currentSession?.status === 'ACTIVE';
  }

  public startWork(customTimeIso?: string): MobileWorkSessionRecord {
    if (this.currentSession && this.currentSession.status === 'ACTIVE') {
      return { ...this.currentSession };
    }

    const sessionId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = customTimeIso || new Date().toISOString();

    this.currentSession = {
      sessionId,
      tenantId: this.tenantId,
      userId: this.userId,
      roleCode: this.roleCode,
      deviceFingerprint: this.deviceFingerprint,
      startedAtIso: nowIso,
      endedAtIso: null,
      status: 'ACTIVE',
      itemsProcessed: 0,
      totalSalesMinor: 0,
      syncedToCloud: false,
    };

    return { ...this.currentSession };
  }

  public pauseWork(): void {
    if (this.currentSession && this.currentSession.status === 'ACTIVE') {
      this.currentSession.status = 'ON_BREAK';
    }
  }

  public resumeWork(): void {
    if (this.currentSession && this.currentSession.status === 'ON_BREAK') {
      this.currentSession.status = 'ACTIVE';
    }
  }

  public recordActivity(itemsCount = 1, salesAmountMinor = 0): void {
    if (!this.currentSession || this.currentSession.status !== 'ACTIVE') {
      return;
    }
    this.currentSession.itemsProcessed += itemsCount;
    this.currentSession.totalSalesMinor += salesAmountMinor;
  }

  public endWork(customTimeIso?: string): MobileWorkSessionRecord {
    if (!this.currentSession) {
      throw new Error('No active work session to end');
    }

    const nowIso = customTimeIso || new Date().toISOString();
    this.currentSession.endedAtIso = nowIso;
    this.currentSession.status = 'CLOSED';

    const closed = { ...this.currentSession };
    this.sessionHistory.unshift(closed);
    this.currentSession = null;
    return closed;
  }

  public getHistory(): MobileWorkSessionRecord[] {
    return [...this.sessionHistory];
  }

  public markSynced(sessionId: string): void {
    const historical = this.sessionHistory.find((s) => s.sessionId === sessionId);
    if (historical) {
      historical.syncedToCloud = true;
    }
  }

  /**
   * Renders the thumb-zone dock HTML in strict STOKROVA Industrial Enterprise styling.
   */
  public renderDockHtml(): string {
    const tokens = themeTokens.dark;
    const gold = brandColors.gold[500] || '#BD9652';
    const slate = brandColors.slate[800];


    if (!this.currentSession || this.currentSession.status === 'CLOSED' || this.currentSession.status === 'IDLE') {
      return `
        <div class="mobile-session-dock idle" style="background: ${tokens.surface}; border-top: 1px solid ${tokens.border}; padding: 0.75rem 1rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: ${tokens.textSecondary};">
              ⚡ Shift Session: Idle
            </span>
            <span style="font-size: 0.75rem; color: #4ADE80; font-family: monospace;">[STANDBY]</span>
          </div>
          <button class="start-work-btn" style="width: 100%; height: 48px; background: ${gold}; color: #161B1E; font-weight: 700; border: none; border-radius: 8px; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <span>⚡ START MY WORK</span>
          </button>
        </div>
      `.trim();
    }

    const isBreak = this.currentSession.status === 'ON_BREAK';
    const statusText = isBreak ? 'ON BREAK' : 'ACTIVE';
    const statusColor = isBreak ? '#FBBF24' : '#4ADE80';

    return `
      <div class="mobile-session-dock active" style="background: ${tokens.surface}; border-top: 1px solid ${tokens.border}; padding: 0.75rem 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; font-family: monospace; font-size: 0.75rem;">
          <span style="color: ${tokens.textPrimary};">
            SHIFT: <span style="color: ${statusColor}; font-weight: 700;">${statusText}</span>
          </span>
          <span style="color: ${gold}; font-weight: 600;">
            ${this.currentSession.itemsProcessed} items processed
          </span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <button class="break-btn" style="height: 44px; background: ${slate}; color: #FFFFFF; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
            ${isBreak ? '▶ RESUME' : '⏸ BREAK'}
          </button>
          <button class="end-work-btn" style="height: 44px; background: #2C1518; color: #F87171; border: 1px solid #7F1D1D; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
            ⏏ END WORK
          </button>
        </div>
      </div>
    `.trim();
  }
}
