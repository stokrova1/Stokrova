# Testing Strategy

## 1. Quality philosophy

The system must be proven correct in the places where errors are expensive:

- inventory
- money
- permissions
- synchronization
- recovery

A passing happy-path UI test is not sufficient.

## 2. Test layers

### Unit

Pure domain logic:

- price calculation
- tax calculation
- stock balance math
- state transitions
- journal balancing
- permission evaluation
- conflict classification

### Integration

- PostgreSQL repositories
- transactions
- locking
- migrations
- Redis adapters
- object storage
- command handlers

### Contract

- API request/response schemas
- sync envelope
- error codes
- compatibility across client/server versions

### E2E

- login
- catalog
- purchasing
- sales
- returns
- stock count
- reports
- device registration

### Sync simulation

Must model:

- offline period
- multiple devices
- duplicate submissions
- timeouts
- reconnect
- out-of-order arrival
- partial batch acceptance
- server restart
- client crash
- cursor replay
- conflicts

### Load

Measure:

- API throughput
- sale creation latency
- sync push batch throughput
- sync pull latency
- inventory query latency
- report generation
- concurrent POS use

### Security

Automate:

- cross-tenant access
- unauthorized commands
- invalid device
- revoked device
- replayed operations
- token/session abuse
- input validation bypasses

## 3. Critical invariant tests

Example:

```text
Initial stock = 100

Device A offline:
  sale 10

Device B offline:
  sale 15

Reconnect both

Final ledger:
  -10
  -15

Final on-hand:
  75
```

The test must also prove:

- no duplicated sale
- no duplicated payment
- no lost sale
- idempotent retry
- correct audit trail

## 4. Accounting invariant

Every posted journal entry:

```text
SUM(debit) == SUM(credit)
```

No exceptions.

## 5. Migration testing

For every migration:

- clean install
- previous-version upgrade
- seed data migration
- rollback strategy where applicable
- performance characteristics for large tables

## 6. Property-based / generative testing

Where practical, generate random sequences of:

- sales
- purchases
- transfers
- returns
- adjustments

and verify that:

```text
ledger-derived balance == materialized operational balance
```

## 7. Recovery tests

Simulate failures at:

- before local commit
- after local commit / before push
- after request send / before response
- after server commit / before response
- during pull application
- during cursor advancement

The system must converge without duplicate or lost committed operations.

## 8. Definition of release readiness

A feature that affects inventory/finance cannot ship until:

- domain tests pass
- integration tests pass
- sync tests pass if offline-capable
- authorization tests pass
- migration tests pass
- observability exists
- rollback/recovery behavior is understood
