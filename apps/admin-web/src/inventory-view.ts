/**
 * STOKROVA Admin Web — 8-Tier Hierarchical Inventory View & FEFO Lot Explorer
 * Visual tree navigation (Company -> Division -> Facility -> Zone -> Aisle -> Rack -> Shelf -> Bin),
 * FEFO expiration tracking, SSCC-18 pallet containers, quarantine/hold management.
 */

import { themeTokens, semanticTokens } from '@stokrova/ui';

export type InventoryTier =
  | 'COMPANY'
  | 'DIVISION'
  | 'FACILITY'
  | 'ZONE'
  | 'AISLE'
  | 'RACK'
  | 'SHELF'
  | 'BIN';

export interface InventoryLocationNode {
  id: string;
  code: string;
  name: string;
  tier: InventoryTier;
  parentId: string | null;
  capacityUnits?: number;
  occupiedUnits?: number;
  isQuarantined?: boolean;
}

export type FefoStatus = 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRED';
export type LotHoldStatus = 'ACTIVE' | 'QA_HOLD' | 'REJECTED';

export interface LotBatchItem {
  lotNumber: string;
  sku: string;
  productName: string;
  binLocationCode: string;
  quantity: number;
  expiryDateIso: string;
  ssccPalletId?: string;
  holdStatus: LotHoldStatus;
  receivedDateIso: string;
}

export interface StockMovementRecord {
  id: string;
  timestampIso: string;
  sku: string;
  fromBin: string;
  toBin: string;
  quantity: number;
  operatorId: string;
  reason: string;
}

export class InventoryViewModel {
  private locations: Map<string, InventoryLocationNode> = new Map();
  private lots: Map<string, LotBatchItem> = new Map();
  private movements: StockMovementRecord[] = [];
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public addLocation(location: InventoryLocationNode): void {
    this.locations.set(location.id, { ...location });
  }

  public getLocation(id: string): InventoryLocationNode | undefined {
    const loc = this.locations.get(id);
    return loc ? { ...loc } : undefined;
  }

  public getChildLocations(parentId: string | null): InventoryLocationNode[] {
    return Array.from(this.locations.values()).filter((l) => l.parentId === parentId);
  }

  public addLot(lot: LotBatchItem): void {
    this.lots.set(lot.lotNumber, { ...lot });
  }

  public getLot(lotNumber: string): LotBatchItem | undefined {
    const item = this.lots.get(lotNumber);
    return item ? { ...item } : undefined;
  }

  public getAllLots(): LotBatchItem[] {
    return Array.from(this.lots.values());
  }

  public calculateFefoStatus(expiryDateIso: string, now: Date = new Date()): {
    daysRemaining: number;
    status: FefoStatus;
  } {
    const expiry = new Date(expiryDateIso);
    const diffTime = expiry.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return { daysRemaining, status: 'EXPIRED' };
    }
    if (daysRemaining <= 30) {
      return { daysRemaining, status: 'NEAR_EXPIRY' };
    }
    return { daysRemaining, status: 'FRESH' };
  }

  public setLotHoldStatus(lotNumber: string, status: LotHoldStatus): void {
    const lot = this.lots.get(lotNumber);
    if (!lot) {
      throw new Error(`Lot ${lotNumber} not found`);
    }
    lot.holdStatus = status;
  }

  public transferStock(
    sku: string,
    fromBin: string,
    toBin: string,
    quantity: number,
    operatorId: string,
    reason: string,
  ): StockMovementRecord {
    const movement: StockMovementRecord = {
      id: `mvt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestampIso: new Date().toISOString(),
      sku,
      fromBin,
      toBin,
      quantity,
      operatorId,
      reason,
    };
    this.movements.unshift(movement);
    return movement;
  }

  public getMovements(): StockMovementRecord[] {
    return [...this.movements];
  }

  // ==========================================
  // HTML Views
  // ==========================================

  public renderFefoExplorerHtml(): string {
    const tokens = themeTokens[this.theme];
    const lots = this.getAllLots();

    const rowsHtml = lots
      .map((lot) => {
        const fefo = this.calculateFefoStatus(lot.expiryDateIso);
        const st = semanticTokens;
        let statusBadgeColor: string = st.success[this.theme].text;
        if (fefo.status === 'NEAR_EXPIRY') statusBadgeColor = st.warning[this.theme].text;
        if (fefo.status === 'EXPIRED') statusBadgeColor = st.error[this.theme].text;

        let holdBadge = `<span style="color: ${st.success[this.theme].text};">ACTIVE</span>`;
        if (lot.holdStatus === 'QA_HOLD') {
          holdBadge = `<span style="background: ${st.warning[this.theme].bg}; color: ${st.warning[this.theme].text}; border: 1px solid ${st.warning[this.theme].border}; padding: 2px 6px; border-radius: 4px; font-weight: 700;">QA HOLD</span>`;
        } else if (lot.holdStatus === 'REJECTED') {
          holdBadge = `<span style="background: ${st.error[this.theme].bg}; color: ${st.error[this.theme].text}; border: 1px solid ${st.error[this.theme].border}; padding: 2px 6px; border-radius: 4px; font-weight: 700;">REJECTED</span>`;
        }

        const palletBadge = lot.ssccPalletId
          ? `<span style="font-family: var(--stokrova-font-mono); font-size: 0.75rem; color: ${tokens.textSecondary};">SSCC: ${lot.ssccPalletId}</span>`
          : '—';

        return `
          <tr style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 10px; font-family: var(--stokrova-font-mono); font-weight: 600;">${lot.lotNumber}</td>
            <td style="padding: 10px;">${lot.productName} <span style="color: ${tokens.textMuted}; font-size: 0.8rem;">(${lot.sku})</span></td>
            <td style="padding: 10px; font-family: var(--stokrova-font-mono);">${lot.binLocationCode}</td>
            <td style="padding: 10px; text-align: center; font-weight: 600;">${lot.quantity}</td>
            <td style="padding: 10px;">
              <span style="color: ${statusBadgeColor}; font-weight: 600;">${lot.expiryDateIso.split('T')[0]}</span>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted};">${fefo.daysRemaining} days left (${fefo.status})</div>
            </td>
            <td style="padding: 10px;">${holdBadge}</td>
            <td style="padding: 10px;">${palletBadge}</td>
          </tr>
        `.trim();
      })
      .join('\n');

    return `
      <div class="fefo-explorer" style="color: ${tokens.textPrimary};">
        <div class="explorer-header" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: ${tokens.textPrimary};">FEFO Lot & Expiry Intelligence</h3>
          <div style="font-size: 0.85rem; color: ${tokens.textSecondary};">Total Monitored Lots: <strong>${lots.length}</strong></div>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px;">
          <thead>
            <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; font-size: 0.85rem; color: ${tokens.textSecondary};">
              <th style="padding: 12px 10px;">Lot Number</th>
              <th style="padding: 12px 10px;">Product & SKU</th>
              <th style="padding: 12px 10px;">Bin Location</th>
              <th style="padding: 12px 10px; text-align: center;">Units</th>
              <th style="padding: 12px 10px;">Expiry & FEFO</th>
              <th style="padding: 12px 10px;">QA Status</th>
              <th style="padding: 12px 10px;">Pallet License Plate</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7" style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No inventory lots recorded</td></tr>`}
          </tbody>
        </table>
      </div>
    `.trim();
  }

  public renderHierarchyTreeHtml(parentId: string | null = null, depth = 0): string {
    const tokens = themeTokens[this.theme];
    const children = this.getChildLocations(parentId);
    if (children.length === 0) return '';

    const listItems = children
      .map((child) => {
        const indent = depth * 20;
        const capacityRatio = child.capacityUnits ? Math.round(((child.occupiedUnits ?? 0) / child.capacityUnits) * 100) : 0;
        const badgeColor = child.isQuarantined ? semanticTokens.error[this.theme].text : tokens.primary;

        const subTree = this.renderHierarchyTreeHtml(child.id, depth + 1);

        return `
          <div class="tree-node" style="margin-left: ${indent}px; padding: 6px 0; border-bottom: 1px solid ${tokens.border};">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <span style="display: inline-block; width: 60px; font-size: 0.75rem; font-weight: 700; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 1px 4px; border-radius: 3px; text-align: center;">${child.tier}</span>
                <strong style="margin-left: 8px; font-family: var(--stokrova-font-mono);">${child.code}</strong>
                <span style="color: ${tokens.textSecondary}; margin-left: 8px;">${child.name}</span>
              </div>
              ${child.capacityUnits ? `<div style="font-size: 0.8rem; color: ${tokens.textMuted};">${child.occupiedUnits}/${child.capacityUnits} units (${capacityRatio}%)</div>` : ''}
            </div>
            ${subTree}
          </div>
        `.trim();
      })
      .join('\n');

    return `<div class="tree-branch">${listItems}</div>`;
  }
}
