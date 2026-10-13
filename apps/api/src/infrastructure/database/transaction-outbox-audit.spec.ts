import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionManager } from './transaction.manager.js';
import { createDomainEvent, generateUuidV7 } from '@stokrova/domain';
import type { DatabaseClient, DatabaseTransaction } from '@stokrova/database';

describe('Transaction Atomicity & Outbox / Audit Invariant (Phase 1 Specification Section 39)', () => {
  let transactionManager: TransactionManager;

  // Transaction simulation store to verify atomic commit and rollback
  const committedStorage = {
    entities: new Map<string, any>(),
    auditRecords: new Map<string, any>(),
    outboxEvents: new Map<string, any>(),
    idempotencyRecords: new Map<string, any>(),
  };

  const createMockDbClient = (shouldThrowOnCommit = false): DatabaseClient => {
    return {
      transaction: async <T>(cb: (tx: DatabaseTransaction) => Promise<T>): Promise<T> => {
        // Staging buffer simulating PostgreSQL WAL / transaction buffer
        const uncommittedBuffer = {
          entities: new Map<string, any>(),
          auditRecords: new Map<string, any>(),
          outboxEvents: new Map<string, any>(),
          idempotencyRecords: new Map<string, any>(),
        };

        const mockTx = {
          insert: (_table: any) => ({
            values: async (data: any) => {
              const id = data.id || generateUuidV7();
              uncommittedBuffer.entities.set(id, data);
              return [data];
            },
          }),
          staging: uncommittedBuffer,
        } as unknown as DatabaseTransaction;

        try {
          const result = await cb(mockTx);
          if (shouldThrowOnCommit) {
            throw new Error('Database serialization conflict during COMMIT');
          }

          // COMMIT: Flush staged changes to authoritative storage
          for (const [k, v] of uncommittedBuffer.entities) committedStorage.entities.set(k, v);
          for (const [k, v] of uncommittedBuffer.auditRecords) committedStorage.auditRecords.set(k, v);
          for (const [k, v] of uncommittedBuffer.outboxEvents) committedStorage.outboxEvents.set(k, v);
          for (const [k, v] of uncommittedBuffer.idempotencyRecords) committedStorage.idempotencyRecords.set(k, v);

          return result;
        } catch (err) {
          // ROLLBACK: Discard uncommitted buffer completely!
          uncommittedBuffer.entities.clear();
          uncommittedBuffer.auditRecords.clear();
          uncommittedBuffer.outboxEvents.clear();
          uncommittedBuffer.idempotencyRecords.clear();
          throw err;
        }
      },
    } as unknown as DatabaseClient;
  };

  beforeEach(() => {
    committedStorage.entities.clear();
    committedStorage.auditRecords.clear();
    committedStorage.outboxEvents.clear();
    committedStorage.idempotencyRecords.clear();
  });

  it('Scenario 1 (Success): Commits business mutation, audit event, and outbox event atomically', async () => {
    const mockDb = createMockDbClient(false);
    transactionManager = new TransactionManager(mockDb);

    const tenantId = 'ten_tenant_01';
    const entityId = generateUuidV7();
    const idempotencyKey = 'idem-req-success-100';

    await transactionManager.execute(async (tx) => {
      // 1. Business mutation (e.g. branch creation or state update)
      const mockTx = tx as any;
      mockTx.staging.entities.set(entityId, {
        id: entityId,
        tenant_id: tenantId,
        name: 'Central Distribution Warehouse',
      });

      // 2. Outbox domain event
      const event = createDomainEvent({
        tenantId,
        eventType: 'warehouse.created',
        aggregateType: 'warehouse',
        aggregateId: entityId,
        payload: { name: 'Central Distribution Warehouse' },
      });
      mockTx.staging.outboxEvents.set(event.eventId, event);

      // 3. Audit log record
      mockTx.staging.auditRecords.set(generateUuidV7(), {
        tenant_id: tenantId,
        action: 'CREATE',
        entity_type: 'warehouse',
        entity_id: entityId,
      });

      // 4. Idempotency lock
      mockTx.staging.idempotencyRecords.set(idempotencyKey, {
        tenant_id: tenantId,
        idempotency_key: idempotencyKey,
        status: 'RESOLVED',
      });
    });

    // Verify all records committed atomically
    expect(committedStorage.entities.size).toBe(1);
    expect(committedStorage.entities.get(entityId).name).toBe('Central Distribution Warehouse');
    expect(committedStorage.outboxEvents.size).toBe(1);
    expect(committedStorage.auditRecords.size).toBe(1);
    expect(committedStorage.idempotencyRecords.size).toBe(1);
  });

  it('Scenario 2 (Rollback on Business Failure): Rolls back all changes when domain invariant fails', async () => {
    const mockDb = createMockDbClient(false);
    transactionManager = new TransactionManager(mockDb);

    const tenantId = 'ten_tenant_01';
    const entityId = generateUuidV7();

    await expect(
      transactionManager.execute(async (tx) => {
        const mockTx = tx as any;
        // 1. Business mutation attempted
        mockTx.staging.entities.set(entityId, {
          id: entityId,
          tenant_id: tenantId,
          name: 'Invalid Warehouse',
        });

        // 2. Audit record staged
        mockTx.staging.auditRecords.set(generateUuidV7(), {
          tenant_id: tenantId,
          action: 'CREATE',
          entity_type: 'warehouse',
          entity_id: entityId,
        });

        // 3. Domain invariant violation throws error
        throw new Error('DomainInvariantViolation: Warehouse code must be unique within tenant');
      }),
    ).rejects.toThrow('DomainInvariantViolation');

    // Authoritative committed storage must have ZERO records
    expect(committedStorage.entities.size).toBe(0);
    expect(committedStorage.outboxEvents.size).toBe(0);
    expect(committedStorage.auditRecords.size).toBe(0);
    expect(committedStorage.idempotencyRecords.size).toBe(0);
  });

  it('Scenario 3 (Rollback on Outbox/Serialization Failure): Leaves no orphan entity when outbox fails', async () => {
    const mockDb = createMockDbClient(false);
    transactionManager = new TransactionManager(mockDb);

    const tenantId = 'ten_tenant_01';
    const entityId = generateUuidV7();

    await expect(
      transactionManager.execute(async (tx) => {
        const mockTx = tx as any;
        mockTx.staging.entities.set(entityId, { id: entityId, tenant_id: tenantId });
        mockTx.staging.auditRecords.set(generateUuidV7(), { tenant_id: tenantId, action: 'UPDATE' });

        // Simulating schema constraint failure on outbox
        throw new Error('DatabaseError: foreign key violation in outbox_events');
      }),
    ).rejects.toThrow('DatabaseError');

    // No orphan entity in authoritative storage
    expect(committedStorage.entities.has(entityId)).toBe(false);
    expect(committedStorage.auditRecords.size).toBe(0);
    expect(committedStorage.outboxEvents.size).toBe(0);
  });

  it('Scenario 4 (Decoupled Fallback): Executes callback safely when database client is absent', async () => {
    const noDbTransactionManager = new TransactionManager(undefined);
    let executed = false;

    const result = await noDbTransactionManager.execute(async (tx) => {
      expect(tx).toBeNull();
      executed = true;
      return 'OK';
    });

    expect(executed).toBe(true);
    expect(result).toBe('OK');
  });
});
