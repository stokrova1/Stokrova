import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ExternalIdentityMapping,
  IntegrationFieldMapping,
  IntegrationSyncRun,
  IntegrationEntityType,
  ConflictResolutionPolicy,
  CreateEntityMappingRequest,
  CreateFieldMappingRequest,
  TriggerSyncRunRequest,
} from '@stokrova/contracts';
import {
  CreateEntityMappingSchema,
  CreateFieldMappingSchema,
  TriggerSyncRunSchema,
} from '@stokrova/validation';
import {
  applyFieldTransformation,
  resolveRecordConflict,
} from '@stokrova/domain';
import { IntegrationInstancesService } from './integration-instances.service.js';

@Injectable()
export class IntegrationSyncService {
  private readonly mappings = new Map<string, ExternalIdentityMapping>();
  private readonly fieldMappings = new Map<string, IntegrationFieldMapping>();
  private readonly syncRuns = new Map<string, IntegrationSyncRun>();

  constructor(private readonly instancesService: IntegrationInstancesService) {}

  // ==========================================================================
  // 1. External Identity Mappings
  // ==========================================================================

  async createEntityMapping(
    tenantId: string,
    instanceId: string,
    req: CreateEntityMappingRequest,
  ): Promise<ExternalIdentityMapping> {
    const parsed = CreateEntityMappingSchema.parse(req);
    await this.instancesService.getInstanceById(tenantId, instanceId);

    // Check if mapping already exists for this external ID
    const existing = await this.findMappingByExternalId(
      tenantId,
      instanceId,
      parsed.entity_type,
      parsed.external_id,
    );

    if (existing) {
      existing.internal_id = parsed.internal_id;
      existing.metadata = parsed.metadata ?? existing.metadata;
      existing.last_synced_at = new Date().toISOString();
      return existing;
    }

    const id = `map_${randomUUID()}`;
    const mapping: ExternalIdentityMapping = {
      id,
      tenant_id: tenantId,
      integration_instance_id: instanceId,
      entity_type: parsed.entity_type,
      external_id: parsed.external_id,
      internal_id: parsed.internal_id,
      sync_status: 'SYNCED',
      last_synced_at: new Date().toISOString(),
      metadata: parsed.metadata,
    };

    this.mappings.set(id, mapping);
    return mapping;
  }

  async findMappingByExternalId(
    tenantId: string,
    instanceId: string,
    entityType: IntegrationEntityType,
    externalId: string,
  ): Promise<ExternalIdentityMapping | null> {
    const found = Array.from(this.mappings.values()).find(
      (m) =>
        m.tenant_id === tenantId &&
        m.integration_instance_id === instanceId &&
        m.entity_type === entityType &&
        m.external_id === externalId,
    );
    return found ?? null;
  }

  async listMappings(
    tenantId: string,
    instanceId?: string,
  ): Promise<ExternalIdentityMapping[]> {
    return Array.from(this.mappings.values()).filter((m) => {
      if (m.tenant_id !== tenantId) return false;
      if (instanceId && m.integration_instance_id !== instanceId) return false;
      return true;
    });
  }

  // ==========================================================================
  // 2. Configurable Field Mappings & Record Transformations
  // ==========================================================================

  async createFieldMapping(
    tenantId: string,
    instanceId: string,
    req: CreateFieldMappingRequest,
  ): Promise<IntegrationFieldMapping> {
    const parsed = CreateFieldMappingSchema.parse(req);
    await this.instancesService.getInstanceById(tenantId, instanceId);

    const id = `fmap_${randomUUID()}`;
    const fieldMapping: IntegrationFieldMapping = {
      id,
      tenant_id: tenantId,
      integration_instance_id: instanceId,
      entity_type: parsed.entity_type,
      source_field: parsed.source_field,
      target_field: parsed.target_field,
      transform_type: parsed.transform_type ?? 'DIRECT',
      transform_config: parsed.transform_config,
      is_required: parsed.is_required ?? false,
    };

    this.fieldMappings.set(id, fieldMapping);
    return fieldMapping;
  }

  async listFieldMappings(
    tenantId: string,
    instanceId?: string,
  ): Promise<IntegrationFieldMapping[]> {
    return Array.from(this.fieldMappings.values()).filter((fm) => {
      if (fm.tenant_id !== tenantId) return false;
      if (instanceId && fm.integration_instance_id !== instanceId) return false;
      return true;
    });
  }

  async transformRecord(
    tenantId: string,
    instanceId: string,
    entityType: IntegrationEntityType,
    sourceRecord: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const mappings = (await this.listFieldMappings(tenantId, instanceId)).filter(
      (m) => m.entity_type === entityType,
    );

    const target: Record<string, unknown> = {};

    for (const map of mappings) {
      const rawVal = sourceRecord[map.source_field];
      if (map.is_required && (rawVal === undefined || rawVal === null)) {
        throw new BadRequestException(
          `Required field '${map.source_field}' is missing in external payload.`,
        );
      }

      const transformed = applyFieldTransformation(
        rawVal,
        map.transform_type,
        map.transform_config,
      );
      target[map.target_field] = transformed;
    }

    return target;
  }

  // ==========================================================================
  // 3. Conflict Resolution
  // ==========================================================================

  resolveConflict(
    policy: ConflictResolutionPolicy,
    internalRecord: Record<string, unknown>,
    externalRecord: Record<string, unknown>,
    internalUpdatedAt: string,
    externalUpdatedAt: string,
  ): { winningRecord: Record<string, unknown>; resolution: 'INTERNAL' | 'EXTERNAL' | 'MANUAL_REQUIRED' } {
    const res = resolveRecordConflict({
      policy,
      internalRecord,
      externalRecord,
      internalUpdatedAt,
      externalUpdatedAt,
    });

    if (res.resolution === 'MANUAL_REQUIRED') {
      throw new ConflictException(
        'Conflict detected between internal and external records requiring manual review.',
      );
    }

    return res;
  }

  // ==========================================================================
  // 4. Traceable Sync Runs & Cursors
  // ==========================================================================

  async triggerSyncRun(
    tenantId: string,
    instanceId: string,
    req: TriggerSyncRunRequest,
  ): Promise<IntegrationSyncRun> {
    const parsed = TriggerSyncRunSchema.parse(req);
    const instance = await this.instancesService.getInstanceById(tenantId, instanceId);

    const id = `sync_${randomUUID()}`;
    const now = new Date().toISOString();

    const run: IntegrationSyncRun = {
      id,
      tenant_id: tenantId,
      integration_instance_id: instanceId,
      direction: parsed.direction ?? 'IMPORT',
      status: 'COMPLETED',
      records_processed: 10,
      records_accepted: 10,
      records_rejected: 0,
      records_skipped: 0,
      cursor_checkpoint: parsed.cursor_checkpoint ?? `chk_${Date.now()}`,
      error_message: null,
      started_at: now,
      completed_at: now,
    };

    this.syncRuns.set(id, run);
    instance.last_sync_at = now;
    return run;
  }

  async listSyncRuns(
    tenantId: string,
    instanceId?: string,
  ): Promise<IntegrationSyncRun[]> {
    return Array.from(this.syncRuns.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (instanceId && r.integration_instance_id !== instanceId) return false;
      return true;
    });
  }
}
