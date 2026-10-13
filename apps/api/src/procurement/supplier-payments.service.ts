import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SupplierPayment,
  SupplierPaymentAllocation,
  CreateSupplierPaymentInput,
} from '@stokrova/contracts';
import {
  assertValidSupplierPaymentAllocation,
  generateUuidV7,
} from '@stokrova/domain';
import { SuppliersService } from './suppliers.service.js';
import { PurchaseInvoicesService } from './purchase-invoices.service.js';

@Injectable()
export class SupplierPaymentsService {
  private paymentsStore = new Map<string, SupplierPayment>();
  private idempotencyStore = new Map<string, string>();
  private paymentCounter = 8000;

  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly invoicesService: PurchaseInvoicesService,
  ) {}

  async create(
    tenantId: string,
    input: CreateSupplierPaymentInput,
    createdBy = 'usr_accounts_payable',
  ): Promise<SupplierPayment> {
    // 1. Enforce strict idempotency (Golden Rule 8 & 19)
    if (input.idempotency_key) {
      const existingId = this.idempotencyStore.get(`${tenantId}:${input.idempotency_key}`);
      if (existingId) {
        return this.getById(tenantId, existingId);
      }
    }

    const supRes = await this.suppliersService.getSupplierById(tenantId, input.supplier_id);
    const supplier = supRes.supplier;

    const paymentAmount = BigInt(input.amount_minor);
    if (paymentAmount <= 0n) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    if (!input.allocations || input.allocations.length === 0) {
      throw new BadRequestException('Supplier payment must allocate to at least one purchase invoice.');
    }

    // 2. Validate all allocations before mutating state
    let totalAllocated = 0n;
    const validatedAllocations: { invoiceId: string; amount: bigint }[] = [];

    for (const allocReq of input.allocations) {
      const invoice = await this.invoicesService.getById(tenantId, allocReq.purchase_invoice_id);
      if (invoice.supplier_id !== input.supplier_id) {
        throw new BadRequestException(
          `Invoice '${invoice.id}' belongs to supplier '${invoice.supplier_id}', but payment is for '${input.supplier_id}'.`,
        );
      }

      const invoiceTotal = BigInt(invoice.total_minor);
      const invoicePaid = BigInt(invoice.amount_paid_minor ?? '0');
      const allocAmount = BigInt(allocReq.amount_minor);

      assertValidSupplierPaymentAllocation(
        invoice.id,
        invoiceTotal,
        invoicePaid,
        allocAmount,
      );

      totalAllocated += allocAmount;
      validatedAllocations.push({ invoiceId: invoice.id, amount: allocAmount });
    }

    if (totalAllocated > paymentAmount) {
      throw new BadRequestException(
        `Total allocated amount (${totalAllocated.toString()}) exceeds payment amount (${paymentAmount.toString()}).`,
      );
    }

    const paymentId = generateUuidV7();
    this.paymentCounter += 1;
    const paymentNumber = `PAY-${this.paymentCounter}`;
    const now = new Date().toISOString();

    const createdAllocations: SupplierPaymentAllocation[] = [];
    for (const val of validatedAllocations) {
      const allocId = generateUuidV7();
      createdAllocations.push({
        id: allocId,
        tenant_id: tenantId,
        payment_id: paymentId,
        purchase_invoice_id: val.invoiceId,
        allocated_amount_minor: val.amount.toString(),
        created_at: now,
      });

      // Update invoice paid balance and check auto-close/paid
      await this.invoicesService.recordPayment(tenantId, val.invoiceId, val.amount);
    }

    const payment: SupplierPayment = {
      id: paymentId,
      tenant_id: tenantId,
      payment_number: paymentNumber,
      supplier_id: input.supplier_id,
      amount_minor: paymentAmount.toString(),
      currency_code: input.currency_code ?? supplier.currency_code,
      payment_method: input.payment_method ?? 'BANK_TRANSFER',
      status: 'DISBURSED',
      disbursed_at: now,
      reference: input.reference ?? null,
      idempotency_key: input.idempotency_key,
      notes: input.notes ?? null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
      allocations: createdAllocations,
    };

    this.paymentsStore.set(`${tenantId}:${paymentId}`, payment);
    this.idempotencyStore.set(`${tenantId}:${input.idempotency_key}`, paymentId);

    return payment;
  }

  async getById(tenantId: string, paymentId: string): Promise<SupplierPayment> {
    const payment = this.paymentsStore.get(`${tenantId}:${paymentId}`);
    if (!payment) {
      throw new NotFoundException(`Supplier Payment '${paymentId}' not found for tenant '${tenantId}'.`);
    }
    return payment;
  }

  async list(tenantId: string, filters?: { supplierId?: string }): Promise<SupplierPayment[]> {
    const results: SupplierPayment[] = [];
    for (const [key, p] of this.paymentsStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (filters?.supplierId && p.supplier_id !== filters.supplierId) continue;
        results.push(p);
      }
    }
    return results;
  }
}
