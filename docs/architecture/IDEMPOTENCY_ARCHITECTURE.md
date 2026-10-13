# STOKROVA — Idempotency Architecture & Request De-duplication

## 1. Principles

1. **At-Least-Once Delivery Protection**: Prevents duplicate executions of critical operations (e.g., payment captures, inventory adjustments, order submissions) caused by network retries or client retransmissions.
2. **Tenant Scoped**: Every idempotency key is strictly partitioned by `tenant_id`. Key reuse across different tenants never produces collisions or access leaks.
3. **Payload Signature Verification**: Hashes incoming payloads using deterministic JSON canonicalization and SHA-256 (`computePayloadHash`). Any attempt to reuse a key with a conflicting payload or endpoint is rejected with `409 Conflict`.

---

## 2. Decision State Machine

```text
Incoming Request with 'Idempotency-Key'
                  │
        Does key exist for tenant?
       ┌──────────┴──────────┐
       ▼                     ▼
      No                    Yes
       │                     │
  Status: NEW        Compare request hash & route
       │            ┌────────┴────────┐
Acquire Redis lock  ▼                 ▼
Record PENDING   Mismatch           Match
       │            │                 │
 Execute API     Status: CONFLICT     Status of existing record?
       │         (Return 409)        ┌────────┴────────┐
       ▼                             ▼                 ▼
On Success: Set RESOLVED          PENDING           RESOLVED
On Error:   Set REJECTED             │                 │
Release Redis lock           Status: IN_PROGRESS  Status: RESOLVED
                             (Return 409 Retry)  (Replay cached body)
```

---

## 3. Storage & Distributed Locking

- **PostgreSQL Table**: `idempotency_records` provides authoritative persistence with columns `id`, `tenant_id`, `idempotency_key`, `request_hash`, `request_path`, `request_method`, `response_code`, `response_body`, `status`, `locked_until`.
- **Redis Lock**: Concurrently acquired under `stokrova:{tenantId}:lock:idempotency:{key}` to prevent race conditions across distributed API instances.
- **Interceptor Integration**: `IdempotencyInterceptor` automatically attaches to mutating HTTP endpoints receiving the `Idempotency-Key` header, transparently intercepting duplicates or caching responses.
