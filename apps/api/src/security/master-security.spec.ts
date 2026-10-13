import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { SecurityHeadersMiddleware } from '../common/middleware/security-headers.middleware.js';
import { RateLimiterMiddleware } from '../common/middleware/rate-limiter.middleware.js';
import { sanitizeUrl } from '../common/utils/url-sanitizer.js';
import {
  validateExternalEndpointUrl,
  verifyWebhookSignature,
  sanitizeCsvCell,
} from '@stokrova/domain';

describe('STOKROVA Master Security Audit & Verification Suite', () => {
  const originalEnv = { ...process.env };
  const TEST_SECRET = 'stokrova-test-secret-key-phase12-auth-gate';

  beforeEach(() => {
    process.env['JWT_SECRET'] = TEST_SECRET;
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

  function signJwt(payload: Record<string, unknown>, secret = TEST_SECRET): string {
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    return `${headerB64}.${payloadB64}.${sig}`;
  }

  // ==========================================================================
  // Group 1: Authentication & Token Forgery (Workstream C)
  // ==========================================================================
  describe('Group 1: Authentication & Token Cryptographic Verification', () => {
    let guard: AuthGuard;

    beforeEach(() => {
      guard = new AuthGuard();
    });

    it('1. accepts authentic JWT with valid signature and unexpired timestamp', () => {
      const token = signJwt({
        sub: 'usr_alice',
        email: 'alice@stokrova.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        app_metadata: { is_platform_admin: false },
      });

      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const ctx = createMockExecutionContext(req);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(req.user.id).toBe('usr_alice');
      expect(req.user.email).toBe('alice@stokrova.com');
      expect(req.user.is_platform_admin).toBe(false);
    });

    it('2. rejects forged JWT signed with an attacker secret', () => {
      const forgedToken = signJwt(
        { sub: 'usr_attacker', email: 'attacker@evil.com', exp: Math.floor(Date.now() / 1000) + 3600 },
        'attacker-unauthorized-secret-xyz',
      );

      const req: any = { headers: { authorization: `Bearer ${forgedToken}` } };
      const ctx = createMockExecutionContext(req);

      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('3. rejects expired JWT token', () => {
      const expiredToken = signJwt({
        sub: 'usr_expired',
        email: 'expired@stokrova.com',
        exp: Math.floor(Date.now() / 1000) - 300, // expired 5 mins ago
      });

      const req: any = { headers: { authorization: `Bearer ${expiredToken}` } };
      const ctx = createMockExecutionContext(req);

      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('4. rejects tampered payload where signature does not match modified claims', () => {
      const validToken = signJwt({ sub: 'usr_regular', exp: Math.floor(Date.now() / 1000) + 3600 });
      const [headerB64, , sigB64] = validToken.split('.');

      // Attacker tampers payload to elevate to admin
      const tamperedPayloadB64 = Buffer.from(
        JSON.stringify({ sub: 'usr_regular', app_metadata: { is_platform_admin: true } }),
      ).toString('base64url');

      const tamperedToken = `${headerB64}.${tamperedPayloadB64}.${sigB64}`;
      const req: any = { headers: { authorization: `Bearer ${tamperedToken}` } };
      const ctx = createMockExecutionContext(req);

      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('5. rejects requests with missing or empty Authorization header', () => {
      const req: any = { headers: {} };
      const ctx = createMockExecutionContext(req);

      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('6. rejects malformed non-JWT token in production mode', () => {
      process.env['NODE_ENV'] = 'production';
      const req: any = { headers: { authorization: 'Bearer malformed.token' } };
      const ctx = createMockExecutionContext(req);

      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('7. strictly ignores x-test-user-id bypass header in production environment', () => {
      process.env['NODE_ENV'] = 'production';
      const req: any = {
        headers: {
          'x-test-user-id': 'usr_backdoor',
          'x-test-platform-admin': 'true',
        },
      };
      const ctx = createMockExecutionContext(req);

      // Without valid Bearer token, bypass headers are rejected
      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });
  });

  // ==========================================================================
  // Group 2: Multi-Tenant Isolation & IDOR Verification (Workstream D)
  // ==========================================================================
  describe('Group 2: Multi-Tenant Isolation & IDOR Defense', () => {
    let tenantGuard: TenantGuard;

    beforeEach(() => {
      tenantGuard = new TenantGuard();
    });

    it('8. allows access when user accesses their designated tenant', () => {
      const req: any = {
        user: { id: 'usr_1', email: 'u1@test.com', tenant_ids: ['tenant_corp_a'] },
        headers: { 'x-tenant-id': 'tenant_corp_a' },
        params: {},
      };
      const ctx = createMockExecutionContext(req);

      expect(tenantGuard.canActivate(ctx)).toBe(true);
      expect(req.tenantId).toBe('tenant_corp_a');
    });

    it('9. strictly denies cross-tenant access attempt (IDOR defense)', () => {
      const req: any = {
        user: { id: 'usr_attacker', email: 'att@test.com', tenant_ids: ['tenant_corp_a'] },
        headers: { 'x-tenant-id': 'tenant_corp_b' },
        params: {},
      };
      const ctx = createMockExecutionContext(req);

      expect(() => tenantGuard.canActivate(ctx)).toThrowError(ForbiddenException);
    });

    it('10. rejects requests missing tenant identifier (400 Bad Request)', () => {
      const req: any = {
        user: { id: 'usr_1', email: 'u1@test.com', tenant_ids: ['tenant_corp_a'] },
        headers: {},
        params: {},
      };
      const ctx = createMockExecutionContext(req);

      expect(() => tenantGuard.canActivate(ctx)).toThrowError(BadRequestException);
    });

    it('11. permits platform super admin across any requested tenant', () => {
      const req: any = {
        user: { id: 'usr_admin', email: 'admin@stokrova.com', is_platform_admin: true },
        headers: { 'x-tenant-id': 'tenant_corp_xyz' },
        params: {},
      };
      const ctx = createMockExecutionContext(req);

      expect(tenantGuard.canActivate(ctx)).toBe(true);
      expect(req.tenantId).toBe('tenant_corp_xyz');
    });

    it('12. in production mode, blocks user with no tenant assignments', () => {
      process.env['NODE_ENV'] = 'production';
      const req: any = {
        user: { id: 'usr_unassigned', email: 'u@test.com' },
        headers: { 'x-tenant-id': 'tenant_target' },
        params: {},
      };
      const ctx = createMockExecutionContext(req);

      expect(() => tenantGuard.canActivate(ctx)).toThrowError(ForbiddenException);
    });

    it('13. in production mode, strictly ignores x-test-allowed-tenants client header', () => {
      process.env['NODE_ENV'] = 'production';
      const req: any = {
        user: { id: 'usr_malicious', email: 'm@test.com', tenant_ids: ['tenant_own'] },
        headers: {
          'x-tenant-id': 'tenant_target',
          'x-test-allowed-tenants': 'tenant_target',
        },
        params: {},
      };
      const ctx = createMockExecutionContext(req);

      expect(() => tenantGuard.canActivate(ctx)).toThrowError(ForbiddenException);
    });
  });

  // ==========================================================================
  // Group 3: HTTP Security Headers & Hardening (Workstream E)
  // ==========================================================================
  describe('Group 3: HTTP Security Headers Middleware', () => {
    let middleware: SecurityHeadersMiddleware;

    beforeEach(() => {
      middleware = new SecurityHeadersMiddleware();
    });

    function runMiddleware(req: Partial<Request> = {}): Record<string, string> {
      const headers: Record<string, string> = { 'x-powered-by': 'Express' };
      const res: any = {
        setHeader: (k: string, v: string) => {
          headers[k.toLowerCase()] = v;
        },
        removeHeader: (k: string) => {
          delete headers[k.toLowerCase()];
        },
      };
      middleware.use(req as Request, res, () => {});
      return headers;
    }

    it('14. sets X-Content-Type-Options: nosniff to prevent MIME sniffing', () => {
      const headers = runMiddleware();
      expect(headers['x-content-type-options']).toBe('nosniff');
    });

    it('15. sets X-Frame-Options: DENY to prevent clickjacking attacks', () => {
      const headers = runMiddleware();
      expect(headers['x-frame-options']).toBe('DENY');
    });

    it('16. sets Content-Security-Policy with default-src self and frame-ancestors none', () => {
      const headers = runMiddleware();
      expect(headers['content-security-policy']).toContain("default-src 'self'");
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    it('17. sets Referrer-Policy to strict-origin-when-cross-origin', () => {
      const headers = runMiddleware();
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('18. sets Permissions-Policy to restrict sensitive browser APIs', () => {
      const headers = runMiddleware();
      expect(headers['permissions-policy']).toBe('geolocation=(), camera=(), microphone=(), payment=()');
    });

    it('19. removes fingerprinting X-Powered-By header', () => {
      const headers = runMiddleware();
      expect(headers['x-powered-by']).toBeUndefined();
    });

    it('20. enforces Strict-Transport-Security (HSTS) in production', () => {
      process.env['NODE_ENV'] = 'production';
      const headers = runMiddleware();
      expect(headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  // ==========================================================================
  // Group 4: Sliding-Window Rate Limiting (Workstream E)
  // ==========================================================================
  describe('Group 4: Sliding-Window Rate Limiter', () => {
    let limiter: RateLimiterMiddleware;

    beforeEach(() => {
      limiter = new RateLimiterMiddleware({ windowMs: 60000, maxRequests: 5 });
    });

    function callLimiter(ip: string, tenant = 'tenant_1') {
      const headers: Record<string, string> = {};
      let statusCode = 200;
      let body: any = null;

      const req: any = { ip, headers: { 'x-tenant-id': tenant }, socket: { remoteAddress: ip } };
      const res: any = {
        setHeader: (k: string, v: string) => {
          headers[k.toLowerCase()] = v;
        },
        status: (code: number) => {
          statusCode = code;
          return {
            json: (b: any) => {
              body = b;
            },
          };
        },
      };

      let passedNext = false;
      limiter.use(req, res, () => {
        passedNext = true;
      });

      return { statusCode, headers, body, passedNext };
    }

    it('21. permits requests below threshold and emits rate limit headers', () => {
      const result = callLimiter('192.168.1.50');
      expect(result.passedNext).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.headers['x-ratelimit-limit']).toBe('5');
      expect(result.headers['x-ratelimit-remaining']).toBe('4');
    });

    it('22. rejects requests exceeding max limit with 429 Too Many Requests and Retry-After', () => {
      // 5 allowed requests
      for (let i = 0; i < 5; i++) {
        const res = callLimiter('10.0.0.1');
        expect(res.passedNext).toBe(true);
      }

      // 6th request must be rejected
      const blocked = callLimiter('10.0.0.1');
      expect(blocked.passedNext).toBe(false);
      expect(blocked.statusCode).toBe(429);
      expect(blocked.headers['retry-after']).toBeDefined();
      expect(blocked.body?.error?.message).toContain('Too many requests');
    });

    it('23. isolates rate limits per client IP and tenant', () => {
      for (let i = 0; i < 5; i++) {
        callLimiter('1.1.1.1', 'tenant_a');
      }

      // Client 1.1.1.1 on tenant_a is throttled
      expect(callLimiter('1.1.1.1', 'tenant_a').passedNext).toBe(false);

      // Client 2.2.2.2 on tenant_a is NOT throttled
      expect(callLimiter('2.2.2.2', 'tenant_a').passedNext).toBe(true);

      // Client 1.1.1.1 on tenant_b is NOT throttled
      expect(callLimiter('1.1.1.1', 'tenant_b').passedNext).toBe(true);
    });
  });

  // ==========================================================================
  // Group 5: Structured Logging & Secret Redaction (Workstream F)
  // ==========================================================================
  describe('Group 5: Structured Logging & Sensitive URL Redaction', () => {
    it('24. redacts token in query parameter', () => {
      const url = '/v1/reports/export?token=secret_token_12345&format=csv';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe('/v1/reports/export?token=%5BREDACTED%5D&format=csv');
    });

    it('25. redacts api_key and apikey in query parameter', () => {
      const url = '/v1/integrations/sync?api_key=sk_live_99999999&limit=10';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe('/v1/integrations/sync?api_key=%5BREDACTED%5D&limit=10');
    });

    it('26. redacts password and secret credentials in query parameter', () => {
      const url = '/v1/auth/callback?code=oauth_code_xyz&client_secret=super_secret';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toContain('code=%5BREDACTED%5D');
      expect(sanitized).toContain('client_secret=%5BREDACTED%5D');
    });

    it('27. preserves non-sensitive query parameters untouched', () => {
      const url = '/v1/catalog/products?page=2&pageSize=50&category=electronics';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe('/v1/catalog/products?page=2&pageSize=50&category=electronics');
    });
  });

  // ==========================================================================
  // Group 6: Database Security & Row Level Security (Workstream G)
  // ==========================================================================
  describe('Group 6: Database RLS Architecture & Migration Verification', () => {
    const rootDir = existsSync(resolve(process.cwd(), 'packages'))
      ? process.cwd()
      : resolve(process.cwd(), '../..');
    const migrationFile = resolve(
      rootDir,
      'packages/database/drizzle/0013_security_hardening_rls.sql',
    );
    const journalFile = resolve(
      rootDir,
      'packages/database/drizzle/meta/_journal.json',
    );

    it('28. RLS hardening migration file 0013 exists', () => {
      expect(existsSync(migrationFile)).toBe(true);
    });

    it('29. RLS migration enforces ENABLE and FORCE ROW LEVEL SECURITY', () => {
      const sql = readFileSync(migrationFile, 'utf8');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('FORCE ROW LEVEL SECURITY');
      expect(sql).toContain('AS RESTRICTIVE');
      expect(sql).toContain('tenant_isolation_policy');
      expect(sql).toContain('app.current_tenant_id');
      expect(sql).toContain('app.is_platform_admin');
    });

    it('30. migration journal registers migration index 13 with correct tag', () => {
      const journalJson = JSON.parse(readFileSync(journalFile, 'utf8'));
      const entry13 = journalJson.entries.find((e: any) => e.idx === 13);
      expect(entry13).toBeDefined();
      expect(entry13.tag).toBe('0013_security_hardening_rls');
    });
  });

  // ==========================================================================
  // Group 7: SSRF Defense & Webhook Replay Protection (Workstream H)
  // ==========================================================================
  describe('Group 7: SSRF Defense Engine & Webhook Security', () => {
    it('31. blocks SSRF loopback 127.0.0.1 target', () => {
      const check = validateExternalEndpointUrl('http://127.0.0.1:8080/internal');
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('SSRF defense');
    });

    it('32. blocks SSRF localhost destination', () => {
      const check = validateExternalEndpointUrl('http://localhost:3000/api');
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('SSRF defense');
    });

    it('33. blocks SSRF AWS/cloud metadata address (169.254.169.254)', () => {
      const check = validateExternalEndpointUrl('http://169.254.169.254/latest/meta-data/');
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('SSRF defense');
    });

    it('34. blocks SSRF private RFC 1918 10.0.0.0/8 range', () => {
      const check = validateExternalEndpointUrl('http://10.200.1.5/admin');
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('SSRF defense');
    });

    it('35. blocks SSRF private RFC 1918 172.16.0.0/12 range', () => {
      const check = validateExternalEndpointUrl('http://172.25.0.1/status');
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('SSRF defense');
    });

    it('36. blocks SSRF private RFC 1918 192.168.0.0/16 range', () => {
      const check = validateExternalEndpointUrl('http://192.168.1.1/setup');
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('SSRF defense');
    });

    it('37. blocks malicious file:// and gopher:// protocol schemes', () => {
      const checkFile = validateExternalEndpointUrl('file:///etc/passwd');
      expect(checkFile.isValid).toBe(false);

      const checkGopher = validateExternalEndpointUrl('gopher://127.0.0.1:70');
      expect(checkGopher.isValid).toBe(false);
    });

    it('38. allows authentic public HTTPS webhook destinations', () => {
      const check = validateExternalEndpointUrl('https://api.partner.com/webhooks/stokrova');
      expect(check.isValid).toBe(true);
    });

    it('39. verifies authentic webhook HMAC-SHA256 signature', () => {
      const secret = 'webhook_secret_key_12345';
      const body = JSON.stringify({ event: 'order.created', order_id: 'ord_99' });
      const signature = createHmac('sha256', secret).update(body).digest('hex');

      const result = verifyWebhookSignature(secret, `sha256=${signature}`, body);
      expect(result.isValid).toBe(true);
    });

    it('40. rejects tampered webhook payload with forged signature', () => {
      const secret = 'webhook_secret_key_12345';
      const body = JSON.stringify({ event: 'order.created', order_id: 'ord_99' });
      const tamperedBody = JSON.stringify({ event: 'order.created', order_id: 'ord_tampered' });
      const signature = createHmac('sha256', secret).update(body).digest('hex');

      const result = verifyWebhookSignature(secret, `sha256=${signature}`, tamperedBody);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Signature mismatch');
    });

    it('41. rejects expired webhook timestamp (replay attack prevention)', () => {
      const secret = 'webhook_secret_key_12345';
      const nowSec = Math.floor(Date.now() / 1000);
      const staleTimestamp = nowSec - 600; // 10 minutes old
      const body = JSON.stringify({ event: 'order.created', order_id: 'ord_99' });
      const signature = createHmac('sha256', secret)
        .update(`${staleTimestamp}.${body}`)
        .digest('hex');

      const result = verifyWebhookSignature(
        secret,
        `t=${staleTimestamp},v1=${signature}`,
        body,
        300,
        nowSec,
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('tolerance window');
    });

    it('42. accepts fresh webhook timestamp within tolerance window', () => {
      const secret = 'webhook_secret_key_12345';
      const nowSec = Math.floor(Date.now() / 1000);
      const freshTimestamp = nowSec - 10; // 10 seconds old
      const body = JSON.stringify({ event: 'order.created', order_id: 'ord_99' });
      const signature = createHmac('sha256', secret)
        .update(`${freshTimestamp}.${body}`)
        .digest('hex');

      const result = verifyWebhookSignature(
        secret,
        `t=${freshTimestamp},v1=${signature}`,
        body,
        300,
        nowSec,
      );
      expect(result.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // Group 8: CSV Formula Injection Armor (Workstream I)
  // ==========================================================================
  describe('Group 8: CSV Formula Injection Armor', () => {
    it('43. escapes formula trigger = (e.g. =cmd|/c calc)', () => {
      const escaped = sanitizeCsvCell('=cmd|/c calc!A0');
      expect(escaped).toBe("'\=cmd|/c calc!A0");
    });

    it('44. escapes formula trigger + (e.g. +SUM(A1:A10))', () => {
      const escaped = sanitizeCsvCell('+SUM(A1:A10)');
      expect(escaped).toBe("'+SUM(A1:A10)");
    });

    it('45. escapes formula trigger - (e.g. -2+3*cmd)', () => {
      const escaped = sanitizeCsvCell('-2+3*cmd');
      expect(escaped).toBe("'-2+3*cmd");
    });

    it('46. escapes formula trigger @ (e.g. @SUM(1+1))', () => {
      const escaped = sanitizeCsvCell('@SUM(1+1)');
      expect(escaped).toBe("'@SUM(1+1)");
    });

    it('47. preserves normal text without formula triggers', () => {
      const text = sanitizeCsvCell('Acme Corp Industrial Services');
      expect(text).toBe('Acme Corp Industrial Services');
    });

    it('48. properly quotes and escapes commas in cells', () => {
      const cell = sanitizeCsvCell('Lagos, Nigeria');
      expect(cell).toBe('"Lagos, Nigeria"');
    });

    it('49. properly quotes and escapes double quotes in cells', () => {
      const cell = sanitizeCsvCell('Model "Pro" 2026');
      expect(cell).toBe('"Model ""Pro"" 2026"');
    });

    it('50. properly quotes multiline cells with newlines', () => {
      const cell = sanitizeCsvCell('Line 1\nLine 2');
      expect(cell).toBe('"Line 1\nLine 2"');
    });
  });
});
