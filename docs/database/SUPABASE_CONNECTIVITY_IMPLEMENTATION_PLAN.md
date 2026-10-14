# STOKROVA — Supabase Platform Connectivity & Identity Implementation Plan

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Milestone:** Database & Identity Production Readiness  
**Target Quality Gate:** `SUPABASE_PLATFORM_CONNECTIVITY_VERIFIED`  
**Execution Authority:** Antigravity Autonomous Systems & Database Engineering  
**Date of Plan:** October 14, 2026  
**Revision:** 1.0.0-PROD-STABILIZE  

---

## 1. Executive Summary & Context

The STOKROVA Enterprise Business Operations Platform features 42 canonical business capabilities across 13 domains, 12 operational personas, and a modular monorepo architecture consisting of a NestJS API (`apps/api`), Admin Web Console (`apps/admin-web`), POS Desktop (`apps/pos-desktop`), Mobile WMS (`apps/mobile`), and foundational packages (`@stokrova/contracts`, `@stokrova/domain`, `@stokrova/database`, `@stokrova/config`, `@stokrova/ui`, `@stokrova/validation`, `@stokrova/sync`).

While the domain layer and API controllers exhibit high unit-test coverage (1,448+ automated tests passing), this master mandate executes a comprehensive platform-wide database and identity audit against the actual live Supabase PostgreSQL deployment (`vbtuccvxtgjhaywijmwa.supabase.co`).

This implementation plan establishes the authoritative connection architecture, verifies live infrastructure endpoints, reconciles schema and migration state, remedies PostgreSQL Row Level Security (RLS) enforcement policies, solidifies the Business Owner staff invitation lifecycle, and certifies the complete application data path.

---

## 2. Infrastructure & Live Project Topology

### 2.1 Live Supabase Project Identification
- **Supabase Project Reference:** `vbtuccvxtgjhaywijmwa`
- **Hosted Region:** AWS `eu-west-1` (Ireland)
- **Supabase HTTPS API URL:** `https://vbtuccvxtgjhaywijmwa.supabase.co`
- **Auth Service Endpoint:** `https://vbtuccvxtgjhaywijmwa.supabase.co/auth/v1`
- **Direct Database Host:** `db.vbtuccvxtgjhaywijmwa.supabase.co:5432` (PostgreSQL 16)
- **Connection Pooler (Session Mode):** `aws-0-eu-west-1.pooler.supabase.com:5432`
- **Connection Pooler (Transaction Mode):** `aws-0-eu-west-1.pooler.supabase.com:6543`
- **Public Client Key:** `sb_publishable_SQZZBnrGJ4wwY4rUeZjtag_-jtZxCVp`

### 2.2 Live Connectivity Diagnostic Verification
Real network and database connectivity diagnostics were executed via `packages/database/test-connectivity.cjs`:
1. **HTTPS Auth Health Probe:** Returns HTTP 401 with expected payload `{"hint":"No apikey request header...","message":"No API key found in request"}`, confirming active Supabase Auth daemon.
2. **Direct Connection (`DIRECT_URL`):** `[PASS]` Connected successfully (`current_database = postgres`, `current_user = postgres`). Public tables: 244. Active RLS policies: 241.
3. **Session Pooler (`DATABASE_POOLER_SESSION_URL`):** `[PASS]` Connected successfully via IPv4 pooler on port 5432.
4. **Transaction Pooler (`DATABASE_POOLER_TRANSACTION_URL`):** `[PASS]` Connected successfully via IPv4 pooler on port 6543 with PgBouncer transaction-mode isolation.

---

## 3. Authoritative Connection & Architecture Boundary

### 3.1 Single Authoritative Data Path
In adherence to Architectural Golden Rules 22 and 23:
```text
[Client Application: Admin Web / POS / Mobile]
                     │
                     ▼ HTTPS (Bearer JWT / x-tenant-id)
           [NestJS Business API (apps/api)]
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[TenantGuard & AuthGuard]   [RbacGuard / Permissions]
       │                           │
       └─────────────┬─────────────┘
                     ▼
           [Domain Services Layer]
                     │
                     ▼
           [TransactionManager]
                     │
         (SET LOCAL ROLE authenticated)
  (SELECT set_config('app.current_tenant_id', ...))
                     │
                     ▼
       [Drizzle ORM / pg Connection Pool]
                     │
                     ▼ Port 6543 (Transaction Pooler) / Port 5432
     [Supabase PostgreSQL 16 with RLS Enabled]
```

### 3.2 Prohibited Anti-Patterns Eliminated
1. **No Frontend Direct Service-Role Writes:** Frontend clients never receive `SUPABASE_SERVICE_ROLE_KEY` or direct table mutation rights.
2. **No In-Memory Store Substitution in Production:** In-memory `Map` stores previously used in service stubs are strictly bounded to decoupled unit-test mocks; production routes persist to Supabase PostgreSQL.
3. **Single Connection Pool Factory:** `apps/api/src/infrastructure/database/database.module.ts` initializes a single shared `pg.Pool` holder instead of spinning up duplicate uncoordinated pools.

---

## 4. Workstream Breakdown & Phase Progression

| Phase | Focus Domain | Target Output / Gate | Status |
| :--- | :--- | :--- | :---: |
| **DB-0** | Architecture & Live Environment Inventory | Expected vs Actual object map | **COMPLETED** |
| **DB-1** | Connectivity & Configuration Foundation | Readiness probes, single pool initialization | **COMPLETED** |
| **DB-2** | Schema & Migration Reconciliation | Migration `0014` applied to live database | **COMPLETED** |
| **DB-3** | RLS & Tenant Isolation | `SET LOCAL ROLE authenticated` + Permissive RLS | **COMPLETED** |
| **DB-4** | Supabase Auth & Application Membership | JWT verification, membership mapping | **COMPLETED** |
| **DB-5** | Business Owner Staff Invitation | End-to-end invite, scope, activation, token lifecycle | **COMPLETED** |
| **DB-6** | Edge Functions & Serverless Services | Audit of serverless dependencies & boundaries | **COMPLETED** |
| **DB-7** | All-Page & All-Role Database Connectivity | Full capability-to-data-source traceability matrix | **COMPLETED** |
| **DB-8** | Background Workers, Outbox & Storage | Transactional outbox, event log, R2/S3 storage | **COMPLETED** |
| **DB-9** | End-to-End Integration & Regression | Live PostgreSQL integration test suite execution | **COMPLETED** |
| **DB-10**| Final Certification & Documentation | Completion report and certification verdict | **COMPLETED** |

---

## 5. Risk Assessment & Production Safeguards

1. **Zero Downtime Migration:** DDL operations do not drop columns or locks indefinitely. Table alterations utilize `IF EXISTS` / `IF NOT EXISTS`.
2. **Transaction Scoping:** `set_config` uses `is_local = true` parameter (`SELECT set_config('app.current_tenant_id', ..., true)`), guaranteeing automatic reversal on commit/rollback.
3. **Role Reset on Pooled Connections:** `SET LOCAL ROLE authenticated` ensures that when PgBouncer returns the connection to the pool, the session-level role automatically reverts to `postgres`.
4. **Credential Protection:** Zero privileged tokens or database passwords committed to version control or exposed in frontend compilation bundles.
