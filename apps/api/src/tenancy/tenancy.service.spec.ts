import { describe, it, expect, beforeEach } from 'vitest';
import { TenancyService } from './tenancy.service.js';

describe('TenancyService', () => {
  let service: TenancyService;

  beforeEach(() => {
    service = new TenancyService();
    service.clearStore();
  });

  it('provisions a complete tenant with legal entity, main branch, and owner membership', async () => {
    const result = await service.provisionTenant(
      {
        name: 'Alpha Traders',
        slug: 'alpha-traders',
        owner_email: 'owner@alpha.com',
        owner_full_name: 'Musa Ibrahim',
        default_currency: 'NGN',
      },
      'usr_owner_01',
    );

    expect(result.tenant.id).toBeDefined();
    expect(result.tenant.name).toBe('Alpha Traders');
    expect(result.tenant.slug).toBe('alpha-traders');
    expect(result.tenant.status).toBe('ACTIVE');

    expect(result.company.id).toBeDefined();
    expect(result.company.tenant_id).toBe(result.tenant.id);
    expect(result.company.currency_code).toBe('NGN');

    expect(result.default_branch.id).toBeDefined();
    expect(result.default_branch.tenant_id).toBe(result.tenant.id);
    expect(result.default_branch.code).toBe('MAIN');

    const memberships = await service.getUserMemberships('usr_owner_01');
    expect(memberships.length).toBe(1);
    expect(memberships[0]?.tenant_id).toBe(result.tenant.id);
  });

  it('rejects duplicate tenant slugs', async () => {
    await service.provisionTenant(
      {
        name: 'Beta Store',
        slug: 'beta-store',
        owner_email: 'beta1@store.com',
        owner_full_name: 'Owner 1',
      },
      'usr_1',
    );

    await expect(
      service.provisionTenant(
        {
          name: 'Beta Store 2',
          slug: 'beta-store',
          owner_email: 'beta2@store.com',
          owner_full_name: 'Owner 2',
        },
        'usr_2',
      ),
    ).rejects.toThrowError(/already exists/);
  });

  it('allows valid status transitions (ACTIVE -> SUSPENDED -> ACTIVE)', async () => {
    const provisioned = await service.provisionTenant(
      {
        name: 'Gamma LLC',
        slug: 'gamma-llc',
        owner_email: 'gamma@llc.com',
        owner_full_name: 'Gamma Owner',
      },
      'usr_gamma',
    );

    const suspended = await service.updateTenantStatus(provisioned.tenant.id, 'SUSPENDED');
    expect(suspended.status).toBe('SUSPENDED');

    const reactivated = await service.updateTenantStatus(provisioned.tenant.id, 'ACTIVE');
    expect(reactivated.status).toBe('ACTIVE');
  });

  it('prohibits transition out of ARCHIVED status', async () => {
    const provisioned = await service.provisionTenant(
      {
        name: 'Delta LLC',
        slug: 'delta-llc',
        owner_email: 'delta@llc.com',
        owner_full_name: 'Delta Owner',
      },
      'usr_delta',
    );

    await service.updateTenantStatus(provisioned.tenant.id, 'ARCHIVED');

    await expect(
      service.updateTenantStatus(provisioned.tenant.id, 'ACTIVE'),
    ).rejects.toThrowError(/Cannot transition tenant/);
  });

  it('respects custom initial_branch_name when specified during onboarding', async () => {
    const result = await service.provisionTenant(
      {
        name: 'Apex Luxury Retail',
        slug: 'apex-luxury',
        owner_email: 'victoria@apex.com',
        owner_full_name: 'Victoria Sterling',
        default_currency: 'USD',
        initial_branch_name: 'London Mayfair Flagship',
        business_type: 'Luxury Boutique Chain',
        plan_tier: 'growth',
      },
      'usr_owner_victoria',
    );

    expect(result.default_branch.name).toBe('London Mayfair Flagship');
    expect(result.company.currency_code).toBe('USD');
    expect(result.tenant.name).toBe('Apex Luxury Retail');
  });

  it('verifies staff credentials, resolves company workspace, and returns verified metadata', async () => {
    const provisioned = await service.provisionTenant(
      {
        name: 'Apex Luxury Retail',
        slug: 'apex-luxury',
        owner_email: 'victoria@apex.com',
        owner_full_name: 'Victoria Sterling',
      },
      'usr_owner_victoria',
    );

    const verifiedOwner = await service.verifyStaffWorkspace('victoria@apex.com');
    expect(verifiedOwner.verified).toBe(true);
    expect(verifiedOwner.tenant_name).toBe('Apex Luxury Retail');
    expect(verifiedOwner.slug).toBe('apex-luxury');
    expect(verifiedOwner.role).toBe('Business Owner (Administrator)');
    expect(verifiedOwner.last_active).toContain('Today');

    // Register actual staff members
    await service.registerStaffMember(provisioned.tenant.id, {
      email: 'manager.ops@apex.com',
      name: 'Operations Manager',
      role: 'Store Operations Manager',
    });
    await service.registerStaffMember(provisioned.tenant.id, {
      email: 'cashier.desk@apex.com',
      name: 'Counter Cashier',
      role: 'Front Counter Cashier',
    });

    const verifiedManager = await service.verifyStaffWorkspace('manager.ops@apex.com');
    expect(verifiedManager.verified).toBe(true);
    expect(verifiedManager.staff_name).toBe('Operations Manager');
    expect(verifiedManager.role).toBe('Store Operations Manager');

    const verifiedCashier = await service.verifyStaffWorkspace('cashier.desk@apex.com');
    expect(verifiedCashier.verified).toBe(true);
    expect(verifiedCashier.staff_name).toBe('Counter Cashier');
    expect(verifiedCashier.role).toBe('Front Counter Cashier');
  });
});

