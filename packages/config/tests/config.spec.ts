import { describe, it, expect } from 'vitest';
import { validateConfig, sanitizeConfig, ConfigValidationError } from '../src/index.js';

describe('Configuration Foundation (@stokrova/config)', () => {
  it('validates default development configuration successfully', () => {
    const config = validateConfig({});
    expect(config.nodeEnv).toBe('development');
    expect(config.appName).toBe('STOKROVA API');
    expect(config.apiPort).toBe(3000);
    expect(config.redisEnabled).toBe(true);
    expect(config.rateLimitLimit).toBe(100);
  });

  it('fails validation when production mode is set without DATABASE_URL', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'production',
      });
    }).toThrowError(ConfigValidationError);
  });

  it('fails validation on invalid port number', () => {
    expect(() => {
      validateConfig({
        API_PORT: 'not-a-number',
      });
    }).toThrowError(ConfigValidationError);
  });

  it('sanitizes sensitive credentials for safe logging', () => {
    const config = validateConfig({
      DATABASE_URL: 'postgresql://admin:super_secret_password@db.stokrova.internal:5432/stokrova_prod',
      SUPABASE_SERVICE_ROLE_KEY: 'secret-service-key-999',
      STORAGE_SECRET_ACCESS_KEY: 'r2-secret-access-token',
      STORAGE_ACCESS_KEY_ID: 'r2-key-id',
      JWT_SECRET: 'jwt-super-secret',
    });

    const sanitized = sanitizeConfig(config);

    // Passwords in URLs are masked
    expect(sanitized['databaseUrl']).not.toContain('super_secret_password');
    expect(sanitized['databaseUrl']).toContain('******');

    // Secrets are redacted
    expect(sanitized['supabaseServiceRoleKey']).toBe('[REDACTED]');
    expect(sanitized['storageSecretAccessKey']).toBe('[REDACTED]');
    expect(sanitized['storageAccessKeyId']).toBe('[REDACTED]');
    expect(sanitized['jwtSecret']).toBe('[REDACTED]');

    // Non-secrets remain visible
    expect(sanitized['nodeEnv']).toBe('development');
    expect(sanitized['appName']).toBe('STOKROVA API');
  });
});
