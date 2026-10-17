import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserIdentity } from '@stokrova/contracts';
import { PLATFORM_CAPABILITY_KEY } from './decorators/require-platform-capability.decorator.js';

interface AuthenticatedRequest extends Request {
  user?: UserIdentity & {
    capabilities?: string[];
    role?: string;
    app_metadata?: Record<string, any>;
  };
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN_PLATFORM_ADMIN_REQUIRED',
          message: 'Authentication required before platform administration checks.',
        },
      });
    }

    // Check platform admin status from JWT claim, app_metadata, system role, or master founder identity
    const isPlatformAdmin =
      user.is_platform_admin === true ||
      user.app_metadata?.['is_platform_admin'] === true ||
      user.role === 'PLATFORM_SUPER_ADMIN' ||
      user.role === 'platform_super_admin' ||
      user.email?.toLowerCase() === 'stokrova1@gmail.com';

    if (!isPlatformAdmin) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN_PLATFORM_ADMIN_REQUIRED',
          message: 'Access denied: Platform Founder / Super Administrator authorization required.',
        },
      });
    }

    // Verify granular capability if annotated
    const requiredCapability = this.reflector.getAllAndOverride<string | undefined>(
      PLATFORM_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredCapability) {
      const userCaps = user.capabilities;
      // If user has explicit capabilities, verify the required capability is present (or wildcard '*')
      if (Array.isArray(userCaps) && userCaps.length > 0) {
        const hasCap = userCaps.includes('*') || userCaps.includes(requiredCapability);
        if (!hasCap) {
          throw new ForbiddenException({
            error: {
              code: 'FORBIDDEN_INSUFFICIENT_PLATFORM_CAPABILITY',
              message: `Platform capability '${requiredCapability}' is required.`,
            },
          });
        }
      }
    }

    return true;
  }
}
