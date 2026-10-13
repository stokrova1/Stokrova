import { describe, it, expect, beforeEach } from 'vitest';
import { RedisService } from './redis.service.js';
import { ApiConfigService } from '../../config/api-config.service.js';

describe('RedisService (Phase 1 Specification Section 26 & 27)', () => {
  let redisService: RedisService;
  let configService: ApiConfigService;

  beforeEach(() => {
    configService = new ApiConfigService();
    redisService = new RedisService(configService);
  });

  it('formats keys strictly with tenant namespace isolation', () => {
    const key = redisService.formatKey('tenant-123', 'cache', 'product:sku-99');
    expect(key).toBe('stokrova:tenant-123:cache:product:sku-99');
  });

  it('throws an error if tenantId is missing or empty', () => {
    expect(() => redisService.formatKey('', 'cache', 'key')).toThrow(
      'Tenant ID is mandatory for Redis key isolation.',
    );
  });

  it('sets, gets, and deletes values within tenant boundary', async () => {
    await redisService.set('tenant-1', 'session', 'token-1', 'valid-user-session');
    const val = await redisService.get('tenant-1', 'session', 'token-1');
    expect(val).toBe('valid-user-session');

    // Cross-tenant isolation
    const crossTenantVal = await redisService.get('tenant-2', 'session', 'token-1');
    expect(crossTenantVal).toBeNull();

    await redisService.del('tenant-1', 'session', 'token-1');
    const deletedVal = await redisService.get('tenant-1', 'session', 'token-1');
    expect(deletedVal).toBeNull();
  });

  it('acquires and releases distributed mutual exclusion locks', async () => {
    const lock1 = await redisService.acquireLock('tenant-1', 'resource-abc', 5000);
    expect(lock1).toBe(true);

    // Second lock attempt for same tenant and resource should fail
    const lock2 = await redisService.acquireLock('tenant-1', 'resource-abc', 5000);
    expect(lock2).toBe(false);

    // Different tenant can acquire lock on their own resource-abc
    const lockTenant2 = await redisService.acquireLock('tenant-2', 'resource-abc', 5000);
    expect(lockTenant2).toBe(true);

    // Release lock1
    await redisService.releaseLock('tenant-1', 'resource-abc');

    // Now re-acquisition succeeds
    const lock3 = await redisService.acquireLock('tenant-1', 'resource-abc', 5000);
    expect(lock3).toBe(true);
  });

  it('executes operation withLock and guarantees release on error', async () => {
    await expect(
      redisService.withLock('tenant-1', 'failing-task', 5000, async () => {
        throw new Error('Task failed internally');
      }),
    ).rejects.toThrow('Task failed internally');

    // Lock must be released despite exception
    const canAcquireAgain = await redisService.acquireLock('tenant-1', 'failing-task', 5000);
    expect(canAcquireAgain).toBe(true);
  });
});
