import { describe, it, expect } from 'vitest';
import {
  validateDAG,
  determineNextSteps,
  assertCanClaimTask,
  assertCanCompleteTask,
  assertWorkflowVersionIsMutable,
  type DomainWorkflowGraphDefinition,
} from '../src/workflows.js';

describe('Workflow Engine & Concurrency Locking Invariants', () => {
  const linearGraph: DomainWorkflowGraphDefinition = {
    entry_step: 'create_order',
    steps: [
      {
        key: 'create_order',
        name: 'Create Order',
        type: 'TASK',
        assignment: { assignment_type: 'ROLE', target_id: 'SALES_CLERK' },
      },
      {
        key: 'pick_goods',
        name: 'Pick Goods',
        type: 'TASK',
        assignment: { assignment_type: 'WORK_CENTER', target_id: 'wc_warehouse' },
      },
      {
        key: 'collect_payment',
        name: 'Collect Payment',
        type: 'TASK',
        assignment: { assignment_type: 'WORK_CENTER', target_id: 'wc_cashier' },
      },
    ],
    transitions: [
      { from_step: 'create_order', to_step: 'pick_goods' },
      { from_step: 'pick_goods', to_step: 'collect_payment' },
    ],
  };

  describe('validateDAG', () => {
    it('validates a correct linear DAG', () => {
      const res = validateDAG(linearGraph);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('detects cycles in cyclic graphs', () => {
      const cyclicGraph: DomainWorkflowGraphDefinition = {
        entry_step: 'step_a',
        steps: [
          {
            key: 'step_a',
            name: 'Step A',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'ROLE_A' },
          },
          {
            key: 'step_b',
            name: 'Step B',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'ROLE_B' },
          },
          {
            key: 'step_c',
            name: 'Step C',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'ROLE_C' },
          },
        ],
        transitions: [
          { from_step: 'step_a', to_step: 'step_b' },
          { from_step: 'step_b', to_step: 'step_c' },
          { from_step: 'step_c', to_step: 'step_a' }, // Cycle back!
        ],
      };

      const res = validateDAG(cyclicGraph);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/contains a directed cycle/);
    });

    it('rejects graph with missing entry step', () => {
      const badEntry: DomainWorkflowGraphDefinition = {
        ...linearGraph,
        entry_step: 'non_existent_step',
      };
      const res = validateDAG(badEntry);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/Entry step 'non_existent_step' does not exist/);
    });

    it('rejects transitions connecting non-existent steps', () => {
      const badTransition: DomainWorkflowGraphDefinition = {
        entry_step: 'step_1',
        steps: [
          {
            key: 'step_1',
            name: 'Step 1',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'R1' },
          },
        ],
        transitions: [{ from_step: 'step_1', to_step: 'step_ghost' }],
      };
      const res = validateDAG(badTransition);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/Transition to_step 'step_ghost' does not exist/);
    });
  });

  describe('determineNextSteps (Graph Traversal & Progression)', () => {
    it('progresses sequential step directly', () => {
      const next = determineNextSteps(linearGraph, 'create_order');
      expect(next).toEqual(['pick_goods']);
    });

    it('evaluates conditional branching based on payload', () => {
      const branchingGraph: DomainWorkflowGraphDefinition = {
        entry_step: 'order_input',
        steps: [
          {
            key: 'order_input',
            name: 'Order Input',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'SALES_CLERK' },
          },
          {
            key: 'manager_approval',
            name: 'Manager Approval Required',
            type: 'APPROVAL',
            assignment: { assignment_type: 'ROLE', target_id: 'BRANCH_MANAGER' },
          },
          {
            key: 'direct_cashier',
            name: 'Standard Cashier Desk',
            type: 'TASK',
            assignment: { assignment_type: 'ROLE', target_id: 'CASHIER' },
          },
        ],
        transitions: [
          {
            from_step: 'order_input',
            to_step: 'manager_approval',
            condition_field: 'total_minor',
            condition_operator: 'GT',
            condition_value: 1000000,
          },
          {
            from_step: 'order_input',
            to_step: 'direct_cashier',
            condition_field: 'total_minor',
            condition_operator: 'LTE',
            condition_value: 1000000,
          },
        ],
      };

      // High value order > 1,000,000 goes to manager approval
      const highValNext = determineNextSteps(branchingGraph, 'order_input', {
        total_minor: 1500000,
      });
      expect(highValNext).toEqual(['manager_approval']);

      // Regular order <= 1,000,000 goes directly to cashier
      const lowValNext = determineNextSteps(branchingGraph, 'order_input', {
        total_minor: 750000,
      });
      expect(lowValNext).toEqual(['direct_cashier']);
    });

    it('handles parallel fork and join (merging steps)', () => {
      const forkJoinGraph: DomainWorkflowGraphDefinition = {
        entry_step: 'sales_order',
        steps: [
          {
            key: 'sales_order',
            name: 'Sales Order',
            type: 'PARALLEL_FORK',
            assignment: { assignment_type: 'ROLE', target_id: 'SALES' },
          },
          {
            key: 'pick_zone_a',
            name: 'Pick Zone A (Cold Room)',
            type: 'TASK',
            assignment: { assignment_type: 'WORK_CENTER', target_id: 'wc_zone_a' },
          },
          {
            key: 'pick_zone_b',
            name: 'Pick Zone B (Dry Goods)',
            type: 'TASK',
            assignment: { assignment_type: 'WORK_CENTER', target_id: 'wc_zone_b' },
          },
          {
            key: 'pack_consolidation',
            name: 'Consolidation & Packing',
            type: 'PARALLEL_JOIN',
            assignment: { assignment_type: 'WORK_CENTER', target_id: 'wc_packing' },
          },
        ],
        transitions: [
          { from_step: 'sales_order', to_step: 'pick_zone_a' },
          { from_step: 'sales_order', to_step: 'pick_zone_b' },
          { from_step: 'pick_zone_a', to_step: 'pack_consolidation' },
          { from_step: 'pick_zone_b', to_step: 'pack_consolidation' },
        ],
      };

      // 1. Completing sales_order triggers parallel fork into BOTH zone tasks
      const forked = determineNextSteps(forkJoinGraph, 'sales_order');
      expect(forked).toEqual(['pick_zone_a', 'pick_zone_b']);

      // 2. Only pick_zone_a completes -> pack_consolidation NOT yet ready
      const partialNext = determineNextSteps(forkJoinGraph, 'pick_zone_a', {}, [
        'sales_order',
      ]);
      expect(partialNext).toEqual([]);

      // 3. When pick_zone_b also completes -> pack_consolidation IS ready
      const fullNext = determineNextSteps(forkJoinGraph, 'pick_zone_b', {}, [
        'sales_order',
        'pick_zone_a',
      ]);
      expect(fullNext).toEqual(['pack_consolidation']);
    });
  });

  describe('Task Claiming & Concurrency Locking', () => {
    it('allows claiming a PENDING task without active claim', () => {
      expect(() => assertCanClaimTask('PENDING', null)).not.toThrow();
    });

    it('rejects claiming a task with active, non-expired claim by another user', () => {
      const activeClaim = {
        user_id: 'usr_picker_01',
        expires_at: new Date(Date.now() + 600000).toISOString(), // 10 mins in future
      };

      expect(() => assertCanClaimTask('CLAIMED', activeClaim)).toThrow(
        /Task is currently locked by user 'usr_picker_01'/,
      );
    });

    it('permits claiming a task if previous claim has expired', () => {
      const expiredClaim = {
        user_id: 'usr_picker_01',
        expires_at: new Date(Date.now() - 60000).toISOString(), // 1 min in past
      };

      expect(() => assertCanClaimTask('CLAIMED', expiredClaim)).not.toThrow();
    });

    it('rejects completing task if user is not the claim holder', () => {
      expect(() =>
        assertCanCompleteTask('CLAIMED', 'usr_picker_01', 'usr_picker_02'),
      ).toThrow(/Task is claimed by 'usr_picker_01'. User 'usr_picker_02' cannot complete it/);
    });

    it('allows completing task when executed by the claim holder', () => {
      expect(() =>
        assertCanCompleteTask('CLAIMED', 'usr_picker_01', 'usr_picker_01'),
      ).not.toThrow();
    });
  });

  describe('Workflow Version Immutability', () => {
    it('permits modifications only in DRAFT status', () => {
      expect(() => assertWorkflowVersionIsMutable('DRAFT')).not.toThrow();
      expect(() => assertWorkflowVersionIsMutable('PUBLISHED')).toThrow(
        /is immutable and cannot be modified/,
      );
      expect(() => assertWorkflowVersionIsMutable('ARCHIVED')).toThrow(
        /is immutable and cannot be modified/,
      );
    });
  });
});
