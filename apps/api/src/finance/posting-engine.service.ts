import {
  Injectable,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  JournalEntry,
  AccountingSourceEventRecord,
  PostCustomerInvoiceAccountingRequest,
  PostCustomerPaymentAccountingRequest,
  PostCustomerCreditNoteAccountingRequest,
  PostGoodsReceiptAccountingRequest,
  PostSupplierInvoiceAccountingRequest,
  PostSupplierPaymentAccountingRequest,
  PostLandedCostAccountingRequest,
  PostSalesDispatchCogsAccountingRequest,
  PostManufacturingWipAccountingRequest,
  PostManufacturingFgReceiptAccountingRequest,
  PostManufacturingScrapAccountingRequest,
  PostInventoryLossAccountingRequest,
  PostCashVarianceAccountingRequest,
} from '@stokrova/contracts';
import { AccountsService } from './accounts.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';
import { PostingRulesService } from './posting-rules.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';

@Injectable()
export class PostingEngineService {
  private readonly sourceEvents = new Map<string, AccountingSourceEventRecord>();

  constructor(
    private readonly accountsService: AccountsService,
    private readonly glService: GeneralLedgerService,
    @Optional() _postingRulesService?: PostingRulesService,
    @Optional() _auditService?: AuditService,
    @Optional() _outboxService?: OutboxService,
  ) {}

  private async resolveAccount(
    tenantId: string,
    companyId: string,
    code: string,
  ) {
    const acc = await this.accountsService.getAccountByCode(tenantId, companyId, code);
    if (!acc) {
      throw new BadRequestException(
        `Required accounting account code '${code}' not found for company '${companyId}'.`,
      );
    }
    return acc;
  }

  private getSourceEventKey(
    tenantId: string,
    companyId: string,
    sourceModule: string,
    operationId: string,
  ): string {
    return `${tenantId}:${companyId}:${sourceModule}:${operationId}`;
  }

  // ==========================================================================
  // 1. Sales & Accounts Receivable Integration
  // ==========================================================================

  async postCustomerInvoice(
    tenantId: string,
    req: PostCustomerInvoiceAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'SALES_INVOICE', req.operation_id);
    const existingRecord = this.sourceEvents.get(key);
    if (existingRecord && existingRecord.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existingRecord.journal_entry_id);
    }

    const arAccount = await this.resolveAccount(tenantId, req.company_id, '1100');
    const revAccount = await this.resolveAccount(tenantId, req.company_id, '4010');

    const totalMinor = req.total_amount_minor ?? (req as any).total_minor ?? '0';
    const subtotalMinor = req.subtotal_amount_minor ?? (req as any).subtotal_minor ?? '0';
    const taxMinor = req.tax_amount_minor ?? (req as any).tax_minor ?? '0';
    const invoiceNum = req.invoice_number ?? (req as any).invoice_id ?? 'INV';

    const lines = [
      {
        account_id: arAccount.id,
        debit_minor: totalMinor,
        credit_minor: '0',
        description: `AR receivable for customer invoice ${invoiceNum}`,
        reference_entity_type: 'SALES_INVOICE',
        reference_entity_id: req.invoice_id,
      },
      {
        account_id: revAccount.id,
        debit_minor: '0',
        credit_minor: subtotalMinor,
        description: `Sales revenue recognized for invoice ${invoiceNum}`,
        reference_entity_type: 'SALES_INVOICE',
        reference_entity_id: req.invoice_id,
      },
    ];

    const taxAmount = BigInt(taxMinor || '0');
    if (taxAmount > 0n) {
      const taxAccount = await this.resolveAccount(tenantId, req.company_id, '2100');
      lines.push({
        account_id: taxAccount.id,
        debit_minor: '0',
        credit_minor: taxMinor,
        description: `Sales tax output liability for invoice ${invoiceNum}`,
        reference_entity_type: 'SALES_INVOICE',
        reference_entity_id: req.invoice_id,
      });
    }

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Customer sales invoice ${invoiceNum}`,
      source_type: 'SALES_INVOICE',
      source_id: req.invoice_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'SALES_INVOICE',
      event_type: 'INVOICE_ISSUED',
      source_event_id: req.invoice_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postCustomerPayment(
    tenantId: string,
    req: PostCustomerPaymentAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'CUSTOMER_PAYMENT', req.operation_id);
    const existingRecord = this.sourceEvents.get(key);
    if (existingRecord && existingRecord.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existingRecord.journal_entry_id);
    }

    // Cash (1010) or Bank (1020)
    const cashOrBankCode = req.payment_method.toUpperCase() === 'CASH' ? '1010' : '1020';
    const cashAccount = await this.resolveAccount(tenantId, req.company_id, cashOrBankCode);
    const arAccount = await this.resolveAccount(tenantId, req.company_id, '1100');

    const lines = [
      {
        account_id: cashAccount.id,
        debit_minor: req.amount_minor,
        credit_minor: '0',
        description: `Customer payment received via ${req.payment_method}`,
        reference_entity_type: 'CUSTOMER_PAYMENT',
        reference_entity_id: req.payment_id,
      },
      {
        account_id: arAccount.id,
        debit_minor: '0',
        credit_minor: req.amount_minor,
        description: `Settlement of accounts receivable from payment ${req.payment_id}`,
        reference_entity_type: 'CUSTOMER_PAYMENT',
        reference_entity_id: req.payment_id,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Customer payment settlement ${req.payment_id}`,
      source_type: 'CUSTOMER_PAYMENT',
      source_id: req.payment_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'CUSTOMER_PAYMENT',
      event_type: 'PAYMENT_RECEIVED',
      source_event_id: req.payment_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postCustomerCreditNote(
    tenantId: string,
    req: PostCustomerCreditNoteAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'CUSTOMER_CREDIT_NOTE', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const salesReturnAcc = await this.resolveAccount(tenantId, req.company_id, '4030');
    const arAcc = await this.resolveAccount(tenantId, req.company_id, '1100');

    const lines = [
      {
        account_id: salesReturnAcc.id,
        debit_minor: req.amount_minor,
        credit_minor: '0',
        description: `Customer credit note adjustment for invoice ${req.invoice_id}`,
        reference_entity_type: 'CREDIT_NOTE',
        reference_entity_id: req.credit_note_id,
      },
      {
        account_id: arAcc.id,
        debit_minor: '0',
        credit_minor: req.amount_minor,
        description: `Reduction of accounts receivable debt`,
        reference_entity_type: 'CREDIT_NOTE',
        reference_entity_id: req.credit_note_id,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Customer credit note ${req.credit_note_id}`,
      source_type: 'CUSTOMER_CREDIT_NOTE',
      source_id: req.credit_note_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'CUSTOMER_CREDIT_NOTE',
      event_type: 'CREDIT_NOTE_ISSUED',
      source_event_id: req.credit_note_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  // ==========================================================================
  // 2. Procurement & Accounts Payable Integration
  // ==========================================================================

  async postGoodsReceipt(
    tenantId: string,
    req: PostGoodsReceiptAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'GRN_RECEIPT', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const invAcc = await this.resolveAccount(tenantId, req.company_id, '1200');
    const grniAcc = await this.resolveAccount(tenantId, req.company_id, '2020');

    const valuationMinor = req.valuation_minor ?? (req as any).intake_minor ?? '0';
    const receiptId = req.receipt_id ?? (req as any).grn_id ?? 'GRN';

    const lines = [
      {
        account_id: invAcc.id,
        debit_minor: valuationMinor,
        credit_minor: '0',
        description: `Inventory asset intake from GRN ${receiptId}`,
        reference_entity_type: 'GOODS_RECEIPT',
        reference_entity_id: receiptId,
      },
      {
        account_id: grniAcc.id,
        debit_minor: '0',
        credit_minor: valuationMinor,
        description: `GRNI accrued liability for receipt ${receiptId}`,
        reference_entity_type: 'GOODS_RECEIPT',
        reference_entity_id: receiptId,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Inbound GRN receipt valuation intake ${receiptId}`,
      source_type: 'GRN_RECEIPT',
      source_id: receiptId,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'GRN_RECEIPT',
      event_type: 'GOODS_RECEIVED',
      source_event_id: req.receipt_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postSupplierInvoice(
    tenantId: string,
    req: PostSupplierInvoiceAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'SUPPLIER_INVOICE', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const grniAcc = await this.resolveAccount(tenantId, req.company_id, '2020');
    const apAcc = await this.resolveAccount(tenantId, req.company_id, '2010');

    const lines = [
      {
        account_id: grniAcc.id,
        debit_minor: req.grni_clearing_minor,
        credit_minor: '0',
        description: `Clearing of GRNI liability for invoice ${req.invoice_id}`,
        reference_entity_type: 'SUPPLIER_INVOICE',
        reference_entity_id: req.invoice_id,
      },
    ];

    const tax = BigInt(req.tax_minor || '0');
    if (tax > 0n) {
      const taxRecAcc = await this.resolveAccount(tenantId, req.company_id, '2110');
      lines.push({
        account_id: taxRecAcc.id,
        debit_minor: req.tax_minor,
        credit_minor: '0',
        description: `Recoverable input tax for supplier invoice ${req.invoice_id}`,
        reference_entity_type: 'SUPPLIER_INVOICE',
        reference_entity_id: req.invoice_id,
      });
    }

    // Purchase Price Variance (PPV)
    if (req.price_variance_minor && req.price_variance_minor !== '0') {
      const ppvAcc = await this.resolveAccount(tenantId, req.company_id, '5030');
      const ppvBig = BigInt(req.price_variance_minor);
      if (ppvBig > 0n) {
        // Price higher than PO: Debit PPV Expense
        lines.push({
          account_id: ppvAcc.id,
          debit_minor: ppvBig.toString(),
          credit_minor: '0',
          description: `Unfavorable purchase price variance on invoice ${req.invoice_id}`,
          reference_entity_type: 'SUPPLIER_INVOICE',
          reference_entity_id: req.invoice_id,
        });
      } else {
        // Price lower than PO: Credit PPV Expense
        lines.push({
          account_id: ppvAcc.id,
          debit_minor: '0',
          credit_minor: (-ppvBig).toString(),
          description: `Favorable purchase price variance on invoice ${req.invoice_id}`,
          reference_entity_type: 'SUPPLIER_INVOICE',
          reference_entity_id: req.invoice_id,
        });
      }
    }

    // Accounts Payable Credit
    lines.push({
      account_id: apAcc.id,
      debit_minor: '0',
      credit_minor: req.total_minor,
      description: `Accounts payable obligation to supplier for invoice ${req.invoice_id}`,
      reference_entity_type: 'SUPPLIER_INVOICE',
      reference_entity_id: req.invoice_id,
    });

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Supplier invoice recognition ${req.invoice_id}`,
      source_type: 'SUPPLIER_INVOICE',
      source_id: req.invoice_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'SUPPLIER_INVOICE',
      event_type: 'INVOICE_MATCHED',
      source_event_id: req.invoice_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postSupplierPayment(
    tenantId: string,
    req: PostSupplierPaymentAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'SUPPLIER_PAYMENT', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const apAcc = await this.resolveAccount(tenantId, req.company_id, '2010');
    const bankAcc = await this.resolveAccount(tenantId, req.company_id, '1020');

    const lines = [
      {
        account_id: apAcc.id,
        debit_minor: req.amount_minor,
        credit_minor: '0',
        description: `Accounts payable reduction from supplier disbursement ${req.payment_id}`,
        reference_entity_type: 'SUPPLIER_PAYMENT',
        reference_entity_id: req.payment_id,
      },
      {
        account_id: bankAcc.id,
        debit_minor: '0',
        credit_minor: req.amount_minor,
        description: `Bank disbursement outflow via ${req.disbursement_method}`,
        reference_entity_type: 'SUPPLIER_PAYMENT',
        reference_entity_id: req.payment_id,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Supplier payment settlement ${req.payment_id}`,
      source_type: 'SUPPLIER_PAYMENT',
      source_id: req.payment_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'SUPPLIER_PAYMENT',
      event_type: 'PAYMENT_DISBURSED',
      source_event_id: req.payment_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  // ==========================================================================
  // 3. Inventory Valuation, COGS & Landed Cost
  // ==========================================================================

  async postSalesDispatchCogs(
    tenantId: string,
    req: PostSalesDispatchCogsAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'SALES_DISPATCH_COGS', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const cogsAcc = await this.resolveAccount(tenantId, req.company_id, '5010');
    const invAcc = await this.resolveAccount(tenantId, req.company_id, '1200');

    const lines = [
      {
        account_id: cogsAcc.id,
        debit_minor: req.cogs_amount_minor,
        credit_minor: '0',
        description: `Direct Cost of Goods Sold for dispatch ${req.dispatch_id}`,
        reference_entity_type: 'ORDER_DISPATCH',
        reference_entity_id: req.dispatch_id,
      },
      {
        account_id: invAcc.id,
        debit_minor: '0',
        credit_minor: req.cogs_amount_minor,
        description: `Inventory asset reduction on commercial dispatch ${req.dispatch_id}`,
        reference_entity_type: 'ORDER_DISPATCH',
        reference_entity_id: req.dispatch_id,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `COGS recognition for dispatch ${req.dispatch_id}`,
      source_type: 'SALES_DISPATCH_COGS',
      source_id: req.dispatch_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'SALES_DISPATCH_COGS',
      event_type: 'DISPATCH_FULFILLED',
      source_event_id: req.dispatch_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postLandedCost(
    tenantId: string,
    req: PostLandedCostAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'LANDED_COST', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const debitAccCode = req.is_capitalized ? '1200' : '5050'; // Capitalized into Inventory or Expensed
    const debitAcc = await this.resolveAccount(tenantId, req.company_id, debitAccCode);
    const clearingAcc = await this.resolveAccount(tenantId, req.company_id, '2020');

    const lines = [
      {
        account_id: debitAcc.id,
        debit_minor: req.total_cost_minor,
        credit_minor: '0',
        description: `Landed cost allocation voucher ${req.voucher_id}`,
        reference_entity_type: 'LANDED_COST',
        reference_entity_id: req.voucher_id,
      },
      {
        account_id: clearingAcc.id,
        debit_minor: '0',
        credit_minor: req.total_cost_minor,
        description: `Landed cost accrued freight/customs clearing liability`,
        reference_entity_type: 'LANDED_COST',
        reference_entity_id: req.voucher_id,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Landed cost voucher capitalization ${req.voucher_id}`,
      source_type: 'LANDED_COST',
      source_id: req.voucher_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'LANDED_COST',
      event_type: 'VOUCHER_ALLOCATED',
      source_event_id: req.voucher_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postInventoryLoss(
    tenantId: string,
    req: PostInventoryLossAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'INVENTORY_LOSS', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const lossAcc = await this.resolveAccount(tenantId, req.company_id, '5020');
    const invAcc = await this.resolveAccount(tenantId, req.company_id, '1200');

    const lossCostMinor = req.loss_cost_minor ?? (req as any).amount_minor ?? '0';

    const lines = [
      {
        account_id: lossAcc.id,
        debit_minor: lossCostMinor,
        credit_minor: '0',
        description: `Inventory write-off / loss (${req.reason ?? 'WRITE_OFF'})`,
        reference_entity_type: 'STOCK_MOVEMENT',
        reference_entity_id: req.movement_id,
      },
      {
        account_id: invAcc.id,
        debit_minor: '0',
        credit_minor: lossCostMinor,
        description: `Inventory stock reduction from write-off`,
        reference_entity_type: 'STOCK_MOVEMENT',
        reference_entity_id: req.movement_id,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Inventory loss write-off ${req.movement_id}`,
      source_type: 'INVENTORY_LOSS',
      source_id: req.movement_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'INVENTORY_LOSS',
      event_type: 'STOCK_WRITTEN_OFF',
      source_event_id: req.movement_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  // ==========================================================================
  // 4. Manufacturing & Work-in-Process (WIP) Integration
  // ==========================================================================

  async postManufacturingWipConsumption(
    tenantId: string,
    req: PostManufacturingWipAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'MANUFACTURING_WIP_CONSUMPTION', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const wipAcc = await this.resolveAccount(tenantId, req.company_id, '1400');
    const rawInvAcc = await this.resolveAccount(tenantId, req.company_id, '1200');

    const consumedCostMinor = req.consumed_material_cost_minor ?? (req as any).amount_minor ?? '0';
    const moId = req.mo_id ?? (req as any).production_order_id ?? 'MO';

    const lines = [
      {
        account_id: wipAcc.id,
        debit_minor: consumedCostMinor,
        credit_minor: '0',
        description: `WIP asset capitalization of components for MO ${moId}`,
        reference_entity_type: 'MANUFACTURING_ORDER',
        reference_entity_id: moId,
      },
      {
        account_id: rawInvAcc.id,
        debit_minor: '0',
        credit_minor: consumedCostMinor,
        description: `Raw material inventory depletion for MO ${moId}`,
        reference_entity_type: 'MANUFACTURING_ORDER',
        reference_entity_id: moId,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: (req as { narration?: string }).narration ?? `Material consumption WIP capitalization for MO ${moId}`,
      source_type: 'MANUFACTURING_WIP_CONSUMPTION',
      source_id: moId,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'MANUFACTURING_WIP_CONSUMPTION',
      event_type: 'COMPONENTS_CONSUMED',
      source_event_id: moId,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postManufacturingFgReceipt(
    tenantId: string,
    req: PostManufacturingFgReceiptAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'MANUFACTURING_FG_RECEIPT', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const fgInvAcc = await this.resolveAccount(tenantId, req.company_id, '1200');
    const wipAcc = await this.resolveAccount(tenantId, req.company_id, '1400');

    const fgCostMinor = req.fg_cost_minor ?? (req as any).amount_minor ?? '0';
    const moId = req.mo_id ?? (req as any).production_order_id ?? 'MO';

    const lines = [
      {
        account_id: fgInvAcc.id,
        debit_minor: fgCostMinor,
        credit_minor: '0',
        description: `Finished goods inventory receipt from MO ${moId}`,
        reference_entity_type: 'MANUFACTURING_ORDER',
        reference_entity_id: moId,
      },
      {
        account_id: wipAcc.id,
        debit_minor: '0',
        credit_minor: fgCostMinor,
        description: `WIP asset relief upon finished output for MO ${moId}`,
        reference_entity_type: 'MANUFACTURING_ORDER',
        reference_entity_id: moId,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: (req as { narration?: string }).narration ?? `Finished goods inventory intake from MO ${moId}`,
      source_type: 'MANUFACTURING_FG_RECEIPT',
      source_id: moId,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'MANUFACTURING_FG_RECEIPT',
      event_type: 'OUTPUT_ACCEPTED',
      source_event_id: moId,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  async postManufacturingScrap(
    tenantId: string,
    req: PostManufacturingScrapAccountingRequest,
  ): Promise<JournalEntry | null> {
    if (req.is_process_loss) {
      // Process loss is absorbed in WIP production cost without a second stock/accounting deduction
      return null;
    }

    const key = this.getSourceEventKey(tenantId, req.company_id, 'MANUFACTURING_SCRAP', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const scrapAcc = await this.resolveAccount(tenantId, req.company_id, '5020');
    const wipAcc = await this.resolveAccount(tenantId, req.company_id, '1400');

    const scrapCostMinor = req.scrap_cost_minor ?? (req as any).amount_minor ?? '0';
    const moId = req.mo_id ?? (req as any).production_order_id ?? 'MO';

    const lines = [
      {
        account_id: scrapAcc.id,
        debit_minor: scrapCostMinor,
        credit_minor: '0',
        description: `Production scrap expense for MO ${moId}`,
        reference_entity_type: 'MANUFACTURING_ORDER',
        reference_entity_id: moId,
      },
      {
        account_id: wipAcc.id,
        debit_minor: '0',
        credit_minor: scrapCostMinor,
        description: `WIP reduction for scrapped output on MO ${moId}`,
        reference_entity_type: 'MANUFACTURING_ORDER',
        reference_entity_id: moId,
      },
    ];

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: (req as { narration?: string }).narration ?? `Production scrap write-off for MO ${moId}`,
      source_type: 'MANUFACTURING_SCRAP',
      source_id: moId,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'MANUFACTURING_SCRAP',
      event_type: 'SCRAP_RECORDED',
      source_event_id: req.mo_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }

  // ==========================================================================
  // 5. Till & Cash Variance Reconciliation
  // ==========================================================================

  async postCashVariance(
    tenantId: string,
    req: PostCashVarianceAccountingRequest,
  ): Promise<JournalEntry> {
    const key = this.getSourceEventKey(tenantId, req.company_id, 'CASH_VARIANCE', req.operation_id);
    const existing = this.sourceEvents.get(key);
    if (existing?.journal_entry_id) {
      return this.glService.getJournalEntryById(tenantId, existing.journal_entry_id);
    }

    const cashAcc = await this.resolveAccount(tenantId, req.company_id, '1010');
    const varianceBig = BigInt(req.variance_minor);

    let lines: { account_id: string; debit_minor: string; credit_minor: string; description: string }[];

    if (varianceBig < 0n) {
      // Shortage: Debit Expense (5040), Credit Cash (1010)
      const absShortage = (-varianceBig).toString();
      const expAcc = await this.resolveAccount(tenantId, req.company_id, '5040');
      lines = [
        {
          account_id: expAcc.id,
          debit_minor: absShortage,
          credit_minor: '0',
          description: `Cash drawer shortage expense for register ${req.register_id}`,
        },
        {
          account_id: cashAcc.id,
          debit_minor: '0',
          credit_minor: absShortage,
          description: `Cash balance adjustment for register ${req.register_id}`,
        },
      ];
    } else {
      // Overage: Debit Cash (1010), Credit Revenue (4040)
      const revAcc = await this.resolveAccount(tenantId, req.company_id, '4040');
      lines = [
        {
          account_id: cashAcc.id,
          debit_minor: req.variance_minor,
          credit_minor: '0',
          description: `Cash drawer overage intake for register ${req.register_id}`,
        },
        {
          account_id: revAcc.id,
          debit_minor: '0',
          credit_minor: req.variance_minor,
          description: `Cash overage miscellaneous income for register ${req.register_id}`,
        },
      ];
    }

    const entry = await this.glService.createJournalEntry(tenantId, {
      company_id: req.company_id,
      posting_date: req.posting_date,
      narration: `Register till cash variance ${req.register_id}`,
      source_type: 'CASH_VARIANCE',
      source_id: req.session_id,
      operation_id: req.operation_id,
      currency: req.currency,
      lines,
    });

    const now = new Date().toISOString();
    this.sourceEvents.set(key, {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: req.company_id,
      book_id: entry.book_id ?? 'MAIN',
      source_module: 'CASH_VARIANCE',
      event_type: 'TILL_CLOSED',
      source_event_id: req.session_id,
      operation_id: req.operation_id,
      journal_entry_id: entry.id,
      status: 'POSTED',
      created_at: now,
      updated_at: now,
    });

    return entry;
  }
}
