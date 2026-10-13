import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  WorkflowResponse,
  CreateWorkflowRequest,
  WorkflowVersionResponse,
  CreateWorkflowVersionRequest,
  WorkflowTaskResponse,
  SpawnWorkflowExecutionRequest,
  ClaimTaskRequest,
  CompleteTaskRequest,
  ReleaseTaskRequest,
  WorkflowVersionStatus,
  TaskStatus,
  TaskPriority,
  WorkflowGraphDefinition,
} from '@stokrova/contracts';
import {
  validateDAG,
  determineNextSteps,
  assertCanClaimTask,
  assertCanCompleteTask,
  assertWorkflowVersionIsMutable,
} from '@stokrova/domain';

export interface StoredWorkflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: WorkflowResponse['category'];
  is_active: boolean;
  created_at: string;
}

export interface StoredWorkflowVersion {
  id: string;
  tenant_id: string;
  workflow_id: string;
  version_number: number;
  definition_graph: WorkflowGraphDefinition;
  status: WorkflowVersionStatus;
  published_at: string | null;
  created_at: string;
}

export interface StoredWorkflowTask {
  id: string;
  tenant_id: string;
  workflow_id: string;
  workflow_version_id: string;
  step_key: string;
  step_name: string;
  entity_type: string;
  entity_id: string;
  status: TaskStatus;
  assigned_role_id: string | null;
  assigned_user_id: string | null;
  assigned_work_center_id: string | null;
  priority: TaskPriority;
  payload: Record<string, unknown> | null;
  claimed_by_user_id: string | null;
  claim_expires_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface StoredWorkflowTaskClaim {
  id: string;
  tenant_id: string;
  task_id: string;
  claimed_by_user_id: string;
  claimed_at: string;
  expires_at: string;
  status: 'ACTIVE' | 'RELEASED' | 'COMPLETED';
}

@Injectable()
export class WorkflowsService {
  private workflowsStore = new Map<string, StoredWorkflow>();
  private versionsStore = new Map<string, StoredWorkflowVersion>();
  private tasksStore = new Map<string, StoredWorkflowTask>();
  private claimsStore = new Map<string, StoredWorkflowTaskClaim>();

  async createWorkflow(
    tenantId: string,
    req: CreateWorkflowRequest,
  ): Promise<WorkflowResponse> {
    const id = `wf_${randomUUID().replace(/-/g, '')}`;
    const workflow: StoredWorkflow = {
      id,
      tenant_id: tenantId,
      name: req.name.trim(),
      description: req.description?.trim() || null,
      category: req.category,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.workflowsStore.set(id, workflow);
    return workflow;
  }

  async getWorkflows(
    tenantId: string,
    category?: WorkflowResponse['category'],
  ): Promise<WorkflowResponse[]> {
    return Array.from(this.workflowsStore.values()).filter((w) => {
      if (w.tenant_id !== tenantId) return false;
      if (category && w.category !== category) return false;
      return true;
    });
  }

  async getWorkflowById(tenantId: string, id: string): Promise<WorkflowResponse> {
    const workflow = this.workflowsStore.get(id);
    if (!workflow || workflow.tenant_id !== tenantId) {
      throw new NotFoundException(`Workflow with ID '${id}' not found.`);
    }
    return workflow;
  }

  async createVersion(
    tenantId: string,
    workflowId: string,
    req: CreateWorkflowVersionRequest,
  ): Promise<WorkflowVersionResponse> {
    await this.getWorkflowById(tenantId, workflowId);

    // Validate graph DAG structure
    const validation = validateDAG(req.definition_graph);
    if (!validation.isValid) {
      throw new BadRequestException(
        validation.error || 'Invalid workflow graph structure.',
      );
    }

    const existingVersions = Array.from(this.versionsStore.values()).filter(
      (v) => v.tenant_id === tenantId && v.workflow_id === workflowId,
    );
    const nextVersionNumber =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v) => v.version_number)) + 1
        : 1;

    const id = `wfv_${randomUUID().replace(/-/g, '')}`;
    const version: StoredWorkflowVersion = {
      id,
      tenant_id: tenantId,
      workflow_id: workflowId,
      version_number: nextVersionNumber,
      definition_graph: req.definition_graph,
      status: 'DRAFT',
      published_at: null,
      created_at: new Date().toISOString(),
    };

    this.versionsStore.set(id, version);
    return version;
  }

  async publishVersion(
    tenantId: string,
    versionId: string,
  ): Promise<WorkflowVersionResponse> {
    const version = this.versionsStore.get(versionId);
    if (!version || version.tenant_id !== tenantId) {
      throw new NotFoundException(`Workflow version with ID '${versionId}' not found.`);
    }

    try {
      assertWorkflowVersionIsMutable(version.status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Version cannot be published.';
      throw new ConflictException(msg);
    }

    // Archive any previous published version for this workflow
    for (const v of this.versionsStore.values()) {
      if (
        v.tenant_id === tenantId &&
        v.workflow_id === version.workflow_id &&
        v.status === 'PUBLISHED'
      ) {
        v.status = 'ARCHIVED';
      }
    }

    version.status = 'PUBLISHED';
    version.published_at = new Date().toISOString();
    this.versionsStore.set(versionId, version);

    return version;
  }

  async getPublishedVersion(
    tenantId: string,
    workflowId: string,
  ): Promise<StoredWorkflowVersion> {
    for (const v of this.versionsStore.values()) {
      if (
        v.tenant_id === tenantId &&
        v.workflow_id === workflowId &&
        v.status === 'PUBLISHED'
      ) {
        return v;
      }
    }
    throw new NotFoundException(`No active published version found for workflow '${workflowId}'.`);
  }

  async spawnWorkflow(
    tenantId: string,
    req: SpawnWorkflowExecutionRequest,
  ): Promise<WorkflowTaskResponse> {
    const publishedVersion = await this.getPublishedVersion(tenantId, req.workflow_id);
    const graph = publishedVersion.definition_graph;
    const entryStepDef = graph.steps.find((s) => s.key === graph.entry_step);

    if (!entryStepDef) {
      throw new BadRequestException(
        `Entry step '${graph.entry_step}' not found in published workflow graph.`,
      );
    }

    const taskId = `tsk_${randomUUID().replace(/-/g, '')}`;
    const task: StoredWorkflowTask = {
      id: taskId,
      tenant_id: tenantId,
      workflow_id: req.workflow_id,
      workflow_version_id: publishedVersion.id,
      step_key: entryStepDef.key,
      step_name: entryStepDef.name,
      entity_type: req.entity_type,
      entity_id: req.entity_id,
      status: 'PENDING',
      assigned_role_id:
        entryStepDef.assignment.assignment_type === 'ROLE'
          ? entryStepDef.assignment.target_id
          : null,
      assigned_user_id:
        entryStepDef.assignment.assignment_type === 'USER'
          ? entryStepDef.assignment.target_id
          : null,
      assigned_work_center_id:
        entryStepDef.assignment.assignment_type === 'WORK_CENTER'
          ? entryStepDef.assignment.target_id
          : null,
      priority: req.priority || 'NORMAL',
      payload: req.payload || null,
      claimed_by_user_id: null,
      claim_expires_at: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    this.tasksStore.set(taskId, task);
    return task;
  }

  async getQueueTasks(
    tenantId: string,
    filters: {
      roleId?: string;
      workCenterId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
    } = {},
  ): Promise<WorkflowTaskResponse[]> {
    const targetStatus = filters.status || 'PENDING';

    return Array.from(this.tasksStore.values()).filter((t) => {
      if (t.tenant_id !== tenantId) return false;
      if (t.status !== targetStatus) return false;
      if (filters.roleId && t.assigned_role_id !== filters.roleId) return false;
      if (filters.workCenterId && t.assigned_work_center_id !== filters.workCenterId) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      return true;
    });
  }

  async getTaskById(tenantId: string, taskId: string): Promise<WorkflowTaskResponse> {
    const task = this.tasksStore.get(taskId);
    if (!task || task.tenant_id !== tenantId) {
      throw new NotFoundException(`Task with ID '${taskId}' not found.`);
    }
    return task;
  }

  async claimTask(
    tenantId: string,
    taskId: string,
    userId: string,
    req: ClaimTaskRequest = {},
  ): Promise<WorkflowTaskResponse> {
    const task = this.tasksStore.get(taskId);
    if (!task || task.tenant_id !== tenantId) {
      throw new NotFoundException(`Task with ID '${taskId}' not found.`);
    }

    // Find active claim for this task
    let activeClaim: StoredWorkflowTaskClaim | undefined;
    for (const c of this.claimsStore.values()) {
      if (c.task_id === taskId && c.status === 'ACTIVE') {
        activeClaim = c;
        break;
      }
    }

    try {
      assertCanClaimTask(
        task.status,
        activeClaim
          ? { user_id: activeClaim.claimed_by_user_id, expires_at: activeClaim.expires_at }
          : null,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Task cannot be claimed.';
      throw new ConflictException(msg);
    }

    const durationMinutes = req.claim_duration_minutes || 15;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();

    // Release any previous expired claim
    if (activeClaim) {
      activeClaim.status = 'RELEASED';
    }

    const claimId = `clm_${randomUUID().replace(/-/g, '')}`;
    const claim: StoredWorkflowTaskClaim = {
      id: claimId,
      tenant_id: tenantId,
      task_id: taskId,
      claimed_by_user_id: userId,
      claimed_at: now.toISOString(),
      expires_at: expiresAt,
      status: 'ACTIVE',
    };
    this.claimsStore.set(claimId, claim);

    task.status = 'CLAIMED';
    task.claimed_by_user_id = userId;
    task.claim_expires_at = expiresAt;

    this.tasksStore.set(taskId, task);
    return task;
  }

  async releaseTask(
    tenantId: string,
    taskId: string,
    userId: string,
    _req: ReleaseTaskRequest = {},
  ): Promise<WorkflowTaskResponse> {
    const task = this.tasksStore.get(taskId);
    if (!task || task.tenant_id !== tenantId) {
      throw new NotFoundException(`Task with ID '${taskId}' not found.`);
    }

    if (task.claimed_by_user_id && task.claimed_by_user_id !== userId) {
      throw new ConflictException(
        `Task is claimed by user '${task.claimed_by_user_id}'. You cannot release it.`,
      );
    }

    // Mark active claim as RELEASED
    for (const c of this.claimsStore.values()) {
      if (c.task_id === taskId && c.status === 'ACTIVE') {
        c.status = 'RELEASED';
      }
    }

    task.status = 'PENDING';
    task.claimed_by_user_id = null;
    task.claim_expires_at = null;

    this.tasksStore.set(taskId, task);
    return task;
  }

  async completeTask(
    tenantId: string,
    taskId: string,
    userId: string,
    req: CompleteTaskRequest = {},
  ): Promise<{ completed_task: WorkflowTaskResponse; spawned_tasks: WorkflowTaskResponse[] }> {
    const task = this.tasksStore.get(taskId);
    if (!task || task.tenant_id !== tenantId) {
      throw new NotFoundException(`Task with ID '${taskId}' not found.`);
    }

    try {
      assertCanCompleteTask(task.status, task.claimed_by_user_id, userId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot complete task.';
      throw new ConflictException(msg);
    }

    // Mark claim as COMPLETED
    for (const c of this.claimsStore.values()) {
      if (c.task_id === taskId && c.status === 'ACTIVE') {
        c.status = 'COMPLETED';
      }
    }

    const now = new Date().toISOString();
    task.status = 'COMPLETED';
    task.completed_at = now;
    if (req.output_payload) {
      task.payload = { ...(task.payload || {}), ...req.output_payload };
    }
    this.tasksStore.set(taskId, task);

    // Progress workflow DAG: Determine next step(s)
    const version = this.versionsStore.get(task.workflow_version_id);
    const spawnedTasks: WorkflowTaskResponse[] = [];

    if (version) {
      const completedStepsHistory = Array.from(this.tasksStore.values())
        .filter(
          (t) =>
            t.tenant_id === tenantId &&
            t.workflow_id === task.workflow_id &&
            t.entity_type === task.entity_type &&
            t.entity_id === task.entity_id &&
            t.status === 'COMPLETED',
        )
        .map((t) => t.step_key);

      const nextStepKeys = determineNextSteps(
        version.definition_graph,
        task.step_key,
        task.payload || undefined,
        completedStepsHistory,
      );

      for (const nextKey of nextStepKeys) {
        const nextStepDef = version.definition_graph.steps.find((s) => s.key === nextKey);
        if (!nextStepDef) continue;

        const nextTaskId = `tsk_${randomUUID().replace(/-/g, '')}`;
        const nextTask: StoredWorkflowTask = {
          id: nextTaskId,
          tenant_id: tenantId,
          workflow_id: task.workflow_id,
          workflow_version_id: version.id,
          step_key: nextStepDef.key,
          step_name: nextStepDef.name,
          entity_type: task.entity_type,
          entity_id: task.entity_id,
          status: 'PENDING',
          assigned_role_id:
            nextStepDef.assignment.assignment_type === 'ROLE'
              ? nextStepDef.assignment.target_id
              : null,
          assigned_user_id:
            nextStepDef.assignment.assignment_type === 'USER'
              ? nextStepDef.assignment.target_id
              : null,
          assigned_work_center_id:
            nextStepDef.assignment.assignment_type === 'WORK_CENTER'
              ? nextStepDef.assignment.target_id
              : null,
          priority: task.priority,
          payload: task.payload,
          claimed_by_user_id: null,
          claim_expires_at: null,
          created_at: now,
          completed_at: null,
        };

        this.tasksStore.set(nextTaskId, nextTask);
        spawnedTasks.push(nextTask);
      }
    }

    return {
      completed_task: task,
      spawned_tasks: spawnedTasks,
    };
  }

  clearStore(): void {
    this.workflowsStore.clear();
    this.versionsStore.clear();
    this.tasksStore.clear();
    this.claimsStore.clear();
  }
}
