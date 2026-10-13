# Business Platform — Phase 0 Architecture Package

Status: APPROVED / ARCHITECTURE BASELINE
Date: 2026-10-06
Audience: Human developer, Claude Code, Antigravity, future contributors

## Mission

Build a serious, multi-tenant business operating platform that works for:

- a single small trader shop
- a growing business
- multi-branch retail
- wholesale/distribution
- warehouses
- larger enterprises

The defining capability is **offline-first operation with reliable synchronization**. A branch or POS must continue performing supported business operations when internet access disappears and synchronize safely later.

This is a **new product architecture**. Reference repositories may be studied for domain ideas and implementation patterns, but they are not the product codebase unless a specific dependency is independently approved after license/security review.

## Non-negotiable principles

1. Inventory is a transaction/ledger system, not a mutable `product.stock` field.
2. Financial records are append-oriented and auditable; destructive edits are prohibited.
3. Offline operation is a first-class mode, not an HTTP cache.
4. Synchronization is based on commands/operations, idempotency, outbox/inbox processing, and change cursors.
5. Business logic belongs in domain/application layers, never in UI components.
6. Database access is isolated behind repositories/application services.
7. Every tenant boundary is enforced server-side and tested.
8. No feature may silently discard an offline operation.
9. No global "refetch everything" synchronization strategy.
10. Prefer a modular monolith before microservices.
11. Keep the platform TypeScript-first across server/web/mobile where practical.
12. Architecture decisions are recorded as ADRs.
13. Agents must read `CLAUDE.md` / `AGENTS.md` and relevant docs before changing architecture.
14. Every migration is reviewed and tested.
15. Performance, security, observability, backup, and recovery are production requirements—not post-launch tasks.

## Approved baseline

- Monorepo: pnpm workspaces
- Server: NestJS + TypeScript
- Primary database: PostgreSQL 18.x
- ORM: Drizzle ORM
- Cache/queues: Redis
- Web admin: React + Vite
- Server-state: TanStack Query
- Desktop POS: React + Tauri 2
- Mobile: React Native + Expo
- Local mobile/desktop database: SQLite
- Web local persistence where required: IndexedDB/Dexie
- Object storage: S3-compatible storage, initially Cloudflare R2-compatible
- Validation/contracts: Zod + generated API contracts where appropriate
- Tests: Vitest + Playwright + integration/load testing
- Observability: Sentry + OpenTelemetry
- CI: GitHub Actions
- Containers: Docker/Compose for local development
- API: versioned HTTP API with command-oriented write endpoints

## Current runtime baseline

Use Node.js 24 LTS for the initial development baseline and pin the exact version in the repository toolchain file. As of 2026-10-06, Node.js 24.x is LTS and Node.js 26.x is Current.

Use PostgreSQL 18.x for the server database. Do not deploy a beta PostgreSQL major version to production.

## Documents

- `ARCHITECTURE.md` — system shape and boundaries
- `DOMAIN_MODEL.md` — business domain and invariants
- `DATABASE.md` — relational schema blueprint
- `SYNC_PROTOCOL.md` — offline/synchronization protocol
- `SECURITY.md` — security architecture
- `API_CONVENTIONS.md` — API and application-layer rules
- `TESTING_STRATEGY.md` — quality strategy
- `IMPLEMENTATION_ROADMAP.md` — execution phases
- `MANUAL_SETUP.md` — things the human must perform
- `REFERENCE_PROJECTS.md` — repositories to study, not blindly merge
- `CLAUDE.md` — Claude Code rules
- `AGENTS.md` — agent collaboration rules

## Definition of "done" for Phase 0

Phase 0 is complete only when:

- architecture docs exist in the repository
- the repository is bootstrapped as a monorepo
- CI checks typecheck/lint/test
- a local PostgreSQL and Redis environment is reproducible
- tenancy and ID strategy are documented
- the inventory ledger model is documented
- the sync protocol is documented
- threat model assumptions are documented
- the first database migration is reproducible
- agents can build/test without inventing conflicting conventions
