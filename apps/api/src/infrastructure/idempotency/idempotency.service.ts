import { Injectable } from '@nestjs/common';
import type {
  IdempotencyRecord,
  IdempotencyDecision,
} from '@stokrova/contracts';
import {
  computePayloadHash,
  generateUuidV7,
} from '@stokrova/domain';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class IdempotencyService {
  private readonly memoryRecords = new Map<string, IdempotencyRecord>();

  constructor(private readonly redisService: RedisService) {}

  private getCompositeKey(tenantId: string, idempotencyKey: string): string {
    return `${tenantId}:${idempotencyKey}`;
  }

  /**
   * Evaluates an incoming idempotency key against recorded operations.
   */
  async evaluateOperation(
    tenantId: string,
    idempotencyKey: string,
    requestPath: string,
    requestMethod: string,
    payload: unknown,
  ): Promise<IdempotencyDecision> {
    const compositeKey = this.getCompositeKey(tenantId, idempotencyKey);
    const incomingHash = computePayloadHash(payload);

    const existing = this.memoryRecords.get(compositeKey);

    if (!existing) {
      // 1. New operation: record PENDING state with lock
      const now = new Date().toISOString();
      const record: IdempotencyRecord = {
        id: generateUuidV7(),
        tenant_id: tenantId,
        idempotency_key: idempotencyKey,
        request_path: requestPath,
        request_method: requestMethod,
        request_hash: incomingHash,
        status: 'PENDING',
        locked_until: new Date(Date.now() + 60000).toISOString(),
        created_at: now,
        updated_at: now,
      };

      await this.redisService.acquireLock(tenantId, `idempotency:${idempotencyKey}`, 60000);
      this.memoryRecords.set(compositeKey, record);
      return { status: 'NEW' };
    }

    // 2. Existing key with conflicting payload or route
    if (
      existing.request_hash !== incomingHash ||
      existing.request_path !== requestPath ||
      existing.request_method !== requestMethod
    ) {
      return {
        status: 'CONFLICT',
        message: `Idempotency key '${idempotencyKey}' was previously used with a different request payload or endpoint.`,
      };
    }

    // 3. Existing key currently processing
    if (existing.status === 'PENDING') {
      return { status: 'IN_PROGRESS' };
    }

    // 4. Existing key successfully resolved
    if (existing.status === 'RESOLVED') {
      return {
        status: 'RESOLVED',
        statusCode: existing.response_code || 200,
        body: existing.response_body,
      };
    }

    // In case of rejected previous attempt, allow new attempt
    await this.redisService.acquireLock(tenantId, `idempotency:${idempotencyKey}`, 60000);
    return { status: 'NEW' };
  }

  /**
   * Resolves an operation, caching its HTTP status code and response body.
   */
  async resolveOperation(
    tenantId: string,
    idempotencyKey: string,
    statusCode: number,
    responseBody: unknown,
  ): Promise<void> {
    const compositeKey = this.getCompositeKey(tenantId, idempotencyKey);
    const existing = this.memoryRecords.get(compositeKey);

    if (existing) {
      existing.status = 'RESOLVED';
      existing.response_code = statusCode;
      existing.response_body = responseBody;
      existing.locked_until = null;
      existing.updated_at = new Date().toISOString();
      this.memoryRecords.set(compositeKey, existing);
    }
    await this.redisService.releaseLock(tenantId, `idempotency:${idempotencyKey}`);
  }

  /**
   * Rejects an operation on unhandled failure, releasing the lock.
   */
  async rejectOperation(
    tenantId: string,
    idempotencyKey: string,
    _errorReason?: string,
  ): Promise<void> {
    const compositeKey = this.getCompositeKey(tenantId, idempotencyKey);
    const existing = this.memoryRecords.get(compositeKey);

    if (existing) {
      existing.status = 'REJECTED';
      existing.locked_until = null;
      existing.updated_at = new Date().toISOString();
      this.memoryRecords.set(compositeKey, existing);
    }
    await this.redisService.releaseLock(tenantId, `idempotency:${idempotencyKey}`);
  }

  // Helper for tests/resets
  clear(): void {
    this.memoryRecords.clear();
  }
}
