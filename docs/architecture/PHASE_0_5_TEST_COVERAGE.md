# STOKROVA Phase 0.5 Test Coverage Assessment & Inventory

## 1. Executive Summary

As of Phase 0.5, the STOKROVA monorepo executes **207 automated tests across 33 test files with 100% pass rate (0 failures)**, zero TypeScript errors across all 7 workspace projects, and a successful production build.

```text
Scope: 7 workspace projects
- @stokrova/domain:         86 Tests PASSED (10 test files)
- @stokrova/validation:     32 Tests PASSED (8 test files)
- @stokrova/api:            89 Tests PASSED (15 test files)
----------------------------------------------------------------------
Total Passing Tests:        207 PASSED across 33 test files
```

### Critical Architectural Distinction
These 207 passing tests provide strong proof of **package compilation, domain invariant correctness in isolation, schema validation, and unit-level service execution**. 

However, they do **NOT** yet constitute proof that full multi-step business journeys (e.g., offline sale $\rightarrow$ outbox $\rightarrow$ reconnect $\rightarrow$ idempotent sync $\rightarrow$ general ledger posting $\rightarrow$ stock reconciliation) are production-ready. Full integration and stress tests are scheduled across subsequent phases.

---

## 2. Test Inventory by Domain & Test Classification

| Domain | Unit / DTO Tests | Domain Invariant Tests | Service / API Tests | Master Acceptance Tests | Total Tests |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Identity & Tenancy** | 3 (Zod) | 5 (Domain) | 8 (TenancyService, TenantGuard) | 1 (Acceptance) | **17** |
| **Scoped RBAC & Roles** | 3 (Zod) | 4 (Domain) | 9 (RbacService, RbacGuard) | 2 (Acceptance) | **18** |
| **Branches & Work Centers** | 5 (Zod) | — | 8 (BranchesService, WorkCentersService) | — | **13** |
| **Cash Registers & Tills** | — | 13 (Domain) | 13 (RegistersService) | 1 (Acceptance) | **27** |
| **Workflow Engine & DAG** | 3 (Zod) | 13 (Domain) | 7 (WorkflowsService) | 3 (Acceptance) | **26** |
| **Declarative Rules** | 3 (Zod) | 9 (Domain) | 7 (RulesService) | 1 (Acceptance) | **20** |
| **Payments & Receipts** | 3 (Zod) | 10 (Domain) | 5 (PaymentsService) | 2 (Acceptance) | **20** |
| **Devices Management** | — | — | 4 (DevicesService) | — | **4** |
| **Audit & Security Events** | 5 (Zod) | 9 (Domain) | 4 (AuditService) | 1 (Acceptance) | **19** |
| **Offline Sync & Invariant** | 7 (Zod) | 13 (Domain) | 8 (SyncService) | 1 (Acceptance) | **29** |
| **Inventory Core (Basics)** | — | 6 (Domain) | — | — | **6** |
| **Money Minor Units** | — | 4 (Domain) | — | — | **4** |
| **Health & Readiness** | — | — | 2 (HealthController) | 2 (Acceptance) | **4** |
| **Total** | **29** | **86** | **78** | **14** | **207** |

---

## 3. Missing Critical Tests & Gaps Identified

While Phase 0 and Phase 1 foundations are mathematically verified in memory, the following test categories are intentionally missing and must be delivered prior to production:

### 1. End-to-End Offline Reconnect Journeys
- **Current State**: `SyncService` verifies single-batch deduplication and monotonic cursors via in-memory mocks.
- **Missing Test**: An end-to-end integration test where a simulated SQLite client records 50 offline sales, loses network, reconnects, pushes outbox batches concurrently with another terminal, and confirms zero duplicate payments or stock drift.

### 2. Multi-Tier Location Tree Traversal Under Load
- **Current State**: Location schemas defined in TypeScript contracts.
- **Missing Test**: Query performance benchmark querying 100,000 bins across an 8-tier hierarchy via materialized path string patterns.

### 3. High-Concurrency Task Claiming Race Conditions
- **Current State**: Single-process lease expiration tested.
- **Missing Test**: Stress test launching 20 concurrent worker promises attempting to claim the identical picking task at the exact millisecond (`Promise.all`), verifying strict mutual exclusion.

### 4. Real PostgreSQL Container Integration Tests
- **Current State**: Tests execute with fast in-memory service doubles.
- **Missing Test**: Running Drizzle ORM against a real Dockerized Supabase PostgreSQL 18.x instance with row-level security (RLS) policies actively enabled.

---

## 4. Test Requirements by Phase

### Tests Required During Phase 1 (Operational Foundation Hardening)
- [x] Multi-role scope evaluation unit tests (Passed)
- [x] Register blind reconciliation variance math tests (Passed)
- [x] Lease-based task claim concurrency tests (Passed)
- [x] Payment idempotency key deduplication tests (Passed)
- [x] Monotonic change sequence cursor ordering tests (Passed)
- [ ] Dockerized Supabase PostgreSQL test runner integration

### Tests Required During Phase 2 (Product Master & Deep Inventory)
- [ ] Universal Variant Matrix generator dimension expansion tests
- [ ] Fractional UOM conversion precision and rounding protection tests
- [ ] Materialized path 8-tier location query benchmark tests
- [ ] FEFO batch priority sorting algorithm tests
- [ ] Unique serial number lifecycle state machine tests (preventing dual-location or duplicate sale)
- [ ] Immutable inventory movement ledger balance recalculation tests

### Tests Required Before Production Release
- [ ] Multi-tenant isolation penetration tests (attempting cross-tenant data access)
- [ ] Network partition chaos tests (killing database connection mid-sync)
- [ ] High-volume stress tests ($10,000\text{ req/sec}$ POS checkout benchmark)
- [ ] Hardware driver emulation tests (ESC/POS thermal printer byte stream verification)
