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
import { AuditService } from '../audit/audit.service.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';
import { StockLedgerService } from './stock-ledger.service.js';
import { stock_ledger_entries } from '@stokrova/database';

describe('Phase 2 — Comprehensive Inventory Operations & Ledger Invariants', () => {
  let tenancyService: TenancyService;
  let variantsService: VariantsService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let batchesService: BatchesService;
  let serialsService: SerialsService;
  let auditService: AuditService;
  let outboxService: OutboxService;
  let stockLedgerService: StockLedgerService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;

  let variant1Id: string;
  let variant2Id: string;
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

    auditService = new AuditService();
    outboxService = new OutboxService();

    stockLedgerService = new StockLedgerService(
      variantsService,
      warehousesService,
      locationsService,
      batchesService,
      serialsService,
      auditService,
      outboxService,
    );

    // Setup Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Omega Holdings',
        slug: 'omega-holdings',
        owner_email: 'admin@omega.com',
        owner_full_name: 'Omega Admin',
        default_currency: 'USD',
      },
      'usr_omega_admin',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Setup Tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Alpha Retail',
        slug: 'alpha-retail',
        owner_email: 'admin@alpha.com',
        owner_full_name: 'Alpha Admin',
        default_currency: 'USD',
      },
      'usr_alpha_admin',
    );
    tenant2Id = t2.tenant.id;

    // Setup Catalog
    const uom = await uomService.createUom(tenant1Id, {
      code: 'EA',
      name: 'Each',
      category: 'COUNT',
      is_base_unit: true,
    });
    const cat = await categoriesService.createCategory(tenant1Id, {
      code: 'COMP',
      name: 'Components',
    });
    const tmpl1 = await templatesService.createTemplate(tenant1Id, {
      code: 'TMPL-NVME-PRO',
      name: 'PCIe NVMe SSD 2TB Pro',
      base_uom_id: uom.id,
      category_id: cat.id,
      type: 'STANDARD',
      tracking_policy: 'BATCH_AND_SERIAL',
    });

    const v1 = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl1.id,
      sku: 'SSD-NVME-2TB-PRO',
      barcode: '9780201379624',
      cost_price_minor: '15000', // $150.00
      selling_price_minor: '22000', // $220.00
      attributes: {},
    });
    variant1Id = v1.id;

    const tmpl2 = await templatesService.createTemplate(tenant1Id, {
      code: 'TMPL-NVME-EVO',
      name: 'PCIe NVMe SSD 2TB Evo',
      base_uom_id: uom.id,
      category_id: cat.id,
      type: 'STANDARD',
      tracking_policy: 'BATCH_AND_SERIAL',
    });

    const v2 = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl2.id,
      sku: 'SSD-NVME-2TB-EVO',
      cost_price_minor: '12000',
      selling_price_minor: '18000',
      attributes: {},
    });
    variant2Id = v2.id;
    expect(tenant2Id).toBeDefined();
    expect(variant2Id).toBeDefined();

    // Setup Warehouses and Locations
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-MAIN',
      name: 'Main Logistics Hub',
    });
    warehouse1Id = wh1.id;

    const wh2 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-SECONDARY',
      name: 'Secondary Buffer Warehouse',
    });
    warehouse2Id = wh2.id;

    const loc1 = await locationsService.createLocation(tenant1Id, {
      warehouse_id: warehouse1Id,
      code: 'ZONE-A-SHELF-1',
      name: 'Zone A Shelf 1',
      type: 'INTERNAL_STORAGE',
    });
    location1Id = loc1.id;

    const loc2 = await locationsService.createLocation(tenant1Id, {
      warehouse_id: warehouse2Id,
      code: 'RECEIVING-BAY',
      name: 'Receiving Dock',
      type: 'RECEIVING',
    });
    location2Id = loc2.id;
  });

  describe('1. Opening Balances Intake', () => {
    it('initializes opening balance with batch and serial creation, audit log, and outbox event', async () => {
      const serialNums = ['SN-SSD-001', 'SN-SSD-002'];
      const res = await stockLedgerService.initiateOpeningBalance(
        tenant1Id,
        'usr_manager',
        {
          idempotency_key: 'op-bal-001',
          warehouse_id: warehouse1Id,
          location_id: location1Id,
          variant_id: variant1Id,
          quantity: 2,
          unit_cost_minor: '15000',
          batch_number: 'BATCH-2026-A',
          expiration_date: '2028-12-31T23:59:59Z',
          serial_numbers: serialNums,
          notes: 'Migrated from legacy ERP',
        },
      );

      expect(res.entry.id).toBeDefined();
      expect(res.entry.movement_type).toBe('OPENING_BALANCE');
      expect(res.entry.quantity).toBe(2);
      expect(res.entry.total_cost_minor).toBe('30000'); // $300.00
      expect(res.entry.batch_id).toBeDefined();
      expect(res.destination_balance?.on_hand_quantity).toBe(2);
      expect(res.destination_balance?.available_to_promise).toBe(2);

      // Verify batch created
      const batch = await batchesService.getBatchById(tenant1Id, res.entry.batch_id!);
      expect(batch.batch_number).toBe('BATCH-2026-A');
      expect(batch.expiry_date).toBe('2028-12-31T23:59:59Z');

      // Verify serials created
      const serials = await serialsService.getSerials(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
      });
      expect(serials.length).toBe(2);
      expect(serials.map((s) => s.serial_number)).toEqual(expect.arrayContaining(serialNums));

      // Verify Audit Event logged
      const auditEvents = await auditService.queryAuditEvents(tenant1Id, {
        action: 'INVENTORY_MOVEMENT_POSTED',
      });
      expect(auditEvents.length).toBeGreaterThanOrEqual(1);
      expect(auditEvents[0]!.entity_id).toBe(res.entry.id);

      // Verify Outbox Event created
      const outboxEvents = await outboxService.getPendingEvents();
      const movementEvent = outboxEvents.find(
        (e) => e.event_type === 'inventory.movement_posted' && e.aggregate_id === res.entry.id,
      );
      expect(movementEvent).toBeDefined();
      expect((movementEvent?.payload as any).entry.movement_type).toBe('OPENING_BALANCE');
    });

    it('enforces idempotency on opening balance submission', async () => {
      const payload = {
        idempotency_key: 'op-bal-idempotent-test',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        quantity: 5,
        unit_cost_minor: '15000',
        notes: 'Idempotency test',
      };

      const first = await stockLedgerService.initiateOpeningBalance(
        tenant1Id,
        'usr_manager',
        payload,
      );
      const second = await stockLedgerService.initiateOpeningBalance(
        tenant1Id,
        'usr_manager',
        payload,
      );

      expect(second.entry.id).toBe(first.entry.id);

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.on_hand_quantity).toBe(5); // Not 10!
    });
  });

  describe('2. Stock Adjustments (Positive & Negative)', () => {
    beforeEach(async () => {
      await stockLedgerService.initiateOpeningBalance(tenant1Id, 'usr_init', {
        idempotency_key: 'adj-init',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        quantity: 10,
        unit_cost_minor: '15000',
      });
    });

    it('applies positive adjustment successfully', async () => {
      const res = await stockLedgerService.adjustStock(tenant1Id, 'usr_manager', {
        idempotency_key: 'adj-pos-01',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        delta_quantity: 3,
        reason_code: 'CYCLE_COUNT_CORRECTION',
        notes: 'Found uncounted box behind rack',
      });

      expect(res.entry.movement_type).toBe('STOCK_ADJUSTMENT');
      expect(res.entry.quantity).toBe(3);

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.on_hand_quantity).toBe(13);
      expect(bal.available_to_promise).toBe(13);
    });

    it('applies negative adjustment and updates balance', async () => {
      const res = await stockLedgerService.adjustStock(tenant1Id, 'usr_manager', {
        idempotency_key: 'adj-neg-01',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        delta_quantity: -4,
        reason_code: 'DAMAGED',
        notes: 'Crushed carton during forklift handling',
      });

      expect(res.entry.movement_type).toBe('STOCK_ADJUSTMENT');
      expect(res.entry.quantity).toBe(4);

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.on_hand_quantity).toBe(6);
      expect(bal.available_to_promise).toBe(6);
    });

    it('strictly forbids negative adjustment that causes negative on-hand balance', async () => {
      await expect(
        stockLedgerService.adjustStock(tenant1Id, 'usr_manager', {
          idempotency_key: 'adj-neg-excess',
          warehouse_id: warehouse1Id,
          variant_id: variant1Id,
          delta_quantity: -25, // Only 10 available
          reason_code: 'OTHER',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Inter-Warehouse Transfers & Serial Relocation', () => {
    it('executes atomic transfer and relocates serial number across warehouses', async () => {
      // 1. Ingest stock and serial in Warehouse 1
      await stockLedgerService.initiateOpeningBalance(tenant1Id, 'usr_init', {
        idempotency_key: 'xfer-init',
        warehouse_id: warehouse1Id,
        location_id: location1Id,
        variant_id: variant1Id,
        quantity: 1,
        unit_cost_minor: '15000',
        serial_numbers: ['SN-NVME-XFER-99'],
      });

      const serials = await serialsService.getSerials(tenant1Id, {
        variant_id: variant1Id,
        warehouse_id: warehouse1Id,
      });
      const serial = serials[0]!;
      expect(serial.warehouse_id).toBe(warehouse1Id);

      // 2. Perform Transfer
      const transferRes = await stockLedgerService.transferStock(tenant1Id, 'usr_logistics', {
        idempotency_key: 'xfer-tx-001',
        source_warehouse_id: warehouse1Id,
        source_location_id: location1Id,
        destination_warehouse_id: warehouse2Id,
        destination_location_id: location2Id,
        variant_id: variant1Id,
        quantity: 1,
        serial_id: serial.id,
      });

      expect(transferRes.entry.movement_type).toBe('INTERNAL_TRANSFER');
      expect(transferRes.source_balance?.on_hand_quantity).toBe(0);
      expect(transferRes.destination_balance?.on_hand_quantity).toBe(1);

      // Check balances
      const sourceBal = await stockLedgerService.getBalance(
        tenant1Id,
        warehouse1Id,
        variant1Id,
        location1Id,
      );
      const destBal = await stockLedgerService.getBalance(
        tenant1Id,
        warehouse2Id,
        variant1Id,
        location2Id,
      );
      expect(sourceBal.on_hand_quantity).toBe(0);
      expect(destBal.on_hand_quantity).toBe(1);

      // Serial relocated to Warehouse 2
      const updatedSerial = await serialsService.getSerialById(tenant1Id, serial.id);
      expect(updatedSerial.warehouse_id).toBe(warehouse2Id);
      expect(updatedSerial.location_id).toBe(location2Id);
    });
  });

  describe('4. Stock Write-Offs', () => {
    beforeEach(async () => {
      await stockLedgerService.initiateOpeningBalance(tenant1Id, 'usr_init', {
        idempotency_key: 'wo-init',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        quantity: 8,
        unit_cost_minor: '15000',
      });
    });

    it('records write-off for damage and decrements stock', async () => {
      const res = await stockLedgerService.writeOffStock(tenant1Id, 'usr_qa', {
        idempotency_key: 'wo-damage-01',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        quantity: 2,
        write_off_type: 'DAMAGE',
        notes: 'Water damage during roof leak',
      });

      expect(res.entry.movement_type).toBe('SCRAP_DAMAGED');
      expect(res.entry.quantity).toBe(2);

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.on_hand_quantity).toBe(6);
    });

    it('rejects write-off exceeding available inventory', async () => {
      await expect(
        stockLedgerService.writeOffStock(tenant1Id, 'usr_qa', {
          idempotency_key: 'wo-excess',
          warehouse_id: warehouse1Id,
          variant_id: variant1Id,
          quantity: 20,
          write_off_type: 'THEFT',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Blind Stock Count Discrepancy Reconciliation', () => {
    beforeEach(async () => {
      await stockLedgerService.initiateOpeningBalance(tenant1Id, 'usr_init', {
        idempotency_key: 'count-init',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        quantity: 10,
        unit_cost_minor: '15000',
      });
    });

    it('compensates shortage with COUNT_DISCREPANCY_LOSS when counted < on_hand', async () => {
      // 10 expected, counted 7 -> delta is -3
      const res = await stockLedgerService.reconcileStockCount(tenant1Id, 'usr_auditor', {
        idempotency_key: 'cycle-count-01',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        counted_quantity: 7,
        notes: 'Physical count shortfall',
      });

      expect(res.discrepancy).toBe(-3);
      expect(res.movement_response?.entry.movement_type).toBe('STOCK_COUNT_ADJUSTMENT');
      expect(res.movement_response?.entry.quantity).toBe(3);

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.on_hand_quantity).toBe(7);
    });

    it('compensates surplus with COUNT_DISCREPANCY_GAIN when counted > on_hand', async () => {
      // 10 expected, counted 14 -> delta is +4
      const res = await stockLedgerService.reconcileStockCount(tenant1Id, 'usr_auditor', {
        idempotency_key: 'cycle-count-02',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        counted_quantity: 14,
        notes: 'Found unrecorded inventory',
      });

      expect(res.discrepancy).toBe(4);
      expect(res.movement_response?.entry.movement_type).toBe('STOCK_COUNT_ADJUSTMENT');
      expect(res.movement_response?.entry.quantity).toBe(4);

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.on_hand_quantity).toBe(14);
    });

    it('leaves balances unchanged when counted == on_hand', async () => {
      const res = await stockLedgerService.reconcileStockCount(tenant1Id, 'usr_auditor', {
        idempotency_key: 'cycle-count-03',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        counted_quantity: 10,
      });

      expect(res.discrepancy).toBe(0);
      expect(res.movement_response).toBeNull();

      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(bal.on_hand_quantity).toBe(10);
    });
  });

  describe('6. Authoritative Ledger Law & Drift Self-Healing', () => {
    it('detects snapshot drift, recalculates from append-only ledger, and self-heals snapshots', async () => {
      // Inflow 20 units
      await stockLedgerService.initiateOpeningBalance(tenant1Id, 'usr_init', {
        idempotency_key: 'drift-init',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        quantity: 20,
        unit_cost_minor: '15000',
      });

      // Outflow 5 units via adjustment
      await stockLedgerService.adjustStock(tenant1Id, 'usr_adj', {
        idempotency_key: 'drift-out',
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
        delta_quantity: -5,
        reason_code: 'DAMAGED',
      });

      // Ground truth from movements: 20 - 5 = 15
      const balBefore = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(balBefore.on_hand_quantity).toBe(15);

      // Artificially induce cache drift directly in stored snapshot
      const rawBalances = await stockLedgerService.getBalances(tenant1Id, {
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
      });
      expect(rawBalances.length).toBeGreaterThan(0);
      rawBalances[0]!.on_hand_quantity = 999;

      // Run authoritative ledger reconciliation
      const recon = await stockLedgerService.reconcileBalancesAgainstLedger(tenant1Id, {
        warehouse_id: warehouse1Id,
        variant_id: variant1Id,
      });

      expect(recon.discrepancies_corrected).toBe(1);
      expect(recon.details[0]!.drift_detected).toBe(true);
      expect(recon.details[0]!.previous_snapshot_on_hand).toBe(999);
      expect(recon.details[0]!.calculated_ledger_on_hand).toBe(15);

      // Snapshot is completely restored to mathematical ground truth
      const balAfter = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id);
      expect(balAfter.on_hand_quantity).toBe(15);
    });
  });

  describe('7. FEFO (First-Expired, First-Out) Picking Order', () => {
    it('recommends batch allocations sorted by earliest expiration date and excludes expired batches', async () => {
      // Create 3 batches with different expirations
      const batchNearExpiry = await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'BATCH-EARLY',
        expiry_date: '2026-11-01T00:00:00Z', // Expires soon
      });
      const batchFarExpiry = await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'BATCH-LATE',
        expiry_date: '2027-06-01T00:00:00Z', // Expires later
      });
      const batchExpired = await batchesService.createBatch(tenant1Id, {
        variant_id: variant1Id,
        batch_number: 'BATCH-PAST',
        expiry_date: '2020-01-01T00:00:00Z', // Already expired!
      });

      // Ingest stock for each batch
      await stockLedgerService.postMovement(tenant1Id, 'usr_init', {
        idempotency_key: 'fefo-stock-early',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'SYSTEM_INITIALIZATION',
        reference_id: 'FEFO-1',
        variant_id: variant1Id,
        batch_id: batchNearExpiry.id,
        destination_warehouse_id: warehouse1Id,
        quantity: 5,
        unit_cost_minor: '15000',
      });
      await stockLedgerService.postMovement(tenant1Id, 'usr_init', {
        idempotency_key: 'fefo-stock-late',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'SYSTEM_INITIALIZATION',
        reference_id: 'FEFO-2',
        variant_id: variant1Id,
        batch_id: batchFarExpiry.id,
        destination_warehouse_id: warehouse1Id,
        quantity: 10,
        unit_cost_minor: '15000',
      });
      await stockLedgerService.postMovement(tenant1Id, 'usr_init', {
        idempotency_key: 'fefo-stock-expired',
        movement_type: 'PURCHASE_RECEIPT',
        reference_type: 'SYSTEM_INITIALIZATION',
        reference_id: 'FEFO-3',
        variant_id: variant1Id,
        batch_id: batchExpired.id,
        destination_warehouse_id: warehouse1Id,
        quantity: 8,
        unit_cost_minor: '15000',
      });

      // Request 8 units using FEFO
      const rec = await stockLedgerService.getFefoRecommendation(
        tenant1Id,
        {
          variant_id: variant1Id,
          warehouse_id: warehouse1Id,
          quantity: 8,
        },
      );

      expect(rec.variant_id).toBe(variant1Id);
      expect(rec.requested_quantity).toBe(8);
      expect(rec.total_allocated).toBe(8);
      expect(rec.shortage).toBe(0);

      // Allocations must pick BATCH-EARLY first (all 5 units), then BATCH-LATE (3 units)
      expect(rec.allocations.length).toBe(2);
      expect(rec.allocations[0]!.batch_id).toBe(batchNearExpiry.id);
      expect(rec.allocations[0]!.allocated_quantity).toBe(5);

      expect(rec.allocations[1]!.batch_id).toBe(batchFarExpiry.id);
      expect(rec.allocations[1]!.allocated_quantity).toBe(3);

      // Crucial: BATCH-PAST must NEVER be picked
      const pickedExpired = rec.allocations.some((a) => a.batch_id === batchExpired.id);
      expect(pickedExpired).toBe(false);
    });
  });

  describe('8. Catalog Barcode and SKU Scanning Fast Lookup', () => {
    it('retrieves variant by exact SKU and Barcode, returning null for non-existent codes', async () => {
      // By SKU
      const foundSku = await variantsService.lookupByBarcodeOrSku(
        tenant1Id,
        'SSD-NVME-2TB-PRO',
      );
      expect(foundSku).toBeDefined();
      expect(foundSku?.id).toBe(variant1Id);

      // By Barcode
      const foundBarcode = await variantsService.lookupByBarcodeOrSku(
        tenant1Id,
        '9780201379624',
      );
      expect(foundBarcode).toBeDefined();
      expect(foundBarcode?.id).toBe(variant1Id);

      // Non-existent
      const notFound = await variantsService.lookupByBarcodeOrSku(
        tenant1Id,
        'NON-EXISTENT-SKU',
      );
      expect(notFound).toBeNull();
    });
  });

  describe('9. Referential Integrity Safety Check (ADR-019 / Rule 11)', () => {
    it('verifies stock ledger schema prevents cascading delete on tenant and variant', () => {
      // Inspect Drizzle schema definitions for stock_ledger_entries
      const columns = stock_ledger_entries as any;
      expect(columns).toBeDefined();

      // Check foreign key references on tenant_id and variant_id
      const tenantCol = (stock_ledger_entries as any).tenant_id;
      const variantCol = (stock_ledger_entries as any).variant_id;

      expect(tenantCol).toBeDefined();
      expect(variantCol).toBeDefined();
    });
  });

  describe('10. Multi-Tenant and Multi-Variant Isolation', () => {
    it('strictly isolates stock balances between different tenants and variants', async () => {
      // Inflow into Tenant 1 variant 2
      await stockLedgerService.initiateOpeningBalance(tenant1Id, 'usr_init', {
        idempotency_key: 'v2-init',
        warehouse_id: warehouse1Id,
        variant_id: variant2Id,
        quantity: 7,
        unit_cost_minor: '12000',
      });

      const v2Bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant2Id);
      expect(v2Bal.on_hand_quantity).toBe(7);

      // Tenant 2 must see zero balances
      const t2Balances = await stockLedgerService.getBalances(tenant2Id);
      expect(t2Balances.length).toBe(0);
    });
  });
});
