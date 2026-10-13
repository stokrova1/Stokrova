import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';
import { ZonesService } from './zones.service.js';
import { PutawayRulesService } from './putaway-rules.service.js';
import { PutawayService } from './putaway.service.js';
import { PickingService } from './picking.service.js';
import { WavesService } from './waves.service.js';
import { PackingStationService } from './packing-station.service.js';
import { ContainerizationService } from './containerization.service.js';
import { ShippingManifestService } from './shipping-manifest.service.js';
import { BarcodeLogisticsService } from './barcode-logistics.service.js';
import { BinTransfersService } from './bin-transfers.service.js';
import { CrossDockService } from './cross-dock.service.js';
import { WarehouseController } from './warehouse.controller.js';

describe('WarehouseController (Phase 6A Endpoints)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let zonesService: ZonesService;
  let rulesService: PutawayRulesService;
  let putawayService: PutawayService;
  let pickingService: PickingService;
  let wavesService: WavesService;
  let packingStationService: PackingStationService;
  let containerizationService: ContainerizationService;
  let shippingManifestService: ShippingManifestService;
  let barcodeService: BarcodeLogisticsService;
  let transfersService: BinTransfersService;
  let crossDockService: CrossDockService;
  let controller: WarehouseController;

  let tenantId: string;
  let branchId: string;
  let warehouseId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);
    zonesService = new ZonesService(warehousesService);
    rulesService = new PutawayRulesService(warehousesService);
    putawayService = new PutawayService(
      warehousesService,
      locationsService,
      zonesService,
      rulesService,
    );
    pickingService = new PickingService(warehousesService);
    wavesService = new WavesService(warehousesService, pickingService);
    packingStationService = new PackingStationService(warehousesService);
    containerizationService = new ContainerizationService(
      warehousesService,
      packingStationService,
    );
    shippingManifestService = new ShippingManifestService(
      warehousesService,
      containerizationService,
    );
    barcodeService = new BarcodeLogisticsService();
    transfersService = new BinTransfersService(warehousesService, locationsService);
    crossDockService = new CrossDockService(warehousesService, locationsService);

    controller = new WarehouseController(
      warehousesService,
      locationsService,
      zonesService,
      rulesService,
      putawayService,
      pickingService,
      wavesService,
      packingStationService,
      containerizationService,
      shippingManifestService,
      barcodeService,
      transfersService,
      crossDockService,
    );

    const t = await tenancyService.provisionTenant(
      {
        name: 'Logistics Alpha',
        slug: 'logistics-alpha',
        owner_email: 'admin@alpha.com',
        owner_full_name: 'Admin Alpha',
        default_currency: 'USD',
      },
      'usr_admin_1',
    );
    tenantId = t.tenant.id;
    branchId = t.default_branch.id;

    const wh = await controller.createWarehouse(tenantId, {
      branch_id: branchId,
      code: 'WH-CTRL-1',
      name: 'Main Hub',
    });
    warehouseId = wh.warehouse.id;
  });

  describe('Storage Zone Endpoints', () => {
    it('creates, retrieves, updates, and deletes storage zones', async () => {
      // 1. Create Zone
      const res = await controller.createZone(tenantId, {
        warehouse_id: warehouseId,
        code: 'ZONE-PICKING',
        name: 'Prime Picking Zone',
        zone_type: 'PICKING',
        temperature_class: 'AMBIENT',
      });

      expect(res.zone.id).toBeDefined();
      expect(res.zone.code).toBe('ZONE-PICKING');
      const zoneId = res.zone.id;

      // 2. List Zones
      const list = await controller.getZones(tenantId, warehouseId);
      expect(list.zones.length).toBe(1);
      expect(list.zones[0]?.id).toBe(zoneId);

      // 3. Get Zone by ID
      const single = await controller.getZoneById(tenantId, zoneId);
      expect(single.zone.name).toBe('Prime Picking Zone');

      // 4. Update Zone
      const updated = await controller.updateZone(tenantId, zoneId, {
        name: 'Prime Picking Fast Zone',
      });
      expect(updated.zone.name).toBe('Prime Picking Fast Zone');

      // 5. Delete Zone
      const del = await controller.deleteZone(tenantId, zoneId);
      expect(del.success).toBe(true);

      const afterDel = await controller.getZones(tenantId, warehouseId);
      expect(afterDel.zones.length).toBe(0);
    });

    it('rejects invalid zone payload schema', async () => {
      await expect(
        controller.createZone(tenantId, {
          // Missing warehouse_id and code
          name: 'Invalid Zone',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Put-Away Rules Endpoints', () => {
    it('creates and lists put-away rules', async () => {
      const res = await controller.createPutAwayRule(tenantId, {
        warehouse_id: warehouseId,
        name: 'Cold Storage Routing Rule',
        priority: 10,
        strategy: 'FASTEST_PICK_PROXIMITY',
        filter_temperature_class: 'COLD_STORAGE',
      });

      expect(res.rule.id).toBeDefined();
      expect(res.rule.name).toBe('Cold Storage Routing Rule');

      const list = await controller.getPutAwayRules(tenantId, warehouseId);
      expect(list.rules.length).toBe(1);
      expect(list.rules[0]?.priority).toBe(10);
    });
  });

  describe('Directed Put-Away Calculation Endpoint', () => {
    it('handles directed put-away calculation request', async () => {
      // Create a zone and a location
      const zone = await controller.createZone(tenantId, {
        warehouse_id: warehouseId,
        code: 'ZONE-AMB-01',
        name: 'Ambient Storage',
        zone_type: 'BULK_STORAGE',
      });

      await controller.createLocation(tenantId, {
        warehouse_id: warehouseId,
        code: 'BIN-101',
        name: 'Storage Bin 101',
        type: 'INTERNAL_STORAGE',
        zone_id: zone.zone.id,
      });

      const calcResult = await controller.calculatePutAway(tenantId, {
        warehouse_id: warehouseId,
        variant_id: 'var_prod_1',
        sku: 'SKU-PROD-101',
        quantity: 25,
      });

      expect(calcResult.variant_id).toBe('var_prod_1');
      expect(calcResult.sku).toBe('SKU-PROD-101');
      expect(calcResult.best_match_location_id).toBeDefined();
      expect(calcResult.recommendations.length).toBeGreaterThan(0);
      expect(calcResult.recommendations[0]?.location_code).toBe('BIN-101');
    });

    it('rejects invalid putaway payload', async () => {
      await expect(
        controller.calculatePutAway(tenantId, {
          warehouse_id: warehouseId,
          // Missing sku and quantity
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
