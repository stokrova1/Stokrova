import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export interface RequiredPermissionMetadata {
  permission: string;
  scopeParamKey?: string; // key in req.headers or req.params to resolve scope (e.g. 'branch_id')
}

export const RequirePermission = (
  permission: string,
  scopeParamKey?: string,
) => SetMetadata(REQUIRE_PERMISSION_KEY, { permission, scopeParamKey } as RequiredPermissionMetadata);
