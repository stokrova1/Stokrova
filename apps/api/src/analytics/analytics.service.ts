import { DurableMap } from '../infrastructure/database/durable-map.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AbcAnalysisResult,
  CashierDiscrepancySummary,
  CashierSessionDiscrepancyInput,
  DeadStockItemInput,
  DeadStockReport,
  DemandForecastProjection,
  ExecutiveDashboardSummary,
  InventoryTurnoverMetrics,
} from '@stokrova/contracts';
import {
  calculateAbcClassification,
  calculateCashierDiscrepancyMetrics,
  calculateDeadStockAndCarryingCost,
  calculateDemandForecast,
  calculateInventoryTurnoverAndDio,
} from '@stokrova/domain';
import {
  generateDemandForecastSchema,
  getCashierDiscrepancyQuerySchema,
  getDeadStockQuerySchema,
  getExecutiveDashboardQuerySchema,
  getTurnoverMetricsQuerySchema,
  runAbcAnalysisSchema,
  type GenerateDemandForecastDto,
  type GetCashierDiscrepancyQueryDto,
  type GetDeadStockQueryDto,
  type GetExecutiveDashboardQueryDto,
  type GetTurnoverMetricsQueryDto,
  type RunAbcAnalysisDto,
} from '@stokrova/validation';

export interface StoredAbcSnapshot {
  id: string;
  tenant_id: string;
  company_id: string;
  criterion: string;
  result: AbcAnalysisResult;
  created_at: string;
}

export interface StoredForecast {
  id: string;
  tenant_id: string;
  company_id: string;
  projection: DemandForecastProjection;
  created_at: string;
}

@Injectable()
export class AnalyticsService {
  private readonly abcSnapshots = new DurableMap<StoredAbcSnapshot>('analytics_abc_snapshots');
  private readonly forecastHistory = new Map<string, StoredForecast>();
  private readonly sampleDeadStockItems: DeadStockItemInput[] = [];
  private readonly sampleCashierSessions: CashierSessionDiscrepancyInput[] = [];

  /**
   * Run ABC Inventory & Velocity Analysis, saving an auditable snapshot.
   */
  async runAbcAnalysis(
    tenantId: string,
    companyId: string,
    dto: RunAbcAnalysisDto
  ): Promise<AbcAnalysisResult> {
    const validated = runAbcAnalysisSchema.parse(dto);
    const result = calculateAbcClassification(validated.items, validated.criterion);

    const snapshotId = randomUUID();
    const snapshot: StoredAbcSnapshot = {
      id: snapshotId,
      tenant_id: tenantId,
      company_id: companyId,
      criterion: validated.criterion,
      result,
      created_at: new Date().toISOString(),
    };

    this.abcSnapshots.set(snapshotId, snapshot);
    return result;
  }

  /**
   * Retrieve an existing ABC analysis snapshot by ID.
   */
  async getAbcSnapshot(
    tenantId: string,
    snapshotId: string
  ): Promise<StoredAbcSnapshot> {
    const snapshot = this.abcSnapshots.get(snapshotId);
    if (!snapshot || snapshot.tenant_id !== tenantId) {
      throw new NotFoundException(`ABC snapshot with id '${snapshotId}' not found`);
    }
    return snapshot;
  }

  /**
   * Run Dead Stock & Carrying Cost Aging Pipeline.
   */
  async getDeadStockReport(
    _tenantId: string,
    _companyId: string,
    query: GetDeadStockQueryDto,
    customItems?: DeadStockItemInput[]
  ): Promise<DeadStockReport> {
    const validated = getDeadStockQuerySchema.parse(query);
    const itemsToAnalyze = customItems && customItems.length > 0
      ? customItems
      : this.sampleDeadStockItems;

    // Apply query filters if applicable
    const filtered = itemsToAnalyze.filter((item) => {
      if (validated.warehouse_id && item.warehouse_id !== validated.warehouse_id) {
        return false;
      }
      return true;
    }).map((item) => ({
      ...item,
      holding_cost_annual_basis_points: validated.holding_cost_annual_basis_points,
    }));

    return calculateDeadStockAndCarryingCost(filtered);
  }

  /**
   * Register dead stock items for pipeline evaluation.
   */
  addDeadStockItems(items: DeadStockItemInput[]): void {
    this.sampleDeadStockItems.push(...items);
  }

  /**
   * Generate Demand Forecast using pure integer time-series forecasting.
   */
  async generateDemandForecast(
    tenantId: string,
    companyId: string,
    dto: GenerateDemandForecastDto
  ): Promise<DemandForecastProjection> {
    const validated = generateDemandForecastSchema.parse(dto);
    const projection = calculateDemandForecast(validated);

    const forecastId = randomUUID();
    const stored: StoredForecast = {
      id: forecastId,
      tenant_id: tenantId,
      company_id: companyId,
      projection,
      created_at: new Date().toISOString(),
    };

    this.forecastHistory.set(forecastId, stored);
    return projection;
  }

  /**
   * Compute Inventory Turnover Ratio, DIO, and GMROI.
   */
  async getInventoryTurnover(
    _tenantId: string,
    _companyId: string,
    query: GetTurnoverMetricsQueryDto
  ): Promise<InventoryTurnoverMetrics> {
    const validated = getTurnoverMetricsQuerySchema.parse(query);
    return calculateInventoryTurnoverAndDio(validated);
  }

  /**
   * Register cashier sessions for discrepancy tracking.
   */
  addCashierSessions(sessions: CashierSessionDiscrepancyInput[]): void {
    this.sampleCashierSessions.push(...sessions);
  }

  /**
   * Compute Cashier Discrepancy Summaries.
   */
  async getCashierDiscrepancies(
    _tenantId: string,
    _companyId: string,
    query: GetCashierDiscrepancyQueryDto,
    customSessions?: CashierSessionDiscrepancyInput[]
  ): Promise<CashierDiscrepancySummary[]> {
    getCashierDiscrepancyQuerySchema.parse(query);
    const sessions = customSessions ?? this.sampleCashierSessions;
    return calculateCashierDiscrepancyMetrics(sessions);
  }

  /**
   * Consolidated Executive Dashboard aggregating enterprise KPIs.
   */
  async getExecutiveDashboard(
    _tenantId: string,
    _companyId: string,
    query: GetExecutiveDashboardQueryDto
  ): Promise<ExecutiveDashboardSummary> {
    getExecutiveDashboardQuerySchema.parse(query);

    // Compute metrics from registered operational items
    const deadStockReport = calculateDeadStockAndCarryingCost(this.sampleDeadStockItems);
    const totalValuation = this.sampleDeadStockItems.reduce(
      (sum, item) => sum + item.on_hand_quantity * item.unit_cost_minor_units,
      0
    );

    return {
      total_inventory_valuation_minor_units: totalValuation,
      active_variants_count: this.sampleDeadStockItems.length,
      critical_stockout_items_count: this.sampleDeadStockItems.filter(
        (i) => i.on_hand_quantity === 0
      ).length,
      dead_stock_capital_minor_units: deadStockReport.total_tied_up_capital_minor_units,
      today_revenue_minor_units: 0,
      open_orders_count: 0,
      active_registers_count: 1,
      inventory_turnover_dio: 45, // Healthy default baseline
    };
  }
}
