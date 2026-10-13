import { Module, Global } from '@nestjs/common';
import { StructuredLoggerService } from './structured-logger.service.js';
import { MetricsService } from './metrics.service.js';

@Global()
@Module({
  providers: [StructuredLoggerService, MetricsService],
  exports: [StructuredLoggerService, MetricsService],
})
export class ObservabilityModule {}
