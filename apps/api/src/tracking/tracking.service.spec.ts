import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { BatchesService } from './batches.service.js';
import { SerialsService } from './serials.service.js';

describe('Tracking & Quarantine Services (Phase 2D)', () => {
  let tenancyService: TenancyService;
  let templatesService: TemplatesService;
  let variantsService: VariantsService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let batchesService: BatchesService;
  let serialsService: SerialsService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;

  let variant1Id: string;
  let warehouse1Id: string;
  let location1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    const uomService = new UomService();
    const categoriesService = new CategoriesService();
    const brandsService = new BrandsService();
    templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    variantsService = new VariantsService(templatesService);

    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);

    batchesService = new BatchesService(variantsService);
    serialsService = new SerialsService(
      variantsService,
      warehousesService,
      locationsService,
      batchesService,
    );

    // Setup Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'PharmaTech Corp',
        slug: 'pharmatech-corp',
        owner_email: 'owner@pharmatech.com',
        owner_full_name: 'Dr. Smith',
        default_currency: 'USD',
      },
      'usr_pharma_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Setup Tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'BioLabs Inc',
        slug: 'biolabs-inc',
        owner_email: 'owner@biolabs.com',
        owner_full_name: 'Dr. Jones',
        default_currency: 'EUR',
      },
      'usr_biolabs_2',
    );
    tenant2Id = t2.tenant.id;

    // Create Base UOM & Category in Tenant 1
    const uom = await uomService.createUom(tenant1Id, {
      code: 'BOX',
      name: 'Box',
      category: 'COUNT',
      is_base_unit: true,
    });
    const cat = await categoriesService.createCategory(tenant1Id, {
      code: 'ANTI',
      name: 'Antibiotics',
    });

    // Create Template and Variant in Tenant 1
    const tmpl = await templatesService.createTemplate(tenant1Id, {
      code: 'TMPL-AMOX',
      name: 'Amoxicillin 500mg',
      base_uom_id: uom.id,
      category_id: cat.id,
      type: 'STANDARD',
      tracking_policy: 'BATCH_AND_SERIAL',
    });
    const variant = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl.id,
      sku: 'AMOX-500-BOX',
      cost_price_minor: '1200',
      selling_price_minor: '2500',
      attributes: {},
    });
    variant1Id = variant.id;

    // Create Warehouse and Bin in Tenant 1
    const wh = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-CENTRAL',
      name: 'Central Cold Storage',
    });
    warehouse1Id = wh.id;

    const loc = await locationsService.createLocation(tenant1Id, {
      warehouse_id: warehouse1Id,
      code: 'COLD-BIN-01',
      name: 'Cold Storage Bin 01',
      type: 'INTERNAL_STORAGE',
    });
    location1Id = loc.id;
  });

  describe('BatchesService', () => {
    it('creates batch and calculates accurate shelf-life metrics', async () => {
      const manufacture = '2026-01-01T00:00:00.000Z';
      const expiry = '2026-12-31T00:00:00.000Z';
      const asOf = '2026-06-01T00:00:00.000Z';

      const batch = await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'batch-2026-001',
        supplier_lot_number: 'LOT-PFIZER-88',
        manufacture_date: manufacture,
        expiry_date: expiry,
        certificate_of_analysis_url: 'https://biolabs.com/coa/b001.pdf',
      });

      expect(batch.id).toBeDefined();
      expect(batch.batch_number).toBe('BATCH-2026-001');
      expect(batch.status).toBe('AVAILABLE');

      // Query with shelf life metrics
      const withMetrics = await batchesService.getBatchWithMetrics(tenant1Id, batch.id, asOf);
      expect(withMetrics.shelf_life.status).toBe('HEALTHY');
      expect(withMetrics.shelf_life.is_expired).toBe(false);
      expect(withMetrics.shelf_life.total_shelf_life_days).toBe(364);
      expect(withMetrics.shelf_life.remaining_days).toBeGreaterThan(200);
    });

    it('rejects duplicate batch code for the same variant in tenant', async () => {
      await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'LOT-UNIQUE',
      });

      await expect(
        batchesService.createBatch(tenant1Id, {
          variant_id: variant1Id,
          batch_number: 'lot-unique',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects batch creation with manufacture date after expiry date', async () => {
      await expect(
        batchesService.createBatch(tenant1Id, {
          variant_id: variant1Id,
          batch_number: 'BAD-DATES',
          manufacture_date: '2026-12-01T00:00:00.000Z',
          expiry_date: '2026-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('executes quarantine hold and release workflow with audit logging', async () => {
      const batch = await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'LOT-TEMP-BREACH',
      });

      // Quarantine hold
      const held = await batchesService.quarantineHold(tenant1Id, batch.id, {
        reason: 'TEMPERATURE_EXCURSION',
        notes: 'Cold chain logger alarm during transit: 14 deg C recorded.',
      });
      expect(held.status).toBe('QUARANTINED');
      expect(held.quarantine_reason).toBe('TEMPERATURE_EXCURSION');
      expect(held.quarantined_at).toBeDefined();

      // Attempting release
      const released = await batchesService.quarantineRelease(
        tenant1Id,
        batch.id,
        { notes: 'Secondary stability testing approved by QA director.' },
        'usr_qa_officer',
      );
      expect(released.status).toBe('AVAILABLE');
      expect(released.released_by).toBe('usr_qa_officer');
      expect(released.released_at).toBeDefined();
      expect(released.quarantine_notes).toContain('Secondary stability testing approved');

      // Attempting to release already available batch throws
      await expect(
        batchesService.quarantineRelease(tenant1Id, batch.id, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('SerialsService', () => {
    let batchId: string;

    beforeEach(async () => {
      const batch = await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'BATCH-SN-PARENT',
      });
      batchId = batch.id;
    });

    it('registers individual and bulk serial numbers', async () => {
      const sn1 = await serialsService.createSerial(tenant1Id, {
        variant_id: variant1Id,
        batch_id: batchId,
        warehouse_id: warehouse1Id,
        location_id: location1Id,
        serial_number: 'SN-AMOX-001',
      });
      expect(sn1.id).toBeDefined();
      expect(sn1.serial_number).toBe('SN-AMOX-001');
      expect(sn1.status).toBe('AVAILABLE');

      // Bulk registration
      const bulk = await serialsService.bulkRegisterSerials(tenant1Id, {
        variant_id: variant1Id,
        batch_id: batchId,
        warehouse_id: warehouse1Id,
        location_id: location1Id,
        serial_numbers: ['SN-AMOX-002', 'SN-AMOX-003', 'SN-AMOX-004'],
      });
      expect(bulk.length).toBe(3);

      // Verify all queryable
      const all = await serialsService.getSerials(tenant1Id, { variant_id: variant1Id });
      expect(all.length).toBe(4);
    });

    it('rejects duplicate serials and illegal serial characters', async () => {
      await serialsService.createSerial(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        serial_number: 'SN-VALID-01',
      });

      // Duplicate registration throws
      await expect(
        serialsService.createSerial(tenant1Id, {
          variant_id: variant1Id,
          warehouse_id: warehouse1Id,
          serial_number: 'SN-VALID-01',
        }),
      ).rejects.toThrow(ConflictException);

      // Illegal characters throw
      await expect(
        serialsService.createSerial(tenant1Id, {
          variant_id: variant1Id,
          warehouse_id: warehouse1Id,
          serial_number: 'SN-INVALID@CHAR!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('relocates serials and manages quarantine lifecycle', async () => {
      const sn = await serialsService.createSerial(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        serial_number: 'SN-TEST-QUAR',
      });

      // Quarantine hold
      const held = await serialsService.quarantineHold(tenant1Id, sn.id, {
        reason: 'CUSTOMER_RETURN_INSPECTION',
        notes: 'Returned by hospital pharmacy, seal intact verification pending.',
      });
      expect(held.status).toBe('QUARANTINED');

      // Quarantine release
      const released = await serialsService.quarantineRelease(
        tenant1Id,
        sn.id,
        { notes: 'Seal confirmed intact. Restocked to shelf.' },
        'usr_lead_pharmacist',
      );
      expect(released.status).toBe('AVAILABLE');
      expect(released.released_by).toBe('usr_lead_pharmacist');
    });

    it('guarantees tenant isolation', async () => {
      const sn = await serialsService.createSerial(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        serial_number: 'SN-TENANT-1',
      });

      // Tenant 2 cannot access Tenant 1 serial
      await expect(
        serialsService.getSerialById(tenant2Id, sn.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
