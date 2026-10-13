# STOKROVA — Phase 1 Platform Foundation Specification & Runtime Architecture

## 1. Executive Summary

Phase 1 establishes the foundational runtime and infrastructure for **STOKROVA**, a production-grade, multi-tenant, offline-capable business operating platform designed to support commerce, inventory, point of sale, procurement, warehousing, double-entry financial journals, and graph workflows.

Phase 1 rigorously delivers:
- **Application Architecture**: NestJS modular monolith runtime with strictly isolated modules.
- **Database Layer**: PostgreSQL as authoritative system of record, managed via Drizzle ORM migrations (`0000_superb_risque.sql` with 33 core tables).
- **Identity Boundary**: Strict separation between Supabase Auth identity provider and STOKROVA application-level user records, tenant memberships, and roles.
- **Tenancy Hierarchy**: `Platform -> Tenant -> Company -> Branch -> Department -> Warehouse -> Storage Location`.
- **Dynamic Scoped RBAC**: Capabilities system decoupling permissions (`action:subject`), scopes (`tenant`, `company`, `branch`, `warehouse`), and dynamic user roles.
- **Transaction Manager**: ACID transaction infrastructure ensuring atomic execution of business mutations, audit logging, outbox events, and idempotency status.
- **Server-Side Idempotency**: Cryptographic SHA-256 payload hashing, distributed locking, in-progress conflict detection, and cached response replay.
- **Transactional Outbox**: Decoupled reliable domain event publishing with monotonic sequencing and UUIDv7 event identifiers.
- **Redis Infrastructure**: Tenant-isolated key namespacing (`stokrova:{tenantId}:{ns}:{key}`), distributed mutual exclusion locks, and graceful memory fallback.
- **Object Storage**: High-performance S3/R2 abstraction with server-side credential isolation and pre-signed URL issuance.
- **API Conventions**: Standardized JSON envelope `{ error: { code, message, requestId, details } }`, correlation tracking (`x-request-id`), and strict Zod validation.
- **Observability**: Structured JSON logging with tenant/request context and metrics instrumentation.
- **Health Checks**: Production-ready `/v1/health`, `/v1/health/live`, and `/v1/health/ready` liveness/readiness probes.
- **Quality Gates**: 339 automated unit, integration, and invariant tests passing across all workspace packages with 0 TypeScript errors.

---

## 2. Monorepo Structure

```text
STOKROVA/
├── apps/
│   └── api/                # Modular monolith NestJS REST API runtime
├── packages/
│   ├── config/             # Environment validation, typed Zod schemas, secret sanitization
│   ├── contracts/          # Shared DTOs, API error shapes, domain event contracts, storage/idempotency interfaces
│   ├── database/           # Drizzle ORM schema (33 tables), migrations, transaction helpers, seed data
│   ├── domain/             # Pure domain logic, UUIDv7, money math, RFC 9562 identifiers, invariant rules
│   ├── sync/               # Offline sync engine, monotonic sequence ordering, batch processing
│   ├── ui/                 # Shared UI component primitives and theme tokens
│   └── validation/         # Zod request validators for all platform domains
└── docs/
    ├── ADR/                # Architecture Decision Records (ADR-001 through ADR-020)
    └── architecture/       # Master domain specifications and platform runbooks
```

---

## 3. Strict Architectural Boundary Rules

1. **System of Record**: PostgreSQL is the single source of truth for business and financial state. Redis is never used as authoritative storage.
2. **Domain Isolation**: Domain logic in `packages/domain` contains zero dependencies on HTTP, NestJS controllers, Express, or browser APIs.
3. **Tenant Context**: No client-supplied tenant identifiers are blindly trusted. All requests resolve identity through authentication guards and verify tenant membership.
4. **Transaction Rollback Invariant**: When an atomic command fails, all mutations—including the outbox event and audit log—are rolled back together.
