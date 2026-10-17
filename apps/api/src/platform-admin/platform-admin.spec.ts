import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformAdminService } from './platform-admin.service.js';
import { PlatformAdminGuard } from '../auth/platform-admin.guard.js';
import { PLATFORM_CAPABILITY_KEY } from '../auth/decorators/require-platform-capability.decorator.js';

describe('STOKROVA Platform Founder Console — Master Test Suite', () => {
  let service: PlatformAdminService;
  let guard: PlatformAdminGuard;
  let reflector: Reflector;

  beforeEach(() => {
    service = new PlatformAdminService();
    reflector = new Reflector();
    guard = new PlatformAdminGuard(reflector);
  });

  // ==========================================================================
  // 1. Security & RBAC Boundary Enforcement
  // ==========================================================================
  describe('Security & RBAC Boundary Enforcement', () => {
    const createMockContext = (user?: any, handlerCap?: string) => {
      const request = { user, headers: {} };
      return {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => () => {},
        getClass: () => class TestClass {},
      } as any;
    };

    it('rejects unauthenticated requests with 403 Forbidden', () => {
      const context = createMockContext(undefined);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('strictly denies regular Business Owners and Tenant Admins access to platform endpoints', () => {
      const businessOwnerUser = {
        id: 'usr_owner_victoria',
        email: 'victoria@apex-global.com',
        role: 'business_owner',
        is_platform_admin: false,
        tenant_id: 'ten_apex_global',
      };
      const context = createMockContext(businessOwnerUser);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('authorizes requests with is_platform_admin: true', () => {
      const platformAdminUser = {
        id: 'usr_founder_root',
        email: 'founder@stokrova.com',
        is_platform_admin: true,
      };
      const context = createMockContext(platformAdminUser);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('authorizes requests with app_metadata.is_platform_admin: true', () => {
      const supabaseAdminUser = {
        id: 'usr_supabase_admin',
        email: 'founder@stokrova.com',
        app_metadata: { is_platform_admin: true },
      };
      const context = createMockContext(supabaseAdminUser);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('authorizes requests with role: PLATFORM_SUPER_ADMIN', () => {
      const superAdminUser = {
        id: 'usr_super_admin',
        email: 'founder@stokrova.com',
        role: 'PLATFORM_SUPER_ADMIN',
      };
      const context = createMockContext(superAdminUser);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('enforces required platform capability if user has restricted capabilities array', () => {
      const restrictedAdmin = {
        id: 'usr_auditor',
        email: 'auditor@stokrova.com',
        is_platform_admin: true,
        capabilities: ['platform.overview.view', 'platform.businesses.view'],
      };

      // Mock reflector returning 'platform.businesses.suspend'
      reflector.getAllAndOverride = () => 'platform.businesses.suspend';

      const context = createMockContext(restrictedAdmin);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('permits platform admin with wildcard capability * or matching capability', () => {
      const fullAdmin = {
        id: 'usr_founder_root',
        email: 'founder@stokrova.com',
        is_platform_admin: true,
        capabilities: ['*'],
      };

      reflector.getAllAndOverride = () => 'platform.businesses.suspend';
      const context = createMockContext(fullAdmin);
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Platform Overview & Metrics
  // ==========================================================================
  describe('Platform Overview & Metrics', () => {
    it('returns platform overview metrics correctly aggregated', async () => {
      const overview = await service.getOverview();
      expect(overview.totalTenants).toBe(4);
      expect(overview.activeTenants).toBe(3);
      expect(overview.suspendedTenants).toBe(1);
      expect(overview.totalUsers).toBe(5);
      expect(BigInt(overview.platformMrrMinor)).toBeGreaterThan(0n);
      expect(overview.systemHealthPct).toBe(100);
    });
  });

  // ==========================================================================
  // 3. Business Registry Discovery & Filtering
  // ==========================================================================
  describe('Business Registry Discovery & Filtering', () => {
    it('returns paginated list of all enrolled businesses', async () => {
      const res = await service.listBusinesses({ page: 1, limit: 10 });
      expect(res.total).toBe(4);
      expect(res.items.length).toBe(4);
      expect(res.page).toBe(1);
      expect(res.items[0]).toHaveProperty('name');
      expect(res.items[0]).toHaveProperty('slug');
      expect(res.items[0]).toHaveProperty('status');
      expect(res.items[0]).toHaveProperty('ownerEmail');
    });

    it('filters businesses by search query (name, slug, or owner email)', async () => {
      const searchByName = await service.listBusinesses({ search: 'Apex' });
      expect(searchByName.total).toBe(1);
      expect(searchByName.items[0]?.slug).toBe('apex-global');

      const searchBySlug = await service.listBusinesses({ search: 'lagos-fastmart' });
      expect(searchBySlug.total).toBe(1);
      expect(searchBySlug.items[0]?.name).toBe('Lagos FastMart Express');

      const searchByEmail = await service.listBusinesses({ search: 'isabella@auroraboutiques.com' });
      expect(searchByEmail.total).toBe(1);
      expect(searchByEmail.items[0]?.ownerName).toBe('Isabella Moreau');
    });

    it('filters businesses by status (ACTIVE / SUSPENDED)', async () => {
      const activeRes = await service.listBusinesses({ status: 'ACTIVE' });
      expect(activeRes.total).toBe(3);
      expect(activeRes.items.every((t) => t.status === 'ACTIVE')).toBe(true);

      const suspendedRes = await service.listBusinesses({ status: 'SUSPENDED' });
      expect(suspendedRes.total).toBe(1);
      expect(suspendedRes.items[0]?.slug).toBe('lagos-fastmart');
    });

    it('retrieves detailed inspection for an individual business', async () => {
      const details = await service.getBusinessDetails('ten_apex_global');
      expect(details.id).toBe('ten_apex_global');
      expect(details.name).toBe('Apex Global Retail & Logistics Ltd');
      expect(details.subscriptionTier).toBe('ENTERPRISE_LOGISTICS');
      expect(details.companies.length).toBeGreaterThan(0);
      expect(details.branches.length).toBeGreaterThan(0);
    });

    it('throws NotFoundException when inspecting non-existent business', async () => {
      await expect(service.getBusinessDetails('ten_non_existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // 4. Suspension & Reactivation State Transitions with Mandatory Audit
  // ==========================================================================
  describe('Suspension & Reactivation State Transitions with Mandatory Audit', () => {
    it('rejects suspension if reason is missing or shorter than 5 characters', async () => {
      await expect(
        service.suspendBusiness('ten_apex_global', { reason: '' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.suspendBusiness('ten_apex_global', { reason: 'bad' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('suspends an active business and records an immutable audit event', async () => {
      const res = await service.suspendBusiness('ten_apex_global', {
        reason: 'Payment delinquency for 60 consecutive days.',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUSPENDED');

      // Verify business status in registry
      const details = await service.getBusinessDetails('ten_apex_global');
      expect(details.status).toBe('SUSPENDED');

      // Verify audit trail
      const auditRes = await service.getAuditEvents(10);
      const suspendEvent = auditRes.items.find(
        (a) => a.eventType === 'PLATFORM_TENANT_SUSPENDED' && a.tenantId === 'ten_apex_global',
      );
      expect(suspendEvent).toBeDefined();
      expect(suspendEvent?.payload['reason']).toContain('Payment delinquency');
    });

    it('is idempotent: suspending an already suspended business returns success without error', async () => {
      const res1 = await service.suspendBusiness('ten_lagos_fastmart', {
        reason: 'Repeated dunning policy failure',
      });
      expect(res1.status).toBe('SUSPENDED');

      const res2 = await service.suspendBusiness('ten_lagos_fastmart', {
        reason: 'Duplicate suspension request',
      });
      expect(res2.status).toBe('SUSPENDED');
      expect(res2.message).toContain('already suspended');
    });

    it('rejects reactivation if reason is missing or shorter than 5 characters', async () => {
      await expect(
        service.reactivateBusiness('ten_lagos_fastmart', { reason: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reactivates a suspended business and records an audit event', async () => {
      const res = await service.reactivateBusiness('ten_lagos_fastmart', {
        reason: 'Outstanding balance settled via wire transfer.',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('ACTIVE');

      const details = await service.getBusinessDetails('ten_lagos_fastmart');
      expect(details.status).toBe('ACTIVE');

      const auditRes = await service.getAuditEvents(10);
      const reactivateEvent = auditRes.items.find(
        (a) => a.eventType === 'PLATFORM_TENANT_REACTIVATED' && a.tenantId === 'ten_lagos_fastmart',
      );
      expect(reactivateEvent).toBeDefined();
      expect(reactivateEvent?.payload['reason']).toContain('Outstanding balance settled');
    });

    it('is idempotent: reactivating an already active business returns success without error', async () => {
      const res = await service.reactivateBusiness('ten_metro_retail', {
        reason: 'Re-verifying active status',
      });
      expect(res.status).toBe('ACTIVE');
      expect(res.message).toContain('already active');
    });

    it('updates subscription tier and records audit event', async () => {
      const res = await service.updateBusinessTier('ten_metro_retail', {
        tier: 'ENTERPRISE_LOGISTICS',
      });
      expect(res.success).toBe(true);
      expect(res.tier).toBe('ENTERPRISE_LOGISTICS');

      const details = await service.getBusinessDetails('ten_metro_retail');
      expect(details.subscriptionTier).toBe('ENTERPRISE_LOGISTICS');
    });
  });

  // ==========================================================================
  // 5. Platform User Management
  // ==========================================================================
  describe('Platform User Management', () => {
    it('lists platform users with search and pagination', async () => {
      const res = await service.listUsers({ page: 1, limit: 10 });
      expect(res.total).toBe(4);
      expect(res.items.some((u) => u.email === 'founder.victoria@apex-global.com')).toBe(true);
      expect(res.items.some((u) => u.email === 'stokrova1@gmail.com')).toBe(false);
    });

    it('suspends and reactivates user accounts with mandatory reasons', async () => {
      const suspendRes = await service.suspendUser('usr_owner_charles', {
        reason: 'Security incident investigation',
      });
      expect(suspendRes.success).toBe(true);
      expect(suspendRes.status).toBe('SUSPENDED');

      const reactivateRes = await service.reactivateUser('usr_owner_charles', {
        reason: 'Security clearance verified',
      });
      expect(reactivateRes.success).toBe(true);
      expect(reactivateRes.status).toBe('ACTIVE');
    });
  });

  // ==========================================================================
  // 6. Authentic Platform Health & Telemetry
  // ==========================================================================
  describe('Authentic Platform Health & Telemetry', () => {
    it('returns authentic platform infrastructure telemetry', async () => {
      const health = await service.getHealth();
      expect(health.status).toBe('HEALTHY');
      expect(health.database.connected).toBe(true);
      expect(health.database.latencyMs).toBeGreaterThanOrEqual(1);
      expect(health.auth.status).toBe('ONLINE');
      expect(health.crdt.status).toBe('SYNCHRONIZED');
      expect(health.security.rlsActive).toBe(true);
      expect(health.security.merkleTamperChain).toBe('SEALED');
    });
  });
});
