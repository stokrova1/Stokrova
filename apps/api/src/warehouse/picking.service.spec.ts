import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';
import { ZonesService } from './zones.service.js';
import { PickingService } from './picking.service.js';
import { WavesService } from './waves.service.js';

describe('Warehouse Picking Strategies & Wave Release Engine (Phase 6B)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let zonesService: ZonesService;
  let pickingService: PickingService;
  let wavesService: WavesService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;

  let wh1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);
    zonesService = new ZonesService(warehousesService);
    pickingService = new PickingService(warehousesService);
    wavesService = new WavesService(warehousesService, pickingService);

    // Provision test tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Omni Logistics Global',
        slug: 'omni-logistics',
        owner_email: 'ops@omni.com',
        owner_full_name: 'Omni Operations Director',
        default_currency: 'USD',
      },
      'usr_omni_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Provision test tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Vanguard Retail',
        slug: 'vanguard-retail',
        owner_email: 'ops@vanguard.com',
        owner_full_name: 'Vanguard Ops Lead',
        default_currency: 'EUR',
      },
      'usr_vanguard_1',
    );
    tenant2Id = t2.tenant.id;

    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-MAIN',
      name: 'Main Distribution Center',
    });
    wh1Id = wh1.id;
  });

  describe('Discrete Order Picking & Serpentine Travel Routing', () => {
    it('creates pick list and automatically optimizes pick sequence via S-Shape routing', async () => {
      // Create multi-aisle locations
      const locA1R1 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'A1-R1-S1-B1',
        name: 'Aisle 1 Rack 1',
        type: 'PICKING_FACE',
        aisle: 1,
        rack: 1,
        shelf: 1,
        bin_position: 1,
      });

      const locA1R2 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'A1-R2-S1-B1',
        name: 'Aisle 1 Rack 2',
        type: 'PICKING_FACE',
        aisle: 1,
        rack: 2,
        shelf: 1,
        bin_position: 1,
      });

      const locA2R1 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'A2-R1-S1-B1',
        name: 'Aisle 2 Rack 1',
        type: 'PICKING_FACE',
        aisle: 2,
        rack: 1,
        shelf: 1,
        bin_position: 1,
      });

      const locA2R3 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'A2-R3-S1-B1',
        name: 'Aisle 2 Rack 3',
        type: 'PICKING_FACE',
        aisle: 2,
        rack: 3,
        shelf: 1,
        bin_position: 1,
      });

      // Submit lines in intentionally non-optimal order
      const pickList = await pickingService.createPickList(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_101'],
        lines: [
          {
            order_id: 'ord_101',
            order_line_id: 'line_1',
            variant_id: 'var_prod_1',
            sku: 'SKU-001',
            source_location_id: locA2R1.id,
            source_location_code: locA2R1.code,
            aisle: locA2R1.aisle,
            rack: locA2R1.rack,
            shelf: locA2R1.shelf,
            bin_position: locA2R1.bin_position,
            quantity_requested: 5,
          },
          {
            order_id: 'ord_101',
            order_line_id: 'line_2',
            variant_id: 'var_prod_2',
            sku: 'SKU-002',
            source_location_id: locA1R2.id,
            source_location_code: locA1R2.code,
            aisle: locA1R2.aisle,
            rack: locA1R2.rack,
            shelf: locA1R2.shelf,
            bin_position: locA1R2.bin_position,
            quantity_requested: 3,
          },
          {
            order_id: 'ord_101',
            order_line_id: 'line_3',
            variant_id: 'var_prod_3',
            sku: 'SKU-003',
            source_location_id: locA2R3.id,
            source_location_code: locA2R3.code,
            aisle: locA2R3.aisle,
            rack: locA2R3.rack,
            shelf: locA2R3.shelf,
            bin_position: locA2R3.bin_position,
            quantity_requested: 2,
          },
          {
            order_id: 'ord_101',
            order_line_id: 'line_4',
            variant_id: 'var_prod_4',
            sku: 'SKU-004',
            source_location_id: locA1R1.id,
            source_location_code: locA1R1.code,
            aisle: locA1R1.aisle,
            rack: locA1R1.rack,
            shelf: locA1R1.shelf,
            bin_position: locA1R1.bin_position,
            quantity_requested: 4,
          },
        ],
      });

      expect(pickList.id).toBeDefined();
      expect(pickList.status).toBe('RELEASED');
      expect(pickList.lines).toHaveLength(4);

      // Verify S-Shape routing sequence:
      // Aisle 1 (odd) traversed forward: A1-R1 -> A1-R2
      // Aisle 2 (even) traversed reverse: A2-R3 -> A2-R1
      expect(pickList.lines[0]?.source_location_code).toBe('A1-R1-S1-B1');
      expect(pickList.lines[0]?.pick_sequence).toBe(1);

      expect(pickList.lines[1]?.source_location_code).toBe('A1-R2-S1-B1');
      expect(pickList.lines[1]?.pick_sequence).toBe(2);

      expect(pickList.lines[2]?.source_location_code).toBe('A2-R3-S1-B1');
      expect(pickList.lines[2]?.pick_sequence).toBe(3);

      expect(pickList.lines[3]?.source_location_code).toBe('A2-R1-S1-B1');
      expect(pickList.lines[3]?.pick_sequence).toBe(4);
    });
  });

  describe('Pick Line Confirmations & Invariants', () => {
    it('confirms pick lines sequentially and transitions pick list to COMPLETED', async () => {
      const pl = await pickingService.createPickList(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_201'],
        lines: [
          {
            order_id: 'ord_201',
            order_line_id: 'l_1',
            variant_id: 'var_item_1',
            sku: 'SKU-100',
            source_location_id: 'loc_bin_1',
            source_location_code: 'BIN-101',
            quantity_requested: 10,
          },
          {
            order_id: 'ord_201',
            order_line_id: 'l_2',
            variant_id: 'var_item_2',
            sku: 'SKU-200',
            source_location_id: 'loc_bin_2',
            source_location_code: 'BIN-102',
            quantity_requested: 5,
          },
        ],
      });

      const line1Id = pl.lines[0]!.id;
      const line2Id = pl.lines[1]!.id;

      // 1. Confirm first line
      const afterLine1 = await pickingService.confirmPickLine(tenant1Id, pl.id, line1Id, {
        quantity_picked: 10,
        batch_id: 'batch_alpha',
      });

      expect(afterLine1.status).toBe('IN_PROGRESS');
      expect(afterLine1.started_at).toBeDefined();
      const updatedL1 = afterLine1.lines.find((l) => l.id === line1Id)!;
      expect(updatedL1.status).toBe('PICKED');
      expect(updatedL1.quantity_picked).toBe(10);
      expect(updatedL1.batch_id).toBe('batch_alpha');

      // 2. Confirm second line
      const afterLine2 = await pickingService.confirmPickLine(tenant1Id, pl.id, line2Id, {
        quantity_picked: 5,
      });

      expect(afterLine2.status).toBe('COMPLETED');
      expect(afterLine2.completed_at).toBeDefined();
      const updatedL2 = afterLine2.lines.find((l) => l.id === line2Id)!;
      expect(updatedL2.status).toBe('PICKED');
      expect(updatedL2.quantity_picked).toBe(5);
    });

    it('rejects over-picking beyond requested quantity', async () => {
      const pl = await pickingService.createPickList(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_202'],
        lines: [
          {
            order_id: 'ord_202',
            order_line_id: 'l_1',
            variant_id: 'var_item_1',
            sku: 'SKU-100',
            source_location_id: 'loc_bin_1',
            source_location_code: 'BIN-101',
            quantity_requested: 5,
          },
        ],
      });

      const lineId = pl.lines[0]!.id;

      await expect(
        pickingService.confirmPickLine(tenant1Id, pl.id, lineId, {
          quantity_picked: 6, // 6 > 5
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Short-Pick Exception Handling', () => {
    it('handles short-picking when physical bin stock is depleted', async () => {
      const pl = await pickingService.createPickList(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_short_1'],
        lines: [
          {
            order_id: 'ord_short_1',
            order_line_id: 'l_short',
            variant_id: 'var_item_1',
            sku: 'SKU-SHORT-01',
            source_location_id: 'loc_bin_1',
            source_location_code: 'BIN-101',
            quantity_requested: 10,
          },
        ],
      });

      const lineId = pl.lines[0]!.id;

      // Only 7 available physically in bin, 3 short
      const updated = await pickingService.shortPickLine(tenant1Id, pl.id, lineId, {
        quantity_picked: 7,
        short_reason: 'Damaged stock in bin, only 7 intact units found',
      });

      expect(updated.status).toBe('COMPLETED');
      const line = updated.lines[0]!;
      expect(line.status).toBe('SHORT_PICKED');
      expect(line.quantity_picked).toBe(7);
      expect(line.quantity_short).toBe(3);
      expect(line.short_reason).toBe('Damaged stock in bin, only 7 intact units found');
    });
  });

  describe('Pick List Cancellation', () => {
    it('cancels an in-progress or released pick list and marks pending lines cancelled', async () => {
      const pl = await pickingService.createPickList(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_cancel_1'],
        lines: [
          {
            order_id: 'ord_cancel_1',
            order_line_id: 'l_1',
            variant_id: 'var_item_1',
            sku: 'SKU-01',
            source_location_id: 'loc_bin_1',
            source_location_code: 'BIN-101',
            quantity_requested: 5,
          },
        ],
      });

      const cancelled = await pickingService.cancelPickList(tenant1Id, pl.id);
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.lines[0]?.status).toBe('CANCELLED');

      // Cannot cancel an already completed pick list
      const completedPl = await pickingService.createPickList(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_cancel_2'],
        lines: [
          {
            order_id: 'ord_cancel_2',
            order_line_id: 'l_2',
            variant_id: 'var_item_2',
            sku: 'SKU-02',
            source_location_id: 'loc_bin_2',
            source_location_code: 'BIN-102',
            quantity_requested: 2,
          },
        ],
      });
      await pickingService.confirmPickLine(tenant1Id, completedPl.id, completedPl.lines[0]!.id, {
        quantity_picked: 2,
      });

      await expect(pickingService.cancelPickList(tenant1Id, completedPl.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Wave Planning & Release Strategies (Discrete, Batch, Zone)', () => {
    it('releases DISCRETE wave into individual order pick lists', async () => {
      const wave = await wavesService.createWave(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_A', 'ord_B'],
      });

      expect(wave.status).toBe('PLANNING');

      const releaseResult = await wavesService.releaseWave(tenant1Id, wave.id, [
        {
          order_id: 'ord_A',
          order_line_id: 'l_A1',
          variant_id: 'var_1',
          sku: 'SKU-1',
          source_location_id: 'loc_1',
          source_location_code: 'BIN-1',
          quantity_requested: 2,
        },
        {
          order_id: 'ord_B',
          order_line_id: 'l_B1',
          variant_id: 'var_2',
          sku: 'SKU-2',
          source_location_id: 'loc_2',
          source_location_code: 'BIN-2',
          quantity_requested: 4,
        },
      ]);

      expect(releaseResult.wave.status).toBe('RELEASED');
      expect(releaseResult.wave.total_lines).toBe(2);
      expect(releaseResult.pick_lists).toHaveLength(2); // 1 pick list per order
      expect(releaseResult.pick_lists[0]?.strategy).toBe('DISCRETE');
      expect(releaseResult.pick_lists[1]?.strategy).toBe('DISCRETE');
    });

    it('releases BATCH wave into consolidated pick list across all orders', async () => {
      const wave = await wavesService.createWave(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'BATCH',
        order_ids: ['ord_B1', 'ord_B2'],
      });

      const releaseResult = await wavesService.releaseWave(tenant1Id, wave.id, [
        {
          order_id: 'ord_B1',
          order_line_id: 'l_1',
          variant_id: 'var_1',
          sku: 'SKU-1',
          source_location_id: 'loc_1',
          source_location_code: 'BIN-1',
          quantity_requested: 5,
        },
        {
          order_id: 'ord_B2',
          order_line_id: 'l_2',
          variant_id: 'var_1',
          sku: 'SKU-1',
          source_location_id: 'loc_1',
          source_location_code: 'BIN-1',
          quantity_requested: 5,
        },
      ]);

      expect(releaseResult.wave.status).toBe('RELEASED');
      expect(releaseResult.pick_lists).toHaveLength(1); // 1 consolidated batch pick list
      expect(releaseResult.pick_lists[0]?.strategy).toBe('BATCH');
      expect(releaseResult.pick_lists[0]?.lines).toHaveLength(2);
      expect(releaseResult.pick_lists[0]?.order_ids).toContain('ord_B1');
      expect(releaseResult.pick_lists[0]?.order_ids).toContain('ord_B2');
    });

    it('releases ZONE wave partitioned by dedicated storage zones', async () => {
      const coldZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-COLD',
        name: 'Cold Storage Zone',
        zone_type: 'COLD_CHAIN',
      });

      const dryZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-DRY',
        name: 'Dry Goods Zone',
        zone_type: 'BULK_STORAGE',
      });

      const wave = await wavesService.createWave(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'ZONE',
        order_ids: ['ord_Z1'],
      });

      const releaseResult = await wavesService.releaseWave(tenant1Id, wave.id, [
        {
          order_id: 'ord_Z1',
          order_line_id: 'l_cold',
          variant_id: 'var_cold',
          sku: 'SKU-VACCINE',
          source_location_id: 'loc_cold',
          source_location_code: 'COLD-01',
          zone_id: coldZone.id,
          quantity_requested: 10,
        },
        {
          order_id: 'ord_Z1',
          order_line_id: 'l_dry',
          variant_id: 'var_dry',
          sku: 'SKU-CEREAL',
          source_location_id: 'loc_dry',
          source_location_code: 'DRY-01',
          zone_id: dryZone.id,
          quantity_requested: 20,
        },
      ]);

      expect(releaseResult.wave.status).toBe('RELEASED');
      expect(releaseResult.pick_lists).toHaveLength(2); // 1 pick list per zone
      const coldPickList = releaseResult.pick_lists.find((p) => p.zone_id === coldZone.id);
      const dryPickList = releaseResult.pick_lists.find((p) => p.zone_id === dryZone.id);
      expect(coldPickList).toBeDefined();
      expect(coldPickList?.lines[0]?.sku).toBe('SKU-VACCINE');
      expect(dryPickList).toBeDefined();
      expect(dryPickList?.lines[0]?.sku).toBe('SKU-CEREAL');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('strictly isolates pick lists and waves between tenants', async () => {
      const pl = await pickingService.createPickList(tenant1Id, {
        warehouse_id: wh1Id,
        strategy: 'DISCRETE',
        order_ids: ['ord_isolated'],
        lines: [
          {
            order_id: 'ord_isolated',
            order_line_id: 'l_1',
            variant_id: 'var_1',
            sku: 'SKU-1',
            source_location_id: 'loc_1',
            source_location_code: 'BIN-1',
            quantity_requested: 1,
          },
        ],
      });

      // Tenant 2 cannot access Tenant 1 pick list
      await expect(pickingService.getPickListById(tenant2Id, pl.id)).rejects.toThrow(
        NotFoundException,
      );

      // Tenant 2 cannot confirm picks on Tenant 1 pick list
      await expect(
        pickingService.confirmPickLine(tenant2Id, pl.id, pl.lines[0]!.id, {
          quantity_picked: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
