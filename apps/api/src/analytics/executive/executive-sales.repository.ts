import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { sql, type DatabaseTransaction } from '@stokrova/database';
import type { ExecutiveSaleRecord, ParsedSalesRow } from '@stokrova/domain';
import { generateUuidV7 } from '@stokrova/domain';
import { TransactionManager } from '../../infrastructure/database/transaction.manager.js';

export type PipelineKind = 'orders' | 'invoices' | 'payments' | 'refunds';

/**
 * Reads and writes executive sales data in the tenant's own database.
 * Every call runs inside a tenant-scoped transaction so the 0013-0017 RLS policies apply.
 */
@Injectable()
export class ExecutiveSalesRepository {
  constructor(private readonly tx: TransactionManager) {}

  private async scoped<T>(tenantId: string, op: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return this.tx.execute(async (tx) => {
      if (!tx) throw new ServiceUnavailableException('Database is not connected. Set DATABASE_URL to see live figures.');
      return op(tx);
    }, { tenantId });
  }

  /**
   * Sales records for [from, to]: imported entries, plus confirmed orders (net of discount and tax)
   * with line-level historical cost, minus refunded payments.
   */
  async loadRecords(tenantId: string, from: string, to: string, timeZone: string): Promise<ExecutiveSaleRecord[]> {
    return this.scoped(tenantId, async (tx) => {
      const result: any = await tx.execute(sql`
        SELECT sale_date::text AS sale_date, net_sales_minor::text AS net, cogs_minor::text AS cogs
          FROM executive_sales_entries
         WHERE tenant_id = ${tenantId} AND sale_date BETWEEN ${from}::date AND ${to}::date
        UNION ALL
        SELECT (o.confirmed_at AT TIME ZONE ${timeZone})::date::text,
               (o.subtotal_minor - o.total_discount_minor)::text,
               CASE WHEN bool_and(l.cogs_minor IS NOT NULL) THEN sum(l.cogs_minor)::text END
          FROM sales_orders o
          LEFT JOIN sales_order_lines l ON l.order_id = o.id
         WHERE o.tenant_id = ${tenantId}
           AND o.status NOT IN ('DRAFT', 'CANCELLED')
           AND o.confirmed_at IS NOT NULL
           AND (o.confirmed_at AT TIME ZONE ${timeZone})::date BETWEEN ${from}::date AND ${to}::date
         GROUP BY o.id
        UNION ALL
        SELECT (p.occurred_at AT TIME ZONE ${timeZone})::date::text, (-p.amount_minor)::text, NULL
          FROM payments p
         WHERE p.tenant_id = ${tenantId} AND p.status = 'REFUNDED'
           AND (p.occurred_at AT TIME ZONE ${timeZone})::date BETWEEN ${from}::date AND ${to}::date
      `);
      const rows: any[] = result.rows ?? result;
      return rows.map((r) => ({
        saleDate: r.sale_date,
        netSalesMinor: Number(r.net),
        cogsMinor: r.cogs === null || r.cogs === undefined ? null : Number(r.cogs),
      }));
    });
  }

  /** Idempotent upsert by (tenant, reference): re-importing a file updates rows instead of doubling them. */
  async upsertEntries(
    tenantId: string,
    userId: string,
    rows: ParsedSalesRow[],
    currencyCode: string,
    sourceFileKey: string | null,
  ): Promise<number> {
    if (!rows.length) return 0;
    return this.scoped(tenantId, async (tx) => {
      for (const r of rows) {
        await tx.execute(sql`
          INSERT INTO executive_sales_entries
            (id, tenant_id, reference, sale_date, net_sales_minor, cogs_minor, currency_code, source, source_file_key, imported_by_user_id)
          VALUES (${generateUuidV7()}, ${tenantId}, ${r.reference}, ${r.saleDate}::date, ${r.netSalesMinor},
                  ${r.cogsMinor}, ${currencyCode}, 'SPREADSHEET', ${sourceFileKey}, ${userId})
          ON CONFLICT (tenant_id, reference) DO UPDATE SET
            sale_date = EXCLUDED.sale_date,
            net_sales_minor = EXCLUDED.net_sales_minor,
            cogs_minor = EXCLUDED.cogs_minor,
            source_file_key = EXCLUDED.source_file_key,
            updated_at = now()
        `);
      }
      return rows.length;
    });
  }

  /** Read-only pipeline lists for the admin workspace (latest first, capped). */
  async listPipeline(tenantId: string, kind: PipelineKind, limit: number): Promise<Record<string, unknown>[]> {
    const capped = Math.min(Math.max(limit, 1), 200);
    return this.scoped(tenantId, async (tx) => {
      const query = {
        orders: sql`SELECT id, order_number AS reference, status, payment_status, currency_code,
                           grand_total_minor::text AS amount_minor, created_at
                      FROM sales_orders WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${capped}`,
        invoices: sql`SELECT id, invoice_number AS reference, status, currency_code, total_minor::text AS amount_minor,
                             balance_due_minor::text AS balance_minor, issued_at AS created_at
                        FROM sales_invoices WHERE tenant_id = ${tenantId} ORDER BY issued_at DESC LIMIT ${capped}`,
        payments: sql`SELECT id, COALESCE(provider_reference, id) AS reference, status, payment_method, currency_code,
                             amount_minor::text AS amount_minor, occurred_at AS created_at
                        FROM payments WHERE tenant_id = ${tenantId} AND status <> 'REFUNDED'
                       ORDER BY occurred_at DESC LIMIT ${capped}`,
        refunds: sql`SELECT id, COALESCE(provider_reference, id) AS reference, status, payment_method, currency_code,
                            (-amount_minor)::text AS amount_minor, occurred_at AS created_at
                       FROM payments WHERE tenant_id = ${tenantId} AND status = 'REFUNDED'
                      ORDER BY occurred_at DESC LIMIT ${capped}`,
      }[kind];
      const result: any = await tx.execute(query);
      return result.rows ?? result;
    });
  }
}
