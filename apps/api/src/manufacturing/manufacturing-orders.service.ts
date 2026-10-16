import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  ManufacturingOrder,
  MoComponent,
  MoWorkOrder,
  MoExecutionRun,
  MoOutputInspection,
  MoScrapRecord,
  MoComponentSubstitution,
  CreateManufacturingOrderRequest,
  RecordWorkOrderExecutionRequest,
  IssueMoComponentsRequest,
  CompleteManufacturingOrderRequest,
  RecordExecutionRunRequest,
  RecordOutputInspectionRequest,
  RecordScrapRequest,
  SubstituteComponentRequest,
  MaterialShortageReportResponse,
  BatchRecallTraceabilityResponse,
  ForwardTraceabilityItem,
  BackwardTraceabilityItem,
} from '@stokrova/contracts';
import {
  assertValidMoStatusTransition,
  calculateComponentGrossRequirement,
  calculateOperationDurationAndCosts,
  calculateFinishedGoodsUnitCost,
  assertValidOutputClassification,
  evaluateComponentShortage,
  calculatePartialProductionYield,
  assertValidComponentSubstitution,
  generateUuidV7,
} from '@stokrova/domain';
import { BomService } from './bom.service.js';
import { MfgWorkCentersService } from './mfg-work-centers.service.js';
import { RoutingsService } from './routings.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { StockReservationsService } from '../inventory/stock-reservations.service.js';
import { BatchesService } from '../tracking/batches.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';

interface ConsumptionTrace {
  orderId: string;
  moNumber: string;
  variantId: string;
  batchId: string | null;
  lotNumber: string | null;
  quantity: number;
  consumedAt: string;
}

@Injectable()
export class ManufacturingOrdersService {
  private ordersStore = new DurableMap<ManufacturingOrder>('manufacturing_orders');
  private orderReservationsStore = new Map<string, string[]>();
  private runsStore = new Map<string, MoExecutionRun[]>();
  private inspectionsStore = new Map<string, MoOutputInspection[]>();
  private scrapStore = new Map<string, MoScrapRecord[]>();
  private substitutionsStore = new Map<string, MoComponentSubstitution[]>();
  private consumptionTracesStore = new Map<string, ConsumptionTrace[]>();
  private processedOperationsStore = new Set<string>();

  private moCounter = 4000;
  private inspCounter = 5000;
  private scrapCounter = 6000;

  constructor(
    private readonly bomService: BomService,
    private readonly workCentersService: MfgWorkCentersService,
    private readonly routingsService: RoutingsService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly stockReservationsService: StockReservationsService,
    private readonly batchesService: BatchesService,
    private readonly variantsService: VariantsService,
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {}

  async createOrder(
    tenantId: string,
    request: CreateManufacturingOrderRequest,
  ): Promise<ManufacturingOrder> {
    const finishedGood = await this.variantsService.getVariantById(tenantId, request.variant_id);
    const bom = await this.bomService.getBomById(tenantId, request.bom_id);
    await this.warehousesService.getWarehouseById(tenantId, request.warehouse_id);
    await this.locationsService.getLocationById(tenantId, request.destination_location_id);

    const routingId = request.routing_id ?? bom.routing_id;
    let routing = null;
    if (routingId) {
      routing = await this.routingsService.getRoutingById(tenantId, routingId);
    }

    const moId = generateUuidV7();
    this.moCounter += 1;
    const moNumber = `MO-${this.moCounter}`;
    const now = new Date().toISOString();

    // Populate required components with gross scrap calculation
    const outputRatio = request.target_quantity / (bom.output_quantity > 0 ? bom.output_quantity : 1);
    const createdComponents: MoComponent[] = [];

    if (bom.lines) {
      for (const line of bom.lines) {
        const compVariant = await this.variantsService.getVariantById(tenantId, line.component_variant_id);
        const netQty = line.quantity * outputRatio;
        const grossReq = calculateComponentGrossRequirement(
          netQty,
          line.scrap_percentage_basis_points,
          line.fixed_scrap_quantity,
        );

        const compUnitCost = BigInt(compVariant.cost_price_minor);
        const compTotalCost = compUnitCost * BigInt(grossReq.grossQuantity);

        createdComponents.push({
          id: generateUuidV7(),
          tenant_id: tenantId,
          manufacturing_order_id: moId,
          variant_id: line.component_variant_id,
          required_quantity: grossReq.grossQuantity,
          consumed_quantity: 0,
          unit_cost_minor: compUnitCost.toString(),
          total_cost_minor: compTotalCost.toString(),
          is_backflushed: true,
          location_id: request.destination_location_id,
          created_at: now,
          updated_at: now,
        });
      }
    }

    // Populate work orders from routing
    const createdWorkOrders: MoWorkOrder[] = [];
    if (routing?.operations) {
      for (const op of routing.operations) {
        createdWorkOrders.push({
          id: generateUuidV7(),
          tenant_id: tenantId,
          manufacturing_order_id: moId,
          operation_id: op.id,
          work_center_id: op.work_center_id,
          operation_number: op.operation_number,
          name: op.name,
          status: 'PENDING',
          actual_duration_minutes: 0,
          labor_cost_minor: '0',
          machine_cost_minor: '0',
          overhead_cost_minor: '0',
          total_operation_cost_minor: '0',
          operator_user_id: null,
          completed_at: null,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const order: ManufacturingOrder = {
      id: moId,
      tenant_id: tenantId,
      mo_number: moNumber,
      variant_id: finishedGood.id,
      bom_id: bom.id,
      routing_id: routingId ?? null,
      warehouse_id: request.warehouse_id,
      destination_location_id: request.destination_location_id,
      target_quantity: request.target_quantity,
      produced_quantity: 0,
      scrapped_quantity: 0,
      status: 'DRAFT',
      priority: request.priority ?? 'NORMAL',
      lot_number: request.lot_number ?? null,
      scheduled_start_date: request.scheduled_start_date ?? null,
      scheduled_completion_date: request.scheduled_completion_date ?? null,
      actual_start_date: null,
      actual_completion_date: null,
      total_material_cost_minor: '0',
      total_labor_cost_minor: '0',
      total_overhead_cost_minor: '0',
      total_production_cost_minor: '0',
      unit_production_cost_minor: '0',
      notes: request.notes ?? null,
      created_by: null,
      created_at: now,
      updated_at: now,
      components: createdComponents,
      work_orders: createdWorkOrders,
    };

    this.ordersStore.set(`${tenantId}:${moId}`, order);
    return order;
  }

  async getOrderById(tenantId: string, id: string): Promise<ManufacturingOrder> {
    const order = this.ordersStore.get(`${tenantId}:${id}`);
    if (!order) {
      throw new NotFoundException(`Manufacturing order '${id}' not found for tenant '${tenantId}'.`);
    }
    return order;
  }

  async listOrders(tenantId: string): Promise<ManufacturingOrder[]> {
    const orders: ManufacturingOrder[] = [];
    for (const [key, o] of this.ordersStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        orders.push(o);
      }
    }
    return orders;
  }

  async checkMaterialShortages(
    tenantId: string,
    id: string,
  ): Promise<MaterialShortageReportResponse> {
    const order = await this.getOrderById(tenantId, id);
    const items = [];
    let hasShortages = false;

    if (order.components) {
      for (const comp of order.components) {
        const variant = await this.variantsService.getVariantById(tenantId, comp.variant_id);
        const bal = await this.stockLedgerService.getBalance(tenantId, order.warehouse_id, comp.variant_id);
        const shortageEval = evaluateComponentShortage({
          variantId: comp.variant_id,
          requiredQuantity: comp.required_quantity,
          onHandQuantity: bal.on_hand_quantity,
          reservedQuantity: bal.reserved_quantity,
        });

        if (shortageEval.isShortage) {
          hasShortages = true;
        }

        items.push({
          variant_id: comp.variant_id,
          sku: variant.sku,
          name: variant.sku,
          required_quantity: shortageEval.requiredQuantity,
          on_hand_quantity: shortageEval.onHandQuantity,
          reserved_quantity: shortageEval.reservedQuantity,
          available_to_promise: shortageEval.availableToPromise,
          shortage_quantity: shortageEval.shortageQuantity,
          is_shortage: shortageEval.isShortage,
        });
      }
    }

    return {
      order_id: order.id,
      mo_number: order.mo_number,
      warehouse_id: order.warehouse_id,
      has_shortages: hasShortages,
      items,
    };
  }

  async confirmOrder(tenantId: string, id: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(tenantId, id);
    assertValidMoStatusTransition(order.status, 'CONFIRMED');

    // Concurrency protection & availability check before committing
    if (order.components) {
      for (const comp of order.components) {
        const bal = await this.stockLedgerService.getBalance(tenantId, order.warehouse_id, comp.variant_id);
        if (bal.available_to_promise < comp.required_quantity) {
          throw new ConflictException(
            `Cannot confirm order '${order.mo_number}': Insufficient ATP for component '${comp.variant_id}'. Required ${comp.required_quantity}, Available ${bal.available_to_promise}.`,
          );
        }
      }

      // Soft-reserve required components via stock reservations
      const resIds: string[] = [];
      for (const comp of order.components) {
        const res = await this.stockReservationsService.createReservation(tenantId, {
          reference_id: order.id,
          warehouse_id: order.warehouse_id,
          variant_id: comp.variant_id,
          quantity: comp.required_quantity,
          reference_type: 'MANUFACTURING_ORDER',
          ttl_seconds: 86400 * 7,
        });
        resIds.push(res.id);
      }
      this.orderReservationsStore.set(`${tenantId}:${id}`, resIds);
    }

    order.status = 'CONFIRMED';
    order.updated_at = new Date().toISOString();
    return order;
  }

  async startOrder(tenantId: string, id: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(tenantId, id);
    assertValidMoStatusTransition(order.status, 'IN_PROGRESS');

    const now = new Date().toISOString();
    order.status = 'IN_PROGRESS';
    order.actual_start_date = now;
    order.updated_at = now;
    return order;
  }

  async recordWorkOrderExecution(
    tenantId: string,
    moId: string,
    request: RecordWorkOrderExecutionRequest,
  ): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(tenantId, moId);
    const wo = order.work_orders?.find((w) => w.id === request.work_order_id);
    if (!wo) {
      throw new NotFoundException(`Work order '${request.work_order_id}' not found in MO '${moId}'.`);
    }

    const workCenter = await this.workCentersService.getWorkCenterById(tenantId, wo.work_center_id);

    const costCalc = calculateOperationDurationAndCosts({
      setupTimeMinutes: 0,
      runTimeMinutesPerUnit: request.actual_duration_minutes,
      teardownTimeMinutes: 0,
      unitsToProduce: 1,
      efficiencyBasisPoints: workCenter.efficiency_basis_points,
      hourlyLaborRateMinor: BigInt(workCenter.hourly_labor_rate_minor),
      hourlyMachineRateMinor: BigInt(workCenter.hourly_machine_rate_minor),
      hourlyOverheadRateMinor: BigInt(workCenter.hourly_overhead_rate_minor),
    });

    const now = new Date().toISOString();
    wo.status = 'COMPLETED';
    wo.actual_duration_minutes = request.actual_duration_minutes;
    wo.labor_cost_minor = costCalc.laborCostMinor.toString();
    wo.machine_cost_minor = costCalc.machineCostMinor.toString();
    wo.overhead_cost_minor = costCalc.overheadCostMinor.toString();
    wo.total_operation_cost_minor = costCalc.totalOperationCostMinor.toString();
    wo.operator_user_id = request.operator_user_id ?? null;
    wo.completed_at = now;
    wo.updated_at = now;

    // Accumulate labor and overhead in MO
    const currentLabor = BigInt(order.total_labor_cost_minor);
    const currentOverhead = BigInt(order.total_overhead_cost_minor);
    order.total_labor_cost_minor = (currentLabor + costCalc.laborCostMinor).toString();
    order.total_overhead_cost_minor = (currentOverhead + costCalc.machineCostMinor + costCalc.overheadCostMinor).toString();

    // Auto-backflush components if requested
    if (request.backflush_components !== false && order.components) {
      for (const comp of order.components) {
        if (comp.consumed_quantity < comp.required_quantity) {
          const deltaQty = comp.required_quantity - comp.consumed_quantity;
          comp.consumed_quantity = comp.required_quantity;
          const materialAddition = BigInt(comp.unit_cost_minor) * BigInt(deltaQty);
          order.total_material_cost_minor = (BigInt(order.total_material_cost_minor) + materialAddition).toString();
          comp.updated_at = now;

          // Record consumption movement idempotently
          const idempKey = `mo:${order.id}:wo:${wo.id}:consume:${comp.id}:${deltaQty}`;
          if (!this.processedOperationsStore.has(idempKey)) {
            this.processedOperationsStore.add(idempKey);
            await this.stockLedgerService.postMovement(tenantId, request.operator_user_id || 'usr_mfg_system', {
              idempotency_key: idempKey,
              movement_type: 'MANUFACTURING_CONSUMPTION',
              reference_type: 'MANUFACTURING_ORDER',
              reference_id: order.id,
              variant_id: comp.variant_id,
              source_warehouse_id: order.warehouse_id,
              source_location_id: comp.location_id ?? null,
              quantity: deltaQty,
              unit_cost_minor: comp.unit_cost_minor,
              notes: `Auto-backflush for MO ${order.mo_number} WO ${wo.name}`,
            });

            // Traceability recording
            this.recordConsumptionTrace(tenantId, {
              orderId: order.id,
              moNumber: order.mo_number,
              variantId: comp.variant_id,
              batchId: null,
              lotNumber: null,
              quantity: deltaQty,
              consumedAt: now,
            });
          }
        }
      }
    }

    order.updated_at = now;
    return order;
  }

  async issueComponents(
    tenantId: string,
    moId: string,
    request: IssueMoComponentsRequest,
    idempotencyKey?: string,
  ): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(tenantId, moId);

    // Idempotency guard for entire request
    if (idempotencyKey && this.processedOperationsStore.has(idempotencyKey)) {
      return order;
    }
    if (idempotencyKey) {
      this.processedOperationsStore.add(idempotencyKey);
    }

    const now = new Date().toISOString();
    for (const item of request.consumptions) {
      const comp = order.components?.find((c) => c.id === item.component_id);
      if (!comp) {
        throw new NotFoundException(`Component '${item.component_id}' not found in MO '${moId}'.`);
      }

      comp.consumed_quantity += item.quantity;
      const unitCost = item.unit_cost_minor ? BigInt(item.unit_cost_minor) : BigInt(comp.unit_cost_minor);
      const addition = unitCost * BigInt(item.quantity);
      order.total_material_cost_minor = (BigInt(order.total_material_cost_minor) + addition).toString();
      comp.updated_at = now;

      const lineIdemp = idempotencyKey
        ? `${idempotencyKey}:${comp.id}`
        : `mo:${order.id}:issue:${comp.id}:${item.quantity}:${now}`;

      await this.stockLedgerService.postMovement(tenantId, 'usr_mfg_system', {
        idempotency_key: lineIdemp,
        movement_type: 'MANUFACTURING_CONSUMPTION',
        reference_type: 'MANUFACTURING_ORDER',
        reference_id: order.id,
        variant_id: comp.variant_id,
        source_warehouse_id: order.warehouse_id,
        source_location_id: comp.location_id ?? null,
        quantity: item.quantity,
        unit_cost_minor: unitCost.toString(),
        notes: `Component issue for MO ${order.mo_number}`,
      });

      this.recordConsumptionTrace(tenantId, {
        orderId: order.id,
        moNumber: order.mo_number,
        variantId: comp.variant_id,
        batchId: null,
        lotNumber: null,
        quantity: item.quantity,
        consumedAt: now,
      });
    }

    order.updated_at = now;
    return order;
  }

  async recordExecutionRun(
    tenantId: string,
    moId: string,
    request: RecordExecutionRunRequest,
  ): Promise<{ order: ManufacturingOrder; run: MoExecutionRun }> {
    const order = await this.getOrderById(tenantId, moId);
    if (order.status !== 'IN_PROGRESS' && order.status !== 'CONFIRMED') {
      throw new BadRequestException(`Cannot record execution run for order with status '${order.status}'.`);
    }

    const existingRuns = this.runsStore.get(`${tenantId}:${moId}`) || [];
    const runNumber = existingRuns.length + 1;

    const yieldResult = calculatePartialProductionYield({
      plannedQuantity: order.target_quantity,
      previouslyProducedQuantity: order.produced_quantity,
      previouslyScrappedQuantity: order.scrapped_quantity,
      runGoodQuantity: request.good_quantity,
      runScrappedQuantity: request.scrapped_quantity ?? 0,
    });

    const now = new Date().toISOString();
    const run: MoExecutionRun = {
      id: generateUuidV7(),
      tenant_id: tenantId,
      manufacturing_order_id: moId,
      run_number: runNumber,
      good_quantity: request.good_quantity,
      scrapped_quantity: request.scrapped_quantity ?? 0,
      notes: request.notes ?? null,
      operator_user_id: request.operator_user_id ?? null,
      completed_at: now,
      created_at: now,
    };

    existingRuns.push(run);
    this.runsStore.set(`${tenantId}:${moId}`, existingRuns);

    order.produced_quantity = yieldResult.totalGoodQuantity;
    order.scrapped_quantity = yieldResult.totalScrappedQuantity;
    order.updated_at = now;

    return { order, run };
  }

  async listExecutionRuns(tenantId: string, moId: string): Promise<MoExecutionRun[]> {
    await this.getOrderById(tenantId, moId);
    return this.runsStore.get(`${tenantId}:${moId}`) || [];
  }

  async recordOutputInspection(
    tenantId: string,
    moId: string,
    request: RecordOutputInspectionRequest,
  ): Promise<MoOutputInspection> {
    const order = await this.getOrderById(tenantId, moId);

    assertValidOutputClassification({
      inspectedQuantity: request.inspected_quantity,
      acceptedQuantity: request.accepted_quantity,
      quarantinedQuantity: request.quarantined_quantity ?? 0,
      rejectedQuantity: request.rejected_quantity ?? 0,
    });

    this.inspCounter += 1;
    const inspNumber = `INSP-${this.inspCounter}`;
    const now = new Date().toISOString();

    let status: 'PENDING' | 'ACCEPTED' | 'QUARANTINED' | 'REJECTED' = 'ACCEPTED';
    if (request.rejected_quantity && request.rejected_quantity > 0 && request.accepted_quantity === 0) {
      status = 'REJECTED';
    } else if (request.quarantined_quantity && request.quarantined_quantity > 0) {
      status = 'QUARANTINED';
    }

    const inspection: MoOutputInspection = {
      id: generateUuidV7(),
      tenant_id: tenantId,
      manufacturing_order_id: moId,
      run_id: request.run_id ?? null,
      inspection_number: inspNumber,
      status,
      inspected_quantity: request.inspected_quantity,
      accepted_quantity: request.accepted_quantity,
      quarantined_quantity: request.quarantined_quantity ?? 0,
      rejected_quantity: request.rejected_quantity ?? 0,
      failure_reason: request.failure_reason ?? null,
      notes: request.notes ?? null,
      inspector_user_id: request.inspector_user_id ?? null,
      inspected_at: now,
      created_at: now,
    };

    const existingInspections = this.inspectionsStore.get(`${tenantId}:${moId}`) || [];
    existingInspections.push(inspection);
    this.inspectionsStore.set(`${tenantId}:${moId}`, existingInspections);

    // If items are accepted, post authoritative finished goods receipt
    if (request.accepted_quantity > 0) {
      const costResult = calculateFinishedGoodsUnitCost({
        materialCostMinor: BigInt(order.total_material_cost_minor),
        laborCostMinor: BigInt(order.total_labor_cost_minor),
        machineCostMinor: 0n,
        overheadCostMinor: BigInt(order.total_overhead_cost_minor),
        producedQuantity: order.produced_quantity > 0 ? order.produced_quantity : request.accepted_quantity,
      });

      await this.stockLedgerService.postMovement(tenantId, request.inspector_user_id || 'usr_mfg_qc', {
        idempotency_key: `mo:${order.id}:insp:${inspection.id}:accept:${request.accepted_quantity}`,
        movement_type: 'MANUFACTURING_RECEIPT',
        reference_type: 'MANUFACTURING_ORDER',
        reference_id: order.id,
        variant_id: order.variant_id,
        destination_warehouse_id: order.warehouse_id,
        destination_location_id: order.destination_location_id,
        quantity: request.accepted_quantity,
        unit_cost_minor: costResult.unitProductionCostMinor.toString(),
        notes: `QC Accepted inspection ${inspNumber} for MO ${order.mo_number}`,
      });
    }

    return inspection;
  }

  async listOutputInspections(tenantId: string, moId: string): Promise<MoOutputInspection[]> {
    await this.getOrderById(tenantId, moId);
    return this.inspectionsStore.get(`${tenantId}:${moId}`) || [];
  }

  async recordScrap(
    tenantId: string,
    moId: string,
    request: RecordScrapRequest,
  ): Promise<MoScrapRecord> {
    const order = await this.getOrderById(tenantId, moId);
    await this.variantsService.getVariantById(tenantId, request.variant_id);

    this.scrapCounter += 1;
    const scrapNumber = `SCRAP-${this.scrapCounter}`;
    const now = new Date().toISOString();
    let movementId: string | null = null;

    // Rule 10 & Scenario E: If process loss (already consumed), do NOT double-deplete stock.
    // If not process loss (physical stock still on hand), deduct stock via ledger.
    if (!request.is_process_loss) {
      const mvRes = await this.stockLedgerService.postMovement(
        tenantId,
        request.operator_user_id || 'usr_mfg_scrap',
        {
          idempotency_key: `mo:${order.id}:scrap:${scrapNumber}:${request.quantity}`,
          movement_type: 'MANUFACTURING_SCRAP',
          reference_type: 'MANUFACTURING_ORDER',
          reference_id: order.id,
          variant_id: request.variant_id,
          source_warehouse_id: order.warehouse_id,
          source_location_id: order.destination_location_id,
          quantity: request.quantity,
          unit_cost_minor: '0',
          notes: `Manufacturing Scrap ${scrapNumber} (${request.reason_code ?? 'DEFECT'})`,
        },
      );
      movementId = mvRes.entry.id;
    }

    const scrapRecord: MoScrapRecord = {
      id: generateUuidV7(),
      tenant_id: tenantId,
      manufacturing_order_id: moId,
      scrap_number: scrapNumber,
      variant_id: request.variant_id,
      quantity: request.quantity,
      reason_code: request.reason_code ?? 'DEFECT',
      is_process_loss: request.is_process_loss ?? false,
      stock_movement_id: movementId,
      notes: request.notes ?? null,
      operator_user_id: request.operator_user_id ?? null,
      created_at: now,
    };

    const existingScrap = this.scrapStore.get(`${tenantId}:${moId}`) || [];
    existingScrap.push(scrapRecord);
    this.scrapStore.set(`${tenantId}:${moId}`, existingScrap);

    order.scrapped_quantity += request.quantity;
    order.updated_at = now;

    return scrapRecord;
  }

  async listScrapRecords(tenantId: string, moId: string): Promise<MoScrapRecord[]> {
    await this.getOrderById(tenantId, moId);
    return this.scrapStore.get(`${tenantId}:${moId}`) || [];
  }

  async substituteComponent(
    tenantId: string,
    moId: string,
    request: SubstituteComponentRequest,
  ): Promise<MoComponentSubstitution> {
    const order = await this.getOrderById(tenantId, moId);
    assertValidComponentSubstitution(
      request.original_variant_id,
      request.substituted_variant_id,
      request.quantity,
    );

    await this.variantsService.getVariantById(tenantId, request.original_variant_id);
    const subVariant = await this.variantsService.getVariantById(tenantId, request.substituted_variant_id);

    const now = new Date().toISOString();
    const substitution: MoComponentSubstitution = {
      id: generateUuidV7(),
      tenant_id: tenantId,
      manufacturing_order_id: moId,
      original_variant_id: request.original_variant_id,
      substituted_variant_id: request.substituted_variant_id,
      quantity: request.quantity,
      approved_by: request.approved_by ?? null,
      reason: request.reason ?? null,
      created_at: now,
    };

    const existingSubs = this.substitutionsStore.get(`${tenantId}:${moId}`) || [];
    existingSubs.push(substitution);
    this.substitutionsStore.set(`${tenantId}:${moId}`, existingSubs);

    // Adjust MO component lines
    if (order.components) {
      const origComp = order.components.find((c) => c.variant_id === request.original_variant_id);
      if (origComp) {
        origComp.required_quantity = Math.max(0, origComp.required_quantity - request.quantity);
      }

      const existingSubComp = order.components.find((c) => c.variant_id === request.substituted_variant_id);
      if (existingSubComp) {
        existingSubComp.required_quantity += request.quantity;
      } else {
        order.components.push({
          id: generateUuidV7(),
          tenant_id: tenantId,
          manufacturing_order_id: moId,
          variant_id: request.substituted_variant_id,
          required_quantity: request.quantity,
          consumed_quantity: 0,
          unit_cost_minor: subVariant.cost_price_minor,
          total_cost_minor: (BigInt(subVariant.cost_price_minor) * BigInt(request.quantity)).toString(),
          is_backflushed: true,
          location_id: order.destination_location_id,
          created_at: now,
          updated_at: now,
        });
      }
    }

    order.updated_at = now;
    return substitution;
  }

  async completeOrder(
    tenantId: string,
    moId: string,
    request: CompleteManufacturingOrderRequest,
  ): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(tenantId, moId);
    assertValidMoStatusTransition(order.status, 'COMPLETED');

    const producedQty = request.produced_quantity;
    const scrappedQty = request.scrapped_quantity ?? 0;

    const costResult = calculateFinishedGoodsUnitCost({
      materialCostMinor: BigInt(order.total_material_cost_minor),
      laborCostMinor: BigInt(order.total_labor_cost_minor),
      machineCostMinor: 0n,
      overheadCostMinor: BigInt(order.total_overhead_cost_minor),
      producedQuantity: producedQty,
    });

    const now = new Date().toISOString();
    let batchId: string | null = null;
    const lotNum = request.lot_number || order.lot_number;
    if (lotNum) {
      try {
        const batch = await this.batchesService.createBatch(tenantId, {
          variant_id: order.variant_id,
          batch_number: lotNum,
        });
        batchId = batch.id;
      } catch {
        const existingBatches = await this.batchesService.getBatches(tenantId, order.variant_id);
        const found = existingBatches.find((b) => b.batch_number === lotNum);
        batchId = found ? found.id : null;
      }
    }

    // Fulfill active reservations
    const resIds = this.orderReservationsStore.get(`${tenantId}:${moId}`) || [];
    for (const rId of resIds) {
      try {
        await this.stockReservationsService.fulfillReservation(tenantId, rId);
      } catch {
        // Ignored if already fulfilled
      }
    }

    // Authoritative double-entry receipt into finished goods location
    await this.stockLedgerService.postMovement(tenantId, 'usr_mfg_system', {
      idempotency_key: `mo:${order.id}:complete:${producedQty}`,
      movement_type: 'MANUFACTURING_RECEIPT',
      reference_type: 'MANUFACTURING_ORDER',
      reference_id: order.id,
      variant_id: order.variant_id,
      destination_warehouse_id: order.warehouse_id,
      destination_location_id: order.destination_location_id,
      quantity: producedQty,
      unit_cost_minor: costResult.unitProductionCostMinor.toString(),
      batch_id: batchId,
      notes: `Manufacturing Order ${order.mo_number} production yield`,
    });

    order.status = 'COMPLETED';
    order.produced_quantity = producedQty;
    order.scrapped_quantity = scrappedQty;
    order.total_production_cost_minor = costResult.netProductionCostMinor.toString();
    order.unit_production_cost_minor = costResult.unitProductionCostMinor.toString();
    order.actual_completion_date = now;
    order.updated_at = now;
    return order;
  }

  async closeOrder(tenantId: string, moId: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(tenantId, moId);
    assertValidMoStatusTransition(order.status, 'CLOSED');

    order.status = 'CLOSED';
    order.updated_at = new Date().toISOString();
    return order;
  }

  async cancelOrder(tenantId: string, moId: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(tenantId, moId);
    assertValidMoStatusTransition(order.status, 'CANCELLED');

    const resIds = this.orderReservationsStore.get(`${tenantId}:${moId}`) || [];
    for (const rId of resIds) {
      try {
        await this.stockReservationsService.releaseReservation(tenantId, rId);
      } catch {
        // Ignored if already released
      }
    }

    order.status = 'CANCELLED';
    order.updated_at = new Date().toISOString();
    return order;
  }

  // ==========================================
  // Traceability & Recall Lineage Engine
  // ==========================================

  recordConsumptionTrace(tenantId: string, trace: ConsumptionTrace): void {
    const existing = this.consumptionTracesStore.get(tenantId) || [];
    existing.push(trace);
    this.consumptionTracesStore.set(tenantId, existing);
  }

  async getGenealogy(
    tenantId: string,
    targetType: 'COMPONENT_BATCH' | 'FINISHED_LOT',
    targetIdentifier: string,
  ): Promise<BatchRecallTraceabilityResponse> {
    const traces = this.consumptionTracesStore.get(tenantId) || [];
    const orders = await this.listOrders(tenantId);

    const forward: ForwardTraceabilityItem[] = [];
    const backward: BackwardTraceabilityItem[] = [];

    if (targetType === 'COMPONENT_BATCH') {
      // Find all consumption traces where this batch or variant was used
      const matchingTraces = traces.filter(
        (t) => t.batchId === targetIdentifier || t.lotNumber === targetIdentifier || t.variantId === targetIdentifier,
      );

      for (const t of matchingTraces) {
        const order = orders.find((o) => o.id === t.orderId);
        if (order) {
          forward.push({
            source_batch_id: t.batchId || targetIdentifier,
            source_variant_id: t.variantId,
            production_order_id: order.id,
            production_order_number: order.mo_number,
            produced_lot_number: order.lot_number,
            produced_variant_id: order.variant_id,
            quantity_consumed: t.quantity,
            quantity_produced: order.produced_quantity,
          });
        }
      }
    } else {
      // Backward trace: find all orders that produced this finished lot
      const matchingOrders = orders.filter((o) => o.lot_number === targetIdentifier);
      for (const order of matchingOrders) {
        const orderTraces = traces.filter((t) => t.orderId === order.id);
        for (const t of orderTraces) {
          backward.push({
            finished_variant_id: order.variant_id,
            finished_lot_number: order.lot_number,
            production_order_id: order.id,
            production_order_number: order.mo_number,
            component_variant_id: t.variantId,
            component_batch_id: t.batchId,
            component_lot_number: t.lotNumber,
            supplier_id: null,
            supplier_name: null,
            goods_receipt_id: null,
          });
        }
      }
    }

    return {
      target_type: targetType,
      target_identifier: targetIdentifier,
      forward_trace: forward,
      backward_trace: backward,
    };
  }
}
