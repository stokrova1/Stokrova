import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';
import { ZonesService } from './zones.service.js';
import { PutawayRulesService } from './putaway-rules.service.js';
import { PutawayService } from './putaway.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { BatchesService } from '../tracking/batches.service.js';
import { SerialsService } from '../tracking/serials.service.js';

describe('Warehouse Operations & Directed Put-Away Engine (Phase 6A)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let zonesService: ZonesService;
  let rulesService: PutawayRulesService;
  let putawayService: PutawayService;
  let stockLedgerService: StockLedgerService;
  let uomService: UomService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;
  let variantsService: VariantsService;
  let templatesService: TemplatesService;
  let batchesService: BatchesService;
  let serialsService: SerialsService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;
  let branch2Id: string;

  let wh1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);
    zonesService = new ZonesService(warehousesService);
    rulesService = new PutawayRulesService(warehousesService);

    uomService = new UomService();
    categoriesService = new CategoriesService();
    brandsService = new BrandsService();
    templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    variantsService = new VariantsService(templatesService);
    batchesService = new BatchesService(variantsService);
    serialsService = new SerialsService(variantsService, warehousesService, locationsService, batchesService);

    stockLedgerService = new StockLedgerService(
      variantsService,
      warehousesService,
      locationsService,
      batchesService,
      serialsService,
    );

    putawayService = new PutawayService(
      warehousesService,
      locationsService,
      zonesService,
      rulesService,
      stockLedgerService,
      variantsService,
    );

    // Provision test tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Apex Pharma & Logistics',
        slug: 'apex-logistics',
        owner_email: 'ops@apex.com',
        owner_full_name: 'Apex Ops Director',
        default_currency: 'USD',
      },
      'usr_apex_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Provision test tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Zenith Retail',
        slug: 'zenith-retail',
        owner_email: 'ops@zenith.com',
        owner_full_name: 'Zenith Ops Lead',
        default_currency: 'EUR',
      },
      'usr_zenith_1',
    );
    tenant2Id = t2.tenant.id;
    branch2Id = t2.default_branch.id;

    // Create Warehouse for Tenant 1
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-MAIN',
      name: 'Main Distribution Hub',
    });
    wh1Id = wh1.id;

    // Create Warehouse for Tenant 2
    const wh2 = await warehousesService.createWarehouse(tenant2Id, {
      branch_id: branch2Id,
      code: 'WH-ZENITH',
      name: 'Zenith Euro Central',
    });
    expect(wh2.id).toBeDefined();
  });

  describe('Storage Zones Lifecycle & Segregation', () => {
    it('creates storage zones with temperature and hazmat classes', async () => {
      const coldZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-COLD',
        name: 'Cold Chain Vault (2-8C)',
        zone_type: 'COLD_CHAIN',
        temperature_class: 'COLD_STORAGE',
        hazmat_class: 'NONE',
      });

      expect(coldZone.id).toBeDefined();
      expect(coldZone.code).toBe('ZONE-COLD');
      expect(coldZone.temperature_class).toBe('COLD_STORAGE');
      expect(coldZone.hazmat_class).toBe('NONE');
    });

    it('enforces unique zone codes per warehouse', async () => {
      await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-HAZMAT',
        name: 'Chemical Containment',
        zone_type: 'HAZMAT',
        hazmat_class: 'FLAMMABLE',
      });

      await expect(
        zonesService.createZone(tenant1Id, {
          warehouse_id: wh1Id,
          code: 'ZONE-HAZMAT',
          name: 'Duplicate Chemical Containment',
          zone_type: 'HAZMAT',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('enforces strict tenant isolation for storage zones', async () => {
      const zone1 = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-A1',
        name: 'Zone Alpha',
        zone_type: 'BULK_STORAGE',
      });

      // Tenant 2 cannot view Tenant 1 zone
      await expect(zonesService.getZoneById(tenant2Id, zone1.id)).rejects.toThrow(
        NotFoundException,
      );

      // Tenant 2 cannot create zone in Tenant 1 warehouse
      await expect(
        zonesService.createZone(tenant2Id, {
          warehouse_id: wh1Id,
          code: 'ZONE-ILLEGAL',
          name: 'Illegal Cross Tenant Zone',
          zone_type: 'BULK_STORAGE',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates and deletes storage zones', async () => {
      const zone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-TEMP',
        name: 'Temporary Zone',
        zone_type: 'STAGING',
      });

      const updated = await zonesService.updateZone(tenant1Id, zone.id, {
        name: 'Staging Zone West',
        notes: 'Updated staging bay',
      });
      expect(updated.name).toBe('Staging Zone West');
      expect(updated.notes).toBe('Updated staging bay');

      await zonesService.deleteZone(tenant1Id, zone.id);
      await expect(zonesService.getZoneById(tenant1Id, zone.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Storage Locations with Phase 6A Coordinates', () => {
    it('creates location linked to zone with aisle, rack, shelf, bin coordinates', async () => {
      const zone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-PICK',
        name: 'Fast Pick Zone',
        zone_type: 'PICKING',
      });

      const loc = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'BIN-01-02-03',
        name: 'Aisle 1 Rack 2 Shelf 3',
        type: 'PICKING_FACE',
        zone_id: zone.id,
        velocity_class: 'CLASS_A_FAST_MOVING',
        aisle: 1,
        rack: 2,
        shelf: 3,
        bin_position: 1,
      });

      expect(loc.zone_id).toBe(zone.id);
      expect(loc.velocity_class).toBe('CLASS_A_FAST_MOVING');
      expect(loc.aisle).toBe(1);
      expect(loc.rack).toBe(2);
      expect(loc.shelf).toBe(3);
      expect(loc.bin_position).toBe(1);
    });
  });

  describe('Put-Away Rules Engine', () => {
    it('evaluates rules and matches destination zone based on priority and filters', async () => {
      const coldZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-COLD',
        name: 'Cold Storage Vault',
        zone_type: 'COLD_CHAIN',
        temperature_class: 'COLD_STORAGE',
      });

      const hazmatZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-HAZ',
        name: 'Flammable Vault',
        zone_type: 'HAZMAT',
        hazmat_class: 'FLAMMABLE',
      });

      // Priority 10: Cold Chain rule
      await rulesService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        name: 'Cold Storage Rule',
        priority: 10,
        strategy: 'FASTEST_PICK_PROXIMITY',
        filter_temperature_class: 'COLD_STORAGE',
        destination_zone_id: coldZone.id,
      });

      // Priority 20: Flammables rule
      await rulesService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        name: 'Flammables Segregation Rule',
        priority: 20,
        strategy: 'SAME_SKU_CONSOLIDATION',
        filter_hazmat_class: 'FLAMMABLE',
        destination_zone_id: hazmatZone.id,
      });

      const coldMatch = await rulesService.findMatchingRule(tenant1Id, wh1Id, {
        temperatureClass: 'COLD_STORAGE',
      });
      expect(coldMatch).toBeDefined();
      expect(coldMatch?.destination_zone_id).toBe(coldZone.id);

      const hazMatch = await rulesService.findMatchingRule(tenant1Id, wh1Id, {
        hazmatClass: 'FLAMMABLE',
      });
      expect(hazMatch).toBeDefined();
      expect(hazMatch?.destination_zone_id).toBe(hazmatZone.id);
    });
  });

  describe('Directed Put-Away Engine Multi-Criteria Decision (Rule 26)', () => {
    it('routes cold-chain items strictly to cold vault and rejects ambient/frozen locations', async () => {
      // 1. Setup Cold Zone
      const coldZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-VAULT',
        name: 'Cold Vault',
        zone_type: 'COLD_CHAIN',
        temperature_class: 'COLD_STORAGE',
      });

      // 2. Setup Ambient Zone
      const ambientZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-AMB',
        name: 'General Ambient Zone',
        zone_type: 'BULK_STORAGE',
        temperature_class: 'AMBIENT',
      });

      // Bins in Cold Vault
      const coldBin1 = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'COLD-BIN-01',
        name: 'Cold Shelf 1',
        type: 'INTERNAL_STORAGE',
        zone_id: coldZone.id,
      });

      // Bins in Ambient
      await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'AMB-BIN-01',
        name: 'Ambient Shelf 1',
        type: 'INTERNAL_STORAGE',
        zone_id: ambientZone.id,
      });

      // Put-away request for refrigerated vaccine (COLD_STORAGE 2-8°C)
      const result = await putawayService.calculatePutAway(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_vaccine_01',
        sku: 'VAX-COVID-01',
        quantity: 100,
        temperature_class: 'COLD_STORAGE',
      });

      expect(result.best_match_location_id).toBe(coldBin1.id);
      expect(result.recommendations.length).toBe(1);
      expect(result.recommendations[0]?.location_code).toBe('COLD-BIN-01');
      expect(result.recommendations[0]?.reasons).toContain('Temperature verified (COLD_STORAGE)');
    });

    it('enforces hazmat regulatory segregation against incompatible chemical storage', async () => {
      // Setup Oxidizer Zone
      const oxidizerZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-OXIDIZER',
        name: 'Oxidizer Chemical Room',
        zone_type: 'HAZMAT',
        hazmat_class: 'OXIDIZER',
      });

      // Setup Flammable Zone
      const flammableZone = await zonesService.createZone(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'ZONE-FLAMMABLE',
        name: 'Flammable Storage Room',
        zone_type: 'HAZMAT',
        hazmat_class: 'FLAMMABLE',
      });

      // Oxidizer bin
      await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'OX-BIN-01',
        name: 'Oxidizer Bin 1',
        type: 'INTERNAL_STORAGE',
        zone_id: oxidizerZone.id,
      });

      // Flammable bin
      const flamBin = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'FLAM-BIN-01',
        name: 'Flammable Bin 1',
        type: 'INTERNAL_STORAGE',
        zone_id: flammableZone.id,
      });

      // Put-away request for Flammable chemical (must be segregated from Oxidizers)
      const result = await putawayService.calculatePutAway(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_ethanol_99',
        sku: 'CHEM-ETHANOL-99',
        quantity: 50,
        hazmat_class: 'FLAMMABLE',
      });

      expect(result.best_match_location_id).toBe(flamBin.id);
      expect(result.recommendations.map((r) => r.location_code)).not.toContain('OX-BIN-01');
    });

    it('rewards same-SKU consolidation bonus (+800) when bin already contains stock', async () => {
      // Create UOM, template & variant for catalog
      const uom = await uomService.createUom(tenant1Id, {
        code: 'BOX',
        name: 'Box',
        category: 'COUNT',
        is_base_unit: true,
      });

      const tmpl = await templatesService.createTemplate(tenant1Id, {
        code: 'TMPL-PARA-500',
        name: 'Paracetamol 500mg',
        base_uom_id: uom.id,
        type: 'STANDARD',
      });
      const variant = await variantsService.createVariant(tenant1Id, {
        template_id: tmpl.id,
        sku: 'MED-PARA-500',
        attributes: {},
        cost_price_minor: '200',
        selling_price_minor: '350',
      });

      // Bin A: Empty
      const binA = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'BIN-EMPTY-01',
        name: 'Empty Bin A',
        type: 'INTERNAL_STORAGE',
      });
      expect(binA.id).toBeDefined();

      // Bin B: Already contains 50 boxes of MED-PARA-500
      const binB = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'BIN-EXISTING-02',
        name: 'Occupied Bin B',
        type: 'INTERNAL_STORAGE',
      });

      await stockLedgerService.initiateOpeningBalance(tenant1Id, 'usr_apex_1', {
        idempotency_key: 'idem_open_bal_1',
        warehouse_id: wh1Id,
        location_id: binB.id,
        variant_id: variant.id,
        quantity: 50,
        unit_cost_minor: '250',
      });

      const result = await putawayService.calculatePutAway(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: variant.id,
        sku: 'MED-PARA-500',
        quantity: 20,
      });

      expect(result.best_match_location_id).toBe(binB.id);
      const bestMatch = result.recommendations.find((r) => r.location_id === binB.id);
      expect(bestMatch?.reasons).toContain('Same-SKU consolidation');
    });

    it('optimizes ABC velocity placement and accessibility (Class A to ground pick face)', async () => {
      // Aisle parent (Level 0)
      const aisle = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'AISLE-01',
        name: 'Main Aisle 1',
        type: 'INTERNAL_STORAGE',
      });

      // Bin A: Level 1 ground pick face under Aisle, matched to Class A
      const binA = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        parent_id: aisle.id,
        code: 'PICK-GROUND-01',
        name: 'Ground Level Prime Pick Face',
        type: 'PICKING_FACE',
        velocity_class: 'CLASS_A_FAST_MOVING',
      });

      // Bin B: Level 0 root location, slow moving
      await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'HIGH-BAY-04',
        name: 'Top High Bay Rack Level 4',
        type: 'INTERNAL_STORAGE',
        velocity_class: 'CLASS_C_SLOW_MOVING',
      });

      const result = await putawayService.calculatePutAway(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_high_runner',
        sku: 'SKU-FAST-MOVER',
        quantity: 10,
        velocity_class: 'CLASS_A_FAST_MOVING',
      });

      expect(result.best_match_location_id).toBe(binA.id);
      const topRec = result.recommendations[0];
      expect(topRec?.score).toBeGreaterThan(1500);
      expect(topRec?.reasons).toContain('Velocity match (+1000)');
      expect(topRec?.reasons).toContain('Accessibility level 1 (+600)');
    });

    it('disqualifies locations when weight or volume capacity is exceeded', async () => {
      // Bin with max weight 50 kg
      await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'BIN-LIGHTWEIGHT-01',
        name: 'Lightweight Shelf',
        type: 'INTERNAL_STORAGE',
        max_weight_kg: 50,
      });

      // Bin with heavy duty capacity 5000 kg
      const heavyBin = await locationsService.createLocation(tenant1Id, {
        warehouse_id: wh1Id,
        code: 'BIN-HEAVY-01',
        name: 'Reinforced Pallet Bay',
        type: 'INTERNAL_STORAGE',
        max_weight_kg: 5000,
      });

      // Incoming cargo weighing 100 kg (10 units * 10 kg)
      const result = await putawayService.calculatePutAway(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_heavy_motor',
        sku: 'SKU-MOTOR-100',
        quantity: 10,
        unit_weight_kg: 10, // 10 * 10 = 100 kg total
      });

      expect(result.best_match_location_id).toBe(heavyBin.id);
      expect(result.recommendations.map((r) => r.location_code)).not.toContain('BIN-LIGHTWEIGHT-01');
    });

    it('enforces multi-tenant isolation across all putaway operations', async () => {
      // Tenant 2 attempts putaway targeting Tenant 1 warehouse
      await expect(
        putawayService.calculatePutAway(tenant2Id, {
          warehouse_id: wh1Id,
          variant_id: 'var_any',
          sku: 'SKU-TEST',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
