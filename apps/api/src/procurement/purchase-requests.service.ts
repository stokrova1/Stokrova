import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PurchaseRequest,
  PurchaseRequestLine,
  PurchaseRequestStatus,
  CreatePurchaseRequestInput,
  ApprovePurchaseRequestInput,
  ConvertPurchaseRequestInput,
  PurchaseOrder,
} from '@stokrova/contracts';
import {
  assertValidPurchaseRequestTransition,
  generateUuidV7,
} from '@stokrova/domain';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { SuppliersService } from './suppliers.service.js';

@Injectable()
export class PurchaseRequestsService {
  private purchaseRequestsStore = new DurableMap<PurchaseRequest>('purchase_requests');
  private prCounter = 3000;

  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly warehousesService: WarehousesService,
    private readonly variantsService: VariantsService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(
    tenantId: string,
    input: CreatePurchaseRequestInput,
    requestedBy = 'usr_requisitioner',
  ): Promise<PurchaseRequest> {
    await this.warehousesService.getWarehouseById(tenantId, input.destination_warehouse_id);

    if (input.preferred_supplier_id) {
      await this.suppliersService.getSupplierById(tenantId, input.preferred_supplier_id);
    }

    if (!input.lines || input.lines.length === 0) {
      throw new BadRequestException('Purchase request must contain at least one item line.');
    }

    const requestId = generateUuidV7();
    this.prCounter += 1;
    const requestNumber = `PR-${this.prCounter}`;

    let estimatedTotal = 0n;
    const lines: PurchaseRequestLine[] = [];
    let lineIdx = 1;

    for (const lineInput of input.lines) {
      await this.variantsService.getVariantById(tenantId, lineInput.variant_id);

      const unitCost = BigInt(lineInput.estimated_unit_cost_minor ?? '0');
      const lineTotal = BigInt(lineInput.quantity) * unitCost;
      estimatedTotal += lineTotal;

      const lineId = generateUuidV7();
      lines.push({
        id: lineId,
        tenant_id: tenantId,
        request_id: requestId,
        line_number: lineIdx++,
        variant_id: lineInput.variant_id,
        quantity: lineInput.quantity,
        estimated_unit_cost_minor: unitCost.toString(),
        estimated_line_total_minor: lineTotal.toString(),
        notes: lineInput.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();
    const pr: PurchaseRequest = {
      id: requestId,
      tenant_id: tenantId,
      request_number: requestNumber,
      requested_by: requestedBy,
      branch_id: input.branch_id ?? null,
      destination_warehouse_id: input.destination_warehouse_id,
      status: 'DRAFT',
      required_by_date: input.required_by_date ?? null,
      estimated_total_minor: estimatedTotal.toString(),
      preferred_supplier_id: input.preferred_supplier_id ?? null,
      business_justification: input.business_justification ?? null,
      notes: input.notes ?? null,
      approved_by: null,
      approved_at: null,
      converted_purchase_order_id: null,
      created_at: now,
      updated_at: now,
      lines,
    };

    this.purchaseRequestsStore.set(`${tenantId}:${requestId}`, pr);
    return pr;
  }

  async getById(tenantId: string, requestId: string): Promise<PurchaseRequest> {
    const pr = this.purchaseRequestsStore.get(`${tenantId}:${requestId}`);
    if (!pr) {
      throw new NotFoundException(`Purchase Request '${requestId}' not found for tenant '${tenantId}'.`);
    }
    return pr;
  }

  async list(
    tenantId: string,
    filters?: { status?: PurchaseRequestStatus },
  ): Promise<PurchaseRequest[]> {
    const results: PurchaseRequest[] = [];
    for (const [key, pr] of this.purchaseRequestsStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (filters?.status && pr.status !== filters.status) continue;
        results.push(pr);
      }
    }
    return results;
  }

  async submit(tenantId: string, requestId: string): Promise<PurchaseRequest> {
    const pr = await this.getById(tenantId, requestId);
    assertValidPurchaseRequestTransition(pr.status, 'SUBMITTED');

    pr.status = 'SUBMITTED';
    pr.updated_at = new Date().toISOString();
    return pr;
  }

  async approve(
    tenantId: string,
    requestId: string,
    input: ApprovePurchaseRequestInput,
  ): Promise<PurchaseRequest> {
    const pr = await this.getById(tenantId, requestId);
    assertValidPurchaseRequestTransition(pr.status, 'APPROVED');

    const now = new Date().toISOString();
    pr.status = 'APPROVED';
    pr.approved_by = input.approved_by;
    pr.approved_at = now;
    if (input.notes) {
      pr.notes = pr.notes ? `${pr.notes}\n[Approval]: ${input.notes}` : input.notes;
    }
    pr.updated_at = now;
    return pr;
  }

  async reject(
    tenantId: string,
    requestId: string,
    rejectedBy: string,
    reason?: string,
  ): Promise<PurchaseRequest> {
    const pr = await this.getById(tenantId, requestId);
    assertValidPurchaseRequestTransition(pr.status, 'REJECTED');

    const now = new Date().toISOString();
    pr.status = 'REJECTED';
    pr.notes = pr.notes
      ? `${pr.notes}\n[Rejected by ${rejectedBy}]: ${reason ?? 'No reason provided'}`
      : `[Rejected by ${rejectedBy}]: ${reason ?? 'No reason provided'}`;
    pr.updated_at = now;
    return pr;
  }

  async cancel(
    tenantId: string,
    requestId: string,
    cancelledBy?: string,
    reason?: string,
  ): Promise<PurchaseRequest> {
    const pr = await this.getById(tenantId, requestId);
    assertValidPurchaseRequestTransition(pr.status, 'CANCELLED');

    const now = new Date().toISOString();
    pr.status = 'CANCELLED';
    if (reason) {
      pr.notes = pr.notes
        ? `${pr.notes}\n[Cancelled by ${cancelledBy ?? 'user'}]: ${reason}`
        : `[Cancelled by ${cancelledBy ?? 'user'}]: ${reason}`;
    }
    pr.updated_at = now;
    return pr;
  }

  async convertToPurchaseOrder(
    tenantId: string,
    requestId: string,
    input: ConvertPurchaseRequestInput,
  ): Promise<{ request: PurchaseRequest; order: PurchaseOrder }> {
    const pr = await this.getById(tenantId, requestId);
    if (pr.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot convert Purchase Request '${requestId}' with status '${pr.status}'. Must be APPROVED.`,
      );
    }

    const supplierId = input.supplier_id || pr.preferred_supplier_id;
    if (!supplierId) {
      throw new BadRequestException('A supplier must be specified to convert purchase request to purchase order.');
    }

    // Create the PO with lines from the PR
    const poLines = (pr.lines ?? []).map((line) => ({
      variant_id: line.variant_id,
      quantity: line.quantity,
      unit_cost_minor: line.estimated_unit_cost_minor,
      notes: line.notes ?? undefined,
    }));

    const po = await this.poService.create(tenantId, {
      supplier_id: supplierId,
      destination_warehouse_id: pr.destination_warehouse_id,
      notes: input.notes ?? `Generated from Requisition ${pr.request_number}`,
      lines: poLines,
    });

    assertValidPurchaseRequestTransition(pr.status, 'CONVERTED');
    const now = new Date().toISOString();
    pr.status = 'CONVERTED';
    pr.converted_purchase_order_id = po.id;
    pr.updated_at = now;

    return { request: pr, order: po };
  }
}
