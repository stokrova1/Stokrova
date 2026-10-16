import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PurchaseInvoice,
  PurchaseInvoiceLine,
  CreatePurchaseInvoiceRequest,
} from '@stokrova/contracts';
import {
  verifyThreeWayMatch,
  generateUuidV7,
} from '@stokrova/domain';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { GoodsReceiptService } from './goods-receipt.service.js';
import { SuppliersService } from './suppliers.service.js';

@Injectable()
export class PurchaseInvoicesService {
  private invoicesStore = new DurableMap<PurchaseInvoice>('purchase_invoices');

  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly grnService: GoodsReceiptService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(
    tenantId: string,
    request: CreatePurchaseInvoiceRequest,
  ): Promise<PurchaseInvoice> {
    await this.suppliersService.getSupplierById(tenantId, request.supplier_id);
    const po = await this.poService.getById(tenantId, request.purchase_order_id);

    let grnLinesMap = new Map<string, number>();
    if (request.goods_receipt_id) {
      const grn = await this.grnService.getById(tenantId, request.goods_receipt_id);
      if (grn.lines) {
        for (const line of grn.lines) {
          grnLinesMap.set(line.id, line.quantity_accepted);
          grnLinesMap.set(line.purchase_order_line_id, line.quantity_accepted);
        }
      }
    }

    if (!request.lines || request.lines.length === 0) {
      throw new BadRequestException('Purchase invoice must contain at least one line item.');
    }

    const invoiceId = generateUuidV7();
    const createdLines: PurchaseInvoiceLine[] = [];
    const matchItems = [];

    let subtotalMinor = 0n;
    let taxMinor = 0n;

    for (const lineReq of request.lines) {
      const poLine = po.lines?.find((l) => l.id === lineReq.purchase_order_line_id);
      if (!poLine) {
        throw new NotFoundException(
          `Purchase Order line '${lineReq.purchase_order_line_id}' not found in PO '${po.id}'.`,
        );
      }

      const unitPrice = BigInt(lineReq.unit_price_minor);
      const lineSubtotal = BigInt(lineReq.quantity_invoiced) * unitPrice;
      const taxBps = BigInt(lineReq.tax_rate_basis_points ?? 0);
      const lineTax = (lineSubtotal * taxBps) / 10000n;
      const lineTotal = lineSubtotal + lineTax;

      subtotalMinor += lineSubtotal;
      taxMinor += lineTax;

      const grnAccepted =
        (lineReq.goods_receipt_line_id ? grnLinesMap.get(lineReq.goods_receipt_line_id) : undefined) ??
        grnLinesMap.get(lineReq.purchase_order_line_id) ??
        poLine.received_quantity;

      matchItems.push({
        po_quantity: poLine.quantity,
        po_unit_cost_minor: BigInt(poLine.unit_cost_minor),
        grn_accepted_quantity: grnAccepted,
        invoiced_quantity: lineReq.quantity_invoiced,
        invoiced_unit_cost_minor: unitPrice,
      });

      const lineId = generateUuidV7();
      createdLines.push({
        id: lineId,
        tenant_id: tenantId,
        invoice_id: invoiceId,
        purchase_order_line_id: lineReq.purchase_order_line_id,
        goods_receipt_line_id: lineReq.goods_receipt_line_id ?? null,
        variant_id: lineReq.variant_id,
        quantity_invoiced: lineReq.quantity_invoiced,
        unit_price_minor: unitPrice.toString(),
        tax_rate_basis_points: lineReq.tax_rate_basis_points ?? 0,
        line_subtotal_minor: lineSubtotal.toString(),
        line_tax_minor: lineTax.toString(),
        line_total_minor: lineTotal.toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Execute 3-Way Matching engine
    const matchResult = verifyThreeWayMatch(matchItems);

    const totalMinor = subtotalMinor + taxMinor;
    const now = new Date().toISOString();

    const invoice: PurchaseInvoice = {
      id: invoiceId,
      tenant_id: tenantId,
      invoice_number: request.invoice_number,
      supplier_invoice_reference: request.supplier_invoice_reference,
      supplier_id: request.supplier_id,
      purchase_order_id: request.purchase_order_id,
      goods_receipt_id: request.goods_receipt_id ?? null,
      invoice_date: request.invoice_date,
      due_date: request.due_date,
      status: matchResult.match_status === 'PERFECT_MATCH' ? 'MATCHED' : 'DISCREPANCY',
      match_status: matchResult.match_status,
      currency_code: request.currency_code ?? 'USD',
      subtotal_minor: subtotalMinor.toString(),
      tax_minor: taxMinor.toString(),
      total_minor: totalMinor.toString(),
      amount_paid_minor: '0',
      price_variance_minor: matchResult.price_variance_minor,
      quantity_variance: matchResult.quantity_variance,
      discrepancy_notes:
        matchResult.discrepancies.length > 0
          ? matchResult.discrepancies.map((d) => d.reason).join(' | ')
          : null,
      approved_by: null,
      approved_at: null,
      created_at: now,
      updated_at: now,
      lines: createdLines,
    };

    this.invoicesStore.set(`${tenantId}:${invoiceId}`, invoice);
    return invoice;
  }

  async getById(tenantId: string, invoiceId: string): Promise<PurchaseInvoice> {
    const inv = this.invoicesStore.get(`${tenantId}:${invoiceId}`);
    if (!inv) {
      throw new NotFoundException(`Purchase Invoice '${invoiceId}' not found for tenant '${tenantId}'.`);
    }
    return inv;
  }

  async list(
    tenantId: string,
    supplierId?: string,
    poId?: string,
  ): Promise<PurchaseInvoice[]> {
    const invoices: PurchaseInvoice[] = [];
    for (const [key, inv] of this.invoicesStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (supplierId && inv.supplier_id !== supplierId) continue;
        if (poId && inv.purchase_order_id !== poId) continue;
        invoices.push(inv);
      }
    }
    return invoices;
  }

  async approve(
    tenantId: string,
    invoiceId: string,
    approvedBy: string,
  ): Promise<PurchaseInvoice> {
    const invoice = await this.getById(tenantId, invoiceId);
    if (invoice.status === 'APPROVED') {
      return invoice;
    }
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot approve a cancelled Purchase Invoice.');
    }

    const now = new Date().toISOString();
    invoice.status = 'APPROVED';
    invoice.approved_by = approvedBy;
    invoice.approved_at = now;
    invoice.updated_at = now;

    // Update PO line billed quantities and check auto-close
    if (invoice.lines) {
      for (const line of invoice.lines) {
        this.poService.updateLineBilledQuantity(
          tenantId,
          invoice.purchase_order_id,
          line.purchase_order_line_id,
          line.quantity_invoiced,
        );
      }
    }

    return invoice;
  }

  async recordPayment(
    tenantId: string,
    invoiceId: string,
    amountMinor: bigint,
  ): Promise<PurchaseInvoice> {
    const invoice = await this.getById(tenantId, invoiceId);
    const currentPaid = BigInt(invoice.amount_paid_minor ?? '0');
    const newPaid = currentPaid + amountMinor;
    invoice.amount_paid_minor = newPaid.toString();
    const total = BigInt(invoice.total_minor);
    if (newPaid >= total) {
      invoice.status = 'PAID';
    }
    invoice.updated_at = new Date().toISOString();
    return invoice;
  }
}
