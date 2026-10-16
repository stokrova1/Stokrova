import { DurableMap } from '../infrastructure/database/durable-map.js';
import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
  SyncOperationResult,
  SyncChangeItem,
  SyncResultStatus,
} from '@stokrova/contracts';
import {
  evaluateInboxDeduplication,
  generateNextSequence,
  validateCursorAdvancement,
} from '@stokrova/domain';
import type { ValidatedSyncPullRequest } from '@stokrova/validation';
import { DevicesService } from '../devices/devices.service.js';
import { AuditService } from '../audit/audit.service.js';

export interface StoredSyncOperation {
  id: string;
  tenant_id: string;
  device_id: string;
  operation_id: string;
  command_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  status: SyncResultStatus;
  server_sequence: number;
  error_code?: string | null;
  error_message?: string | null;
  schema_version: number;
  created_at: string;
  processed_at: string;
}

export interface StoredSyncChange {
  sequence: number;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'EVENT';
  payload: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class SyncService {
  private readonly operations = new DurableMap<StoredSyncOperation>('sync_operations');
  private readonly changes: StoredSyncChange[] = [];
  private currentSequence = 0;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly auditService: AuditService,
  ) {}

  async pushOperations(
    tenantId: string,
    request: SyncPushRequest,
  ): Promise<SyncPushResponse> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    const results: SyncOperationResult[] = [];

    for (const op of request.operations) {
      // 1. Verify tenant scope matches payload
      if (op.tenant_id !== tenantId) {
        await this.auditService.recordSecurityEvent({
          tenant_id: tenantId,
          event_type: 'CROSS_TENANT_SYNC_ATTEMPT',
          severity: 'CRITICAL',
          details: {
            supplied_tenant: op.tenant_id,
            auth_tenant: tenantId,
            operation_id: op.operation_id,
          },
        });
        results.push({
          operation_id: op.operation_id,
          status: 'REJECTED',
          error_code: 'CROSS_TENANT_VIOLATION',
          error_message: 'Operation tenant_id does not match authenticated tenant scope',
        });
        continue;
      }

      // 2. Verify active device registration
      const isDeviceActive = await this.devicesService.validateDeviceActive(
        tenantId,
        op.device_id,
      );

      if (!isDeviceActive) {
        await this.auditService.recordSecurityEvent({
          tenant_id: tenantId,
          event_type: 'DEVICE_REVOKED_ACCESS',
          severity: 'WARN',
          details: {
            device_id: op.device_id,
            operation_id: op.operation_id,
            command_type: op.command_type,
          },
        });
        results.push({
          operation_id: op.operation_id,
          status: 'REJECTED',
          error_code: 'DEVICE_REVOKED',
          error_message: 'Device is not registered or has been revoked',
        });
        continue;
      }

      // 3. Inbox Deduplication Check
      const inboxKey = `${tenantId}:${op.operation_id}`;
      const existing = this.operations.get(inboxKey);
      const evalResult = evaluateInboxDeduplication(
        op.operation_id,
        existing
          ? {
              status: existing.status,
              server_sequence: existing.server_sequence,
              error_code: existing.error_code ?? undefined,
              error_message: existing.error_message ?? undefined,
            }
          : null,
      );

      if (evalResult.isDuplicate && evalResult.cachedResult) {
        // Return original outcome idempotently
        results.push({
          operation_id: op.operation_id,
          status: 'ALREADY_APPLIED',
          server_sequence: evalResult.cachedResult.server_sequence,
          error_code: evalResult.cachedResult.error_code,
          error_message: evalResult.cachedResult.error_message,
        });
        continue;
      }

      // 4. Process new operation transactionally
      this.currentSequence = generateNextSequence(this.currentSequence);
      const now = new Date().toISOString();

      const storedOp: StoredSyncOperation = {
        id: `sync_op_${randomUUID()}`,
        tenant_id: tenantId,
        device_id: op.device_id,
        operation_id: op.operation_id,
        command_type: op.command_type,
        entity_id: op.entity_id,
        payload: op.payload as Record<string, unknown>,
        status: 'APPLIED',
        server_sequence: this.currentSequence,
        schema_version: op.schema_version,
        created_at: op.occurred_at,
        processed_at: now,
      };

      this.operations.set(inboxKey, storedOp);

      // Append to monotonic change feed
      const entityType = op.command_type.split('.')[0] || 'GENERAL';
      const storedChange: StoredSyncChange = {
        sequence: this.currentSequence,
        tenant_id: tenantId,
        entity_type: entityType.toUpperCase(),
        entity_id: op.entity_id,
        operation: 'EVENT',
        payload: op.payload as Record<string, unknown>,
        created_at: now,
      };

      this.changes.push(storedChange);

      // Update device heartbeat
      await this.devicesService.updateLastSeen(tenantId, op.device_id);

      // Append immutable audit log
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: op.actor_user_id,
        device_id: op.device_id,
        action: 'SYNC_PUSH_APPLIED',
        entity_type: entityType.toUpperCase(),
        entity_id: op.entity_id,
        metadata: {
          operation_id: op.operation_id,
          command_type: op.command_type,
          client_sequence: op.client_sequence,
          server_sequence: this.currentSequence,
        },
      });

      results.push({
        operation_id: op.operation_id,
        status: 'APPLIED',
        server_sequence: this.currentSequence,
      });
    }

    return { results };
  }

  async pullChanges(
    tenantId: string,
    request: ValidatedSyncPullRequest,
  ): Promise<SyncPullResponse> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    const afterSequence = request.after ?? 0;
    if (!validateCursorAdvancement(this.currentSequence, afterSequence)) {
      throw new BadRequestException(
        `Requested cursor sequence ${afterSequence} is invalid or ahead of server (${this.currentSequence})`,
      );
    }

    const limit = request.limit ?? 100;

    const tenantChanges = this.changes.filter(
      (c) => c.tenant_id === tenantId && c.sequence > afterSequence,
    );

    const paginatedChanges = tenantChanges.slice(0, limit);
    const hasMore = tenantChanges.length > limit;

    const lastChange = paginatedChanges[paginatedChanges.length - 1];
    const toSequence = lastChange ? lastChange.sequence : afterSequence;

    const responseChanges: SyncChangeItem[] = paginatedChanges.map((c) => ({
      sequence: c.sequence,
      tenant_id: c.tenant_id,
      entity_type: c.entity_type,
      entity_id: c.entity_id,
      operation: c.operation,
      payload: c.payload,
      created_at: c.created_at,
    }));

    return {
      from_sequence: afterSequence,
      to_sequence: toSequence,
      has_more: hasMore,
      changes: responseChanges,
    };
  }

  getCurrentSequence(): number {
    return this.currentSequence;
  }

  clear(): void {
    this.operations.clear();
    this.changes.length = 0;
    this.currentSequence = 0;
  }
}
