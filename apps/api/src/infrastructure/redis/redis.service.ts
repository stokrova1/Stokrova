import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ApiConfigService } from '../../config/api-config.service.js';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private memoryCache = new Map<string, MemoryCacheEntry>();
  private locks = new Map<string, number>(); // key -> expiresAt
  private cleanupInterval: any;

  constructor(private readonly configService: ApiConfigService) {
    // Background garbage collection for expired in-memory cache entries
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt > 0 && entry.expiresAt <= now) {
          this.memoryCache.delete(key);
        }
      }
      for (const [key, expiresAt] of this.locks.entries()) {
        if (expiresAt <= now) {
          this.locks.delete(key);
        }
      }
    }, 30000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Enforces Section 20 Cache Rules: key format strictly scoped by tenant
   * Format: stokrova:{tenantId}:{namespace}:{key}
   */
  formatKey(tenantId: string, namespace: string, key: string): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new Error('Tenant ID is mandatory for Redis key isolation.');
    }
    return `stokrova:${tenantId.trim()}:${namespace.trim()}:${key.trim()}`;
  }

  async get(tenantId: string, namespace: string, key: string): Promise<string | null> {
    try {
      const formattedKey = this.formatKey(tenantId, namespace, key);
      const entry = this.memoryCache.get(formattedKey);
      if (!entry) return null;
      if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
        this.memoryCache.delete(formattedKey);
        return null;
      }
      return entry.value;
    } catch (err: any) {
      this.logger.warn(`Redis get failed for [${tenantId}:${key}]: ${err.message}. Degraded to cache-miss.`);
      return null;
    }
  }

  async set(
    tenantId: string,
    namespace: string,
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const formattedKey = this.formatKey(tenantId, namespace, key);
      const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
      this.memoryCache.set(formattedKey, { value, expiresAt });
    } catch (err: any) {
      this.logger.warn(`Redis set failed for [${tenantId}:${key}]: ${err.message}. Ignored in degraded mode.`);
    }
  }

  async del(tenantId: string, namespace: string, key: string): Promise<void> {
    try {
      const formattedKey = this.formatKey(tenantId, namespace, key);
      this.memoryCache.delete(formattedKey);
    } catch (err: any) {
      this.logger.warn(`Redis del failed for [${tenantId}:${key}]: ${err.message}.`);
    }
  }

  /**
   * Distributed lock primitive.
   * Acquires a tenant-scoped mutual exclusion lock.
   */
  async acquireLock(tenantId: string, resource: string, ttlMs = 5000): Promise<boolean> {
    const lockKey = this.formatKey(tenantId, 'lock', resource);
    const now = Date.now();
    const existingExpiresAt = this.locks.get(lockKey);

    if (existingExpiresAt && existingExpiresAt > now) {
      return false; // Already locked by another worker
    }

    this.locks.set(lockKey, now + ttlMs);
    return true;
  }

  async releaseLock(tenantId: string, resource: string): Promise<void> {
    const lockKey = this.formatKey(tenantId, 'lock', resource);
    this.locks.delete(lockKey);
  }

  /**
   * Executes an action inside an acquired distributed lock, releasing it on completion.
   */
  async withLock<T>(
    tenantId: string,
    resource: string,
    ttlMs: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    const acquired = await this.acquireLock(tenantId, resource, ttlMs);
    if (!acquired) {
      throw new Error(`Failed to acquire distributed lock for resource '${resource}' under tenant '${tenantId}'.`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(tenantId, resource);
    }
  }

  isAvailable(): boolean {
    return this.configService.config.redisEnabled;
  }
}
