import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  SalesInvoiceResponse,
  SalesInvoiceLineItem,
  CreateSalesInvoiceRequest,
  VoidSalesInvoiceRequest,
} from '@stokrova/contracts';
import {
  calculateInvoiceBalance,
  canTransitionSalesInvoiceStatus,
  SalesInvoiceStatuses,
  InvalidInvoiceStateTransitionError,
} from '@stokrova/domain';
import { OrdersService } from '../orders/orders.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';

export interface StoredSalesInvoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'CREDITED';
  currency_code: string;
  total_minor: bigint;
  amount_paid_minor: bigint;
  balance_due_minor: bigint;
  due_date: string | null;
  notes: string | null;
  issued_at: string;
  lines: SalesInvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

@Injectable()
export class InvoicingService {
  private invoicesStore = new Map<string, StoredSalesInvoice>();
  private invoiceSequence = 1001;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly customersService: CustomersService,
    private readonly auditService?: AuditService,
    private readonly outboxService?: OutboxService,
  ) {}

  async createInvoice(
    tenantId: string,
    userId: string,
    req: CreateSalesInvoiceRequest,
  ): Promise<SalesInvoiceResponse> {
    const order = await this.ordersService.getOrderById(tenantId, req.order_id);

    // Prevent duplicate active invoice for the same order if already issued
    for (const inv of this.invoicesStore.values()) {
      if (inv.tenant_id === tenantId && inv.order_id === req.order_id && inv.status !== 'VOID') {
        return this.mapToResponse(inv);
      }
    }

    const invoiceId = `inv_${randomUUID().replace(/-/g, '')}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${this.invoiceSequence++}`;
    const now = new Date().toISOString();

    const lines: SalesInvoiceLineItem[] = order.lines.map((l) => ({
      id: `invl_${randomUUID().replace(/-/g, '')}`,
      invoice_id: invoiceId,
      variant_id: l.variant_id,
      sku: l.sku,
      product_name: l.product_name,
      quantity: l.quantity,
      unit_price_minor: l.unit_price_minor,
      discount_minor: l.discount_minor,
      tax_minor: l.tax_minor,
      line_total_minor: l.line_total_minor,
    }));

    const totalMinor = BigInt(order.grand_total_minor);

    const invoice: StoredSalesInvoice = {
      id: invoiceId,
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      order_id: order.id,
      customer_id: order.customer_id ?? req.customer_id ?? null,
      customer_name: order.customer_name ?? null,
      customer_email: order.customer_email ?? null,
      customer_phone: order.customer_phone ?? null,
      status: 'ISSUED',
      currency_code: order.currency_code,
      total_minor: totalMinor,
      amount_paid_minor: 0n,
      balance_due_minor: totalMinor,
      due_date: req.due_date ?? null,
      notes: req.notes ?? null,
      issued_at: now,
      lines,
      created_at: now,
      updated_at: now,
    };

    this.invoicesStore.set(invoiceId, invoice);

    // If customer is associated, update customer outstanding balance
    if (invoice.customer_id) {
      try {
        await this.customersService.adjustOutstandingBalance(
          tenantId,
          invoice.customer_id,
          totalMinor,
        );
      } catch {
        // Safe ignore if customer record not present
      }
    }

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'INVOICE_ISSUED',
        entity_type: 'SALES_INVOICE',
        entity_id: invoiceId,
        metadata: {
          invoice_number: invoiceNumber,
          order_id: order.id,
          total_minor: totalMinor.toString(),
        },
      });
    }

    if (this.outboxService) {
      await this.outboxService.enqueueEvent(
        tenantId,
        'commerce.invoice_issued',
        {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          order_id: order.id,
          total_minor: totalMinor.toString(),
          issued_at: now,
        },
        `invoice:${invoiceId}`,
      );
    }

    return this.mapToResponse(invoice);
  }

  async getInvoiceById(tenantId: string, id: string): Promise<SalesInvoiceResponse> {
    const inv = this.invoicesStore.get(id);
    if (!inv || inv.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales invoice with ID '${id}' not found.`);
    }
    return this.mapToResponse(inv);
  }

  async listInvoices(
    tenantId: string,
    filters?: {
      order_id?: string;
      customer_id?: string;
      status?: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'CREDITED';
    },
  ): Promise<SalesInvoiceResponse[]> {
    return Array.from(this.invoicesStore.values())
      .filter((inv) => {
        if (inv.tenant_id !== tenantId) return false;
        if (filters?.order_id && inv.order_id !== filters.order_id) return false;
        if (filters?.customer_id && inv.customer_id !== filters.customer_id) return false;
        if (filters?.status && inv.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((inv) => this.mapToResponse(inv));
  }

  async recordPaymentOnInvoice(
    tenantId: string,
    invoiceId: string,
    paymentAmountMinor: bigint,
  ): Promise<SalesInvoiceResponse> {
    const inv = this.invoicesStore.get(invoiceId);
    if (!inv || inv.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales invoice with ID '${invoiceId}' not found.`);
    }

    const newAmountPaid = inv.amount_paid_minor + paymentAmountMinor;
    const balance = calculateInvoiceBalance(inv.total_minor, newAmountPaid);

    inv.amount_paid_minor = newAmountPaid;
    inv.balance_due_minor = balance.balanceDueMinor;
    inv.status = balance.status;
    inv.updated_at = new Date().toISOString();

    // Adjust customer balance accordingly
    if (inv.customer_id) {
      try {
        await this.customersService.adjustOutstandingBalance(
          tenantId,
          inv.customer_id,
          -paymentAmountMinor,
        );
      } catch {
        // Safe ignore
      }
    }

    return this.mapToResponse(inv);
  }

  async voidInvoice(
    tenantId: string,
    invoiceId: string,
    userId: string,
    req: VoidSalesInvoiceRequest,
  ): Promise<SalesInvoiceResponse> {
    const inv = this.invoicesStore.get(invoiceId);
    if (!inv || inv.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales invoice with ID '${invoiceId}' not found.`);
    }

    if (!canTransitionSalesInvoiceStatus(inv.status, SalesInvoiceStatuses.VOID)) {
      throw new BadRequestException(
        new InvalidInvoiceStateTransitionError(inv.status, SalesInvoiceStatuses.VOID).message,
      );
    }

    // Revert customer outstanding balance if unpaid balance was active
    if (inv.customer_id && inv.balance_due_minor > 0n) {
      try {
        await this.customersService.adjustOutstandingBalance(
          tenantId,
          inv.customer_id,
          -inv.balance_due_minor,
        );
      } catch {
        // Safe ignore
      }
    }

    inv.status = 'VOID';
    inv.notes = req.reason ? `${inv.notes || ''} [Void reason: ${req.reason}]`.trim() : inv.notes;
    inv.updated_at = new Date().toISOString();

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'INVOICE_VOIDED',
        entity_type: 'SALES_INVOICE',
        entity_id: invoiceId,
        metadata: { invoice_number: inv.invoice_number, reason: req.reason },
      });
    }

    return this.mapToResponse(inv);
  }

  private mapToResponse(inv: StoredSalesInvoice): SalesInvoiceResponse {
    return {
      id: inv.id,
      tenant_id: inv.tenant_id,
      invoice_number: inv.invoice_number,
      order_id: inv.order_id,
      customer_id: inv.customer_id,
      customer_name: inv.customer_name,
      customer_email: inv.customer_email,
      customer_phone: inv.customer_phone,
      status: inv.status,
      currency_code: inv.currency_code,
      total_minor: inv.total_minor.toString(),
      amount_paid_minor: inv.amount_paid_minor.toString(),
      balance_due_minor: inv.balance_due_minor.toString(),
      due_date: inv.due_date,
      notes: inv.notes,
      issued_at: inv.issued_at,
      lines: inv.lines.map((l) => ({ ...l })),
      created_at: inv.created_at,
      updated_at: inv.updated_at,
    };
  }

  clearStore(): void {
    this.invoicesStore.clear();
  }
}
