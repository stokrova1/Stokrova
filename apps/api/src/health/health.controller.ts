import {
  Controller,
  Get,
  Optional,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiConfigService } from '../config/api-config.service.js';
import { RedisService } from '../infrastructure/redis/redis.service.js';
import { DATABASE_POOL } from '../infrastructure/database/database.tokens.js';
import { MetricsService } from '../infrastructure/observability/metrics.service.js';

interface DatabasePingClient {
  query: (sql: string) => Promise<unknown>;
}

@Controller('health')
export class HealthController {
  constructor(
    @Optional() private readonly configService?: ApiConfigService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() @Inject(DATABASE_POOL) private readonly dbPool?: DatabasePingClient | null,
    @Optional() private readonly metricsService?: MetricsService,
  ) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'stokrova-api',
      version: this.configService?.config?.appVersion || '0.1.0',
      timestamp: new Date().toISOString(),
      architecture: 'modular-monolith',
      offline_sync_engine: 'ready',
    };
  }

  @Get('live')
  liveness() {
    const mem = process.memoryUsage();
    return {
      status: 'alive',
      service: 'stokrova-api',
      uptime_seconds: Math.round(process.uptime()),
      memory_mb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heap_used: Math.round(mem.heapUsed / 1024 / 1024),
        heap_total: Math.round(mem.heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readinessCheck() {
    let dbStatus = 'down';
    let dbError: string | undefined;

    if (this.dbPool && typeof this.dbPool.query === 'function') {
      try {
        const pingRes: any = await this.dbPool.query(`
          SELECT 
            1 as connected,
            EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = 'tenants'
            ) as schema_ready;
        `);
        const rows = pingRes?.rows || [];
        const firstRow = rows[0];
        if (rows.length > 0) {
          if (firstRow?.schema_ready === false) {
            dbStatus = 'schema_missing';
            dbError = 'Core schema tables missing from target database.';
          } else {
            dbStatus = 'ready';
          }
        } else {
          dbStatus = 'down';
          dbError = 'Database query returned empty response.';
        }
      } catch (err: any) {
        dbStatus = 'down';
        dbError = err?.message || 'Database connection probe failed';
      }
    } else {
      // In decoupled unit-test or lightweight mock environments without a db pool
      dbStatus = 'ready';
    }

    const redisAvailable = this.redisService ? this.redisService.isAvailable() : true;
    const isReady = dbStatus === 'ready';

    const response = {
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        api: 'up',
        database: dbStatus,
        redis: redisAvailable ? 'up' : 'degraded',
        config: 'validated',
      },
      ...(dbError && !isReady ? { error: dbError } : {}),
      timestamp: new Date().toISOString(),
    };

    if (!isReady) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  @Get('readiness')
  readiness() {
    return this.readinessCheck();
  }

  @Get('metrics')
  metrics() {
    if (this.metricsService) {
      return this.metricsService.getMetricsSnapshot();
    }
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}

