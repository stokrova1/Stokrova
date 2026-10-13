# ADR-008: Hybrid Transaction/Event Model Instead of Full Event Sourcing

## Status
Accepted

## Context
Full event sourcing (where all database rows exist only as replayed events) introduces immense operational complexity, slow ad-hoc queries, and difficult schema evolutions.

## Decision
Adopt a hybrid model:
1. Normal relational tables for entities with clear lifecycle states.
2. Immutable ledgers for inventory movements and accounting journals.
3. Transactional outbox and sync change log for offline synchronization.

## Consequences
- Preserves the query performance and ergonomic indexing of relational PostgreSQL.
- Delivers complete auditability and event replay where it matters most.
