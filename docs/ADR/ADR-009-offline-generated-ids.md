# ADR-009: Device-Generated Offline IDs

## Status
Accepted

## Context
Entities created on offline devices (sales, line items, customers, movements) cannot wait for server-assigned auto-incrementing serial IDs.

## Decision
Use time-ordered, collision-resistant IDs (UUIDv7 or ULID) generated client-side for all entities created offline. Database auto-increment integer IDs are prohibited as public business entity identifiers.

## Consequences
- Offline devices create parent-child entities (e.g. Sales and Sale Lines) with relational integrity before syncing.
- Server inbox can insert without primary key remapping.
