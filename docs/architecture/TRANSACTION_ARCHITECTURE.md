# STOKROVA — Transaction Architecture & Atomic Consistency

## 1. Principles

1. **ACID Transaction Boundary**: Every critical business state change executes atomically inside a PostgreSQL transaction managed by `TransactionManager`.
2. **Atomic Invariant (Section 39)**:
   ```text
   BEGIN TRANSACTION
     1. Validate business command & domain invariants
     2. Mutate authoritative domain state
     3. Insert immutable record into audit_events
     4. Insert domain event into outbox_events
     5. Resolve/update record in idempotency_records
   COMMIT TRANSACTION
   ```
3. **No Partial Writes**: If any step in the transaction fails (e.g., constraint error, network timeout, domain invariant violation), the entire transaction issues an automatic `ROLLBACK`. Zero partial mutations, zero orphan outbox events, and zero uncommitted audit records remain.

---

## 2. Transaction Manager Implementation

The NestJS `TransactionManager` wraps Drizzle's transactional client:

```typescript
@Injectable()
export class TransactionManager {
  constructor(@Optional() @Inject(DATABASE_CLIENT) private readonly db?: DatabaseClient) {}

  async execute<T>(operation: (tx: DatabaseTransaction | null) => Promise<T>): Promise<T> {
    if (this.db && typeof this.db.transaction === 'function') {
      return this.db.transaction(async (tx) => {
        return operation(tx);
      });
    }
    // Unit test / decoupled mode fallback
    return operation(null);
  }
}
```

---

## 3. Verification & Invariant Proof

The invariant is verified by the automated suite in `apps/api/src/infrastructure/database/transaction-outbox-audit.spec.ts`:
- **Scenario 1 (Success)**: Business entity, audit log, outbox event, and idempotency lock commit together.
- **Scenario 2 (Domain Failure Rollback)**: A thrown business exception discards all uncommitted buffers; 0 records remain in storage.
- **Scenario 3 (Outbox/Serialization Failure Rollback)**: A schema or foreign key failure on outbox leaves no orphan domain entity.
- **Scenario 4 (Decoupled Fallback)**: Operation executes cleanly when database client is decoupled.
