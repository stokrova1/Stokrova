import { describe, it, expect } from 'vitest';
import { PosCatalogService } from './pos-catalog.service.js';

const variants = { getVariants: async () => [{ id: 'v1', sku: 'TEA', barcode: null, selling_price_minor: '1000', cost_price_minor: '600' }] } as any;
const stock = { getBalances: async () => [
  { variant_id: 'v1', on_hand_quantity: 8, available_to_promise: 5 },
  { variant_id: 'v1', on_hand_quantity: 2, available_to_promise: 2 },
] } as any;

describe('till product list', () => {
  it('shows the price after price rules and the stock summed across locations', async () => {
    const pricing = { resolvePriceAdvanced: async () => ({ resolved_unit_price_minor: '900' }) } as any;
    const [p] = await new PosCatalogService(variants, pricing, stock).listSellable('t1');
    expect(p).toMatchObject({ list_price_minor: '1000', price_minor: '900', on_hand_quantity: 10, available_quantity: 7 });
  });
  it('falls back to the list price when no price rule applies', async () => {
    const pricing = { resolvePriceAdvanced: async () => { throw new Error('none'); } } as any;
    const [p] = await new PosCatalogService(variants, pricing, stock).listSellable('t1');
    expect(p!.price_minor).toBe('1000');
  });
});
