import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SupplierQuotation,
  SupplierQuotationLine,
  SupplierQuotationStatus,
  CreateSupplierQuotationInput,
  SupplierQuotationComparisonResult,
  PurchaseOrder,
} from '@stokrova/contracts';
import {
  assertValidSupplierQuotationTransition,
  evaluateSupplierQuotationComparison,
  generateUuidV7,
} from '@stokrova/domain';
import { SuppliersService } from './suppliers.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { RfqsService } from './rfqs.service.js';

@Injectable()
export class SupplierQuotationsService {
  private quotationsStore = new Map<string, SupplierQuotation>();
  private quotationCounter = 6000;

  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly variantsService: VariantsService,
    private readonly poService: PurchaseOrdersService,
    private readonly rfqsService: RfqsService,
  ) {}

  async create(tenantId: string, input: CreateSupplierQuotationInput): Promise<SupplierQuotation> {
    const supRes = await this.suppliersService.getSupplierById(tenantId, input.supplier_id);
    const supplier = supRes.supplier;

    if (!input.lines || input.lines.length === 0) {
      throw new BadRequestException('Supplier quotation must contain at least one line item.');
    }

    const quotationId = generateUuidV7();
    this.quotationCounter += 1;
    const quotationNumber = `SQ-${this.quotationCounter}`;
    const now = new Date().toISOString();

    let subtotalMinor = 0n;
    let taxMinor = 0n;
    const lines: SupplierQuotationLine[] = [];
    let lineIdx = 1;

    for (const lineReq of input.lines) {
      await this.variantsService.getVariantById(tenantId, lineReq.variant_id);

      const unitCost = BigInt(lineReq.unit_cost_minor);
      const discount = lineReq.discount_minor ? BigInt(lineReq.discount_minor) : 0n;
      const grossSubtotal = BigInt(lineReq.quantity) * unitCost;
      const netSubtotal = grossSubtotal > discount ? grossSubtotal - discount : 0n;
      const taxBps = BigInt(lineReq.tax_rate_basis_points ?? 0);
      const lineTax = (netSubtotal * taxBps) / 10000n;
      const lineTotal = netSubtotal + lineTax;

      subtotalMinor += netSubtotal;
      taxMinor += lineTax;

      lines.push({
        id: generateUuidV7(),
        tenant_id: tenantId,
        quotation_id: quotationId,
        line_number: lineIdx++,
        variant_id: lineReq.variant_id,
        quantity: lineReq.quantity,
        unit_cost_minor: unitCost.toString(),
        discount_minor: discount.toString(),
        tax_rate_basis_points: lineReq.tax_rate_basis_points ?? 0,
        line_total_minor: lineTotal.toString(),
        lead_time_days: lineReq.lead_time_days ?? input.lead_time_days ?? null,
        notes: lineReq.notes ?? null,
        created_at: now,
        updated_at: now,
      });
    }

    const totalMinor = subtotalMinor + taxMinor;

    const quotation: SupplierQuotation = {
      id: quotationId,
      tenant_id: tenantId,
      quotation_number: quotationNumber,
      supplier_quotation_reference: input.supplier_quotation_reference,
      supplier_id: input.supplier_id,
      rfq_id: input.rfq_id ?? null,
      status: 'RECEIVED',
      currency_code: input.currency_code ?? supplier.currency_code,
      subtotal_minor: subtotalMinor.toString(),
      tax_minor: taxMinor.toString(),
      total_minor: totalMinor.toString(),
      lead_time_days: input.lead_time_days ?? null,
      valid_until: input.valid_until ?? null,
      payment_terms: input.payment_terms ?? supplier.payment_terms,
      notes: input.notes ?? null,
      selected_at: null,
      converted_purchase_order_id: null,
      created_at: now,
      updated_at: now,
      lines,
    };

    this.quotationsStore.set(`${tenantId}:${quotationId}`, quotation);

    if (input.rfq_id) {
      this.rfqsService.recordSupplierResponse(tenantId, input.rfq_id, input.supplier_id);
    }

    return quotation;
  }

  async getById(tenantId: string, quotationId: string): Promise<SupplierQuotation> {
    const q = this.quotationsStore.get(`${tenantId}:${quotationId}`);
    if (!q) {
      throw new NotFoundException(`Supplier Quotation '${quotationId}' not found for tenant '${tenantId}'.`);
    }
    return q;
  }

  async list(
    tenantId: string,
    filters?: { supplierId?: string; rfqId?: string; status?: SupplierQuotationStatus },
  ): Promise<SupplierQuotation[]> {
    const results: SupplierQuotation[] = [];
    for (const [key, q] of this.quotationsStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (filters?.supplierId && q.supplier_id !== filters.supplierId) continue;
        if (filters?.rfqId && q.rfq_id !== filters.rfqId) continue;
        if (filters?.status && q.status !== filters.status) continue;
        results.push(q);
      }
    }
    return results;
  }

  async compare(tenantId: string, rfqId: string): Promise<SupplierQuotationComparisonResult> {
    const quotes = await this.list(tenantId, { rfqId });
    if (quotes.length === 0) {
      return { rfq_id: rfqId, comparisons: [], recommended_quotation_id: null };
    }

    const candidates = [];
    for (const q of quotes) {
      let supplierName = 'Unknown';
      try {
        const sup = await this.suppliersService.getSupplierById(tenantId, q.supplier_id);
        supplierName = sup.supplier.name;
      } catch {
        // Fallback
      }

      candidates.push({
        id: q.id,
        quotation_number: q.quotation_number,
        supplier_id: q.supplier_id,
        supplier_name: supplierName,
        total_minor: BigInt(q.total_minor),
        lead_time_days: q.lead_time_days,
        payment_terms: q.payment_terms,
        valid_until: q.valid_until,
        status: q.status,
      });
    }

    const report = evaluateSupplierQuotationComparison(candidates);

    return {
      rfq_id: rfqId,
      comparisons: report.candidates,
      recommended_quotation_id: report.recommended_quotation_id,
    };
  }

  async select(tenantId: string, quotationId: string): Promise<SupplierQuotation> {
    const quotation = await this.getById(tenantId, quotationId);
    assertValidSupplierQuotationTransition(quotation.status, 'SELECTED');

    const now = new Date().toISOString();
    quotation.status = 'SELECTED';
    quotation.selected_at = now;
    quotation.updated_at = now;

    // Reject competing quotes for the same RFQ
    if (quotation.rfq_id) {
      const competing = await this.list(tenantId, { rfqId: quotation.rfq_id });
      for (const comp of competing) {
        if (comp.id !== quotationId && (comp.status === 'RECEIVED' || comp.status === 'UNDER_REVIEW')) {
          comp.status = 'REJECTED';
          comp.updated_at = now;
        }
      }
    }

    return quotation;
  }

  async reject(tenantId: string, quotationId: string): Promise<SupplierQuotation> {
    const quotation = await this.getById(tenantId, quotationId);
    assertValidSupplierQuotationTransition(quotation.status, 'REJECTED');

    quotation.status = 'REJECTED';
    quotation.updated_at = new Date().toISOString();
    return quotation;
  }

  async convertToPurchaseOrder(
    tenantId: string,
    quotationId: string,
    destinationWarehouseId: string,
  ): Promise<{ quotation: SupplierQuotation; order: PurchaseOrder }> {
    const quotation = await this.getById(tenantId, quotationId);
    if (quotation.status !== 'SELECTED') {
      throw new BadRequestException(
        `Cannot convert Supplier Quotation '${quotationId}' with status '${quotation.status}'. Must be SELECTED.`,
      );
    }

    const poLines = (quotation.lines ?? []).map((line) => ({
      variant_id: line.variant_id,
      quantity: line.quantity,
      unit_cost_minor: line.unit_cost_minor,
      tax_rate_basis_points: line.tax_rate_basis_points,
      notes: line.notes ?? undefined,
    }));

    const po = await this.poService.create(tenantId, {
      supplier_id: quotation.supplier_id,
      destination_warehouse_id: destinationWarehouseId,
      currency_code: quotation.currency_code,
      notes: `Generated from Supplier Quotation ${quotation.quotation_number} (Ref: ${quotation.supplier_quotation_reference})`,
      lines: poLines,
    });

    quotation.converted_purchase_order_id = po.id;
    quotation.updated_at = new Date().toISOString();

    return { quotation, order: po };
  }
}
