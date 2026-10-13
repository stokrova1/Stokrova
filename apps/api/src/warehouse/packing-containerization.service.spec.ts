import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from './warehouses.service.js';
import { PackingStationService } from './packing-station.service.js';
import { ContainerizationService } from './containerization.service.js';
import { ShippingManifestService } from './shipping-manifest.service.js';

describe('Warehouse Packing Stations, Containerization & Shipping Manifests (Phase 6C)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let packingStationService: PackingStationService;
  let containerizationService: ContainerizationService;
  let manifestService: ShippingManifestService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;
  let wh1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    packingStationService = new PackingStationService(warehousesService);
    containerizationService = new ContainerizationService(
      warehousesService,
      packingStationService,
    );
    manifestService = new ShippingManifestService(
      warehousesService,
      containerizationService,
    );

    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Apex Logistics Global',
        slug: 'apex-logistics',
        owner_email: 'ops@apex.com',
        owner_full_name: 'Apex Ops Director',
        default_currency: 'USD',
      },
      'usr_apex_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Vanguard Retailers',
        slug: 'vanguard-retailers',
        owner_email: 'lead@vanguard.com',
        owner_full_name: 'Vanguard Lead',
        default_currency: 'EUR',
      },
      'usr_vanguard_1',
    );
    tenant2Id = t2.tenant.id;

    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-CENTRAL',
      name: 'Central Distribution Center',
    });
    wh1Id = wh1.id;
  });

  // --------------------------------------------------------------------------
  // Packing Stations & Boxes
  // --------------------------------------------------------------------------

  describe('PackingStationService', () => {
    it('creates packing station and enforces unique station code per warehouse', async () => {
      const res = await packingStationService.createStation(tenant1Id, {
        warehouse_id: wh1Id,
        station_code: 'PACK-01',
        station_name: 'Main Packing Bench 1',
        scale_device_id: 'USB_SCALE_01',
      });

      expect(res.station.id).toBeDefined();
      expect(res.station.station_code).toBe('PACK-01');
      expect(res.station.status).toBe('ACTIVE');

      // Duplicate code in same warehouse throws BadRequestException
      await expect(
        packingStationService.createStation(tenant1Id, {
          warehouse_id: wh1Id,
          station_code: 'pack-01',
          station_name: 'Duplicate Bench',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates packing station status and notes', async () => {
      const created = await packingStationService.createStation(tenant1Id, {
        warehouse_id: wh1Id,
        station_code: 'PACK-02',
        station_name: 'Bench 2',
      });

      const updated = await packingStationService.updateStation(
        tenant1Id,
        created.station.id,
        {
          status: 'MAINTENANCE',
          notes: 'Scale under calibration',
        },
      );

      expect(updated.station.status).toBe('MAINTENANCE');
      expect(updated.station.notes).toBe('Scale under calibration');
    });

    it('creates packaging boxes and enforces tenant uniqueness', async () => {
      const boxRes = await packingStationService.createPackagingBox(tenant1Id, {
        code: 'BOX-M',
        name: 'Medium Shipping Carton',
        length_mm: 300,
        width_mm: 200,
        height_mm: 150,
        max_weight_grams: 10000,
        tare_weight_grams: 350,
      });

      expect(boxRes.box.id).toBeDefined();
      expect(boxRes.box.code).toBe('BOX-M');
      expect(boxRes.box.tare_weight_grams).toBe(350);

      // Duplicate code throws
      await expect(
        packingStationService.createPackagingBox(tenant1Id, {
          code: 'box-m',
          name: 'Duplicate Box',
          length_mm: 300,
          width_mm: 200,
          height_mm: 150,
          max_weight_grams: 10000,
          tare_weight_grams: 350,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --------------------------------------------------------------------------
  // Cartonization Recommendation
  // --------------------------------------------------------------------------

  describe('ContainerizationService - Cartonization Engine', () => {
    it('recommends cartons using 3D BFD heuristics and packaging boxes', async () => {
      await packingStationService.createPackagingBox(tenant1Id, {
        code: 'BOX-S',
        name: 'Small Box',
        length_mm: 200,
        width_mm: 150,
        height_mm: 100, // 3000 cm3
        max_weight_grams: 5000,
        tare_weight_grams: 200,
      });

      await packingStationService.createPackagingBox(tenant1Id, {
        code: 'BOX-L',
        name: 'Large Box',
        length_mm: 400,
        width_mm: 300,
        height_mm: 200, // 24000 cm3
        max_weight_grams: 20000,
        tare_weight_grams: 600,
      });

      const recommendation = await containerizationService.recommendCartonization(
        tenant1Id,
        {
          warehouse_id: wh1Id,
          items: [
            {
              sku: 'SKU-SHIRT-M',
              variant_id: 'var_shirt_1',
              quantity: 2,
              weight_grams_each: 300,
              length_mm: 100,
              width_mm: 80,
              height_mm: 30,
            },
          ],
        },
      );

      expect(recommendation.total_cartons).toBe(1);
      expect(recommendation.cartons[0]!.box_code).toBe('BOX-S');
      expect(recommendation.cartons[0]!.estimated_gross_weight_grams).toBe(200 + 2 * 300);
    });
  });

  // --------------------------------------------------------------------------
  // Container Lifecycle, Item Packing & Scale Sealing
  // --------------------------------------------------------------------------

  describe('ContainerizationService - Lifecycle & Scale Tolerances', () => {
    it('opens container, packs items, updates weights, and seals within scale tolerance', async () => {
      const box = await packingStationService.createPackagingBox(tenant1Id, {
        code: 'BOX-STD',
        name: 'Standard Box',
        length_mm: 300,
        width_mm: 200,
        height_mm: 150,
        max_weight_grams: 15000,
        tare_weight_grams: 400,
      });

      const openRes = await containerizationService.openContainer(tenant1Id, {
        warehouse_id: wh1Id,
        box_type_id: box.box.id,
      });

      const container = openRes.container;
      expect(container.container_number).toMatch(/^CNT-\d+$/);
      expect(container.sscc_barcode).toHaveLength(18);
      expect(container.status).toBe('OPEN');
      expect(container.tare_weight_grams).toBe(400);
      expect(container.gross_weight_grams).toBe(400);

      // Pack 2 items of 800g each
      const packedRes = await containerizationService.packItem(
        tenant1Id,
        container.id,
        {
          order_id: 'ord_101',
          order_line_id: 'line_101_1',
          variant_id: 'var_boot_1',
          sku: 'SKU-BOOTS-42',
          quantity: 2,
          unit_weight_grams: 800,
        },
      );

      expect(packedRes.container.lines).toHaveLength(1);
      expect(packedRes.container.net_weight_grams).toBe(1600);
      expect(packedRes.container.gross_weight_grams).toBe(2000); // 400 + 1600

      // Seal container with measured scale weight of 2020g (1% difference, well within 200 bp = 2% tolerance)
      const sealedRes = await containerizationService.sealContainer(
        tenant1Id,
        container.id,
        {
          scale_weight_grams: 2020,
          seal_number: 'SEAL-ALPHA-01',
          tolerance_percentage_bp: 200,
        },
      );

      expect(sealedRes.container.status).toBe('SEALED');
      expect(sealedRes.container.scale_verified_weight_grams).toBe(2020);
      expect(sealedRes.container.weight_discrepancy_grams).toBe(20);
      expect(sealedRes.container.sealed_at).toBeDefined();

      // Cannot pack into sealed container
      await expect(
        containerizationService.packItem(tenant1Id, container.id, {
          order_id: 'ord_101',
          order_line_id: 'line_101_2',
          variant_id: 'var_boot_2',
          sku: 'SKU-BOOTS-43',
          quantity: 1,
          unit_weight_grams: 800,
        }),
      ).rejects.toThrow(/must be OPEN/i);
    });

    it('rejects sealing when scale weight violates weight tolerance threshold', async () => {
      const box = await packingStationService.createPackagingBox(tenant1Id, {
        code: 'BOX-TIGHT',
        name: 'Tight Spec Box',
        length_mm: 300,
        width_mm: 200,
        height_mm: 150,
        max_weight_grams: 10000,
        tare_weight_grams: 500,
      });

      const openRes = await containerizationService.openContainer(tenant1Id, {
        warehouse_id: wh1Id,
        box_type_id: box.box.id,
      });

      await containerizationService.packItem(tenant1Id, openRes.container.id, {
        order_id: 'ord_102',
        order_line_id: 'line_102_1',
        variant_id: 'var_camera',
        sku: 'SKU-CAM-PRO',
        quantity: 1,
        unit_weight_grams: 1500,
      });

      // Expected gross: 500 + 1500 = 2000g.
      // Scale reports 2200g (+10% discrepancy, way over default 200 bp = 2%)
      await expect(
        containerizationService.sealContainer(tenant1Id, openRes.container.id, {
          scale_weight_grams: 2200,
          tolerance_percentage_bp: 200,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --------------------------------------------------------------------------
  // Shipping Manifests & Carrier Handover
  // --------------------------------------------------------------------------

  describe('ShippingManifestService', () => {
    it('creates manifest, associates sealed containers, and dispatches to carrier', async () => {
      const box = await packingStationService.createPackagingBox(tenant1Id, {
        code: 'BOX-SHIP',
        name: 'Shipping Box',
        length_mm: 300,
        width_mm: 200,
        height_mm: 150,
        max_weight_grams: 10000,
        tare_weight_grams: 300,
      });

      // Container 1
      const c1 = await containerizationService.openContainer(tenant1Id, {
        warehouse_id: wh1Id,
        box_type_id: box.box.id,
      });
      await containerizationService.packItem(tenant1Id, c1.container.id, {
        order_id: 'ord_1',
        order_line_id: 'l1',
        variant_id: 'v1',
        sku: 'SKU-1',
        quantity: 1,
        unit_weight_grams: 700,
      });
      await containerizationService.sealContainer(tenant1Id, c1.container.id, {
        scale_weight_grams: 1000, // exact 300 + 700
      });

      // Container 2
      const c2 = await containerizationService.openContainer(tenant1Id, {
        warehouse_id: wh1Id,
        box_type_id: box.box.id,
      });
      await containerizationService.packItem(tenant1Id, c2.container.id, {
        order_id: 'ord_2',
        order_line_id: 'l2',
        variant_id: 'v2',
        sku: 'SKU-2',
        quantity: 2,
        unit_weight_grams: 500,
      });
      await containerizationService.sealContainer(tenant1Id, c2.container.id, {
        scale_weight_grams: 1300, // exact 300 + 1000
      });

      // Create manifest
      const manifestRes = await manifestService.createManifest(tenant1Id, {
        warehouse_id: wh1Id,
        carrier_id: 'DHL_EXPRESS',
        carrier_name: 'DHL Express International',
        vehicle_reference: 'VAN-DHL-42',
      });

      expect(manifestRes.manifest.status).toBe('DRAFT');
      expect(manifestRes.manifest.manifest_number).toMatch(/^MNF-\d+$/);

      // Add containers to manifest
      const withContainers = await manifestService.addContainersToManifest(
        tenant1Id,
        manifestRes.manifest.id,
        {
          container_ids: [c1.container.id, c2.container.id],
        },
      );

      expect(withContainers.manifest.total_containers).toBe(2);
      expect(withContainers.manifest.total_gross_weight_grams).toBe(2300); // 1000 + 1300
      expect(withContainers.manifest.containers![0]!.status).toBe('STAGED');
      expect(withContainers.manifest.containers![1]!.status).toBe('STAGED');

      // Seal manifest
      const sealedManifest = await manifestService.sealManifest(
        tenant1Id,
        manifestRes.manifest.id,
      );
      expect(sealedManifest.manifest.status).toBe('SEALED');

      // Dispatch manifest
      const dispatched = await manifestService.dispatchManifest(
        tenant1Id,
        manifestRes.manifest.id,
        {
          driver_name: 'Marcus Driver',
          driver_phone: '+1-555-0144',
          notes: 'Signed and handed over at Bay 2',
        },
      );

      expect(dispatched.manifest.status).toBe('DISPATCHED');
      expect(dispatched.manifest.driver_name).toBe('Marcus Driver');
      expect(dispatched.manifest.dispatched_at).toBeDefined();
      expect(dispatched.manifest.containers![0]!.status).toBe('DISPATCHED');
      expect(dispatched.manifest.containers![1]!.status).toBe('DISPATCHED');
    });

    it('rejects adding unsealed containers to manifest', async () => {
      const openC = await containerizationService.openContainer(tenant1Id, {
        warehouse_id: wh1Id,
      });

      const manifestRes = await manifestService.createManifest(tenant1Id, {
        warehouse_id: wh1Id,
        carrier_id: 'FEDEX',
        carrier_name: 'FedEx Freight',
      });

      await expect(
        manifestService.addContainersToManifest(tenant1Id, manifestRes.manifest.id, {
          container_ids: [openC.container.id],
        }),
      ).rejects.toThrow(/Only SEALED or STAGED containers can be added/i);
    });

    it('rejects dispatching an empty manifest', async () => {
      const manifestRes = await manifestService.createManifest(tenant1Id, {
        warehouse_id: wh1Id,
        carrier_id: 'UPS',
        carrier_name: 'UPS Ground',
      });

      await expect(
        manifestService.dispatchManifest(tenant1Id, manifestRes.manifest.id, {}),
      ).rejects.toThrow(/Cannot dispatch an empty shipping manifest/i);
    });

    it('enforces multi-tenant isolation across containers and manifests', async () => {
      const c = await containerizationService.openContainer(tenant1Id, {
        warehouse_id: wh1Id,
      });

      // Tenant 2 cannot view Tenant 1's container
      await expect(
        containerizationService.getContainerById(tenant2Id, c.container.id),
      ).rejects.toThrow(NotFoundException);

      // Tenant 2 cannot access Tenant 1's manifest
      const m = await manifestService.createManifest(tenant1Id, {
        warehouse_id: wh1Id,
        carrier_id: 'USPS',
        carrier_name: 'US Postal Service',
      });

      await expect(
        manifestService.getManifestById(tenant2Id, m.manifest.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
