import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  IntegrationInstance,
  IntegrationInstanceStatus,
  CreateIntegrationInstanceRequest,
  UpdateIntegrationInstanceRequest,
} from '@stokrova/contracts';
import {
  CreateIntegrationInstanceSchema,
  UpdateIntegrationInstanceSchema,
} from '@stokrova/validation';
import {
  assertValidInstanceTransition,
  validateExternalEndpointUrl,
} from '@stokrova/domain';
import { ConnectorCatalogService } from './connector-catalog.service.js';

@Injectable()
export class IntegrationInstancesService {
  private readonly instances = new Map<string, IntegrationInstance>();

  constructor(private readonly catalogService: ConnectorCatalogService) {}

  async createInstance(
    tenantId: string,
    req: CreateIntegrationInstanceRequest,
  ): Promise<IntegrationInstance> {
    const parsed = CreateIntegrationInstanceSchema.parse(req);
    const now = new Date().toISOString();
    const id = `int_${randomUUID()}`;

    // Verify connector exists
    this.catalogService.getConnector(parsed.connector_code);

    // Validate any URLs present in config against SSRF blocklist
    if (parsed.config) {
      this.validateConfigUrls(parsed.config);
    }

    const instance: IntegrationInstance = {
      id,
      tenant_id: tenantId,
      name: parsed.name.trim(),
      connector_code: parsed.connector_code,
      status: 'DRAFT',
      company_id: parsed.company_id ?? null,
      branch_id: parsed.branch_id ?? null,
      config: parsed.config ?? {},
      credential_id: null,
      last_sync_at: null,
      last_health_check_at: null,
      is_healthy: true,
      health_message: 'Instance initialized in DRAFT state',
      created_at: now,
      updated_at: now,
    };

    this.instances.set(id, instance);
    return instance;
  }

  async updateInstance(
    tenantId: string,
    id: string,
    req: UpdateIntegrationInstanceRequest,
  ): Promise<IntegrationInstance> {
    const parsed = UpdateIntegrationInstanceSchema.parse(req);
    const instance = await this.getInstanceById(tenantId, id);

    if (parsed.name !== undefined) {
      instance.name = parsed.name.trim();
    }

    if (parsed.config !== undefined) {
      this.validateConfigUrls(parsed.config);
      instance.config = { ...instance.config, ...parsed.config };
    }

    if (parsed.status !== undefined) {
      assertValidInstanceTransition(instance.status, parsed.status);
      instance.status = parsed.status;
    }

    instance.updated_at = new Date().toISOString();
    return instance;
  }

  async transitionStatus(
    tenantId: string,
    id: string,
    targetStatus: IntegrationInstanceStatus,
  ): Promise<IntegrationInstance> {
    const instance = await this.getInstanceById(tenantId, id);
    assertValidInstanceTransition(instance.status, targetStatus);

    // If activating or validating, execute health check
    if (targetStatus === 'VALIDATING' || targetStatus === 'ACTIVE') {
      const health = await this.catalogService.performHealthCheck(
        instance.connector_code,
        instance.config,
      );
      instance.last_health_check_at = health.checked_at;
      instance.is_healthy = health.is_healthy;
      instance.health_message = health.message;

      if (!health.is_healthy && targetStatus === 'ACTIVE') {
        throw new BadRequestException(
          `Cannot activate integration '${instance.name}': Health check failed with message: ${health.message}`,
        );
      }
    }

    instance.status = targetStatus;
    instance.updated_at = new Date().toISOString();
    return instance;
  }

  async testConnection(
    tenantId: string,
    id: string,
  ): Promise<{ is_healthy: boolean; message: string; latency_ms: number }> {
    const instance = await this.getInstanceById(tenantId, id);
    const health = await this.catalogService.performHealthCheck(
      instance.connector_code,
      instance.config,
    );

    instance.last_health_check_at = health.checked_at;
    instance.is_healthy = health.is_healthy;
    instance.health_message = health.message;
    instance.updated_at = new Date().toISOString();

    return {
      is_healthy: health.is_healthy,
      message: health.message,
      latency_ms: health.latency_ms,
    };
  }

  async getInstanceById(tenantId: string, id: string): Promise<IntegrationInstance> {
    const instance = this.instances.get(id);
    if (!instance || instance.tenant_id !== tenantId) {
      throw new NotFoundException(`Integration instance '${id}' not found.`);
    }
    return instance;
  }

  async listInstances(tenantId: string): Promise<IntegrationInstance[]> {
    return Array.from(this.instances.values()).filter((i) => i.tenant_id === tenantId);
  }

  private validateConfigUrls(config: Record<string, unknown>): void {
    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
        const ssrf = validateExternalEndpointUrl(val);
        if (!ssrf.isValid) {
          throw new BadRequestException(
            `Configuration field '${key}' contains an invalid endpoint URL: ${ssrf.reason}`,
          );
        }
      }
    }
  }
}
