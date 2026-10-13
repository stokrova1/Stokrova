# STOKROVA — Testing Architecture & Quality Assurance

## 1. Principles

1. **Deterministic Execution**: All tests are fast, hermetic, and deterministic. No flaky remote network calls or state leakage across tests.
2. **Domain Invariant Verification**: Domain rules (RFC 9562 UUIDv7, integer money arithmetic, audit immutability, slug sanitization) are thoroughly unit tested in isolation.
3. **Infrastructure Boundary Tests**: Transactions, idempotency caching, Redis distributed locks, storage pre-signing, and error formatting are verified via comprehensive integration tests.
4. **Critical Atomicity Rollback**: Section 39 invariant test (`transaction-outbox-audit.spec.ts`) proves that transactional rollbacks leave zero orphan outbox events, zero uncommitted audit records, and zero partial mutations.

---

## 2. Test Suites Summary

Across the monorepo, 339 tests run via Vitest:
- `packages/config/tests/`: Configuration validation, environment fail-fast rules, secret sanitization (4 tests).
- `packages/domain/tests/`: UUIDv7, money math, audit immutability, tenancy rules, catalog matrices, workflow state transitions (134 tests).
- `packages/validation/tests/`: Zod schemas for all domains (59 tests).
- `packages/sync/tests/`: Monotonic sequencing, conflict resolution, outbox contracts (4 tests).
- `apps/api/src/**/*.spec.ts`: Transaction manager, outbox rollback, idempotency service, Redis locks, storage provider, HTTP exception filter, RBAC guards, tenancy guards, health controllers (138 tests across 23 test suites).

---

## 3. Execution Commands

- Run all monorepo tests: `pnpm run test`
- Run workspace typecheck: `pnpm run typecheck`
- Run workspace build: `pnpm run build`
