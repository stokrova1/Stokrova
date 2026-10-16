import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ErrorCodes } from '@stokrova/contracts';
import type { UserIdentity } from '@stokrova/contracts';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';
import { JwksVerifier } from './jwks-verifier.js';
import { SupabaseService } from './supabase.service.js';
import { DATABASE_POOL } from '../infrastructure/database/database.tokens.js';

interface AuthenticatedRequest extends Request {
  user?: UserIdentity;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Optional() private readonly reflector?: Reflector,
    @Optional() @Inject(DATABASE_POOL) private readonly pool?: any,
    @Optional() private readonly supabaseService?: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector) {
      const classTarget = typeof context.getClass === 'function' ? context.getClass() : undefined;
      const targets = [context.getHandler(), classTarget].filter(Boolean) as any[];
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
      if (isPublic === true) {
        return true;
      }
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'Missing or invalid Authorization header.',
        },
      });
    }

    const token = authHeader.substring(7).trim();

    try {
      const user = await this.verifyAndDecodeToken(token, request);
      request.user = user;
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Invalid authentication token.';
      throw new UnauthorizedException({
        error: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: msg,
        },
      });
    }
  }

  private async verifyAndDecodeToken(token: string, request: Request): Promise<UserIdentity> {
    const isTestEnv = process.env['NODE_ENV'] === 'test';

    // 1. Strict gating of test bypass headers: ONLY allowed in NODE_ENV === 'test'
    if (isTestEnv) {
      const testUserId = request.headers['x-test-user-id'] as string;
      const testUserEmail = request.headers['x-test-user-email'] as string;
      const isPlatformAdmin = request.headers['x-test-platform-admin'] === 'true';
      const testAllowedTenants = request.headers['x-test-allowed-tenants'] as string;

      if (testUserId) {
        const tenantIds = testAllowedTenants
          ? testAllowedTenants.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
        return {
          id: testUserId,
          email: testUserEmail || 'test@stokrova.com',
          full_name: 'Test User',
          is_platform_admin: isPlatformAdmin,
          tenant_ids: tenantIds,
          tenant_id: tenantIds?.[0],
        };
      }
    }

    // 2. Cryptographic JWT Verification (RFC 7519)
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      // In test mode, fallback for simple unit test token identifiers
      if (isTestEnv && !token.includes('.')) {
        return {
          id: token,
          email: `${token}@stokrova.com`,
          full_name: 'Authenticated Test User',
          is_platform_admin: false,
        };
      }
      throw new Error('Malformed JWT token structure.');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to inspect algorithm and key id
    let header: { alg?: string; kid?: string } = {};
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Malformed JWT header JSON.');
    }

    const alg = (header.alg || 'HS256').toUpperCase();
    const signingInput = `${headerB64}.${payloadB64}`;

    if (alg === 'ES256' || alg === 'RS256') {
      // Asymmetric signature verification against Supabase JWKS
      const jwksUrl =
        process.env['SUPABASE_JWKS_URL'] ||
        `${process.env['SUPABASE_URL'] || 'https://vbtuccvxtgjhaywijmwa.supabase.co'}/auth/v1/.well-known/jwks.json`;

      const keyEntry = await JwksVerifier.getPublicKey(header.kid, jwksUrl);
      let isValidAsymmetric = false;

      if (keyEntry) {
        isValidAsymmetric = JwksVerifier.verifyAsymmetricSignature(
          signingInput,
          signatureB64,
          keyEntry.key,
          keyEntry.alg || alg,
        );
      }

      // If local JWKS verification failed or key was missing, attempt authoritative Supabase verification
      if (!isValidAsymmetric && this.supabaseService) {
        const user = await this.supabaseService.getUserFromToken(token);
        if (user) {
          isValidAsymmetric = true;
        }
      }

      if (!isValidAsymmetric) {
        throw new Error('Invalid JWT signature.');
      }
    } else {
      // HMAC-SHA256 verification (for test/local environments with shared secret)
      const isProdEnv = process.env['NODE_ENV'] === 'production';
      let jwtSecret = process.env['JWT_SECRET'];
      if (!jwtSecret) {
        if (isProdEnv) {
          throw new Error('JWT_SECRET is strictly mandatory in production environment.');
        }
        jwtSecret = 'stokrova-default-jwt-secret-phase12-sec';
      }

      const expectedSignature = createHmac('sha256', jwtSecret)
        .update(signingInput)
        .digest('base64url');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signatureB64, 'utf8');

      let isValidSignature =
        expectedBuf.length === actualBuf.length &&
        timingSafeEqual(expectedBuf, actualBuf);

      // Live Supabase user tokens are HS256 but signed with the project's own
      // signing secret, not the engine's JWT_SECRET. Verify them against
      // Supabase Auth directly instead of rejecting every real sign-in.
      if (!isValidSignature && this.supabaseService) {
        const user = await this.supabaseService.getUserFromToken(token);
        if (user) {
          isValidSignature = true;
        }
      }

      if (!isValidSignature) {
        throw new Error('Invalid JWT signature.');
      }
    }

    // Decode and parse payload
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    // 3. Expiration Check
    if (typeof payload['exp'] === 'number') {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      if (nowEpochSec >= payload['exp']) {
        throw new Error('Token has expired.');
      }
    }

    const userId = (payload['sub'] as string) || (payload['id'] as string) || 'anon-user';
    const email = (payload['email'] as string) || 'user@stokrova.com';
    const fullName =
      (payload['user_metadata'] as { full_name?: string })?.full_name ||
      'Authenticated User';
    const isPlatformAdmin = Boolean(
      (payload['app_metadata'] as { is_platform_admin?: boolean })?.is_platform_admin,
    );

    // 4. Authoritative PostgreSQL Membership Resolution
    if (this.pool && typeof this.pool.query === 'function') {
      try {
        const res = await this.pool.query(
          `SELECT m.tenant_id, u.role, u.full_name, u.is_active
           FROM public.memberships m
           LEFT JOIN public.users u ON u.id = m.user_id AND u.tenant_id = m.tenant_id
           WHERE m.user_id = $1 AND m.status = 'ACTIVE'`,
          [userId],
        );
        if (res.rows && res.rows.length > 0) {
          const dbTenantIds = res.rows.map((r: any) => r.tenant_id);
          return {
            id: userId,
            email,
            full_name: res.rows[0].full_name || fullName,
            is_platform_admin: isPlatformAdmin,
            tenant_ids: dbTenantIds,
            tenant_id: dbTenantIds[0],
          };
        }
      } catch {
        // Fallback for tests or environments without connected database
      }
    }

    // 5. Fallback tenancy mapping for test environments without connected DB
    const appMetadata = (payload['app_metadata'] as Record<string, unknown>) || {};
    const userMetadata = (payload['user_metadata'] as Record<string, unknown>) || {};

    const rawTenantIds =
      payload['tenant_ids'] ??
      appMetadata['tenant_ids'] ??
      userMetadata['tenant_ids'] ??
      payload['tenant_id'] ??
      appMetadata['tenant_id'] ??
      userMetadata['tenant_id'];

    let tenantIds: string[] | undefined;
    if (Array.isArray(rawTenantIds)) {
      tenantIds = rawTenantIds.map(String);
    } else if (typeof rawTenantIds === 'string' && rawTenantIds.length > 0) {
      tenantIds = rawTenantIds.split(',').map((s) => s.trim()).filter(Boolean);
    }

    return {
      id: userId,
      email,
      full_name: fullName,
      is_platform_admin: isPlatformAdmin,
      tenant_ids: tenantIds,
      tenant_id: tenantIds?.[0],
    };
  }
}
