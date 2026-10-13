import { describe, it, expect, beforeEach } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('returns ok status and architecture information on /health', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('stokrova-api');
    expect(result.version).toBe('0.1.0');
    expect(result.architecture).toBe('modular-monolith');
    expect(result.offline_sync_engine).toBe('ready');
    expect(result.timestamp).toBeDefined();
  });

  it('returns alive status on /health/live', () => {
    const result = controller.liveness();
    expect(result.status).toBe('alive');
    expect(result.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });

  it('returns ready status on /health/ready', () => {
    const result = controller.readinessCheck();
    expect(result.status).toBe('ready');
    expect(result.checks.api).toBe('up');
    expect(result.checks.database).toBe('ready');
    expect(result.timestamp).toBeDefined();
  });

  it('preserves legacy /health/readiness compatibility', () => {
    const result = controller.readiness();
    expect(result.status).toBe('ready');
    expect(result.checks.api).toBe('up');
  });
});
