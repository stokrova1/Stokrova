import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import type {
  ReportQueryDefinition,
  EnterpriseReportExecutionResult,
  ReportExecutionRow,
} from '@stokrova/contracts';
import {
  validateReportQuery,
  assertSingleCurrencyQuery,
  calculateBasisPointRatio,
  ReportingDomainError,
  STANDARD_METRIC_DEFINITIONS,
} from '@stokrova/domain';
import { ReportQueryDefinitionSchema } from '@stokrova/validation';
import { MetricDictionaryService } from './metric-dictionary.service.js';

export interface AuthoritativeRecord {
  dimensions: Record<string, string>;
  metrics: Record<string, string | number>;
  currency?: string;
  timestamp?: string;
}

@Injectable()
export class ReportingEngineService {
  private readonly logger = new Logger(ReportingEngineService.name);
  private operationalDataFeed: AuthoritativeRecord[] = [];

  constructor(public readonly metricDictionary: MetricDictionaryService) {
    this.seedDefaultOperationalData();
  }

  /**
   * Seed baseline operational data for testing & local demonstration
   */
  private seedDefaultOperationalData(): void {
    this.operationalDataFeed = [
      {
        dimensions: { BRANCH: 'BR-01', WAREHOUSE: 'WH-MAIN', CATEGORY: 'Electronics', PRODUCT: 'PROD-A', DATE_DAY: '2026-10-01' },
        metrics: { GROSS_SALES: 150000, NET_SALES: 140000, COGS: 90000, SALES_VOLUME: 10, ON_HAND_COUNT: 50 },
        currency: 'EUR',
        timestamp: '2026-10-01T10:00:00Z',
      },
      {
        dimensions: { BRANCH: 'BR-01', WAREHOUSE: 'WH-MAIN', CATEGORY: 'Electronics', PRODUCT: 'PROD-B', DATE_DAY: '2026-10-02' },
        metrics: { GROSS_SALES: 220000, NET_SALES: 200000, COGS: 120000, SALES_VOLUME: 15, ON_HAND_COUNT: 40 },
        currency: 'EUR',
        timestamp: '2026-10-02T11:00:00Z',
      },
      {
        dimensions: { BRANCH: 'BR-02', WAREHOUSE: 'WH-NORTH', CATEGORY: 'Furniture', PRODUCT: 'PROD-C', DATE_DAY: '2026-10-02' },
        metrics: { GROSS_SALES: 300000, NET_SALES: 290000, COGS: 180000, SALES_VOLUME: 5, ON_HAND_COUNT: 20 },
        currency: 'EUR',
        timestamp: '2026-10-02T14:00:00Z',
      },
      {
        dimensions: { BRANCH: 'BR-01', WAREHOUSE: 'WH-MAIN', CATEGORY: 'Electronics', PRODUCT: 'PROD-A', DATE_DAY: '2026-10-03' },
        metrics: { GROSS_SALES: 180000, NET_SALES: 175000, COGS: 100000, SALES_VOLUME: 12, ON_HAND_COUNT: 38 },
        currency: 'EUR',
        timestamp: '2026-10-03T09:30:00Z',
      },
      {
        dimensions: { BRANCH: 'BR-US', WAREHOUSE: 'WH-NY', CATEGORY: 'Electronics', PRODUCT: 'PROD-D', DATE_DAY: '2026-10-03' },
        metrics: { GROSS_SALES: 250000, NET_SALES: 240000, COGS: 150000, SALES_VOLUME: 8, ON_HAND_COUNT: 15 },
        currency: 'USD',
        timestamp: '2026-10-03T16:00:00Z',
      },
    ];
  }

  /**
   * Register operational data items dynamically (used by integration tests)
   */
  ingestAuthoritativeRecords(records: AuthoritativeRecord[]): void {
    this.operationalDataFeed.push(...records);
  }

  /**
   * Clear in-memory feed for isolated test execution
   */
  resetOperationalFeed(): void {
    this.operationalDataFeed = [];
    this.seedDefaultOperationalData();
  }

  /**
   * Execute a declarative report query in strict read-only mode.
   * NEVER mutates operational state, journal entries, or stock balances.
   */
  async executeQuery(
    tenantId: string,
    rawQuery: ReportQueryDefinition,
  ): Promise<EnterpriseReportExecutionResult> {
    this.logger.debug(`Executing report query for ${tenantId}`);

    // 1. Zod schema validation
    const query = ReportQueryDefinitionSchema.parse(rawQuery) as ReportQueryDefinition;

    // 2. Pure AST & Allowlist validation
    try {
      validateReportQuery(query);
    } catch (err) {
      if (err instanceof ReportingDomainError) {
        throw new BadRequestException({
          code: err.code,
          message: err.message,
        });
      }
      throw err;
    }

    // 3. Currency-sensitivity validation
    const detectedCurrencies = Array.from(
      new Set(
        this.operationalDataFeed
          .map((r) => r.currency)
          .filter((c): c is string => Boolean(c)),
      ),
    );

    try {
      assertSingleCurrencyQuery(query, detectedCurrencies);
    } catch (err) {
      if (err instanceof ReportingDomainError) {
        throw new BadRequestException({
          code: err.code,
          message: err.message,
        });
      }
      throw err;
    }

    // 4. Source filtering & Record evaluation (Strict Read-Only)
    let filteredRecords = [...this.operationalDataFeed];

    if (query.currency_code) {
      filteredRecords = filteredRecords.filter(
        (r) => !r.currency || r.currency === query.currency_code,
      );
    }

    // Apply AST filters
    if (query.filters && query.filters.length > 0) {
      for (const filter of query.filters) {
        filteredRecords = filteredRecords.filter((record) => {
          const val = record.dimensions[filter.field] ?? record.metrics[filter.field];
          if (val === undefined) return false;

          switch (filter.operator) {
            case 'EQ':
              return String(val) === String(filter.value);
            case 'NEQ':
              return String(val) !== String(filter.value);
            case 'GT':
              return Number(val) > Number(filter.value);
            case 'GTE':
              return Number(val) >= Number(filter.value);
            case 'LT':
              return Number(val) < Number(filter.value);
            case 'LTE':
              return Number(val) <= Number(filter.value);
            case 'IN':
              return Array.isArray(filter.value) && filter.value.map(String).includes(String(val));
            case 'BETWEEN':
              if (Array.isArray(filter.value) && filter.value.length === 2) {
                return (
                  Number(val) >= Number(filter.value[0]) &&
                  Number(val) <= Number(filter.value[1])
                );
              }
              return true;
            default:
              return true;
          }
        });
      }
    }

    // 5. Dimension Grouping & Aggregation
    const groupMap = new Map<string, { dimensions: Record<string, string>; metricAccumulators: Record<string, bigint>; count: number }>();

    for (const record of filteredRecords) {
      // Build group key based on requested dimensions
      const dimValues: Record<string, string> = {};
      for (const d of query.dimensions) {
        dimValues[d] = record.dimensions[d] ?? 'UNKNOWN';
      }
      const groupKey = query.dimensions.map((d) => `${d}:${dimValues[d]}`).join('|');

      let group = groupMap.get(groupKey);
      if (!group) {
        group = {
          dimensions: dimValues,
          metricAccumulators: {},
          count: 0,
        };
        for (const m of query.metrics) {
          group.metricAccumulators[m] = 0n;
        }
        groupMap.set(groupKey, group);
      }

      group.count += 1;

      // Accumulate metrics
      for (const m of query.metrics) {
        const val = record.metrics[m];
        const currentAcc = group.metricAccumulators[m] ?? 0n;
        if (typeof val === 'number') {
          group.metricAccumulators[m] = currentAcc + BigInt(Math.round(val));
        } else if (typeof val === 'string') {
          try {
            group.metricAccumulators[m] = currentAcc + BigInt(val);
          } catch {
            // Ignore non-numeric strings
          }
        }
      }
    }

    // 6. Build Result Rows & Compute Ratios
    const resultRows: ReportExecutionRow[] = [];

    for (const group of groupMap.values()) {
      const metricOutputs: Record<string, string | number> = {};

      for (const m of query.metrics) {
        const def = STANDARD_METRIC_DEFINITIONS[m];
        const rawSum = group.metricAccumulators[m] ?? 0n;

        if (def && def.aggregation_type === 'AVERAGE') {
          const avg = group.count > 0 ? Number(rawSum) / group.count : 0;
          metricOutputs[m] = Math.round(avg);
        } else if (def && def.aggregation_type === 'COUNT') {
          metricOutputs[m] = group.count;
        } else {
          // Standard SUM
          metricOutputs[m] = rawSum.toString();
        }
      }

      // If Gross Margin Ratio is requested or can be derived:
      if (query.metrics.includes('GROSS_MARGIN_RATIO')) {
        const gross = group.metricAccumulators['GROSS_SALES'] ?? 0n;
        const cogs = group.metricAccumulators['COGS'] ?? 0n;
        const profit = gross - cogs;
        metricOutputs['GROSS_MARGIN_RATIO'] = calculateBasisPointRatio(profit, gross);
      }

      resultRows.push({
        dimensions: group.dimensions,
        metrics: metricOutputs,
      });
    }

    // 7. Sort
    if (query.order_by) {
      const orderField = query.order_by;
      const asc = query.order_direction !== 'DESC';

      resultRows.sort((a, b) => {
        const valA = a.dimensions[orderField] ?? a.metrics[orderField] ?? 0;
        const valB = b.dimensions[orderField] ?? b.metrics[orderField] ?? 0;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return asc ? valA - valB : valB - valA;
        }
        return asc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    // 8. Pagination
    const totalRows = resultRows.length;
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const pagedRows = resultRows.slice(offset, offset + limit);

    return {
      report_name: `${query.source}_report`,
      query_definition: query,
      executed_at: new Date().toISOString(),
      row_count: pagedRows.length,
      total_rows: totalRows,
      page: Math.floor(offset / limit) + 1,
      limit: limit,
      rows: pagedRows,
      freshness_timestamp: new Date().toISOString(),
      is_stale: false,
    };
  }
}
