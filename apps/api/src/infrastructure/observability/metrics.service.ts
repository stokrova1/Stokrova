import { Injectable } from '@nestjs/common';

export interface RequestMetric {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

@Injectable()
export class MetricsService {
  private totalRequests = 0;
  private totalErrors = 0;
  private totalDurationMs = 0;
  private statusCodes: Record<number, number> = {};

  recordRequest(_method: string, _path: string, statusCode: number, durationMs: number): void {
    this.totalRequests++;
    this.totalDurationMs += durationMs;

    this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;

    if (statusCode >= 400) {
      this.totalErrors++;
    }
  }

  getMetricsSnapshot() {
    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRate: this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) * 100 : 0,
      averageLatencyMs: this.totalRequests > 0 ? Math.round(this.totalDurationMs / this.totalRequests) : 0,
      statusCodes: { ...this.statusCodes },
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
