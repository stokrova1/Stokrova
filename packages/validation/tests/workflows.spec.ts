import { describe, it, expect } from 'vitest';
import {
  CreateWorkflowRequestSchema,
  WorkflowGraphDefinitionSchema,
  SpawnWorkflowExecutionRequestSchema,
  ClaimTaskRequestSchema,
} from '../src/workflows.js';

describe('Workflow Validation Schemas', () => {
  it('validates workflow creation requests', () => {
    const valid = CreateWorkflowRequestSchema.safeParse({
      name: 'Standard Wholesale Order Flow',
      description: 'Full fulfillment pipeline from order to dispatch',
      category: 'WHOLESALE_FULFILLMENT',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateWorkflowRequestSchema.safeParse({
      name: 'A',
      category: 'NON_EXISTENT_CATEGORY',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates workflow graph definition structure', () => {
    const validGraph = WorkflowGraphDefinitionSchema.safeParse({
      entry_step: 'step_1',
      steps: [
        {
          key: 'step_1',
          name: 'First Step',
          type: 'TASK',
          assignment: { assignment_type: 'ROLE', target_id: 'SALES_CLERK' },
        },
      ],
      transitions: [],
    });
    expect(validGraph.success).toBe(true);

    const emptySteps = WorkflowGraphDefinitionSchema.safeParse({
      entry_step: 'step_1',
      steps: [],
      transitions: [],
    });
    expect(emptySteps.success).toBe(false);
  });

  it('validates execution spawn and task claiming payloads', () => {
    const validSpawn = SpawnWorkflowExecutionRequestSchema.safeParse({
      workflow_id: 'wf_123',
      entity_type: 'SALE_ORDER',
      entity_id: 'ord_987',
      priority: 'HIGH',
    });
    expect(validSpawn.success).toBe(true);

    const validClaim = ClaimTaskRequestSchema.safeParse({
      claim_duration_minutes: 30,
    });
    expect(validClaim.success).toBe(true);

    const invalidClaim = ClaimTaskRequestSchema.safeParse({
      claim_duration_minutes: -5,
    });
    expect(invalidClaim.success).toBe(false);
  });
});
