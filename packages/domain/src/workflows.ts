/**
 * Graph-Based Workflow Engine & Concurrency Locking Domain Invariants
 * Based on ARCHITECTURE.md, ADR-016, and Phase 1D specification
 */

export interface DomainWorkflowStepAssignment {
  assignment_type: 'ROLE' | 'USER' | 'WORK_CENTER' | 'QUEUE';
  target_id: string;
}

export interface DomainWorkflowTransition {
  from_step: string;
  to_step: string;
  condition_field?: string;
  condition_operator?: 'EQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN';
  condition_value?: unknown;
}

export interface DomainWorkflowStepDefinition {
  key: string;
  name: string;
  type: 'TASK' | 'APPROVAL' | 'CONDITION' | 'PARALLEL_FORK' | 'PARALLEL_JOIN';
  assignment: DomainWorkflowStepAssignment;
}

export interface DomainWorkflowGraphDefinition {
  entry_step: string;
  steps: DomainWorkflowStepDefinition[];
  transitions: DomainWorkflowTransition[];
}

export interface DAGValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a workflow graph is a Directed Acyclic Graph (DAG) with valid steps and connections.
 */
export function validateDAG(graph: DomainWorkflowGraphDefinition): DAGValidationResult {
  const stepKeys = new Set<string>();
  for (const step of graph.steps) {
    if (stepKeys.has(step.key)) {
      return { isValid: false, error: `Duplicate step key '${step.key}' in workflow graph.` };
    }
    stepKeys.add(step.key);
  }

  // 1. Entry step must exist
  if (!stepKeys.has(graph.entry_step)) {
    return {
      isValid: false,
      error: `Entry step '${graph.entry_step}' does not exist in workflow steps.`,
    };
  }

  // 2. Validate all transitions connect existing steps
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const key of stepKeys) {
    adj.set(key, []);
    inDegree.set(key, 0);
  }

  for (const t of graph.transitions) {
    if (!stepKeys.has(t.from_step)) {
      return {
        isValid: false,
        error: `Transition from_step '${t.from_step}' does not exist.`,
      };
    }
    if (!stepKeys.has(t.to_step)) {
      return {
        isValid: false,
        error: `Transition to_step '${t.to_step}' does not exist.`,
      };
    }
    adj.get(t.from_step)!.push(t.to_step);
    inDegree.set(t.to_step, (inDegree.get(t.to_step) || 0) + 1);
  }

  // 3. Cycle Detection using Kahn's algorithm (Topological sort)
  const queue: string[] = [];
  for (const [key, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(key);
    }
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visitedCount++;

    for (const neighbor of adj.get(current) || []) {
      const newDeg = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (visitedCount !== stepKeys.size) {
    return {
      isValid: false,
      error: 'Workflow graph contains a directed cycle (loop). Must be a Directed Acyclic Graph (DAG).',
    };
  }

  // 4. Validate PARALLEL_JOIN and PARALLEL_FORK constraints
  for (const step of graph.steps) {
    const outgoing = adj.get(step.key) || [];
    const actualIncoming = graph.transitions.filter((t) => t.to_step === step.key);

    if (step.type === 'PARALLEL_FORK' && outgoing.length < 2) {
      return {
        isValid: false,
        error: `PARALLEL_FORK step '${step.key}' must have at least 2 outgoing transitions.`,
      };
    }

    if (step.type === 'PARALLEL_JOIN' && actualIncoming.length < 2) {
      return {
        isValid: false,
        error: `PARALLEL_JOIN step '${step.key}' must have at least 2 incoming transitions.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Evaluates a conditional transition against task/entity payload.
 */
export function evaluateCondition(
  operator?: string,
  actualValue?: unknown,
  expectedValue?: unknown,
): boolean {
  if (!operator) {
    return true; // unconditional
  }

  switch (operator) {
    case 'EQ':
      return actualValue === expectedValue;
    case 'GT':
      return Number(actualValue) > Number(expectedValue);
    case 'GTE':
      return Number(actualValue) >= Number(expectedValue);
    case 'LT':
      return Number(actualValue) < Number(expectedValue);
    case 'LTE':
      return Number(actualValue) <= Number(expectedValue);
    case 'IN':
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
    default:
      return false;
  }
}

/**
 * Determines which subsequent steps in the graph are ready to execute upon completion of a step.
 */
export function determineNextSteps(
  graph: DomainWorkflowGraphDefinition,
  completedStepKey: string,
  payload?: Record<string, unknown>,
  completedStepsHistory: string[] = [],
): string[] {
  const allCompleted = new Set([...completedStepsHistory, completedStepKey]);
  const outgoingTransitions = graph.transitions.filter((t) => t.from_step === completedStepKey);
  const nextStepCandidates: string[] = [];

  for (const t of outgoingTransitions) {
    const actualValue = t.condition_field ? payload?.[t.condition_field] : undefined;
    const conditionMatches = evaluateCondition(
      t.condition_operator,
      actualValue,
      t.condition_value,
    );

    if (conditionMatches) {
      nextStepCandidates.push(t.to_step);
    }
  }

  const readySteps: string[] = [];

  for (const stepKey of nextStepCandidates) {
    const stepDef = graph.steps.find((s) => s.key === stepKey);
    if (!stepDef) continue;

    if (stepDef.type === 'PARALLEL_JOIN') {
      // For a parallel join, ALL incoming predecessors must be completed
      const incomingTransitions = graph.transitions.filter((t) => t.to_step === stepKey);
      const allPredecessorsDone = incomingTransitions.every((t) => allCompleted.has(t.from_step));

      if (allPredecessorsDone) {
        readySteps.push(stepKey);
      }
    } else {
      readySteps.push(stepKey);
    }
  }

  return readySteps;
}

/**
 * Concurrency Locking & Claim Invariants
 */
export function isClaimExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function assertCanClaimTask(
  taskStatus: string,
  activeClaim?: { user_id: string; expires_at: string | null } | null,
): void {
  if (taskStatus === 'COMPLETED') {
    throw new Error('Task is already COMPLETED and cannot be claimed.');
  }
  if (taskStatus === 'FAILED' || taskStatus === 'SKIPPED') {
    throw new Error(`Task with status '${taskStatus}' cannot be claimed.`);
  }

  if (activeClaim && !isClaimExpired(activeClaim.expires_at)) {
    throw new Error(
      `Task is currently locked by user '${activeClaim.user_id}' until ${activeClaim.expires_at}.`,
    );
  }
}

export function assertCanCompleteTask(
  taskStatus: string,
  claimedByUserId?: string | null,
  executingUserId?: string,
): void {
  if (taskStatus !== 'CLAIMED' && taskStatus !== 'IN_PROGRESS') {
    throw new Error(`Cannot complete task with status '${taskStatus}'. Task must be claimed first.`);
  }

  if (claimedByUserId && executingUserId && claimedByUserId !== executingUserId) {
    throw new Error(
      `Task is claimed by '${claimedByUserId}'. User '${executingUserId}' cannot complete it.`,
    );
  }
}

export function assertWorkflowVersionIsMutable(status: string): void {
  if (status !== 'DRAFT') {
    throw new Error(
      `Workflow version with status '${status}' is immutable and cannot be modified. Create a new draft version.`,
    );
  }
}
