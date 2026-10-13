# STOKROVA — Phase 11 Analytics & Reporting Model

## 1. Architectural Overview & Design Philosophy

The Enterprise Reporting, Analytics & Business Intelligence subsystem in STOKROVA enables businesses of all scales—from a single trader monitoring daily receipts to multinational enterprises coordinating multi-branch, multi-currency operations—to evaluate commercial and operational performance without compromising transactional truth or system performance.

### Core Tenet
> **"The business does not adapt itself to our software. Our software adapts itself to the business."**

In STOKROVA, reporting is not an afterthought or an independent data lake that diverges from operations. It operates within the modular monolith with strict domain boundaries, guaranteed read-only operations, and verifiable provenance.

---

## 2. Core Architectural Pillars

```
                                +-----------------------------------+
                                |    ReportingController (API)     |
                                +-----------------+-----------------+
                                                  |
                  +-------------------------------+-------------------------------+
                  |                               |                               |
        +---------v---------+           +---------v---------+           +---------v---------+
        |  MetricDictionary |           |  ReportingEngine  |           | DashboardsService |
        |     Registry      |           | (Declarative AST) |           |  (Multi-Widget)   |
        +-------------------+           +---------+---------+           +-------------------+
                                                  |
                  +-------------------------------+-------------------------------+
                  |                               |                               |
        +---------v---------+           +---------v---------+           +---------v---------+
        |   SavedReports    |           |  ReportScheduler  |           |    Projections    |
        |  & Access Scopes  |           |  & Audit Trails   |           |    & Rebuild      |
        +-------------------+           +---------+---------+           +---------+---------+
                                                  |                               |
                                        +---------v---------+           +---------v---------+
                                        |   ReportExport    |           |   Ground Truth    |
                                        | (CSV Sanitization)|           |  Ledger Reconcile |
                                        +-------------------+           +-------------------+
```

### Pillar 1: Source of Truth Discipline & Read-Only Guarantees
- **Strict Read-Only Enforcement:** Analytics queries never issue writes, mutations, or side-effects to operational tables (`orders`, `stock_ledger_entries`, `journal_entries`, `crm_customers`, `fulfillments`).
- **No Competing Business Realities:** Metrics are derived directly from authoritative service contracts (`StockLedgerService`, `OrdersService`, `GeneralLedgerService`, `ProcurementService`, `LogisticsShipmentsService`, `CrmCustomersService`).
- **Isolation of Projections:** Read-model projections (`reporting_projections`) are completely decoupled from operational transaction loops. A failure in projection generation never rolls back or delays an operational transaction.

### Pillar 2: Centralized Metric Dictionary & Governance
- **Shared Definitions:** Every standard metric in the platform is cataloged in the shared registry (`STANDARD_METRIC_DEFINITIONS`), declaring name, owner domain, data type, aggregation type, inclusion/exclusion rules, and required RBAC permission.
- **Explicit Provenance:** Every metric explicitly declares its source nature:
  - `ACTUAL`: Derived from authoritative settled records (e.g., Gross Sales, On-Hand Stock, Posted COGS).
  - `ESTIMATED`: Derived from algorithmic approximations or historical averages.
  - `FORECAST`: Derived from pipeline probabilities or demand models (e.g., Projected Pipeline Value). Expressly barred from financial GL recognition.
  - `DERIVED`: Computed mathematically from multiple foundational metrics (e.g., Gross Margin Basis Points, ATP).

### Pillar 3: Safe Declarative Query Model (Zero Raw SQL Injection)
- **Declarative AST:** Clients cannot transmit raw SQL, arbitrary WHERE clauses, JavaScript functions, or ORM criteria. All queries use typed declarative descriptors (`ReportQueryDefinition`).
- **Strict Allowlists:**
  - Allowed sources: `sales_orders`, `stock_ledger`, `general_ledger`, `purchase_orders`, `shipments`, `crm_opportunities`, `reporting_projections`.
  - Allowed dimensions: `BRANCH`, `WAREHOUSE`, `CHANNEL`, `CATEGORY`, `PRODUCT`, `CUSTOMER`, `SUPPLIER`, `CARRIER`, `DATE_DAY`, `DATE_MONTH`, `DATE_YEAR`.
  - Allowed operators: `EQ`, `NEQ`, `GT`, `GTE`, `LT`, `LTE`, `IN`, `BETWEEN`.
- **Query Complexity Controls:** Hard caps of 10 metrics, 5 dimensions, 10 filter predicates, and a maximum row limit of 10,000 per request.

### Pillar 4: Pure Integer Rational Math & Basis Point Margins
- **No Floating-Point Arithmetic:** Financial and ratio values are represented purely in integer minor units or basis points ($10,000 = 100.00\%$).
- **Anti-Fallacy Multi-Entity Aggregation:** Margins across business units are always computed as:
  $$\text{Margin}_{\text{aggregate}} = \frac{\sum \text{Numerators}}{\sum \text{Denominators}} \times 10,000$$
  The platform prohibits the arithmetic averaging of branch percentages.
- **Single-Currency Enforcement:** Currency-sensitive metrics require explicit currency scoping. Summing mixed currency amounts without conversion is rejected at the domain level (`CROSS_CURRENCY_AGGREGATION_PROHIBITED`).

### Pillar 5: CSV Formula Injection Protection (Spreadsheet Armor)
- **Cell Sanitization:** Prior to exporting spreadsheet cells (`CSV`, `EXCEL`), every value is sanitized through `sanitizeCsvValue`.
- **Trigger Character Neutralization:** Values starting with formula execution triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`) are prepended with an apostrophe (`'`), preventing DDE, code execution, or remote exfiltration when opened in Excel, Google Sheets, or LibreOffice.

### Pillar 6: Deterministic Projection Rebuild & Drift Reconciliation
- **Snapshot Projections:** High-volume operational data is periodically snapshotted into `reporting_projections`.
- **Deterministic Reconciliation:** The engine includes `reconcileProjectionLedger`, which compares projected balances directly against authoritative ledger entries, identifies drift, records delta variances, and restores complete consistency without locking operational tables.

---

## 3. Database Schema Overview

The reporting schema is provisioned in `packages/database/src/schema/reporting.ts`:

1. `report_definitions`: System-defined and administrator-managed canonical report templates.
2. `saved_reports`: User-configured, versioned query configurations with scoping controls.
3. `report_schedules`: Automated execution triggers with cadence (Daily, Weekly, Monthly, Cron) and distribution channels (Email, Webhook, Storage).
4. `report_execution_logs`: Immutable audit trail of scheduled runs, execution duration, status, row count, and failure reasons.
5. `analytics_dashboards`: Configurable multi-widget layout dashboards with role-based visibility.
6. `reporting_projections`: Materialized dimensional aggregates for low-latency operational reporting.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Permission Code | Role / Persona | Operational Scope |
|---|---|---|
| `reporting.dashboard.view` | Executive Viewer, Reporting Analyst, Auditor | View dashboards and assigned widgets |
| `reporting.dashboard.manage` | Reporting Analyst, Administrator | Create and modify layout configurations |
| `reporting.report.view` | All authorized staff | Execute and review reports |
| `reporting.report.create` | Reporting Analyst, Branch Manager | Save custom report configurations |
| `reporting.report.manage` | Reporting Analyst, Administrator | Edit and delete saved reports |
| `reporting.report.schedule` | Reporting Analyst, Operations Lead | Configure automated dispatches |
| `reporting.report.export` | Financial Auditor, Reporting Analyst | Export CSV, JSON datasets |
| `reporting.financial.view` | Financial Auditor, Executive Viewer | Access General Ledger metrics and margin breakdowns |
| `reporting.projection.rebuild` | System Administrator, Technical Lead | Trigger deterministic ledger reconciliations |
