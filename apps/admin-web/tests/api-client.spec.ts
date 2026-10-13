import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getInternalApiUrl,
  buildApiUrl,
  fetchFromInternalApi,
} from '../src/api-client.js';

describe('Vercel Services Internal API Client Suite (@stokrova/admin-web)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('resolves API_URL from Vercel service binding when present', () => {
    process.env['API_URL'] = 'https://api-internal.vercel.app';
    expect(getInternalApiUrl()).toBe('https://api-internal.vercel.app');
  });

  it('strips trailing slashes from bound API_URL', () => {
    process.env['API_URL'] = 'https://api-internal.vercel.app/';
    expect(getInternalApiUrl()).toBe('https://api-internal.vercel.app');
  });

  it('falls back to http://localhost:3000 when binding is unset', () => {
    delete process.env['API_URL'];
    expect(getInternalApiUrl()).toBe('http://localhost:3000');
  });

  it('ensures /v1 global prefix is correctly attached to endpoints', () => {
    process.env['API_URL'] = 'https://stokrova-api.internal';
    expect(buildApiUrl('health/live')).toBe('https://stokrova-api.internal/v1/health/live');
    expect(buildApiUrl('/orders')).toBe('https://stokrova-api.internal/v1/orders');
    expect(buildApiUrl('/v1/catalog/products')).toBe('https://stokrova-api.internal/v1/catalog/products');
  });

  it('executes fetchFromInternalApi using the bound URL', async () => {
    process.env['API_URL'] = 'https://stokrova-api.internal';
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchFromInternalApi('health');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://stokrova-api.internal/v1/health',
      undefined,
    );
    expect(res.status).toBe(200);
  });
});
