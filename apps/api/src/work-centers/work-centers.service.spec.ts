import { describe, it, expect, beforeEach } from 'vitest';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { BranchesService } from './branches.service.js';
import { WorkCentersService } from './work-centers.service.js';

describe('WorkCentersService', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
  let workCentersService: WorkCentersService;
  let tenantId: string;
  let branchId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    branchesService = new BranchesService(tenancyService);
    workCentersService = new WorkCentersService(branchesService);

    const provisionResult = await tenancyService.provisionTenant(
      {
        name: 'Enterprise Logistics',
        slug: 'ent-logistics',
        owner_email: 'owner@entlogistics.com',
        owner_full_name: 'Logistics Owner',
      },
      'usr_owner_01',
    );

    tenantId = provisionResult.tenant.id;
    branchId = provisionResult.default_branch.id;
  });

  it('creates diverse work centers / stations', async () => {
    const pickingStation = await workCentersService.createWorkCenter(tenantId, {
      branch_id: branchId,
      name: 'Warehouse Zone A - Picking Bay 1',
      type: 'PICKING',
    });

    const checkerStation = await workCentersService.createWorkCenter(tenantId, {
      branch_id: branchId,
      name: 'Inspection & QC Counter',
      type: 'VERIFICATION',
    });

    const dispatchStation = await workCentersService.createWorkCenter(tenantId, {
      branch_id: branchId,
      name: 'Loading Dock 3 - Dispatch',
      type: 'DISPATCH',
    });

    expect(pickingStation.type).toBe('PICKING');
    expect(checkerStation.type).toBe('VERIFICATION');
    expect(dispatchStation.type).toBe('DISPATCH');

    const stations = await workCentersService.getWorkCenters(tenantId, branchId);
    expect(stations.length).toBe(3);
  });

  it('rejects creating work center for non-existent branch', async () => {
    await expect(
      workCentersService.createWorkCenter(tenantId, {
        branch_id: 'brn_non_existent',
        name: 'Ghost Station',
        type: 'SALES',
      }),
    ).rejects.toThrowError(/Branch with ID 'brn_non_existent' not found/);
  });

  it('updates work center name and type', async () => {
    const station = await workCentersService.createWorkCenter(tenantId, {
      branch_id: branchId,
      name: 'Temporary Cash Desk',
      type: 'PAYMENT',
    });

    const updated = await workCentersService.updateWorkCenter(tenantId, station.id, {
      name: 'Permanent Cashier Desk 01',
    });

    expect(updated.name).toBe('Permanent Cashier Desk 01');
    expect(updated.type).toBe('PAYMENT');
  });
});
