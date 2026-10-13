import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ErrorCodes } from '@stokrova/contracts';
import type { UserIdentity } from '@stokrova/contracts';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

interface AuthenticatedRequest extends Request {
  user?: UserIdentity;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
      const user = this.verifyAndDecodeToken(token, request);
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

  private verifyAndDecodeToken(token: string, request: Request): UserIdentity {
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
    const isProdEnv = process.env['NODE_ENV'] === 'production';
    let jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      if (isProdEnv) {
        throw new Error('JWT_SECRET is strictly mandatory in production environment.');
      }
      jwtSecret = 'stokrova-default-jwt-secret-phase12-sec';
    }

    // Verify cryptographic HMAC-SHA256 signature
    const expectedSignature = createHmac('sha256', jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signatureB64, 'utf8');

    if (
      expectedBuf.length !== actualBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      throw new Error('Invalid JWT signature.');
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
      id: (payload['sub'] as string) || (payload['id'] as string) || 'anon-user',
      email: (payload['email'] as string) || 'user@stokrova.com',
      full_name:
        (payload['user_metadata'] as { full_name?: string })?.full_name ||
        'Authenticated User',
      is_platform_admin: Boolean(
        (payload['app_metadata'] as { is_platform_admin?: boolean })
          ?.is_platform_admin,
      ),
      tenant_ids: tenantIds,
      tenant_id: tenantIds?.[0],
    };
  }
}
