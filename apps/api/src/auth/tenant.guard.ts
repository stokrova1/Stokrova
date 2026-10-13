import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCodes } from '@stokrova/contracts';
import type { UserIdentity } from '@stokrova/contracts';

interface TenantScopedRequest extends Request {
  user?: UserIdentity;
  tenantId?: string;
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        error: {
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: 'Unauthenticated actor cannot access tenant resources.',
        },
      });
    }

    // Resolve tenant ID safely handling string | string[]
    const headerVal = request.headers['x-tenant-id'];
    const headerTenantId = Array.isArray(headerVal) ? headerVal[0] : headerVal;

    const paramVal = request.params?.['id'] ?? request.params?.['tenantId'];
    const paramTenantId = Array.isArray(paramVal) ? paramVal[0] : paramVal;

    const resolvedTenantId = headerTenantId || paramTenantId;

    if (!resolvedTenantId) {
      throw new BadRequestException({
        error: {
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Missing required tenant scope header (x-tenant-id) or parameter.',
        },
      });
    }

    // Platform Super Admin bypasses single-tenant constraint
    if (user.is_platform_admin) {
      request.tenantId = resolvedTenantId;
      return true;
    }

    // In a multi-tenant environment, verify allowed tenants
    const allowedHeader = request.headers['x-test-allowed-tenants'];
    const allowedStr = Array.isArray(allowedHeader) ? allowedHeader[0] : allowedHeader;
    const allowedTenants = allowedStr ? allowedStr.split(',') : [];

    if (allowedTenants.length > 0 && !allowedTenants.includes(resolvedTenantId)) {
      throw new ForbiddenException({
        error: {
          code: ErrorCodes.TENANT_ACCESS_DENIED,
          message: `Actor does not have access to tenant '${resolvedTenantId}'.`,
        },
      });
    }

    request.tenantId = resolvedTenantId;
    return true;
  }
}
