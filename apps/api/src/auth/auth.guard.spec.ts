import { describe, it, expect, beforeEach } from 'vitest';
import { AuthGuard } from './auth.guard.js';
import { Reflector } from '@nestjs/core';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwksVerifier } from './jwks-verifier.js';

describe('AuthGuard Cryptographic & Multi-Algorithm Verification Suite', () => {
  let guard: AuthGuard;
  const testSecret = 'stokrova-test-jwt-secret-minimum-32-chars-long';

  beforeEach(() => {
    process.env['JWT_SECRET'] = testSecret;
    guard = new AuthGuard(new Reflector());
  });

  function mockContext(headers: Record<string, string>): ExecutionContext {
    const request = {
      headers: { ...headers },
      user: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  function createHmacToken(payload: Record<string, unknown>, secret = testSecret): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  it('rejects request with missing Authorization header', async () => {
    const ctx = mockContext({});
    try {
      await guard.canActivate(ctx);
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const resp = err.getResponse();
      expect(resp.error.message).toContain('Missing or invalid Authorization header.');
    }
  });

  it('rejects request with malformed token structure', async () => {
    const ctx = mockContext({ authorization: 'Bearer invalid.token' });
    try {
      await guard.canActivate(ctx);
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const resp = err.getResponse();
      expect(resp.error.message).toContain('Malformed JWT token structure.');
    }
  });

  it('accepts authentic HMAC-SHA256 JWT with valid signature and unexpired timestamp', async () => {
    const token = createHmacToken({
      sub: 'usr_valid_01',
      email: 'owner@stokrova.com',
      tenant_ids: ['ten_alpha'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const ctx = mockContext({ authorization: `Bearer ${token}` });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('usr_valid_01');
    expect(req.user.email).toBe('owner@stokrova.com');
    expect(req.user.tenant_ids).toEqual(['ten_alpha']);
  });

  it('rejects HMAC-SHA256 token with invalid signature', async () => {
    const token = createHmacToken(
      { sub: 'usr_tampered', exp: Math.floor(Date.now() / 1000) + 3600 },
      'wrong-secret-key-32-chars-minimum-here',
    );
    const ctx = mockContext({ authorization: `Bearer ${token}` });
    try {
      await guard.canActivate(ctx);
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const resp = err.getResponse();
      expect(resp.error.message).toContain('Invalid JWT signature.');
    }
  });

  it('rejects expired token', async () => {
    const token = createHmacToken({
      sub: 'usr_expired',
      exp: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
    });
    const ctx = mockContext({ authorization: `Bearer ${token}` });
    try {
      await guard.canActivate(ctx);
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const resp = err.getResponse();
      expect(resp.error.message).toContain('Token has expired.');
    }
  });

  it('verifies authentic asymmetric ES256 JWT using ECDSA P-256 signature', async () => {
    // Generate test EC P-256 key pair
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const jwk = publicKey.export({ format: 'jwk' });
    jwk.kid = 'test_es256_kid';
    jwk.alg = 'ES256';

    // Inject test key into JwksVerifier cache
    (JwksVerifier as any).keyCache.set('test_es256_kid', {
      key: publicKey,
      alg: 'ES256',
      expiresAt: Date.now() + 60000,
    });

    const header = { alg: 'ES256', typ: 'JWT', kid: 'test_es256_kid' };
    const payload = {
      sub: 'usr_supabase_real_uuid_99',
      email: 'owner@apexretail.co.uk',
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_metadata: { full_name: 'Victoria Sterling' },
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${headerB64}.${payloadB64}`;

    const sig = sign('SHA256', Buffer.from(signingInput), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    });
    const sigB64 = sig.toString('base64url');
    const es256Token = `${signingInput}.${sigB64}`;

    const ctx = mockContext({ authorization: `Bearer ${es256Token}` });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.user.id).toBe('usr_supabase_real_uuid_99');
    expect(req.user.email).toBe('owner@apexretail.co.uk');
    expect(req.user.full_name).toBe('Victoria Sterling');
  });

  it('rejects tampered asymmetric ES256 token', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    (JwksVerifier as any).keyCache.set('test_es256_tamper_kid', {
      key: publicKey,
      alg: 'ES256',
      expiresAt: Date.now() + 60000,
    });

    const headerB64 = Buffer.from(JSON.stringify({ alg: 'ES256', kid: 'test_es256_tamper_kid' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify({ sub: 'usr_legit', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const sig = sign('SHA256', Buffer.from(`${headerB64}.${payloadB64}`), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');

    // Tamper payload after signing
    const tamperedPayloadB64 = Buffer.from(JSON.stringify({ sub: 'usr_hacker', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const tamperedToken = `${headerB64}.${tamperedPayloadB64}.${sig}`;

    const ctx = mockContext({ authorization: `Bearer ${tamperedToken}` });
    try {
      await guard.canActivate(ctx);
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const resp = err.getResponse();
      expect(resp.error.message).toContain('Invalid JWT signature.');
    }
  });
});
