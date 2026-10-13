import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { BatchesService } from '../tracking/batches.service.js';
import { SerialsService } from '../tracking/serials.service.js';
import { StockLedgerService } from './stock-ledger.service.js';
import { StockReservationsService } from './stock-reservations.service.js';

describe('Deep Inventory Core & Ledger Services (Phase 2E)', () => {
  let tenancyService: TenancyService;
  let variantsService: VariantsService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let batchesService: BatchesService;
  let serialsService: SerialsService;
  let stockLedgerService: StockLedgerService;
  let stockReservationsService: StockReservationsService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;

  let variant1Id: string;
  let warehouse1Id: string;
  let warehouse2Id: string;
  let location1Id: string;
  let location2Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    const uomService = new UomService();
    const categoriesService = new CategoriesService();
    const brandsService = new BrandsService();
    const templatesService = new TemplatesService(uomService, categoriesService, brandsService);
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

    stockLedgerService = new StockLedgerService(
      variantsService,
      warehousesService,
      locationsService,
      batchesService,
      serialsService,
    );

    stockReservationsService = new StockReservationsService(
      stockLedgerService,
      variantsService,
      warehousesService,
    );

    // Setup Tenants
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Apex Superstore',
        slug: 'apex-superstore',
        owner_email: 'owner@apex.com',
        owner_full_name: 'Apex Owner',
        default_currency: 'USD',
      },
      'usr_owner_apex',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Zenith Logistics',
        slug: 'zenith-logistics',
        owner_email: 'owner@zenith.com',
        owner_full_name: 'Zenith Owner',
        default_currency: 'EUR',
      },
      'usr_owner_zenith',
    );
    tenant2Id = t2.tenant.id;

    // Create UOM, Category, Template, Variant in Tenant 1
    const uom = await uomService.createUom(tenant1Id, {
      code: 'EA',
      name: 'Each',
      category: 'COUNT',
      is_base_unit: true,
    });
    const cat = await categoriesService.createCategory(tenant1Id, {
      code: 'ELEC',
      name: 'Electronics',
    });
    const tmpl = await templatesService.createTemplate(tenant1Id, {
      code: 'TMPL-LAPTOP',
      name: 'Pro Laptop 15',
      base_uom_id: uom.id,
      category_id: cat.id,
      type: 'STANDARD',
      tracking_policy: 'BATCH_AND_SERIAL',
    });
    const variant = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl.id,
      sku: 'LAPTOP-PRO-15',
      cost_price_minor: '80000', // $800.00
      selling_price_minor: '120000', // $1200.00
      attributes: {},
    });
    variant1Id = variant.id;

    // Create Warehouses and Locations in Tenant 1
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-MAIN',
      name: 'Main Distribution Center',
    });
    warehouse1Id = wh1.id;

    const wh2 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-RETAIL',
      name: 'Retail Storefront',
    });
    warehouse2Id = wh2.id;

    const loc1 = await locationsService.createLocation(tenant1Id, {
      warehouse_id: warehouse1Id,
      code: 'RACK-01',
      name: 'Rack 01',
      type: 'INTERNAL_STORAGE',
    });
    location1Id = loc1.id;

    const loc2 = await locationsService.createLocation(tenant1Id, {
      warehouse_id: warehouse2Id,
      code: 'SALES-FLOOR',
      name: 'Sales Floor Shelving',
      type: 'PICKING_FACE',
    });
    location2Id = loc2.id;
  });

  describe('StockLedgerService (Double-Entry Movements & Snapshots)', () => {
    it('records purchase receipt, updates on-hand balance, and enforces idempotency', async () => {
      // 1. Post Purchase Receipt of 10 units @ $800.00 each
      const res = await stockLedgerService.postMovement(tenant1Id, 'usr_recv_1', {
        idempotency_key: 'po-receipt-001',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'PURCHASE_ORDER',
        reference_id: 'PO-2026-99',
        variant_id: variant1Id,
        destination_warehouse_id: warehouse1Id,
        destination_location_id: location1Id,
        quantity: 10,
        unit_cost_minor: '80000',
        notes: 'Initial stock intake from factory',
      });

      expect(res.entry.id).toBeDefined();
      expect(res.entry.total_cost_minor).toBe('800000'); // $8,000.00 total
      expect(res.destination_balance?.on_hand_quantity).toBe(10);
      expect(res.destination_balance?.available_to_promise).toBe(10);

      // 2. Idempotency Check: posting with same idempotency key returns exact same record without doubling balance
      const duplicateRes = await stockLedgerService.postMovement(tenant1Id, 'usr_recv_1', {
        idempotency_key: 'po-receipt-001',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'PURCHASE_ORDER',
        reference_id: 'PO-2026-99',
        variant_id: variant1Id,
        destination_warehouse_id: warehouse1Id,
        destination_location_id: location1Id,
        quantity: 10,
        unit_cost_minor: '80000',
      });

      expect(duplicateRes.entry.id).toBe(res.entry.id);

      const bal = await stockLedgerService.getBalance(
        tenant1Id,
        warehouse1Id,
        variant1Id,
        location1Id,
      );
      expect(bal.on_hand_quantity).toBe(10); // Still 10, not 20!
    });

    it('performs double-entry internal transfer between warehouses and relocates serial number', async () => {
      // Setup initial stock in Warehouse 1
      await stockLedgerService.postMovement(tenant1Id, 'usr_init', {
        idempotency_key: 'init-stock',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'SYSTEM_INITIALIZATION',
        reference_id: 'INIT-1',
        variant_id: variant1Id,
        destination_warehouse_id: warehouse1Id,
        destination_location_id: location1Id,
        quantity: 5,
        unit_cost_minor: '80000',
      });

      // Register Serial in Warehouse 1
      const serial = await serialsService.createSerial(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        location_id: location1Id,
        serial_number: 'SN-LAPTOP-001',
      });

      // Transfer 1 unit from Warehouse 1 (Rack 01) to Warehouse 2 (Sales Floor)
      const transferRes = await stockLedgerService.postMovement(tenant1Id, 'usr_transfer', {
        idempotency_key: 'transfer-tx-01',
        movement_type: 'INTERNAL_TRANSFER',
        reference_type: 'STOCK_TRANSFER',
        reference_id: 'XFER-001',
        variant_id: variant1Id,
        serial_id: serial.id,
        source_warehouse_id: warehouse1Id,
        source_location_id: location1Id,
        destination_warehouse_id: warehouse2Id,
        destination_location_id: location2Id,
        quantity: 1,
        unit_cost_minor: '80000',
      });

      // Source decremented to 4
      expect(transferRes.source_balance?.on_hand_quantity).toBe(4);
      // Destination incremented to 1
      expect(transferRes.destination_balance?.on_hand_quantity).toBe(1);

      // Verify serial number was relocated
      const updatedSerial = await serialsService.getSerialById(tenant1Id, serial.id);
      expect(updatedSerial.warehouse_id).toBe(warehouse2Id);
      expect(updatedSerial.location_id).toBe(location2Id);
    });

    it('strictly forbids dispatch or movement of quarantined batch', async () => {
      const batch = await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'BATCH-DEFECT',
      });

      // Put batch on quarantine hold
      await batchesService.quarantineHold(tenant1Id, batch.id, {
        reason: 'QA_INSPECTION_PENDING',
      });

      // Attempting to dispatch from this batch must throw
      await expect(
        stockLedgerService.postMovement(tenant1Id, 'usr_seller', {
          idempotency_key: 'dispatch-bad-batch',
          movement_type: 'SALES_DISPATCH',
          reference_type: 'SALES_ORDER',
          reference_id: 'SO-001',
          variant_id: variant1Id,
          batch_id: batch.id,
          source_warehouse_id: warehouse1Id,
          source_location_id: location1Id,
          quantity: 1,
          unit_cost_minor: '80000',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('StockReservationsService (Decoupled Physical vs. Commercial Holds)', () => {
    beforeEach(async () => {
      // Inflow 10 physical units into Warehouse 1
      await stockLedgerService.postMovement(tenant1Id, 'usr_init', {
        idempotency_key: 'res-init-10',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'SYSTEM_INITIALIZATION',
        reference_id: 'INIT-RES',
        variant_id: variant1Id,
        destination_warehouse_id: warehouse1Id,
        quantity: 10,
        unit_cost_minor: '80000',
      });
    });

    it('creates reservation, updates ATP without reducing physical on-hand quantity', async () => {
      const res = await stockReservationsService.createReservation(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        quantity: 3,
        reference_type: 'SALES_ORDER',
        reference_id: 'SO-CART-99',
        ttl_seconds: 600,
      });

      expect(res.id).toBeDefined();
      expect(res.status).toBe('ACTIVE');

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      // Invariant: Physical On-Hand is STILL 10!
      expect(bal.on_hand_quantity).toBe(10);
      // Reserved quantity is 3
      expect(bal.reserved_quantity).toBe(3);
      // Available to Promise is now 7
      expect(bal.available_to_promise).toBe(7);
    });

    it('rejects reservation exceeding available-to-promise inventory', async () => {
      // 10 units exist; request 15
      await expect(
        stockReservationsService.createReservation(tenant1Id, {
          variant_id: variant1Id,
          warehouse_id: warehouse1Id,
          quantity: 15,
          reference_type: 'SALES_ORDER',
          reference_id: 'SO-OVER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('releases reservation and restores ATP', async () => {
      const res = await stockReservationsService.createReservation(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        quantity: 4,
        reference_type: 'SALES_ORDER',
        reference_id: 'SO-CANCEL',
      });

      const released = await stockReservationsService.releaseReservation(tenant1Id, res.id);
      expect(released.status).toBe('RELEASED');

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.reserved_quantity).toBe(0);
      expect(bal.available_to_promise).toBe(10);
    });

    it('reconciles expired reservations and frees allocated holds', async () => {
      // Create reservation that expired in past
      const res = await stockReservationsService.createReservation(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        quantity: 5,
        reference_type: 'ABANDONED_CART',
        reference_id: 'CART-OLD',
        ttl_seconds: 1, // 1 sec
      });

      // Manually set expiration to past
      res.expires_at = new Date(Date.now() - 5000).toISOString();

      const reconciledCount = await stockReservationsService.reconcileExpiredReservations(tenant1Id);
      expect(reconciledCount).toBe(1);

      const updated = await stockReservationsService.getReservationById(tenant1Id, res.id);
      expect(updated.status).toBe('EXPIRED');

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.reserved_quantity).toBe(0);
      expect(bal.available_to_promise).toBe(10);
    });

    it('enforces tenant isolation across balances and reservations', async () => {
      const res = await stockReservationsService.createReservation(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
        quantity: 2,
        reference_type: 'HOLD',
        reference_id: 'H-1',
      });

      // Tenant 2 must see empty balances and not find Tenant 1 reservation
      const t2Balances = await stockLedgerService.getBalances(tenant2Id);
      expect(t2Balances.length).toBe(0);

      await expect(
        stockReservationsService.getReservationById(tenant2Id, res.id),
      ).rejects.toThrow();
    });
  });
});
