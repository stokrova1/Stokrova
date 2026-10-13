import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PurchaseRfq,
  PurchaseRfqLine,
  PurchaseRfqSupplier,
  PurchaseRfqStatus,
  CreatePurchaseRfqInput,
} from '@stokrova/contracts';
import {
  assertValidRfqTransition,
  generateUuidV7,
} from '@stokrova/domain';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { SuppliersService } from './suppliers.service.js';

@Injectable()
export class RfqsService {
  private rfqStore = new Map<string, PurchaseRfq>();
  private rfqCounter = 4000;

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly variantsService: VariantsService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(
    tenantId: string,
    input: CreatePurchaseRfqInput,
    createdBy = 'usr_buyer',
  ): Promise<PurchaseRfq> {
    await this.warehousesService.getWarehouseById(tenantId, input.destination_warehouse_id);

    if (!input.lines || input.lines.length === 0) {
      throw new BadRequestException('RFQ must contain at least one line item.');
    }

    if (!input.supplier_ids || input.supplier_ids.length === 0) {
      throw new BadRequestException('RFQ must invite at least one supplier.');
    }

    // Verify suppliers exist
    for (const supId of input.supplier_ids) {
      await this.suppliersService.getSupplierById(tenantId, supId);
    }

    // Verify variants exist
    for (const line of input.lines) {
      await this.variantsService.getVariantById(tenantId, line.variant_id);
    }

    const rfqId = generateUuidV7();
    this.rfqCounter += 1;
    const rfqNumber = `RFQ-${this.rfqCounter}`;
    const now = new Date().toISOString();

    let lineIdx = 1;
    const lines: PurchaseRfqLine[] = input.lines.map((l) => ({
      id: generateUuidV7(),
      tenant_id: tenantId,
      rfq_id: rfqId,
      line_number: lineIdx++,
      variant_id: l.variant_id,
      quantity: l.quantity,
      target_unit_cost_minor: l.target_unit_cost_minor ? l.target_unit_cost_minor.toString() : null,
      notes: l.notes ?? null,
      created_at: now,
      updated_at: now,
    }));

    const suppliers: PurchaseRfqSupplier[] = input.supplier_ids.map((supId) => ({
      id: generateUuidV7(),
      tenant_id: tenantId,
      rfq_id: rfqId,
      supplier_id: supId,
      status: 'INVITED',
      invited_at: now,
      responded_at: null,
    }));

    const rfq: PurchaseRfq = {
      id: rfqId,
      tenant_id: tenantId,
      rfq_number: rfqNumber,
      purchase_request_id: input.purchase_request_id ?? null,
      destination_warehouse_id: input.destination_warehouse_id,
      status: 'DRAFT',
      response_deadline: input.response_deadline ?? null,
      currency_code: input.currency_code ?? 'USD',
      notes: input.notes ?? null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
      lines,
      suppliers,
    };

    this.rfqStore.set(`${tenantId}:${rfqId}`, rfq);
    return rfq;
  }

  async getById(tenantId: string, rfqId: string): Promise<PurchaseRfq> {
    const rfq = this.rfqStore.get(`${tenantId}:${rfqId}`);
    if (!rfq) {
      throw new NotFoundException(`RFQ '${rfqId}' not found for tenant '${tenantId}'.`);
    }
    return rfq;
  }

  async list(tenantId: string, filters?: { status?: PurchaseRfqStatus }): Promise<PurchaseRfq[]> {
    const results: PurchaseRfq[] = [];
    for (const [key, rfq] of this.rfqStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (filters?.status && rfq.status !== filters.status) continue;
        results.push(rfq);
      }
    }
    return results;
  }

  async issue(tenantId: string, rfqId: string): Promise<PurchaseRfq> {
    const rfq = await this.getById(tenantId, rfqId);
    assertValidRfqTransition(rfq.status, 'ISSUED');

    rfq.status = 'ISSUED';
    rfq.updated_at = new Date().toISOString();
    return rfq;
  }

  async close(tenantId: string, rfqId: string): Promise<PurchaseRfq> {
    const rfq = await this.getById(tenantId, rfqId);
    assertValidRfqTransition(rfq.status, 'CLOSED');

    rfq.status = 'CLOSED';
    rfq.updated_at = new Date().toISOString();
    return rfq;
  }

  async cancel(tenantId: string, rfqId: string, reason?: string): Promise<PurchaseRfq> {
    const rfq = await this.getById(tenantId, rfqId);
    assertValidRfqTransition(rfq.status, 'CANCELLED');

    rfq.status = 'CANCELLED';
    if (reason) {
      rfq.notes = rfq.notes ? `${rfq.notes}\n[Cancelled]: ${reason}` : `[Cancelled]: ${reason}`;
    }
    rfq.updated_at = new Date().toISOString();
    return rfq;
  }

  recordSupplierResponse(tenantId: string, rfqId: string, supplierId: string): void {
    const rfq = this.rfqStore.get(`${tenantId}:${rfqId}`);
    if (!rfq || !rfq.suppliers) return;

    const supRecord = rfq.suppliers.find((s) => s.supplier_id === supplierId);
    if (supRecord) {
      supRecord.status = 'QUOTED';
      supRecord.responded_at = new Date().toISOString();
      rfq.updated_at = new Date().toISOString();
    }
  }
}
