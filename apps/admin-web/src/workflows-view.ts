/**
 * STOKROVA Admin Web — DAG Visual Workflow Studio & Orchestrator
 * Directed Acyclic Graph builder, step state inspector, cycle detection, and trigger execution viewer.
 */

import { themeTokens, semanticTokens } from '@stokrova/ui';

export type WorkflowNodeType = 'TRIGGER' | 'CONDITION' | 'ACTION' | 'GATEWAY';

export interface WorkflowNode {
  id: string;
  label: string;
  type: WorkflowNodeType;
  description: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionLabel?: string;
}

export interface WorkflowStepTrace {
  nodeId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  startedAtIso?: string;
  finishedAtIso?: string;
  durationMs?: number;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
}

export interface WorkflowExecutionRun {
  runId: string;
  workflowId: string;
  workflowName: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAtIso: string;
  completedAtIso?: string;
  traces: WorkflowStepTrace[];
}

export class WorkflowsStudioViewModel {
  private nodes: Map<string, WorkflowNode> = new Map();
  private edges: Map<string, WorkflowEdge> = new Map();
  private runs: WorkflowExecutionRun[] = [];
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public addNode(node: WorkflowNode): void {
    this.nodes.set(node.id, { ...node, config: { ...node.config }, position: { ...node.position } });
  }

  public getNode(id: string): WorkflowNode | undefined {
    const n = this.nodes.get(id);
    return n ? { ...n } : undefined;
  }

  public getAllNodes(): WorkflowNode[] {
    return Array.from(this.nodes.values());
  }

  public addEdge(edge: WorkflowEdge): void {
    if (!this.nodes.has(edge.sourceNodeId) || !this.nodes.has(edge.targetNodeId)) {
      throw new Error(`Invalid edge: source or target node does not exist`);
    }
    this.edges.set(edge.id, { ...edge });
    if (!this.isAcyclic()) {
      this.edges.delete(edge.id);
      throw new Error('Graph cycle detected: Workflows must be non-cyclical');
    }
  }

  public getAllEdges(): WorkflowEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Cycle detection using topological sort or DFS
   */
  public isAcyclic(): boolean {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of this.nodes.values()) {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of this.edges.values()) {
      adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    let visitedCount = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      visitedCount++;
      for (const neighbor of adj.get(current) ?? []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return visitedCount === this.nodes.size;
  }

  public recordRun(run: WorkflowExecutionRun): void {
    this.runs.unshift({ ...run, traces: [...run.traces] });
  }

  public getRuns(): WorkflowExecutionRun[] {
    return [...this.runs];
  }

  // ==========================================
  // Visual Studio HTML
  // ==========================================

  public renderStudioGraphHtml(): string {
    const tokens = themeTokens[this.theme];
    const nodes = this.getAllNodes();
    const edges = this.getAllEdges();

    const nodesHtml = nodes
      .map((node) => {
        const st = semanticTokens;
        let typeBadgeColor: string = tokens.primary;
        if (node.type === 'TRIGGER') typeBadgeColor = st.success[this.theme].text;
        if (node.type === 'CONDITION') typeBadgeColor = st.warning[this.theme].text;
        if (node.type === 'GATEWAY') typeBadgeColor = st.info[this.theme].text;

        return `
          <div class="dag-node" id="node-${node.id}" style="position: absolute; left: ${node.position.x}px; top: ${node.position.y}px; width: 180px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); padding: 12px;">
            <div style="font-size: 0.7rem; font-weight: 700; color: ${typeBadgeColor}; text-transform: uppercase;">${node.type}</div>
            <div style="font-weight: 600; margin-top: 4px; font-size: 0.85rem;">${node.label}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 2px;">${node.description}</div>
          </div>
        `.trim();
      })
      .join('\n');

    return `
      <div class="dag-workflow-studio" style="position: relative; height: 500px; width: 100%; background: ${tokens.background}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
        <div class="studio-toolbar" style="padding: 12px; background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; display: flex; justify-content: space-between;">
          <span style="font-weight: 600;">Workflow Automation Visual Studio</span>
          <span style="font-size: 0.8rem; color: ${tokens.textSecondary};">Nodes: ${nodes.length} | Edges: ${edges.length}</span>
        </div>
        <div class="canvas-viewport" style="position: relative; width: 100%; height: calc(100% - 45px); background-size: 20px 20px; background-image: radial-gradient(circle, ${tokens.border} 1px, transparent 1px);">
          ${nodesHtml}
        </div>
      </div>
    `.trim();
  }
}
