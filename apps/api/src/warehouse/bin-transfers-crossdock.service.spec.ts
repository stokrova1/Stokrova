import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';
import { BarcodeLogisticsService } from './barcode-logistics.service.js';
import { BinTransfersService } from './bin-transfers.service.js';
import { CrossDockService } from './cross-dock.service.js';

describe('Warehouse Bin Transfers, Cross-Docking & Barcode Logistics (Phase 6D)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let barcodeService: BarcodeLogisticsService;
  let transfersService: BinTransfersService;
  let crossDockService: CrossDockService;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;
  let wh1Id: string;
  let locSourceId: string;
  let locDestId: string;
  let locCrossDockId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);
    barcodeService = new BarcodeLogisticsService();
    transfersService = new BinTransfersService(warehousesService, locationsService);
    crossDockService = new CrossDockService(warehousesService, locationsService);

    // Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Omni Logistics Global',
        slug: 'omni-logistics',
        owner_email: 'ops@omni.com',
        owner_full_name: 'Omni Ops Director',
        default_currency: 'USD',
      },
      'usr_omni_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Apex Retail Distribution',
        slug: 'apex-retail',
        owner_email: 'lead@apex.com',
        owner_full_name: 'Apex Lead',
        default_currency: 'EUR',
      },
      'usr_apex_1',
    );
    tenant2Id = t2.tenant.id;

    // Warehouse in Tenant 1
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-CENTRAL-01',
      name: 'Central Distribution Hub',
    });
    wh1Id = wh1.id;

    // Source Location (Bulk Storage)
    const locSrc = await locationsService.createLocation(tenant1Id, {
      warehouse_id: wh1Id,
      code: 'LOC-BULK-A1',
      name: 'Bulk Pallet Rack A1',
      type: 'INTERNAL_STORAGE',
      is_pickable: true,
      max_weight_kg: 5000,
      max_volume_cm3: 10000000,
      mix_policy: 'MULTI_SKU',
    });
    locSourceId = locSrc.id;

    // Destination Location (Picking Face)
    const locDst = await locationsService.createLocation(tenant1Id, {
      warehouse_id: wh1Id,
      code: 'LOC-PICK-B1',
      name: 'Picking Bin B1',
      type: 'PICKING_FACE',
      is_pickable: true,
      max_weight_kg: 1000,
      max_volume_cm3: 2000000,
      mix_policy: 'SINGLE_SKU',
    });
    locDestId = locDst.id;

    // Cross-Dock Staging Location
    const locXd = await locationsService.createLocation(tenant1Id, {
      warehouse_id: wh1Id,
      code: 'LOC-STAGING-XD1',
      name: 'Cross-Dock Staging Lane 1',
      type: 'STAGING',
      is_pickable: true,
      max_weight_kg: 20000,
      max_volume_cm3: 40000000,
      mix_policy: 'MULTI_SKU',
    });
    locCrossDockId = locXd.id;
  });

  // ==========================================================================
  // 1. GS1 Barcode Logistics Engine
  // ==========================================================================
  describe('BarcodeLogisticsService', () => {
    it('parses bracketed GS1 barcode with AI elements (01, 10, 17, 21, 3102)', async () => {
      const barcodeStr = '(01)00850006843015(10)LOT-2026-X(17)261231(21)SN987654321(3102)002540';
      const res = await barcodeService.parseBarcode(tenant1Id, {
        barcode: barcodeStr,
      });

      expect(res.parsed.raw_barcode).toBe(barcodeStr);
      expect(res.parsed.gtin).toBe('00850006843015');
      expect(res.parsed.batch_id).toBe('LOT-2026-X');
      expect(res.parsed.expiry_date).toBe('2026-12-31');
      expect(res.parsed.serial_number).toBe('SN987654321');
      expect(res.parsed.weight_grams).toBe(25400); // 25.40 kg in grams
      expect(res.parsed.elements.length).toBe(5);
    });

    it('parses FNC1 unbracketed GS1 barcode stream', async () => {
      const barcodeStr = '01008500068430151726123110BATCH77\x1D21SN112233';
      const res = await barcodeService.parseBarcode(tenant1Id, {
        barcode: barcodeStr,
      });

      expect(res.parsed.gtin).toBe('00850006843015');
      expect(res.parsed.expiry_date).toBe('2026-12-31');
      expect(res.parsed.batch_id).toBe('BATCH77');
      expect(res.parsed.serial_number).toBe('SN112233');
    });

    it('falls back to standalone GTIN-14 strings', async () => {
      const barcodeStr = '01234567890128';
      const res = await barcodeService.parseBarcode(tenant1Id, {
        barcode: barcodeStr,
      });

      expect(res.parsed.gtin).toBe('01234567890128');
      expect(res.parsed.elements.length).toBe(1);
      expect(res.parsed.elements[0]?.ai).toBe('01');
    });

    it('rejects parsing with empty or whitespace barcode', async () => {
      await expect(
        barcodeService.parseBarcode(tenant1Id, { barcode: '' }),
      ).rejects.toThrow();

      await expect(
        barcodeService.parseBarcode('', { barcode: '01234567890128' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // 2. Internal Bin Transfers Engine
  // ==========================================================================
  describe('BinTransfersService', () => {
    it('creates, transitions and completes an internal bin transfer', async () => {
      // 1. Create Transfer
      const res = await transfersService.createTransfer(tenant1Id, {
        warehouse_id: wh1Id,
        source_location_id: locSourceId,
        destination_location_id: locDestId,
        transfer_type: 'REPLENISHMENT',
        notes: 'Replenishing pick face B1 for afternoon wave',
        lines: [
          {
            variant_id: 'var_sku_101',
            sku: 'SKU-WIDGET-PRO',
            quantity: 50,
            batch_id: 'LOT-9988',
            unit_weight_kg: 2,
            unit_volume_cm3: 1000,
          },
        ],
      });

      expect(res.transfer.id).toBeDefined();
      expect(res.transfer.transfer_number).toMatch(/^TRF-\d+/);
      expect(res.transfer.status).toBe('PENDING');
      expect(res.transfer.lines.length).toBe(1);
      expect(res.transfer.lines[0]?.quantity).toBe(50);
      const transferId = res.transfer.id;

      // 2. Start Transfer (PENDING -> IN_TRANSIT)
      const inTransit = await transfersService.startTransfer(tenant1Id, transferId);
      expect(inTransit.transfer.status).toBe('IN_TRANSIT');

      // 3. Complete Transfer (IN_TRANSIT -> COMPLETED)
      const completed = await transfersService.completeTransfer(tenant1Id, transferId);
      expect(completed.transfer.status).toBe('COMPLETED');
      expect(completed.transfer.completed_at).toBeDefined();
    });

    it('cancels a pending transfer', async () => {
      const res = await transfersService.createTransfer(tenant1Id, {
        warehouse_id: wh1Id,
        source_location_id: locSourceId,
        destination_location_id: locDestId,
        transfer_type: 'INTERNAL_BIN_MOVE',
        lines: [
          {
            variant_id: 'var_sku_202',
            sku: 'SKU-RELOCATE-01',
            quantity: 10,
          },
        ],
      });

      const cancelled = await transfersService.cancelTransfer(tenant1Id, res.transfer.id);
      expect(cancelled.transfer.status).toBe('CANCELLED');

      // Cannot start a cancelled transfer
      await expect(
        transfersService.startTransfer(tenant1Id, res.transfer.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transfer when source and destination are identical', async () => {
      await expect(
        transfersService.createTransfer(tenant1Id, {
          warehouse_id: wh1Id,
          source_location_id: locSourceId,
          destination_location_id: locSourceId,
          transfer_type: 'INTERNAL_BIN_MOVE',
          lines: [
            {
              variant_id: 'var_sku_1',
              sku: 'SKU-SAME',
              quantity: 5,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transfer violating SINGLE_SKU mix policy of destination location', async () => {
      await expect(
        transfersService.createTransfer(tenant1Id, {
          warehouse_id: wh1Id,
          source_location_id: locSourceId,
          destination_location_id: locDestId, // SINGLE_SKU policy
          transfer_type: 'REPLENISHMENT',
          lines: [
            {
              variant_id: 'var_part_a',
              sku: 'SKU-PART-A',
              quantity: 10,
            },
            {
              variant_id: 'var_part_b',
              sku: 'SKU-PART-B',
              quantity: 10,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transfer exceeding destination weight capacity', async () => {
      await expect(
        transfersService.createTransfer(tenant1Id, {
          warehouse_id: wh1Id,
          source_location_id: locSourceId,
          destination_location_id: locDestId, // max_weight_kg: 1000
          transfer_type: 'REPLENISHMENT',
          lines: [
            {
              variant_id: 'var_heavy_engine',
              sku: 'SKU-ENGINE',
              quantity: 2,
              unit_weight_kg: 600, // 2 * 600 = 1200 > 1000
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces multi-tenant isolation on bin transfers', async () => {
      // Transfer created in tenant 1
      const res = await transfersService.createTransfer(tenant1Id, {
        warehouse_id: wh1Id,
        source_location_id: locSourceId,
        destination_location_id: locDestId,
        transfer_type: 'ZONE_TRANSFER',
        lines: [
          {
            variant_id: 'var_sku_iso',
            sku: 'SKU-ISO',
            quantity: 1,
          },
        ],
      });

      // Tenant 2 cannot get or list it
      await expect(
        transfersService.getTransferById(tenant2Id, res.transfer.id),
      ).rejects.toThrow(NotFoundException);

      await expect(
        transfersService.listTransfers(tenant2Id, wh1Id),
      ).rejects.toThrow(NotFoundException);

      // Tenant 1 lists it successfully
      const t1List = await transfersService.listTransfers(tenant1Id, wh1Id);
      expect(t1List.transfers.length).toBeGreaterThan(0);
      expect(t1List.transfers.some((t) => t.id === res.transfer.id)).toBe(true);
    });
  });

  // ==========================================================================
  // 3. Cross-Docking Engine
  // ==========================================================================
  describe('CrossDockService', () => {
    it('evaluates inbound candidate items against pending demands and records opportunities', async () => {
      const res = await crossDockService.evaluateOpportunities(tenant1Id, {
        warehouse_id: wh1Id,
        staging_location_id: locCrossDockId,
        inbound_receipt_id: 'rec_inbound_99',
        inbound_items: [
          {
            inbound_line_id: 'rec_line_99_1',
            variant_id: 'var_cross_1',
            sku: 'SKU-HOT-ITEM',
            quantity: 100,
          },
        ],
        pending_demands: [
          {
            order_id: 'ord_rush_1',
            order_line_id: 'ord_line_rush_1',
            variant_id: 'var_cross_1',
            sku: 'SKU-HOT-ITEM',
            quantity_demanded: 60,
            priority: 'URGENT',
          },
          {
            order_id: 'ord_norm_2',
            order_line_id: 'ord_line_norm_2',
            variant_id: 'var_cross_1',
            sku: 'SKU-HOT-ITEM',
            quantity_demanded: 50,
            priority: 'NORMAL',
          },
        ],
      });

      expect(res.opportunities.length).toBe(2);

      // First opportunity is URGENT: gets 60 items
      const op1 = res.opportunities[0]!;
      expect(op1.quantity_to_cross_dock).toBe(60);
      expect(op1.matched_order_id).toBe('ord_rush_1');
      expect(op1.status).toBe('PLANNED');

      // Second opportunity is NORMAL: remaining 40 items allocated out of 50 demanded
      const op2 = res.opportunities[1]!;
      expect(op2.quantity_to_cross_dock).toBe(40);
      expect(op2.matched_order_id).toBe('ord_norm_2');
      expect(op2.status).toBe('PLANNED');
    });

    it('executes cross-dock bypass to route directly to staging dock', async () => {
      const evalRes = await crossDockService.evaluateOpportunities(tenant1Id, {
        warehouse_id: wh1Id,
        staging_location_id: locCrossDockId,
        inbound_receipt_id: 'rec_direct_01',
        inbound_items: [
          {
            inbound_line_id: 'rec_line_direct_1',
            variant_id: 'var_bypass_sku',
            sku: 'SKU-BYPASS',
            quantity: 25,
          },
        ],
        pending_demands: [
          {
            order_id: 'ord_bypass_01',
            order_line_id: 'ord_line_bypass_1',
            variant_id: 'var_bypass_sku',
            sku: 'SKU-BYPASS',
            quantity_demanded: 25,
            priority: 'HIGH',
          },
        ],
      });

      expect(evalRes.opportunities.length).toBe(1);
      const opportunityId = evalRes.opportunities[0]!.id;

      // Execute Cross-Dock Bypass
      const bypass = await crossDockService.executeBypass(tenant1Id, {
        opportunity_id: opportunityId,
        operator_id: 'usr_ops_dock_1',
      });

      expect(bypass.opportunity.status).toBe('COMPLETED');
      expect(bypass.opportunity.completed_at).toBeDefined();

      // Retrieve single opportunity
      const retrieved = await crossDockService.getOpportunityById(tenant1Id, opportunityId);
      expect(retrieved.opportunity.id).toBe(opportunityId);
      expect(retrieved.opportunity.status).toBe('COMPLETED');
    });

    it('enforces multi-tenant isolation on cross-dock opportunities', async () => {
      const evalRes = await crossDockService.evaluateOpportunities(tenant1Id, {
        warehouse_id: wh1Id,
        staging_location_id: locCrossDockId,
        inbound_receipt_id: 'rec_t1_isolate',
        inbound_items: [
          {
            inbound_line_id: 'rec_line_iso_1',
            variant_id: 'var_iso',
            sku: 'SKU-T1-ISO',
            quantity: 10,
          },
        ],
        pending_demands: [
          {
            order_id: 'ord_t1_isolate',
            order_line_id: 'ord_line_iso_1',
            variant_id: 'var_iso',
            sku: 'SKU-T1-ISO',
            quantity_demanded: 10,
            priority: 'NORMAL',
          },
        ],
      });

      const opId = evalRes.opportunities[0]!.id;

      // Tenant 2 cannot access or execute bypass on Tenant 1's opportunity
      await expect(
        crossDockService.getOpportunityById(tenant2Id, opId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        crossDockService.executeBypass(tenant2Id, {
          opportunity_id: opId,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
