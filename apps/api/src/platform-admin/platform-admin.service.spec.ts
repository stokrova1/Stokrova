import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformAdminService } from './platform-admin.service.js';

describe('PlatformAdminService — Live Admin Integrity & Suspension Enforcement', () => {
  let service: PlatformAdminService;

  beforeEach(() => {
    // Instantiate with seedDemoData = false to test live clean state
    service = new PlatformAdminService(undefined, false);
  });

  describe('1. Honest Empty State & Demo Purge', () => {
    it('returns truthful empty platform overview when no subscriber businesses exist', async () => {
      const overview = await service.getOverview('usr_platform_admin');

      expect(overview.totalTenants).toBe(0);
      expect(overview.activeTenants).toBe(0);
      expect(overview.suspendedTenants).toBe(0);
      expect(overview.totalGmvMinor).toBe('0');
      expect(overview.platformMrrMinor).toBe('0');
      expect(overview.activeWorkCenters).toBe(0);
      expect(overview.totalUsers).toBe(0);
      expect(overview.systemHealthPct).toBe(100.0);
    });

    it('returns honest empty business directory when unpopulated', async () => {
      const result = await service.listBusinesses({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns honest empty platform users directory when unpopulated', async () => {
      const result = await service.listUsers({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('2. Business Suspension Enforcement & Cascading Killswitch', () => {
    it('suspends a business organization and logs PLATFORM_TENANT_SUSPENDED audit event', async () => {
      // Seed a test business explicitly in memory
      const testService = new PlatformAdminService(undefined, true);
      const businesses = await testService.listBusinesses({});
      expect(businesses.items.length).toBeGreaterThan(0);

      const targetId = businesses.items[0].id;
      const res = await testService.suspendBusiness(
        targetId,
        { reason: 'Overdue commercial SLA non-compliance' },
        'usr_platform_admin',
      );

      expect(res.success).toBe(true);
      expect(res.tenantId).toBe(targetId);
      expect(res.status).toBe('SUSPENDED');

      // Verify business status
      const details = await testService.getBusinessDetails(targetId);
      expect(details.status).toBe('SUSPENDED');

      // Verify audit trail
      const audit = await testService.getAuditEvents(10, 0);
      const suspendEvent = audit.items.find(
        (e: any) => e.eventType === 'PLATFORM_TENANT_SUSPENDED' && e.tenantId === targetId,
      );
      expect(suspendEvent).toBeDefined();
      expect(suspendEvent?.payload.reason).toBe('Overdue commercial SLA non-compliance');
    });

    it('reactivates a suspended business and logs PLATFORM_TENANT_REACTIVATED audit event', async () => {
      const testService = new PlatformAdminService(undefined, true);
      const businesses = await testService.listBusinesses({});
      const targetId = businesses.items[0].id;

      // First suspend
      await testService.suspendBusiness(
        targetId,
        { reason: 'Compliance hold' },
        'usr_platform_admin',
      );

      // Then reactivate
      const reactivateRes = await testService.reactivateBusiness(
        targetId,
        { reason: 'Commercial invoice settled in full' },
        'usr_platform_admin',
      );

      expect(reactivateRes.success).toBe(true);
      expect(reactivateRes.tenantId).toBe(targetId);
      expect(reactivateRes.status).toBe('ACTIVE');

      // Verify business status restored
      const details = await testService.getBusinessDetails(targetId);
      expect(details.status).toBe('ACTIVE');

      // Verify audit trail
      const audit = await testService.getAuditEvents(10, 0);
      const reactivateEvent = audit.items.find(
        (e: any) => e.eventType === 'PLATFORM_TENANT_REACTIVATED' && e.tenantId === targetId,
      );
      expect(reactivateEvent).toBeDefined();
      expect(reactivateEvent?.payload.reason).toBe('Commercial invoice settled in full');
    });

    it('updates business subscription tier and logs PLATFORM_TENANT_TIER_UPDATED audit event', async () => {
      const testService = new PlatformAdminService(undefined, true);
      const businesses = await testService.listBusinesses({});
      const targetId = businesses.items[0].id;

      const tierRes = await testService.updateBusinessTier(
        targetId,
        { tier: 'ENTERPRISE_LOGISTICS', notes: 'Upgraded to multi-hub enterprise plan' },
        'usr_platform_admin',
      );

      expect(tierRes.success).toBe(true);
      expect(tierRes.tier).toBe('ENTERPRISE_LOGISTICS');

      const details = await testService.getBusinessDetails(targetId);
      expect(details.subscriptionTier).toBe('ENTERPRISE_LOGISTICS');
    });
  });

  describe('3. Platform User Governance', () => {
    it('allows suspending and reactivating user accounts', async () => {
      const testService = new PlatformAdminService(undefined, true);
      const users = await testService.listUsers({});
      expect(users.items.length).toBeGreaterThan(0);

      // Pick a business owner user
      const targetUser = users.items.find((u: any) => u.role === 'BUSINESS_OWNER') || users.items[0];

      const suspendRes = await testService.suspendUser(
        targetUser.id,
        { reason: 'Security token compromise review' },
        'usr_platform_admin',
      );
      expect(suspendRes.success).toBe(true);
      expect(suspendRes.status).toBe('SUSPENDED');

      const reactivateRes = await testService.reactivateUser(
        targetUser.id,
        { reason: 'MFA re-authenticated' },
        'usr_platform_admin',
      );
      expect(reactivateRes.success).toBe(true);
      expect(reactivateRes.status).toBe('ACTIVE');
    });
  });
});
