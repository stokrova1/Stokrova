import { Injectable, Logger, Optional } from '@nestjs/common';
import { sql } from '@stokrova/database';
import { TransactionManager } from './transaction.manager.js';

export interface LedgerOrderLine {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  fulfilled_quantity: number;
  unit_price_minor: string;
  discount_minor: string;
  tax_minor: string;
  line_total_minor: string;
  cogs_minor?: string | null;
}

export interface LedgerOrder {
  id: string; tenant_id: string; order_number: string; channel_type: string; branch_id: string; warehouse_id: string;
  customer_id: string | null; customer_name: string | null; customer_email: string | null; customer_phone: string | null;
  currency_code: string; status: string; payment_status: string; fulfillment_status: string;
  subtotal_minor: bigint; total_discount_minor: bigint; total_tax_minor: bigint; grand_total_minor: bigint; amount_paid_minor: bigint;
  notes: string | null; created_at: string; updated_at: string;
  confirmed_at: string | null; dispatched_at: string | null; delivered_at: string | null; cancelled_at: string | null;
  lines: LedgerOrderLine[];
}

export interface LedgerInvoice {
  id: string; tenant_id: string; invoice_number: string; order_id: string; customer_id: string | null; customer_name: string | null;
  status: string; currency_code: string; total_minor: bigint; amount_paid_minor: bigint; balance_due_minor: bigint;
  due_date: string | null; notes: string | null; issued_at: string; created_at: string; updated_at: string;
}

export interface LedgerPayment {
  id: string; tenant_id: string; order_id: string | null; invoice_id: string | null; amount_minor: bigint; currency_code: string;
  payment_method: string; status: string; provider_reference: string | null; captured_by_user_id: string;
  operation_id: string | null; occurred_at: string;
}

const ts = (v: string | null) => (v ? new Date(v).toISOString() : null);

/**
 * Write-through persistence for the sales pipeline. Services keep their fast in-memory working set,
 * and every create/state change is upserted into the tenant's database so dashboards and the
 * executive snapshot read durable records. No-op when DATABASE_URL is not configured (tests/local).
 */
@Injectable()
export class SalesLedgerWriter {
  private readonly logger = new Logger(SalesLedgerWriter.name);

  constructor(@Optional() private readonly tx?: TransactionManager) {}

  private async run(tenantId: string, label: string, op: (tx: any) => Promise<void>): Promise<void> {
    if (!this.tx) return;
    await this.tx.execute(async (tx) => {
      if (!tx) return;
      try {
        await op(tx);
      } catch (e) {
        // Surface but never lose the in-memory transaction; the record is retried on its next change.
        this.logger.error(`Failed to persist ${label}: ${(e as Error).message}`);
        throw e;
      }
    }, { tenantId });
  }

  saveOrder(o: LedgerOrder): Promise<void> {
    return this.run(o.tenant_id, `order ${o.order_number}`, async (tx) => {
      await tx.execute(sql`
        INSERT INTO sales_orders (id, tenant_id, order_number, channel_type, branch_id, warehouse_id, customer_id, customer_name,
          customer_email, customer_phone, currency_code, status, payment_status, fulfillment_status, subtotal_minor,
          total_discount_minor, total_tax_minor, grand_total_minor, amount_paid_minor, notes, created_at, updated_at,
          confirmed_at, dispatched_at, delivered_at, cancelled_at)
        VALUES (${o.id}, ${o.tenant_id}, ${o.order_number}, ${o.channel_type}, ${o.branch_id}, ${o.warehouse_id}, ${o.customer_id},
          ${o.customer_name}, ${o.customer_email}, ${o.customer_phone}, ${o.currency_code}, ${o.status}, ${o.payment_status},
          ${o.fulfillment_status}, ${o.subtotal_minor.toString()}, ${o.total_discount_minor.toString()}, ${o.total_tax_minor.toString()},
          ${o.grand_total_minor.toString()}, ${o.amount_paid_minor.toString()}, ${o.notes}, ${ts(o.created_at)}, ${ts(o.updated_at)},
          ${ts(o.confirmed_at)}, ${ts(o.dispatched_at)}, ${ts(o.delivered_at)}, ${ts(o.cancelled_at)})
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payment_status = EXCLUDED.payment_status,
          fulfillment_status = EXCLUDED.fulfillment_status, amount_paid_minor = EXCLUDED.amount_paid_minor,
          updated_at = EXCLUDED.updated_at, confirmed_at = EXCLUDED.confirmed_at, dispatched_at = EXCLUDED.dispatched_at,
          delivered_at = EXCLUDED.delivered_at, cancelled_at = EXCLUDED.cancelled_at`);
      for (const l of o.lines) {
        await tx.execute(sql`
          INSERT INTO sales_order_lines (id, tenant_id, order_id, variant_id, sku, product_name, quantity, fulfilled_quantity,
            unit_price_minor, discount_minor, tax_minor, line_total_minor, cogs_minor)
          VALUES (${l.id}, ${o.tenant_id}, ${o.id}, ${l.variant_id}, ${l.sku}, ${l.product_name}, ${l.quantity}, ${l.fulfilled_quantity},
            ${l.unit_price_minor}, ${l.discount_minor}, ${l.tax_minor}, ${l.line_total_minor}, ${l.cogs_minor ?? null})
          ON CONFLICT (id) DO UPDATE SET fulfilled_quantity = EXCLUDED.fulfilled_quantity`);
      }
    });
  }

  saveInvoice(i: LedgerInvoice): Promise<void> {
    return this.run(i.tenant_id, `invoice ${i.invoice_number}`, async (tx) => {
      await tx.execute(sql`
        INSERT INTO sales_invoices (id, tenant_id, invoice_number, order_id, customer_id, customer_name, status, currency_code,
          total_minor, amount_paid_minor, balance_due_minor, due_date, notes, issued_at, created_at, updated_at)
        VALUES (${i.id}, ${i.tenant_id}, ${i.invoice_number}, ${i.order_id}, ${i.customer_id}, ${i.customer_name}, ${i.status},
          ${i.currency_code}, ${i.total_minor.toString()}, ${i.amount_paid_minor.toString()}, ${i.balance_due_minor.toString()},
          ${ts(i.due_date)}, ${i.notes}, ${ts(i.issued_at)}, ${ts(i.created_at)}, ${ts(i.updated_at)})
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, amount_paid_minor = EXCLUDED.amount_paid_minor,
          balance_due_minor = EXCLUDED.balance_due_minor, updated_at = EXCLUDED.updated_at`);
    });
  }

  savePayment(p: LedgerPayment): Promise<void> {
    return this.run(p.tenant_id, `payment ${p.id}`, async (tx) => {
      await tx.execute(sql`
        INSERT INTO payments (id, tenant_id, order_id, invoice_id, amount_minor, currency_code, payment_method, status,
          provider_reference, captured_by_user_id, operation_id, occurred_at)
        VALUES (${p.id}, ${p.tenant_id}, ${p.order_id}, ${p.invoice_id}, ${p.amount_minor.toString()}, ${p.currency_code},
          ${p.payment_method}, ${p.status}, ${p.provider_reference}, ${p.captured_by_user_id}, ${p.operation_id}, ${ts(p.occurred_at)})
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, provider_reference = EXCLUDED.provider_reference`);
    });
  }
}
