import {
  Injectable,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  StockLedgerEntry,
  StockBalanceSnapshot,
  PostStockMovementRequest,
  StockMovementResponse,
  OpeningBalanceRequest,
  StockAdjustmentRequest,
  StockTransferRequest,
  StockWriteOffRequest,
  StockCountDiscrepancyRequest,
  ReconcileBalancesRequest,
  ReconcileBalancesResponse,
  BalanceReconciliationResult,
  FefoRecommendationRequest,
  FefoRecommendationResponse,
  FefoAllocationItem,
} from '@stokrova/contracts';
import {
  assertStockMovementValid,
  calculateTotalCostMinor,
  calculateAvailableToPromise,
  assertAllocatableStock,
  calculateLedgerSum,
  generateUuidV7,
  InventoryDomainError,
  TrackingDomainError,
} from '@stokrova/domain';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { BatchesService } from '../tracking/batches.service.js';
import { SerialsService } from '../tracking/serials.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';

@Injectable()
export class StockLedgerService {
  private ledgerStore = new Map<string, StockLedgerEntry>();
  private balancesStore = new Map<string, StockBalanceSnapshot>();

  constructor(
    private readonly variantsService: VariantsService,
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
    private readonly batchesService: BatchesService,
    private readonly serialsService: SerialsService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  private getBalanceKey(
    tenantId: string,
    warehouseId: string,
    locationId: string | null,
    variantId: string,
    batchId: string | null,
  ): string {
    return `${tenantId}:${warehouseId}:${locationId || '__ROOT__'}:${variantId}:${batchId || '__NONE__'}`;
  }

  async postMovement(
    tenantId: string,
    userId: string,
    req: PostStockMovementRequest,
  ): Promise<StockMovementResponse> {
    // 1. Idempotency Check
    const existing = Array.from(this.ledgerStore.values()).find(
      (e) =>
        e.tenant_id === tenantId &&
        e.idempotency_key === req.idempotency_key,
    );
    if (existing) {
      return { entry: existing };
    }

    // 2. Validate Domain Movement Invariants
    try {
      assertStockMovementValid({
        quantity: req.quantity,
        movement_type: req.movement_type,
        source_warehouse_id: req.source_warehouse_id,
        destination_warehouse_id: req.destination_warehouse_id,
        source_location_id: req.source_location_id,
        destination_location_id: req.destination_location_id,
      });
    } catch (err: unknown) {
      if (err instanceof InventoryDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // 3. Verify Product Variant
    await this.variantsService.getVariantById(tenantId, req.variant_id);

    // 4. Verify Warehouses & Locations
    if (req.source_warehouse_id) {
      await this.warehousesService.getWarehouseById(tenantId, req.source_warehouse_id);
      if (req.source_location_id) {
        const srcLoc = await this.locationsService.getLocationById(tenantId, req.source_location_id);
        if (srcLoc.warehouse_id !== req.source_warehouse_id) {
          throw new BadRequestException('Source location does not belong to source warehouse.');
        }
      }
    }

    if (req.destination_warehouse_id) {
      await this.warehousesService.getWarehouseById(tenantId, req.destination_warehouse_id);
      if (req.destination_location_id) {
        const destLoc = await this.locationsService.getLocationById(tenantId, req.destination_location_id);
        if (destLoc.warehouse_id !== req.destination_warehouse_id) {
          throw new BadRequestException('Destination location does not belong to destination warehouse.');
        }
      }
    }

    // 5. Verify Batch & Lot tracking status if moving OUT
    if (req.batch_id) {
      const batch = await this.batchesService.getBatchById(tenantId, req.batch_id);
      if (req.source_warehouse_id) {
        try {
          assertAllocatableStock({
            status: batch.status,
            expiry_date: batch.expiry_date,
            quarantine_reason: batch.quarantine_reason,
          });
        } catch (err: unknown) {
          if (err instanceof TrackingDomainError) {
            throw new BadRequestException(err.message);
          }
          throw err;
        }
      }
    }

    // 6. Verify Serial number tracking if applicable
    if (req.serial_id) {
      const serial = await this.serialsService.getSerialById(tenantId, req.serial_id);
      if (req.source_warehouse_id) {
        try {
          assertAllocatableStock({
            status: serial.status,
            quarantine_reason: serial.quarantine_reason,
          });
        } catch (err: unknown) {
          if (err instanceof TrackingDomainError) {
            throw new BadRequestException(err.message);
          }
          throw err;
        }
      }
    }

    // 7. Calculate valuation
    const totalCostMinor = calculateTotalCostMinor(
      req.quantity,
      req.unit_cost_minor,
    );

    const now = new Date().toISOString();

    // 8. Update Balances Atomically (Double-Entry Balance Update)
    let srcBalance: StockBalanceSnapshot | null = null;
    let destBalance: StockBalanceSnapshot | null = null;

    // Outflow from source
    if (req.source_warehouse_id) {
      const srcKey = this.getBalanceKey(
        tenantId,
        req.source_warehouse_id,
        req.source_location_id || null,
        req.variant_id,
        req.batch_id || null,
      );
      srcBalance = this.balancesStore.get(srcKey) || {
        id: `bal_${randomUUID().replace(/-/g, '')}`,
        tenant_id: tenantId,
        warehouse_id: req.source_warehouse_id,
        location_id: req.source_location_id || null,
        variant_id: req.variant_id,
        batch_id: req.batch_id || null,
        on_hand_quantity: 0,
        reserved_quantity: 0,
        available_to_promise: 0,
        updated_at: now,
      };

      srcBalance.on_hand_quantity -= req.quantity;
      srcBalance.available_to_promise = calculateAvailableToPromise(
        srcBalance.on_hand_quantity,
        srcBalance.reserved_quantity,
      );
      srcBalance.updated_at = now;
      this.balancesStore.set(srcKey, srcBalance);
    }

    // Inflow to destination
    if (req.destination_warehouse_id) {
      const destKey = this.getBalanceKey(
        tenantId,
        req.destination_warehouse_id,
        req.destination_location_id || null,
        req.variant_id,
        req.batch_id || null,
      );
      destBalance = this.balancesStore.get(destKey) || {
        id: `bal_${randomUUID().replace(/-/g, '')}`,
        tenant_id: tenantId,
        warehouse_id: req.destination_warehouse_id,
        location_id: req.destination_location_id || null,
        variant_id: req.variant_id,
        batch_id: req.batch_id || null,
        on_hand_quantity: 0,
        reserved_quantity: 0,
        available_to_promise: 0,
        updated_at: now,
      };

      destBalance.on_hand_quantity += req.quantity;
      destBalance.available_to_promise = calculateAvailableToPromise(
        destBalance.on_hand_quantity,
        destBalance.reserved_quantity,
      );
      destBalance.updated_at = now;
      this.balancesStore.set(destKey, destBalance);
    }

    // 9. Relocate Serial Number if applicable
    if (req.serial_id && req.destination_warehouse_id) {
      await this.serialsService.updateLocation(tenantId, req.serial_id, {
        warehouse_id: req.destination_warehouse_id,
        location_id: req.destination_location_id || null,
      });
    }

    // 10. Record Immutable Ledger Entry
    const entry: StockLedgerEntry = {
      id: `sle_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      idempotency_key: req.idempotency_key,
      movement_type: req.movement_type,
      reference_type: req.reference_type,
      reference_id: req.reference_id,
      variant_id: req.variant_id,
      batch_id: req.batch_id || null,
      serial_id: req.serial_id || null,
      source_warehouse_id: req.source_warehouse_id || null,
      source_location_id: req.source_location_id || null,
      destination_warehouse_id: req.destination_warehouse_id || null,
      destination_location_id: req.destination_location_id || null,
      quantity: req.quantity,
      unit_cost_minor: req.unit_cost_minor,
      total_cost_minor: totalCostMinor,
      user_id: userId,
      notes: req.notes || null,
      created_at: now,
    };

    this.ledgerStore.set(entry.id, entry);

    // 11. Transactional Audit Trail & Outbox Event Emission
    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        action: 'INVENTORY_MOVEMENT_POSTED',
        entity_type: 'stock_ledger_entry',
        entity_id: entry.id,
        actor_user_id: userId,
        metadata: {
          movement_type: entry.movement_type,
          reference_type: entry.reference_type,
          reference_id: entry.reference_id,
          variant_id: entry.variant_id,
          quantity: entry.quantity,
          source_warehouse_id: entry.source_warehouse_id,
          destination_warehouse_id: entry.destination_warehouse_id,
        },
      });
    }

    if (this.outboxService) {
      await this.outboxService.saveEvent(null, {
        eventId: generateUuidV7(),
        eventType: 'inventory.movement_posted',
        aggregateType: 'stock_ledger_entry',
        aggregateId: entry.id,
        tenantId,
        occurredAt: now,
        operationId: req.idempotency_key,
        payload: {
          entry,
          source_balance: srcBalance,
          destination_balance: destBalance,
        },
      });
    }

    return {
      entry,
      source_balance: srcBalance,
      destination_balance: destBalance,
    };
  }

  async getLedgerEntries(
    tenantId: string,
    filter?: { variant_id?: string; reference_id?: string },
  ): Promise<StockLedgerEntry[]> {
    return Array.from(this.ledgerStore.values()).filter((e) => {
      if (e.tenant_id !== tenantId) return false;
      if (filter?.variant_id && e.variant_id !== filter.variant_id) return false;
      if (filter?.reference_id && e.reference_id !== filter.reference_id) return false;
      return true;
    });
  }

  async getBalances(
    tenantId: string,
    filter?: { warehouse_id?: string; variant_id?: string },
  ): Promise<StockBalanceSnapshot[]> {
    return Array.from(this.balancesStore.values()).filter((b) => {
      if (b.tenant_id !== tenantId) return false;
      if (filter?.warehouse_id && b.warehouse_id !== filter.warehouse_id) return false;
      if (filter?.variant_id && b.variant_id !== filter.variant_id) return false;
      return true;
    });
  }

  async getBalance(
    tenantId: string,
    warehouseId: string,
    variantId: string,
    locationId: string | null = null,
    batchId: string | null = null,
  ): Promise<StockBalanceSnapshot> {
    if (batchId !== null && batchId !== undefined) {
      const key = this.getBalanceKey(tenantId, warehouseId, locationId, variantId, batchId);
      const balance = this.balancesStore.get(key);
      if (!balance || balance.tenant_id !== tenantId) {
        return {
          id: `bal_${randomUUID().replace(/-/g, '')}`,
          tenant_id: tenantId,
          warehouse_id: warehouseId,
          location_id: locationId,
          variant_id: variantId,
          batch_id: batchId,
          on_hand_quantity: 0,
          reserved_quantity: 0,
          available_to_promise: 0,
          updated_at: new Date().toISOString(),
        };
      }
      return balance;
    }

    // When batchId is null, aggregate across all batches for this variant/location
    const matchingBalances = Array.from(this.balancesStore.values()).filter((b) => {
      if (b.tenant_id !== tenantId) return false;
      if (b.warehouse_id !== warehouseId) return false;
      if (b.variant_id !== variantId) return false;
      if (locationId !== null && b.location_id !== locationId) return false;
      return true;
    });

    if (matchingBalances.length === 0) {
      return {
        id: `bal_${randomUUID().replace(/-/g, '')}`,
        tenant_id: tenantId,
        warehouse_id: warehouseId,
        location_id: locationId,
        variant_id: variantId,
        batch_id: null,
        on_hand_quantity: 0,
        reserved_quantity: 0,
        available_to_promise: 0,
        updated_at: new Date().toISOString(),
      };
    }

    const totalOnHand = matchingBalances.reduce((sum, b) => sum + b.on_hand_quantity, 0);
    const totalReserved = matchingBalances.reduce((sum, b) => sum + b.reserved_quantity, 0);
    const totalAtp = calculateAvailableToPromise(totalOnHand, totalReserved);

    return {
      id: matchingBalances[0]!.id,
      tenant_id: tenantId,
      warehouse_id: warehouseId,
      location_id: locationId,
      variant_id: variantId,
      batch_id: null,
      on_hand_quantity: totalOnHand,
      reserved_quantity: totalReserved,
      available_to_promise: totalAtp,
      updated_at: new Date().toISOString(),
    };
  }

  // Internal helper for reservation balance mutation
  mutateReservationBalance(
    tenantId: string,
    warehouseId: string,
    variantId: string,
    batchId: string | null,
    deltaReserved: number,
  ): StockBalanceSnapshot {
    const key = this.getBalanceKey(tenantId, warehouseId, null, variantId, batchId);
    const now = new Date().toISOString();
    let balance = this.balancesStore.get(key);
    if (!balance) {
      balance = {
        id: `bal_${randomUUID().replace(/-/g, '')}`,
        tenant_id: tenantId,
        warehouse_id: warehouseId,
        location_id: null,
        variant_id: variantId,
        batch_id: batchId,
        on_hand_quantity: 0,
        reserved_quantity: 0,
        available_to_promise: 0,
        updated_at: now,
      };
    }

    balance.reserved_quantity += deltaReserved;
    balance.available_to_promise = calculateAvailableToPromise(
      balance.on_hand_quantity,
      balance.reserved_quantity,
    );
    balance.updated_at = now;
    this.balancesStore.set(key, balance);
    return balance;
  }

  // --------------------------------------------------------------------------
  // Phase 2 Operational Commands: Opening Balance, Adjustments, Transfers, Write-Offs
  // --------------------------------------------------------------------------

  async initiateOpeningBalance(
    tenantId: string,
    userId: string,
    req: OpeningBalanceRequest,
  ): Promise<StockMovementResponse> {
    let batchId: string | null = null;
    if (req.batch_number) {
      try {
        const batch = await this.batchesService.createBatch(tenantId, {
          variant_id: req.variant_id,
          batch_number: req.batch_number,
          expiry_date: req.expiration_date ?? undefined,
        });
        batchId = batch.id;
      } catch {
        const batches = await this.batchesService.getBatches(tenantId, req.variant_id);
        const found = batches.find(
          (b) => b.batch_number === req.batch_number!.trim().toUpperCase(),
        );
        batchId = found ? found.id : null;
      }
    }

    if (req.serial_numbers && req.serial_numbers.length > 0) {
      for (const sn of req.serial_numbers) {
        try {
          await this.serialsService.createSerial(tenantId, {
            variant_id: req.variant_id,
            warehouse_id: req.warehouse_id,
            location_id: req.location_id || null,
            batch_id: batchId,
            serial_number: sn,
          });
        } catch {
          // Serial already initialized in tenant
        }
      }
    }

    return this.postMovement(tenantId, userId, {
      idempotency_key: req.idempotency_key,
      movement_type: 'OPENING_BALANCE',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: `INIT-${req.warehouse_id}-${req.variant_id}`,
      variant_id: req.variant_id,
      destination_warehouse_id: req.warehouse_id,
      destination_location_id: req.location_id || null,
      quantity: req.quantity,
      unit_cost_minor: req.unit_cost_minor,
      batch_id: batchId,
      notes: req.notes || 'Opening balance initialization',
    });
  }

  async adjustStock(
    tenantId: string,
    userId: string,
    req: StockAdjustmentRequest,
  ): Promise<StockMovementResponse> {
    const unitCost = req.unit_cost_minor || '0';

    if (req.delta_quantity > 0) {
      // Physical surplus: Inflow
      return this.postMovement(tenantId, userId, {
        idempotency_key: req.idempotency_key,
        movement_type: 'STOCK_ADJUSTMENT',
        reference_type: 'MANUAL_ADJUSTMENT',
        reference_id: `ADJ-${req.reason_code}-${Date.now()}`,
        variant_id: req.variant_id,
        destination_warehouse_id: req.warehouse_id,
        destination_location_id: req.location_id || null,
        batch_id: req.batch_id || null,
        serial_id: req.serial_id || null,
        quantity: req.delta_quantity,
        unit_cost_minor: unitCost,
        notes: `Stock adjustment surplus: ${req.reason_code}. ${req.notes || ''}`.trim(),
      });
    } else {
      // Physical deficit: Outflow (enforce non-negative stock constraint)
      const reduceQty = Math.abs(req.delta_quantity);
      const currentBal = await this.getBalance(
        tenantId,
        req.warehouse_id,
        req.variant_id,
        req.location_id || null,
        req.batch_id || null,
      );

      if (currentBal.on_hand_quantity < reduceQty) {
        throw new BadRequestException(
          `Cannot adjust stock below zero: current on-hand is ${currentBal.on_hand_quantity}, attempted reduction is ${reduceQty}.`,
        );
      }

      return this.postMovement(tenantId, userId, {
        idempotency_key: req.idempotency_key,
        movement_type: 'STOCK_ADJUSTMENT',
        reference_type: 'MANUAL_ADJUSTMENT',
        reference_id: `ADJ-${req.reason_code}-${Date.now()}`,
        variant_id: req.variant_id,
        source_warehouse_id: req.warehouse_id,
        source_location_id: req.location_id || null,
        batch_id: req.batch_id || null,
        serial_id: req.serial_id || null,
        quantity: reduceQty,
        unit_cost_minor: unitCost,
        notes: `Stock adjustment deficit: ${req.reason_code}. ${req.notes || ''}`.trim(),
      });
    }
  }

  async transferStock(
    tenantId: string,
    userId: string,
    req: StockTransferRequest,
  ): Promise<StockMovementResponse> {
    const currentBal = await this.getBalance(
      tenantId,
      req.source_warehouse_id,
      req.variant_id,
      req.source_location_id || null,
      req.batch_id || null,
    );

    if (currentBal.available_to_promise < req.quantity) {
      throw new BadRequestException(
        `Insufficient available-to-promise inventory at source: ${currentBal.available_to_promise} available, ${req.quantity} requested for transfer.`,
      );
    }

    return this.postMovement(tenantId, userId, {
      idempotency_key: req.idempotency_key,
      movement_type: 'INTERNAL_TRANSFER',
      reference_type: 'STOCK_TRANSFER',
      reference_id: `XFER-${Date.now()}`,
      variant_id: req.variant_id,
      source_warehouse_id: req.source_warehouse_id,
      source_location_id: req.source_location_id || null,
      destination_warehouse_id: req.destination_warehouse_id,
      destination_location_id: req.destination_location_id || null,
      batch_id: req.batch_id || null,
      serial_id: req.serial_id || null,
      quantity: req.quantity,
      unit_cost_minor: req.unit_cost_minor || '0',
      notes: req.notes || 'Internal stock transfer',
    });
  }

  async writeOffStock(
    tenantId: string,
    userId: string,
    req: StockWriteOffRequest,
  ): Promise<StockMovementResponse> {
    const currentBal = await this.getBalance(
      tenantId,
      req.warehouse_id,
      req.variant_id,
      req.location_id || null,
      req.batch_id || null,
    );

    if (currentBal.on_hand_quantity < req.quantity) {
      throw new BadRequestException(
        `Cannot write off stock: current on-hand is ${currentBal.on_hand_quantity}, attempted write-off is ${req.quantity}.`,
      );
    }

    const movementType = req.write_off_type === 'EXPIRY' ? 'EXPIRY' : 'SCRAP_DAMAGED';

    if (req.serial_id) {
      try {
        await this.serialsService.quarantineHold(tenantId, req.serial_id, {
          reason: 'OTHER',
          notes: req.notes ? `${req.notes} | WRITE_OFF_${req.write_off_type}` : `WRITE_OFF_${req.write_off_type}`,
        });
      } catch {
        // ignore
      }
    }

    return this.postMovement(tenantId, userId, {
      idempotency_key: req.idempotency_key,
      movement_type: movementType,
      reference_type: 'SCRAP_WRITE_OFF',
      reference_id: `SCRAP-${req.write_off_type}-${Date.now()}`,
      variant_id: req.variant_id,
      source_warehouse_id: req.warehouse_id,
      source_location_id: req.location_id || null,
      batch_id: req.batch_id || null,
      serial_id: req.serial_id || null,
      quantity: req.quantity,
      unit_cost_minor: '0',
      notes: `Write-off: ${req.write_off_type}. ${req.notes || ''}`.trim(),
    });
  }

  async reconcileStockCount(
    tenantId: string,
    userId: string,
    req: StockCountDiscrepancyRequest,
  ): Promise<{ discrepancy: number; movement_response?: StockMovementResponse | null }> {
    const currentBal = await this.getBalance(
      tenantId,
      req.warehouse_id,
      req.variant_id,
      req.location_id || null,
      req.batch_id || null,
    );

    const discrepancy = req.counted_quantity - currentBal.on_hand_quantity;
    if (discrepancy === 0) {
      return { discrepancy: 0, movement_response: null };
    }

    if (discrepancy > 0) {
      const res = await this.postMovement(tenantId, userId, {
        idempotency_key: req.idempotency_key,
        movement_type: 'STOCK_COUNT_ADJUSTMENT',
        reference_type: 'CYCLE_COUNT',
        reference_id: `CYCLE-COUNT-${Date.now()}`,
        variant_id: req.variant_id,
        destination_warehouse_id: req.warehouse_id,
        destination_location_id: req.location_id || null,
        batch_id: req.batch_id || null,
        quantity: discrepancy,
        unit_cost_minor: '0',
        notes: `Cycle count adjustment (surplus of ${discrepancy} units). ${req.notes || ''}`.trim(),
      });
      return { discrepancy, movement_response: res };
    } else {
      const reduction = Math.abs(discrepancy);
      const res = await this.postMovement(tenantId, userId, {
        idempotency_key: req.idempotency_key,
        movement_type: 'STOCK_COUNT_ADJUSTMENT',
        reference_type: 'CYCLE_COUNT',
        reference_id: `CYCLE-COUNT-${Date.now()}`,
        variant_id: req.variant_id,
        source_warehouse_id: req.warehouse_id,
        source_location_id: req.location_id || null,
        batch_id: req.batch_id || null,
        quantity: reduction,
        unit_cost_minor: '0',
        notes: `Cycle count adjustment (deficit of ${reduction} units). ${req.notes || ''}`.trim(),
      });
      return { discrepancy, movement_response: res };
    }
  }

  async reconcileBalancesAgainstLedger(
    tenantId: string,
    reqOrWarehouseId?: ReconcileBalancesRequest | string,
    variantIdArg?: string,
  ): Promise<ReconcileBalancesResponse> {
    let warehouseId: string | undefined;
    let variantId: string | undefined;
    if (typeof reqOrWarehouseId === 'object' && reqOrWarehouseId !== null) {
      warehouseId = reqOrWarehouseId.warehouse_id;
      variantId = reqOrWarehouseId.variant_id;
    } else {
      warehouseId = reqOrWarehouseId;
      variantId = variantIdArg;
    }

    const entries = Array.from(this.ledgerStore.values()).filter((e) => {
      if (e.tenant_id !== tenantId) return false;
      if (variantId && e.variant_id !== variantId) return false;
      if (
        warehouseId &&
        e.source_warehouse_id !== warehouseId &&
        e.destination_warehouse_id !== warehouseId
      ) {
        return false;
      }
      return true;
    });

    const targetKeys = new Set<string>();
    for (const e of entries) {
      if (e.destination_warehouse_id) {
        targetKeys.add(
          `${e.destination_warehouse_id}:${e.destination_location_id || '__ROOT__'}:${e.variant_id}:${e.batch_id || '__NONE__'}`,
        );
      }
      if (e.source_warehouse_id) {
        targetKeys.add(
          `${e.source_warehouse_id}:${e.source_location_id || '__ROOT__'}:${e.variant_id}:${e.batch_id || '__NONE__'}`,
        );
      }
    }
    for (const b of this.balancesStore.values()) {
      if (b.tenant_id === tenantId) {
        if (warehouseId && b.warehouse_id !== warehouseId) continue;
        if (variantId && b.variant_id !== variantId) continue;
        targetKeys.add(
          `${b.warehouse_id}:${b.location_id || '__ROOT__'}:${b.variant_id}:${b.batch_id || '__NONE__'}`,
        );
      }
    }

    const results: BalanceReconciliationResult[] = [];
    let correctedCount = 0;
    const now = new Date().toISOString();

    for (const compound of targetKeys) {
      const [wId, locPart, vId, batchPart] = compound.split(':');
      const locId = locPart === '__ROOT__' ? null : locPart!;
      const bId = batchPart === '__NONE__' ? null : batchPart!;

      const calculatedLedgerSum = calculateLedgerSum(
        entries.filter((e) => e.variant_id === vId),
        wId!,
        locId,
        bId,
      );

      const storeKey = this.getBalanceKey(tenantId, wId!, locId, vId!, bId);
      let snapshot = this.balancesStore.get(storeKey);
      const previousOnHand = snapshot ? snapshot.on_hand_quantity : 0;
      const drift = previousOnHand !== calculatedLedgerSum;

      if (drift) {
        correctedCount++;
        if (!snapshot) {
          snapshot = {
            id: `bal_${generateUuidV7()}`,
            tenant_id: tenantId,
            warehouse_id: wId!,
            location_id: locId,
            variant_id: vId!,
            batch_id: bId,
            on_hand_quantity: calculatedLedgerSum,
            reserved_quantity: 0,
            available_to_promise: calculatedLedgerSum,
            updated_at: now,
          };
        } else {
          snapshot.on_hand_quantity = calculatedLedgerSum;
          snapshot.available_to_promise = calculateAvailableToPromise(
            snapshot.on_hand_quantity,
            snapshot.reserved_quantity,
          );
          snapshot.updated_at = now;
        }
        this.balancesStore.set(storeKey, snapshot);
      }

      results.push({
        tenant_id: tenantId,
        warehouse_id: wId!,
        location_id: locId,
        variant_id: vId!,
        batch_id: bId,
        previous_snapshot_on_hand: previousOnHand,
        calculated_ledger_on_hand: calculatedLedgerSum,
        drift_detected: drift,
        reconciled_at: now,
      });
    }

    return {
      total_reconciled: results.length,
      discrepancies_corrected: correctedCount,
      details: results,
    };
  }

  async getFefoRecommendation(
    tenantId: string,
    req: FefoRecommendationRequest,
  ): Promise<FefoRecommendationResponse> {
    const batches = await this.batchesService.getFefoPickingOrder(tenantId, req.variant_id);
    const allocations: FefoAllocationItem[] = [];
    let remainingNeeded = req.quantity;

    for (const batch of batches) {
      if (remainingNeeded <= 0) break;

      const balances = await this.getBalances(tenantId, { variant_id: req.variant_id });
      const batchBalances = balances.filter((b) => b.batch_id === batch.id);
      const availableInBatch = batchBalances.reduce(
        (sum, b) => sum + b.available_to_promise,
        0,
      );

      if (availableInBatch > 0) {
        const allocatedQty = Math.min(remainingNeeded, availableInBatch);
        allocations.push({
          batch_id: batch.id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          allocated_quantity: allocatedQty,
          available_in_batch: availableInBatch,
        });
        remainingNeeded -= allocatedQty;
      }
    }

    const totalAllocated = req.quantity - remainingNeeded;
    return {
      variant_id: req.variant_id,
      requested_quantity: req.quantity,
      total_allocated: totalAllocated,
      allocations,
      shortage: remainingNeeded > 0 ? remainingNeeded : 0,
    };
  }

  clearStore(): void {
    this.ledgerStore.clear();
    this.balancesStore.clear();
  }
}
