import { Injectable } from '@nestjs/common';
import { VariantsService } from '../catalog/variants.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';

export interface SellableProduct {
  variant_id: string;
  sku: string;
  barcode: string | null;
  list_price_minor: string;
  price_minor: string;
  on_hand_quantity: number;
  available_quantity: number;
}

/**
 * What the till and catalog show: each product with its current price (price lists, rules and
 * promotions applied by PricingService) and its live stock from the stock ledger. Read on every
 * request, so a price change or stock movement appears without any extra sync step.
 */
@Injectable()
export class PosCatalogService {
  constructor(
    private readonly variants: VariantsService,
    private readonly pricing: PricingService,
    private readonly stock: StockLedgerService,
  ) {}

  async listSellable(tenantId: string, opts: { warehouse_id?: string; pricelist_id?: string; customer_id?: string } = {}): Promise<SellableProduct[]> {
    const [variants, balances] = await Promise.all([
      this.variants.getVariants(tenantId),
      this.stock.getBalances(tenantId, opts.warehouse_id ? { warehouse_id: opts.warehouse_id } : undefined),
    ]);
    const qty = new Map<string, { on: number; atp: number }>();
    for (const b of balances) {
      const q = qty.get(b.variant_id) || { on: 0, atp: 0 };
      q.on += b.on_hand_quantity;
      q.atp += b.available_to_promise;
      qty.set(b.variant_id, q);
    }
    return Promise.all(variants.map(async (v) => {
      let price = String(v.selling_price_minor);
      try {
        const r = await this.pricing.resolvePriceAdvanced(tenantId, {
          variant_id: v.id, quantity: 1, base_unit_price_minor: String(v.selling_price_minor),
          unit_cost_minor: String(v.cost_price_minor), channel: 'POS',
          pricelist_id: opts.pricelist_id, customer_id: opts.customer_id,
        });
        price = r.resolved_unit_price_minor;
      } catch { /* no applicable rule: list price stands */ }
      const q = qty.get(v.id) || { on: 0, atp: 0 };
      return { variant_id: v.id, sku: v.sku, barcode: v.barcode, list_price_minor: String(v.selling_price_minor), price_minor: price, on_hand_quantity: q.on, available_quantity: q.atp };
    }));
  }
}
