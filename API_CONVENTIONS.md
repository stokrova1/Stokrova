# API and Application Conventions

## 1. General rule

Reads can be query-oriented.

Writes are business-command-oriented.

## 2. Versioning

Use:

```text
/v1/
```

for the initial stable API.

Breaking API changes require a new version or documented migration strategy.

## 3. Read examples

```text
GET /v1/products
GET /v1/products/:id
GET /v1/inventory/balances
GET /v1/sales
GET /v1/reports/sales-summary
```

Large collections must support pagination and filtering.

## 4. Write examples

```text
POST /v1/commands/sales/create
POST /v1/commands/sales/complete
POST /v1/commands/sales/refund
POST /v1/commands/inventory/receive
POST /v1/commands/inventory/transfer
POST /v1/commands/inventory/adjust
POST /v1/commands/stock-count/submit
POST /v1/commands/purchases/receive
POST /v1/payments/capture
```

Exact routes can be refined during implementation, but the principle must remain.

## 5. Command envelope

Recommended:

```json
{
  "operation_id": "01...",
  "idempotency_key": "01...",
  "command": "inventory.receive",
  "schema_version": 1,
  "payload": {}
}
```

Do not generate an idempotency key on the server after the client request arrives for an offline-capable command.

## 6. Errors

Use stable machine-readable error codes.

Example:

```json
{
  "error": {
    "code": "INVENTORY_INSUFFICIENT_AVAILABLE",
    "message": "Insufficient available inventory.",
    "request_id": "..."
  }
}
```

Do not make clients parse human-readable messages to determine behavior.

## 7. Pagination

Use:

- offset pagination for small/admin convenience datasets
- cursor pagination for large/high-churn feeds such as ledger and sync changes

## 8. Filtering

Filtering must be allow-listed.

Never concatenate arbitrary client strings into SQL.

## 9. Transactions

An application command that changes multiple business tables must use one server transaction where atomicity is required.

## 10. Events

Use domain/application events internally.

Do not expose internal domain event names as a guaranteed public API unless explicitly versioned.

## 11. Idempotency

All externally retried commands must have idempotency behavior appropriate to their business semantics.

## 12. API contract generation

Use one source of truth for request/response schemas where possible.

Generate typed client contracts.

Client code should not hand-maintain duplicate DTO types.

## 13. HTTP semantics

Use conventional status codes, but clients should primarily branch on stable error codes and response schemas.

## 14. API security

Every protected endpoint must establish:

- authenticated actor
- tenant scope
- device scope when relevant
- permissions
- resource ownership

## 15. Admin UI data fetching

Use TanStack Query or the chosen server-state layer.

Avoid a giant global store containing all server data.

Global state should be reserved for UI/session concerns that truly need it.
