import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { PricingService } from './pricing.service.js';

describe('Pricing, Tax & Cart Calculation Services (Phase 3A)', () => {
  let tenancyService: TenancyService;
  let variantsService: VariantsService;
  let pricingService: PricingService;

  let tenant1Id: string;
  let tenant2Id: string;
  let variant1Id: string;
  let variant2Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    const uomService = new UomService();
    const categoriesService = new CategoriesService();
    const brandsService = new BrandsService();
    const templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    variantsService = new VariantsService(templatesService);

    pricingService = new PricingService(variantsService);

    // Setup Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Nexus Retail',
        slug: 'nexus-retail',
        owner_email: 'owner@nexus.com',
        owner_full_name: 'Nexus Owner',
        default_currency: 'USD',
      },
      'usr_nexus',
    );
    tenant1Id = t1.tenant.id;

    // Setup Tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Vortex Store',
        slug: 'vortex-store',
        owner_email: 'owner@vortex.com',
        owner_full_name: 'Vortex Owner',
        default_currency: 'EUR',
      },
      'usr_vortex',
    );
    tenant2Id = t2.tenant.id;

    // Create UOM, Category, Template, Variant in Tenant 1
    const uom = await uomService.createUom(tenant1Id, {
      code: 'EA',
      name: 'Each',
      category: 'COUNT',
      is_base_unit: true,
    });
    const cat = await categoriesService.createCategory(tenant1Id, {
      code: 'TECH',
      name: 'Technology',
    });
    const tmpl = await templatesService.createTemplate(tenant1Id, {
      code: 'TMPL-PHONE',
      name: 'Smart Phone',
      base_uom_id: uom.id,
      category_id: cat.id,
      type: 'STANDARD',
      tracking_policy: 'SERIAL',
    });

    const tmplCase = await templatesService.createTemplate(tenant1Id, {
      code: 'TMPL-CASE',
      name: 'Phone Case',
      base_uom_id: uom.id,
      category_id: cat.id,
      type: 'STANDARD',
      tracking_policy: 'NONE',
    });

    const v1 = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl.id,
      sku: 'PHONE-BASE',
      cost_price_minor: '40000', // $400.00
      selling_price_minor: '60000', // $600.00
      attributes: {},
    });
    variant1Id = v1.id;

    const v2 = await variantsService.createVariant(tenant1Id, {
      template_id: tmplCase.id,
      sku: 'PHONE-CASE',
      cost_price_minor: '1000', // $10.00
      selling_price_minor: '2500', // $25.00
      attributes: {},
    });
    variant2Id = v2.id;
  });

  describe('Price Lists & Volume Rules', () => {
    it('creates pricelists and rotates default status appropriately', async () => {
      const pl1 = await pricingService.createPriceList(tenant1Id, {
        code: 'STANDARD_RETAIL',
        name: 'Standard Retail',
        currency_code: 'USD',
        is_default: true,
      });

      expect(pl1.is_default).toBe(true);

      const pl2 = await pricingService.createPriceList(tenant1Id, {
        code: 'WHOLESALE',
        name: 'Wholesale Tier',
        currency_code: 'USD',
        is_default: true,
      });

      expect(pl2.is_default).toBe(true);

      // pl1 should no longer be default
      const updatedPl1 = await pricingService.getPriceListById(tenant1Id, pl1.id);
      expect(updatedPl1.is_default).toBe(false);
    });

    it('rejects duplicate pricelist codes within the same tenant', async () => {
      await pricingService.createPriceList(tenant1Id, {
        code: 'UNIQUE_PL',
        name: 'Unique Price List',
        currency_code: 'USD',
      });

      await expect(
        pricingService.createPriceList(tenant1Id, {
          code: 'unique_pl',
          name: 'Duplicate',
          currency_code: 'USD',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates tiered volume rules for variants', async () => {
      const pl = await pricingService.createPriceList(tenant1Id, {
        code: 'VOLUME_PL',
        name: 'Volume List',
        currency_code: 'USD',
      });

      const rule = await pricingService.createPriceListRule(tenant1Id, {
        pricelist_id: pl.id,
        variant_id: variant1Id,
        min_quantity: 10,
        fixed_price_minor: '55000', // $550 instead of $600 for 10+ phones
      });

      expect(rule.id).toBeDefined();
      expect(rule.fixed_price_minor).toBe('55000');

      const rules = await pricingService.getPriceListRules(tenant1Id, pl.id);
      expect(rules.length).toBe(1);
    });
  });

  describe('Tax Rates & Discount Promotions', () => {
    it('creates tax rates with unique codes', async () => {
      const tax = await pricingService.createTaxRate(tenant1Id, {
        code: 'VAT_10',
        name: 'VAT 10%',
        rate_bp: 1000,
        inclusion_type: 'INCLUSIVE',
      });

      expect(tax.code).toBe('VAT_10');
      expect(tax.rate_bp).toBe(1000);

      await expect(
        pricingService.createTaxRate(tenant1Id, {
          code: 'vat_10',
          name: 'Duplicate VAT',
          rate_bp: 1000,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates and retrieves promotional discount coupons', async () => {
      const promo = await pricingService.createDiscountPromotion(tenant1Id, {
        code: 'SAVE20',
        name: 'Save 20% on Orders over $100',
        discount_type: 'PERCENTAGE',
        value_minor_or_bp: '2000',
        max_discount_minor: '5000', // max $50
        min_subtotal_minor: '10000', // min $100
      });

      expect(promo.code).toBe('SAVE20');

      const retrieved = await pricingService.getPromotionByCode(tenant1Id, 'save20');
      expect(retrieved?.id).toBe(promo.id);
    });
  });

  describe('calculateCart (End-to-End Pipeline Execution)', () => {
    it('executes full cart pricing calculation with volume rules, stacked taxes, and promo code', async () => {
      // 1. Setup Pricelist with Volume Rule
      const pl = await pricingService.createPriceList(tenant1Id, {
        code: 'CORP_DEAL',
        name: 'Corporate Deal',
        currency_code: 'USD',
        is_default: true,
      });

      await pricingService.createPriceListRule(tenant1Id, {
        pricelist_id: pl.id,
        variant_id: variant1Id,
        min_quantity: 5,
        fixed_price_minor: '54000', // $540 for 5+ units (base is $600)
      });

      // 2. Setup Taxes (7% State Exclusive, 2% City Exclusive)
      const stateTax = await pricingService.createTaxRate(tenant1Id, {
        code: 'STATE_TAX',
        name: 'State Tax 7%',
        rate_bp: 700,
        inclusion_type: 'EXCLUSIVE',
      });
      const cityTax = await pricingService.createTaxRate(tenant1Id, {
        code: 'CITY_TAX',
        name: 'City Tax 2%',
        rate_bp: 200,
        inclusion_type: 'EXCLUSIVE',
      });

      // 3. Setup Promo Coupon ($100 off orders over $2000)
      await pricingService.createDiscountPromotion(tenant1Id, {
        code: 'CORP100',
        name: '$100 off corporate order',
        discount_type: 'FIXED_AMOUNT',
        value_minor_or_bp: '10000', // $100.00
        min_subtotal_minor: '200000', // min $2000
      });

      // 4. Calculate Cart:
      // - 5 Phones @ $540 volume price = $2,700.00 (270000 minor)
      // - 10 Cases @ $25 base price with 10% line discount = $250.00 - $25.00 = $225.00
      const calcResult = await pricingService.calculateCart(tenant1Id, {
        currency_code: 'USD',
        promo_code: 'corp100',
        items: [
          {
            variant_id: variant1Id,
            quantity: 5,
            base_unit_price_minor: '60000',
            tax_rate_ids: [stateTax.id, cityTax.id],
          },
          {
            variant_id: variant2Id,
            quantity: 10,
            base_unit_price_minor: '2500',
            line_discount_percent_bp: 1000, // 10%
            tax_rate_ids: [stateTax.id],
          },
        ],
      });

      const summary = calcResult.summary;

      // Line 1: Phones
      expect(summary.items[0]?.effective_unit_price_minor).toBe('54000');
      expect(summary.items[0]?.gross_subtotal_minor).toBe('270000'); // $2,700.00
      expect(summary.items[0]?.taxes.length).toBe(2);

      // Line 2: Cases
      expect(summary.items[1]?.effective_unit_price_minor).toBe('2500');
      expect(summary.items[1]?.gross_subtotal_minor).toBe('25000'); // $250.00
      expect(summary.items[1]?.discount_amount_minor).toBe('2500'); // $25.00 discount

      // Cart Subtotal: $2,700 + $250 = $2,950.00 (295000 minor)
      expect(summary.subtotal_minor).toBe('295000');

      // Total Discounts: $25 (line) + $100 (coupon) = $125.00 (12500 minor)
      expect(summary.discount_total_minor).toBe('12500');

      // Grand total = subtotal ($2950) - discount ($125) + exclusive taxes
      const expectedTaxableSubtotal = 295000n - 12500n;
      expect(BigInt(summary.grand_total_minor)).toBeGreaterThan(expectedTaxableSubtotal);
    });

    it('enforces multi-tenant isolation across pricelists and calculations', async () => {
      const plTenant1 = await pricingService.createPriceList(tenant1Id, {
        code: 'T1_PL',
        name: 'Tenant 1 List',
        currency_code: 'USD',
      });

      // Tenant 2 cannot access Tenant 1 pricelist
      await expect(
        pricingService.getPriceListById(tenant2Id, plTenant1.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
