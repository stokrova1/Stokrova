/**
 * Graph-Based Workflow Engine, Tasks & Queues Contracts
 * Based on ARCHITECTURE.md, ADR-016, and Phase 1D specification
 */

export type WorkflowCategory =
  | 'RETAIL_SALE'
  | 'WHOLESALE_FULFILLMENT'
  | 'RETURN'
  | 'PURCHASE_RECEIVE'
  | 'TRANSFER';

export interface WorkflowResponse {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  category: WorkflowCategory;
  is_active: boolean;
  created_at: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category: WorkflowCategory;
}

export type WorkflowVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type WorkflowStepType =
  | 'TASK'
  | 'APPROVAL'
  | 'CONDITION'
  | 'PARALLEL_FORK'
  | 'PARALLEL_JOIN';

export type AssignmentType = 'ROLE' | 'USER' | 'WORK_CENTER' | 'QUEUE';

export interface WorkflowStepAssignment {
  assignment_type: AssignmentType;
  target_id: string; // role code, user id, or work center id
}

export type ConditionOperator = 'EQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN';

export interface WorkflowTransition {
  from_step: string;
  to_step: string;
  condition_field?: string;
  condition_operator?: ConditionOperator;
  condition_value?: unknown;
}

export interface WorkflowStepDefinition {
  key: string;
  name: string;
  type: WorkflowStepType;
  assignment: WorkflowStepAssignment;
}

export interface WorkflowGraphDefinition {
  entry_step: string;
  steps: WorkflowStepDefinition[];
  transitions: WorkflowTransition[];
}

export interface WorkflowVersionResponse {
  id: string;
  tenant_id: string;
  workflow_id: string;
  version_number: number;
  definition_graph: WorkflowGraphDefinition;
  status: WorkflowVersionStatus;
  published_at?: string | null;
  created_at: string;
}

export interface CreateWorkflowVersionRequest {
  definition_graph: WorkflowGraphDefinition;
}

export type TaskStatus =
  | 'PENDING'
  | 'CLAIMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface WorkflowTaskResponse {
  id: string;
  tenant_id: string;
  workflow_id: string;
  workflow_version_id: string;
  step_key: string;
  step_name: string;
  entity_type: string;
  entity_id: string;
  status: TaskStatus;
  assigned_role_id?: string | null;
  assigned_user_id?: string | null;
  assigned_work_center_id?: string | null;
  priority: TaskPriority;
  payload?: Record<string, unknown> | null;
  claimed_by_user_id?: string | null;
  claim_expires_at?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface SpawnWorkflowExecutionRequest {
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  priority?: TaskPriority;
  payload?: Record<string, unknown>;
}

export interface ClaimTaskRequest {
  claim_duration_minutes?: number;
}

export interface CompleteTaskRequest {
  output_payload?: Record<string, unknown>;
}

export interface ReleaseTaskRequest {
  reason?: string;
}
