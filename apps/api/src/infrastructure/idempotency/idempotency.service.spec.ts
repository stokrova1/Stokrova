import { describe, it, expect, beforeEach } from 'vitest';
import { IdempotencyService } from './idempotency.service.js';
import { RedisService } from '../redis/redis.service.js';
import { ApiConfigService } from '../../config/api-config.service.js';

describe('IdempotencyService (Phase 1 Specification Section 25)', () => {
  let idempotencyService: IdempotencyService;
  let redisService: RedisService;
  let configService: ApiConfigService;

  beforeEach(() => {
    configService = new ApiConfigService();
    redisService = new RedisService(configService);
    idempotencyService = new IdempotencyService(redisService);
  });

  it('marks a new operation as NEW and acquires tenant lock', async () => {
    const decision = await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1001',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    expect(decision.status).toBe('NEW');
  });

  it('returns IN_PROGRESS for concurrent in-flight requests with identical key', async () => {
    await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1002',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    const concurrentDecision = await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1002',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    expect(concurrentDecision.status).toBe('IN_PROGRESS');
  });

  it('detects CONFLICT when idempotency key is reused with different payload', async () => {
    await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1003',
      '/v1/orders',
      'POST',
      { amount: 5000, item: 'A' },
    );

    const conflictDecision = await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1003',
      '/v1/orders',
      'POST',
      { amount: 9000, item: 'B' },
    );

    expect(conflictDecision.status).toBe('CONFLICT');
    if (conflictDecision.status === 'CONFLICT') {
      expect(conflictDecision.message).toContain('different request payload');
    }
  });

  it('detects CONFLICT when idempotency key is reused across different endpoints', async () => {
    await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1004',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    const conflictDecision = await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1004',
      '/v1/refunds',
      'POST',
      { amount: 5000 },
    );

    expect(conflictDecision.status).toBe('CONFLICT');
  });

  it('replays cached response for RESOLVED operation', async () => {
    await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1005',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    await idempotencyService.resolveOperation('tenant_alpha', 'key-1005', 201, {
      orderId: 'ord_12345',
      status: 'CREATED',
    });

    const replayDecision = await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1005',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    expect(replayDecision.status).toBe('RESOLVED');
    if (replayDecision.status === 'RESOLVED') {
      expect(replayDecision.statusCode).toBe(201);
      expect(replayDecision.body).toEqual({
        orderId: 'ord_12345',
        status: 'CREATED',
      });
    }
  });

  it('allows retry with status NEW after operation rejection', async () => {
    await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1006',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    await idempotencyService.rejectOperation('tenant_alpha', 'key-1006', 'Network timeout');

    const retryDecision = await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'key-1006',
      '/v1/orders',
      'POST',
      { amount: 5000 },
    );

    expect(retryDecision.status).toBe('NEW');
  });

  it('guarantees tenant isolation: same key across different tenants does not collide', async () => {
    await idempotencyService.evaluateOperation(
      'tenant_alpha',
      'shared-key-99',
      '/v1/orders',
      'POST',
      { order: 1 },
    );

    await idempotencyService.resolveOperation('tenant_alpha', 'shared-key-99', 200, {
      result: 'AlphaResult',
    });

    // Tenant Beta uses the exact same key
    const betaDecision = await idempotencyService.evaluateOperation(
      'tenant_beta',
      'shared-key-99',
      '/v1/orders',
      'POST',
      { order: 2 },
    );

    expect(betaDecision.status).toBe('NEW');
  });
});
