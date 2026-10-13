import { describe, it, expect, beforeEach } from 'vitest';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { BranchesService } from './branches.service.js';

describe('BranchesService', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
  let tenantId: string;
  let companyId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    branchesService = new BranchesService(tenancyService);

    const provisionResult = await tenancyService.provisionTenant(
      {
        name: 'Mega Retail Ltd',
        slug: 'mega-retail',
        owner_email: 'owner@megaretail.com',
        owner_full_name: 'Retail Owner',
      },
      'usr_owner_01',
    );

    tenantId = provisionResult.tenant.id;
    companyId = provisionResult.company.id;
  });

  it('provisions tenant with a default main branch', async () => {
    const branches = await branchesService.getBranches(tenantId);
    expect(branches.length).toBe(1);
    expect(branches[0]?.code).toBe('MAIN');
    expect(branches[0]?.name).toBe('Main Branch');
  });

  it('creates an additional branch successfully', async () => {
    const branch = await branchesService.createBranch(tenantId, {
      company_id: companyId,
      name: 'Ikeja Mall Branch',
      code: 'IKEJA',
    });

    expect(branch.id).toBeDefined();
    expect(branch.name).toBe('Ikeja Mall Branch');
    expect(branch.code).toBe('IKEJA');
    expect(branch.tenant_id).toBe(tenantId);

    const branches = await branchesService.getBranches(tenantId);
    expect(branches.length).toBe(2);
  });

  it('rejects creating branch with non-existent company', async () => {
    await expect(
      branchesService.createBranch(tenantId, {
        company_id: 'cmp_invalid',
        name: 'Invalid Branch',
        code: 'INV',
      }),
    ).rejects.toThrowError(/Company with ID 'cmp_invalid' not found/);
  });

  it('rejects duplicate branch codes within tenant', async () => {
    await branchesService.createBranch(tenantId, {
      company_id: companyId,
      name: 'Abuja Branch',
      code: 'ABJ',
    });

    await expect(
      branchesService.createBranch(tenantId, {
        company_id: companyId,
        name: 'Second Abuja Branch',
        code: 'ABJ',
      }),
    ).rejects.toThrowError(/Branch with code 'ABJ' already exists/);
  });

  it('can update branch details', async () => {
    const branch = await branchesService.createBranch(tenantId, {
      company_id: companyId,
      name: 'Lekki Branch',
      code: 'LEKKI',
    });

    const updated = await branchesService.updateBranch(tenantId, branch.id, {
      name: 'Lekki Flagship Store',
      code: 'LEK-01',
    });

    expect(updated.name).toBe('Lekki Flagship Store');
    expect(updated.code).toBe('LEK-01');
  });
});
