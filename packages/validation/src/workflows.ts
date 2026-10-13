import { z } from 'zod';

export const WorkflowCategories = [
  'RETAIL_SALE',
  'WHOLESALE_FULFILLMENT',
  'RETURN',
  'PURCHASE_RECEIVE',
  'TRANSFER',
] as const;

export const WorkflowVersionStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

export const WorkflowStepTypes = [
  'TASK',
  'APPROVAL',
  'CONDITION',
  'PARALLEL_FORK',
  'PARALLEL_JOIN',
] as const;

export const AssignmentTypes = ['ROLE', 'USER', 'WORK_CENTER', 'QUEUE'] as const;

export const ConditionOperators = ['EQ', 'GT', 'GTE', 'LT', 'LTE', 'IN'] as const;

export const TaskStatuses = [
  'PENDING',
  'CLAIMED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
] as const;

export const TaskPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

export const CreateWorkflowRequestSchema = z.object({
  name: z.string().trim().min(2, 'Workflow name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  category: z.enum(WorkflowCategories),
});

export const WorkflowStepAssignmentSchema = z.object({
  assignment_type: z.enum(AssignmentTypes),
  target_id: z.string().trim().min(1, 'Target ID is required'),
});

export const WorkflowTransitionSchema = z.object({
  from_step: z.string().trim().min(1, 'from_step is required'),
  to_step: z.string().trim().min(1, 'to_step is required'),
  condition_field: z.string().trim().optional(),
  condition_operator: z.enum(ConditionOperators).optional(),
  condition_value: z.unknown().optional(),
});

export const WorkflowStepDefinitionSchema = z.object({
  key: z.string().trim().min(1, 'Step key is required').max(50),
  name: z.string().trim().min(1, 'Step name is required').max(100),
  type: z.enum(WorkflowStepTypes),
  assignment: WorkflowStepAssignmentSchema,
});

export const WorkflowGraphDefinitionSchema = z.object({
  entry_step: z.string().trim().min(1, 'entry_step is required'),
  steps: z.array(WorkflowStepDefinitionSchema).min(1, 'Workflow must contain at least one step'),
  transitions: z.array(WorkflowTransitionSchema),
});

export const CreateWorkflowVersionRequestSchema = z.object({
  definition_graph: WorkflowGraphDefinitionSchema,
});

export const SpawnWorkflowExecutionRequestSchema = z.object({
  workflow_id: z.string().min(1, 'workflow_id is required'),
  entity_type: z.string().min(1, 'entity_type is required'),
  entity_id: z.string().min(1, 'entity_id is required'),
  priority: z.enum(TaskPriorities).optional().default('NORMAL'),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const ClaimTaskRequestSchema = z.object({
  claim_duration_minutes: z.number().int().min(1).max(1440).optional().default(15),
});

export const CompleteTaskRequestSchema = z.object({
  output_payload: z.record(z.string(), z.unknown()).optional(),
});

export const ReleaseTaskRequestSchema = z.object({
  reason: z.string().max(255).optional(),
});

export type ValidatedCreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;
export type ValidatedWorkflowGraphDefinition = z.infer<typeof WorkflowGraphDefinitionSchema>;
export type ValidatedCreateWorkflowVersionRequest = z.infer<typeof CreateWorkflowVersionRequestSchema>;
export type ValidatedSpawnWorkflowExecutionRequest = z.infer<typeof SpawnWorkflowExecutionRequestSchema>;
export type ValidatedClaimTaskRequest = z.infer<typeof ClaimTaskRequestSchema>;
export type ValidatedCompleteTaskRequest = z.infer<typeof CompleteTaskRequestSchema>;
export type ValidatedReleaseTaskRequest = z.infer<typeof ReleaseTaskRequestSchema>;
