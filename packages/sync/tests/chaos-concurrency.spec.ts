import { describe, it, expect } from 'vitest';
import {
  ClientOutboxOrchestrator,
  ClientPullEngine,
  SyncHeartbeatManager,
} from '../src/index.js';
import {
  compareVectorClocks,
  mergeVectorClocks,
  incrementVectorClock,
  resolveMasterEntityConflict,
  isAppendOnlyCommand,
  type VectorClock,
} from '@stokrova/domain';

describe('Phase 25 @stokrova/sync — Chaos, Multi-Master & Concurrency Suite', () => {
  const tenantId = 'tenant_enterprise_chaos_01';

  describe('Chaos Scenario 1: Multi-Client Concurrent Outbox Mutations (Rule 18, 19)', () => {
    it('handles 10 concurrent client nodes generating monotonically sequenced operations without collision', () => {
      const clientCount = 10;
      const opsPerClient = 20;
      const clientOrchestrators: ClientOutboxOrchestrator[] = [];

      // Initialize 10 distinct client nodes
      for (let i = 0; i < clientCount; i++) {
        clientOrchestrators.push(new ClientOutboxOrchestrator());
      }

      // Concurrently queue 20 operations per node
      for (let i = 0; i < clientCount; i++) {
        const orch = clientOrchestrators[i]!;
        for (let j = 0; j < opsPerClient; j++) {
          orch.enqueueOperation({
            tenant_id: tenantId,
            device_id: `client_node_${i + 1}`,
            actor_user_id: `cashier_${i}`,
            command_type: 'sales.create',
            entity_id: `order_c${i}_${j}`,
            payload: { amount_minor: 5000, item_count: 2 },
          });
        }
      }

      // Verify each client maintains independent strictly monotonic sequences
      for (let i = 0; i < clientCount; i++) {
        const orch = clientOrchestrators[i]!;
        expect(orch.getPendingCount()).toBe(opsPerClient);

        const batch = orch.preparePushBatch(opsPerClient);
        expect(batch).not.toBeNull();
        expect(batch?.operations).toHaveLength(opsPerClient);

        // Sequence monotonicity check
        for (let k = 0; k < batch!.operations.length; k++) {
          expect(batch!.operations[k]?.client_sequence).toBe(k + 1);
        }
      }
    });
  });

  describe('Chaos Scenario 2: Network Partition, Extended Offline Operation & Burst Reconnect (Rule 24)', () => {
    it('accumulates 50 offline mutations during network partition and flushes without data loss', () => {
      const heartbeat = new SyncHeartbeatManager({ deviceId: 'pos_terminal_offline_42', failureThreshold: 3 });
      const orchestrator = new ClientOutboxOrchestrator();

      // 1. Initial online state
      expect(heartbeat.getLivenessStatus()).toBe('ONLINE');

      // 2. Network partition occurs: 3 consecutive failure pulses
      heartbeat.recordSyncFailure('ETIMEDOUT: Connection reset by peer');
      heartbeat.recordSyncFailure('ENETUNREACH: Network unreachable');
      heartbeat.recordSyncFailure('ECONNREFUSED: Server offline');
      expect(heartbeat.getLivenessStatus()).toBe('DEGRADED');

      // 3. Cashier executes 50 sales completely offline
      const operationIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const op = orchestrator.enqueueOperation({
          tenant_id: tenantId,
          device_id: 'pos_terminal_offline_42',
          actor_user_id: 'cashier_01',
          command_type: 'sales.create',
          entity_id: `sale_offline_${i + 1}`,
          payload: { ticket_id: `t_${i}`, total_minor: 1200 },
        });
        operationIds.push(op.operation_id);
      }

      expect(orchestrator.getPendingCount()).toBe(50);

      // 4. Network restored: heartbeat pulse succeeds
      heartbeat.recordSyncSuccess('PUSH', 120);
      expect(heartbeat.getLivenessStatus()).toBe('ONLINE');

      // 5. Burst reconnect: package batch in chunks of 25
      const chunk1 = orchestrator.preparePushBatch(25);
      expect(chunk1).not.toBeNull();
      expect(chunk1?.operations).toHaveLength(25);

      // Acknowledge chunk 1 from server
      orchestrator.processPushResponse({
        results: chunk1!.operations.map((op, idx) => ({
          operation_id: op.operation_id,
          status: 'APPLIED' as const,
          server_sequence: 1000 + idx,
        })),
      });

      expect(orchestrator.getPendingCount()).toBe(25);

      // Package chunk 2
      const chunk2 = orchestrator.preparePushBatch(25);
      expect(chunk2).not.toBeNull();
      expect(chunk2?.operations).toHaveLength(25);

      orchestrator.processPushResponse({
        results: chunk2!.operations.map((op, idx) => ({
          operation_id: op.operation_id,
          status: 'APPLIED' as const,
          server_sequence: 1025 + idx,
        })),
      });

      expect(orchestrator.getPendingCount()).toBe(0);
    });
  });

  describe('Chaos Scenario 3: Monotonic Pull Stream with Sequence Gap Detection (Rule 10)', () => {
    it('consumes ordered change feeds and advances cursor strictly without gaps', () => {
      const pullEngine = new ClientPullEngine(tenantId, 100);
      const appliedEntities: Record<string, unknown>[] = [];

      const result = pullEngine.applyPullResponse(
        {
          from_sequence: 101,
          to_sequence: 102,
          has_more: false,
          changes: [
            {
              sequence: 101,
              tenant_id: tenantId,
              entity_type: 'Product',
              entity_id: 'prod_901',
              operation: 'INSERT',
              payload: { sku: 'SKU-01', price_minor: 1000 },
              created_at: new Date().toISOString(),
            },
            {
              sequence: 102,
              tenant_id: tenantId,
              entity_type: 'Product',
              entity_id: 'prod_902',
              operation: 'UPDATE',
              payload: { sku: 'SKU-02', price_minor: 2000 },
              created_at: new Date().toISOString(),
            },
          ],
        },
        () => null,
        (_op, _type, _id, payload) => {
          appliedEntities.push(payload);
        },
      );

      expect(result.appliedCount).toBe(2);
      expect(result.newCursorSequence).toBe(102);
      expect(result.hasGaps).toBe(false);
      expect(appliedEntities).toHaveLength(2);
    });
  });

  describe('Chaos Scenario 4: Multi-Master Conflict Resolution Invariants (Rule 10, 11)', () => {
    it('enforces append-only reconciliation for financial & inventory ledger events', () => {
      expect(isAppendOnlyCommand('inventory.movement')).toBe(true);
      expect(isAppendOnlyCommand('sales.create')).toBe(true);
      expect(isAppendOnlyCommand('payments.record')).toBe(true);

      const clientEntry = {
        version: 1,
        payload: { account_id: 'acc_cash', amount_minor: 5000 },
      };
      const serverEntry = {
        version: 2,
        payload: { account_id: 'acc_cash', amount_minor: 9000 },
      };

      const result = resolveMasterEntityConflict('payments.record', clientEntry, serverEntry);
      expect(result.strategy).toBe('IMMUTABLE_APPEND');
      expect(result.isConflict).toBe(false);
    });

    it('detects concurrent conflicting edits on master entities and routes to exception workflow', () => {
      const clockA: VectorClock = { node_a: 2, node_b: 1 };
      const clockB: VectorClock = { node_a: 1, node_b: 2 };

      expect(compareVectorClocks(clockA, clockB)).toBe('CONCURRENT');

      const clientMaster = {
        version: 3,
        clock: clockA,
        payload: { branch_name: 'Downtown Main Branch' },
      };
      const serverMaster = {
        version: 3,
        clock: clockB,
        payload: { branch_name: 'Metro City Center' },
      };

      const result = resolveMasterEntityConflict('branch.update', clientMaster, serverMaster);
      // High-risk concurrent master data conflict triggers exception workflow (Rule 10: zero naive LWW)
      expect(result.strategy).toBe('EXCEPTION_WORKFLOW');
      expect(result.isConflict).toBe(true);
    });
  });
});
