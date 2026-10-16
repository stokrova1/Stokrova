import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { BranchesService } from '../work-centers/branches.service.js';
import { WorkCentersService } from '../work-centers/work-centers.service.js';
import { RegistersService } from '../work-centers/registers.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { PosService } from '../pos/pos.service.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService (Separation of Concerns & Financial Truth)', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
  let workCentersService: WorkCentersService;
  let registersService: RegistersService;
  let warehousesService: WarehousesService;
  let posService: PosService;
  let paymentsService: PaymentsService;

  let tenantId: string;
  let branchId: string;
  let registerId: string;
  let sessionId: string;
  let posSessionId: string;
  const cashierUserId = 'usr_cashier_01';

  beforeEach(async () => {
    tenancyService = new TenancyService();
    branchesService = new BranchesService(tenancyService);
    workCentersService = new WorkCentersService(branchesService);
    registersService = new RegistersService(branchesService, workCentersService);
    warehousesService = new WarehousesService(tenancyService);
    posService = new PosService(branchesService, warehousesService);
    paymentsService = new PaymentsService(registersService, posService);

    const provisionResult = await tenancyService.provisionTenant(
      {
        name: 'Prime Retail Group',
        slug: 'prime-retail',
        owner_email: 'owner@primeretail.com',
        owner_full_name: 'Prime Owner',
      },
      'usr_owner_01',
    );

    tenantId = provisionResult.tenant.id;
    branchId = provisionResult.default_branch.id;

    const reg = await registersService.createRegister(tenantId, {
      branch_id: branchId,
      name: 'Till 01',
      code: 'POS-01',
    });
    registerId = reg.id;

    // Open register session with ₦10,000 float
    const session = await registersService.openSession(tenantId, cashierUserId, {
      register_id: registerId,
      opening_float_minor: 10000,
    });
    sessionId = session.id;

    const wh = await warehousesService.createWarehouse(tenantId, {
      branch_id: branchId,
      code: 'WH-PAY-MAIN',
      name: 'Main Store Warehouse',
    });

    const posReg = await posService.createRegisterConfig(tenantId, {
      branch_id: branchId,
      warehouse_id: wh.id,
      name: 'POS Terminal 1',
      code: 'TERM-01',
    });

    const posSes = await posService.openSession(tenantId, cashierUserId, {
      register_id: posReg.id,
      opening_float_minor: '20000', // $200.00
    });
    posSessionId = posSes.id;
  });

  describe('Invoice Lifecycle & Multi-Method Split Payments', () => {
    it('creates invoice and tracks split payments (Cash + Bank Transfer)', async () => {
      // 1. Create Invoice for ₦500,000
      const invoice = await paymentsService.createInvoice(tenantId, {
        order_id: 'ord_5001',
        total_minor: 500000,
      });

      expect(invoice.status).toBe('ISSUED');
      expect(invoice.total_minor).toBe('500000');
      expect(invoice.balance_due_minor).toBe('500000');

      // 2. Pay ₦200,000 Cash via POS register
      const cashPayment = await paymentsService.recordPayment(tenantId, cashierUserId, {
        invoice_id: invoice.id,
        order_id: 'ord_5001',
        register_session_id: sessionId,
        amount_minor: 200000,
        payment_method: 'CASH',
      });

      expect(cashPayment.status).toBe('CAPTURED');
      expect(cashPayment.amount_minor).toBe('200000');

      // Check invoice updated to PARTIALLY_PAID
      const updatedInv1 = await paymentsService.getInvoiceById(tenantId, invoice.id);
      expect(updatedInv1.status).toBe('PARTIALLY_PAID');
      expect(updatedInv1.amount_paid_minor).toBe(200000n);
      expect(updatedInv1.balance_due_minor).toBe(300000n);

      // Check register session cash summary captured the cash sale
      const sessionSummary = await registersService.getSessionSummary(tenantId, sessionId);
      expect(sessionSummary.total_cash_sales_minor).toBe('200000');
      expect(sessionSummary.expected_closing_minor).toBe('210000'); // 10k float + 200k cash

      // 3. Pay remaining ₦300,000 via Bank Transfer (recorded once received, counts at once)
      const transferPayment = await paymentsService.recordPayment(tenantId, cashierUserId, {
        invoice_id: invoice.id,
        order_id: 'ord_5001',
        amount_minor: 300000,
        payment_method: 'BANK_TRANSFER',
        provider_reference: 'NIP-123456789',
      });

      expect(transferPayment.status).toBe('CONFIRMED');

      // Invoice is now fully PAID
      const finalInv = await paymentsService.getInvoiceById(tenantId, invoice.id);
      expect(finalInv.status).toBe('PAID');
      expect(finalInv.amount_paid_minor).toBe(500000n);
      expect(finalInv.balance_due_minor).toBe(0n);
    });

    it('enforces idempotency using operation_id to prevent duplicate payments', async () => {
      const invoice = await paymentsService.createInvoice(tenantId, {
        order_id: 'ord_5002',
        total_minor: 100000,
      });

      const opId = 'client_uuid_abc_123';

      // First call
      const pay1 = await paymentsService.recordPayment(tenantId, cashierUserId, {
        invoice_id: invoice.id,
        amount_minor: 50000,
        payment_method: 'CASH',
        operation_id: opId,
      });

      // Second duplicate call (e.g. offline retry or network repeat)
      const pay2 = await paymentsService.recordPayment(tenantId, cashierUserId, {
        invoice_id: invoice.id,
        amount_minor: 50000,
        payment_method: 'CASH',
        operation_id: opId,
      });

      // Must return identical payment record without double-deducting
      expect(pay1.id).toBe(pay2.id);

      const inv = await paymentsService.getInvoiceById(tenantId, invoice.id);
      expect(inv.amount_paid_minor).toBe(50000n); // Deducted only once!
    });

    it('rejects payments exceeding remaining invoice balance', async () => {
      const invoice = await paymentsService.createInvoice(tenantId, {
        order_id: 'ord_5003',
        total_minor: 100000,
      });

      await expect(
        paymentsService.recordPayment(tenantId, cashierUserId, {
          invoice_id: invoice.id,
          amount_minor: 150000,
          payment_method: 'CASH',
        }),
      ).rejects.toThrowError(/exceeds remaining balance due/);
    });
  });

  describe('Receipt Printing Audit Trail (Financial Truth Invariant)', () => {
    it('records initial print and increments reprint count without mutating payments', async () => {
      const orderId = 'ord_receipt_01';

      // 1. Initial print
      const firstPrint = await paymentsService.printReceipt(tenantId, cashierUserId, {
        order_id: orderId,
        register_id: registerId,
      });

      expect(firstPrint.print_count).toBe(1);
      expect(firstPrint.is_reprint).toBe(false);
      expect(firstPrint.receipt_number).toBeDefined();

      // 2. Customer asks for reprint
      const secondPrint = await paymentsService.printReceipt(tenantId, cashierUserId, {
        order_id: orderId,
        register_id: registerId,
      });

      expect(secondPrint.print_count).toBe(2);
      expect(secondPrint.is_reprint).toBe(true);
      expect(secondPrint.receipt_number).toBe(firstPrint.receipt_number); // Same receipt number

      // 3. Verify history
      const history = await paymentsService.getReceiptHistory(tenantId, orderId);
      expect(history.length).toBe(2);
    });
  });

  describe('Register Settlement Report', () => {
    it('counts card as transfer in the till settlement', async () => {
      // Record Cash payment in session
      await paymentsService.recordPayment(tenantId, cashierUserId, {
        register_session_id: sessionId,
        amount_minor: 75000,
        payment_method: 'CASH',
      });

      // Record Card payment in session
      await paymentsService.recordPayment(tenantId, cashierUserId, {
        register_session_id: sessionId,
        amount_minor: 45000,
        payment_method: 'CARD',
      });

      // Print a receipt
      await paymentsService.printReceipt(tenantId, cashierUserId, {
        order_id: 'ord_settle_01',
        register_id: registerId,
      });

      const report = await paymentsService.getRegisterSettlement(tenantId, sessionId);

      expect(report.opening_float_minor).toBe('10000');
      expect(report.total_cash_payments_minor).toBe('75000');
      expect(report.total_card_payments_minor).toBe('0');
      expect(report.total_transfer_payments_minor).toBe('45000');
      expect(report.expected_cash_in_drawer_minor).toBe('85000'); // 10k float + 75k cash
      expect(report.payments_count).toBe(2);
      expect(report.receipts_printed_count).toBe(1);
    });
  });

  describe('Split & Multi-Tender Checkout Engine (Phase 3C)', () => {
    it('executes split payment across Card, Store Credit, and Cash with change returned', async () => {
      // Order total: $150.00 (15000 minor)
      // Tenders:
      // 1. $50.00 Store Credit (5000)
      // 2. $60.00 Card (6000)
      // 3. $50.00 Cash (5000) -> $10.00 change returned, $40.00 net cash
      const checkout = await paymentsService.processMultiTenderCheckout(
        tenantId,
        cashierUserId,
        {
          order_id: 'ord_split_101',
          total_payable_minor: '15000',
          currency_code: 'USD',
          pos_session_id: posSessionId,
          tenders: [
            {
              idempotency_key: 'tnd_idem_sc_1',
              tender_type: 'STORE_CREDIT',
              amount_minor: '5000',
              customer_account_id: 'cust_acct_88',
            },
            {
              idempotency_key: 'tnd_idem_card_1',
              tender_type: 'CARD',
              amount_minor: '6000',
              provider_reference: 'AUTH-998822',
            },
            {
              idempotency_key: 'tnd_idem_cash_1',
              tender_type: 'CASH',
              amount_minor: '5000',
            },
          ],
        },
      );

      expect(checkout.is_fully_paid).toBe(true);
      expect(checkout.total_payable_minor).toBe('15000');
      expect(checkout.total_tendered_minor).toBe('16000');
      expect(checkout.total_allocated_minor).toBe('15000');
      expect(checkout.change_due_minor).toBe('1000');
      expect(checkout.remaining_balance_minor).toBe('0');
      expect(checkout.allocated_tenders).toHaveLength(3);
      expect(checkout.allocated_tenders[2]?.change_returned_minor).toBe('1000');
      expect(checkout.pos_cash_movement_id).toBeDefined();

      // Verify POS till session received the net cash sale ($40.00 = 4000 minor)
      const sessionSummary = await posService.getSessionSummary(tenantId, posSessionId);
      // Opening float: 20000 ($200) + Cash sale: 4000 ($40) = 24000 ($240)
      expect(sessionSummary.current_drawer_balance_minor).toBe('24000');
      expect(sessionSummary.total_cash_sales_minor).toBe('4000');
    });

    it('splits a shift takings into cash for the drawer and transfer (card included) for the bank', async () => {
      await paymentsService.processMultiTenderCheckout(tenantId, cashierUserId, {
        order_id: 'ord_takings_1',
        pos_session_id: posSessionId,
        total_payable_minor: '10000',
        tenders: [
          { idempotency_key: 'tk_cash', tender_type: 'CASH', amount_minor: '5000' },
          { idempotency_key: 'tk_card', tender_type: 'CARD', amount_minor: '3000' },
          { idempotency_key: 'tk_trf', tender_type: 'BANK_TRANSFER', amount_minor: '2000' },
        ],
      });
      const t = await paymentsService.getSessionTakings(tenantId, posSessionId);
      expect(t.cash_received_minor).toBe('5000');
      expect(t.transfer_received_minor).toBe('5000');
      expect(t.total_received_minor).toBe('10000');
    });

    it('rejects non-cash over-tendering (cards cannot generate cash change)', async () => {
      await expect(
        paymentsService.processMultiTenderCheckout(tenantId, cashierUserId, {
          order_id: 'ord_invalid_overtender',
          total_payable_minor: '5000', // $50.00
          tenders: [
            {
              idempotency_key: 'tnd_card_over',
              tender_type: 'CARD',
              amount_minor: '7000', // $70.00 card tender on $50.00 order
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces idempotency on duplicate tender submissions (Rule 19)', async () => {
      const checkoutReq = {
        order_id: 'ord_idem_test',
        total_payable_minor: '8000',
        tenders: [
          {
            idempotency_key: 'tnd_unique_idem_88',
            tender_type: 'CASH' as const,
            amount_minor: '8000',
          },
        ],
      };

      const firstAttempt = await paymentsService.processMultiTenderCheckout(
        tenantId,
        cashierUserId,
        checkoutReq,
      );

      // Re-submitting with identical idempotency key returns cached result
      const secondAttempt = await paymentsService.processMultiTenderCheckout(
        tenantId,
        cashierUserId,
        checkoutReq,
      );

      expect(secondAttempt.checkout_id).toBe(firstAttempt.checkout_id);
      expect(secondAttempt.total_allocated_minor).toBe(firstAttempt.total_allocated_minor);
    });

    it('retrieves checkout record by ID', async () => {
      const created = await paymentsService.processMultiTenderCheckout(
        tenantId,
        cashierUserId,
        {
          order_id: 'ord_lookup_test',
          total_payable_minor: '3000',
          tenders: [
            {
              idempotency_key: 'tnd_lookup_1',
              tender_type: 'CASH',
              amount_minor: '3000',
            },
          ],
        },
      );

      const retrieved = await paymentsService.getCheckoutById(tenantId, created.checkout_id);
      expect(retrieved.checkout_id).toBe(created.checkout_id);
      expect(retrieved.order_id).toBe('ord_lookup_test');
      expect(retrieved.is_fully_paid).toBe(true);
      expect(retrieved.allocated_tenders).toHaveLength(1);
    });
  });

  describe('Refunds', () => {
    it('refunds part of a captured payment and blocks refunding more than was paid', async () => {
      const invoice = await paymentsService.createInvoice(tenantId, { order_id: 'ord_7001', total_minor: 100000 });
      const pay = await paymentsService.recordPayment(tenantId, cashierUserId, {
        invoice_id: invoice.id,
        order_id: 'ord_7001',
        register_session_id: sessionId,
        amount_minor: 100000,
        payment_method: 'CASH',
      });

      const refund = await paymentsService.refundPayment(tenantId, pay.id, cashierUserId, { amount_minor: 30000 });
      expect(refund.status).toBe('REFUNDED');
      expect(refund.amount_minor).toBe('30000');

      await expect(
        paymentsService.refundPayment(tenantId, pay.id, cashierUserId, { amount_minor: 70001 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      const rest = await paymentsService.refundPayment(tenantId, pay.id, cashierUserId, {});
      expect(rest.amount_minor).toBe('70000');
    });
  });
});
