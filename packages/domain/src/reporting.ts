/**
 * STOKROVA Phase 11 — Enterprise Reporting, Analytics & Business Intelligence Pure Domain Engine
 *
 * Implements:
 * - Shared Metric Dictionary Registry & Metadata Governance
 * - Safe Declarative Query AST Validator (zero raw SQL, zero eval, strict allowlists)
 * - Pure Integer Rational Math & Basis Point Ratio Calculation
 * - Multi-Currency Aggregation Safety Checks
 * - CSV Formula Injection Sanitizer (protecting Excel / LibreOffice exports)
 * - Projection Delta & Deterministic Rebuild Helpers
 */

export type MetricCategory =
  | 'SALES'
  | 'INVENTORY'
  | 'FINANCE'
  | 'PROCUREMENT'
  | 'MANUFACTURING'
  | 'LOGISTICS'
  | 'CRM'
  | 'OPERATIONS';

export type MetricAggregationType =
  | 'SUM'
  | 'COUNT'
  | 'AVERAGE'
  | 'RATIO'
  | 'MIN'
  | 'MAX';

export type MetricDataType =
  | 'CURRENCY_MINOR'
  | 'QUANTITY_INTEGER'
  | 'BASIS_POINTS'
  | 'COUNT'
  | 'DURATION_SECONDS';

export type MetricValueProvenance =
  | 'ACTUAL'
  | 'ESTIMATED'
  | 'FORECAST'
  | 'DERIVED';

export interface MetricDefinition {
  id: string;
  name: string;
  category: MetricCategory;
  description: string;
  owner_domain: string;
  source_service: string;
  data_type: MetricDataType;
  aggregation_type: MetricAggregationType;
  provenance: MetricValueProvenance;
  inclusion_rules: string;
  exclusion_rules: string;
  required_permission: string;
  is_currency_sensitive: boolean;
  version: number;
}

export type ReportFilterOperator =
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'BETWEEN';

export interface ReportFilter {
  field: string;
  operator: ReportFilterOperator;
  value: unknown;
}

export type StandardReportDimension =
  | 'BRANCH'
  | 'WAREHOUSE'
  | 'CHANNEL'
  | 'CATEGORY'
  | 'PRODUCT'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'CARRIER'
  | 'DATE_DAY'
  | 'DATE_MONTH'
  | 'DATE_YEAR';

export interface ReportQueryDefinition {
  source: string;
  metrics: string[];
  dimensions: string[];
  filters?: ReportFilter[];
  start_date?: string;
  end_date?: string;
  currency_code?: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
}

export class ReportingDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReportingDomainError';
  }
}

// ----------------------------------------------------------------------------
// 1. Centralized Metric Dictionary Registry
// ----------------------------------------------------------------------------

export const STANDARD_METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  GROSS_SALES: {
    id: 'GROSS_SALES',
    name: 'Gross Sales',
    category: 'SALES',
    description: 'Total revenue of all placed sales orders before deductions, taxes, or returns.',
    owner_domain: 'Commerce',
    source_service: 'OrdersService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Includes all confirmed and completed sales orders in period.',
    exclusion_rules: 'Excludes draft, rejected, or cancelled sales orders.',
    required_permission: 'reporting.sales.view',
    is_currency_sensitive: true,
    version: 1,
  },
  NET_SALES: {
    id: 'NET_SALES',
    name: 'Net Sales',
    category: 'SALES',
    description: 'Gross sales minus applied discounts and customer returns.',
    owner_domain: 'Commerce',
    source_service: 'OrdersService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Includes completed sales orders less approved customer returns.',
    exclusion_rules: 'Excludes unconfirmed orders and pending quotes.',
    required_permission: 'reporting.sales.view',
    is_currency_sensitive: true,
    version: 1,
  },
  COMPLETED_ORDER_COUNT: {
    id: 'COMPLETED_ORDER_COUNT',
    name: 'Completed Orders',
    category: 'SALES',
    description: 'Total number of successfully delivered or completed sales orders.',
    owner_domain: 'Commerce',
    source_service: 'OrdersService',
    data_type: 'COUNT',
    aggregation_type: 'COUNT',
    provenance: 'ACTUAL',
    inclusion_rules: 'Orders in COMPLETED or DELIVERED status.',
    exclusion_rules: 'Draft, cancelled, or pending fulfillment orders.',
    required_permission: 'reporting.sales.view',
    is_currency_sensitive: false,
    version: 1,
  },
  AVERAGE_ORDER_VALUE: {
    id: 'AVERAGE_ORDER_VALUE',
    name: 'Average Order Value (AOV)',
    category: 'SALES',
    description: 'Net sales divided by completed order count in integer minor units.',
    owner_domain: 'Commerce',
    source_service: 'OrdersService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'RATIO',
    provenance: 'DERIVED',
    inclusion_rules: 'Calculated as aggregate Net Sales / Completed Order Count.',
    exclusion_rules: 'Never computed by averaging individual order AOV percentages.',
    required_permission: 'reporting.sales.view',
    is_currency_sensitive: true,
    version: 1,
  },
  SALES_VOLUME: {
    id: 'SALES_VOLUME',
    name: 'Sales Volume',
    category: 'SALES',
    description: 'Total quantity units of items sold across completed sales orders.',
    owner_domain: 'Commerce',
    source_service: 'OrdersService',
    data_type: 'QUANTITY_INTEGER',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Item quantities across confirmed sales orders.',
    exclusion_rules: 'Draft, cancelled, or returned items.',
    required_permission: 'reporting.sales.view',
    is_currency_sensitive: false,
    version: 1,
  },
  ON_HAND_STOCK: {
    id: 'ON_HAND_STOCK',
    name: 'On-Hand Stock Quantity',
    category: 'INVENTORY',
    description: 'Physical inventory units physically present in warehouse facilities.',
    owner_domain: 'Inventory',
    source_service: 'StockLedgerService',
    data_type: 'QUANTITY_INTEGER',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Authoritative sum of double-entry stock ledger balances.',
    exclusion_rules: 'Does not include in-transit goods or uninspected returns.',
    required_permission: 'reporting.inventory.view',
    is_currency_sensitive: false,
    version: 1,
  },
  ON_HAND_COUNT: {
    id: 'ON_HAND_COUNT',
    name: 'On-Hand Stock Count',
    category: 'INVENTORY',
    description: 'Physical inventory units present in warehouse facilities.',
    owner_domain: 'Inventory',
    source_service: 'StockLedgerService',
    data_type: 'QUANTITY_INTEGER',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Authoritative sum of double-entry stock ledger balances.',
    exclusion_rules: 'Does not include in-transit goods or uninspected returns.',
    required_permission: 'reporting.inventory.view',
    is_currency_sensitive: false,
    version: 1,
  },
  AVAILABLE_TO_PROMISE: {
    id: 'AVAILABLE_TO_PROMISE',
    name: 'Available To Promise (ATP)',
    category: 'INVENTORY',
    description: 'Calculated as On-Hand Stock minus Active Reservations plus Confirmed Inbound POs.',
    owner_domain: 'Inventory',
    source_service: 'StockReservationsService',
    data_type: 'QUANTITY_INTEGER',
    aggregation_type: 'SUM',
    provenance: 'DERIVED',
    inclusion_rules: 'On-hand physical stock less unexpired customer reservations.',
    exclusion_rules: 'Draft purchase orders and unconfirmed inbound shipments.',
    required_permission: 'reporting.inventory.view',
    is_currency_sensitive: false,
    version: 1,
  },
  TOTAL_INVENTORY_VALUE: {
    id: 'TOTAL_INVENTORY_VALUE',
    name: 'Total Inventory Valuation',
    category: 'INVENTORY',
    description: 'Aggregate financial value of on-hand inventory at unit cost in minor units.',
    owner_domain: 'Inventory',
    source_service: 'StockLedgerService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'On-hand quantity multiplied by unit cost minor units.',
    exclusion_rules: 'Quarantined or scrapped stock awaiting write-off.',
    required_permission: 'reporting.inventory.view',
    is_currency_sensitive: true,
    version: 1,
  },
  COGS: {
    id: 'COGS',
    name: 'Cost of Goods Sold (COGS)',
    category: 'FINANCE',
    description: 'Direct cost attributable to the production or acquisition of sold goods in minor units.',
    owner_domain: 'Finance',
    source_service: 'GeneralLedgerService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Authoritative cost of goods sold recognized in General Ledger.',
    exclusion_rules: 'Unrealized inventory losses and overhead expenses.',
    required_permission: 'reporting.financial.view',
    is_currency_sensitive: true,
    version: 1,
  },
  GROSS_PROFIT: {
    id: 'GROSS_PROFIT',
    name: 'Gross Profit',
    category: 'FINANCE',
    description: 'Recognized Net Sales minus posted Cost of Goods Sold (COGS).',
    owner_domain: 'Finance',
    source_service: 'GeneralLedgerService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Derived exclusively from posted General Ledger entries.',
    exclusion_rules: 'Unposted draft transactions and forecast pipelines.',
    required_permission: 'reporting.financial.view',
    is_currency_sensitive: true,
    version: 1,
  },
  GROSS_MARGIN_BP: {
    id: 'GROSS_MARGIN_BP',
    name: 'Gross Margin (Basis Points)',
    category: 'FINANCE',
    description: 'Gross Profit divided by Net Sales, scaled to integer basis points (10000 = 100.00%).',
    owner_domain: 'Finance',
    source_service: 'GeneralLedgerService',
    data_type: 'BASIS_POINTS',
    aggregation_type: 'RATIO',
    provenance: 'DERIVED',
    inclusion_rules: 'Calculated as (Gross Profit * 10000) / Net Sales.',
    exclusion_rules: 'Never calculated by averaging sub-entity margin percentages.',
    required_permission: 'reporting.financial.view',
    is_currency_sensitive: false,
    version: 1,
  },
  ACCOUNTS_RECEIVABLE: {
    id: 'ACCOUNTS_RECEIVABLE',
    name: 'Accounts Receivable (AR)',
    category: 'FINANCE',
    description: 'Total unpaid posted customer invoices currently outstanding.',
    owner_domain: 'Finance',
    source_service: 'InvoicesService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Posted sales invoices with UNPAID or PARTIALLY_PAID status.',
    exclusion_rules: 'Draft invoices, voided invoices, and paid invoices.',
    required_permission: 'reporting.financial.view',
    is_currency_sensitive: true,
    version: 1,
  },
  ACCOUNTS_PAYABLE: {
    id: 'ACCOUNTS_PAYABLE',
    name: 'Accounts Payable (AP)',
    category: 'FINANCE',
    description: 'Total unpaid approved supplier invoices currently outstanding.',
    owner_domain: 'Finance',
    source_service: 'GeneralLedgerService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'ACTUAL',
    inclusion_rules: 'Approved purchase invoices awaiting payment.',
    exclusion_rules: 'Unmatched or draft supplier invoices.',
    required_permission: 'reporting.financial.view',
    is_currency_sensitive: true,
    version: 1,
  },
  PO_FULFILLMENT_RATE_BP: {
    id: 'PO_FULFILLMENT_RATE_BP',
    name: 'Purchase Order Fulfillment Rate (Basis Points)',
    category: 'PROCUREMENT',
    description: 'Ratio of received purchase order quantities to ordered quantities in basis points.',
    owner_domain: 'Procurement',
    source_service: 'ProcurementService',
    data_type: 'BASIS_POINTS',
    aggregation_type: 'RATIO',
    provenance: 'DERIVED',
    inclusion_rules: 'Verified received goods receipts against confirmed PO lines.',
    exclusion_rules: 'Cancelled PO lines.',
    required_permission: 'reporting.procurement.view',
    is_currency_sensitive: false,
    version: 1,
  },
  ON_TIME_DELIVERY_RATE_BP: {
    id: 'ON_TIME_DELIVERY_RATE_BP',
    name: 'On-Time Delivery Rate (Basis Points)',
    category: 'LOGISTICS',
    description: 'Ratio of shipments delivered on or before promised delivery window in basis points.',
    owner_domain: 'Logistics',
    source_service: 'LogisticsShipmentsService',
    data_type: 'BASIS_POINTS',
    aggregation_type: 'RATIO',
    provenance: 'DERIVED',
    inclusion_rules: 'Delivered shipments with confirmed proof of delivery timestamp.',
    exclusion_rules: 'Shipments still in transit or returned to origin.',
    required_permission: 'reporting.logistics.view',
    is_currency_sensitive: false,
    version: 1,
  },
  DELIVERY_FAILURE_RATE_BP: {
    id: 'DELIVERY_FAILURE_RATE_BP',
    name: 'Delivery Attempt Failure Rate (Basis Points)',
    category: 'LOGISTICS',
    description: 'Ratio of failed delivery attempts to total delivery attempts in basis points.',
    owner_domain: 'Logistics',
    source_service: 'LogisticsDeliveryService',
    data_type: 'BASIS_POINTS',
    aggregation_type: 'RATIO',
    provenance: 'DERIVED',
    inclusion_rules: 'Recorded failed attempts across internal fleet and 3PL carriers.',
    exclusion_rules: 'Successful first-attempt deliveries.',
    required_permission: 'reporting.logistics.view',
    is_currency_sensitive: false,
    version: 1,
  },
  LEAD_CONVERSION_RATE_BP: {
    id: 'LEAD_CONVERSION_RATE_BP',
    name: 'Lead Conversion Rate (Basis Points)',
    category: 'CRM',
    description: 'Ratio of converted leads to total ingested leads in basis points.',
    owner_domain: 'CRM',
    source_service: 'CrmPipelineService',
    data_type: 'BASIS_POINTS',
    aggregation_type: 'RATIO',
    provenance: 'DERIVED',
    inclusion_rules: 'Leads converted to customer account or opportunity.',
    exclusion_rules: 'Unqualified or spam leads.',
    required_permission: 'reporting.crm.view',
    is_currency_sensitive: false,
    version: 1,
  },
  PROJECTED_PIPELINE_VALUE: {
    id: 'PROJECTED_PIPELINE_VALUE',
    name: 'Projected Opportunity Pipeline Value',
    category: 'CRM',
    description: 'Probabilistic forecast value (amount * stage win probability) in minor units.',
    owner_domain: 'CRM',
    source_service: 'CrmPipelineService',
    data_type: 'CURRENCY_MINOR',
    aggregation_type: 'SUM',
    provenance: 'FORECAST',
    inclusion_rules: 'Open sales opportunities with stage probabilities.',
    exclusion_rules: 'Must NEVER be presented as recognized revenue or mutate General Ledger.',
    required_permission: 'reporting.crm.view',
    is_currency_sensitive: true,
    version: 1,
  },
};

export function getMetricDefinition(metricId: string): MetricDefinition {
  const metric = STANDARD_METRIC_DEFINITIONS[metricId];
  if (!metric) {
    throw new ReportingDomainError(
      'METRIC_NOT_FOUND',
      `Metric '${metricId}' is not registered in the shared metric dictionary.`,
    );
  }
  return metric;
}

export function listMetricDefinitions(category?: MetricCategory): MetricDefinition[] {
  const all = Object.values(STANDARD_METRIC_DEFINITIONS);
  if (category) {
    return all.filter((m) => m.category === category);
  }
  return all;
}

// ----------------------------------------------------------------------------
// 2. Safe Declarative Query Model & AST Validator
// ----------------------------------------------------------------------------

export const ALLOWED_QUERY_SOURCES = new Set([
  'sales_orders',
  'stock_ledger',
  'general_ledger',
  'purchase_orders',
  'shipments',
  'crm_opportunities',
  'reporting_projections',
]);

export const ALLOWED_QUERY_DIMENSIONS = new Set<string>([
  'BRANCH',
  'WAREHOUSE',
  'CHANNEL',
  'CATEGORY',
  'PRODUCT',
  'CUSTOMER',
  'SUPPLIER',
  'CARRIER',
  'DATE_DAY',
  'DATE_MONTH',
  'DATE_YEAR',
]);

export const ALLOWED_FILTER_OPERATORS = new Set([
  'EQ',
  'NEQ',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IN',
  'BETWEEN',
]);

const FORBIDDEN_SQL_PATTERNS = [
  /(\bselect\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\balter\b)/i,
  /(--|\/\*|\*\/|;)/,
  /(\bexec\b|\bexecute\b|\bxp_\b)/i,
];

/**
 * Validates report query AST against strict allowlists and injection protections.
 */
export function validateReportQuery(query: ReportQueryDefinition): void {
  // 1. Source check
  if (!query.source || !ALLOWED_QUERY_SOURCES.has(query.source.toLowerCase())) {
    throw new ReportingDomainError(
      'INVALID_REPORT_SOURCE',
      `Data source '${query.source}' is not allowed. Must be one of: ${Array.from(ALLOWED_QUERY_SOURCES).join(', ')}`,
    );
  }

  // 2. Metrics check (at least 1, max 10)
  if (!query.metrics || query.metrics.length === 0) {
    throw new ReportingDomainError(
      'NO_METRICS_SPECIFIED',
      'Report query must request at least one registered metric.',
    );
  }
  if (query.metrics.length > 10) {
    throw new ReportingDomainError(
      'TOO_MANY_METRICS',
      `Report query requested ${query.metrics.length} metrics; maximum permitted is 10.`,
    );
  }
  for (const m of query.metrics) {
    getMetricDefinition(m); // asserts exists
  }

  // 3. Dimensions check (max 5)
  if (query.dimensions && query.dimensions.length > 5) {
    throw new ReportingDomainError(
      'TOO_MANY_DIMENSIONS',
      `Report query specified ${query.dimensions.length} dimensions; maximum permitted is 5.`,
    );
  }
  if (query.dimensions) {
    for (const d of query.dimensions) {
      if (!ALLOWED_QUERY_DIMENSIONS.has(d.toUpperCase())) {
        throw new ReportingDomainError(
          'INVALID_REPORT_DIMENSION',
          `Dimension '${d}' is not supported. Must be one of: ${Array.from(ALLOWED_QUERY_DIMENSIONS).join(', ')}`,
        );
      }
    }
  }

  // 4. Filters check (max 10)
  if (query.filters && query.filters.length > 10) {
    throw new ReportingDomainError(
      'TOO_MANY_FILTERS',
      `Report query specified ${query.filters.length} filters; maximum permitted is 10.`,
    );
  }

  if (query.filters) {
    for (const f of query.filters) {
      if (!ALLOWED_FILTER_OPERATORS.has(f.operator)) {
        throw new ReportingDomainError(
          'INVALID_FILTER_OPERATOR',
          `Filter operator '${f.operator}' is not supported. Must be one of: ${Array.from(ALLOWED_FILTER_OPERATORS).join(', ')}`,
        );
      }

      // Check field for SQL keywords or injection
      for (const pattern of FORBIDDEN_SQL_PATTERNS) {
        if (pattern.test(f.field)) {
          throw new ReportingDomainError(
            'MALICIOUS_FIELD_NAME',
            `Filter field '${f.field}' contains forbidden SQL keywords or injection tokens.`,
          );
        }
        if (typeof f.value === 'string' && pattern.test(f.value)) {
          throw new ReportingDomainError(
            'MALICIOUS_FILTER_VALUE',
            `Filter value contains forbidden SQL keywords or injection tokens.`,
          );
        }
      }
    }
  }

  // 5. Result size controls
  if (query.limit !== undefined && (query.limit < 1 || query.limit > 10000)) {
    throw new ReportingDomainError(
      'INVALID_QUERY_LIMIT',
      `Query limit ${query.limit} is outside allowed range (1 - 10,000).`,
    );
  }
}

// ----------------------------------------------------------------------------
// 3. Precision Rational Math & Basis Points Calculations
// ----------------------------------------------------------------------------

/**
 * Calculates a basis point ratio from numerator and denominator integers.
 * Prevents floating point drift: basis points 10000 = 100.00%.
 */
export function calculateBasisPointRatio(
  numerator: bigint | number,
  denominator: bigint | number,
): number {
  const num = BigInt(numerator);
  const den = BigInt(denominator);

  if (den === 0n) {
    return 0;
  }

  const bp = (num * 10000n) / den;
  return Number(bp);
}

/**
 * Computes an aggregate ratio from total numerators and total denominators.
 * Strictly avoids the mathematical fallacy of averaging percentage ratios.
 */
export function calculateAggregateRatio(
  numeratorSum: bigint | number,
  denominatorSum: bigint | number,
): number {
  return calculateBasisPointRatio(numeratorSum, denominatorSum);
}

/**
 * Ensures all monetary items share the exact same currency code.
 * Prohibits misleading multi-currency aggregation without explicit conversion.
 */
export function assertSingleCurrencyAggregation(currencies: string[]): string {
  if (currencies.length === 0) {
    return 'USD';
  }

  const primary = currencies[0]!.toUpperCase().trim();
  for (const c of currencies) {
    if (c.toUpperCase().trim() !== primary) {
      throw new ReportingDomainError(
        'CROSS_CURRENCY_AGGREGATION_PROHIBITED',
        `Cannot sum monetary metrics across mixed currencies ('${primary}' vs '${c}'). Apply explicit currency conversion first.`,
      );
    }
  }

  return primary;
}

// ----------------------------------------------------------------------------
// 4. CSV Formula Injection Sanitizer
// ----------------------------------------------------------------------------

const FORMULA_TRIGGER_CHARS = new Set(['=', '+', '-', '@', '\t', '\r', '%']);

/**
 * Sanitizes a cell for CSV/spreadsheet export to prevent formula execution
 * vulnerabilities (CSV Injection / DDE) in Excel, LibreOffice, and Google Sheets.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (text.length > 0 && FORMULA_TRIGGER_CHARS.has(text[0]!)) {
    // Prepend single quote (') to escape formula execution
    return `'${text.replace(/"/g, '""')}`;
  }

  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

// ----------------------------------------------------------------------------
// 5. Projection Delta & Reconciliation Helpers
// ----------------------------------------------------------------------------

export interface ProjectionState {
  metrics: Record<string, string | number>;
  last_event_id: string;
  version: number;
}

/**
 * Reconciles an incoming event into a projection state idempotently.
 */
export function reconcileProjectionEvent(
  current: ProjectionState,
  eventId: string,
  deltas: Record<string, number>,
): { state: ProjectionState; skippedDuplicate: boolean } {
  // Idempotency: skip if already processed this exact event
  if (current.last_event_id === eventId) {
    return { state: current, skippedDuplicate: true };
  }

  const updatedMetrics: Record<string, string | number> = { ...current.metrics };

  for (const [key, delta] of Object.entries(deltas)) {
    const existingVal = Number(updatedMetrics[key] ?? 0);
    updatedMetrics[key] = existingVal + delta;
  }

  return {
    state: {
      metrics: updatedMetrics,
      last_event_id: eventId,
      version: current.version + 1,
    },
    skippedDuplicate: false,
  };
}

export function assertSingleCurrencyQuery(
  query: ReportQueryDefinition,
  detectedCurrencies: string[],
): string {
  if (query.currency_code) {
    return query.currency_code;
  }
  return assertSingleCurrencyAggregation(detectedCurrencies);
}

export const sanitizeCsvValue = sanitizeCsvCell;

export interface ProjectionVariance {
  metric: string;
  projected: bigint;
  authoritative: bigint;
  variance: bigint;
}

export interface ProjectionReconciliationResult {
  is_consistent: boolean;
  drift_detected: boolean;
  differences: ProjectionVariance[];
  reconciled_at: string;
}

export type ProjectionBalanceRecord = Record<string, bigint>;

export function reconcileProjectionLedger(
  projectedBalances: Record<string, bigint>,
  ledgerBalances: Record<string, bigint>,
): ProjectionReconciliationResult {
  const differences: ProjectionVariance[] = [];
  const allKeys = new Set([...Object.keys(projectedBalances), ...Object.keys(ledgerBalances)]);

  for (const key of allKeys) {
    const projected = projectedBalances[key] ?? 0n;
    const authoritative = ledgerBalances[key] ?? 0n;
    const variance = authoritative - projected;
    if (variance !== 0n) {
      differences.push({
        metric: key,
        projected,
        authoritative,
        variance,
      });
    }
  }

  return {
    is_consistent: differences.length === 0,
    drift_detected: differences.length > 0,
    differences,
    reconciled_at: new Date().toISOString(),
  };
}
