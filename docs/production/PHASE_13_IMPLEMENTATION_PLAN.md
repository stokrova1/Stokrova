# STOKROVA — Phase 13 Implementation Plan
## Production Readiness, Deployment Engineering, Disaster Recovery & Operational Resilience

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `PRODUCTION_READY` / `PRODUCTION_READINESS_CONDITIONALLY_APPROVED`  
**Execution Lead:** Antigravity Autonomous Systems & SRE Lead  
**Date:** October 13, 2026  
**Status:** In Progress — Active Engineering Phase

---

## 1. Verified Deployment Topology

The STOKROVA architecture follows a modular monolith with decoupled multi-tier clients, event-driven transactional outbox, and strict cryptographic tenant isolation.

```text
                                  [ INTERNET / CLIENT TRAFFIC ]
                                                │
                     ┌──────────────────────────┼──────────────────────────┐
                     │                          │                          │
              [ Desktop POS ]            [ Mobile Client ]         [ Web Admin UI ]
              Tauri / SQLite             React Native / SQLite       Nginx / Static
              (Offline-First)            (Offline-First)          (HTTPS / TLS 1.3)
                     │                          │                          │
                     └──────────────────────────┼──────────────────────────┘
                                                │
                                      [ REVERSE PROXY / CDN ]
                                       Cloudflare / TLS 1.3
                                       DDoS Armor & Rate Limiting
                                                │
                                                ▼
                                    [ NESTJS API GATEWAY ]
                                     Port 3000 / Prefix: /v1
                                 Security Headers (CSP, HSTS)
                                  Sliding-Window Rate Limiter
                                 JWT Verification & TenantGuard
                                                │
                ┌───────────────────────────────┼───────────────────────────────┐
                ▼                               ▼                               ▼
       [ POSTGRESQL (SUPABASE) ]       [ REDIS CACHE & LOCKS ]       [ CLOUDFLARE R2 ]
        Postgres 18 / Supabase          Redis 7 / Memory Cluster      S3-Compatible Object Store
        Port 5432 (SSL Required)        Distributed Locks             Assets, Receipts, Reports
        Row Level Security (RLS)        Idempotency Keys              Private Buckets + Signed URLs
        Transactional Outbox Ledger     Worker Leases & Caching
```

### Component Tiers & Isolation Boundaries

1. **Public Edge Tier**: Cloudflare CDN / Nginx Ingress terminating TLS 1.3, enforcing DDoS rate limits, CORS origin filtering (`CORS_ALLOWED_ORIGINS`), and HTTP security headers (`nosniff`, `DENY`, strict CSP, HSTS).
2. **Frontend Tier**: 
   - `apps/admin-web`: Compiled static SPA served via hardened Nginx container. Zero server secrets bundled.
   - `apps/pos-desktop`: Native Tauri desktop application with local embedded SQLite and cryptographic sync outbox.
   - `apps/mobile`: Native mobile application with local SQLite cache, offline queue, and hardware scanner drivers.
3. **Application API Tier**: `apps/api`: NestJS modular monolith running on Node.js 24 LTS, containerized on Alpine Linux with `dumb-init` signal handling and non-root execution (`stokrova:1001`).
4. **Data & Storage Tier**: 
   - Managed PostgreSQL 18 via Supabase with transaction connection pooler (port 6543) and session pooler (port 5432).
   - PostgreSQL Row Level Security (RLS) active on all tenant tables (`0013_security_hardening_rls.sql`).
   - Redis cluster for distributed locking, idempotency cache, and rate-limiting counters.
   - Cloudflare R2 / S3-compatible private object store for customer uploads, generated PDFs, and exports.

---

## 2. Components and Infrastructure Required in Production

| Component | Technology | Role | Redundancy / HA Strategy |
| :--- | :--- | :--- | :--- |
| **API Server** | Node.js 24 LTS / NestJS 11 | Core business domain, REST API, sync coordinator | Minimum 2 replicas behind load balancer |
| **Admin Web Console** | Nginx Alpine / HTML5 SPA | Administrative back-office interface | Multi-region CDN static edge distribution |
| **POS Desktop Client** | Tauri / Rust / SQLite | Point-of-Sale checkout, offline ledger | Local client database with background outbox sync |
| **Mobile Client** | React Native / SQLite | Warehouse scanning, receiving, dispatch | Local client database with background outbox sync |
| **Database** | PostgreSQL 18 (Supabase) | Authoritative transactional record | Multi-AZ managed HA with continuous WAL archiving |
| **Database Pooler** | Supabase Pooler (PgBouncer) | Connection multiplexing & pool management | Dual pooler (transaction pool :6543, session :5432) |
| **Distributed Cache** | Redis 7+ | Idempotency keys, rate limiters, session lock | Master-Replica with automated failover |
| **Object Storage** | Cloudflare R2 / S3 | Immutable documents, photos, PDF invoices | 99.999999999% (11 9s) durability multi-region |
| **Identity & Auth** | Supabase Auth / RFC 7519 JWT | Cryptographic identity verification | Stateless HMAC-SHA256 / JWKS public key rotation |

---

## 3. Existing Deployment Mechanisms

- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/ci.yml`) triggering on pushes to `main`, `master`, and `feature/**` branches.
- **Quality Gate**: Automatic monorepo dependency installation (`pnpm install --frozen-lockfile`), static typecheck (`pnpm -r run typecheck`), build gate (`pnpm -r run build`), automated test suites (>1,515 tests), and Apex Global full-day business simulation.
- **Container Build Gate**: Multi-stage Docker build for `apps/api/Dockerfile` and `apps/admin-web/Dockerfile`.
- **Database Migrations**: Drizzle ORM migration journal (`packages/database/drizzle/meta/_journal.json`) managing sequential numbered migrations (`0000` through `0013`).

---

## 4. Environment and Configuration Boundaries

Strict separation between development, staging, and production environments:

- **Development (`NODE_ENV=development`)**: Local fallback database, mocked object storage, local Redis, debug logs enabled.
- **Test (`NODE_ENV=test`)**: In-memory and decoupled mock fixtures, test bypass headers (`x-test-*`) permitted exclusively in test runners.
- **Staging (`NODE_ENV=staging`)**: Mirror of production topology with synthetic data, staging Supabase instance, strict secret validation.
- **Production (`NODE_ENV=production`)**: 
  - `x-test-*` bypass headers strictly rejected by `AuthGuard` and `TenantGuard`.
  - Missing `DATABASE_URL` or `JWT_SECRET` causes immediate, fatal startup crash (`ConfigValidationError`).
  - Strict CORS origin allowlist enforced.
  - Zero development fallback secrets permitted.
  - Production stack traces sanitized in HTTP 500 responses (`GlobalHttpExceptionFilter`).
  - Sensitive parameters (`token`, `secret`, `password`, `api_key`) redacted in all structured logs.

---

## 5. Database Migration and Rollback Strategy

STOKROVA follows an **Expand-and-Contract** database migration discipline to guarantee zero-downtime rolling updates:

1. **Expand**: Add new tables, nullable columns, and non-breaking constraints. Both old and new application versions remain fully operational.
2. **Deploy Application**: Roll out new application version that dual-writes or transitions reads/writes to the new schema.
3. **Backfill**: Execute idempotent background batch scripts to populate historical data.
4. **Contract**: In a subsequent migration, add `NOT NULL` constraints, remove obsolete columns or tables, and finalize indices.

### Safety Invariants
- Migrations must never drop production financial or inventory tables (`stock_ledger`, `orders`, `invoices`, `journal_entries`).
- Every migration must be tested in staging against realistic dataset volume before applying to production.
- RLS policies (`0013_security_hardening_rls.sql`) must remain active and enforced across all migrations.

---

## 6. Backup and Disaster-Recovery Design

- **RPO (Recovery Point Objective)**: $\le 15$ minutes (via automated WAL archiving and point-in-time recovery).
- **RTO (Recovery Time Objective)**: $\le 60$ minutes for full database and application failover.
- **Authoritative Ledgers**:
  - Stock is mathematically derived: $\text{Stock} = \sum(\text{Movements})$. Stock balances are verified projections, never arbitrary assignments.
  - Financial journals are immutable and double-entry balanced ($\sum \text{Debits} = \sum \text{Credits}$).
  - Merkle audit tree cryptographic roots guarantee tamper-evidence across all historical audit records.

---

## 7. Health Checks, Monitoring, and Alerting

### Health Endpoints
- `GET /v1/health/live`: Process liveness probe. Fast, non-blocking check verifying that the Node.js event loop is responsive.
- `GET /v1/health/ready`: Readiness probe. Actively verifies connectivity to PostgreSQL database pool, Redis cache, and configuration validity. Returns HTTP 503 if database connection fails.
- `GET /v1/health/metrics`: Operational metrics snapshot (request volume, error rates, average latency, memory consumption, uptime).

### Alerting Tiers
- **P1 Critical (Immediate Page)**: API error rate $> 5\%$ over 5m, Database pool saturation $> 90\%$ or connection down, RLS policy bypass attempt detected.
- **P2 Warning (15m Response)**: Background outbox queue backlog $> 500$ events, Redis cache degraded, average response latency $> 500\text{ms}$.
- **P3 Info (Next Business Day)**: Non-critical third-party webhook delivery retries, automated SSL certificate renewal notifications.

---

## 8. Operational Risk Assessment

| Risk Category | Likelihood | Impact | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Cross-Tenant Data Leakage** | Low | Catastrophic | Double-layer isolation: `TenantGuard` at API gateway + PostgreSQL Row Level Security (RLS) in database session |
| **Credential Compromise** | Low | High | Documented credential rotation runbook; zero secrets in frontend code; automated secret scanning in CI |
| **Pooled Connection Context Leakage** | Low | High | Use `SET LOCAL app.current_tenant_id` inside explicit transactions to guarantee clean context clearance on transaction completion |
| **Worker Duplication / Double Charge** | Medium | Critical | Idempotency keys (`idempotency-key` header) enforced; transactional outbox pattern; provider state reconciliation before capture |
| **External Integration Outage** | Medium | Medium | Circuit-breakers on external adapters; async queue buffering; graceful degradation of non-core features |

---

## 9. Recovery-Test Scenarios

The test matrix must validate 10 deterministic failure and recovery scenarios:
1. API container restart and graceful signal handling (`SIGTERM` / `SIGINT`).
2. Immediate recovery from database connection interruption.
3. Strict rejection of `x-test-*` headers when `NODE_ENV=production`.
4. Mandatory configuration validation failures on missing production secrets.
5. Pooled database connection switching between Tenant A and Tenant B with zero context bleed.
6. Row-Level Security policy enforcement blocking cross-tenant queries.
7. Idempotent outbox event replay with zero duplicate financial or inventory effects.
8. Merkle audit tree detection of tampered historical financial records.
9. Readiness probe failure (HTTP 503) when database connection is severed.
10. Synthetic full business day simulation verifying commerce, POS, warehouse, inventory, and finance consistency.

---

## 10. Release and Rollback Procedures

- Pre-flight checklist execution (`RELEASE_AND_ROLLBACK_CHECKLIST.md`).
- Automated database migration pre-check.
- Blue/Green or Canary deployment with automated health check probe verification.
- Post-deployment smoke test execution against staging/production endpoints.
- Immediate rollback trigger if readiness probes fail or error rate exceeds threshold within 10 minutes of rollout.

---

## 11. Acceptance Criteria for `PRODUCTION_READY`

1. **Build & Typecheck**: Monorepo builds cleanly with zero TypeScript errors.
2. **Test Suite**: 100% of unit, integration, and security regression tests pass.
3. **Supply Chain**: Zero known high or critical vulnerabilities in `pnpm audit`.
4. **Secret Hardening**: Zero plaintext secrets in Git, zero secrets in frontend client builds.
5. **Database RLS**: Active RLS policies verified on PostgreSQL schema with scoped transaction context.
6. **Disaster Recovery**: Validated backup and recovery runbooks with deterministic test evidence.
7. **Complete Documentation**: All 11 required operational runbooks and reports compiled in `docs/production/`.

---

## 12. Environmental Prerequisites & Unverified Assumptions

- External hosting provider infrastructure (Supabase production tier, Cloudflare DNS/WAF, production Kubernetes cluster) access is maintained outside this repository.
- Live production cutover and DNS traffic switching require explicit scheduled maintenance windows and customer notification.
- In accordance with Rule 1.1, when live infrastructure credentials are intentionally withheld, repository-level artifacts, simulations, and test verifications will be executed and documented with complete transparency.
