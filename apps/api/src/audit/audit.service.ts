import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AuditEventResponse,
  CreateAuditEventRequest,
  SecurityEventResponse,
  RecordSecurityEventRequest,
  AuditQueryFilters,
  SecurityQueryFilters,
  SecuritySeverity,
} from '@stokrova/contracts';
import {
  assertAuditRecordImmutable,
  sanitizeSensitiveAuditData,
  classifySecuritySeverity,
  normalizeAuditAction,
} from '@stokrova/domain';

export interface StoredAuditEvent {
  id: string;
  tenant_id: string;
  actor_user_id: string | null;
  device_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  occurred_at: string;
  request_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface StoredSecurityEvent {
  id: string;
  tenant_id: string | null;
  event_type: string;
  severity: SecuritySeverity;
  occurred_at: string;
  details: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly auditEvents: StoredAuditEvent[] = [];
  private readonly securityEvents: StoredSecurityEvent[] = [];

  async recordAuditEvent(
    tenantId: string,
    req: CreateAuditEventRequest,
  ): Promise<AuditEventResponse> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    assertAuditRecordImmutable('INSERT');

    const sanitizedMetadata = sanitizeSensitiveAuditData(req.metadata);
    const normalizedAction = normalizeAuditAction(req.action);
    const occurredAt = req.occurred_at || new Date().toISOString();

    const stored: StoredAuditEvent = {
      id: `aud_${randomUUID()}`,
      tenant_id: tenantId,
      actor_user_id: req.actor_user_id ?? null,
      device_id: req.device_id ?? null,
      action: normalizedAction,
      entity_type: req.entity_type,
      entity_id: req.entity_id,
      occurred_at: occurredAt,
      request_id: req.request_id ?? null,
      metadata: sanitizedMetadata,
    };

    this.auditEvents.push(stored);
    return this.mapAuditToResponse(stored);
  }

  async recordSecurityEvent(
    req: RecordSecurityEventRequest,
  ): Promise<SecurityEventResponse> {
    const severity = req.severity || classifySecuritySeverity(req.event_type);
    const sanitizedDetails = sanitizeSensitiveAuditData(req.details);
    const occurredAt = new Date().toISOString();

    const stored: StoredSecurityEvent = {
      id: `sec_${randomUUID()}`,
      tenant_id: req.tenant_id ?? null,
      event_type: req.event_type,
      severity,
      occurred_at: occurredAt,
      details: sanitizedDetails,
    };

    this.securityEvents.push(stored);
    return this.mapSecurityToResponse(stored);
  }

  async queryAuditEvents(
    tenantId: string,
    filters?: AuditQueryFilters,
  ): Promise<AuditEventResponse[]> {
    let results = this.auditEvents.filter((e) => e.tenant_id === tenantId);

    if (filters) {
      if (filters.actor_user_id) {
        results = results.filter((e) => e.actor_user_id === filters.actor_user_id);
      }
      if (filters.entity_type) {
        results = results.filter(
          (e) => e.entity_type.toLowerCase() === filters.entity_type!.toLowerCase(),
        );
      }
      if (filters.entity_id) {
        results = results.filter((e) => e.entity_id === filters.entity_id);
      }
      if (filters.action) {
        const norm = normalizeAuditAction(filters.action);
        results = results.filter((e) => e.action === norm);
      }
      if (filters.from_date) {
        const from = new Date(filters.from_date).getTime();
        results = results.filter((e) => new Date(e.occurred_at).getTime() >= from);
      }
      if (filters.to_date) {
        const to = new Date(filters.to_date).getTime();
        results = results.filter((e) => new Date(e.occurred_at).getTime() <= to);
      }
    }

    // Sort newest first
    results.sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;

    return results.slice(offset, offset + limit).map((e) => this.mapAuditToResponse(e));
  }

  async querySecurityEvents(
    filters?: SecurityQueryFilters,
  ): Promise<SecurityEventResponse[]> {
    let results = [...this.securityEvents];

    if (filters) {
      if (filters.tenant_id) {
        results = results.filter((e) => e.tenant_id === filters.tenant_id);
      }
      if (filters.event_type) {
        results = results.filter(
          (e) => e.event_type.toLowerCase() === filters.event_type!.toLowerCase(),
        );
      }
      if (filters.severity) {
        results = results.filter((e) => e.severity === filters.severity);
      }
    }

    // Sort newest first
    results.sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;

    return results
      .slice(offset, offset + limit)
      .map((e) => this.mapSecurityToResponse(e));
  }

  clear(): void {
    this.auditEvents.length = 0;
    this.securityEvents.length = 0;
  }

  private mapAuditToResponse(e: StoredAuditEvent): AuditEventResponse {
    return {
      id: e.id,
      tenant_id: e.tenant_id,
      actor_user_id: e.actor_user_id,
      device_id: e.device_id,
      action: e.action,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      occurred_at: e.occurred_at,
      request_id: e.request_id,
      metadata: e.metadata,
    };
  }

  private mapSecurityToResponse(e: StoredSecurityEvent): SecurityEventResponse {
    return {
      id: e.id,
      tenant_id: e.tenant_id,
      event_type: e.event_type,
      severity: e.severity,
      occurred_at: e.occurred_at,
      details: e.details,
    };
  }
}
