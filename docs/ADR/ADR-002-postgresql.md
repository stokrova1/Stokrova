# ADR-002: PostgreSQL as Central Source of Truth

## Status
Accepted

## Context
Enterprise inventory, procurement, and double-entry accounting require strong consistency, ACID transactions, relational integrity, and strict isolation levels.

## Decision
Use PostgreSQL 18.x with Drizzle ORM as the primary central database. Reject unstructured document stores (MongoDB, JSON files) or Firebase for primary business state.

## Consequences
- Guaranteed relational integrity and foreign key constraints.
- Native transaction isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) protect critical balance invariants.
