/**
 * STOKROVA Admin Web — Master Product Catalog & Matrix Grid Explorer
 * Multi-attribute variants, category trees, barcode aliases, and pricing tier visualizer.
 */

import { formatCurrencyMinor, themeTokens, semanticTokens } from '@stokrova/ui';

export interface ProductVariantItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  attributes: Record<string, string>; // e.g. { size: 'XL', color: 'Navy' }
  costPriceMinor: bigint;
  retailPriceMinor: bigint;
  wholesalePriceMinor: bigint;
  stockOnHand: number;
  barcodeAliases: string[];
  isArchived: boolean;
}

export interface CategoryTreeNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  productCount: number;
  children: CategoryTreeNode[];
}

export interface MatrixDimension {
  primaryAttribute: string; // e.g. 'color'
  secondaryAttribute: string; // e.g. 'size'
  primaryValues: string[];
  secondaryValues: string[];
}

export class CatalogViewModel {
  private products: Map<string, ProductVariantItem> = new Map();
  private categories: CategoryTreeNode[] = [];
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public addProduct(item: ProductVariantItem): void {
    this.products.set(item.sku, { ...item, barcodeAliases: item.barcodeAliases ?? [] });
  }

  public getProductBySku(sku: string): ProductVariantItem | undefined {
    const item = this.products.get(sku);
    return item ? { ...item } : undefined;
  }

  public getProductByBarcode(barcode: string): ProductVariantItem | undefined {
    for (const item of this.products.values()) {
      if (item.barcode === barcode || (item.barcodeAliases ?? []).includes(barcode)) {
        return { ...item };
      }
    }
    return undefined;
  }

  public setCategories(categories: CategoryTreeNode[]): void {
    this.categories = categories;
  }

  public getCategories(): CategoryTreeNode[] {
    return [...this.categories];
  }

  public searchProducts(query: string, categoryFilter?: string): ProductVariantItem[] {
    const q = query.trim().toLowerCase();
    const results: ProductVariantItem[] = [];

    for (const p of this.products.values()) {
      if (p.isArchived) continue;
      if (categoryFilter && p.category !== categoryFilter) continue;

      if (!q) {
        results.push({ ...p });
        continue;
      }

      const matchSku = p.sku.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      const matchBarcode = p.barcode.toLowerCase().includes(q) || (p.barcodeAliases ?? []).some((a) => a.toLowerCase().includes(q));
      const matchAttr = Object.values(p.attributes).some((val) => val.toLowerCase().includes(q));

      if (matchSku || matchName || matchBarcode || matchAttr) {
        results.push({ ...p });
      }
    }

    return results;
  }

  public updatePricing(sku: string, retailMinor: bigint, wholesaleMinor: bigint): void {
    const item = this.products.get(sku);
    if (!item) {
      throw new Error(`Product SKU ${sku} not found`);
    }
    item.retailPriceMinor = retailMinor;
    item.wholesalePriceMinor = wholesaleMinor;
  }

  public addBarcodeAlias(sku: string, alias: string): void {
    const item = this.products.get(sku);
    if (!item) {
      throw new Error(`Product SKU ${sku} not found`);
    }
    if (!item.barcodeAliases) {
      item.barcodeAliases = [];
    }
    if (!item.barcodeAliases.includes(alias)) {
      item.barcodeAliases.push(alias);
    }
  }

  public getMatrixGrid(familyBaseName: string, primaryAttr: string, secondaryAttr: string): {
    matrix: MatrixDimension;
    cells: Map<string, { sku: string; stock: number; retailPriceMinor: bigint }>;
  } {
    const familyItems = Array.from(this.products.values()).filter((p) => p.name.startsWith(familyBaseName));
    const primSet = new Set<string>();
    const secSet = new Set<string>();
    const cells = new Map<string, { sku: string; stock: number; retailPriceMinor: bigint }>();

    for (const item of familyItems) {
      const pVal = item.attributes[primaryAttr] ?? 'Default';
      const sVal = item.attributes[secondaryAttr] ?? 'Default';
      primSet.add(pVal);
      secSet.add(sVal);
      cells.set(`${pVal}::${sVal}`, {
        sku: item.sku,
        stock: item.stockOnHand,
        retailPriceMinor: item.retailPriceMinor,
      });
    }

    return {
      matrix: {
        primaryAttribute: primaryAttr,
        secondaryAttribute: secondaryAttr,
        primaryValues: Array.from(primSet).sort(),
        secondaryValues: Array.from(secSet).sort(),
      },
      cells,
    };
  }

  // ==========================================
  // HTML Rendering
  // ==========================================

  public renderCatalogTableHtml(productsList?: ProductVariantItem[], currency = 'USD'): string {
    const tokens = themeTokens[this.theme];
    const items = productsList ?? Array.from(this.products.values());

    const rowsHtml = items
      .map((item) => {
        const attrBadges = Object.entries(item.attributes)
          .map(([k, v]) => `<span class="attr-pill" style="border: 1px solid ${tokens.borderStrong}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 4px;">${k}: ${v}</span>`)
          .join('');
        const aliases = (item.barcodeAliases?.length ?? 0) > 0 ? `<div style="font-size: 0.7rem; color: ${tokens.textMuted};">Aliases: ${item.barcodeAliases.join(', ')}</div>` : '';

        return `
          <tr style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 10px; font-weight: 600; font-family: var(--stokrova-font-mono);">${item.sku}</td>
            <td style="padding: 10px;">
              <div>${item.name}</div>
              <div style="margin-top: 4px;">${attrBadges}</div>
            </td>
            <td style="padding: 10px; font-family: var(--stokrova-font-mono);">
              <div>${item.barcode}</div>
              ${aliases}
            </td>
            <td style="padding: 10px;">
              <span class="badge" style="background: ${tokens.cardHover}; padding: 2px 8px; border-radius: 4px;">${item.category}</span>
            </td>
            <td style="padding: 10px; text-align: right; font-family: var(--stokrova-font-mono);">${formatCurrencyMinor(item.retailPriceMinor, currency)}</td>
            <td style="padding: 10px; text-align: right; font-family: var(--stokrova-font-mono); color: ${tokens.textSecondary};">${formatCurrencyMinor(item.wholesalePriceMinor, currency)}</td>
            <td style="padding: 10px; text-align: center; font-weight: ${item.stockOnHand < 10 ? '700' : 'normal'}; color: ${item.stockOnHand < 10 ? semanticTokens.warning[this.theme].text : tokens.textPrimary};">
              ${item.stockOnHand}
            </td>
          </tr>
        `.trim();
      })
      .join('\n');

    return `
      <div class="catalog-view" style="color: ${tokens.textPrimary};">
        <div class="catalog-toolbar" style="display: flex; justify-content: space-between; margin-bottom: 16px;">
          <input type="text" placeholder="Search SKU, name, attribute, or barcode..." style="background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.border}; padding: 8px 12px; border-radius: 6px; width: 360px;" />
          <button style="background: ${tokens.primary}; color: #000; font-weight: 600; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">+ New Product</button>
        </div>
        <table class="stokrova-table" style="width: 100%; border-collapse: collapse; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: ${tokens.cardHover}; border-bottom: 2px solid ${tokens.borderStrong}; text-align: left; font-size: 0.85rem; color: ${tokens.textSecondary};">
              <th style="padding: 12px 10px;">SKU</th>
              <th style="padding: 12px 10px;">Product Name & Attributes</th>
              <th style="padding: 12px 10px;">Primary Barcode</th>
              <th style="padding: 12px 10px;">Category</th>
              <th style="padding: 12px 10px; text-align: right;">Retail Price</th>
              <th style="padding: 12px 10px; text-align: right;">Wholesale Price</th>
              <th style="padding: 12px 10px; text-align: center;">Stock</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7" style="padding: 24px; text-align: center; color: ${tokens.textMuted};">No products found matching criteria</td></tr>`}
          </tbody>
        </table>
      </div>
    `.trim();
  }
}
