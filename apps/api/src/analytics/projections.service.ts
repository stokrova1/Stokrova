import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ReportingProjection,
  ProjectionReconciliationResult,
} from '@stokrova/contracts';
import { reconcileProjectionLedger } from '@stokrova/domain';

@Injectable()
export class ProjectionsService {
  private readonly logger = new Logger(ProjectionsService.name);
  private readonly projections = new Map<string, ReportingProjection>();

  constructor() {
    this.seedBaselineProjections();
  }

  private seedBaselineProjections(): void {
    const defaultProj: ReportingProjection = {
      id: 'proj_sales_daily_default',
      tenant_id: 'ten_default',
      projection_type: 'DAILY_SALES_BY_BRANCH',
      dimension_key: 'BRANCH:BR-01',
      metric_values: {
        GROSS_SALES: 330000,
        NET_SALES: 315000,
        COGS: 190000,
        ORDER_COUNT: 2,
      },
      period_start: '2026-10-01T00:00:00Z',
      period_end: '2026-10-03T23:59:59Z',
      last_event_id: 'evt_init_001',
      snapshot_version: 1,
      is_consistent: true,
      updated_at: new Date().toISOString(),
    };

    this.projections.set(defaultProj.id, defaultProj);
  }

  /**
   * Get projection by type and dimension key.
   */
  async getProjection(
    tenantId: string,
    projectionType: string,
    dimensionKey: string,
  ): Promise<ReportingProjection | undefined> {
    for (const proj of this.projections.values()) {
      if (
        proj.tenant_id === tenantId &&
        proj.projection_type === projectionType &&
        proj.dimension_key === dimensionKey
      ) {
        return proj;
      }
    }
    return undefined;
  }

  /**
   * List projections for a tenant.
   */
  async listProjections(tenantId: string): Promise<ReportingProjection[]> {
    return Array.from(this.projections.values()).filter(
      (p) => p.tenant_id === tenantId,
    );
  }

  /**
   * Save or update an analytical projection snapshot incrementally.
   */
  async upsertProjection(
    tenantId: string,
    projectionType: string,
    dimensionKey: string,
    metricValues: Record<string, number | string>,
    lastEventId?: string,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<ReportingProjection> {
    const existing = await this.getProjection(tenantId, projectionType, dimensionKey);
    const now = new Date().toISOString();

    if (existing) {
      existing.metric_values = {
        ...(existing.metric_values ?? {}),
        ...metricValues,
      };
      existing.last_event_id = lastEventId ?? existing.last_event_id;
      existing.snapshot_version = (existing.snapshot_version ?? 1) + 1;
      existing.is_consistent = true;
      existing.updated_at = now;
      return existing;
    }

    const newId = `proj_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const newProj: ReportingProjection = {
      id: newId,
      tenant_id: tenantId,
      projection_type: projectionType,
      dimension_key: dimensionKey,
      metric_values: metricValues,
      period_start: periodStart,
      period_end: periodEnd,
      last_event_id: lastEventId,
      snapshot_version: 1,
      is_consistent: true,
      updated_at: now,
    };

    this.projections.set(newId, newProj);
    return newProj;
  }

  /**
   * Deterministically rebuilds and reconciles analytical projection from authoritative ledger balances.
   * Compares projected metrics with ground-truth ledger and updates the projection in-place without blocking writers.
   */
  async rebuildProjectionFromLedger(
    tenantId: string,
    projectionType: string,
    groundTruthLedgerBalances: Record<string, bigint>,
    dimensionKey = 'BRANCH:BR-01',
  ): Promise<ProjectionReconciliationResult> {
    // Current projected balances
    const projectionRecord = await this.getProjection(tenantId, projectionType, dimensionKey);
    const currentMetricBalances: Record<string, bigint> = {};

    if (projectionRecord && projectionRecord.metric_values) {
      for (const [k, v] of Object.entries(projectionRecord.metric_values)) {
        currentMetricBalances[k] = BigInt(Math.round(Number(v)));
      }
    }

    // Pure domain reconciliation
    const reconciliation = reconcileProjectionLedger(
      currentMetricBalances,
      groundTruthLedgerBalances,
    );

    // Apply ground truth updates to the projection
    const updatedMetricValues: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(groundTruthLedgerBalances)) {
      updatedMetricValues[k] = Number(v);
    }

    await this.upsertProjection(
      tenantId,
      projectionType,
      dimensionKey,
      updatedMetricValues,
      `rebuild_${Date.now()}`,
    );

    this.logger.log(
      `Projection '${projectionType}' reconciled: ${reconciliation.differences.length} variances corrected. Drift detected: ${reconciliation.drift_detected}`,
    );

    return reconciliation;
  }
}
