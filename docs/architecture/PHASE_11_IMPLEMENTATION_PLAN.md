# STOKROVA — Phase 11 Implementation Plan
## Enterprise Reporting, Analytics & Business Intelligence

**Milestone:** Phase 11 — Enterprise Reporting, Analytics & Business Intelligence  
**Previous Gate:** `READY_FOR_PHASE_11`  
**Target Gate:** `READY_FOR_PHASE_12`  
**Architecture:** Modular Monolith, TypeScript Monorepo, NestJS, PostgreSQL (Drizzle ORM), Pure Domain Engine, Multi-Tenant Scoped RBAC  

---

## 1. Executive Mission & Roadmap Alignment

Phase 11 establishes a production-grade, tenant-isolated Enterprise Reporting, Analytics, and Business Intelligence engine for the STOKROVA platform.

### Authoritative Roadmap Alignment
The roadmap established in `docs/architecture/MASTER_CAPABILITY_MAP.md` explicitly designates **Analytics & Reporting** as the authoritative focus following Phase 10 (Advanced Logistics). The previous quality gate `READY_FOR_PHASE_11` was certified upon completion of Phase 10. Phase 11 directly fulfills this mandate and targets `READY_FOR_PHASE_12`.

### Guiding Principle
> **"The business does not adapt itself to our software. Our software adapts itself to the business."**
- A solo merchant gets instant daily sales and stock summaries without data engineering complexity.
- A multi-branch or multi-entity enterprise can configure cross-branch operational dashboards, drill-downs, financial statements, and scheduled compliance exports.
- **Strict Read-Only Guarantee**: Analytics and reporting execution never mutates operational or financial state (no journal entries, no stock moves, no payment allocations, no loyalty deductions).
- **Source of Truth Discipline**: Reports consume authoritative operational records (stock ledger, posted General Ledger, confirmed sales orders, received POs, actual logistics charges) rather than inventing competing facts.

---

## 2. Capabilities Breakdown & System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                         STOKROVA PHASE 11 ANALYTICS & REPORTING ARCHITECTURE                      |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                                  SHARED METRIC DICTIONARY                                   |  |
|  |  (Stable Identifiers, Business Owner, Authoritative Domain, Integer Units, Basis Points)    |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                │                                                  |
|                                                ▼                                                  |
|  +---------------------------------------------------------------------------------------------+  |
|  |                         SAFE DECLARATIVE QUERY ENGINE & AST VALIDATOR                       |  |
|  |  (Strict Allowlists, Parameterized Filters, Zero Arbitrary SQL/Eval, Bounded Complexity)     |  |
|  +---------------------------------------------------------------------------------------------+  |
|                        │                                               │                          |
|                        ▼                                               ▼                          |
|  +-------------------------------------------+   +-------------------------------------------+    |
|  |       AUTHORITATIVE OPERATIONAL READS     |   |      INCREMENTAL ANALYTICAL PROJECTIONS   |    |
|  |  - StockLedgerService (On-Hand, ATP)      |   |  - Daily Metric Aggregations              |    |
|  |  - OrdersService (Gross/Net Sales, Lines) |   |  - Idempotent Event Updates               |    |
|  |  - GeneralLedgerService (P&L, Balance)    |   |  - Deterministic Rebuilds & Freshness     |    |
|  |  - ShipmentsService (On-Time, Failures)   |   +-------------------------------------------+    |
|  +-------------------------------------------+                         │                          |
|                        │                                               │                          |
|                        └───────────────────────┬───────────────────────┘                          |
|                                                ▼                                                  |
|  +---------------------------------------------------------------------------------------------+  |
|  |                               ENTERPRISE CONSUMPTION SURFACES                               |  |
|  |  - Role-Based Dashboards (Executive, Inventory, Sales, Finance, Logistics)                  |  |
|  |  - Versioned Saved Reports & Sharing Controls                                               |  |
|  |  - Scheduled Report Execution with Recovery                                                 |  |
|  |  - Secure Streaming Data Export (CSV Formula Injection Protection, JSONL, TTL Tokens)       |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Implementation Workstreams

### Workstream 1: Reconnaissance & Implementation Plan
- Inspect existing modules (`apps/api/src/analytics`, `apps/api/src/search-reporting`, `packages/domain/src/analytics.ts`).
- Establish authoritative Phase 11 baseline.

### Workstream 2: Shared Contracts (`packages/contracts/src/reporting.ts`)
- Metric Dictionary definitions (`MetricDefinition`, `MetricCategory`, `MetricAggregationType`).
- Safe Query Definition contracts (`ReportQueryDefinition`, `ReportFilter`, `ReportDimension`, `ReportExecutionResult`).
- Dashboard contracts (`Dashboard`, `DashboardWidget`, `DashboardLayout`).
- Saved Reports contracts (`SavedReport`, `ReportVersion`).
- Report Schedules contracts (`ReportSchedule`, `ScheduledExecutionRecord`).
- Data Export contracts (`ExportJob`, `ExportFormat`).

### Workstream 3: Database Schema & Migration (`packages/database/src/schema/reporting.ts`)
- 6 normalized PostgreSQL tables:
  1. `report_definitions`: Registered system and custom report definitions.
  2. `saved_reports`: User and tenant saved report queries with versioning.
  3. `report_schedules`: Recurrence schedules with next execution timestamps.
  4. `report_execution_logs`: Append-only audit history of executed reports.
  5. `analytics_dashboards`: Configurable dashboards with multi-widget layouts.
  6. `reporting_projections`: Materialized daily/periodic metric aggregations.
- Foreign keys with `onDelete: 'restrict'` referencing `tenants(id)`.
- Migration `0011_reporting_analytics.sql` registered in `_journal.json`.

### Workstream 4: Pure Domain Engine (`packages/domain/src/reporting.ts`)
- Metric Dictionary Registry with strict inclusion/exclusion rules.
- Declarative AST Query Validator enforcing field allowlists, bounding filters, and rejecting raw SQL or code strings.
- Pure Integer & Basis Points Math ($10000 = 100.00\%$) for margins, ratios, and growth rates without float drift.
- Deterministic Ratio calculation from aggregate numerators and denominators (preventing average-of-averages errors).
- CSV Formula Injection Sanitization (`sanitizeCsvCell`).
- Scoped Permissions & Role Templates (`REPORTING_ANALYST`, `FINANCIAL_AUDITOR`, `EXECUTIVE_VIEWER`) in `packages/domain/src/rbac.ts`.

### Workstream 5: Validation Schemas (`packages/validation/src/reporting.ts`)
- Zod schemas for query execution, saved reports, dashboard CRUD, scheduling, and exports.

### Workstream 6: API Services, Adapters & Controller (`apps/api/src/analytics/`)
- `MetricDictionaryService`: Enumerate metrics, descriptions, permissions, and data sources.
- `ReportingEngineService`: Executes validated query definitions across authoritative domain services.
- `SavedReportsService`: Manages versioned saved reports and sharing boundaries.
- `DashboardService`: Manages widget configurations, layouts, and role-scoped views.
- `ReportSchedulerService`: Handles automated scheduled runs and retry recovery.
- `ProjectionsService`: Manages incremental snapshots, idempotent updates, and rebuilds.
- `DataExportService`: Enhanced streaming export with cell escaping, row limits, and TTL tokens.
- `ReportingController`: REST API endpoints.

### Workstream 7: Master Acceptance Test Suite (`apps/api/src/analytics/analytics-phase11.spec.ts`)
- 35 scenarios covering metrics accuracy, query safety, tenant isolation, projections, and exports.

### Workstream 8: Monorepo Quality Gates & Dangerous Pattern Audit
- Recursive typecheck, build, and test verification.
- Audit for floats, direct GL mutations, SQL injection risks, and unisolated lookups.

### Workstream 9: Architecture Documentation Deliverables & Final Gate
- Deliver `PHASE_11_ANALYTICS_AND_REPORTING_MODEL.md`, `PHASE_11_METRIC_DICTIONARY.md`, `PHASE_11_TEST_COVERAGE.md`, `PHASE_11_COMPLETION_REPORT.md` (`READY_FOR_PHASE_12`).
