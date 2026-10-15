/**
 * STOKROVA Admin Web — Procurement, Suppliers & 3-Way Match Console
 * Full lifecycle vendor management, purchase order approval pipeline,
 * and 3-way match discrepancy reconciliation (PO vs GRN vs Vendor Invoice).
 */

import { formatCurrencyMinor, themeTokens, semanticTokens } from '@stokrova/ui';

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  paymentTermsDays: number;
  leadTimeDays: number;
  currencyCode: string;
  isActive: boolean;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'MATCHED'
  | 'CLOSED'
  | 'CANCELLED';

export interface PurchaseOrderLineItem {
  id: string;
  sku: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  invoicedQty: number;
  unitCostMinor: bigint;
  invoicedUnitCostMinor: bigint;
}

export interface AdminPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  createdAtIso: string;
  expectedDeliveryIso?: string;
  lines: PurchaseOrderLineItem[];
  currencyCode: string;
}

export interface ThreeWayMatchResult {
  isFullyMatched: boolean;
  status: 'MATCHED' | 'QUANTITY_DISCREPANCY' | 'PRICE_DISCREPANCY' | 'PENDING';
  discrepancies: Array<{
    sku: string;
    type: 'QTY' | 'PRICE';
    orderedOrExpected: number | bigint;
    actualInvoiced: number | bigint;
  }>;
}

export class ProcurementViewModel {
  private suppliers: Map<string, SupplierRecord> = new Map();
  private purchaseOrders: Map<string, AdminPurchaseOrder> = new Map();
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  // ==========================================
  // Suppliers
  // ==========================================

  public addSupplier(supplier: SupplierRecord): void {
    this.suppliers.set(supplier.id, { ...supplier });
  }

  public getSupplier(id: string): SupplierRecord | undefined {
    return this.suppliers.get(id);
  }

  public listSuppliers(): SupplierRecord[] {
    return Array.from(this.suppliers.values());
  }

  // ==========================================
  // Purchase Orders
  // ==========================================

  public addPurchaseOrder(po: AdminPurchaseOrder): void {
    this.purchaseOrders.set(po.id, { ...po, lines: [...po.lines] });
  }

  public getPurchaseOrder(id: string): AdminPurchaseOrder | undefined {
    const po = this.purchaseOrders.get(id);
    return po ? { ...po, lines: [...po.lines] } : undefined;
  }

  public listPurchaseOrders(): AdminPurchaseOrder[] {
    return Array.from(this.purchaseOrders.values());
  }

  public advancePoStatus(poId: string, nextStatus: PurchaseOrderStatus): void {
    const po = this.purchaseOrders.get(poId);
    if (!po) throw new Error(`PO ${poId} not found`);

    const validTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['APPROVED', 'CANCELLED'],
      APPROVED: ['ISSUED', 'CANCELLED'],
      ISSUED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
      RECEIVED: ['MATCHED', 'CLOSED'],
      MATCHED: ['CLOSED'],
      CLOSED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[po.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid PO status transition from ${po.status} to ${nextStatus}`);
    }
    po.status = nextStatus;
  }

  // ==========================================
  // 3-Way Match Verification
  // ==========================================

  public evaluateThreeWayMatch(poId: string): ThreeWayMatchResult {
    const po = this.purchaseOrders.get(poId);
    if (!po) throw new Error(`PO ${poId} not found`);

    const discrepancies: ThreeWayMatchResult['discrepancies'] = [];

    for (const line of po.lines) {
      if (line.receivedQty !== line.invoicedQty) {
        discrepancies.push({
          sku: line.sku,
          type: 'QTY',
          orderedOrExpected: line.receivedQty,
          actualInvoiced: line.invoicedQty,
        });
      }
      if (line.unitCostMinor !== line.invoicedUnitCostMinor) {
        discrepancies.push({
          sku: line.sku,
          type: 'PRICE',
          orderedOrExpected: line.unitCostMinor,
          actualInvoiced: line.invoicedUnitCostMinor,
        });
      }
    }

    if (discrepancies.length === 0) {
      return { isFullyMatched: true, status: 'MATCHED', discrepancies: [] };
    }

    const hasPrice = discrepancies.some((d) => d.type === 'PRICE');
    return {
      isFullyMatched: false,
      status: hasPrice ? 'PRICE_DISCREPANCY' : 'QUANTITY_DISCREPANCY',
      discrepancies,
    };
  }

  // ==========================================
  // HTML Rendering
  // ==========================================

  public renderSuppliersTableHtml(): string {
    const tokens = themeTokens[this.theme];
    const suppliers = this.listSuppliers();

    const rows = suppliers
      .map((s) => `
        <tr style="border-bottom: 1px solid ${tokens.border};">
          <td style="padding: 12px 14px; font-weight: 600; font-family: var(--stokrova-font-mono);">${s.code}</td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 600;">${s.name}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">${s.contactEmail}</div>
          </td>
          <td style="padding: 12px 14px; font-size: 0.8125rem;">Net ${s.paymentTermsDays} Days</td>
          <td style="padding: 12px 14px; font-size: 0.8125rem;">${s.leadTimeDays} days avg</td>
          <td style="padding: 12px 14px;">
            <span style="background: ${s.isActive ? '#14291F' : '#2C1518'}; color: ${s.isActive ? '#4ADE80' : '#F87171'}; border: 1px solid ${s.isActive ? '#1E4620' : '#5C1D24'}; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
              ${s.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </td>
          <td style="padding: 12px 14px; text-align: right;">
            <button onclick="window.stokrovaApp?.showToast('Viewing catalog for supplier ${s.code}')" style="padding: 5px 10px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">
              Catalog ↗
            </button>
          </td>
        </tr>
      `.trim())
      .join('\n');

    return `
      <div class="procurement-suppliers-view" style="color: ${tokens.textPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Approved Supplier Directory</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Master vendor agreements, payment terms, and lead time metrics</p>
          </div>
          <button onclick="window.stokrovaApp?.showToast('Supplier creation dialog opened.')" style="min-height: 44px; padding: 10px 18px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
            + Enroll Supplier
          </button>
        </div>
        <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border: 1px solid ${tokens.border}; border-radius: 8px; background: ${tokens.surface};">
          <table style="width: 100%; min-width: 680px; border-collapse: collapse;">
            <thead>
              <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; font-size: 0.8125rem; color: ${tokens.textSecondary};">
                <th style="padding: 12px 14px;">Vendor Code</th>
                <th style="padding: 12px 14px;">Company Name & Contact</th>
                <th style="padding: 12px 14px;">Terms</th>
                <th style="padding: 12px 14px;">Lead Time</th>
                <th style="padding: 12px 14px;">Status</th>
                <th style="padding: 12px 14px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="6" style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No registered suppliers</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `.trim();
  }

  public renderThreeWayMatchAuditHtml(poId?: string): string {
    const tokens = themeTokens[this.theme];
    const pos = poId ? [this.getPurchaseOrder(poId)].filter(Boolean) as AdminPurchaseOrder[] : this.listPurchaseOrders();

    const sections = pos
      .map((po) => {
        const match = this.evaluateThreeWayMatch(po.id);
        const st = semanticTokens;
        let badgeColor: { readonly bg: string; readonly text: string; readonly border: string } = st.success[this.theme];
        if (match.status !== 'MATCHED') badgeColor = st.warning[this.theme];

        const linesHtml = po.lines
          .map((l) => {
            const isQtyMatch = l.receivedQty === l.invoicedQty;
            const isPriceMatch = l.unitCostMinor === l.invoicedUnitCostMinor;

            return `
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 10px 14px; font-weight: 600; font-family: var(--stokrova-font-mono);">${l.sku}</td>
                <td style="padding: 10px 14px;">${l.productName}</td>
                <td style="padding: 10px 14px; text-align: center;">${l.orderedQty}</td>
                <td style="padding: 10px 14px; text-align: center;">${l.receivedQty}</td>
                <td style="padding: 10px 14px; text-align: center; color: ${isQtyMatch ? 'inherit' : st.error[this.theme].text}; font-weight: ${isQtyMatch ? 'normal' : '700'};">${l.invoicedQty}</td>
                <td style="padding: 10px 14px; text-align: right; font-family: var(--stokrova-font-mono);">${formatCurrencyMinor(l.unitCostMinor, po.currencyCode)}</td>
                <td style="padding: 10px 14px; text-align: right; font-family: var(--stokrova-font-mono); color: ${isPriceMatch ? 'inherit' : st.error[this.theme].text}; font-weight: ${isPriceMatch ? 'normal' : '700'};">${formatCurrencyMinor(l.invoicedUnitCostMinor, po.currencyCode)}</td>
                <td style="padding: 10px 14px; text-align: center;">
                  <span style="color: ${isQtyMatch && isPriceMatch ? st.success[this.theme].text : st.error[this.theme].text}; font-weight: 600; font-size: 0.75rem;">
                    ${isQtyMatch && isPriceMatch ? '✓ OK' : '⚠ Discrepancy'}
                  </span>
                </td>
              </tr>
            `.trim();
          })
          .join('\n');

        return `
          <div class="po-match-card" style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
            <div style="padding: 14px 18px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-family: var(--stokrova-font-mono); font-size: 0.95rem;">${po.poNumber}</strong>
                <span style="color: ${tokens.textSecondary}; margin-left: 8px;">Supplier: <strong>${po.supplierName}</strong></span>
              </div>
              <span style="background: ${badgeColor.bg}; color: ${badgeColor.text}; border: 1px solid ${badgeColor.border}; padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                ${match.status}
              </span>
            </div>
            <div class="stokrova-table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%;">
              <table style="width: 100%; min-width: 680px; border-collapse: collapse; font-size: 0.8125rem;">
                <thead>
                  <tr style="border-bottom: 1px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.7rem;">
                    <th style="padding: 10px 14px; text-align: left;">SKU</th>
                    <th style="padding: 10px 14px; text-align: left;">Product</th>
                    <th style="padding: 10px 14px; text-align: center;">PO Qty</th>
                    <th style="padding: 10px 14px; text-align: center;">Received GRN</th>
                    <th style="padding: 10px 14px; text-align: center;">Invoiced Qty</th>
                    <th style="padding: 10px 14px; text-align: right;">Agreed Price</th>
                    <th style="padding: 10px 14px; text-align: right;">Billed Price</th>
                    <th style="padding: 10px 14px; text-align: center;">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  ${linesHtml}
                </tbody>
              </table>
            </div>
          </div>
        `.trim();
      })
      .join('\n');

    return `
      <div class="three-way-match-audit-view" style="color: ${tokens.textPrimary};">
        <div style="margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Inbound Goods Receipt & 3-Way Match Verification</h3>
          <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Financial guard: audits purchase orders against warehouse physical receipts and vendor bills</p>
        </div>
        ${sections || `<div style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No purchase orders available for 3-way matching.</div>`}
      </div>
    `.trim();
  }
}
