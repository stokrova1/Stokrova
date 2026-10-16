import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CrmAutomation,
  CreateCrmAutomationRequest,
  UpdateCrmAutomationRequest,
  CrmAutomationExecution,
  CrmAutomationActionStep,
} from '@stokrova/contracts';
import {
  CreateCrmAutomationSchema,
  UpdateCrmAutomationSchema,
} from '@stokrova/validation';
import { validateAutomationGraph } from '@stokrova/domain';
import { CrmActivitiesService } from './crm-activities.service.js';
import { MockCommunicationAdapter } from './adapters/communication.adapter.js';

export interface DomainEventInput {
  event_type: string;
  event_id: string;
  customer_id?: string | null;
  payload: Record<string, any>;
}

@Injectable()
export class CrmAutomationService {
  private readonly logger = new Logger(CrmAutomationService.name);
  private readonly automations = new DurableMap<CrmAutomation>('crm_automations');
  private readonly executions = new DurableMap<CrmAutomationExecution>('crm_automation_executions');

  constructor(
    private readonly activitiesService: CrmActivitiesService,
    private readonly commAdapter: MockCommunicationAdapter,
  ) {}

  // ==========================================
  // 1. Workflow Definition Management
  // ==========================================

  async createAutomation(
    tenantId: string,
    req: CreateCrmAutomationRequest,
  ): Promise<CrmAutomation> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmAutomationSchema.parse(req);

    // Validate graph structure and safety bounds (max 10 steps, no invalid action types)
    validateAutomationGraph(parsed.actions_json);

    const autoCode = parsed.automation_code?.trim().toUpperCase() ?? `AUTO-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    for (const a of this.automations.values()) {
      if (a.tenant_id === tenantId && a.automation_code === autoCode) {
        throw new ConflictException(`Automation with code ${autoCode} already exists`);
      }
    }

    const now = new Date().toISOString();
    const automation: CrmAutomation = {
      id: `auto_${randomUUID()}`,
      tenant_id: tenantId,
      automation_code: autoCode,
      name: parsed.name.trim(),
      trigger_type: parsed.trigger_type,
      trigger_filter_json: parsed.trigger_filter_json ?? null,
      actions_json: parsed.actions_json,
      status: 'DRAFT',
      version: 1,
      created_at: now,
      updated_at: now,
    };

    this.automations.set(automation.id, automation);
    return automation;
  }

  async updateAutomation(
    tenantId: string,
    automationId: string,
    req: UpdateCrmAutomationRequest,
  ): Promise<CrmAutomation> {
    const auto = this.automations.get(automationId);
    if (!auto || auto.tenant_id !== tenantId) {
      throw new NotFoundException(`Automation ${automationId} not found`);
    }

    const parsed = UpdateCrmAutomationSchema.parse(req);

    if (parsed.actions_json) {
      validateAutomationGraph(parsed.actions_json);
      auto.actions_json = parsed.actions_json;
      auto.version += 1; // Increment version when actions mutate
    }

    if (parsed.name !== undefined) auto.name = parsed.name.trim();
    if (parsed.trigger_filter_json !== undefined) auto.trigger_filter_json = parsed.trigger_filter_json;
    if (parsed.status !== undefined) auto.status = parsed.status;
    auto.updated_at = new Date().toISOString();

    return auto;
  }

  async publishAutomation(tenantId: string, automationId: string): Promise<CrmAutomation> {
    const auto = this.automations.get(automationId);
    if (!auto || auto.tenant_id !== tenantId) {
      throw new NotFoundException(`Automation ${automationId} not found`);
    }

    auto.status = 'ACTIVE';
    auto.updated_at = new Date().toISOString();
    return auto;
  }

  async getAutomation(tenantId: string, automationId: string): Promise<CrmAutomation> {
    const auto = this.automations.get(automationId);
    if (!auto || auto.tenant_id !== tenantId) {
      throw new NotFoundException(`Automation ${automationId} not found`);
    }
    return auto;
  }

  async listAutomations(tenantId: string): Promise<CrmAutomation[]> {
    return Array.from(this.automations.values()).filter((a) => a.tenant_id === tenantId);
  }

  // ==========================================
  // 2. Event-Driven Workflow Execution
  // ==========================================

  async processDomainEvent(
    tenantId: string,
    event: DomainEventInput,
  ): Promise<CrmAutomationExecution[]> {
    const executions: CrmAutomationExecution[] = [];

    // Find active automations matching the trigger
    const matchingAutomations = Array.from(this.automations.values()).filter(
      (a) => a.tenant_id === tenantId && a.status === 'ACTIVE' && a.trigger_type === event.event_type,
    );

    for (const auto of matchingAutomations) {
      // Idempotency check: don't execute the same trigger event twice for an automation
      const execKey = `${tenantId}:${auto.id}:${event.event_id}`;
      if (this.executions.has(execKey)) {
        this.logger.log(`Idempotent skip: Event ${event.event_id} already executed for automation ${auto.id}`);
        executions.push(this.executions.get(execKey)!);
        continue;
      }

      // Check optional trigger filter
      if (auto.trigger_filter_json) {
        let matchesFilter = true;
        for (const [key, expected] of Object.entries(auto.trigger_filter_json)) {
          if (event.payload[key] !== expected) {
            matchesFilter = false;
            break;
          }
        }
        if (!matchesFilter) continue;
      }

      // Pin the version of the automation being executed
      const executionVersion = auto.version;
      const stepResults: Record<string, any> = {};
      let executionSuccess = true;

      // Execute steps in sequence (strictly bounded to max 10 steps)
      for (const step of auto.actions_json) {
        try {
          const result = await this.executeStep(tenantId, step, event);
          stepResults[step.step_id] = { status: 'SUCCESS', result };
        } catch (err: any) {
          executionSuccess = false;
          stepResults[step.step_id] = { status: 'FAILED', error: err.message };
          break; // Halt execution on step failure
        }
      }

      const execution: CrmAutomationExecution = {
        id: `exec_${randomUUID()}`,
        tenant_id: tenantId,
        automation_id: auto.id,
        version: executionVersion,
        customer_id: event.customer_id ?? null,
        trigger_event_id: event.event_id,
        status: executionSuccess ? 'COMPLETED' : 'FAILED',
        step_results_json: stepResults,
        executed_at: new Date().toISOString(),
      };

      this.executions.set(execKey, execution);
      executions.push(execution);
    }

    return executions;
  }

  private async executeStep(
    tenantId: string,
    step: CrmAutomationActionStep,
    event: DomainEventInput,
  ): Promise<any> {
    switch (step.action_type) {
      case 'SEND_MESSAGE': {
        const recipient = step.params['recipient'] ?? event.payload['email'] ?? event.payload['phone'];
        const msgResult = await this.commAdapter.sendMessage({
          channel: step.params['channel'] ?? 'EMAIL',
          recipient_address: recipient,
          subject: step.params['subject'],
          body: step.params['body'] ?? 'Automated message',
          operation_id: `auto_${event.event_id}_${step.step_id}`,
          tenant_id: tenantId,
        });
        return msgResult;
      }

      case 'CREATE_TASK': {
        const task = await this.activitiesService.createTask(tenantId, {
          customer_id: event.customer_id ?? null,
          subject: step.params['subject'] ?? 'Automated CRM Task',
          description: step.params['description'] ?? `Triggered by event ${event.event_type}`,
          due_date: step.params['due_date'] ?? new Date(Date.now() + 86400000).toISOString(),
          priority: step.params['priority'] ?? 'MEDIUM',
          assigned_to: step.params['assigned_to'],
        });
        return task;
      }

      case 'RECORD_ACTIVITY': {
        const act = await this.activitiesService.recordActivity(tenantId, {
          customer_id: event.customer_id ?? null,
          activity_type: 'NOTE',
          subject: step.params['subject'] ?? 'Automated Activity Record',
          description: step.params['description'] ?? `Automation executed for ${event.event_type}`,
          performed_by: 'SYSTEM_AUTOMATION',
        });
        return act;
      }

      case 'UPDATE_TAG':
      case 'ASSIGN_OWNER':
        return { applied: true, params: step.params };

      default:
        throw new Error(`Unsupported action type: ${step.action_type}`);
    }
  }

  async listExecutions(tenantId: string, automationId?: string): Promise<CrmAutomationExecution[]> {
    return Array.from(this.executions.values()).filter(
      (e) => e.tenant_id === tenantId && (!automationId || e.automation_id === automationId),
    );
  }
}
