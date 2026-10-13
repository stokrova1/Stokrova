# STOKROVA — Audit & Security Event Architecture

## 1. Principles

1. **Strict Immutability**: The audit log is an append-only ledger of record. Updates and deletions are strictly prohibited (`assertAuditRecordImmutable('INSERT')` enforces this in the domain layer).
2. **Sensitive Data Redaction**: Passwords, authorization tokens, credit card PANs, secret keys, and encryption certificates are automatically redacted prior to persistence via `sanitizeSensitiveAuditData()`.
3. **Correlation Tracking**: Every audit event captures the HTTP `request_id` / trace identifier, actor user ID, device ID, and tenant scope.
4. **Security Classification**: Dedicated security events (`AUTH_FAILURE`, `PERMISSION_DENIED`, `RATE_LIMIT_TRIGGERED`) are classified by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

---

## 2. Audit Record Contract

From `packages/contracts/src/audit.ts`:

```typescript
export interface CreateAuditEventRequest {
  actor_user_id?: string;
  device_id?: string;
  action: string;             // e.g. 'CREATE', 'UPDATE', 'VOID', 'APPROVE'
  entity_type: string;        // e.g. 'warehouse', 'price_list', 'user'
  entity_id: string;
  occurred_at?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
}
```

Stored in PostgreSQL `audit_events`:
- `id varchar(36) primary key`
- `tenant_id varchar(36) not null references tenants(id)`
- `actor_user_id varchar(36)`
- `device_id varchar(36)`
- `action varchar(50) not null`
- `entity_type varchar(50) not null`
- `entity_id varchar(36) not null`
- `occurred_at timestamp with time zone not null`
- `request_id varchar(64)`
- `metadata jsonb`

---

## 3. Querying & Compliance

The `AuditService` provides filtered queries by `actor_user_id`, `entity_type`, `entity_id`, `action`, and ISO date ranges (`from_date`, `to_date`), sorted descending by event timestamp for forensic auditing and SOC2 / GDPR compliance.
