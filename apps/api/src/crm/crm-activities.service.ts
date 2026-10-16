import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CrmActivity,
  CreateCrmActivityRequest,
  CrmTask,
  CreateCrmTaskRequest,
  UpdateCrmTaskRequest,
  CrmTimelineEvent,
} from '@stokrova/contracts';
import {
  CreateCrmActivitySchema,
  CreateCrmTaskSchema,
  UpdateCrmTaskSchema,
} from '@stokrova/validation';
import { OrdersService } from '../orders/orders.service.js';

@Injectable()
export class CrmActivitiesService {
  private readonly activities = new DurableMap<CrmActivity>('crm_activities');
  private readonly tasks = new DurableMap<CrmTask>('crm_tasks');

  constructor(
    private readonly ordersService?: OrdersService,
  ) {}

  // ==========================================
  // 1. CRM Activities
  // ==========================================

  async recordActivity(
    tenantId: string,
    req: CreateCrmActivityRequest,
  ): Promise<CrmActivity> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmActivitySchema.parse(req);

    const now = new Date().toISOString();
    const activity: CrmActivity = {
      id: `act_${randomUUID()}`,
      tenant_id: tenantId,
      customer_id: parsed.customer_id ?? null,
      contact_id: parsed.contact_id ?? null,
      opportunity_id: parsed.opportunity_id ?? null,
      lead_id: parsed.lead_id ?? null,
      activity_type: parsed.activity_type,
      subject: parsed.subject.trim(),
      description: parsed.description ?? null,
      performed_by: parsed.performed_by,
      duration_minutes: parsed.duration_minutes ?? null,
      performed_at: parsed.performed_at ?? now,
      created_at: now,
    };

    this.activities.set(activity.id, activity);
    return activity;
  }

  async listActivities(
    tenantId: string,
    filter?: {
      customer_id?: string;
      opportunity_id?: string;
      lead_id?: string;
    },
  ): Promise<CrmActivity[]> {
    return Array.from(this.activities.values())
      .filter((a) => {
        if (a.tenant_id !== tenantId) return false;
        if (filter?.customer_id && a.customer_id !== filter.customer_id) return false;
        if (filter?.opportunity_id && a.opportunity_id !== filter.opportunity_id) return false;
        if (filter?.lead_id && a.lead_id !== filter.lead_id) return false;
        return true;
      })
      .sort((a, b) => (a.performed_at > b.performed_at ? -1 : 1));
  }

  // ==========================================
  // 2. Follow-Up Tasks
  // ==========================================

  async createTask(
    tenantId: string,
    req: CreateCrmTaskRequest,
  ): Promise<CrmTask> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmTaskSchema.parse(req);

    const now = new Date().toISOString();
    const task: CrmTask = {
      id: `tsk_${randomUUID()}`,
      tenant_id: tenantId,
      customer_id: parsed.customer_id ?? null,
      opportunity_id: parsed.opportunity_id ?? null,
      lead_id: parsed.lead_id ?? null,
      subject: parsed.subject.trim(),
      description: parsed.description ?? null,
      due_date: parsed.due_date,
      priority: parsed.priority ?? 'MEDIUM',
      status: 'PENDING',
      completed_at: null,
      assigned_to: parsed.assigned_to ?? null,
      created_at: now,
      updated_at: now,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  async updateTask(
    tenantId: string,
    taskId: string,
    req: UpdateCrmTaskRequest,
  ): Promise<CrmTask> {
    const task = this.tasks.get(taskId);
    if (!task || task.tenant_id !== tenantId) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const parsed = UpdateCrmTaskSchema.parse(req);

    if (parsed.subject !== undefined) task.subject = parsed.subject.trim();
    if (parsed.description !== undefined) task.description = parsed.description;
    if (parsed.due_date !== undefined) task.due_date = parsed.due_date;
    if (parsed.priority !== undefined) task.priority = parsed.priority;
    if (parsed.status !== undefined) {
      task.status = parsed.status;
      if (parsed.status === 'COMPLETED' && !task.completed_at) {
        task.completed_at = new Date().toISOString();
      } else if (parsed.status !== 'COMPLETED') {
        task.completed_at = null;
      }
    }
    if (parsed.completed_at !== undefined) task.completed_at = parsed.completed_at;
    if (parsed.assigned_to !== undefined) task.assigned_to = parsed.assigned_to;
    task.updated_at = new Date().toISOString();

    return task;
  }

  async listTasks(
    tenantId: string,
    filter?: {
      customer_id?: string;
      assigned_to?: string;
      status?: string;
    },
  ): Promise<CrmTask[]> {
    return Array.from(this.tasks.values())
      .filter((t) => {
        if (t.tenant_id !== tenantId) return false;
        if (filter?.customer_id && t.customer_id !== filter.customer_id) return false;
        if (filter?.assigned_to && t.assigned_to !== filter.assigned_to) return false;
        if (filter?.status && t.status !== filter.status) return false;
        return true;
      })
      .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
  }

  // ==========================================
  // 3. Unified Activity Timeline Aggregation
  // ==========================================

  async getCustomerTimeline(
    tenantId: string,
    customerId: string,
  ): Promise<CrmTimelineEvent[]> {
    const events: CrmTimelineEvent[] = [];

    // 1. CRM Activities
    const custActivities = Array.from(this.activities.values()).filter(
      (a) => a.tenant_id === tenantId && a.customer_id === customerId,
    );
    for (const a of custActivities) {
      events.push({
        id: a.id,
        source: 'CRM_ACTIVITY',
        event_type: a.activity_type,
        timestamp: a.performed_at,
        title: a.subject,
        description: a.description,
        entity_id: a.id,
        actor_id: a.performed_by,
      });
    }

    // 2. CRM Tasks
    const custTasks = Array.from(this.tasks.values()).filter(
      (t) => t.tenant_id === tenantId && t.customer_id === customerId,
    );
    for (const t of custTasks) {
      events.push({
        id: t.id,
        source: 'CRM_TASK',
        event_type: t.status === 'COMPLETED' ? 'TASK_COMPLETED' : 'TASK_DUE',
        timestamp: t.completed_at ?? t.due_date,
        title: t.subject,
        description: t.description,
        entity_id: t.id,
        actor_id: t.assigned_to,
      });
    }

    // 3. Commerce Orders (from OrdersService if available)
    if (this.ordersService) {
      try {
        const orders = await this.ordersService.listSalesOrders(tenantId, { customer_id: customerId });
        for (const o of orders) {
          events.push({
            id: o.id,
            source: 'COMMERCE_ORDER',
            event_type: 'ORDER_PLACED',
            timestamp: o.created_at,
            title: `Order #${o.order_number} (${o.status})`,
            description: `Total amount: ${o.grand_total_minor} ${o.currency_code}`,
            entity_id: o.id,
            actor_id: null,
            metadata: {
              total_amount_minor: o.grand_total_minor,
              currency_code: o.currency_code,
            },
          });
        }
      } catch {
        // Skip orders if service encounters error or not initialized
      }
    }

    // Sort descending by timestamp
    return events.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
  }
}
