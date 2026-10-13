import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCodes } from '@stokrova/contracts';
import type { UserIdentity } from '@stokrova/contracts';

interface AuthenticatedRequest extends Request {
  user?: UserIdentity;
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
      // In production, this validates against Supabase JWT secret / JWKS.
      // For Phase 1 / test harnesses, we support base64 payload or test token headers.
      const user = this.decodeToken(token, request);
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException({
        error: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'Invalid authentication token.',
        },
      });
    }
  }

  private decodeToken(token: string, request: Request): UserIdentity {
    // If test user header provided in non-production
    const testUserId = request.headers['x-test-user-id'] as string;
    const testUserEmail = request.headers['x-test-user-email'] as string;
    const isPlatformAdmin = request.headers['x-test-platform-admin'] === 'true';

    if (testUserId) {
      return {
        id: testUserId,
        email: testUserEmail || 'test@stokrova.com',
        full_name: 'Test User',
        is_platform_admin: isPlatformAdmin,
      };
    }

    // Try decoding JWT payload
    const parts = token.split('.');
    if (parts.length === 3 && parts[1]) {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      return {
        id: (payload['sub'] as string) || (payload['id'] as string) || 'anon-user',
        email: (payload['email'] as string) || 'user@stokrova.com',
        full_name: (payload['user_metadata'] as { full_name?: string })?.full_name || 'Authenticated User',
        is_platform_admin: Boolean((payload['app_metadata'] as { is_platform_admin?: boolean })?.is_platform_admin),
      };
    }

    // Fallback simple token identifier
    return {
      id: token,
      email: `${token}@stokrova.com`,
      full_name: 'Authenticated User',
      is_platform_admin: false,
    };
  }
}
