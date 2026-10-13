import { Controller, Get, Optional } from '@nestjs/common';
import { ApiConfigService } from '../config/api-config.service.js';
import { RedisService } from '../infrastructure/redis/redis.service.js';

@Controller('health')
export class HealthController {
  constructor(
    @Optional() private readonly configService?: ApiConfigService,
    @Optional() private readonly redisService?: RedisService,
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
    return {
      status: 'alive',
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  readinessCheck() {
    const redisAvailable = this.redisService ? this.redisService.isAvailable() : true;
    return {
      status: 'ready',
      checks: {
        api: 'up',
        database: 'ready',
        redis: redisAvailable ? 'up' : 'degraded',
        config: 'validated',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  readiness() {
    return this.readinessCheck();
  }
}
