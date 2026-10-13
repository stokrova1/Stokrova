/**
 * STOKROVA Admin Web — Sales & Purchase Order Ledgers
 * Status progression pipeline (Draft -> Approved -> Picked -> Packed -> Invoiced -> Paid -> Dispatched),
 * PO Receiving & 3-Way Matching (PO Qty vs Received Qty vs Invoice Qty).
 */

import { formatCurrencyMinor, themeTokens } from '@stokrova/ui';

export type SalesOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'PICKED'
  | 'PACKED'
  | 'INVOICED'
  | 'PAID'
  | 'DISPATCHED'
  | 'CANCELLED';

export interface SalesOrderLine {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPriceMinor: bigint;
  discountMinor: bigint;
  taxRateBps: number;
  lineTotalMinor: bigint;
}

export interface SalesOrderRecord {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  status: SalesOrderStatus;
  createdAtIso: string;
  lines: SalesOrderLine[];
  totalMinor: bigint;
  currencyCode: string;
}

export type ThreeWayMatchStatus = 'MATCHED' | 'QTY_DISCREPANCY' | 'PRICE_DISCREPANCY' | 'PENDING';

export interface PurchaseOrderLineMatch {
  sku: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  invoicedQty: number;
  unitCostMinor: bigint;
  invoicedUnitCostMinor: bigint;
}

export interface PurchaseOrderRecord {
  poId: string;
  poNumber: string;
  supplierName: string;
  supplierId: string;
  status: 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'MATCHED' | 'CLOSED';
  createdAtIso: string;
  lines: PurchaseOrderLineMatch[];
  currencyCode: string;
}

export class OrdersViewModel {
  private salesOrders: Map<string, SalesOrderRecord> = new Map();
  private purchaseOrders: Map<string, PurchaseOrderRecord> = new Map();
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  // ==========================================
  // Sales Orders
  // ==========================================

  public addSalesOrder(order: SalesOrderRecord): void {
    this.salesOrders.set(order.orderId, { ...order, lines: [...order.lines] });
  }

  public getSalesOrder(orderId: string): SalesOrderRecord | undefined {
    const o = this.salesOrders.get(orderId);
    return o ? { ...o, lines: [...o.lines] } : undefined;
  }

  public getAllSalesOrders(): SalesOrderRecord[] {
    return Array.from(this.salesOrders.values());
  }

  public advanceOrderStatus(orderId: string, nextStatus: SalesOrderStatus): void {
    const order = this.salesOrders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const validTransitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
      DRAFT: ['APPROVED', 'CANCELLED'],
      APPROVED: ['PICKED', 'CANCELLED'],
      PICKED: ['PACKED', 'CANCELLED'],
      PACKED: ['INVOICED', 'CANCELLED'],
      INVOICED: ['PAID', 'DISPATCHED', 'CANCELLED'],
      PAID: ['DISPATCHED'],
      DISPATCHED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid status transition from ${order.status} to ${nextStatus}`);
    }

    order.status = nextStatus;
  }

  // ==========================================
  // Purchase Orders & 3-Way Matching
  // ==========================================

  public addPurchaseOrder(po: PurchaseOrderRecord): void {
    this.purchaseOrders.set(po.poId, { ...po, lines: [...po.lines] });
  }

  public getPurchaseOrder(poId: string): PurchaseOrderRecord | undefined {
    const po = this.purchaseOrders.get(poId);
    return po ? { ...po, lines: [...po.lines] } : undefined;
  }

  public evaluateThreeWayMatch(poId: string): {
    status: ThreeWayMatchStatus;
    lineDiscrepancies: Array<{
      sku: string;
      reason: 'QTY_MISMATCH' | 'PRICE_MISMATCH';
      expected: number | bigint;
      actual: number | bigint;
    }>;
  } {
    const po = this.purchaseOrders.get(poId);
    if (!po) {
      throw new Error(`Purchase Order ${poId} not found`);
    }

    const discrepancies: Array<{
      sku: string;
      reason: 'QTY_MISMATCH' | 'PRICE_MISMATCH';
      expected: number | bigint;
      actual: number | bigint;
    }> = [];

    for (const line of po.lines) {
      // Check if received matches invoiced
      if (line.receivedQty !== line.invoicedQty) {
        discrepancies.push({
          sku: line.sku,
          reason: 'QTY_MISMATCH',
          expected: line.receivedQty,
          actual: line.invoicedQty,
        });
      }
      // Check if PO agreed unit cost matches invoiced unit cost
      if (line.unitCostMinor !== line.invoicedUnitCostMinor) {
        discrepancies.push({
          sku: line.sku,
          reason: 'PRICE_MISMATCH',
          expected: line.unitCostMinor,
          actual: line.invoicedUnitCostMinor,
        });
      }
    }

    if (discrepancies.length === 0) {
      return { status: 'MATCHED', lineDiscrepancies: [] };
    }

    const hasPriceMismatch = discrepancies.some((d) => d.reason === 'PRICE_MISMATCH');
    return {
      status: hasPriceMismatch ? 'PRICE_DISCREPANCY' : 'QTY_DISCREPANCY',
      lineDiscrepancies: discrepancies,
    };
  }

  // ==========================================
  // HTML Rendering
  // ==========================================

  public renderPipelineHtml(): string {
    const tokens = themeTokens[this.theme];
    const stages: SalesOrderStatus[] = ['DRAFT', 'APPROVED', 'PICKED', 'PACKED', 'INVOICED', 'PAID', 'DISPATCHED'];
    const orders = this.getAllSalesOrders();

    const columnsHtml = stages
      .map((st) => {
        const inStage = orders.filter((o) => o.status === st);
        const stageCards = inStage
          .map((ord) => `
            <div class="order-pipeline-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.85rem;">
                <span style="font-family: var(--stokrova-font-mono);">${ord.orderNumber}</span>
                <span style="color: ${tokens.primary};">${formatCurrencyMinor(ord.totalMinor, ord.currencyCode)}</span>
              </div>
              <div style="font-size: 0.8rem; color: ${tokens.textSecondary}; margin-top: 4px;">${ord.customerName}</div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">${ord.lines.length} lines</div>
            </div>
          `.trim())
          .join('');

        return `
          <div class="pipeline-column" style="flex: 1; min-width: 160px; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; margin-right: 8px;">
            <div style="font-weight: 700; font-size: 0.8rem; color: ${tokens.textSecondary}; border-bottom: 2px solid ${tokens.borderStrong}; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span>${st}</span>
              <span style="background: ${tokens.cardHover}; padding: 1px 6px; border-radius: 10px;">${inStage.length}</span>
            </div>
            <div class="cards-container">${stageCards || `<div style="text-align: center; color: ${tokens.textMuted}; font-size: 0.75rem; padding: 16px 0;">Empty</div>`}</div>
          </div>
        `.trim();
      })
      .join('\n');

    return `
      <div class="orders-pipeline-view" style="display: flex; overflow-x: auto; padding-bottom: 12px;">
        ${columnsHtml}
      </div>
    `.trim();
  }
}
