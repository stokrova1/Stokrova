import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { RmaService } from './rma.service.js';
import { QualityInspectionService } from './quality-inspection.service.js';
import { DispositionService } from './disposition.service.js';
import { ReturnsController } from './returns.controller.js';

describe('Returns, RMA, Quality Inspection & Restocking Engine (Phase 7)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let rmaService: RmaService;
  let qcService: QualityInspectionService;
  let dispositionService: DispositionService;
  let controller: ReturnsController;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;
  let wh1Id: string;
  let receivingLocId: string;
  let primaryRestockLocId: string;
  let quarantineLocId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);
    rmaService = new RmaService(warehousesService, locationsService);
    qcService = new QualityInspectionService(rmaService, locationsService);
    dispositionService = new DispositionService(rmaService, locationsService);
    controller = new ReturnsController(rmaService, qcService, dispositionService);

    // Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Omni Retail Europe',
        slug: 'omni-europe',
        owner_email: 'ops@omni-europe.com',
        owner_full_name: 'Omni Director',
        default_currency: 'EUR',
      },
      'usr_omni_dir_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Vanguard Global',
        slug: 'vanguard-global',
        owner_email: 'admin@vanguard.com',
        owner_full_name: 'Vanguard Admin',
        default_currency: 'USD',
      },
      'usr_van_1',
    );
    tenant2Id = t2.tenant.id;

    // Warehouse in Tenant 1
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-RETURNS-HUB',
      name: 'Central Returns & Logistics Hub',
    });
    wh1Id = wh1.id;

    // Receiving Dock Location
    const recLoc = await locationsService.createLocation(tenant1Id, {
      warehouse_id: wh1Id,
      code: 'LOC-DOCK-REV1',
      name: 'Reverse Receiving Dock 1',
      type: 'RECEIVING',
      is_pickable: false,
    });
    receivingLocId = recLoc.id;

    // Primary Pick Face Location for Restocking
    const restockLoc = await locationsService.createLocation(tenant1Id, {
      warehouse_id: wh1Id,
      code: 'LOC-PICK-A10',
      name: 'Main Pick Face A10',
      type: 'PICKING_FACE',
      is_pickable: true,
      max_weight_kg: 500,
    });
    primaryRestockLocId = restockLoc.id;

    // Quarantine Location
    const quarLoc = await locationsService.createLocation(tenant1Id, {
      warehouse_id: wh1Id,
      code: 'LOC-QUAR-HOLD',
      name: 'Quarantine Hold Area',
      type: 'INTERNAL_STORAGE',
      is_pickable: false,
    });
    quarantineLocId = quarLoc.id;
  });

  // ==========================================================================
  // Sub-Phase 7A: RMA Lifecycle & Inbound Reverse Receiving
  // ==========================================================================
  describe('Sub-Phase 7A: RMA Lifecycle & Inbound Receiving', () => {
    it('creates, requests, approves, receives, and retrieves an RMA', async () => {
      // 1. Create RMA in DRAFT
      const created = await rmaService.createRma(tenant1Id, {
        warehouse_id: wh1Id,
        type: 'CUSTOMER_RETURN',
        customer_name: 'Alice Johnson',
        customer_email: 'alice@example.com',
        original_order_id: 'ord_so_8899',
        original_order_number: 'SO-8899',
        resolution_preference: 'REFUND',
        restocking_fee_bp: 1500, // 15%
        return_tracking_number: '1Z9999999999999999',
        carrier_code: 'UPS',
        lines: [
          {
            order_id: 'ord_so_8899',
            order_line_id: 'ord_line_1',
            variant_id: 'var_boot_42',
            sku: 'SKU-BOOT-42',
            item_name: 'Trekker Boot 42',
            quantity_authorized: 2,
            unit_price_cents: 10000, // 100 EUR each
            currency: 'EUR',
            reason_code: 'BUYER_REMORSE',
          },
        ],
      });

      expect(created.rma.id).toBeDefined();
      expect(created.rma.rma_number).toMatch(/^RMA-\d+-\d+/);
      expect(created.rma.status).toBe('DRAFT');
      expect(created.rma.lines.length).toBe(1);
      const rmaId = created.rma.id;
      const lineId = created.rma.lines[0]!.id;

      // 2. Request RMA (DRAFT -> REQUESTED)
      const requested = await rmaService.requestRma(tenant1Id, rmaId);
      expect(requested.rma.status).toBe('REQUESTED');

      // 3. Approve RMA (REQUESTED -> APPROVED)
      const approved = await rmaService.approveRma(tenant1Id, rmaId, {
        approved_by: 'usr_ops_lead_1',
        notes: 'Return authorized within 30-day window',
      });
      expect(approved.rma.status).toBe('APPROVED');
      expect(approved.rma.approved_by).toBe('usr_ops_lead_1');
      expect(approved.rma.approved_at).toBeDefined();

      // 4. Partial Inbound Receipt (Receive 1 of 2 -> PARTIALLY_RECEIVED)
      const partial = await rmaService.receiveRma(tenant1Id, rmaId, {
        receiving_location_id: receivingLocId,
        lines: [
          {
            line_id: lineId,
            quantity_received: 1,
            batch_id: 'LOT-REV-01',
          },
        ],
      });
      expect(partial.rma.status).toBe('PARTIALLY_RECEIVED');
      expect(partial.rma.lines[0]?.quantity_received).toBe(1);

      // 5. Complete Inbound Receipt (Receive remaining 1 of 2 -> RECEIVED)
      const full = await rmaService.receiveRma(tenant1Id, rmaId, {
        receiving_location_id: receivingLocId,
        lines: [
          {
            line_id: lineId,
            quantity_received: 1,
          },
        ],
      });
      expect(full.rma.status).toBe('RECEIVED');
      expect(full.rma.lines[0]?.quantity_received).toBe(2);
      expect(full.rma.received_at).toBeDefined();
    });

    it('handles RMA rejection flow', async () => {
      const created = await rmaService.createRma(tenant1Id, {
        warehouse_id: wh1Id,
        type: 'CUSTOMER_RETURN',
        lines: [
          {
            variant_id: 'var_item_1',
            sku: 'SKU-OLD',
            item_name: 'Old Item',
            quantity_authorized: 1,
            unit_price_cents: 5000,
            currency: 'EUR',
            reason_code: 'OTHER',
          },
        ],
      });

      await rmaService.requestRma(tenant1Id, created.rma.id);

      const rejected = await rmaService.rejectRma(tenant1Id, created.rma.id, {
        rejection_reason: 'Item purchased over 1 year ago, out of warranty',
        rejected_by: 'usr_mgr_1',
      });
      expect(rejected.rma.status).toBe('REJECTED');
      expect(rejected.rma.rejection_reason).toBe(
        'Item purchased over 1 year ago, out of warranty',
      );
    });

    it('enforces multi-tenant isolation on RMAs', async () => {
      const created = await rmaService.createRma(tenant1Id, {
        warehouse_id: wh1Id,
        type: 'CUSTOMER_RETURN',
        lines: [
          {
            variant_id: 'var_iso',
            sku: 'SKU-ISO',
            item_name: 'Isolated Item',
            quantity_authorized: 1,
            unit_price_cents: 2000,
            currency: 'EUR',
            reason_code: 'DEFECTIVE',
          },
        ],
      });

      // Tenant 2 cannot access Tenant 1's RMA
      await expect(
        rmaService.getRmaById(tenant2Id, created.rma.id),
      ).rejects.toThrow(NotFoundException);

      await expect(
        rmaService.listRmas(tenant2Id, wh1Id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Sub-Phase 7B: Quality Inspection & Quarantine Management
  // ==========================================================================
  describe('Sub-Phase 7B: Quality Inspection & Quarantine', () => {
    it('performs quality inspection on received return lines', async () => {
      // 1. Setup received RMA
      const rmaRes = await rmaService.createRma(tenant1Id, {
        warehouse_id: wh1Id,
        type: 'CUSTOMER_RETURN',
        lines: [
          {
            variant_id: 'var_headset_1',
            sku: 'SKU-HEADSET-PRO',
            item_name: 'Pro Audio Headset',
            quantity_authorized: 1,
            unit_price_cents: 15000,
            currency: 'EUR',
            reason_code: 'DEFECTIVE',
          },
        ],
      });
      const rmaId = rmaRes.rma.id;
      const lineId = rmaRes.rma.lines[0]!.id;

      await rmaService.approveRma(tenant1Id, rmaId, { approved_by: 'usr_1' });
      await rmaService.receiveRma(tenant1Id, rmaId, {
        receiving_location_id: receivingLocId,
        lines: [{ line_id: lineId, quantity_received: 1 }],
      });

      // 2. Perform QC Inspection
      const qcRes = await qcService.performInspection(tenant1Id, {
        rma_id: rmaId,
        return_line_id: lineId,
        quantity_inspected: 1,
        condition_grade: 'GRADE_B_OPEN_BOX',
        status: 'PASSED',
        inspector_id: 'usr_qc_tech_1',
        quarantine_location_id: quarantineLocId,
        inspection_notes: 'Tested working audio channels, minor box tear',
      });

      expect(qcRes.inspection.id).toBeDefined();
      expect(qcRes.inspection.condition_grade).toBe('GRADE_B_OPEN_BOX');
      expect(qcRes.inspection.status).toBe('PASSED');
      expect(qcRes.inspection.inspected_at).toBeDefined();

      // 3. List inspections for RMA
      const list = await qcService.listInspectionsByRma(tenant1Id, rmaId);
      expect(list.inspections.length).toBe(1);
      expect(list.inspections[0]?.id).toBe(qcRes.inspection.id);
    });

    it('rejects QC inspection before goods are received', async () => {
      const rmaRes = await rmaService.createRma(tenant1Id, {
        warehouse_id: wh1Id,
        type: 'CUSTOMER_RETURN',
        lines: [
          {
            variant_id: 'var_1',
            sku: 'SKU-1',
            item_name: 'Item 1',
            quantity_authorized: 1,
            unit_price_cents: 5000,
            currency: 'EUR',
            reason_code: 'BUYER_REMORSE',
          },
        ],
      });

      await expect(
        qcService.performInspection(tenant1Id, {
          rma_id: rmaRes.rma.id,
          return_line_id: rmaRes.rma.lines[0]!.id,
          quantity_inspected: 1,
          condition_grade: 'GRADE_A_NEW',
          status: 'PASSED',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Sub-Phase 7C: Restocking, Disposition & Financial Settlement
  // ==========================================================================
  describe('Sub-Phase 7C: Restocking & Disposition Settlement', () => {
    it('executes restocking disposition and completes RMA with integer refund calculation', async () => {
      // 1. Setup received RMA
      const rmaRes = await rmaService.createRma(tenant1Id, {
        warehouse_id: wh1Id,
        type: 'CUSTOMER_RETURN',
        lines: [
          {
            variant_id: 'var_jacket_xl',
            sku: 'SKU-JACKET-XL',
            item_name: 'Winter Parka XL',
            quantity_authorized: 2,
            unit_price_cents: 20000, // 200.00 EUR each -> total 400.00 EUR
            currency: 'EUR',
            reason_code: 'BUYER_REMORSE',
          },
        ],
      });
      const rmaId = rmaRes.rma.id;
      const lineId = rmaRes.rma.lines[0]!.id;

      await rmaService.approveRma(tenant1Id, rmaId, { approved_by: 'usr_1' });
      await rmaService.receiveRma(tenant1Id, rmaId, {
        receiving_location_id: receivingLocId,
        lines: [{ line_id: lineId, quantity_received: 2 }],
      });

      // 2. Execute Disposition with 15% restocking fee (1500 bp)
      // Gross: 20000 * 2 = 40000 cents (400.00 EUR)
      // Restocking fee (15%): (40000 * 1500 + 5000) / 10000 = 6000 cents (60.00 EUR)
      // Net Refund: 40000 - 6000 = 34000 cents (340.00 EUR)
      const dispRes = await dispositionService.executeDisposition(tenant1Id, {
        rma_id: rmaId,
        variant_id: 'var_jacket_xl',
        sku: 'SKU-JACKET-XL',
        quantity: 2,
        action_type: 'RESTOCK_TO_PRIMARY',
        destination_location_id: primaryRestockLocId,
        gross_unit_price_cents: 20000,
        restocking_fee_bp: 1500,
        currency: 'EUR',
        operator_id: 'usr_disposition_ops_1',
        notes: 'Restocked to primary pick face A10',
      });

      expect(dispRes.disposition.status).toBe('EXECUTED');
      expect(dispRes.disposition.gross_refund_cents).toBe(40000);
      expect(dispRes.disposition.restocking_fee_cents).toBe(6000);
      expect(dispRes.disposition.net_refund_cents).toBe(34000);
      expect(dispRes.disposition.destination_location_code).toBe('LOC-PICK-A10');

      // 3. RMA should automatically transition to COMPLETED
      const completedRma = await rmaService.getRmaById(tenant1Id, rmaId);
      expect(completedRma.rma.status).toBe('COMPLETED');
      expect(completedRma.rma.completed_at).toBeDefined();

      // 4. List dispositions for RMA
      const list = await dispositionService.listDispositionsByRma(tenant1Id, rmaId);
      expect(list.dispositions.length).toBe(1);
      expect(list.dispositions[0]?.id).toBe(dispRes.disposition.id);
    });
  });

  // ==========================================================================
  // ReturnsController Endpoints
  // ==========================================================================
  describe('ReturnsController Endpoints', () => {
    it('creates and lists RMAs through the controller', async () => {
      const res = await controller.createRma(tenant1Id, {
        warehouse_id: wh1Id,
        type: 'CUSTOMER_RETURN',
        lines: [
          {
            variant_id: 'var_ctrl_1',
            sku: 'SKU-CTRL-1',
            item_name: 'Controller Test SKU',
            quantity_authorized: 1,
            unit_price_cents: 2500,
            currency: 'EUR',
            reason_code: 'NOT_AS_DESCRIBED',
          },
        ],
      });

      expect(res.rma.id).toBeDefined();
      const list = await controller.listRmas(tenant1Id, wh1Id);
      expect(list.rmas.length).toBeGreaterThan(0);
      expect(list.rmas.some((r) => r.id === res.rma.id)).toBe(true);

      const single = await controller.getRmaById(tenant1Id, res.rma.id);
      expect(single.rma.id).toBe(res.rma.id);
    });
  });
});
