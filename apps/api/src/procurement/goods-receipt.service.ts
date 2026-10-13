import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  GoodsReceiptNote,
  GoodsReceiptLine,
  CreateGoodsReceiptRequest,
  InspectGoodsReceiptRequest,
} from '@stokrova/contracts';
import {
  assertValidOverReceipt,
  assertValidInspectionQuantities,
  generateUuidV7,
} from '@stokrova/domain';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { BatchesService } from '../tracking/batches.service.js';

@Injectable()
export class GoodsReceiptService {
  private goodsReceiptsStore = new Map<string, GoodsReceiptNote>();
  private idempotencyStore = new Map<string, string>();
  private grnCounter = 5000;

  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly batchesService: BatchesService,
  ) {}

  async create(tenantId: string, request: CreateGoodsReceiptRequest): Promise<GoodsReceiptNote> {
    if (request.idempotency_key) {
      const existingGrnId = this.idempotencyStore.get(`${tenantId}:${request.idempotency_key}`);
      if (existingGrnId) {
        return this.getById(tenantId, existingGrnId);
      }
    }

    const po = await this.poService.getById(tenantId, request.purchase_order_id);
    if (po.status !== 'ISSUED' && po.status !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException(
        `Cannot receive goods against Purchase Order in status '${po.status}'. Must be ISSUED or PARTIALLY_RECEIVED.`,
      );
    }

    await this.warehousesService.getWarehouseById(tenantId, request.destination_warehouse_id);

    if (!request.lines || request.lines.length === 0) {
      throw new BadRequestException('Goods Receipt must contain at least one line item.');
    }

    const grnId = generateUuidV7();
    this.grnCounter += 1;
    const grnNumber = `GRN-${this.grnCounter}`;

    const receiptLines: GoodsReceiptLine[] = [];

    for (const lineReq of request.lines) {
      const poLine = po.lines?.find((l) => l.id === lineReq.purchase_order_line_id);
      if (!poLine) {
        throw new NotFoundException(
          `Purchase Order line '${lineReq.purchase_order_line_id}' not found in PO '${po.id}'.`,
        );
      }

      // 500 bps (5%) default tolerance
      assertValidOverReceipt(poLine.quantity, poLine.received_quantity, lineReq.quantity_received, 500);

      // Verify target location exists
      await this.locationsService.getLocationById(tenantId, lineReq.target_location_id);
      if (lineReq.quarantine_location_id) {
        await this.locationsService.getLocationById(tenantId, lineReq.quarantine_location_id);
      }

      const accepted = lineReq.quantity_accepted;
      const quarantined = lineReq.quantity_quarantined ?? 0;
      const rejected = lineReq.quantity_rejected ?? 0;

      assertValidInspectionQuantities(lineReq.quantity_received, accepted, quarantined, rejected);

      const lineId = generateUuidV7();
      receiptLines.push({
        id: lineId,
        tenant_id: tenantId,
        goods_receipt_id: grnId,
        purchase_order_line_id: lineReq.purchase_order_line_id,
        variant_id: lineReq.variant_id,
        quantity_received: lineReq.quantity_received,
        quantity_accepted: accepted,
        quantity_quarantined: quarantined,
        quantity_rejected: rejected,
        quarantine_reason: lineReq.quarantine_reason ?? null,
        lot_number: lineReq.lot_number ?? null,
        internal_batch_number: lineReq.internal_batch_number ?? null,
        expiration_date: lineReq.expiration_date ?? null,
        serial_numbers: lineReq.serial_numbers ?? [],
        target_location_id: lineReq.target_location_id,
        quarantine_location_id: lineReq.quarantine_location_id ?? null,
        unit_cost_minor: lineReq.unit_cost_minor
          ? lineReq.unit_cost_minor.toString()
          : poLine.unit_cost_minor,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();
    const grn: GoodsReceiptNote = {
      id: grnId,
      tenant_id: tenantId,
      grn_number: grnNumber,
      purchase_order_id: po.id,
      supplier_id: po.supplier_id,
      destination_warehouse_id: request.destination_warehouse_id,
      status: 'IN_INSPECTION',
      carrier: request.carrier ?? null,
      tracking_number: request.tracking_number ?? null,
      received_by: request.received_by,
      received_at: now,
      inspected_by: null,
      inspected_at: null,
      notes: request.notes ?? null,
      idempotency_key: request.idempotency_key ?? null,
      created_at: now,
      updated_at: now,
      lines: receiptLines,
    };

    if (request.idempotency_key) {
      this.idempotencyStore.set(`${tenantId}:${request.idempotency_key}`, grnId);
    }

    this.goodsReceiptsStore.set(`${tenantId}:${grnId}`, grn);
    return grn;
  }

  async getById(tenantId: string, grnId: string): Promise<GoodsReceiptNote> {
    const grn = this.goodsReceiptsStore.get(`${tenantId}:${grnId}`);
    if (!grn) {
      throw new NotFoundException(`Goods Receipt Note '${grnId}' not found for tenant '${tenantId}'.`);
    }
    return grn;
  }

  async list(tenantId: string, poId?: string): Promise<GoodsReceiptNote[]> {
    const receipts: GoodsReceiptNote[] = [];
    for (const [key, grn] of this.goodsReceiptsStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (poId && grn.purchase_order_id !== poId) continue;
        receipts.push(grn);
      }
    }
    return receipts;
  }

  async inspect(
    tenantId: string,
    grnId: string,
    request: InspectGoodsReceiptRequest,
  ): Promise<GoodsReceiptNote> {
    const grn = await this.getById(tenantId, grnId);
    if (grn.status !== 'IN_INSPECTION') {
      throw new BadRequestException(
        `Cannot record inspection for Goods Receipt in status '${grn.status}'. Must be IN_INSPECTION.`,
      );
    }

    for (const lineInsp of request.line_inspections) {
      const line = grn.lines?.find((l) => l.id === lineInsp.goods_receipt_line_id);
      if (!line) {
        throw new NotFoundException(
          `Goods Receipt Line '${lineInsp.goods_receipt_line_id}' not found.`,
        );
      }

      assertValidInspectionQuantities(
        line.quantity_received,
        lineInsp.quantity_accepted,
        lineInsp.quantity_quarantined,
        lineInsp.quantity_rejected,
      );

      line.quantity_accepted = lineInsp.quantity_accepted;
      line.quantity_quarantined = lineInsp.quantity_quarantined;
      line.quantity_rejected = lineInsp.quantity_rejected;
      line.quarantine_reason = lineInsp.quarantine_reason ?? line.quarantine_reason;
      line.quarantine_location_id = lineInsp.quarantine_location_id ?? line.quarantine_location_id;
      line.updated_at = new Date().toISOString();
    }

    const now = new Date().toISOString();
    grn.inspected_by = request.inspected_by;
    grn.inspected_at = now;
    if (request.notes) {
      grn.notes = grn.notes ? `${grn.notes}\n[Inspection]: ${request.notes}` : request.notes;
    }
    grn.updated_at = now;
    return grn;
  }

  async complete(tenantId: string, grnId: string): Promise<GoodsReceiptNote> {
    const grn = await this.getById(tenantId, grnId);
    if (grn.status === 'COMPLETED') {
      return grn;
    }

    const now = new Date().toISOString();

    // Credit stock ledger for accepted and quarantined quantities
    if (grn.lines) {
      for (const line of grn.lines) {
        let batchId: string | null = null;
        if (line.lot_number || line.internal_batch_number) {
          const batchCode = line.internal_batch_number || line.lot_number!;
          try {
            const batch = await this.batchesService.createBatch(tenantId, {
              variant_id: line.variant_id,
              batch_number: batchCode,
              expiry_date: line.expiration_date ?? undefined,
            });
            batchId = batch.id;
          } catch {
            const existingBatches = await this.batchesService.getBatches(tenantId, line.variant_id);
            const found = existingBatches.find((b) => b.batch_number === batchCode);
            batchId = found ? found.id : null;
          }
        }

        // Post accepted quantity to available location
        if (line.quantity_accepted > 0) {
          await this.stockLedgerService.postMovement(tenantId, grn.received_by, {
            idempotency_key: `grn:${grn.id}:line:${line.id}:accepted`,
            movement_type: 'PURCHASE_RECEIPT',
            reference_type: 'PURCHASE_ORDER',
            reference_id: grn.purchase_order_id,
            variant_id: line.variant_id,
            destination_warehouse_id: grn.destination_warehouse_id,
            destination_location_id: line.target_location_id,
            quantity: line.quantity_accepted,
            unit_cost_minor: line.unit_cost_minor,
            batch_id: batchId,
            notes: `GRN ${grn.grn_number} accepted receipt`,
          });
        }

        // Post quarantined quantity if location specified
        if (line.quantity_quarantined > 0 && line.quarantine_location_id) {
          await this.stockLedgerService.postMovement(tenantId, grn.received_by, {
            idempotency_key: `grn:${grn.id}:line:${line.id}:quarantine`,
            movement_type: 'QUARANTINE_MOVE',
            reference_type: 'PURCHASE_ORDER',
            reference_id: grn.purchase_order_id,
            variant_id: line.variant_id,
            destination_warehouse_id: grn.destination_warehouse_id,
            destination_location_id: line.quarantine_location_id,
            quantity: line.quantity_quarantined,
            unit_cost_minor: line.unit_cost_minor,
            batch_id: batchId,
            notes: `GRN ${grn.grn_number} quarantined: ${line.quarantine_reason ?? 'Inspection pending'}`,
          });
        }

        // Update PO received quantity
        const totalReceivedLine = line.quantity_accepted + line.quantity_quarantined;
        this.poService.updateLineReceivedQuantity(
          tenantId,
          grn.purchase_order_id,
          line.purchase_order_line_id,
          totalReceivedLine,
        );
      }
    }

    grn.status = 'COMPLETED';
    grn.updated_at = now;
    return grn;
  }
}
