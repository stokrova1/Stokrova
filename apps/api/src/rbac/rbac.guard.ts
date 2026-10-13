import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorCodes } from '@stokrova/contracts';
import type { UserIdentity, ScopeTarget } from '@stokrova/contracts';
import { evaluatePermissionScope } from '@stokrova/domain';
import { RbacService } from './rbac.service.js';
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermissionMetadata,
} from './decorators/require-permission.decorator.js';

interface ScopedRequest extends Request {
  user?: UserIdentity;
  tenantId?: string;
}

function extractFirst(val: unknown): string | undefined {
  if (Array.isArray(val)) {
    return typeof val[0] === 'string' ? val[0] : undefined;
  }
  return typeof val === 'string' ? val : undefined;
}

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<RequiredPermissionMetadata | undefined>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    );

    // If no permission is required on the route, allow
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const user = request.user;
    const tenantId = request.tenantId || (request.headers['x-tenant-id'] as string);

    if (!user || !tenantId) {
      throw new ForbiddenException({
        error: {
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: 'Authenticated actor and tenant scope are required.',
        },
      });
    }

    // Platform Super Admin bypasses RBAC permission checks
    if (user.is_platform_admin) {
      return true;
    }

    // Resolve target operational scope from request headers or params
    const branchVal = request.headers['x-branch-id'] ?? request.params?.['branchId'];
    const registerVal = request.headers['x-register-id'] ?? request.params?.['registerId'];
    const workCenterVal = request.headers['x-work-center-id'] ?? request.params?.['workCenterId'];

    const targetScope: ScopeTarget = {
      branch_id: extractFirst(branchVal),
      register_id: extractFirst(registerVal),
      work_center_id: extractFirst(workCenterVal),
    };

    const assignments = await this.rbacService.getUserActiveAssignments(tenantId, user.id);

    const isAuthorized = evaluatePermissionScope(
      assignments,
      metadata.permission,
      targetScope,
    );

    if (!isAuthorized) {
      throw new ForbiddenException({
        error: {
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: `User '${user.id}' lacks required permission '${metadata.permission}' within the requested scope.`,
        },
      });
    }

    return true;
  }
}
