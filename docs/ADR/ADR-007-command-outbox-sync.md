# ADR-007: Command / Outbox / Idempotency Synchronization

## Status
Accepted

## Context
Offline devices communicate over intermittent connections. Naive REST retries risk duplicate sales or charging customers multiple times. Whole-record last-write-wins (LWW) causes catastrophic data loss.

## Decision
Use a durable local outbox with client-generated `operation_id` values. The server processes operations through an idempotent inbox transaction (`sync_operations`), recording the result atomically with business changes and appending to an ordered change log (`sync_changes`). Clients pull new changes using monotonic sequence cursors.

## Consequences
- Guaranteed at-least-once delivery with exactly-once execution semantics.
- Network timeouts can be retried safely.
