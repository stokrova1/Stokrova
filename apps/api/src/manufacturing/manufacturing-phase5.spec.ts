import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
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
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { StockReservationsService } from '../inventory/stock-reservations.service.js';

import { BomService } from './bom.service.js';
import { MfgWorkCentersService } from './mfg-work-centers.service.js';
import { RoutingsService } from './routings.service.js';
import { ManufacturingOrdersService } from './manufacturing-orders.service.js';

describe('Phase 5 Master Integration Engine — Manufacturing Scenarios A through I', () => {
  let tenancyService: TenancyService;
  let uomService: UomService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;
  let templatesService: TemplatesService;
  let variantsService: VariantsService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let batchesService: BatchesService;
  let serialsService: SerialsService;
  let stockLedgerService: StockLedgerService;
  let stockReservationsService: StockReservationsService;

  let bomService: BomService;
  let workCentersService: MfgWorkCentersService;
  let routingsService: RoutingsService;
  let moService: ManufacturingOrdersService;

  let tenantId: string;
  let branchId: string;
  let warehouseId: string;
  let stagingLocationId: string;
  let fgLocationId: string;

  // Variants
  let fgGripperVariantId: string; // Finished Good: Precision Robotic Gripper
  let rawPlateVariantId: string; // Raw: Aluminum Alloy Plate
  let rawCoilVariantId: string; // Raw: High-Torque Copper Coil
  let rawBushingVariantId: string; // Raw: Bronze Bushing

  beforeEach(async () => {
    tenancyService = new TenancyService();
    uomService = new UomService();
    categoriesService = new CategoriesService();
    brandsService = new BrandsService();
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

    bomService = new BomService(variantsService);
    workCentersService = new MfgWorkCentersService(warehousesService);
    routingsService = new RoutingsService(workCentersService);
    moService = new ManufacturingOrdersService(
      bomService,
      workCentersService,
      routingsService,
      stockLedgerService,
      stockReservationsService,
      batchesService,
      variantsService,
      warehousesService,
      locationsService,
    );

    // 1. Provision Tenant & Branch
    const tenantRes = await tenancyService.provisionTenant(
      {
        name: 'OmniMfg Industrial Dynamics',
        slug: 'omnimfg-ind',
        owner_email: 'vp-ops@omnimfg.com',
        owner_full_name: 'Elena Rostova',
        default_currency: 'USD',
      },
      'usr_mfg_owner',
    );
    tenantId = tenantRes.tenant.id;
    branchId = tenantRes.default_branch.id;

    // 2. Setup Warehouse & Storage Locations
    const wh = await warehousesService.createWarehouse(tenantId, {
      branch_id: branchId,
      code: 'PLANT-NORTH',
      name: 'North Heavy Industrial Complex',
    });
    warehouseId = wh.id;

    const locStaging = await locationsService.createLocation(tenantId, {
      warehouse_id: warehouseId,
      code: 'LOC-STAGING',
      name: 'Material Staging & WIP Buffer',
      type: 'INTERNAL_STORAGE',
    });
    stagingLocationId = locStaging.id;

    const locFg = await locationsService.createLocation(tenantId, {
      warehouse_id: warehouseId,
      code: 'LOC-FG-BAY',
      name: 'Finished Goods Dispatch Bay',
      type: 'INTERNAL_STORAGE',
    });
    fgLocationId = locFg.id;

    // 3. Catalog Products
    const uom = await uomService.createUom(tenantId, {
      name: 'Unit',
      code: 'UNT',
      category: 'COUNT',
      is_base_unit: true,
    });

    const createVariant = async (name: string, sku: string, costMinor: string) => {
      const tmpl = await templatesService.createTemplate(tenantId, {
        name,
        code: `TMPL-${sku}`,
        type: 'STANDARD',
        base_uom_id: uom.id,
      });
      const v = await variantsService.createVariant(tenantId, {
        template_id: tmpl.id,
        sku,
        cost_price_minor: costMinor,
        selling_price_minor: '25000',
        attributes: {},
      });
      return v.id;
    };

    fgGripperVariantId = await createVariant('Omni Precision Gripper Gen-3', 'FG-GRIP-G3', '0');
    rawPlateVariantId = await createVariant('Aero-grade Aluminum Plate', 'RAW-ALUM-PLT', '6000'); // $60.00
    rawCoilVariantId = await createVariant('Shielded Copper Magnetic Coil', 'RAW-CU-COIL', '4000'); // $40.00
    rawBushingVariantId = await createVariant('Self-lubricating Bronze Bushing', 'RAW-BRZ-BSH', '1500'); // $15.00
    await createVariant('Subassembly Linear Actuator', 'SUB-ACTUATOR-01', '12000'); // $120.00

    // 4. Seed Initial Raw Material Stock via Stock Ledger
    await stockLedgerService.postMovement(tenantId, 'usr_mfg_owner', {
      idempotency_key: 'seed:raw-alum-plt',
      movement_type: 'OPENING_BALANCE',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_raw_plate',
      variant_id: rawPlateVariantId,
      destination_warehouse_id: warehouseId,
      destination_location_id: stagingLocationId,
      quantity: 100,
      unit_cost_minor: '6000',
    });

    await stockLedgerService.postMovement(tenantId, 'usr_mfg_owner', {
      idempotency_key: 'seed:raw-cu-coil',
      movement_type: 'OPENING_BALANCE',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_raw_coil',
      variant_id: rawCoilVariantId,
      destination_warehouse_id: warehouseId,
      destination_location_id: stagingLocationId,
      quantity: 200,
      unit_cost_minor: '4000',
    });

    await stockLedgerService.postMovement(tenantId, 'usr_mfg_owner', {
      idempotency_key: 'seed:raw-brz-bsh',
      movement_type: 'OPENING_BALANCE',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_raw_bushing',
      variant_id: rawBushingVariantId,
      destination_warehouse_id: warehouseId,
      destination_location_id: stagingLocationId,
      quantity: 500,
      unit_cost_minor: '1500',
    });
  });

  // =========================================================================
  // Scenario A — Standard Assembly End-to-End
  // =========================================================================
  it('Scenario A: Standard assembly end-to-end execution and receipt', async () => {
    // 1. Setup Work Center & Routing
    const wcCnc = await workCentersService.createWorkCenter(tenantId, {
      warehouse_id: warehouseId,
      code: 'WC-CNC-01',
      name: 'High-Speed CNC Milling Bay',
      efficiency_basis_points: 10000, // 100%
      hourly_labor_rate_minor: '6000', // $60/hr -> $1/min
      hourly_machine_rate_minor: '3000', // $30/hr -> $0.50/min
      hourly_overhead_rate_minor: '1200', // $12/hr -> $0.20/min
    });

    const routing = await routingsService.createRouting(tenantId, {
      name: 'Gripper Main Assembly Line',
      variant_id: fgGripperVariantId,
      operations: [
        {
          operation_number: 10,
          name: 'Chassis Milling & Drilling',
          work_center_id: wcCnc.id,
          run_time_minutes_per_unit: 12,
        },
      ],
    });

    // 2. Setup BOM (1 Gripper = 2 Plates + 2 Coils + 4 Bushings)
    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [
        { component_variant_id: rawPlateVariantId, quantity: 2, scrap_percentage_basis_points: 0 },
        { component_variant_id: rawCoilVariantId, quantity: 2, scrap_percentage_basis_points: 0 },
        { component_variant_id: rawBushingVariantId, quantity: 4, scrap_percentage_basis_points: 0 },
      ],
    });

    // 3. Create Production Order for 5 Grippers
    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      routing_id: routing.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 5,
      lot_number: 'LOT-GRIPPER-2026-A',
    });

    expect(order.status).toBe('DRAFT');
    expect(order.target_quantity).toBe(5);
    // Required components: 10 plates, 10 coils, 20 bushings
    expect(order.components?.find((c) => c.variant_id === rawPlateVariantId)?.required_quantity).toBe(10);
    expect(order.components?.find((c) => c.variant_id === rawCoilVariantId)?.required_quantity).toBe(10);
    expect(order.components?.find((c) => c.variant_id === rawBushingVariantId)?.required_quantity).toBe(20);

    // 4. Confirm Order (Soft-reserves components)
    await moService.confirmOrder(tenantId, order.id);
    const plateBal = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(plateBal.on_hand_quantity).toBe(100);
    expect(plateBal.reserved_quantity).toBe(10);
    expect(plateBal.available_to_promise).toBe(90);

    // 5. Start Order
    await moService.startOrder(tenantId, order.id);

    // 6. Execute Work Order with backflushing
    const woId = order.work_orders![0]!.id;
    const afterWo = await moService.recordWorkOrderExecution(tenantId, order.id, {
      work_order_id: woId,
      actual_duration_minutes: 60, // 1 hour
      backflush_components: true,
      operator_user_id: 'usr_tech_alpha',
    });

    // Labor: 60 * 100 = 6000 minor ($60.00)
    // Overhead: 60 * (50 + 20) = 4200 minor ($42.00)
    // Material: 10*6000 + 10*4000 + 20*1500 = 60,000 + 40,000 + 30,000 = 130,000 minor ($1,300.00)
    expect(afterWo.total_labor_cost_minor).toBe('6000');
    expect(afterWo.total_overhead_cost_minor).toBe('4200');
    expect(afterWo.total_material_cost_minor).toBe('130000');

    // 7. Complete Order (Yields 5 Finished Goods)
    const completed = await moService.completeOrder(tenantId, order.id, {
      produced_quantity: 5,
      lot_number: 'LOT-GRIPPER-2026-A',
    });

    expect(completed.status).toBe('COMPLETED');
    expect(completed.produced_quantity).toBe(5);
    // Total production cost = 130,000 + 6000 + 4200 = 140,200 minor ($1,402.00)
    // Unit production cost = 140,200 / 5 = 28,040 minor ($280.40)
    expect(completed.total_production_cost_minor).toBe('140200');
    expect(completed.unit_production_cost_minor).toBe('28040');

    // 8. Verify Authoritative Stock Invariant
    const fgBal = await stockLedgerService.getBalance(tenantId, warehouseId, fgGripperVariantId);
    expect(fgBal.on_hand_quantity).toBe(5);
    expect(fgBal.available_to_promise).toBe(5);

    // Component stock properly depleted
    const updatedPlateBal = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(updatedPlateBal.on_hand_quantity).toBe(90);
    expect(updatedPlateBal.reserved_quantity).toBe(0); // Reservation fulfilled
    expect(updatedPlateBal.available_to_promise).toBe(90);
  });

  // =========================================================================
  // Scenario B — Material Shortage Reporting
  // =========================================================================
  it('Scenario B: Deterministic material shortage reporting preventing unauthorized release', async () => {
    // BOM requiring 50 plates per unit
    const heavyBom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 50 }],
    });

    // Request order for 10 units (requires 500 plates, but only 100 plates in stock)
    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: heavyBom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 10,
    });

    // Check shortage report
    const shortageReport = await moService.checkMaterialShortages(tenantId, order.id);
    expect(shortageReport.has_shortages).toBe(true);
    expect(shortageReport.items).toHaveLength(1);

    const plateShortage = shortageReport.items[0]!;
    expect(plateShortage.variant_id).toBe(rawPlateVariantId);
    expect(plateShortage.required_quantity).toBe(500);
    expect(plateShortage.available_to_promise).toBe(100);
    expect(plateShortage.shortage_quantity).toBe(400);
    expect(plateShortage.is_shortage).toBe(true);

    // Attempting to confirm order must be rejected with ConflictException
    await expect(moService.confirmOrder(tenantId, order.id)).rejects.toThrow(ConflictException);

    // State remains DRAFT; no fictitious stock or negative reservation
    const refetched = await moService.getOrderById(tenantId, order.id);
    expect(refetched.status).toBe('DRAFT');
  });

  // =========================================================================
  // Scenario C — Competing Production Orders for Final Component
  // =========================================================================
  it('Scenario C: Concurrency protection when competing orders target scarce inventory', async () => {
    // Current plate stock is 100.
    // Create BOM requiring 60 plates per unit
    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 60 }],
    });

    const order1 = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 1, // Requires 60 plates
    });

    const order2 = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 1, // Requires 60 plates
    });

    // Order 1 confirms first: commits 60 plates (ATP drops from 100 to 40)
    await moService.confirmOrder(tenantId, order1.id);
    const balAfterOrder1 = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balAfterOrder1.on_hand_quantity).toBe(100);
    expect(balAfterOrder1.reserved_quantity).toBe(60);
    expect(balAfterOrder1.available_to_promise).toBe(40);

    // Order 2 attempts to confirm: needs 60, but only 40 ATP available -> rejected!
    await expect(moService.confirmOrder(tenantId, order2.id)).rejects.toThrow(ConflictException);

    // Order 1 is cancelled: reservation is safely released, ATP restored to 100
    await moService.cancelOrder(tenantId, order1.id);
    const balAfterCancel = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balAfterCancel.reserved_quantity).toBe(0);
    expect(balAfterCancel.available_to_promise).toBe(100);

    // Now Order 2 confirms successfully!
    await expect(moService.confirmOrder(tenantId, order2.id)).resolves.toBeDefined();
    const balAfterOrder2 = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balAfterOrder2.reserved_quantity).toBe(60);
    expect(balAfterOrder2.available_to_promise).toBe(40);
  });

  // =========================================================================
  // Scenario D — Partial Production Runs and Remaining Balances
  // =========================================================================
  it('Scenario D: Tracks multi-stage partial production runs and outstanding balances', async () => {
    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 1 }],
    });

    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 100,
    });

    await moService.confirmOrder(tenantId, order.id);
    await moService.startOrder(tenantId, order.id);

    // Run 1: 35 good, 2 scrap -> produced: 35, remaining: 65
    const resRun1 = await moService.recordExecutionRun(tenantId, order.id, {
      good_quantity: 35,
      scrapped_quantity: 2,
      notes: 'Shift 1 Morning batch',
    });
    expect(resRun1.run.run_number).toBe(1);
    expect(resRun1.order.produced_quantity).toBe(35);
    expect(resRun1.order.scrapped_quantity).toBe(2);

    // Run 2: 40 good, 1 scrap -> produced: 75, remaining: 25
    const resRun2 = await moService.recordExecutionRun(tenantId, order.id, {
      good_quantity: 40,
      scrapped_quantity: 1,
      notes: 'Shift 2 Afternoon batch',
    });
    expect(resRun2.run.run_number).toBe(2);
    expect(resRun2.order.produced_quantity).toBe(75);
    expect(resRun2.order.scrapped_quantity).toBe(3);

    // Run 3: 25 good, 0 scrap -> produced: 100 (fully produced)
    const resRun3 = await moService.recordExecutionRun(tenantId, order.id, {
      good_quantity: 25,
      scrapped_quantity: 0,
      notes: 'Shift 3 Final batch',
    });
    expect(resRun3.run.run_number).toBe(3);
    expect(resRun3.order.produced_quantity).toBe(100);
    expect(resRun3.order.scrapped_quantity).toBe(3);

    // Verify execution run history
    const runs = await moService.listExecutionRuns(tenantId, order.id);
    expect(runs).toHaveLength(3);
    expect(runs[0]!.good_quantity).toBe(35);
    expect(runs[1]!.good_quantity).toBe(40);
    expect(runs[2]!.good_quantity).toBe(25);
  });

  // =========================================================================
  // Scenario E — Production Scrap & Process Loss Without Double-Depletion
  // =========================================================================
  it('Scenario E: Differentiates process loss from physical scrap without double stock depletion', async () => {
    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 1 }],
    });

    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 20,
    });

    await moService.confirmOrder(tenantId, order.id);
    await moService.startOrder(tenantId, order.id);

    // 1. Consume 10 plates via component issue (reduces plate stock from 100 to 90)
    const compId = order.components![0]!.id;
    await moService.issueComponents(tenantId, order.id, {
      consumptions: [{ component_id: compId, quantity: 10 }],
    });

    const balAfterIssue = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balAfterIssue.on_hand_quantity).toBe(90);

    // 2. Report Process Loss of 2 plates (already consumed during machining)
    // Rule: is_process_loss = true must NOT deduct stock again!
    const scrap1 = await moService.recordScrap(tenantId, order.id, {
      variant_id: rawPlateVariantId,
      quantity: 2,
      reason_code: 'PROCESS_LOSS',
      is_process_loss: true,
      notes: 'Machining chip waste',
    });

    expect(scrap1.is_process_loss).toBe(true);
    expect(scrap1.stock_movement_id).toBeNull();

    // Stock balance remains at 90 (no double-depletion)
    const balAfterProcessLoss = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balAfterProcessLoss.on_hand_quantity).toBe(90);

    // 3. Report Physical Damaged Raw Stock of 3 plates (dropped before loading)
    // Rule: is_process_loss = false must post authoritative scrap movement!
    const scrap2 = await moService.recordScrap(tenantId, order.id, {
      variant_id: rawPlateVariantId,
      quantity: 3,
      reason_code: 'DEFECT',
      is_process_loss: false,
      notes: 'Dropped raw sheet bent out of spec',
    });

    expect(scrap2.is_process_loss).toBe(false);
    expect(scrap2.stock_movement_id).toBeDefined();

    // Stock balance correctly reduced by 3 (from 90 to 87)
    const balAfterPhysicalScrap = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balAfterPhysicalScrap.on_hand_quantity).toBe(87);

    // Order aggregate scrap reflects 2 + 3 = 5
    const updatedOrder = await moService.getOrderById(tenantId, order.id);
    expect(updatedOrder.scrapped_quantity).toBe(5);
  });

  // =========================================================================
  // Scenario F — Duplicate Material Consumption Idempotency
  // =========================================================================
  it('Scenario F: Guarantees material consumption idempotency upon duplicate submissions', async () => {
    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 1 }],
    });

    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 10,
    });

    await moService.confirmOrder(tenantId, order.id);
    await moService.startOrder(tenantId, order.id);

    const compId = order.components![0]!.id;
    const idempKey = 'retry-client-consume-uuid-999';

    // Submit consumption of 5 units
    await moService.issueComponents(
      tenantId,
      order.id,
      { consumptions: [{ component_id: compId, quantity: 5 }] },
      idempKey,
    );

    const balFirst = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balFirst.on_hand_quantity).toBe(95);

    // Resubmit identical request with same idempotency key
    await moService.issueComponents(
      tenantId,
      order.id,
      { consumptions: [{ component_id: compId, quantity: 5 }] },
      idempKey,
    );

    // Balance remains exactly 95 (no duplicate deduction)
    const balSecond = await stockLedgerService.getBalance(tenantId, warehouseId, rawPlateVariantId);
    expect(balSecond.on_hand_quantity).toBe(95);
  });

  // =========================================================================
  // Scenario G — Output Inspection Failure & Quarantine Isolation
  // =========================================================================
  it('Scenario G: Isolates quarantined and rejected outputs from ordinary available stock', async () => {
    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 1 }],
    });

    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 10,
    });

    await moService.confirmOrder(tenantId, order.id);
    await moService.startOrder(tenantId, order.id);

    // Execute run producing 10 units
    await moService.recordExecutionRun(tenantId, order.id, {
      good_quantity: 10,
      notes: 'Full run awaiting QC',
    });

    // Inspection: 6 Accepted, 3 Quarantined, 1 Rejected
    const insp = await moService.recordOutputInspection(tenantId, order.id, {
      inspected_quantity: 10,
      accepted_quantity: 6,
      quarantined_quantity: 3,
      rejected_quantity: 1,
      failure_reason: '1 unit motor seized; 3 units require calibration verification',
      inspector_user_id: 'usr_qc_lead',
    });

    expect(insp.status).toBe('QUARANTINED');
    expect(insp.accepted_quantity).toBe(6);
    expect(insp.quarantined_quantity).toBe(3);
    expect(insp.rejected_quantity).toBe(1);

    // Invariant: ONLY the 6 accepted units enter available finished goods inventory!
    const fgBal = await stockLedgerService.getBalance(tenantId, warehouseId, fgGripperVariantId);
    expect(fgBal.on_hand_quantity).toBe(6);
    expect(fgBal.available_to_promise).toBe(6);

    // 100% rejection test: 0 accepted, 5 rejected
    const failedInsp = await moService.recordOutputInspection(tenantId, order.id, {
      inspected_quantity: 5,
      accepted_quantity: 0,
      rejected_quantity: 5,
      failure_reason: 'Complete structural crack',
    });
    expect(failedInsp.status).toBe('REJECTED');

    // Balance does NOT increase at all
    const fgBalAfterReject = await stockLedgerService.getBalance(tenantId, warehouseId, fgGripperVariantId);
    expect(fgBalAfterReject.on_hand_quantity).toBe(6);
  });

  // =========================================================================
  // Scenario H — Forward and Backward Batch Recall Genealogy
  // =========================================================================
  it('Scenario H: Traces backward from finished lot to component and forward from component to finished lots', async () => {
    // 1. Seed raw material with specific batch
    const rawBatch = await batchesService.createBatch(tenantId, {
      variant_id: rawPlateVariantId,
      batch_number: 'BATCH-ALUM-LOT-999',
    });

    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 2 }],
    });

    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 2,
      lot_number: 'LOT-FG-RECALL-TEST',
    });

    await moService.confirmOrder(tenantId, order.id);
    await moService.startOrder(tenantId, order.id);

    // Record consumption trace with batch linkage
    moService.recordConsumptionTrace(tenantId, {
      orderId: order.id,
      moNumber: order.mo_number,
      variantId: rawPlateVariantId,
      batchId: rawBatch.id,
      lotNumber: rawBatch.batch_number,
      quantity: 4,
      consumedAt: new Date().toISOString(),
    });

    await moService.completeOrder(tenantId, order.id, {
      produced_quantity: 2,
      lot_number: 'LOT-FG-RECALL-TEST',
    });

    // 2. Backward Trace: from Finished Lot to raw components
    const backwardRes = await moService.getGenealogy(tenantId, 'FINISHED_LOT', 'LOT-FG-RECALL-TEST');
    expect(backwardRes.backward_trace).toHaveLength(1);
    const traceBack = backwardRes.backward_trace[0]!;
    expect(traceBack.finished_variant_id).toBe(fgGripperVariantId);
    expect(traceBack.production_order_number).toBe(order.mo_number);
    expect(traceBack.component_variant_id).toBe(rawPlateVariantId);
    expect(traceBack.component_batch_id).toBe(rawBatch.id);

    // 3. Forward Trace: from Component Batch to finished goods
    const forwardRes = await moService.getGenealogy(tenantId, 'COMPONENT_BATCH', rawBatch.id);
    expect(forwardRes.forward_trace).toHaveLength(1);
    const traceFwd = forwardRes.forward_trace[0]!;
    expect(traceFwd.source_batch_id).toBe(rawBatch.id);
    expect(traceFwd.production_order_number).toBe(order.mo_number);
    expect(traceFwd.produced_lot_number).toBe('LOT-FG-RECALL-TEST');
    expect(traceFwd.quantity_produced).toBe(2);
  });

  // =========================================================================
  // Scenario I — Sales Integration (Manufactured Goods Sold Through Commerce)
  // =========================================================================
  it('Scenario I: Manufactured goods seamlessly sold through Phase 3 Commerce ledger without silos', async () => {
    // 1. Manufacture 8 Finished Grippers
    const bom = await bomService.createBom(tenantId, {
      variant_id: fgGripperVariantId,
      output_quantity: 1,
      lines: [{ component_variant_id: rawPlateVariantId, quantity: 1 }],
    });

    const order = await moService.createOrder(tenantId, {
      variant_id: fgGripperVariantId,
      bom_id: bom.id,
      warehouse_id: warehouseId,
      destination_location_id: fgLocationId,
      target_quantity: 8,
      lot_number: 'LOT-SALEABLE-01',
    });

    await moService.confirmOrder(tenantId, order.id);
    await moService.startOrder(tenantId, order.id);
    await moService.completeOrder(tenantId, order.id, {
      produced_quantity: 8,
      lot_number: 'LOT-SALEABLE-01',
    });

    // Verify initial manufactured stock in destination location
    const initialBal = await stockLedgerService.getBalance(tenantId, warehouseId, fgGripperVariantId);
    expect(initialBal.on_hand_quantity).toBe(8);
    expect(initialBal.available_to_promise).toBe(8);

    // 2. Sell 3 units through Phase 3 Commerce (SALE_ISSUE movement)
    await stockLedgerService.postMovement(tenantId, 'usr_pos_cashier', {
      idempotency_key: 'pos:checkout:order-sale-01',
      movement_type: 'SALE_ISSUE',
      reference_type: 'SALES_ORDER',
      reference_id: 'ord_sales_998',
      variant_id: fgGripperVariantId,
      source_warehouse_id: warehouseId,
      source_location_id: fgLocationId,
      quantity: 3,
      unit_cost_minor: '25000',
      notes: 'Customer POS sale of manufactured robotic gripper',
    });

    // 3. Verify Ledger Truth
    const postSaleBal = await stockLedgerService.getBalance(tenantId, warehouseId, fgGripperVariantId);
    expect(postSaleBal.on_hand_quantity).toBe(5); // 8 produced - 3 sold = 5
    expect(postSaleBal.available_to_promise).toBe(5);

    // Proves Current Stock = Sum(Posted Inventory Movements)
    const ledgerEntries = await stockLedgerService.getLedgerEntries(tenantId, {
      variant_id: fgGripperVariantId,
    });
    // Receipts: +8 (MANUFACTURING_RECEIPT), Issues: -3 (SALE_ISSUE)
    expect(ledgerEntries.some((e) => e.movement_type === 'MANUFACTURING_RECEIPT')).toBe(true);
    expect(ledgerEntries.some((e) => e.movement_type === 'SALE_ISSUE')).toBe(true);
  });
});
