import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowsService } from './workflows.service.js';
import type { WorkflowGraphDefinition } from '@stokrova/contracts';

describe('WorkflowsService (DAG Engine, Task Queues & Concurrency Locks)', () => {
  let service: WorkflowsService;
  const tenantId = 'ten_test_01';
  const pickerUserId1 = 'usr_picker_01';
  const pickerUserId2 = 'usr_picker_02';

  const sampleGraph: WorkflowGraphDefinition = {
    entry_step: 'sales_order_entry',
    steps: [
      {
        key: 'sales_order_entry',
        name: 'Sales Order Entry',
        type: 'TASK',
        assignment: { assignment_type: 'ROLE', target_id: 'SALES_CLERK' },
      },
      {
        key: 'warehouse_picking',
        name: 'Warehouse Goods Picking',
        type: 'TASK',
        assignment: { assignment_type: 'WORK_CENTER', target_id: 'wc_picking_bay' },
      },
      {
        key: 'cashier_checkout',
        name: 'Cashier Checkout Till',
        type: 'TASK',
        assignment: { assignment_type: 'WORK_CENTER', target_id: 'wc_register_pos' },
      },
    ],
    transitions: [
      { from_step: 'sales_order_entry', to_step: 'warehouse_picking' },
      { from_step: 'warehouse_picking', to_step: 'cashier_checkout' },
    ],
  };

  beforeEach(() => {
    service = new WorkflowsService();
  });

  describe('Workflow & Version Lifecycle', () => {
    it('creates workflow and draft version', async () => {
      const wf = await service.createWorkflow(tenantId, {
        name: 'Wholesale Building Materials Flow',
        category: 'WHOLESALE_FULFILLMENT',
      });
      expect(wf.id).toBeDefined();
      expect(wf.name).toBe('Wholesale Building Materials Flow');

      const v1 = await service.createVersion(tenantId, wf.id, {
        definition_graph: sampleGraph,
      });
      expect(v1.version_number).toBe(1);
      expect(v1.status).toBe('DRAFT');
    });

    it('rejects creating version with cyclic graph', async () => {
      const wf = await service.createWorkflow(tenantId, {
        name: 'Bad Cyclic Flow',
        category: 'RETAIL_SALE',
      });

      const cyclicGraph: WorkflowGraphDefinition = {
        entry_step: 's1',
        steps: [
          {
            key: 's1',
            name: 'S1',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'R1' },
          },
          {
            key: 's2',
            name: 'S2',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'R2' },
          },
        ],
        transitions: [
          { from_step: 's1', to_step: 's2' },
          { from_step: 's2', to_step: 's1' },
        ],
      };

      await expect(
        service.createVersion(tenantId, wf.id, {
          definition_graph: cyclicGraph,
        }),
      ).rejects.toThrowError(/contains a directed cycle/);
    });

    it('publishes version and archives previous published versions', async () => {
      const wf = await service.createWorkflow(tenantId, {
        name: 'Supermarket Flow',
        category: 'RETAIL_SALE',
      });

      const v1 = await service.createVersion(tenantId, wf.id, {
        definition_graph: sampleGraph,
      });
      const publishedV1 = await service.publishVersion(tenantId, v1.id);
      expect(publishedV1.status).toBe('PUBLISHED');
      expect(publishedV1.published_at).toBeDefined();

      // Create v2 and publish
      const v2 = await service.createVersion(tenantId, wf.id, {
        definition_graph: sampleGraph,
      });
      expect(v2.version_number).toBe(2);
      await service.publishVersion(tenantId, v2.id);

      // Verify v1 is now ARCHIVED
      const activePublished = await service.getPublishedVersion(tenantId, wf.id);
      expect(activePublished.id).toBe(v2.id);
    });
  });

  describe('Execution Spawning, Task Queues & Concurrency Locks', () => {
    let workflowId: string;

    beforeEach(async () => {
      const wf = await service.createWorkflow(tenantId, {
        name: 'Live Fulfillment',
        category: 'WHOLESALE_FULFILLMENT',
      });
      workflowId = wf.id;

      const v1 = await service.createVersion(tenantId, wf.id, {
        definition_graph: sampleGraph,
      });
      await service.publishVersion(tenantId, v1.id);
    });

    it('spawns execution and generates entry step task in PENDING state', async () => {
      const initialTask = await service.spawnWorkflow(tenantId, {
        workflow_id: workflowId,
        entity_type: 'SALE_ORDER',
        entity_id: 'so_1001',
        priority: 'HIGH',
      });

      expect(initialTask.status).toBe('PENDING');
      expect(initialTask.step_key).toBe('sales_order_entry');
      expect(initialTask.assigned_role_id).toBe('SALES_CLERK');
      expect(initialTask.priority).toBe('HIGH');
    });

    it('enforces concurrency locking when two pickers attempt to claim the same task', async () => {
      const initialTask = await service.spawnWorkflow(tenantId, {
        workflow_id: workflowId,
        entity_type: 'SALE_ORDER',
        entity_id: 'so_1002',
      });

      // Complete initial step to move to warehouse_picking queue
      await service.claimTask(tenantId, initialTask.id, 'usr_sales_01');
      const { spawned_tasks } = await service.completeTask(
        tenantId,
        initialTask.id,
        'usr_sales_01',
      );

      const pickingTask = spawned_tasks[0]!;
      expect(pickingTask.step_key).toBe('warehouse_picking');
      expect(pickingTask.status).toBe('PENDING');

      // Picker 1 claims the picking task
      const claimedByP1 = await service.claimTask(tenantId, pickingTask.id, pickerUserId1, {
        claim_duration_minutes: 20,
      });
      expect(claimedByP1.status).toBe('CLAIMED');
      expect(claimedByP1.claimed_by_user_id).toBe(pickerUserId1);

      // Picker 2 concurrently attempts to claim the same picking task -> MUST FAIL
      await expect(
        service.claimTask(tenantId, pickingTask.id, pickerUserId2),
      ).rejects.toThrowError(/currently locked by user 'usr_picker_01'/);
    });

    it('allows re-claiming after task is released back to queue', async () => {
      const initialTask = await service.spawnWorkflow(tenantId, {
        workflow_id: workflowId,
        entity_type: 'SALE_ORDER',
        entity_id: 'so_1003',
      });

      // Picker 1 claims
      await service.claimTask(tenantId, initialTask.id, pickerUserId1);

      // Picker 1 releases back to queue
      const released = await service.releaseTask(tenantId, initialTask.id, pickerUserId1);
      expect(released.status).toBe('PENDING');
      expect(released.claimed_by_user_id).toBeNull();

      // Picker 2 can now claim without conflict
      const claimedByP2 = await service.claimTask(tenantId, initialTask.id, pickerUserId2);
      expect(claimedByP2.status).toBe('CLAIMED');
      expect(claimedByP2.claimed_by_user_id).toBe(pickerUserId2);
    });

    it('progresses workflow through the DAG upon task completion', async () => {
      // Step 1: Sales order entry
      const task1 = await service.spawnWorkflow(tenantId, {
        workflow_id: workflowId,
        entity_type: 'SALE_ORDER',
        entity_id: 'so_1004',
      });
      await service.claimTask(tenantId, task1.id, 'usr_sales_01');
      const step1Result = await service.completeTask(tenantId, task1.id, 'usr_sales_01');

      // Step 2: Warehouse picking spawned
      expect(step1Result.spawned_tasks.length).toBe(1);
      const task2 = step1Result.spawned_tasks[0]!;
      expect(task2.step_key).toBe('warehouse_picking');
      expect(task2.status).toBe('PENDING');

      // Picker claims and completes picking
      await service.claimTask(tenantId, task2.id, pickerUserId1);
      const step2Result = await service.completeTask(tenantId, task2.id, pickerUserId1);

      // Step 3: Cashier checkout spawned
      expect(step2Result.spawned_tasks.length).toBe(1);
      const task3 = step2Result.spawned_tasks[0]!;
      expect(task3.step_key).toBe('cashier_checkout');
      expect(task3.status).toBe('PENDING');

      // Cashier completes checkout -> Terminal step in linear flow
      await service.claimTask(tenantId, task3.id, 'usr_cashier_01');
      const step3Result = await service.completeTask(tenantId, task3.id, 'usr_cashier_01');
      expect(step3Result.spawned_tasks.length).toBe(0); // Flow completed!
    });
  });
});
