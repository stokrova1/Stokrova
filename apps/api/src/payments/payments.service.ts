import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  InvoiceResponse,
  CreateInvoiceRequest,
  PaymentResponse,
  RecordPaymentRequest,
  ConfirmPaymentRequest,
  ReceiptPrintResponse,
  PrintReceiptRequest,
  RegisterSettlementReport,
  PaymentStatus,
  PaymentMethod,
  InvoiceStatus,
  PaymentTenderType,
  ProcessMultiTenderCheckoutRequest,
  ProcessMultiTenderCheckoutResponse,
  AllocatedTender,
} from '@stokrova/contracts';
import {
  calculateInvoiceBalance,
  canTransitionPaymentStatus,
  assertValidPaymentAmount,
  assertNoOverpayment,
  calculateNextReceiptPrint,
  calculateMultiTenderAllocation,
  PaymentDomainError,
  type DomainPaymentTender,
} from '@stokrova/domain';
import { RegistersService } from '../work-centers/registers.service.js';
import { PosService } from '../pos/pos.service.js';

export interface StoredInvoice {
  id: string;
  tenant_id: string;
  order_id: string;
  invoice_number: string;
  total_minor: bigint;
  amount_paid_minor: bigint;
  balance_due_minor: bigint;
  currency_code: string;
  status: InvoiceStatus;
  created_at: string;
  due_date: string | null;
}

export interface StoredPayment {
  id: string;
  tenant_id: string;
  order_id: string | null;
  invoice_id: string | null;
  register_session_id: string | null;
  amount_minor: bigint;
  currency_code: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  provider_reference: string | null;
  captured_by_user_id: string;
  operation_id: string | null;
  occurred_at: string;
}

export interface StoredReceiptPrint {
  id: string;
  tenant_id: string;
  order_id: string;
  payment_id: string | null;
  receipt_number: string;
  printed_by_user_id: string;
  register_id: string | null;
  print_count: number;
  is_reprint: boolean;
  occurred_at: string;
}

export interface StoredCheckout {
  id: string;
  tenant_id: string;
  order_id: string;
  pos_session_id: string | null;
  total_payable_minor: bigint;
  total_tendered_minor: bigint;
  total_allocated_minor: bigint;
  change_due_minor: bigint;
  remaining_balance_minor: bigint;
  is_fully_paid: boolean;
  pos_cash_movement_id: string | null;
  created_at: string;
}

export interface StoredCheckoutTender {
  id: string;
  tenant_id: string;
  checkout_id: string;
  idempotency_key: string;
  tender_type: PaymentTenderType;
  tendered_minor: bigint;
  allocated_minor: bigint;
  change_returned_minor: bigint;
  currency_code: string;
  provider_reference: string | null;
  terminal_id: string | null;
  customer_account_id: string | null;
  gift_card_code: string | null;
  notes: string | null;
  captured_at: string;
}

@Injectable()
export class PaymentsService {
  private invoicesStore = new Map<string, StoredInvoice>();
  private paymentsStore = new Map<string, StoredPayment>();
  private receiptsStore = new Map<string, StoredReceiptPrint>();
  private operationIdsStore = new Map<string, string>(); // `${tenantId}:${operationId}` -> paymentId
  private checkoutsStore = new Map<string, StoredCheckout>();
  private checkoutTendersStore = new Map<string, StoredCheckoutTender>();
  private tenderIdempotencyStore = new Map<string, ProcessMultiTenderCheckoutResponse>();

  constructor(
    private readonly registersService: RegistersService,
    @Optional() private readonly posService?: PosService,
  ) {}

  async createInvoice(
    tenantId: string,
    req: CreateInvoiceRequest,
  ): Promise<InvoiceResponse> {
    const totalMinor = BigInt(req.total_minor);
    try {
      assertValidPaymentAmount(totalMinor);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid invoice amount.';
      throw new BadRequestException(msg);
    }

    const id = `inv_${randomUUID().replace(/-/g, '')}`;
    const invoiceNumber = `INV-${randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const invoice: StoredInvoice = {
      id,
      tenant_id: tenantId,
      order_id: req.order_id,
      invoice_number: invoiceNumber,
      total_minor: totalMinor,
      amount_paid_minor: 0n,
      balance_due_minor: totalMinor,
      currency_code: (req.currency_code || 'NGN').toUpperCase(),
      status: 'ISSUED',
      created_at: now,
      due_date: req.due_date || null,
    };

    this.invoicesStore.set(id, invoice);
    return this.toInvoiceResponse(invoice);
  }

  async getInvoiceById(tenantId: string, id: string): Promise<StoredInvoice> {
    const invoice = this.invoicesStore.get(id);
    if (!invoice || invoice.tenant_id !== tenantId) {
      throw new NotFoundException(`Invoice with ID '${id}' not found.`);
    }
    return invoice;
  }

  async recordPayment(
    tenantId: string,
    userId: string,
    req: RecordPaymentRequest,
  ): Promise<PaymentResponse> {
    // 1. Idempotency Check
    if (req.operation_id) {
      const key = `${tenantId}:${req.operation_id}`;
      const existingPaymentId = this.operationIdsStore.get(key);
      if (existingPaymentId) {
        const existing = this.paymentsStore.get(existingPaymentId);
        if (existing) {
          return this.toPaymentResponse(existing);
        }
      }
    }

    const amountMinor = BigInt(req.amount_minor);
    try {
      assertValidPaymentAmount(amountMinor);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid payment amount.';
      throw new BadRequestException(msg);
    }

    // 2. Invoice validation if attached
    let invoice: StoredInvoice | undefined;
    if (req.invoice_id) {
      invoice = await this.getInvoiceById(tenantId, req.invoice_id);
      try {
        assertNoOverpayment(amountMinor, invoice.balance_due_minor);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Payment exceeds balance due.';
        throw new BadRequestException(msg);
      }
    }

    // 3. Payment Status & Cash Movement Integration
    let initialStatus: PaymentStatus = 'CAPTURED';

    if (req.payment_method === 'CASH') {
      initialStatus = 'CAPTURED';
      // Automatically record cash sale movement on till drawer if register session is open
      if (req.register_session_id) {
        await this.registersService.recordCashMovement(
          tenantId,
          req.register_session_id,
          userId,
          {
            movement_type: 'CASH_SALE',
            amount_minor: req.amount_minor,
            reason: `Payment for ${req.invoice_id ? `Invoice ${req.invoice_id}` : `Order ${req.order_id || ''}`}`,
          },
        );
      }
    } else if (req.payment_method === 'BANK_TRANSFER') {
      // Bank transfers start as PENDING until confirmed
      initialStatus = 'PENDING';
    } else if (req.payment_method === 'CARD' || req.payment_method === 'STORE_CREDIT') {
      initialStatus = 'CAPTURED';
    }

    const paymentId = `pay_${randomUUID().replace(/-/g, '')}`;
    const payment: StoredPayment = {
      id: paymentId,
      tenant_id: tenantId,
      order_id: req.order_id || null,
      invoice_id: req.invoice_id || null,
      register_session_id: req.register_session_id || null,
      amount_minor: amountMinor,
      currency_code: (req.currency_code || 'NGN').toUpperCase(),
      payment_method: req.payment_method,
      status: initialStatus,
      provider_reference: req.provider_reference || null,
      captured_by_user_id: userId,
      operation_id: req.operation_id || null,
      occurred_at: new Date().toISOString(),
    };

    this.paymentsStore.set(paymentId, payment);

    if (req.operation_id) {
      this.operationIdsStore.set(`${tenantId}:${req.operation_id}`, paymentId);
    }

    // 4. Update invoice balance immediately if captured
    if (invoice && initialStatus === 'CAPTURED') {
      const newPaid = invoice.amount_paid_minor + amountMinor;
      const balance = calculateInvoiceBalance(invoice.total_minor, newPaid);
      invoice.amount_paid_minor = newPaid;
      invoice.balance_due_minor = balance.balanceDueMinor;
      invoice.status = balance.status;
      this.invoicesStore.set(invoice.id, invoice);
    }

    return this.toPaymentResponse(payment);
  }

  async confirmPayment(
    tenantId: string,
    paymentId: string,
    _userId: string,
    req: ConfirmPaymentRequest,
  ): Promise<PaymentResponse> {
    const payment = this.paymentsStore.get(paymentId);
    if (!payment || payment.tenant_id !== tenantId) {
      throw new NotFoundException(`Payment with ID '${paymentId}' not found.`);
    }

    if (!canTransitionPaymentStatus(payment.status, 'CONFIRMED')) {
      throw new ConflictException(
        `Cannot confirm payment with current status '${payment.status}'.`,
      );
    }

    payment.status = 'CONFIRMED';
    if (req.verification_reference) {
      payment.provider_reference = req.verification_reference;
    }
    this.paymentsStore.set(paymentId, payment);

    // Apply to invoice
    if (payment.invoice_id) {
      const invoice = await this.getInvoiceById(tenantId, payment.invoice_id);
      const newPaid = invoice.amount_paid_minor + payment.amount_minor;
      const balance = calculateInvoiceBalance(invoice.total_minor, newPaid);
      invoice.amount_paid_minor = newPaid;
      invoice.balance_due_minor = balance.balanceDueMinor;
      invoice.status = balance.status;
      this.invoicesStore.set(invoice.id, invoice);
    }

    return this.toPaymentResponse(payment);
  }

  async getPaymentById(tenantId: string, id: string): Promise<PaymentResponse> {
    const payment = this.paymentsStore.get(id);
    if (!payment || payment.tenant_id !== tenantId) {
      throw new NotFoundException(`Payment with ID '${id}' not found.`);
    }
    return this.toPaymentResponse(payment);
  }

  async printReceipt(
    tenantId: string,
    userId: string,
    req: PrintReceiptRequest,
  ): Promise<ReceiptPrintResponse> {
    // Audit-trail receipt print events
    const existingPrints = Array.from(this.receiptsStore.values()).filter(
      (r) => r.tenant_id === tenantId && r.order_id === req.order_id,
    );

    const { nextPrintCount, isReprint } = calculateNextReceiptPrint(existingPrints.length);
    const receiptNumber =
      existingPrints[0]?.receipt_number || `REC-${randomUUID().slice(0, 8).toUpperCase()}`;

    const printId = `prt_${randomUUID().replace(/-/g, '')}`;
    const receiptPrint: StoredReceiptPrint = {
      id: printId,
      tenant_id: tenantId,
      order_id: req.order_id,
      payment_id: req.payment_id || null,
      receipt_number: receiptNumber,
      printed_by_user_id: userId,
      register_id: req.register_id || null,
      print_count: nextPrintCount,
      is_reprint: isReprint,
      occurred_at: new Date().toISOString(),
    };

    this.receiptsStore.set(printId, receiptPrint);
    return receiptPrint;
  }

  async getReceiptHistory(
    tenantId: string,
    orderId: string,
  ): Promise<ReceiptPrintResponse[]> {
    return Array.from(this.receiptsStore.values()).filter(
      (r) => r.tenant_id === tenantId && r.order_id === orderId,
    );
  }

  async getRegisterSettlement(
    tenantId: string,
    sessionId: string,
  ): Promise<RegisterSettlementReport> {
    // 1. Get cash session summary
    const sessionSummary = await this.registersService.getSessionSummary(tenantId, sessionId);

    // 2. Fetch all payments captured during this session
    const sessionPayments = Array.from(this.paymentsStore.values()).filter(
      (p) =>
        p.tenant_id === tenantId &&
        p.register_session_id === sessionId &&
        (p.status === 'CAPTURED' || p.status === 'CONFIRMED'),
    );

    let totalCard = 0n;
    let totalTransfer = 0n;

    for (const p of sessionPayments) {
      if (p.payment_method === 'CARD') {
        totalCard += p.amount_minor;
      } else if (p.payment_method === 'BANK_TRANSFER') {
        totalTransfer += p.amount_minor;
      }
    }

    // Count receipts printed on this session's register
    const registerId = sessionSummary.session.register_id;
    const receiptsCount = Array.from(this.receiptsStore.values()).filter(
      (r) => r.tenant_id === tenantId && r.register_id === registerId,
    ).length;

    return {
      register_id: registerId,
      session_id: sessionId,
      opened_at: sessionSummary.session.opened_at,
      closed_at: sessionSummary.session.closed_at,
      opening_float_minor: sessionSummary.session.opening_float_minor,
      total_cash_payments_minor: sessionSummary.total_cash_sales_minor,
      total_card_payments_minor: totalCard.toString(),
      total_transfer_payments_minor: totalTransfer.toString(),
      total_refunds_minor: sessionSummary.total_cash_refunds_minor,
      expected_cash_in_drawer_minor: sessionSummary.expected_closing_minor,
      actual_cash_in_drawer_minor: sessionSummary.session.closing_actual_minor,
      variance_minor: sessionSummary.session.variance_minor,
      payments_count: sessionPayments.length,
      receipts_printed_count: receiptsCount,
    };
  }

  // ----------------------------------------------------
  // Split & Multi-Tender Payments Engine (Phase 3C)
  // ----------------------------------------------------

  async processMultiTenderCheckout(
    tenantId: string,
    userId: string,
    req: ProcessMultiTenderCheckoutRequest,
  ): Promise<ProcessMultiTenderCheckoutResponse> {
    const firstTender = req.tenders[0];
    if (!firstTender) {
      throw new BadRequestException('At least one payment tender must be provided.');
    }

    // Rule 19: Idempotency check across tender idempotency keys
    const firstTenderKey = `${tenantId}:${firstTender.idempotency_key}`;
    const cached = this.tenderIdempotencyStore.get(firstTenderKey);
    if (cached) {
      return cached;
    }

    const totalPayableMinor = BigInt(req.total_payable_minor);
    const domainTenders: DomainPaymentTender[] = req.tenders.map((t) => ({
      idempotency_key: t.idempotency_key,
      tender_type: t.tender_type,
      amount_minor: BigInt(t.amount_minor),
      currency_code: t.currency_code,
      provider_reference: t.provider_reference,
    }));

    let calc;
    try {
      calc = calculateMultiTenderAllocation(totalPayableMinor, domainTenders);
    } catch (err: unknown) {
      if (err instanceof PaymentDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const checkoutId = `chk_${randomUUID().replace(/-/g, '')}`;

    // If checkout at POS till and cash collected, record cash movement in till
    let posCashMovementId: string | null = null;
    if (req.pos_session_id && this.posService && calc.cash_sale_total_minor > 0n) {
      try {
        const mov = await this.posService.recordSaleCashMovement(
          tenantId,
          req.pos_session_id,
          userId,
          calc.cash_sale_total_minor,
          req.order_id,
        );
        posCashMovementId = mov.id;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'POS cash movement failed';
        throw new BadRequestException(msg);
      }
    }

    // Store checkout
    const checkout: StoredCheckout = {
      id: checkoutId,
      tenant_id: tenantId,
      order_id: req.order_id,
      pos_session_id: req.pos_session_id || null,
      total_payable_minor: calc.total_payable_minor,
      total_tendered_minor: calc.total_tendered_minor,
      total_allocated_minor: calc.total_allocated_minor,
      change_due_minor: calc.change_due_minor,
      remaining_balance_minor: calc.remaining_balance_minor,
      is_fully_paid: calc.is_fully_paid,
      pos_cash_movement_id: posCashMovementId,
      created_at: now,
    };
    this.checkoutsStore.set(checkoutId, checkout);

    // Store each allocated tender
    const allocatedTenderResponses: AllocatedTender[] = [];
    for (let i = 0; i < req.tenders.length; i++) {
      const input = req.tenders[i];
      const alloc = calc.allocated_tenders[i];
      if (!input || !alloc) {
        continue;
      }
      const tenderId = `tnd_${randomUUID().replace(/-/g, '')}`;

      const storedTender: StoredCheckoutTender = {
        id: tenderId,
        tenant_id: tenantId,
        checkout_id: checkoutId,
        idempotency_key: input.idempotency_key,
        tender_type: input.tender_type,
        tendered_minor: alloc.tendered_minor,
        allocated_minor: alloc.allocated_minor,
        change_returned_minor: alloc.change_returned_minor,
        currency_code: input.currency_code || 'USD',
        provider_reference: input.provider_reference || null,
        terminal_id: input.terminal_id || null,
        customer_account_id: input.customer_account_id || null,
        gift_card_code: input.gift_card_code || null,
        notes: input.notes || null,
        captured_at: now,
      };
      this.checkoutTendersStore.set(tenderId, storedTender);

      allocatedTenderResponses.push({
        id: tenderId,
        idempotency_key: input.idempotency_key,
        tender_type: input.tender_type,
        tendered_minor: alloc.tendered_minor.toString(),
        allocated_minor: alloc.allocated_minor.toString(),
        change_returned_minor: alloc.change_returned_minor.toString(),
        provider_reference: input.provider_reference || null,
        captured_at: now,
      });
    }

    const response: ProcessMultiTenderCheckoutResponse = {
      checkout_id: checkoutId,
      order_id: req.order_id,
      total_payable_minor: calc.total_payable_minor.toString(),
      total_tendered_minor: calc.total_tendered_minor.toString(),
      total_allocated_minor: calc.total_allocated_minor.toString(),
      change_due_minor: calc.change_due_minor.toString(),
      remaining_balance_minor: calc.remaining_balance_minor.toString(),
      is_fully_paid: calc.is_fully_paid,
      allocated_tenders: allocatedTenderResponses,
      pos_cash_movement_id: posCashMovementId,
    };

    // Cache idempotency response for all participating tender keys
    for (const t of req.tenders) {
      this.tenderIdempotencyStore.set(`${tenantId}:${t.idempotency_key}`, response);
    }

    return response;
  }

  async getCheckoutById(
    tenantId: string,
    checkoutId: string,
  ): Promise<ProcessMultiTenderCheckoutResponse> {
    const chk = this.checkoutsStore.get(checkoutId);
    if (!chk || chk.tenant_id !== tenantId) {
      throw new NotFoundException(`Checkout with ID '${checkoutId}' not found.`);
    }

    const tenders = Array.from(this.checkoutTendersStore.values())
      .filter((t) => t.tenant_id === tenantId && t.checkout_id === checkoutId)
      .map((t) => ({
        id: t.id,
        idempotency_key: t.idempotency_key,
        tender_type: t.tender_type,
        tendered_minor: t.tendered_minor.toString(),
        allocated_minor: t.allocated_minor.toString(),
        change_returned_minor: t.change_returned_minor.toString(),
        provider_reference: t.provider_reference,
        captured_at: t.captured_at,
      }));

    return {
      checkout_id: chk.id,
      order_id: chk.order_id,
      total_payable_minor: chk.total_payable_minor.toString(),
      total_tendered_minor: chk.total_tendered_minor.toString(),
      total_allocated_minor: chk.total_allocated_minor.toString(),
      change_due_minor: chk.change_due_minor.toString(),
      remaining_balance_minor: chk.remaining_balance_minor.toString(),
      is_fully_paid: chk.is_fully_paid,
      allocated_tenders: tenders,
      pos_cash_movement_id: chk.pos_cash_movement_id,
    };
  }

  toInvoiceResponse(inv: StoredInvoice): InvoiceResponse {
    return {
      id: inv.id,
      tenant_id: inv.tenant_id,
      order_id: inv.order_id,
      invoice_number: inv.invoice_number,
      total_minor: inv.total_minor.toString(),
      amount_paid_minor: inv.amount_paid_minor.toString(),
      balance_due_minor: inv.balance_due_minor.toString(),
      currency_code: inv.currency_code,
      status: inv.status,
      created_at: inv.created_at,
      due_date: inv.due_date,
    };
  }

  private toPaymentResponse(p: StoredPayment): PaymentResponse {
    return {
      id: p.id,
      tenant_id: p.tenant_id,
      order_id: p.order_id,
      invoice_id: p.invoice_id,
      register_session_id: p.register_session_id,
      amount_minor: p.amount_minor.toString(),
      currency_code: p.currency_code,
      payment_method: p.payment_method,
      status: p.status,
      provider_reference: p.provider_reference,
      captured_by_user_id: p.captured_by_user_id,
      operation_id: p.operation_id,
      occurred_at: p.occurred_at,
    };
  }

  clearStore(): void {
    this.invoicesStore.clear();
    this.paymentsStore.clear();
    this.receiptsStore.clear();
    this.operationIdsStore.clear();
    this.checkoutsStore.clear();
    this.checkoutTendersStore.clear();
    this.tenderIdempotencyStore.clear();
  }
}
