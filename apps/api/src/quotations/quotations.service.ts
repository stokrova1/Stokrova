import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  QuotationResponse,
  QuotationLineItem,
  CreateQuotationRequest,
  ConvertQuotationRequest,
  SalesOrderResponse,
} from '@stokrova/contracts';
import {
  calculateOrderLineTotals,
  calculateOrderSummary,
  canTransitionQuotationStatus,
  assertQuotationCanBeConverted,
  QuotationStatuses,
  InvalidQuotationStateTransitionError,
  QuotationDomainError,
  OrderDomainError,
} from '@stokrova/domain';
import { BranchesService } from '../work-centers/branches.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';

export interface StoredQuotation {
  id: string;
  tenant_id: string;
  quotation_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  branch_id: string;
  warehouse_id: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED';
  converted_sales_order_id: string | null;
  currency_code: string;
  valid_until: string | null;
  subtotal_minor: bigint;
  total_discount_minor: bigint;
  total_tax_minor: bigint;
  grand_total_minor: bigint;
  lines: QuotationLineItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
}

@Injectable()
export class QuotationsService {
  private quotationsStore = new Map<string, StoredQuotation>();
  private quotationSequence = 1001;

  constructor(
    private readonly branchesService: BranchesService,
    private readonly warehousesService: WarehousesService,
    private readonly variantsService: VariantsService,
    private readonly customersService: CustomersService,
    private readonly ordersService: OrdersService,
    private readonly auditService?: AuditService,
    private readonly outboxService?: OutboxService,
  ) {}

  async createQuotation(
    tenantId: string,
    userId: string,
    req: CreateQuotationRequest,
  ): Promise<QuotationResponse> {
    await this.branchesService.getBranchById(tenantId, req.branch_id);
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    let customerName = req.customer_name ?? null;
    let customerEmail = req.customer_email ?? null;
    let customerPhone = req.customer_phone ?? null;

    if (req.customer_id) {
      const customer = await this.customersService.getCustomerById(tenantId, req.customer_id);
      customerName = customer.display_name;
      customerEmail = customer.email;
      customerPhone = customer.phone;
    }

    if (!req.lines || req.lines.length === 0) {
      throw new BadRequestException('Quotation must contain at least one line item.');
    }

    const quotationId = `quot_${randomUUID().replace(/-/g, '')}`;
    const quotationNumber = `QT-${Date.now().toString().slice(-6)}-${this.quotationSequence++}`;
    const now = new Date().toISOString();

    const lineItems: QuotationLineItem[] = [];
    const calculatedLines = [];

    for (const inputLine of req.lines) {
      const variant = await this.variantsService.getVariantById(tenantId, inputLine.variant_id);

      try {
        const unitPriceMinor = inputLine.unit_price_minor
          ? BigInt(inputLine.unit_price_minor)
          : BigInt(variant.selling_price_minor || '0');
        const lineTotals = calculateOrderLineTotals({
          quantity: inputLine.quantity,
          unit_price_minor: unitPriceMinor,
          discount_minor: inputLine.discount_minor ? BigInt(inputLine.discount_minor) : 0n,
          tax_minor: inputLine.tax_minor ? BigInt(inputLine.tax_minor) : 0n,
        });

        calculatedLines.push(lineTotals);

        lineItems.push({
          id: `qtl_${randomUUID().replace(/-/g, '')}`,
          quotation_id: quotationId,
          variant_id: inputLine.variant_id,
          sku: variant.sku,
          product_name: variant.sku,
          quantity: lineTotals.quantity,
          unit_price_minor: lineTotals.unit_price_minor.toString(),
          discount_minor: lineTotals.discount_minor.toString(),
          tax_minor: lineTotals.tax_minor.toString(),
          line_total_minor: lineTotals.line_total_minor.toString(),
        });
      } catch (err) {
        if (err instanceof OrderDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    const summary = calculateOrderSummary(calculatedLines);

    const storedQuotation: StoredQuotation = {
      id: quotationId,
      tenant_id: tenantId,
      quotation_number: quotationNumber,
      customer_id: req.customer_id ?? null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      branch_id: req.branch_id,
      warehouse_id: req.warehouse_id,
      status: 'DRAFT',
      converted_sales_order_id: null,
      currency_code: req.currency_code ?? 'USD',
      valid_until: req.valid_until ?? null,
      subtotal_minor: summary.subtotal_minor,
      total_discount_minor: summary.total_discount_minor,
      total_tax_minor: summary.total_tax_minor,
      grand_total_minor: summary.grand_total_minor,
      lines: lineItems,
      notes: req.notes ?? null,
      created_at: now,
      updated_at: now,
      converted_at: null,
    };

    this.quotationsStore.set(quotationId, storedQuotation);

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'QUOTATION_CREATED',
        entity_type: 'QUOTATION',
        entity_id: quotationId,
        metadata: { quotation_number: quotationNumber, grand_total_minor: summary.grand_total_minor.toString() },
      });
    }

    return this.mapToResponse(storedQuotation);
  }

  async getQuotationById(tenantId: string, id: string): Promise<QuotationResponse> {
    const q = this.quotationsStore.get(id);
    if (!q || q.tenant_id !== tenantId) {
      throw new NotFoundException(`Quotation with ID '${id}' not found.`);
    }
    return this.mapToResponse(q);
  }

  async listQuotations(
    tenantId: string,
    filters?: {
      status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED';
      customer_id?: string;
    },
  ): Promise<QuotationResponse[]> {
    return Array.from(this.quotationsStore.values())
      .filter((q) => {
        if (q.tenant_id !== tenantId) return false;
        if (filters?.status && q.status !== filters.status) return false;
        if (filters?.customer_id && q.customer_id !== filters.customer_id) return false;
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((q) => this.mapToResponse(q));
  }

  async acceptQuotation(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<QuotationResponse> {
    const q = this.quotationsStore.get(id);
    if (!q || q.tenant_id !== tenantId) {
      throw new NotFoundException(`Quotation with ID '${id}' not found.`);
    }

    if (!canTransitionQuotationStatus(q.status, QuotationStatuses.ACCEPTED)) {
      throw new BadRequestException(
        new InvalidQuotationStateTransitionError(q.status, QuotationStatuses.ACCEPTED).message,
      );
    }

    q.status = 'ACCEPTED';
    q.updated_at = new Date().toISOString();

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'QUOTATION_ACCEPTED',
        entity_type: 'QUOTATION',
        entity_id: q.id,
        metadata: { quotation_number: q.quotation_number },
      });
    }

    return this.mapToResponse(q);
  }

  async cancelQuotation(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<QuotationResponse> {
    const q = this.quotationsStore.get(id);
    if (!q || q.tenant_id !== tenantId) {
      throw new NotFoundException(`Quotation with ID '${id}' not found.`);
    }

    if (!canTransitionQuotationStatus(q.status, QuotationStatuses.CANCELLED)) {
      throw new BadRequestException(
        new InvalidQuotationStateTransitionError(q.status, QuotationStatuses.CANCELLED).message,
      );
    }

    q.status = 'CANCELLED';
    q.updated_at = new Date().toISOString();

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'QUOTATION_CANCELLED',
        entity_type: 'QUOTATION',
        entity_id: q.id,
        metadata: { quotation_number: q.quotation_number },
      });
    }

    return this.mapToResponse(q);
  }

  // --------------------------------------------------------------------------
  // 1-Click Quotation -> Sales Order Conversion
  // --------------------------------------------------------------------------

  async convertQuotation(
    tenantId: string,
    quotationId: string,
    userId: string,
    req?: ConvertQuotationRequest,
  ): Promise<SalesOrderResponse> {
    const q = this.quotationsStore.get(quotationId);
    if (!q || q.tenant_id !== tenantId) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found.`);
    }

    try {
      assertQuotationCanBeConverted(
        q.quotation_number,
        q.status,
        q.valid_until,
        q.converted_sales_order_id,
      );
    } catch (err) {
      if (err instanceof QuotationDomainError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    // Convert lines preserving historical pricing snapshot
    const orderLines = q.lines.map((line) => ({
      variant_id: line.variant_id,
      quantity: line.quantity,
      unit_price_minor: line.unit_price_minor,
      discount_minor: line.discount_minor,
      tax_minor: line.tax_minor,
    }));

    const salesOrder = await this.ordersService.createSalesOrder(tenantId, {
      channel_type: (req as any)?.channel_type || 'DIRECT',
      branch_id: q.branch_id,
      warehouse_id: q.warehouse_id,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      customer_email: q.customer_email,
      customer_phone: q.customer_phone,
      currency_code: q.currency_code,
      lines: orderLines,
      notes: req?.notes ?? `Converted from Quotation ${q.quotation_number}`,
    });

    const now = new Date().toISOString();
    q.status = 'CONVERTED';
    q.converted_sales_order_id = salesOrder.id;
    q.converted_at = now;
    q.updated_at = now;

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'QUOTATION_CONVERTED',
        entity_type: 'QUOTATION',
        entity_id: q.id,
        metadata: {
          quotation_number: q.quotation_number,
          order_id: salesOrder.id,
          order_number: salesOrder.order_number,
        },
      });
    }

    if (this.outboxService) {
      await this.outboxService.enqueueEvent(
        tenantId,
        'commerce.quotation_converted',
        {
          quotation_id: q.id,
          quotation_number: q.quotation_number,
          sales_order_id: salesOrder.id,
          sales_order_number: salesOrder.order_number,
          converted_at: now,
        },
        req?.idempotency_key ?? `convert:${q.id}`,
      );
    }

    return salesOrder;
  }

  private mapToResponse(q: StoredQuotation): QuotationResponse {
    return {
      id: q.id,
      tenant_id: q.tenant_id,
      quotation_number: q.quotation_number,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      customer_email: q.customer_email,
      customer_phone: q.customer_phone,
      branch_id: q.branch_id,
      warehouse_id: q.warehouse_id,
      status: q.status,
      converted_sales_order_id: q.converted_sales_order_id,
      currency_code: q.currency_code,
      valid_until: q.valid_until,
      subtotal_minor: q.subtotal_minor.toString(),
      total_discount_minor: q.total_discount_minor.toString(),
      total_tax_minor: q.total_tax_minor.toString(),
      grand_total_minor: q.grand_total_minor.toString(),
      lines: q.lines.map((l) => ({ ...l })),
      notes: q.notes,
      created_at: q.created_at,
      updated_at: q.updated_at,
      converted_at: q.converted_at,
    };
  }

  clearStore(): void {
    this.quotationsStore.clear();
  }
}
