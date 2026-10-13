import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IntegrationAuditEvent } from '@stokrova/contracts';
import { redactSensitiveObject } from '@stokrova/domain';

@Injectable()
export class IntegrationAuditService {
  private readonly events: IntegrationAuditEvent[] = [];

  async recordEvent(
    tenantId: string,
    action: string,
    entityType: string,
    entityId: string,
    actorId?: string | null,
    details?: Record<string, unknown>,
  ): Promise<IntegrationAuditEvent> {
    const id = `iaud_${randomUUID()}`;
    const sanitizedDetails = details ? redactSensitiveObject(details) : undefined;

    const event: IntegrationAuditEvent = {
      id,
      tenant_id: tenantId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      actor_id: actorId ?? null,
      details: sanitizedDetails,
      created_at: new Date().toISOString(),
    };

    this.events.push(event);
    return event;
  }

  async listEvents(
    tenantId: string,
    entityId?: string,
    action?: string,
  ): Promise<IntegrationAuditEvent[]> {
    return this.events.filter((e) => {
      if (e.tenant_id !== tenantId) return false;
      if (entityId && e.entity_id !== entityId) return false;
      if (action && e.action !== action) return false;
      return true;
    });
  }
}
