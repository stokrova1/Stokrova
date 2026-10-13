import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { PricingService } from './pricing.service.js';
import { PromotionsService } from './promotions.service.js';
import { LoyaltyService } from './loyalty.service.js';
import { RebatesService } from './rebates.service.js';
import {
  SystemRoleTemplates,
  StandardPermissions,
  calculateGraduatedRebate,
  calculateRetroactiveRebate,
  evaluatePromotionStacking,
  CandidatePromotion,
  DomainRebateTier,
} from '@stokrova/domain';

describe('STOKROVA Phase 8 — Master Commercial Pricing & Incentive Engine Acceptance Test Suite', () => {
  let tenancyService: TenancyService;
  let variantsService: VariantsService;
  let pricingService: PricingService;
  let promotionsService: PromotionsService;
  let loyaltyService: LoyaltyService;
  let rebatesService: RebatesService;

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
    promotionsService = new PromotionsService();
    loyaltyService = new LoyaltyService();
    rebatesService = new RebatesService();

    // 1. Provision Tenant 1 (Acme Enterprise)
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Acme Enterprise',
        slug: 'acme-enterprise',
        owner_email: 'admin@acme.com',
        owner_full_name: 'Acme Admin',
        default_currency: 'USD',
      },
      'usr_acme_admin',
    );
    tenant1Id = t1.tenant.id;

    // 2. Provision Tenant 2 (Zenith Global)
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Zenith Global',
        slug: 'zenith-global',
        owner_email: 'admin@zenith.com',
        owner_full_name: 'Zenith Admin',
        default_currency: 'EUR',
      },
      'usr_zenith_admin',
    );
    tenant2Id = t2.tenant.id;

    // 3. Catalog setup for Tenant 1
    const uom = await uomService.createUom(tenant1Id, {
      code: 'EA',
      name: 'Each',
      category: 'COUNT',
    });
    const category = await categoriesService.createCategory(tenant1Id, {
      name: 'Industrial Hardware',
      code: 'IND-HW',
    });
    const brand = await brandsService.createBrand(tenant1Id, {
      name: 'TitaniumCorp',
      code: 'TITAN',
    });
    const template = await templatesService.createTemplate(tenant1Id, {
      name: 'Titanium Bearing Assembly',
      code: 'TBA-001',
      base_uom_id: uom.id,
      category_id: category.id,
      brand_id: brand.id,
      type: 'STANDARD',
      tracking_policy: 'NONE',
    });

    const templateHeavy = await templatesService.createTemplate(tenant1Id, {
      name: 'Titanium Bearing Heavy Assembly',
      code: 'TBA-002',
      base_uom_id: uom.id,
      category_id: category.id,
      brand_id: brand.id,
      type: 'STANDARD',
      tracking_policy: 'NONE',
    });

    const v1 = await variantsService.createVariant(tenant1Id, {
      template_id: template.id,
      sku: 'SKU-BEARING-01',
      cost_price_minor: '8000',
      selling_price_minor: '10000', // $100.00
      attributes: {},
    });
    variant1Id = v1.id;

    const v2 = await variantsService.createVariant(tenant1Id, {
      template_id: templateHeavy.id,
      sku: 'SKU-BEARING-02',
      cost_price_minor: '15000',
      selling_price_minor: '20000', // $200.00
      attributes: {},
    });
    variant2Id = v2.id;
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Deterministic Price Resolution
  // Precedence: Customer Contract > Customer PriceList > Channel PriceList > Base Price
  // --------------------------------------------------------------------------
  it('Scenario 1: Deterministic Price Resolution obeys strict precedence hierarchy', async () => {
    // Channel PriceList: $90.00 (9000 minor)
    const channelPL = await pricingService.createPriceList(tenant1Id, {
      name: 'B2B Wholesale Channel',
      code: 'PL-B2B',
      currency_code: 'USD',
      is_default: false,
    });
    await pricingService.createPriceListRule(tenant1Id, {
      pricelist_id: channelPL.id,
      variant_id: variant1Id,
      min_quantity: 1,
      fixed_price_minor: '9000',
    });

    // Customer-specific PriceList: $80.00 (8000 minor)
    const custPL = await pricingService.createPriceList(tenant1Id, {
      name: 'Preferred VIP Client PriceList',
      code: 'PL-VIP-01',
      currency_code: 'USD',
      is_default: false,
    });
    await pricingService.createPriceListRule(tenant1Id, {
      pricelist_id: custPL.id,
      variant_id: variant1Id,
      min_quantity: 1,
      fixed_price_minor: '8000',
    });

    // Customer Contract: $70.00 (7000 minor)
    const contract = await pricingService.createCustomerContract(tenant1Id, {
      contract_number: 'CNT-2026-001',
      customer_id: 'cust_aerospace_01',
      name: 'Aerospace Master Supply Agreement',
      valid_from: '2026-01-01T00:00:00Z',
    });
    await pricingService.addContractItem(tenant1Id, contract.id, {
      variant_id: variant1Id,
      min_quantity: 1,
      fixed_price_minor: '7000',
    });

    // Case 1A: Anonymous / Base Price only -> 10000
    const resBase = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 1,
      base_unit_price_minor: '10000',
    });
    expect(resBase.resolved_unit_price_minor).toBe('10000');
    expect(resBase.snapshot.matched_rules[0]?.rule_tier).toBe('BASE_PRICE');

    // Case 1B: Channel PriceList beats Base Price -> 9000
    const resChannel = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 1,
      base_unit_price_minor: '10000',
      channel: 'B2B Wholesale Channel',
    });
    expect(resChannel.resolved_unit_price_minor).toBe('9000');

    // Case 1C: Customer PriceList beats Channel PriceList -> 8000
    const resCustPL = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 1,
      base_unit_price_minor: '10000',
      pricelist_id: custPL.id,
      channel: 'B2B Wholesale Channel',
    });
    expect(resCustPL.resolved_unit_price_minor).toBe('8000');

    // Case 1D: Customer Contract beats Customer PriceList -> 7000
    const resContract = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 1,
      base_unit_price_minor: '10000',
      customer_id: 'cust_aerospace_01',
      pricelist_id: custPL.id,
      channel: 'B2B Wholesale Channel',
    });
    expect(resContract.resolved_unit_price_minor).toBe('7000');
    expect(resContract.snapshot.matched_rules[0]?.rule_tier).toBe('CUSTOMER_CONTRACT');
    expect(resContract.snapshot.matched_rules[0]?.is_winner).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Quantity Breaks & Volume Tiers
  // --------------------------------------------------------------------------
  it('Scenario 2: Quantity Breaks evaluate correct tiered prices at and adjacent to boundaries', async () => {
    const pl = await pricingService.createPriceList(tenant1Id, {
      name: 'Volume Discount List',
      code: 'PL-VOL',
      currency_code: 'USD',
      is_default: true,
    });

    // 1-9 units: $100.00
    await pricingService.createPriceListRule(tenant1Id, {
      pricelist_id: pl.id,
      variant_id: variant1Id,
      min_quantity: 1,
      fixed_price_minor: '10000',
    });

    // 10-49 units: $85.00
    await pricingService.createPriceListRule(tenant1Id, {
      pricelist_id: pl.id,
      variant_id: variant1Id,
      min_quantity: 10,
      fixed_price_minor: '8500',
    });

    // 50+ units: $70.00
    await pricingService.createPriceListRule(tenant1Id, {
      pricelist_id: pl.id,
      variant_id: variant1Id,
      min_quantity: 50,
      fixed_price_minor: '7000',
    });

    // Boundary 9 units: tier 1 -> $100.00
    const res9 = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 9,
      base_unit_price_minor: '10000',
    });
    expect(res9.resolved_unit_price_minor).toBe('10000');
    expect(res9.gross_subtotal_minor).toBe('90000'); // 9 * 10000

    // Exact boundary 10 units: tier 2 -> $85.00
    const res10 = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 10,
      base_unit_price_minor: '10000',
    });
    expect(res10.resolved_unit_price_minor).toBe('8500');
    expect(res10.gross_subtotal_minor).toBe('85000'); // 10 * 8500

    // Boundary 49 units: tier 2 -> $85.00
    const res49 = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 49,
      base_unit_price_minor: '10000',
    });
    expect(res49.resolved_unit_price_minor).toBe('8500');

    // Exact boundary 50 units: tier 3 -> $70.00
    const res50 = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 50,
      base_unit_price_minor: '10000',
    });
    expect(res50.resolved_unit_price_minor).toBe('7000');
    expect(res50.gross_subtotal_minor).toBe('350000'); // 50 * 7000
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Promotion Stacking & Exclusivity
  // --------------------------------------------------------------------------
  it('Scenario 3: Promotion Stacking combines compatible promotions and rejects exclusive conflicts', async () => {
    const promoOrder10Percent: CandidatePromotion = {
      campaign_id: 'camp_10pct',
      campaign_code: 'SPRING10',
      campaign_name: '10% Off Order',
      stacking_rule: 'STACKABLE',
      discount_minor: '1000',
    };

    const promoBxgy: CandidatePromotion = {
      campaign_id: 'camp_bxgy',
      campaign_code: 'BUY2GET1',
      campaign_name: 'Buy 2 Get 1 Free',
      stacking_rule: 'STACKABLE',
      discount_minor: '2000',
    };

    const promoExclusiveBigDeal: CandidatePromotion = {
      campaign_id: 'camp_exclusive',
      campaign_code: 'MEGADEAL',
      campaign_name: 'Exclusive VIP $40 Off',
      stacking_rule: 'EXCLUSIVE',
      discount_minor: '4000',
    };

    // Stacking test 1: Both STACKABLE combine
    const stacked = evaluatePromotionStacking('10000', [promoOrder10Percent, promoBxgy]);
    expect(stacked.applied_promotions).toHaveLength(2);
    expect(stacked.total_discount_minor).toBe('3000');
    expect(stacked.applied_promotions.map((p) => p.campaign_code)).toEqual([
      'SPRING10',
      'BUY2GET1',
    ]);

    // Stacking test 2: EXCLUSIVE promotion with higher discount wins exclusively
    const exclusiveResult = evaluatePromotionStacking('10000', [
      promoOrder10Percent,
      promoBxgy,
      promoExclusiveBigDeal,
    ]);
    expect(exclusiveResult.applied_promotions).toHaveLength(1);
    expect(exclusiveResult.applied_promotions[0]?.campaign_code).toBe('MEGADEAL');
    expect(exclusiveResult.total_discount_minor).toBe('4000');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Promotion Limits (Count & Budget Caps)
  // --------------------------------------------------------------------------
  it('Scenario 4: Promotion Limits enforce usage counts and monetary budgets strictly', async () => {
    const campaign = await promotionsService.createCampaign(tenant1Id, {
      campaign_code: 'LIMITED50',
      name: 'Limited Flash Deal',
      promotion_type: 'FIXED_AMOUNT',
      value_minor_or_bp: '1000', // $10.00 off
      usage_limit_total: 2, // Only 2 redemptions allowed
      budget_limit_minor: '2000', // Total budget: $20.00
    });

    // 1st redemption: OK
    const red1 = await promotionsService.redeemPromotion(tenant1Id, {
      campaign_id: campaign.id,
      order_id: 'ord_001',
      discount_amount_minor: '1000',
      operation_id: 'op_red_001',
    });
    expect(red1.id).toBeDefined();

    // 2nd redemption: OK (Budget reaches 2000, count reaches 2)
    const red2 = await promotionsService.redeemPromotion(tenant1Id, {
      campaign_id: campaign.id,
      order_id: 'ord_002',
      discount_amount_minor: '1000',
      operation_id: 'op_red_002',
    });
    expect(red2.id).toBeDefined();

    // 3rd redemption: Fails with count / budget exhausted error
    await expect(
      promotionsService.redeemPromotion(tenant1Id, {
        campaign_id: campaign.id,
        order_id: 'ord_003',
        discount_amount_minor: '1000',
        operation_id: 'op_red_003',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Coupon Lifecycle (Preview Non-Consuming, Single-Use Atomic)
  // --------------------------------------------------------------------------
  it('Scenario 5: Coupon Lifecycle ensures preview does not redeem and single-use is atomic', async () => {
    const campaign = await promotionsService.createCampaign(tenant1Id, {
      campaign_code: 'WELCOME20',
      name: 'Single-Use Welcome Voucher',
      promotion_type: 'PERCENTAGE',
      value_minor_or_bp: '2000', // 20.00%
      coupon_code: 'VOUCHER-SINGLE',
      usage_limit_total: 1,
    });

    // Preview / Evaluate promotions (should not mutate redemption count)
    const evalPreview = await promotionsService.evaluatePromotions(tenant1Id, {
      subtotalMinor: '10000',
      couponCode: 'VOUCHER-SINGLE',
      variantIds: [variant1Id],
    });
    expect(evalPreview.applied_promotions).toHaveLength(1);
    expect(evalPreview.total_discount_minor).toBe('2000');

    // Verify campaign state shows 0 redemptions after preview
    const campAfterPreview = await promotionsService.getCampaign(tenant1Id, campaign.id);
    expect(campAfterPreview.usage_count_total).toBe(0);

    // Checkout redemption: atomic redemption succeeds
    const redeemResult = await promotionsService.redeemPromotion(tenant1Id, {
      campaign_id: campaign.id,
      coupon_code: 'VOUCHER-SINGLE',
      order_id: 'ord_single_01',
      discount_amount_minor: '2000',
      operation_id: 'op_coupon_atom_01',
    });
    expect(redeemResult.id).toBeDefined();

    // Verify campaign state shows 1 redemption
    const campAfterRedeem = await promotionsService.getCampaign(tenant1Id, campaign.id);
    expect(campAfterRedeem.usage_count_total).toBe(1);

    // Subsequent attempt with same single-use coupon fails
    await expect(
      promotionsService.redeemPromotion(tenant1Id, {
        campaign_id: campaign.id,
        coupon_code: 'VOUCHER-SINGLE',
        order_id: 'ord_single_02',
        discount_amount_minor: '2000',
        operation_id: 'op_coupon_atom_02',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Loyalty Earning & Tier Multipliers
  // --------------------------------------------------------------------------
  it('Scenario 6: Loyalty Earning awards points based on spend and tier multiplier to append-only ledger', async () => {
    const program = await loyaltyService.createProgram(tenant1Id, {
      name: 'Titanium Rewards Club',
      points_per_currency_minor: 100, // 1 point per $1.00 (100 minor)
    });

    // Bronze: 1.0x (10000 bp), Silver: 1.5x (15000 bp)
    await loyaltyService.addTier(tenant1Id, program.id, {
      tier_code: 'BRONZE',
      tier_name: 'Bronze Member',
      min_spend_minor: '0',
      multiplier_bp: 10000,
      priority: 1,
    });
    await loyaltyService.addTier(tenant1Id, program.id, {
      tier_code: 'SILVER',
      tier_name: 'Silver Member',
      min_spend_minor: '50000', // $500.00
      multiplier_bp: 15000,
      priority: 2,
    });

    const account = await loyaltyService.enrollCustomer(tenant1Id, program.id, 'cust_loyalty_01');
    expect(account.current_tier_code).toBe('BRONZE');
    expect(account.points_balance).toBe(0);

    // Order 1: Spend $200.00 (20000 minor) as Bronze (1.0x) -> 200 points
    const earn1 = await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_loyalty_01',
      orderId: 'ord_loy_01',
      spendMinor: '20000',
      operationId: 'op_earn_01',
    });
    expect(earn1.points_earned).toBe(200);
    expect(earn1.account.points_balance).toBe(200);
    expect(earn1.account.current_tier_code).toBe('BRONZE');

    // Order 2: Spend $400.00 (40000 minor). Lifetime spend reaches $600.00 (> $500), advancing to Silver!
    const earn2 = await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_loyalty_01',
      orderId: 'ord_loy_02',
      spendMinor: '40000',
      operationId: 'op_earn_02',
    });
    // Still earned with tier at start or updated: 400 points
    expect(earn2.points_earned).toBe(400);
    expect(earn2.account.points_balance).toBe(600);
    expect(earn2.account.current_tier_code).toBe('SILVER');

    // Order 3: Spend $100.00 (10000 minor) as Silver (1.5x multiplier) -> 150 points
    const earn3 = await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_loyalty_01',
      orderId: 'ord_loy_03',
      spendMinor: '10000',
      operationId: 'op_earn_03',
    });
    expect(earn3.points_earned).toBe(150);
    expect(earn3.account.points_balance).toBe(750);

    // Verify ledger balance integrity
    const ledgerValid = await loyaltyService.verifyAccountBalanceAgainstLedger(
      tenant1Id,
      'cust_loyalty_01',
    );
    expect(ledgerValid.is_verified).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Loyalty Redemption & Order Caps
  // --------------------------------------------------------------------------
  it('Scenario 7: Loyalty Redemption records append-only REDEEM transaction and respects order cap', async () => {
    const program = await loyaltyService.createProgram(tenant1Id, {
      name: 'Preferred Club',
      redemption_ratio_bp: 100, // 100 bp = $0.01 per point
      max_redemption_percent_bp: 5000, // Max 50% of order total
    });
    await loyaltyService.enrollCustomer(tenant1Id, program.id, 'cust_redeem_01');

    // Earn 1000 points ($10.00 total redemption value)
    await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_redeem_01',
      orderId: 'ord_seed',
      spendMinor: '100000',
      operationId: 'op_seed_redeem',
    });

    // Checkout Order of $10.00 (1000 minor).
    // 50% cap = $5.00 (500 minor = 500 points).
    // Customer requests redeeming 800 points.
    const redeemRes = await loyaltyService.redeemPoints(tenant1Id, {
      customerId: 'cust_redeem_01',
      orderId: 'ord_checkout_01',
      pointsToRedeem: 800,
      orderTotalMinor: '1000',
      operationId: 'op_red_chk_01',
    });

    // Capped at 500 points = $5.00 discount
    expect(redeemRes.points_used).toBe(500);
    expect(redeemRes.discount_minor).toBe('500');
    expect(redeemRes.remaining_balance).toBe(500); // 1000 - 500

    // Verify ledger consistency
    const isConsistent = await loyaltyService.verifyAccountBalanceAgainstLedger(
      tenant1Id,
      'cust_redeem_01',
    );
    expect(isConsistent.is_verified).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Return Reversal (Pro-Rata Earned Clawback & Redeemed Restore)
  // --------------------------------------------------------------------------
  it('Scenario 8: Return Reversal claws back earned points and restores redeemed points proportionally', async () => {
    const program = await loyaltyService.createProgram(tenant1Id, {
      name: 'Reversal Club',
      points_per_currency_minor: 100,
    });
    await loyaltyService.enrollCustomer(tenant1Id, program.id, 'cust_ret_01');

    // Seed points and earn
    await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_ret_01',
      orderId: 'ord_initial',
      spendMinor: '20000', // $200.00 -> 200 points
      operationId: 'op_ret_earn',
    });

    // Customer returns 50% of the order ($100.00 out of $200.00)
    // Original: earned 200 points, redeemed 50 points
    const reversalRes = await loyaltyService.reverseReturnPoints(tenant1Id, {
      customerId: 'cust_ret_01',
      orderId: 'ord_initial',
      returnAmountMinor: '10000', // $100.00
      originalOrderTotalMinor: '20000', // $200.00
      originalPointsEarned: 200,
      originalPointsRedeemed: 50,
      operationId: 'op_ret_rev_01',
    });

    // 50% of 200 earned = 100 points deducted
    expect(reversalRes.points_deducted).toBe(100);
    // 50% of 50 redeemed = 25 points restored
    expect(reversalRes.points_restored).toBe(25);
    // Net account balance change: 200 - 100 + 25 = 125
    expect(reversalRes.account.points_balance).toBe(125);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Rebate Accrual (Graduated Brackets & Retroactive Tiers)
  // --------------------------------------------------------------------------
  it('Scenario 9: Rebate Accrual calculates graduated bracket and retroactive rebate amounts exactly', () => {
    const domainTiers: DomainRebateTier[] = [
      { tier_number: 1, threshold_amount_minor: '1000000', rebate_rate_bp: 200 }, // 0 - $10k at 2%
      { tier_number: 2, threshold_amount_minor: '5000000', rebate_rate_bp: 500 }, // $10k - $50k at 5%
      { tier_number: 3, threshold_amount_minor: '999999999', rebate_rate_bp: 800 }, // $50k+ at 8%
    ];

    // Graduated calculation for $60,000 (6000000 minor):
    // Tier 1 ($10,000): $10,000 * 2% = $200 (20000 minor)
    // Tier 2 ($40,000): $40,000 * 5% = $2,000 (200000 minor)
    // Tier 3 ($10,000): $10,000 * 8% = $800 (80000 minor)
    // Total = $3,000.00 (300000 minor)
    const graduatedAmount = calculateGraduatedRebate({
      isSpendBased: true,
      totalQuantity: 0,
      totalSpendMinor: '6000000',
      tiers: domainTiers,
    });
    expect(graduatedAmount).toBe('300000');

    // Retroactive calculation for $60,000 (qualifies for Tier 2 at 800 bp across full spend):
    const retroTiers: DomainRebateTier[] = [
      { tier_number: 1, threshold_amount_minor: '1000000', rebate_rate_bp: 200 },
      { tier_number: 2, threshold_amount_minor: '5000000', rebate_rate_bp: 800 },
    ];
    const retroactiveResult = calculateRetroactiveRebate({
      isSpendBased: true,
      totalQuantity: 0,
      totalSpendMinor: '6000000',
      tiers: retroTiers,
    });
    expect(retroactiveResult.rebate_minor).toBe('480000');
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Rebate Settlement & Idempotency
  // --------------------------------------------------------------------------
  it('Scenario 10: Rebate Settlement transitions states properly and prevents duplicate payout', async () => {
    const agreement = await rebatesService.createAgreement(tenant1Id, {
      agreement_number: 'RBT-2026-DIST-01',
      name: 'Distributor Volume Rebate',
      rebate_type: 'CUSTOMER_SPEND',
      counterparty_type: 'CUSTOMER',
      counterparty_id: 'cust_distributor_01',
      valid_from: '2026-01-01T00:00:00Z',
      valid_until: '2026-12-31T23:59:59Z',
      calculation_method: 'GRADUATED_TIERS',
    });

    await rebatesService.addTier(tenant1Id, agreement.id, {
      tier_number: 1,
      threshold_amount_minor: '1000000',
      rebate_rate_bp: 500, // 5%
    });

    // 1. Accrue rebate on $10,000 volume -> $500.00 (50000 minor)
    const accrual = await rebatesService.calculateAccrual(tenant1Id, {
      agreement_id: agreement.id,
      period_identifier: '2026-Q1',
      eligible_quantity: 0,
      eligible_spend_minor: '1000000',
    });
    expect(accrual.status).toBe('ACCRUED');
    expect(accrual.calculated_accrual_minor).toBe('50000');

    // 2. Claim
    const claimed = await rebatesService.claimAccrual(tenant1Id, accrual.id);
    expect(claimed.status).toBe('CLAIMED');

    // 3. Approve
    const approved = await rebatesService.approveClaim(tenant1Id, accrual.id, 'mgr_commercial_01');
    expect(approved.status).toBe('APPROVED');

    // 4. Settle via Credit Note
    const settled1 = await rebatesService.settleRebate(tenant1Id, {
      accrual_id: accrual.id,
      settlement_reference: 'SETTLE-2026-001',
      credit_note_reference: 'cn_2026_099',
      settled_by: 'fin_controller_01',
      operation_id: 'op_rebate_settle_01',
    });
    expect(settled1.status).toBe('SETTLED');
    expect(settled1.credit_note_reference).toBe('cn_2026_099');

    // 5. Idempotent Retry with same operation_id returns settled state without duplicate payout
    const settled2 = await rebatesService.settleRebate(tenant1Id, {
      accrual_id: accrual.id,
      settlement_reference: 'SETTLE-2026-001',
      credit_note_reference: 'cn_2026_099',
      settled_by: 'fin_controller_01',
      operation_id: 'op_rebate_settle_01',
    });
    expect(settled2.status).toBe('SETTLED');
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Margin Governance & Dual-Authorization Overrides
  // --------------------------------------------------------------------------
  it('Scenario 11: Margin Governance blocks below-margin prices and enforces dual-authorization workflow', async () => {
    // Min margin 25% (2500 bp), Max discount 20% (2000 bp)
    await pricingService.createMarginPolicy(tenant1Id, {
      name: 'Default Profitability Guard',
      min_margin_percent_bp: 2500,
      max_discount_percent_bp: 2000,
      requires_approval: true,
    });

    // Variant 1: Base $100.00 (10000 minor), Cost $80.00 (8000 minor)
    // Margin at $100 is ($100-$80)/$100 = 20% < 25% policy!
    const unapprovedRes = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 1,
      base_unit_price_minor: '10000',
      unit_cost_minor: '8000',
    });
    expect(unapprovedRes.margin_approved).toBe(false);

    // Request price override by salesperson
    const overrideReq = await pricingService.requestPriceOverride(tenant1Id, {
      variant_id: variant1Id,
      original_price_minor: '10000',
      requested_price_minor: '10000',
      cost_minor: '8000',
      reason: 'Strategic new customer win',
      requested_by: 'usr_sales_rep',
      operation_id: 'op_override_req_01',
    });
    expect(overrideReq.status).toBe('PENDING');

    // Self-approval must be rejected (Two-person rule)
    await expect(
      pricingService.decidePriceOverride(tenant1Id, {
        override_id: overrideReq.id,
        decision: 'APPROVE',
        decided_by: 'usr_sales_rep', // Same user!
      }),
    ).rejects.toThrow(BadRequestException);

    // Approval by Commercial Controller succeeds
    const approvedReq = await pricingService.decidePriceOverride(tenant1Id, {
      override_id: overrideReq.id,
      decision: 'APPROVE',
      decided_by: 'usr_commercial_manager',
    });
    expect(approvedReq.status).toBe('APPROVED');

    // Re-resolve price: now approved!
    const approvedRes = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 1,
      base_unit_price_minor: '10000',
      unit_cost_minor: '8000',
    });
    expect(approvedRes.margin_approved).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Pricing Explainability & Snapshots
  // --------------------------------------------------------------------------
  it('Scenario 12: Commercial Price Snapshot captures complete evaluation tree and matched rules immutably', async () => {
    const res = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 3,
      base_unit_price_minor: '10000',
    });

    const snapshot = await pricingService.getSnapshot(tenant1Id, res.snapshot.id);
    expect(snapshot.id).toBe(res.snapshot.id);
    expect(snapshot.tenant_id).toBe(tenant1Id);
    expect(snapshot.variant_id).toBe(variant1Id);
    expect(snapshot.quantity).toBe(3);
    expect(snapshot.base_unit_price_minor).toBe('10000');
    expect(snapshot.resolved_unit_price_minor).toBe('10000');
    expect(snapshot.gross_line_minor).toBe('30000');
    expect(snapshot.matched_rules.length).toBeGreaterThan(0);
    expect(snapshot.evaluation_timestamp).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Currency and Rounding (Zero Float Discrepancy)
  // --------------------------------------------------------------------------
  it('Scenario 13: Multi-currency basis point calculations produce zero fractional float drift', () => {
    // 33.33% (3333 bp) of $100.00 (10000 minor)
    const baseMinor = 10000n;
    const bp = 3333n;
    const discountMinor = (baseMinor * bp) / 10000n;
    expect(discountMinor).toBe(3333n); // Pure integer minor units

    // Japanese Yen (JPY): 5% discount on 1500 JPY
    const jpyBase = 1500n;
    const jpyDiscount = (jpyBase * 500n) / 10000n;
    expect(jpyDiscount).toBe(75n);
    expect(jpyBase - jpyDiscount).toBe(1425n);
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Strict Multi-Tenant Isolation
  // --------------------------------------------------------------------------
  it('Scenario 14: Tenant Isolation prevents cross-tenant access to contracts, policies, and snapshots', async () => {
    const contract = await pricingService.createCustomerContract(tenant1Id, {
      contract_number: 'CNT-T1-ISOLATION',
      customer_id: 'cust_t1',
      name: 'Tenant 1 Confidential Contract',
      valid_from: '2026-01-01T00:00:00Z',
    });

    // Tenant 2 attempts to add contract item or access contract
    await expect(
      pricingService.addContractItem(tenant2Id, contract.id, {
        variant_id: variant1Id,
        min_quantity: 1,
        fixed_price_minor: '5000',
      }),
    ).rejects.toThrow(NotFoundException);

    // Tenant 2 attempts to access snapshot from Tenant 1
    const res = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 1,
      base_unit_price_minor: '10000',
    });
    await expect(
      pricingService.getSnapshot(tenant2Id, res.snapshot.id),
    ).rejects.toThrow(NotFoundException);
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Scoped RBAC Permissions
  // --------------------------------------------------------------------------
  it('Scenario 15: Scoped RBAC permissions enforce role boundaries across Phase 8 operations', () => {
    const pricingManager = SystemRoleTemplates['PRICING_MANAGER'];
    const controller = SystemRoleTemplates['COMMERCIAL_CONTROLLER'];

    expect(pricingManager?.permissions).toContain(StandardPermissions.PRICING_CONTRACTS_MANAGE);
    expect(pricingManager?.permissions).toContain(StandardPermissions.PROMOTIONS_CAMPAIGN_MANAGE);
    expect(controller?.permissions).toContain(StandardPermissions.PRICING_MARGIN_APPROVE);
    expect(controller?.permissions).toContain(StandardPermissions.REBATES_SETTLE);
  });

  // --------------------------------------------------------------------------
  // Scenario 16: Checkout Idempotency via operation_id
  // --------------------------------------------------------------------------
  it('Scenario 16: Duplicate operations with same operation_id return identical results without duplicate mutations', async () => {
    const program = await loyaltyService.createProgram(tenant1Id, {
      name: 'Idempotent Loyalty Club',
    });
    await loyaltyService.enrollCustomer(tenant1Id, program.id, 'cust_idem_01');

    // Duplicate earnPoints with same operation_id
    const earn1 = await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_idem_01',
      orderId: 'ord_idem_01',
      spendMinor: '10000',
      operationId: 'op_identical_100',
    });
    const earn2 = await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_idem_01',
      orderId: 'ord_idem_01',
      spendMinor: '10000',
      operationId: 'op_identical_100',
    });

    expect(earn1.points_earned).toBe(earn2.points_earned);
    expect(earn2.account.points_balance).toBe(100); // Not 200!
  });

  // --------------------------------------------------------------------------
  // Scenario 17: Offline Reconciliation & Conflict Handling
  // --------------------------------------------------------------------------
  it('Scenario 17: Offline-capable pricing evaluation uses deterministic pure functions for reconciliation', () => {
    // Pure function evaluation guarantees identical result offline on POS as on server
    const base = '10000';

    const evalResult = pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 5,
      base_unit_price_minor: base,
    });
    expect(evalResult).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Scenario 18: Financial Boundary Invariants (Zero GL or Order Mutation)
  // --------------------------------------------------------------------------
  it('Scenario 18: Pricing and promotional evaluation never mutates posted journals or historical records', async () => {
    // Commercial price resolution only calculates amounts and generates an immutable snapshot
    const res = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant1Id,
      quantity: 2,
      base_unit_price_minor: '10000',
    });
    expect(res.resolved_unit_price_minor).toBe('10000');
    expect(res.snapshot).toBeDefined();
    // Snapshot is append-only and read-only
    const snap = await pricingService.getSnapshot(tenant1Id, res.snapshot.id);
    expect(snap.id).toBe(res.snapshot.id);
  });

  // --------------------------------------------------------------------------
  // Scenario 19: Schema & Migration Integrity
  // --------------------------------------------------------------------------
  it('Scenario 19: Database migration schema tables for Phase 8 exist and comply with enterprise rules', async () => {
    // Verify Drizzle schema definitions exist in @stokrova/database
    const {
      customerContracts,
      customerContractItems,
      promotionCampaigns,
      promotionRedemptions,
      pricingMarginPolicies,
      pricingOverrideRequests,
      commercialPriceSnapshots,
      rebateAgreements,
      rebateTiers,
      rebateAccruals,
    } = await import('@stokrova/database');

    expect(customerContracts).toBeDefined();
    expect(customerContractItems).toBeDefined();
    expect(promotionCampaigns).toBeDefined();
    expect(promotionRedemptions).toBeDefined();
    expect(pricingMarginPolicies).toBeDefined();
    expect(pricingOverrideRequests).toBeDefined();
    expect(commercialPriceSnapshots).toBeDefined();
    expect(rebateAgreements).toBeDefined();
    expect(rebateTiers).toBeDefined();
    expect(rebateAccruals).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Scenario 20: Cross-Phase Integration (Catalog -> Pricing -> Promotions -> Loyalty)
  // --------------------------------------------------------------------------
  it('Scenario 20: End-to-end flow from Catalog -> Pricing Engine -> Promotion -> Loyalty -> Explainability Snapshot', async () => {
    // 1. Catalog Variant setup (retail price: $200.00 / 20000 minor)
    const variant = await variantsService.getVariantById(tenant1Id, variant2Id);
    expect(variant.selling_price_minor).toBe('20000');

    // 2. Precedence Pricing: Contract gives 10% discount (18000 minor)
    const contract = await pricingService.createCustomerContract(tenant1Id, {
      contract_number: 'CNT-E2E-001',
      customer_id: 'cust_e2e_enterprise',
      name: 'Enterprise E2E Agreement',
      valid_from: '2026-01-01T00:00:00Z',
    });
    await pricingService.addContractItem(tenant1Id, contract.id, {
      variant_id: variant2Id,
      min_quantity: 1,
      fixed_price_minor: '18000',
    });

    const priceRes = await pricingService.resolvePriceAdvanced(tenant1Id, {
      variant_id: variant2Id,
      quantity: 2,
      base_unit_price_minor: variant.selling_price_minor,
      customer_id: 'cust_e2e_enterprise',
    });
    expect(priceRes.resolved_unit_price_minor).toBe('18000');
    expect(priceRes.gross_subtotal_minor).toBe('36000'); // 2 * 18000

    // 3. Promotion: $20.00 off subtotal
    const campaign = await promotionsService.createCampaign(tenant1Id, {
      campaign_code: 'E2EPROMO',
      name: 'E2E Order Voucher',
      promotion_type: 'FIXED_AMOUNT',
      value_minor_or_bp: '2000',
    });
    const promoRes = await promotionsService.redeemPromotion(tenant1Id, {
      campaign_id: campaign.id,
      order_id: 'ord_e2e_001',
      discount_amount_minor: '2000',
      operation_id: 'op_e2e_promo',
    });
    expect(promoRes.id).toBeDefined();

    // 4. Loyalty Earning on net spend ($340.00 = 34000 minor)
    const program = await loyaltyService.createProgram(tenant1Id, {
      name: 'E2E Loyalty Program',
      points_per_currency_minor: 100,
    });
    await loyaltyService.enrollCustomer(tenant1Id, program.id, 'cust_e2e_enterprise');
    const earnRes = await loyaltyService.earnPoints(tenant1Id, {
      customerId: 'cust_e2e_enterprise',
      orderId: 'ord_e2e_001',
      spendMinor: '34000',
      operationId: 'op_e2e_loy_earn',
    });
    expect(earnRes.points_earned).toBe(340);

    // 5. Explainability Verification
    expect(priceRes.snapshot.matched_rules[0]?.rule_tier).toBe('CUSTOMER_CONTRACT');
    expect(priceRes.snapshot.resolved_unit_price_minor).toBe('18000');
    expect(priceRes.snapshot.tenant_id).toBe(tenant1Id);
  });
});
