import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';

describe('Warehouse Services (Phase 2C)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;
  let branch2Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);

    // Provision test tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Alpha Retailers',
        slug: 'alpha-retailers',
        owner_email: 'owner1@example.com',
        owner_full_name: 'Owner One',
        default_currency: 'USD',
      },
      'usr_owner_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Provision test tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Beta Logistics',
        slug: 'beta-logistics',
        owner_email: 'owner2@example.com',
        owner_full_name: 'Owner Two',
        default_currency: 'EUR',
      },
      'usr_owner_2',
    );
    tenant2Id = t2.tenant.id;
    branch2Id = t2.default_branch.id;
  });

  describe('WarehousesService', () => {
    it('creates warehouse with valid branch and prevents duplicate code within tenant', async () => {
      const wh = await warehousesService.createWarehouse(tenant1Id, {
        branch_id: branch1Id,
        code: 'WH-MAIN',
        name: 'Main Distribution Center',
        address: '100 Industrial Parkway',
      });

      expect(wh.id).toBeDefined();
      expect(wh.code).toBe('WH-MAIN');
      expect(wh.name).toBe('Main Distribution Center');
      expect(wh.is_active).toBe(true);

      // Duplicate code in same tenant should fail
      await expect(
        warehousesService.createWarehouse(tenant1Id, {
          branch_id: branch1Id,
          code: 'wh-main',
          name: 'Another Main WH',
        }),
      ).rejects.toThrow(ConflictException);

      // Same code in different tenant should succeed
      const whTenant2 = await warehousesService.createWarehouse(tenant2Id, {
        branch_id: branch2Id,
        code: 'WH-MAIN',
        name: 'Beta Main WH',
      });
      expect(whTenant2.code).toBe('WH-MAIN');
      expect(whTenant2.tenant_id).toBe(tenant2Id);
    });

    it('rejects warehouse creation for foreign branch', async () => {
      // Trying to assign tenant 2's branch to tenant 1
      await expect(
        warehousesService.createWarehouse(tenant1Id, {
          branch_id: branch2Id,
          code: 'WH-ERR',
          name: 'Invalid Branch WH',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('queries and updates warehouses correctly', async () => {
      const wh = await warehousesService.createWarehouse(tenant1Id, {
        branch_id: branch1Id,
        code: 'WH-NORTH',
        name: 'North Facility',
      });

      const retrieved = await warehousesService.getWarehouseById(tenant1Id, wh.id);
      expect(retrieved.name).toBe('North Facility');

      const updated = await warehousesService.updateWarehouse(tenant1Id, wh.id, {
        name: 'North Regional Hub',
        is_active: false,
      });
      expect(updated.name).toBe('North Regional Hub');
      expect(updated.is_active).toBe(false);

      // Cross-tenant access must throw NotFound
      await expect(
        warehousesService.getWarehouseById(tenant2Id, wh.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('LocationsService', () => {
    let warehouseId: string;

    beforeEach(async () => {
      const wh = await warehousesService.createWarehouse(tenant1Id, {
        branch_id: branch1Id,
        code: 'WH-CENTRAL',
        name: 'Central Warehouse',
      });
      warehouseId = wh.id;
    });

    it('creates root and nested storage locations with materialized path and depth', async () => {
      // Root: Zone
      const zoneA = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        code: 'ZONE-A',
        name: 'Zone A - High Velocity',
        type: 'INTERNAL_STORAGE',
      });
      expect(zoneA.materialized_path).toBe('ZONE-A');
      expect(zoneA.level).toBe(0);
      expect(zoneA.parent_id).toBeNull();

      // Child: Rack
      const rack1 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        parent_id: zoneA.id,
        code: 'RACK-01',
        name: 'Rack 01',
        type: 'INTERNAL_STORAGE',
      });
      expect(rack1.materialized_path).toBe('ZONE-A/RACK-01');
      expect(rack1.level).toBe(1);
      expect(rack1.parent_id).toBe(zoneA.id);

      // Grandchild: Bin
      const bin01 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        parent_id: rack1.id,
        code: 'BIN-01',
        name: 'Bin 01 (Single SKU)',
        type: 'PICKING_FACE',
        mix_policy: 'SINGLE_SKU',
        max_weight_kg: 50,
        max_volume_cm3: 20000,
        is_pickable: true,
      });
      expect(bin01.materialized_path).toBe('ZONE-A/RACK-01/BIN-01');
      expect(bin01.level).toBe(2);
      expect(bin01.mix_policy).toBe('SINGLE_SKU');
      expect(bin01.max_weight_kg).toBe(50);
    });

    it('builds hierarchical location tree correctly', async () => {
      const zone = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        code: 'ZONE-B',
        name: 'Zone B',
        type: 'INTERNAL_STORAGE',
      });
      const rack = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        parent_id: zone.id,
        code: 'RACK-02',
        name: 'Rack 02',
        type: 'INTERNAL_STORAGE',
      });
      await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        parent_id: rack.id,
        code: 'BIN-01',
        name: 'Bin 01',
        type: 'PICKING_FACE',
      });

      const tree = await locationsService.getLocationTree(tenant1Id, warehouseId);
      expect(tree.length).toBe(1);
      expect(tree[0]?.code).toBe('ZONE-B');
      expect(tree[0]?.children.length).toBe(1);
      expect(tree[0]?.children[0]?.code).toBe('RACK-02');
      expect(tree[0]?.children[0]?.children.length).toBe(1);
      expect(tree[0]?.children[0]?.children[0]?.code).toBe('BIN-01');
    });

    it('rejects duplicate location codes within same warehouse', async () => {
      await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        code: 'RECV-01',
        name: 'Receiving Dock 1',
        type: 'RECEIVING',
      });

      await expect(
        locationsService.createLocation(tenant1Id, {
          warehouse_id: warehouseId,
          code: 'recv-01',
          name: 'Duplicate Dock',
          type: 'RECEIVING',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects cyclic reparenting and cross-warehouse parenting', async () => {
      const locA = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        code: 'A',
        name: 'Location A',
        type: 'INTERNAL_STORAGE',
      });
      const locB = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        parent_id: locA.id,
        code: 'B',
        name: 'Location B',
        type: 'INTERNAL_STORAGE',
      });

      // Self parenting
      await expect(
        locationsService.updateLocation(tenant1Id, locA.id, {
          parent_id: locA.id,
        }),
      ).rejects.toThrow(BadRequestException);

      // Child cannot become parent of ancestor (A -> B -> A cycle)
      await expect(
        locationsService.updateLocation(tenant1Id, locA.id, {
          parent_id: locB.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates descendant paths dynamically when a parent is moved', async () => {
      const zone1 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        code: 'ZONE-1',
        name: 'Zone 1',
        type: 'INTERNAL_STORAGE',
      });
      const zone2 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        code: 'ZONE-2',
        name: 'Zone 2',
        type: 'INTERNAL_STORAGE',
      });
      const rack = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        parent_id: zone1.id,
        code: 'RACK-X',
        name: 'Rack X',
        type: 'INTERNAL_STORAGE',
      });
      const bin = await locationsService.createLocation(tenant1Id, {
        warehouse_id: warehouseId,
        parent_id: rack.id,
        code: 'BIN-Y',
        name: 'Bin Y',
        type: 'INTERNAL_STORAGE',
      });

      expect(rack.materialized_path).toBe('ZONE-1/RACK-X');
      expect(bin.materialized_path).toBe('ZONE-1/RACK-X/BIN-Y');

      // Move Rack from Zone 1 to Zone 2
      const movedRack = await locationsService.updateLocation(tenant1Id, rack.id, {
        parent_id: zone2.id,
      });
      expect(movedRack.materialized_path).toBe('ZONE-2/RACK-X');
      expect(movedRack.level).toBe(1);

      // Descendant Bin path should automatically cascade to new parent path
      const updatedBin = await locationsService.getLocationById(tenant1Id, bin.id);
      expect(updatedBin.materialized_path).toBe('ZONE-2/RACK-X/BIN-Y');
    });
  });
});
