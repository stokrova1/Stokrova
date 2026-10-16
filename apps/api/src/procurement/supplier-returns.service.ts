import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SupplierReturn,
  SupplierReturnLine,
  SupplierReturnStatus,
  CreateSupplierReturnInput,
  AuthorizeSupplierReturnInput,
  DispatchSupplierReturnInput,
} from '@stokrova/contracts';
import {
  assertValidSupplierReturnTransition,
  generateUuidV7,
} from '@stokrova/domain';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { SuppliersService } from './suppliers.service.js';

@Injectable()
export class SupplierReturnsService {
  private returnsStore = new DurableMap<SupplierReturn>('supplier_returns');
  private returnCounter = 7000;

  constructor(
    private readonly stockLedgerService: StockLedgerService,
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
    private readonly poService: PurchaseOrdersService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(
    tenantId: string,
    input: CreateSupplierReturnInput,
    createdBy = 'usr_procurement',
  ): Promise<SupplierReturn> {
    await this.suppliersService.getSupplierById(tenantId, input.supplier_id);
    await this.poService.getById(tenantId, input.purchase_order_id);
    await this.warehousesService.getWarehouseById(tenantId, input.warehouse_id);

    if (!input.lines || input.lines.length === 0) {
      throw new BadRequestException('Supplier return must contain at least one line item.');
    }

    const returnId = generateUuidV7();
    this.returnCounter += 1;
    const returnNumber = `SR-${this.returnCounter}`;
    const now = new Date().toISOString();

    const lines: SupplierReturnLine[] = [];
    for (const lineReq of input.lines) {
      const unitCost = BigInt(lineReq.unit_cost_minor ?? '0');
      const lineTotal = BigInt(lineReq.quantity) * unitCost;

      lines.push({
        id: generateUuidV7(),
        tenant_id: tenantId,
        return_id: returnId,
        goods_receipt_line_id: lineReq.goods_receipt_line_id ?? null,
        variant_id: lineReq.variant_id,
        quantity: lineReq.quantity,
        unit_cost_minor: unitCost.toString(),
        line_total_minor: lineTotal.toString(),
        source_location_id: lineReq.source_location_id ?? null,
        reason: lineReq.reason ?? null,
        created_at: now,
        updated_at: now,
      });
    }

    const supplierReturn: SupplierReturn = {
      id: returnId,
      tenant_id: tenantId,
      return_number: returnNumber,
      supplier_id: input.supplier_id,
      purchase_order_id: input.purchase_order_id,
      goods_receipt_id: input.goods_receipt_id ?? null,
      warehouse_id: input.warehouse_id,
      status: 'DRAFT',
      reason: input.reason,
      dispatched_at: null,
      authorized_by: null,
      authorized_at: null,
      carrier: null,
      tracking_number: null,
      credit_memo_reference: null,
      notes: input.notes ?? null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
      lines,
    };

    this.returnsStore.set(`${tenantId}:${returnId}`, supplierReturn);
    return supplierReturn;
  }

  async getById(tenantId: string, returnId: string): Promise<SupplierReturn> {
    const ret = this.returnsStore.get(`${tenantId}:${returnId}`);
    if (!ret) {
      throw new NotFoundException(`Supplier Return '${returnId}' not found for tenant '${tenantId}'.`);
    }
    return ret;
  }

  async list(
    tenantId: string,
    filters?: { supplierId?: string; poId?: string; status?: SupplierReturnStatus },
  ): Promise<SupplierReturn[]> {
    const results: SupplierReturn[] = [];
    for (const [key, ret] of this.returnsStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (filters?.supplierId && ret.supplier_id !== filters.supplierId) continue;
        if (filters?.poId && ret.purchase_order_id !== filters.poId) continue;
        if (filters?.status && ret.status !== filters.status) continue;
        results.push(ret);
      }
    }
    return results;
  }

  async authorize(
    tenantId: string,
    returnId: string,
    input: AuthorizeSupplierReturnInput,
  ): Promise<SupplierReturn> {
    const ret = await this.getById(tenantId, returnId);
    assertValidSupplierReturnTransition(ret.status, 'AUTHORIZED');

    const now = new Date().toISOString();
    ret.status = 'AUTHORIZED';
    ret.authorized_by = input.authorized_by;
    ret.authorized_at = now;
    if (input.credit_memo_reference) {
      ret.credit_memo_reference = input.credit_memo_reference;
    }
    if (input.notes) {
      ret.notes = ret.notes ? `${ret.notes}\n[Auth]: ${input.notes}` : input.notes;
    }
    ret.updated_at = now;
    return ret;
  }

  async dispatch(
    tenantId: string,
    returnId: string,
    input: DispatchSupplierReturnInput,
    dispatchedBy = 'usr_shipping',
  ): Promise<SupplierReturn> {
    const ret = await this.getById(tenantId, returnId);
    assertValidSupplierReturnTransition(ret.status, 'DISPATCHED');

    // Resolve warehouse locations for stock depletion
    const locations = await this.locationsService.getLocations(tenantId, ret.warehouse_id);
    const defaultLocationId = locations.length > 0 ? locations[0]?.id : undefined;

    if (!defaultLocationId) {
      throw new BadRequestException(`No storage locations found in warehouse '${ret.warehouse_id}' to dispatch return.`);
    }

    const now = new Date().toISOString();

    // Post authoritative stock ledger depletion movements
    if (ret.lines) {
      for (const line of ret.lines) {
        const sourceLocId = line.source_location_id ?? defaultLocationId;
        await this.stockLedgerService.postMovement(tenantId, dispatchedBy, {
          idempotency_key: `supplier-return:${ret.id}:line:${line.id}`,
          movement_type: 'SUPPLIER_RETURN',
          reference_type: 'PURCHASE_ORDER',
          reference_id: ret.purchase_order_id,
          variant_id: line.variant_id,
          source_warehouse_id: ret.warehouse_id,
          source_location_id: sourceLocId,
          quantity: line.quantity,
          unit_cost_minor: line.unit_cost_minor,
          notes: `Supplier Return ${ret.return_number}: ${ret.reason}`,
        });
      }
    }

    ret.status = 'DISPATCHED';
    ret.dispatched_at = now;
    ret.carrier = input.carrier ?? null;
    ret.tracking_number = input.tracking_number ?? null;
    if (input.notes) {
      ret.notes = ret.notes ? `${ret.notes}\n[Dispatch]: ${input.notes}` : input.notes;
    }
    ret.updated_at = now;

    return ret;
  }

  async complete(tenantId: string, returnId: string): Promise<SupplierReturn> {
    const ret = await this.getById(tenantId, returnId);
    assertValidSupplierReturnTransition(ret.status, 'COMPLETED');

    ret.status = 'COMPLETED';
    ret.updated_at = new Date().toISOString();
    return ret;
  }

  async cancel(tenantId: string, returnId: string, reason?: string): Promise<SupplierReturn> {
    const ret = await this.getById(tenantId, returnId);
    assertValidSupplierReturnTransition(ret.status, 'CANCELLED');

    ret.status = 'CANCELLED';
    if (reason) {
      ret.notes = ret.notes ? `${ret.notes}\n[Cancelled]: ${reason}` : `[Cancelled]: ${reason}`;
    }
    ret.updated_at = new Date().toISOString();
    return ret;
  }
}
