import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type {
  PosCheckoutRequest,
  PosCheckoutResponse,
  CustomerResponse,
} from '@stokrova/contracts';
import {
  InventoryDomainError,
  assertCustomerCanTransact,
} from '@stokrova/domain';
import { PosService } from './pos.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { InvoicingService } from '../invoicing/invoicing.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';

@Injectable()
export class PosCheckoutService {
  private checkoutIdempotencyStore = new Map<string, PosCheckoutResponse>();

  constructor(
    private readonly posService: PosService,
    private readonly pricingService: PricingService,
    private readonly ordersService: OrdersService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly invoicingService: InvoicingService,
    private readonly paymentsService: PaymentsService,
    private readonly customersService: CustomersService,
    private readonly auditService?: AuditService,
    private readonly outboxService?: OutboxService,
  ) {}

  async processCheckout(
    tenantId: string,
    userId: string,
    req: PosCheckoutRequest,
  ): Promise<PosCheckoutResponse> {
    // 1. Idempotency Check (Rule 10 & 19)
    const idempotencyKey = `${tenantId}:${req.idempotency_key}`;
    const cachedResponse = this.checkoutIdempotencyStore.get(idempotencyKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (!req.items || req.items.length === 0) {
      throw new BadRequestException('Checkout must contain at least one item.');
    }
    if (!req.tenders || req.tenders.length === 0) {
      throw new BadRequestException('Checkout must contain at least one payment tender.');
    }

    // 2. Resolve & Validate Active Session & Register
    const session = await this.posService.getSessionById(tenantId, req.pos_session_id);
    if (session.status !== 'OPEN') {
      throw new ConflictException(
        `POS Session '${req.pos_session_id}' is not OPEN (current status: '${session.status}'). Cannot process sales on closed or suspended session.`,
      );
    }

    const register = await this.posService.getRegisterConfigById(tenantId, req.pos_register_id);
    if (session.register_id !== register.id) {
      throw new BadRequestException(
        `Session '${session.id}' does not belong to register '${register.id}'.`,
      );
    }

    // 3. Resolve Customer if provided
    let customer: CustomerResponse | null = null;
    if (req.customer_id) {
      customer = await this.customersService.getCustomerById(tenantId, req.customer_id);
      assertCustomerCanTransact(customer.customer_code, customer.status);
    }

    // 4. Server-Authoritative Pricing Calculation (Rule 7)
    // Never trust client prices, client discounts, or client totals
    const cartPricing = await this.pricingService.calculateCart(tenantId, {
      items: req.items.map((it) => ({
        variant_id: it.variant_id,
        quantity: it.quantity,
        base_unit_price_minor: it.custom_unit_price_minor ?? '0',
        custom_unit_price_minor: it.custom_unit_price_minor,
        line_discount_percent_bp: it.line_discount_percent_bp,
        tax_rate_ids: it.tax_rate_ids,
      })),
      pricelist_id: register.default_price_list_id || undefined,
      promo_code: req.promo_code || undefined,
      currency_code: 'USD',
    });

    const calculatedSummary = cartPricing.summary;
    const totalPayableMinor = BigInt(calculatedSummary.grand_total_minor);

    // 5. Validate Sufficient Payment Tender (Rule 4, 5, 7)
    // POS fast-path checkout requires full settlement or approved customer credit
    const totalTendered = req.tenders.reduce((sum, t) => sum + BigInt(t.tendered_minor), 0n);
    if (totalTendered < totalPayableMinor) {
      if (!customer) {
        throw new BadRequestException(
          `Insufficient payment tender. Total payable: ${totalPayableMinor}, Total tendered: ${totalTendered}. POS checkout requires full payment for walk-in retail sales.`,
        );
      }
      const shortfall = totalPayableMinor - totalTendered;
      await this.customersService.assertCreditOrderPermitted(tenantId, customer.id, shortfall);
    }

    // 6. Check Inventory Availability (ATP) against Inventory Core (Rule 1 & 3)
    for (const item of calculatedSummary.items) {
      const balance = await this.stockLedgerService.getBalance(
        tenantId,
        register.warehouse_id,
        item.variant_id,
      );

      if (balance.available_to_promise < item.quantity) {
        throw new BadRequestException(
          new InventoryDomainError(
            `Insufficient stock for variant ${item.variant_id} in warehouse ${register.warehouse_id}. Requested: ${item.quantity}, Available: ${balance.available_to_promise}`,
          ).message,
        );
      }
    }

    // 6. Create Sales Order (Channel POS)
    const orderLines = calculatedSummary.items.map((it) => ({
      variant_id: it.variant_id,
      quantity: it.quantity,
      unit_price_minor: it.effective_unit_price_minor,
      discount_minor: it.discount_amount_minor,
      tax_minor: it.tax_amount_minor,
    }));

    const salesOrder = await this.ordersService.createSalesOrder(tenantId, {
      channel_type: 'POS',
      branch_id: register.branch_id,
      warehouse_id: register.warehouse_id,
      pos_session_id: session.id,
      pos_register_id: register.id,
      customer_id: customer?.id ?? null,
      customer_name: customer?.display_name ?? null,
      customer_email: customer?.email ?? null,
      customer_phone: customer?.phone ?? null,
      currency_code: calculatedSummary.currency_code,
      lines: orderLines,
      notes: req.notes ?? null,
    });

    // 7. Confirm Order (Reserve Stock) -> Fulfill -> Dispatch (Post Immutable Movement)
    await this.ordersService.confirmSalesOrder(tenantId, salesOrder.id);

    await this.ordersService.fulfillOrderLines(tenantId, salesOrder.id, {
      fulfillment_items: salesOrder.lines.map((l) => ({
        line_id: l.id,
        quantity_to_fulfill: l.quantity,
      })),
    });

    const dispatchedOrder = await this.ordersService.dispatchSalesOrder(
      tenantId,
      userId,
      salesOrder.id,
      { notes: `POS Checkout on Register ${register.code}` },
    );

    // 8. Create & Issue Persistent Sales Invoice (Rule 4)
    const invoice = await this.invoicingService.createInvoice(tenantId, userId, {
      order_id: salesOrder.id,
      customer_id: customer?.id ?? null,
      notes: `Invoice for POS sale ${salesOrder.order_number}`,
    });

    // 9. Process Multi-Tender Payment (Rule 4 & 5)
    const checkoutResult = await this.paymentsService.processMultiTenderCheckout(
      tenantId,
      userId,
      {
        order_id: salesOrder.id,
        pos_session_id: session.id,
        total_payable_minor: totalPayableMinor.toString(),
        tenders: req.tenders.map((t) => ({
          tender_type: t.tender_type as any,
          amount_minor: t.tendered_minor,
          idempotency_key: t.idempotency_key,
          provider_reference: t.provider_reference,
          terminal_id: t.terminal_id,
        })),
      },
    );

    // 10. Record Payment on Invoice and Sales Order
    const totalAllocatedMinor = BigInt(checkoutResult.total_allocated_minor);
    await this.invoicingService.recordPaymentOnInvoice(tenantId, invoice.id, totalAllocatedMinor);
    await this.ordersService.recordOrderPayment(tenantId, salesOrder.id, totalAllocatedMinor);

    // 11. Generate Customer Receipt Print Event (Rule 4)
    const receipt = await this.paymentsService.printReceipt(tenantId, userId, {
      order_id: salesOrder.id,
      register_id: register.id,
    });

    // 12. Transactional Outbox Event & Structured Audit Logging
    const now = new Date().toISOString();
    if (this.outboxService) {
      await this.outboxService.enqueueEvent(
        tenantId,
        'pos.checkout_completed',
        {
          order_id: salesOrder.id,
          order_number: salesOrder.order_number,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          checkout_id: checkoutResult.checkout_id,
          receipt_id: receipt.id,
          receipt_number: receipt.receipt_number,
          total_payable_minor: checkoutResult.total_payable_minor,
          total_tendered_minor: checkoutResult.total_tendered_minor,
          change_due_minor: checkoutResult.change_due_minor,
          register_id: register.id,
          session_id: session.id,
          timestamp: now,
        },
        idempotencyKey,
      );
    }

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'POS_CHECKOUT_COMPLETED',
        entity_type: 'SALES_ORDER',
        entity_id: salesOrder.id,
        metadata: {
          order_number: salesOrder.order_number,
          invoice_number: invoice.invoice_number,
          receipt_number: receipt.receipt_number,
          register_code: register.code,
          grand_total_minor: checkoutResult.total_payable_minor,
          change_due_minor: checkoutResult.change_due_minor,
        },
      });
    }

    const response: PosCheckoutResponse = {
      order_id: salesOrder.id,
      order_number: salesOrder.order_number,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      checkout_id: checkoutResult.checkout_id,
      receipt_id: receipt.id,
      receipt_number: receipt.receipt_number,
      total_payable_minor: checkoutResult.total_payable_minor,
      total_tendered_minor: checkoutResult.total_tendered_minor,
      change_due_minor: checkoutResult.change_due_minor,
      is_fully_paid: checkoutResult.is_fully_paid,
      status: 'COMPLETED',
      dispatched_at: dispatchedOrder.dispatched_at || now,
    };

    // Cache idempotency response
    this.checkoutIdempotencyStore.set(idempotencyKey, response);

    return response;
  }

  clearStore(): void {
    this.checkoutIdempotencyStore.clear();
  }
}
