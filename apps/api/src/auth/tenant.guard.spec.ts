import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard.js';

describe('TenantGuard Cross-Tenant Isolation', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  function createMockContext(request: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when user accesses their assigned tenant', () => {
    const context = createMockContext({
      user: { id: 'usr_1', email: 'u1@test.com', full_name: 'User 1' },
      headers: {
        'x-tenant-id': 'tenant_abc',
        'x-test-allowed-tenants': 'tenant_abc,tenant_xyz',
      },
      params: {},
    });

    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('rejects cross-tenant access when user tries to access a tenant not in their scope', () => {
    const context = createMockContext({
      user: { id: 'usr_1', email: 'u1@test.com', full_name: 'User 1' },
      headers: {
        'x-tenant-id': 'tenant_forbidden_corp',
        'x-test-allowed-tenants': 'tenant_abc,tenant_xyz',
      },
      params: {},
    });

    expect(() => guard.canActivate(context)).toThrowError(ForbiddenException);
  });

  it('allows platform super admin to access any tenant', () => {
    const context = createMockContext({
      user: {
        id: 'usr_super',
        email: 'admin@stokrova.com',
        full_name: 'Super Admin',
        is_platform_admin: true,
      },
      headers: {
        'x-tenant-id': 'tenant_forbidden_corp',
      },
      params: {},
    });

    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('rejects requests with missing tenant identifier', () => {
    const context = createMockContext({
      user: { id: 'usr_1', email: 'u1@test.com', full_name: 'User 1' },
      headers: {},
      params: {},
    });

    expect(() => guard.canActivate(context)).toThrowError(BadRequestException);
  });

  it('rejects access immediately with TENANT_SUSPENDED code when tenant status is SUSPENDED', () => {
    const context = createMockContext({
      user: { id: 'usr_owner_1', email: 'owner@business.com', full_name: 'Owner' },
      headers: {
        'x-tenant-id': 'tenant_suspended_corp',
        'x-test-allowed-tenants': 'tenant_suspended_corp',
        'x-test-tenant-status': 'SUSPENDED',
      },
      params: {},
    });

    try {
      guard.canActivate(context);
      expect.fail('Should have thrown ForbiddenException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const res = err.getResponse();
      expect(res.error.code).toBe('TENANT_SUSPENDED');
      expect(res.error.message).toContain('Access to business');
    }
  });

  it('allows platform super admin to access even when tenant status is SUSPENDED', () => {
    const context = createMockContext({
      user: {
        id: 'usr_platform_admin',
        email: 'stokrova1@gmail.com',
        full_name: 'Platform Super Admin',
        is_platform_admin: true,
      },
      headers: {
        'x-tenant-id': 'tenant_suspended_corp',
        'x-test-tenant-status': 'SUSPENDED',
      },
      params: {},
    });

    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
  });
});
