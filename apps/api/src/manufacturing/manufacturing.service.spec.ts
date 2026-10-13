import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
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

describe('Manufacturing, BOM, Work Centers & Routing Engine (Phase 5 Master)', () => {
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
  let fgVariantId: string; // Finished Good: Robotic Arm
  let subassemblyVariantId: string; // Subassembly: Motor Module
  let rawFrameVariantId: string; // Raw: Aluminum Chassis
  let rawMotorVariantId: string; // Raw: Stepper Motor
  let rawGearVariantId: string; // Raw: Precision Gear

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
        name: 'Apex Robotics Manufacturing',
        slug: 'apex-robotics',
        owner_email: 'plant-manager@apex.com',
        owner_full_name: 'Alex Vance',
        default_currency: 'USD',
      },
      'usr_plant_mgr',
    );
    tenantId = tenantRes.tenant.id;
    branchId = tenantRes.default_branch.id;

    // 2. Setup Warehouse & Storage Locations
    const wh = await warehousesService.createWarehouse(tenantId, {
      branch_id: branchId,
      code: 'PLANT-01',
      name: 'Apex Main Assembly Plant',
    });
    warehouseId = wh.id;

    const locStaging = await locationsService.createLocation(tenantId, {
      warehouse_id: warehouseId,
      code: 'BIN-STAGING',
      name: 'WIP Staging Floor',
      type: 'INTERNAL_STORAGE',
    });
    stagingLocationId = locStaging.id;

    const locFg = await locationsService.createLocation(tenantId, {
      warehouse_id: warehouseId,
      code: 'BIN-FG',
      name: 'Finished Goods Bay',
      type: 'INTERNAL_STORAGE',
    });
    fgLocationId = locFg.id;

    // 3. Setup Catalog & Products
    const uom = await uomService.createUom(tenantId, {
      name: 'Each',
      code: 'EA',
      category: 'COUNT',
      is_base_unit: true,
    });

    const createProduct = async (name: string, sku: string, costMinor: string) => {
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
        selling_price_minor: '10000',
        attributes: {},
      });
      return v.id;
    };

    fgVariantId = await createProduct('Apex 6-Axis Robotic Arm', 'ROBOT-ARM-6X', '0');
    subassemblyVariantId = await createProduct('Actuator Motor Module', 'SUB-MOTOR-MOD', '15000'); // $150.00
    rawFrameVariantId = await createProduct('Anodized Aluminum Frame', 'RAW-ALUM-FRM', '8000'); // $80.00
    rawMotorVariantId = await createProduct('Precision Stepper Motor', 'RAW-STEP-MTR', '5000'); // $50.00
    rawGearVariantId = await createProduct('Hardened Steel Planetary Gear', 'RAW-STL-GEAR', '1000'); // $10.00

    // 4. Seed Raw Material Stock for Manufacturing
    await stockLedgerService.postMovement(tenantId, 'usr_plant_mgr', {
      idempotency_key: 'seed:raw-alum-frame',
      movement_type: 'OPENING_BALANCE',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_raw_01',
      variant_id: rawFrameVariantId,
      destination_warehouse_id: warehouseId,
      destination_location_id: stagingLocationId,
      quantity: 500,
      unit_cost_minor: '8000',
    });

    await stockLedgerService.postMovement(tenantId, 'usr_plant_mgr', {
      idempotency_key: 'seed:raw-stepper-motor',
      movement_type: 'OPENING_BALANCE',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_raw_02',
      variant_id: rawMotorVariantId,
      destination_warehouse_id: warehouseId,
      destination_location_id: stagingLocationId,
      quantity: 1000,
      unit_cost_minor: '5000',
    });

    await stockLedgerService.postMovement(tenantId, 'usr_plant_mgr', {
      idempotency_key: 'seed:raw-steel-gear',
      movement_type: 'OPENING_BALANCE',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_raw_03',
      variant_id: rawGearVariantId,
      destination_warehouse_id: warehouseId,
      destination_location_id: stagingLocationId,
      quantity: 3000,
      unit_cost_minor: '1000',
    });
  });

  describe('Phase 5A: Multi-Level Bill of Materials (BOM) & Scrap Rate Engine', () => {
    it('creates a subassembly BOM and explodes a multi-level assembly correctly', async () => {
      // 1. Create Subassembly BOM (Motor Module = 1 Stepper Motor + 3 Gears)
      const subBom = await bomService.createBom(tenantId, {
        variant_id: subassemblyVariantId,
        output_quantity: 1,
        type: 'MANUFACTURE',
        revision_label: 'Rev A',
        lines: [
          {
            component_variant_id: rawMotorVariantId,
            quantity: 1,
            scrap_percentage_basis_points: 0,
          },
          {
            component_variant_id: rawGearVariantId,
            quantity: 3,
            scrap_percentage_basis_points: 500, // 5% scrap
            fixed_scrap_quantity: 1, // Fixed scrap allowance
          },
        ],
      });

      expect(subBom.bom_number).toMatch(/^BOM-\d+$/);
      expect(subBom.lines).toHaveLength(2);

      // 2. Create Top-Level Finished Good BOM (Robotic Arm = 1 Frame + 4 Motor Modules)
      const fgBom = await bomService.createBom(tenantId, {
        variant_id: fgVariantId,
        output_quantity: 1,
        type: 'MANUFACTURE',
        revision_label: 'Rev A',
        lines: [
          {
            component_variant_id: rawFrameVariantId,
            quantity: 1,
            scrap_percentage_basis_points: 200, // 2% scrap
          },
          {
            component_variant_id: subassemblyVariantId,
            quantity: 4,
            scrap_percentage_basis_points: 0,
          },
        ],
      });

      expect(fgBom.lines).toHaveLength(2);

      // 3. Explode Top-Level BOM for 10 Finished Goods
      const explosion = await bomService.explodeBom(tenantId, fgVariantId, 10);
      expect(explosion.target_variant_id).toBe(fgVariantId);
      expect(explosion.target_quantity).toBe(10);
      expect(explosion.explosion.length).toBeGreaterThanOrEqual(4);

      // Verify Level 1 Items: Aluminum Frame and Motor Module
      const frameItem = explosion.explosion.find((i) => i.variant_id === rawFrameVariantId);
      expect(frameItem).toBeDefined();
      expect(frameItem?.level).toBe(1);
      // Net 10, 2% scrap -> ceil(10 * 10200 / 10000) = 11
      expect(frameItem?.gross_quantity).toBe(11);

      const subModItem = explosion.explosion.find((i) => i.variant_id === subassemblyVariantId);
      expect(subModItem).toBeDefined();
      expect(subModItem?.level).toBe(1);
      expect(subModItem?.is_subassembly).toBe(true);
      expect(subModItem?.gross_quantity).toBe(40); // 4 * 10

      // Verify Level 2 Leaf Items under Motor Module: Stepper Motor and Gear
      const motorItem = explosion.explosion.find((i) => i.variant_id === rawMotorVariantId);
      expect(motorItem).toBeDefined();
      expect(motorItem?.level).toBe(2);
      expect(motorItem?.gross_quantity).toBe(40); // 1 motor * 40 modules

      const gearItem = explosion.explosion.find((i) => i.variant_id === rawGearVariantId);
      expect(gearItem).toBeDefined();
      expect(gearItem?.level).toBe(2);
      // 3 gears * 40 = 120 net. 5% scrap + 1 fixed = ceil(120 * 10500 / 10000) + 1 = 126 + 1 = 127
      expect(gearItem?.gross_quantity).toBe(127);
    });

    it('detects and rejects circular BOM dependencies', async () => {
      // Create BOM for Item A containing Item B
      await bomService.createBom(tenantId, {
        variant_id: fgVariantId,
        output_quantity: 1,
        lines: [
          {
            component_variant_id: subassemblyVariantId,
            quantity: 1,
          },
        ],
      });

      // Attempt to create BOM for Item B containing Item A (Cycle: A -> B -> A)
      await expect(
        bomService.createBom(tenantId, {
          variant_id: subassemblyVariantId,
          output_quantity: 1,
          lines: [
            {
              component_variant_id: fgVariantId,
              quantity: 1,
            },
          ],
        }),
      ).rejects.toThrow(/Circular dependency detected/i);
    });

    it('switches active revisions when a new revision is published', async () => {
      const revA = await bomService.createBom(tenantId, {
        variant_id: fgVariantId,
        output_quantity: 1,
        revision_label: 'Rev A',
        is_active_revision: true,
        lines: [{ component_variant_id: rawFrameVariantId, quantity: 1 }],
      });
      expect(revA.is_active_revision).toBe(true);

      const revB = await bomService.createBom(tenantId, {
        variant_id: fgVariantId,
        output_quantity: 1,
        revision_label: 'Rev B',
        is_active_revision: true,
        lines: [{ component_variant_id: rawFrameVariantId, quantity: 2 }],
      });
      expect(revB.is_active_revision).toBe(true);

      const fetchedRevA = await bomService.getBomById(tenantId, revA.id);
      expect(fetchedRevA.is_active_revision).toBe(false);
    });
  });

  describe('Phase 5B: Work Centers, Capacities & Cost Rates Engine', () => {
    it('creates work centers with capacity and hourly labor/machine/overhead rates', async () => {
      const cncCenter = await workCentersService.createWorkCenter(tenantId, {
        warehouse_id: warehouseId,
        code: 'WC-CNC-01',
        name: '5-Axis Precision CNC Milling Center',
        capacity_units_per_hour: 4,
        efficiency_basis_points: 9500, // 95% efficiency
        hourly_labor_rate_minor: '4500', // $45.00/hr
        hourly_machine_rate_minor: '6000', // $60.00/hr
        hourly_overhead_rate_minor: '2000', // $20.00/hr
      });

      expect(cncCenter.code).toBe('WC-CNC-01');
      expect(cncCenter.status).toBe('ACTIVE');
      expect(cncCenter.efficiency_basis_points).toBe(9500);
      expect(cncCenter.hourly_labor_rate_minor).toBe('4500');
      expect(cncCenter.hourly_machine_rate_minor).toBe('6000');
      expect(cncCenter.hourly_overhead_rate_minor).toBe('2000');

      const retrieved = await workCentersService.getWorkCenterById(tenantId, cncCenter.id);
      expect(retrieved.name).toBe('5-Axis Precision CNC Milling Center');
    });

    it('rejects duplicate work center code within same tenant', async () => {
      await workCentersService.createWorkCenter(tenantId, {
        warehouse_id: warehouseId,
        code: 'WC-UNIQUE',
        name: 'Center 1',
        hourly_labor_rate_minor: '3000',
        hourly_machine_rate_minor: '2000',
      });

      await expect(
        workCentersService.createWorkCenter(tenantId, {
          warehouse_id: warehouseId,
          code: 'WC-UNIQUE',
          name: 'Center 2',
          hourly_labor_rate_minor: '3000',
          hourly_machine_rate_minor: '2000',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Phase 5C: Routing, Operations & Time Standards Engine', () => {
    it('creates a routing with sequenced operations and time standards', async () => {
      const wcMachining = await workCentersService.createWorkCenter(tenantId, {
        warehouse_id: warehouseId,
        code: 'WC-MACH',
        name: 'Machining Station',
        hourly_labor_rate_minor: '5000',
        hourly_machine_rate_minor: '7000',
        hourly_overhead_rate_minor: '1500',
      });

      const wcAssembly = await workCentersService.createWorkCenter(tenantId, {
        warehouse_id: warehouseId,
        code: 'WC-ASSY',
        name: 'Cleanroom Robotic Assembly Bay',
        hourly_labor_rate_minor: '4000',
        hourly_machine_rate_minor: '1000',
        hourly_overhead_rate_minor: '1000',
      });

      const routing = await routingsService.createRouting(tenantId, {
        name: 'Robotic Arm Main Production Flow',
        variant_id: fgVariantId,
        operations: [
          {
            operation_number: 10,
            name: 'Chassis Milling & Drilling',
            work_center_id: wcMachining.id,
            setup_time_minutes: 30,
            run_time_minutes_per_unit: 15,
            teardown_time_minutes: 10,
          },
          {
            operation_number: 20,
            name: 'Wiring & Motor Integration',
            work_center_id: wcAssembly.id,
            setup_time_minutes: 10,
            run_time_minutes_per_unit: 45,
            teardown_time_minutes: 5,
          },
        ],
      });

      expect(routing.routing_number).toMatch(/^ROUT-\d+$/);
      expect(routing.operations).toHaveLength(2);
      expect(routing.operations![0]!.operation_number).toBe(10);
      expect(routing.operations![1]!.operation_number).toBe(20);
    });

    it('rejects routing creation if work center does not exist', async () => {
      await expect(
        routingsService.createRouting(tenantId, {
          name: 'Invalid Routing',
          operations: [
            {
              operation_number: 10,
              name: 'Invalid Op',
              work_center_id: 'non-existent-wc-id',
              run_time_minutes_per_unit: 10,
            },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Phase 5D & 5E: MO Lifecycle, Component Backflushing & Yield Engine', () => {
    it('executes full end-to-end manufacturing flow: Draft -> Confirm -> In Progress -> Work Orders -> Yield Yield', async () => {
      // 1. Setup BOM & Routing & Work Center
      const wc = await workCentersService.createWorkCenter(tenantId, {
        warehouse_id: warehouseId,
        code: 'WC-SHOP-FLOOR',
        name: 'Main Assembly Floor',
        efficiency_basis_points: 10000, // 100%
        hourly_labor_rate_minor: '6000', // $60/hr -> $1/min (100 minor/min)
        hourly_machine_rate_minor: '3000', // $30/hr -> $0.50/min (50 minor/min)
        hourly_overhead_rate_minor: '1200', // $12/hr -> $0.20/min (20 minor/min)
      });

      const bom = await bomService.createBom(tenantId, {
        variant_id: fgVariantId,
        output_quantity: 1,
        lines: [
          {
            component_variant_id: rawFrameVariantId,
            quantity: 1,
            scrap_percentage_basis_points: 0,
          },
          {
            component_variant_id: rawMotorVariantId,
            quantity: 2,
            scrap_percentage_basis_points: 0,
          },
        ],
      });

      const routing = await routingsService.createRouting(tenantId, {
        name: 'Quick Assembly Flow',
        variant_id: fgVariantId,
        operations: [
          {
            operation_number: 10,
            name: 'Frame Prep & Motor Mount',
            work_center_id: wc.id,
            run_time_minutes_per_unit: 30, // 30 mins
          },
        ],
      });

      // 2. Create Manufacturing Order for 5 Units
      const mo = await moService.createOrder(tenantId, {
        variant_id: fgVariantId,
        bom_id: bom.id,
        routing_id: routing.id,
        warehouse_id: warehouseId,
        destination_location_id: fgLocationId,
        target_quantity: 5,
        lot_number: 'LOT-ARM-2026-001',
      });

      expect(mo.status).toBe('DRAFT');
      expect(mo.target_quantity).toBe(5);
      expect(mo.components).toHaveLength(2);

      // Components check: 5 frames, 10 motors
      const compFrame = mo.components!.find((c) => c.variant_id === rawFrameVariantId);
      const compMotor = mo.components!.find((c) => c.variant_id === rawMotorVariantId);
      expect(compFrame?.required_quantity).toBe(5);
      expect(compMotor?.required_quantity).toBe(10);
      expect(mo.work_orders).toHaveLength(1);

      // 3. Confirm MO (Soft-reserves components against ATP)
      const confirmedMo = await moService.confirmOrder(tenantId, mo.id);
      expect(confirmedMo.status).toBe('CONFIRMED');

      // Verify ATP was decreased by reservation:
      const frameBalance = await stockLedgerService.getBalance(tenantId, warehouseId, rawFrameVariantId);
      // Originally 500 on-hand, 5 reserved -> 495 ATP
      expect(frameBalance.on_hand_quantity).toBe(500);
      expect(frameBalance.reserved_quantity).toBe(5);
      expect(frameBalance.available_to_promise).toBe(495);

      // 4. Start MO (IN_PROGRESS)
      const inProgressMo = await moService.startOrder(tenantId, mo.id);
      expect(inProgressMo.status).toBe('IN_PROGRESS');
      expect(inProgressMo.actual_start_date).toBeDefined();

      // 5. Execute Work Order with backflushing
      const woId = inProgressMo.work_orders![0]!.id;
      const afterWoMo = await moService.recordWorkOrderExecution(tenantId, mo.id, {
        work_order_id: woId,
        actual_duration_minutes: 120, // 2 hours
        backflush_components: true,
      });

      const executedWo = afterWoMo.work_orders!.find((w) => w.id === woId);
      expect(executedWo?.status).toBe('COMPLETED');
      expect(executedWo?.actual_duration_minutes).toBe(120);

      // Cost calculations:
      // Labor: 120 mins * (6000 / 60) = 120 * 100 = 12,000 minor ($120.00)
      // Machine: 120 mins * (3000 / 60) = 120 * 50 = 6,000 minor ($60.00)
      // Overhead: 120 mins * (1200 / 60) = 120 * 20 = 2,400 minor ($24.00)
      // Total WC conversion = 20,400 minor ($204.00)
      expect(executedWo?.labor_cost_minor).toBe('12000');
      expect(executedWo?.machine_cost_minor).toBe('6000');
      expect(executedWo?.overhead_cost_minor).toBe('2400');
      expect(executedWo?.total_operation_cost_minor).toBe('20400');

      // MO aggregated costs:
      expect(afterWoMo.total_labor_cost_minor).toBe('12000');
      expect(afterWoMo.total_overhead_cost_minor).toBe('8400'); // Machine (6000) + Overhead (2400)

      // Components consumed check:
      const updatedCompFrame = afterWoMo.components!.find((c) => c.variant_id === rawFrameVariantId);
      expect(updatedCompFrame?.consumed_quantity).toBe(5);
      // Material cost: 5 frames * 8000 + 10 motors * 5000 = 40,000 + 50,000 = 90,000 minor ($900.00)
      expect(afterWoMo.total_material_cost_minor).toBe('90000');

      // 6. Complete Manufacturing Order (Yields 5 Finished Goods)
      const completedMo = await moService.completeOrder(tenantId, mo.id, {
        produced_quantity: 5,
        scrapped_quantity: 0,
        lot_number: 'LOT-ARM-2026-001',
      });

      expect(completedMo.status).toBe('COMPLETED');
      expect(completedMo.produced_quantity).toBe(5);

      // Total Production Cost = Material (90,000) + Labor (12,000) + Overhead (8,400) = 110,400 minor ($1,104.00)
      // Unit Production Cost = 110,400 / 5 = 22,080 minor ($220.80)
      expect(completedMo.total_production_cost_minor).toBe('110400');
      expect(completedMo.unit_production_cost_minor).toBe('22080');

      // Verify Finished Goods received in destination location via Stock Ledger:
      const fgBalance = await stockLedgerService.getBalance(tenantId, warehouseId, fgVariantId);
      expect(fgBalance.on_hand_quantity).toBe(5);
      expect(fgBalance.available_to_promise).toBe(5);

      // Verify Batch/Lot was recorded:
      const batches = await batchesService.getBatches(tenantId, fgVariantId);
      expect(batches.some((b) => b.batch_number === 'LOT-ARM-2026-001')).toBe(true);

      // 7. Close MO
      const closedMo = await moService.closeOrder(tenantId, mo.id);
      expect(closedMo.status).toBe('CLOSED');
    });

    it('enforces status transition FSM rules and handles cancellation with reservation release', async () => {
      const bom = await bomService.createBom(tenantId, {
        variant_id: fgVariantId,
        output_quantity: 1,
        lines: [{ component_variant_id: rawFrameVariantId, quantity: 2 }],
      });

      const mo = await moService.createOrder(tenantId, {
        variant_id: fgVariantId,
        bom_id: bom.id,
        warehouse_id: warehouseId,
        destination_location_id: fgLocationId,
        target_quantity: 4,
      });

      // Cannot start before confirm:
      await expect(moService.startOrder(tenantId, mo.id)).rejects.toThrow(
        /Invalid Manufacturing Order transition/i,
      );

      // Confirm MO reserves 8 frames (4 * 2)
      await moService.confirmOrder(tenantId, mo.id);
      const balAfterConfirm = await stockLedgerService.getBalance(tenantId, warehouseId, rawFrameVariantId);
      expect(balAfterConfirm.reserved_quantity).toBe(8);

      // Cancel MO:
      const cancelledMo = await moService.cancelOrder(tenantId, mo.id);
      expect(cancelledMo.status).toBe('CANCELLED');

      // Reserved quantity should be released:
      const balAfterCancel = await stockLedgerService.getBalance(tenantId, warehouseId, rawFrameVariantId);
      expect(balAfterCancel.reserved_quantity).toBe(0);
    });

    it('guarantees tenant isolation for manufacturing orders', async () => {
      const tenantResB = await tenancyService.provisionTenant(
        {
          name: 'Rival Industrial',
          slug: 'rival-ind',
          owner_email: 'owner@rival.com',
          owner_full_name: 'Bob Rival',
          default_currency: 'USD',
        },
        'usr_rival',
      );
      const tenantBId = tenantResB.tenant.id;

      const bom = await bomService.createBom(tenantId, {
        variant_id: fgVariantId,
        output_quantity: 1,
        lines: [{ component_variant_id: rawFrameVariantId, quantity: 1 }],
      });

      const mo = await moService.createOrder(tenantId, {
        variant_id: fgVariantId,
        bom_id: bom.id,
        warehouse_id: warehouseId,
        destination_location_id: fgLocationId,
        target_quantity: 1,
      });

      // Tenant B cannot access Tenant A's MO
      await expect(moService.getOrderById(tenantBId, mo.id)).rejects.toThrow(NotFoundException);
      const tenantBList = await moService.listOrders(tenantBId);
      expect(tenantBList).toHaveLength(0);
    });
  });
});
