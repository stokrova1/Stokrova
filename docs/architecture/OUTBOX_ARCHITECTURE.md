# STOKROVA — Transactional Outbox & Domain Event Architecture

## 1. Principles

1. **Dual-Write Elimination**: Critical business mutations and their corresponding integration/domain events are committed inside the exact same database transaction.
2. **Reliable Asynchronous Publishing**: Downstream message brokers, webhook dispatchers, offline sync engines, and audit consumers read from `outbox_events` without coupling database write latency to external network hops.
3. **Monotonic Ordering & RFC 9562 UUIDv7**: Event IDs are time-ordered UUIDv7 identifiers, ensuring deterministic sorting and chronological processing.

---

## 2. Event Model & Storage

Domain events follow the contract defined in `packages/contracts/src/events.ts`:

```typescript
export interface DomainEvent<TPayload = unknown> {
  eventId: string;          // UUIDv7
  tenantId: string;
  eventType: string;        // e.g. 'warehouse.created', 'order.paid'
  aggregateType: string;    // e.g. 'warehouse', 'order'
  aggregateId: string;
  occurredAt: string;       // ISO-8601 UTC
  payload: TPayload;
  metadata?: Record<string, unknown>;
  operationId?: string;
}
```

Stored in PostgreSQL table `outbox_events`:
- `id varchar(36) primary key`
- `tenant_id varchar(36) not null`
- `event_id varchar(36) not null unique`
- `event_type varchar(100) not null`
- `aggregate_type varchar(100) not null`
- `aggregate_id varchar(36) not null`
- `payload jsonb not null`
- `metadata jsonb`
- `status varchar(20) not null default 'PENDING'` (values: `PENDING`, `PUBLISHED`, `FAILED`)
- `attempts integer not null default 0`
- `occurred_at timestamp with time zone not null`
- `published_at timestamp with time zone`

---

## 3. Worker Processing & Delivery Guarantees

1. The outbox processor polls pending events (`where status = 'PENDING' order by occurred_at asc limit 50`).
2. Dispatches events to downstream consumers (RabbitMQ / Redis PubSub / Webhook queue).
3. Upon confirmed delivery, calls `markPublished(eventId)`.
4. On temporary failure, increments `attempts` and records `last_error`, supporting exponential backoff retry.
