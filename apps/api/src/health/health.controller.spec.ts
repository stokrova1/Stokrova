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

  it('returns ready status on /health/ready when database is healthy', async () => {
    const mockPool = { query: async () => ({ rows: [{ '?column?': 1 }] }) } as any;
    const healthyController = new HealthController(undefined, undefined, mockPool);
    const result = await healthyController.readinessCheck();
    expect(result.status).toBe('ready');
    expect(result.checks.api).toBe('up');
    expect(result.checks.database).toBe('ready');
    expect(result.timestamp).toBeDefined();
  });

  it('fails readiness and throws ServiceUnavailableException when database probe fails', async () => {
    const mockFailingPool = {
      query: async () => {
        throw new Error('Connection refused to postgresql:5432');
      },
    } as any;
    const failingController = new HealthController(undefined, undefined, mockFailingPool);
    await expect(failingController.readinessCheck()).rejects.toThrow();
  });

  it('preserves legacy /health/readiness compatibility', async () => {
    const result = await controller.readiness();
    expect(result.status).toBe('ready');
    expect(result.checks.api).toBe('up');
  });

  it('exposes metrics snapshot on /health/metrics', () => {
    const result = controller.metrics();
    expect(result.status).toBe('ok');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
