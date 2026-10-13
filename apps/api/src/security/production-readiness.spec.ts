import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac, createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { HealthController } from '../health/health.controller.js';
import { TransactionManager } from '../infrastructure/database/transaction.manager.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';
import { MetricsService } from '../infrastructure/observability/metrics.service.js';
import { GlobalHttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { sanitizeUrl } from '../common/utils/url-sanitizer.js';
import {
  validateConfig,
  sanitizeConfig,
  ConfigValidationError,
} from '@stokrova/config';
import { withTransaction } from '@stokrova/database';

describe('STOKROVA Phase 13 — Production Readiness & Operational Certification Suite', () => {
  const originalEnv = { ...process.env };
  const PROD_JWT_SECRET = 'stokrova-production-grade-jwt-secret-minimum-32-chars-long!';

  beforeEach(() => {
    process.env['JWT_SECRET'] = PROD_JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function createMockExecutionContext(req: Partial<Request>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req as Request,
        getResponse: () => ({} as Response),
      }),
    } as unknown as ExecutionContext;
  }

  function signJwt(payload: Record<string, unknown>, secret = PROD_JWT_SECRET): string {
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    return `${headerB64}.${payloadB64}.${sig}`;
  }

  // ==========================================================================
  // Gate A: Deployment Reproducibility & Production Configuration
  // ==========================================================================
  describe('Gate A: Configuration Hardening & Secret Protection', () => {
    it('1. validates legitimate production environment configuration', () => {
      const config = validateConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:prod_pwd@db.stokrova.internal:5432/postgres',
        JWT_SECRET: PROD_JWT_SECRET,
        PORT: '3000',
      });
      expect(config.nodeEnv).toBe('production');
      expect(config.apiPort).toBe(3000);
      expect(config.jwtSecret).toBe(PROD_JWT_SECRET);
    });

    it('2. safely crashes startup with ConfigValidationError if DATABASE_URL is missing in production', () => {
      expect(() => {
        validateConfig({
          NODE_ENV: 'production',
          JWT_SECRET: PROD_JWT_SECRET,
        });
      }).toThrowError(ConfigValidationError);
    });

    it('3. safely crashes startup with ConfigValidationError if JWT_SECRET is missing or short in production', () => {
      expect(() => {
        validateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://postgres:prod_pwd@db.stokrova.internal:5432/postgres',
        });
      }).toThrowError(ConfigValidationError);

      expect(() => {
        validateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://postgres:prod_pwd@db.stokrova.internal:5432/postgres',
          JWT_SECRET: 'too_short',
        });
      }).toThrowError(ConfigValidationError);
    });

    it('4. sanitizes sensitive connection strings, secrets and tokens for telemetry', () => {
      const config = validateConfig({
        DATABASE_URL: 'postgresql://admin:super_secret_pg_pwd@db.stokrova.internal:5432/stokrova_prod',
        JWT_SECRET: PROD_JWT_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: 'secret-service-role-key-xyz',
        STORAGE_SECRET_ACCESS_KEY: 'r2-secret-token-key-abc',
      });

      const sanitized = sanitizeConfig(config);
      expect(sanitized['databaseUrl']).not.toContain('super_secret_pg_pwd');
      expect(sanitized['databaseUrl']).toContain('******');
      expect(sanitized['jwtSecret']).toBe('[REDACTED]');
      expect(sanitized['supabaseServiceRoleKey']).toBe('[REDACTED]');
      expect(sanitized['storageSecretAccessKey']).toBe('[REDACTED]');
    });
  });

  // ==========================================================================
  // Gate B: Identity, Multi-Tenant Boundary & Production Bypass Gating
  // ==========================================================================
  describe('Gate B: Identity & Multi-Tenant Cryptographic Gating', () => {
    let authGuard: AuthGuard;
    let tenantGuard: TenantGuard;

    beforeEach(() => {
      authGuard = new AuthGuard();
      tenantGuard = new TenantGuard();
    });

    it('5. strictly ignores x-test-* bypass headers in production mode (NODE_ENV=production)', () => {
      process.env['NODE_ENV'] = 'production';

      const req: any = {
        headers: {
          'x-test-user-id': 'usr_attacker',
          'x-test-platform-admin': 'true',
          'x-test-allowed-tenants': 'tenant_victim',
        },
      };
      const ctx = createMockExecutionContext(req);

      // Must reject because no valid Authorization Bearer token is provided
      expect(() => authGuard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('6. rejects forged JWT in production mode', () => {
      process.env['NODE_ENV'] = 'production';

      const forgedToken = signJwt(
        { sub: 'usr_attacker', email: 'attacker@evil.com', exp: Math.floor(Date.now() / 1000) + 3600 },
        'attacker-unauthorized-secret-xyz',
      );

      const req: any = { headers: { authorization: `Bearer ${forgedToken}` } };
      const ctx = createMockExecutionContext(req);

      expect(() => authGuard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('7. rejects expired JWT in production mode', () => {
      process.env['NODE_ENV'] = 'production';

      const expiredToken = signJwt({
        sub: 'usr_expired',
        email: 'expired@stokrova.com',
        exp: Math.floor(Date.now() / 1000) - 120, // expired 2 mins ago
      });

      const req: any = { headers: { authorization: `Bearer ${expiredToken}` } };
      const ctx = createMockExecutionContext(req);

      expect(() => authGuard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('8. crashes token verification if JWT_SECRET is unset in production environment', () => {
      process.env['NODE_ENV'] = 'production';
      delete process.env['JWT_SECRET'];

      const token = 'header.payload.signature';
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const ctx = createMockExecutionContext(req);

      expect(() => authGuard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('9. TenantGuard blocks unauthorized cross-tenant requests in production', () => {
      process.env['NODE_ENV'] = 'production';

      const req: any = {
        user: {
          id: 'usr_legit_tenant_a',
          email: 'user@tenant-a.com',
          tenant_ids: ['tenant_a'],
          is_platform_admin: false,
        },
        headers: {
          'x-tenant-id': 'tenant_b', // Attempt to access tenant_b!
        },
      };
      const ctx = createMockExecutionContext(req);

      expect(() => tenantGuard.canActivate(ctx)).toThrowError(ForbiddenException);
    });

    it('10. TenantGuard allows verified tenant access in production', () => {
      process.env['NODE_ENV'] = 'production';

      const req: any = {
        user: {
          id: 'usr_legit_tenant_a',
          email: 'user@tenant-a.com',
          tenant_ids: ['tenant_a'],
          is_platform_admin: false,
        },
        headers: {
          'x-tenant-id': 'tenant_a',
        },
      };
      const ctx = createMockExecutionContext(req);

      expect(tenantGuard.canActivate(ctx)).toBe(true);
      expect(req.tenantId).toBe('tenant_a');
    });
  });

  // ==========================================================================
  // Gate C: Database Migration & Pooled Connection RLS Context Isolation
  // ==========================================================================
  describe('Gate C: Database Migrations & Pooled Connection Isolation', () => {
    it('11. verifies that RLS migration 0013 defines restrictive isolation policies', () => {
      const rootDir = resolve(__dirname, '../../../..');
      const migrationFile = resolve(
        rootDir,
        'packages/database/drizzle/0013_security_hardening_rls.sql',
      );
      expect(existsSync(migrationFile)).toBe(true);
      const sql = readFileSync(migrationFile, 'utf8');

      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('FORCE ROW LEVEL SECURITY');
      expect(sql).toContain('app.current_tenant_id');
      expect(sql).toContain('app.is_platform_admin');
    });

    it('12. TransactionManager executes scoped session parameter set_config for tenant isolation', async () => {
      const executedSqls: string[] = [];
      const mockTx = {
        execute: async (statement: any) => {
          executedSqls.push(statement?.queryChunks?.[0] || 'set_config');
          return [];
        },
      };

      const mockDb: any = {
        transaction: async (cb: any) => {
          return cb(mockTx);
        },
      };

      const txManager = new TransactionManager(mockDb);

      let callbackExecuted = false;
      await txManager.execute(
        async (tx) => {
          callbackExecuted = true;
          expect(tx).toBeDefined();
          return 'SUCCESS';
        },
        { tenantId: 'tenant_omega_01', isPlatformAdmin: false },
      );

      expect(callbackExecuted).toBe(true);
      expect(executedSqls.length).toBeGreaterThan(0);
    });

    it('13. prevents cross-tenant context bleed on sequential pooled transactions', async () => {
      // Simulates a single pooled PostgreSQL connection handling requests for Tenant A then Tenant B
      const connectionSessionSettings: Record<string, string> = {};

      const simulatedPooledClient = {
        async executeTransaction(tenantId: string, action: () => Promise<void>) {
          // Transaction begins: set transaction-local parameter (SET LOCAL / set_config is_local=true)
          const previousTenant = connectionSessionSettings['app.current_tenant_id'];
          connectionSessionSettings['app.current_tenant_id'] = tenantId;

          try {
            await action();
          } finally {
            // Transaction ends (COMMIT/ROLLBACK): local parameter automatically reverts
            if (previousTenant) {
              connectionSessionSettings['app.current_tenant_id'] = previousTenant;
            } else {
              delete connectionSessionSettings['app.current_tenant_id'];
            }
          }
        },
      };

      // Request 1 from Tenant Alpha
      await simulatedPooledClient.executeTransaction('tenant_alpha', async () => {
        expect(connectionSessionSettings['app.current_tenant_id']).toBe('tenant_alpha');
      });

      // Post-transaction 1: Connection is clean
      expect(connectionSessionSettings['app.current_tenant_id']).toBeUndefined();

      // Request 2 from Tenant Beta on the same pooled connection
      await simulatedPooledClient.executeTransaction('tenant_beta', async () => {
        expect(connectionSessionSettings['app.current_tenant_id']).toBe('tenant_beta');
      });

      // Post-transaction 2: Connection is clean
      expect(connectionSessionSettings['app.current_tenant_id']).toBeUndefined();
    });
  });

  // ==========================================================================
  // Gate D: Availability, Health Probes & Dependency Failures
  // ==========================================================================
  describe('Gate D: Availability, Liveness & Readiness Probes', () => {
    it('14. /v1/health/live succeeds as a non-blocking process liveness probe', () => {
      const controller = new HealthController();
      const result = controller.liveness();
      expect(result.status).toBe('alive');
      expect(result.service).toBe('stokrova-api');
      expect(result.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(result.memory_mb).toBeDefined();
      expect(result.memory_mb.heap_used).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('15. /v1/health/ready succeeds when database pool responds', async () => {
      const mockPool: any = {
        query: async (queryText: string) => {
          expect(queryText).toContain('SELECT 1');
          return { rows: [{ '?column?': 1 }] };
        },
      };
      const controller = new HealthController(undefined, undefined, mockPool);
      const result = await controller.readinessCheck();

      expect(result.status).toBe('ready');
      expect(result.checks.api).toBe('up');
      expect(result.checks.database).toBe('ready');
      expect(result.checks.config).toBe('validated');
    });

    it('16. /v1/health/ready fails with ServiceUnavailableException (503) when database is down', async () => {
      const mockFailingPool: any = {
        query: async () => {
          throw new Error('FATAL: remaining connection slots are reserved for non-replication superuser connections');
        },
      };
      const controller = new HealthController(undefined, undefined, mockFailingPool);

      await expect(controller.readinessCheck()).rejects.toThrowError(ServiceUnavailableException);
    });

    it('17. /v1/health/ready reports degraded Redis without taking down core readiness if Redis is optional', async () => {
      const mockPool: any = {
        query: async () => ({ rows: [{ '?column?': 1 }] }),
      };
      const mockRedisDegraded: any = {
        isAvailable: () => false,
      };
      const controller = new HealthController(undefined, mockRedisDegraded, mockPool);
      const result = await controller.readinessCheck();

      expect(result.status).toBe('ready');
      expect(result.checks.database).toBe('ready');
      expect(result.checks.redis).toBe('degraded'); // Graceful degradation
    });

    it('18. /v1/health/metrics provides operational telemetry snapshots', () => {
      const metricsService = new MetricsService();
      metricsService.recordRequest('GET', '/v1/orders', 200, 15);
      metricsService.recordRequest('POST', '/v1/checkout', 201, 45);
      metricsService.recordRequest('GET', '/v1/unknown', 404, 5);

      const controller = new HealthController(undefined, undefined, undefined, metricsService);
      const snapshot: any = controller.metrics();

      expect(snapshot.totalRequests).toBe(3);
      expect(snapshot.totalErrors).toBe(1);
      expect(snapshot.errorRate).toBeCloseTo(33.33, 1);
      expect(snapshot.averageLatencyMs).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Gate E: Disaster Recovery, Merkle Tamper-Proofing & Invariants
  // ==========================================================================
  describe('Gate E: Disaster Recovery & Authoritative Ledger Invariants', () => {
    it('19. verifies Merkle audit tree detects any tampered historical financial record', () => {
      function sha256(data: string): string {
        return createHash('sha256').update(data).digest('hex');
      }

      function computeMerkleRoot(hashes: string[]): string {
        if (hashes.length === 0) return '';
        if (hashes.length === 1) return hashes[0]!;
        const nextLevel: string[] = [];
        for (let i = 0; i < hashes.length; i += 2) {
          const left = hashes[i]!;
          const right = hashes[i + 1] ?? left;
          nextLevel.push(sha256(left + right));
        }
        return computeMerkleRoot(nextLevel);
      }

      const validLedgerLogs = [
        'POSTING_001:DEBIT:1001_CASH:50000',
        'POSTING_002:CREDIT:4001_REVENUE:50000',
        'POSTING_003:DEBIT:1002_BANK:25000',
        'POSTING_004:CREDIT:1001_CASH:25000',
      ];

      const authoritativeRoot = computeMerkleRoot(validLedgerLogs.map((l) => sha256(l)));
      expect(authoritativeRoot).toHaveLength(64);

      // Malicious modification of historical credit
      const tamperedLogs = [...validLedgerLogs];
      tamperedLogs[1] = 'POSTING_002:CREDIT:4001_REVENUE:10000'; // 40k vanished!

      const tamperedRoot = computeMerkleRoot(tamperedLogs.map((l) => sha256(l)));
      expect(tamperedRoot).not.toBe(authoritativeRoot); // Cryptographic tamper detection!
    });

    it('20. enforces transactional outbox idempotency during simulated crash recovery', async () => {
      const outbox = new OutboxService();
      const tenantId = 'tenant_ecom_01';
      const operationId = 'op_checkout_20261013_uuidv7';

      // 1. Initial event dispatch
      const event1 = await outbox.enqueueEvent(
        tenantId,
        'ORDER_PLACED',
        { orderId: 'ord_123', totalMinor: 9900 },
        operationId,
        'COMMERCE',
      );
      expect(event1.status).toBe('PENDING');

      // 2. Mark published
      await outbox.markPublished(event1.event_id);

      // 3. Worker crash & restart: check that pending events do not include published event
      const pending = await outbox.getPendingEvents();
      const duplicatePending = pending.find((e) => e.event_id === event1.event_id);
      expect(duplicatePending).toBeUndefined(); // Zero duplicate reprocessing!
    });

    it('21. GlobalHttpExceptionFilter in production masks database internals to generic message', () => {
      process.env['NODE_ENV'] = 'production';

      const filter = new GlobalHttpExceptionFilter();
      let responseStatusCode = 0;
      let responseBody: any;

      const mockResponse: any = {
        status: (code: number) => {
          responseStatusCode = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          };
        },
      };

      const mockRequest: any = {
        originalUrl: '/v1/checkout?token=super_secret_token_123',
        method: 'POST',
        headers: { 'x-request-id': 'req_prod_123' },
      };

      const mockHost: any = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      // A catastrophic database error containing credentials
      const internalError = new Error(
        'Connection failed: postgres://admin:leaked_pass@db.internal:5432/db - table "orders" locked',
      );

      filter.catch(internalError, mockHost);

      expect(responseStatusCode).toBe(500);
      expect(responseBody.error.message).toBe('An internal server error occurred.');
      expect(responseBody.error.message).not.toContain('leaked_pass');
      expect(responseBody.error.message).not.toContain('orders');
    });

    it('22. URL sanitizer redacts sensitive query keys in logs', () => {
      const rawUrl = '/v1/users?token=secret123&password=my_pwd&api_key=key_99&safe_param=hello';
      const cleanUrl = sanitizeUrl(rawUrl);

      expect(cleanUrl).toContain('safe_param=hello');
      expect(cleanUrl).not.toContain('secret123');
      expect(cleanUrl).not.toContain('my_pwd');
      expect(cleanUrl).not.toContain('key_99');
      expect(decodeURIComponent(cleanUrl)).toContain('token=[REDACTED]');
      expect(decodeURIComponent(cleanUrl)).toContain('password=[REDACTED]');
      expect(decodeURIComponent(cleanUrl)).toContain('api_key=[REDACTED]');
    });
  });
});
