import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  CreatePurchaseOrderRequest,
  SubmitPurchaseOrderForApprovalRequest,
  ApprovePurchaseOrderRequest,
  RejectPurchaseOrderRequest,
  CancelPurchaseOrderRequest,
} from '@stokrova/contracts';
import {
  assertValidPoStatusTransition,
  evaluatePoApprovalRequirement,
  calculatePurchaseOrderTotals,
  assertValidSupplierMoq,
  assertEligibleSupplierStatus,
  generateUuidV7,
} from '@stokrova/domain';
import { SuppliersService } from './suppliers.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';

@Injectable()
export class PurchaseOrdersService {
  private purchaseOrdersStore = new DurableMap<PurchaseOrder>('purchase_orders');
  private poCounter = 1000;

  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly variantsService: VariantsService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async create(tenantId: string, request: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const supplierRes = await this.suppliersService.getSupplierById(tenantId, request.supplier_id);
    const supplier = supplierRes.supplier;
    assertEligibleSupplierStatus(supplier.name, supplier.status);

    await this.warehousesService.getWarehouseById(tenantId, request.destination_warehouse_id);

    if (!request.lines || request.lines.length === 0) {
      throw new BadRequestException('Purchase Order must contain at least one line item.');
    }

    const orderId = generateUuidV7();
    this.poCounter += 1;
    const poNumber = `PO-${this.poCounter}`;

    // Validate lines and supplier MOQ if mapping exists
    const lineInputs = [];
    const createdLines: PurchaseOrderLine[] = [];

    let lineIndex = 1;
    for (const lineReq of request.lines) {
      await this.variantsService.getVariantById(tenantId, lineReq.variant_id);

      // Check supplier product mapping for MOQ / increment
      const mappingsRes = await this.suppliersService.getSupplierProductMappings(
        tenantId,
        request.supplier_id,
        lineReq.variant_id,
      );
      if (mappingsRes.mappings.length > 0 && mappingsRes.mappings[0]) {
        const mapping = mappingsRes.mappings[0];
        assertValidSupplierMoq(
          lineReq.quantity,
          mapping.minimum_order_quantity,
          mapping.order_increment_quantity,
        );
      }

      lineInputs.push({
        quantity: lineReq.quantity,
        unit_cost_minor: BigInt(lineReq.unit_cost_minor),
        tax_rate_basis_points: lineReq.tax_rate_basis_points ?? 0,
      });

      const lineId = generateUuidV7();
      const unitCost = BigInt(lineReq.unit_cost_minor);
      const lineSubtotal = BigInt(lineReq.quantity) * unitCost;
      const taxBps = BigInt(lineReq.tax_rate_basis_points ?? 0);
      const lineTax = (lineSubtotal * taxBps) / 10000n;
      const lineTotal = lineSubtotal + lineTax;

      createdLines.push({
        id: lineId,
        tenant_id: tenantId,
        purchase_order_id: orderId,
        line_number: lineIndex++,
        variant_id: lineReq.variant_id,
        supplier_sku: lineReq.supplier_sku ?? null,
        quantity: lineReq.quantity,
        received_quantity: 0,
        billed_quantity: 0,
        unit_cost_minor: unitCost.toString(),
        tax_rate_basis_points: lineReq.tax_rate_basis_points ?? 0,
        line_subtotal_minor: lineSubtotal.toString(),
        line_tax_minor: lineTax.toString(),
        line_total_minor: lineTotal.toString(),
        notes: lineReq.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const discountMinor = request.discount_minor ? BigInt(request.discount_minor) : 0n;
    const totals = calculatePurchaseOrderTotals(lineInputs, discountMinor);

    const now = new Date().toISOString();
    const po: PurchaseOrder = {
      id: orderId,
      tenant_id: tenantId,
      po_number: poNumber,
      supplier_id: request.supplier_id,
      destination_warehouse_id: request.destination_warehouse_id,
      status: 'DRAFT',
      priority: request.priority ?? 'NORMAL',
      currency_code: request.currency_code ?? supplier.currency_code,
      subtotal_minor: totals.subtotal_minor.toString(),
      tax_minor: totals.tax_minor.toString(),
      discount_minor: totals.discount_minor.toString(),
      total_minor: totals.total_minor.toString(),
      notes: request.notes ?? null,
      expected_delivery_date: request.expected_delivery_date ?? null,
      approved_by: null,
      approved_at: null,
      issued_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      created_by: null,
      created_at: now,
      updated_at: now,
      lines: createdLines,
    };

    this.purchaseOrdersStore.set(`${tenantId}:${orderId}`, po);
    return po;
  }

  async getById(tenantId: string, poId: string): Promise<PurchaseOrder> {
    const po = this.purchaseOrdersStore.get(`${tenantId}:${poId}`);
    if (!po) {
      throw new NotFoundException(`Purchase Order '${poId}' not found for tenant '${tenantId}'.`);
    }
    return po;
  }

  async list(
    tenantId: string,
    supplierId?: string,
    status?: PurchaseOrderStatus,
  ): Promise<PurchaseOrder[]> {
    const orders: PurchaseOrder[] = [];
    for (const [key, po] of this.purchaseOrdersStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (supplierId && po.supplier_id !== supplierId) continue;
        if (status && po.status !== status) continue;
        orders.push(po);
      }
    }
    return orders;
  }

  async submitForApproval(
    tenantId: string,
    poId: string,
    _request: SubmitPurchaseOrderForApprovalRequest,
  ): Promise<PurchaseOrder> {
    const po = await this.getById(tenantId, poId);
    assertValidPoStatusTransition(po.status, 'PENDING_APPROVAL');

    const totalMinor = BigInt(po.total_minor);
    const approvalCheck = evaluatePoApprovalRequirement(totalMinor);

    const now = new Date().toISOString();

    if (!approvalCheck.requiresApproval) {
      // Auto-approved under threshold
      po.status = 'APPROVED';
      po.approved_by = 'SYSTEM_AUTO_APPROVAL';
      po.approved_at = now;
    } else {
      po.status = 'PENDING_APPROVAL';
    }
    po.updated_at = now;
    return po;
  }

  async approve(
    tenantId: string,
    poId: string,
    request: ApprovePurchaseOrderRequest,
  ): Promise<PurchaseOrder> {
    const po = await this.getById(tenantId, poId);
    if (po.status === 'APPROVED') {
      return po;
    }
    assertValidPoStatusTransition(po.status, 'APPROVED');

    const now = new Date().toISOString();
    po.status = 'APPROVED';
    po.approved_by = request.approved_by;
    po.approved_at = now;
    po.updated_at = now;
    return po;
  }

  async reject(
    tenantId: string,
    poId: string,
    request: RejectPurchaseOrderRequest,
  ): Promise<PurchaseOrder> {
    const po = await this.getById(tenantId, poId);
    assertValidPoStatusTransition(po.status, 'DRAFT');

    const now = new Date().toISOString();
    po.status = 'DRAFT';
    po.notes = po.notes
      ? `${po.notes}\n[Rejected by ${request.rejected_by}]: ${request.rejection_reason}`
      : `[Rejected by ${request.rejected_by}]: ${request.rejection_reason}`;
    po.updated_at = now;
    return po;
  }

  async issue(tenantId: string, poId: string): Promise<PurchaseOrder> {
    const po = await this.getById(tenantId, poId);
    assertValidPoStatusTransition(po.status, 'ISSUED');

    const now = new Date().toISOString();
    po.status = 'ISSUED';
    po.issued_at = now;
    po.updated_at = now;
    return po;
  }

  async cancel(
    tenantId: string,
    poId: string,
    request: CancelPurchaseOrderRequest,
  ): Promise<PurchaseOrder> {
    const po = await this.getById(tenantId, poId);
    assertValidPoStatusTransition(po.status, 'CANCELLED');

    const now = new Date().toISOString();
    po.status = 'CANCELLED';
    po.cancelled_at = now;
    po.cancellation_reason = request.cancellation_reason;
    po.updated_at = now;
    return po;
  }

  // Internal updater for receipt engine
  updateLineReceivedQuantity(
    tenantId: string,
    poId: string,
    poLineId: string,
    additionalQty: number,
  ): void {
    const po = this.purchaseOrdersStore.get(`${tenantId}:${poId}`);
    if (!po || !po.lines) return;

    const line = po.lines.find((l) => l.id === poLineId);
    if (line) {
      line.received_quantity += additionalQty;
      line.updated_at = new Date().toISOString();
    }

    // Check if entire PO is fulfilled
    const allReceived = po.lines.every((l) => l.received_quantity >= l.quantity);
    const anyReceived = po.lines.some((l) => l.received_quantity > 0);

    if (allReceived) {
      po.status = 'RECEIVED';
    } else if (anyReceived) {
      po.status = 'PARTIALLY_RECEIVED';
    }
    po.updated_at = new Date().toISOString();
  }

  // Internal updater for invoice engine
  updateLineBilledQuantity(
    tenantId: string,
    poId: string,
    poLineId: string,
    additionalQty: number,
  ): void {
    const po = this.purchaseOrdersStore.get(`${tenantId}:${poId}`);
    if (!po || !po.lines) return;

    const line = po.lines.find((l) => l.id === poLineId);
    if (line) {
      line.billed_quantity += additionalQty;
      line.updated_at = new Date().toISOString();
    }

    const allBilled = po.lines.every((l) => l.billed_quantity >= l.quantity);
    const allReceived = po.lines.every((l) => l.received_quantity >= l.quantity);

    if (allBilled && allReceived && (po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED')) {
      po.status = 'CLOSED';
    }
    po.updated_at = new Date().toISOString();
  }
}
