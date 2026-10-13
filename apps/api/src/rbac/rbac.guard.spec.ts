import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard.js';
import { RbacService } from './rbac.service.js';
import { StandardPermissions } from '@stokrova/domain';

describe('RbacGuard Scoped Authorization', () => {
  let guard: RbacGuard;
  let rbacService: RbacService;
  let reflector: Reflector;
  const tenantId = 'ten_lagos';

  beforeEach(() => {
    reflector = new Reflector();
    rbacService = new RbacService();
    rbacService.clearStore();
    guard = new RbacGuard(reflector, rbacService);
  });

  function createMockContext(
    request: Record<string, unknown>,
    permissionMetadata?: { permission: string; scopeParamKey?: string },
  ): ExecutionContext {
    reflector.get = (() => permissionMetadata) as unknown as typeof reflector.get;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows access when route requires no permission', async () => {
    const context = createMockContext({}, undefined);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('authorizes user when they hold the required permission in the target branch', async () => {
    const templates = await rbacService.getRoleTemplates();
    const managerRole = templates.find((r) => r.code === 'BRANCH_MANAGER')!;

    // Assign Branch Manager in Lagos
    await rbacService.assignRole(tenantId, {
      user_id: 'usr_manager_lagos',
      role_id: managerRole.id,
      scope: { branch_id: 'branch_lagos' },
    });

    const context = createMockContext(
      {
        user: { id: 'usr_manager_lagos', email: 'mgr@lagos.com', full_name: 'Lagos Mgr' },
        tenantId,
        headers: {
          'x-tenant-id': tenantId,
          'x-branch-id': 'branch_lagos',
        },
      },
      { permission: StandardPermissions.SALES_DISCOUNT_APPLY },
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('denies access with 403 when user attempts action in an unauthorized branch', async () => {
    const templates = await rbacService.getRoleTemplates();
    const managerRole = templates.find((r) => r.code === 'BRANCH_MANAGER')!;

    // Assigned only in Lagos
    await rbacService.assignRole(tenantId, {
      user_id: 'usr_manager_lagos',
      role_id: managerRole.id,
      scope: { branch_id: 'branch_lagos' },
    });

    // Attempting action in Abuja
    const context = createMockContext(
      {
        user: { id: 'usr_manager_lagos', email: 'mgr@lagos.com', full_name: 'Lagos Mgr' },
        tenantId,
        headers: {
          'x-tenant-id': tenantId,
          'x-branch-id': 'branch_abuja', // Out of scope!
        },
      },
      { permission: StandardPermissions.SALES_DISCOUNT_APPLY },
    );

    await expect(guard.canActivate(context)).rejects.toThrowError(ForbiddenException);
  });

  it('denies access when user lacks the required capability permission entirely', async () => {
    const templates = await rbacService.getRoleTemplates();
    const pickerRole = templates.find((r) => r.code === 'WAREHOUSE_PICKER')!;

    await rbacService.assignRole(tenantId, {
      user_id: 'usr_picker',
      role_id: pickerRole.id,
      scope: { branch_id: 'branch_lagos' },
    });

    // Picker attempting to apply a sales discount
    const context = createMockContext(
      {
        user: { id: 'usr_picker', email: 'picker@lagos.com', full_name: 'Picker' },
        tenantId,
        headers: {
          'x-tenant-id': tenantId,
          'x-branch-id': 'branch_lagos',
        },
      },
      { permission: StandardPermissions.SALES_DISCOUNT_APPLY },
    );

    await expect(guard.canActivate(context)).rejects.toThrowError(ForbiddenException);
  });

  it('allows platform super admin to bypass permission restrictions', async () => {
    const context = createMockContext(
      {
        user: {
          id: 'usr_super',
          email: 'admin@stokrova.com',
          full_name: 'Super Admin',
          is_platform_admin: true,
        },
        tenantId,
        headers: { 'x-tenant-id': tenantId },
      },
      { permission: StandardPermissions.FINANCE_JOURNAL_POST },
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
