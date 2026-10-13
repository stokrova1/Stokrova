/**
 * ============================================================================
 * STOKROVA — Advanced Pricing, Promotions, Margin Governance & Explainability
 * Phase 8 Pure Domain Engine
 *
 * Golden Rules:
 * - Rule 22: Decoupled pure domain logic (Zero external runtime imports)
 * - Rule 26: Pure integer arithmetic (minor units, basis points)
 * ============================================================================
 */

import { calculateBasisPointsAmount } from './pricing.js';

export type PriceRuleMatchTier =
  | 'CUSTOMER_CONTRACT'
  | 'CUSTOMER_PRICELIST'
  | 'CUSTOMER_GROUP_PRICELIST'
  | 'CHANNEL_PRICELIST'
  | 'DEFAULT_PRICELIST'
  | 'BASE_PRICE';

export interface DomainPriceRuleMatch {
  rule_tier: PriceRuleMatchTier;
  rule_id?: string | null;
  rule_name: string;
  resolved_unit_price_minor: string;
  is_winner: boolean;
  elimination_reason?: string | null;
}

export interface DomainContractRule {
  id: string;
  contract_number: string;
  variant_id: string;
  min_quantity: number;
  fixed_price_minor: string | null;
  discount_percent_bp: number | null;
}

export interface DomainPriceTierRule {
  id: string;
  pricelist_name: string;
  variant_id: string;
  min_quantity: number;
  fixed_price_minor: string | null;
  discount_percent_bp: number | null;
}

export interface PrecedenceResolutionResult {
  resolved_unit_price_minor: string;
  winner_rule_tier: PriceRuleMatchTier;
  winner_rule_id?: string | null;
  matched_rules: DomainPriceRuleMatch[];
}

/**
 * 1. Resolves effective unit price according to strict documented precedence:
 *    Customer Contract > Customer PriceList > Customer Group PriceList >
 *    Channel PriceList > Default Retail PriceList > Base Variant Price.
 */
export function resolvePriceWithPrecedence(params: {
  variant_id: string;
  quantity: number;
  base_price_minor: string;
  contractRules?: DomainContractRule[];
  customerRules?: DomainPriceTierRule[];
  customerGroupRules?: DomainPriceTierRule[];
  channelRules?: DomainPriceTierRule[];
  defaultRules?: DomainPriceTierRule[];
}): PrecedenceResolutionResult {
  const {
    variant_id,
    quantity,
    base_price_minor,
    contractRules = [],
    customerRules = [],
    customerGroupRules = [],
    channelRules = [],
    defaultRules = [],
  } = params;

  if (quantity <= 0) {
    throw new Error(`Quantity must be strictly positive. Received: ${quantity}`);
  }

  const basePrice = BigInt(base_price_minor || '0');
  const matchedRules: DomainPriceRuleMatch[] = [];

  const evaluateTierRules = (
    rules: { min_quantity: number; fixed_price_minor: string | null; discount_percent_bp: number | null; id?: string; name: string }[],
    _tier?: PriceRuleMatchTier,
  ): { price: bigint; ruleId?: string; ruleName: string } | null => {
    const applicable = rules
      .filter((r) => r.min_quantity <= quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity);

    if (applicable.length === 0 || !applicable[0]) return null;

    const winner = applicable[0];
    let calculated = basePrice;
    if (winner.fixed_price_minor !== null) {
      calculated = BigInt(winner.fixed_price_minor);
    } else if (winner.discount_percent_bp !== null) {
      const discount = calculateBasisPointsAmount(basePrice, winner.discount_percent_bp);
      calculated = basePrice > discount ? basePrice - discount : 0n;
    }

    return {
      price: calculated,
      ruleId: winner.id,
      ruleName: winner.name,
    };
  };

  // Precedence Step 1: Customer Contract
  const contractCandidate = evaluateTierRules(
    contractRules.filter((r) => r.variant_id === variant_id).map((r) => ({ ...r, name: `Contract ${r.contract_number}` })),
    'CUSTOMER_CONTRACT',
  );
  if (contractCandidate) {
    matchedRules.push({
      rule_tier: 'CUSTOMER_CONTRACT',
      rule_id: contractCandidate.ruleId,
      rule_name: contractCandidate.ruleName,
      resolved_unit_price_minor: contractCandidate.price.toString(),
      is_winner: true,
    });
    return {
      resolved_unit_price_minor: contractCandidate.price.toString(),
      winner_rule_tier: 'CUSTOMER_CONTRACT',
      winner_rule_id: contractCandidate.ruleId,
      matched_rules: matchedRules,
    };
  }

  // Precedence Step 2: Customer-Specific PriceList
  const customerCandidate = evaluateTierRules(
    customerRules.filter((r) => r.variant_id === variant_id).map((r) => ({ ...r, name: r.pricelist_name })),
    'CUSTOMER_PRICELIST',
  );
  if (customerCandidate) {
    matchedRules.push({
      rule_tier: 'CUSTOMER_PRICELIST',
      rule_id: customerCandidate.ruleId,
      rule_name: customerCandidate.ruleName,
      resolved_unit_price_minor: customerCandidate.price.toString(),
      is_winner: true,
    });
    return {
      resolved_unit_price_minor: customerCandidate.price.toString(),
      winner_rule_tier: 'CUSTOMER_PRICELIST',
      winner_rule_id: customerCandidate.ruleId,
      matched_rules: matchedRules,
    };
  }

  // Precedence Step 3: Customer Group PriceList
  const groupCandidate = evaluateTierRules(
    customerGroupRules.filter((r) => r.variant_id === variant_id).map((r) => ({ ...r, name: r.pricelist_name })),
    'CUSTOMER_GROUP_PRICELIST',
  );
  if (groupCandidate) {
    matchedRules.push({
      rule_tier: 'CUSTOMER_GROUP_PRICELIST',
      rule_id: groupCandidate.ruleId,
      rule_name: groupCandidate.ruleName,
      resolved_unit_price_minor: groupCandidate.price.toString(),
      is_winner: true,
    });
    return {
      resolved_unit_price_minor: groupCandidate.price.toString(),
      winner_rule_tier: 'CUSTOMER_GROUP_PRICELIST',
      winner_rule_id: groupCandidate.ruleId,
      matched_rules: matchedRules,
    };
  }

  // Precedence Step 4: Channel-Specific PriceList
  const channelCandidate = evaluateTierRules(
    channelRules.filter((r) => r.variant_id === variant_id).map((r) => ({ ...r, name: r.pricelist_name })),
    'CHANNEL_PRICELIST',
  );
  if (channelCandidate) {
    matchedRules.push({
      rule_tier: 'CHANNEL_PRICELIST',
      rule_id: channelCandidate.ruleId,
      rule_name: channelCandidate.ruleName,
      resolved_unit_price_minor: channelCandidate.price.toString(),
      is_winner: true,
    });
    return {
      resolved_unit_price_minor: channelCandidate.price.toString(),
      winner_rule_tier: 'CHANNEL_PRICELIST',
      winner_rule_id: channelCandidate.ruleId,
      matched_rules: matchedRules,
    };
  }

  // Precedence Step 5: Default Active Retail PriceList
  const defaultCandidate = evaluateTierRules(
    defaultRules.filter((r) => r.variant_id === variant_id).map((r) => ({ ...r, name: r.pricelist_name })),
    'DEFAULT_PRICELIST',
  );
  if (defaultCandidate) {
    matchedRules.push({
      rule_tier: 'DEFAULT_PRICELIST',
      rule_id: defaultCandidate.ruleId,
      rule_name: defaultCandidate.ruleName,
      resolved_unit_price_minor: defaultCandidate.price.toString(),
      is_winner: true,
    });
    return {
      resolved_unit_price_minor: defaultCandidate.price.toString(),
      winner_rule_tier: 'DEFAULT_PRICELIST',
      winner_rule_id: defaultCandidate.ruleId,
      matched_rules: matchedRules,
    };
  }

  // Precedence Step 6: Fallback Base Variant Price
  matchedRules.push({
    rule_tier: 'BASE_PRICE',
    rule_id: null,
    rule_name: 'Base Catalog Price',
    resolved_unit_price_minor: basePrice.toString(),
    is_winner: true,
  });

  return {
    resolved_unit_price_minor: basePrice.toString(),
    winner_rule_tier: 'BASE_PRICE',
    winner_rule_id: null,
    matched_rules: matchedRules,
  };
}

/**
 * 2. Evaluates Buy-X-Get-Y (BXGY) promotion discount.
 * e.g., Buy 2 Get 1 Free (100% off = 10000 bp) with qty 3 => 1 unit discounted.
 */
export function evaluateBuyXGetYDiscount(params: {
  quantity: number;
  unitPriceMinor: string;
  buyQuantity: number;
  getQuantity: number;
  getDiscountPercentBp?: number;
}): { discount_minor: string; discounted_units: number } {
  const {
    quantity,
    unitPriceMinor,
    buyQuantity,
    getQuantity,
    getDiscountPercentBp = 10000, // Default 100% free
  } = params;

  if (quantity <= 0 || buyQuantity <= 0 || getQuantity <= 0) {
    return { discount_minor: '0', discounted_units: 0 };
  }

  const bundleSize = buyQuantity + getQuantity;
  const completeBundles = Math.floor(quantity / bundleSize);
  const discountedUnits = completeBundles * getQuantity;

  if (discountedUnits <= 0) {
    return { discount_minor: '0', discounted_units: 0 };
  }

  const unitPrice = BigInt(unitPriceMinor || '0');
  const fullValue = BigInt(discountedUnits) * unitPrice;
  const discountAmount = calculateBasisPointsAmount(fullValue, getDiscountPercentBp);

  return {
    discount_minor: discountAmount.toString(),
    discounted_units: discountedUnits,
  };
}

/**
 * 3. Evaluates promotion stacking & conflict policies (EXCLUSIVE, STACKABLE, BEST_DEAL).
 */
export interface CandidatePromotion {
  campaign_id: string;
  campaign_code: string;
  campaign_name: string;
  stacking_rule: 'EXCLUSIVE' | 'STACKABLE' | 'BEST_DEAL';
  discount_minor: string;
}

export function evaluatePromotionStacking(
  subtotalMinor: string,
  candidates: CandidatePromotion[],
): {
  applied_promotions: {
    campaign_id: string;
    campaign_code: string;
    campaign_name: string;
    discount_minor: string;
  }[];
  total_discount_minor: string;
} {
  const subtotal = BigInt(subtotalMinor || '0');
  if (candidates.length === 0 || subtotal <= 0n) {
    return { applied_promotions: [], total_discount_minor: '0' };
  }

  // 1. Separate exclusive vs stackable
  const exclusiveOffers = candidates.filter((c) => c.stacking_rule === 'EXCLUSIVE');
  const stackableOffers = candidates.filter((c) => c.stacking_rule === 'STACKABLE');
  const bestDealOffers = candidates.filter((c) => c.stacking_rule === 'BEST_DEAL');

  // Calculate sum of stackable + best deal offers
  const combinedNonExclusive = [...stackableOffers, ...bestDealOffers];
  let combinedSum = 0n;
  for (const c of combinedNonExclusive) {
    combinedSum += BigInt(c.discount_minor);
  }

  // Find best single exclusive offer
  let bestExclusive: CandidatePromotion | null = null;
  let maxExclusiveDiscount = 0n;
  for (const exc of exclusiveOffers) {
    const val = BigInt(exc.discount_minor);
    if (val > maxExclusiveDiscount) {
      maxExclusiveDiscount = val;
      bestExclusive = exc;
    }
  }

  // Best deal decision: if an exclusive offer beats the combined stackable offers, it wins alone
  if (bestExclusive && maxExclusiveDiscount > combinedSum) {
    const capped = maxExclusiveDiscount > subtotal ? subtotal : maxExclusiveDiscount;
    return {
      applied_promotions: [
        {
          campaign_id: bestExclusive.campaign_id,
          campaign_code: bestExclusive.campaign_code,
          campaign_name: bestExclusive.campaign_name,
          discount_minor: capped.toString(),
        },
      ],
      total_discount_minor: capped.toString(),
    };
  }

  // Otherwise, apply combined non-exclusive offers (capped at subtotal)
  let runningDiscount = 0n;
  const applied: {
    campaign_id: string;
    campaign_code: string;
    campaign_name: string;
    discount_minor: string;
  }[] = [];

  for (const offer of combinedNonExclusive) {
    const offerDisc = BigInt(offer.discount_minor);
    if (offerDisc <= 0n) continue;

    if (runningDiscount + offerDisc <= subtotal) {
      runningDiscount += offerDisc;
      applied.push({
        campaign_id: offer.campaign_id,
        campaign_code: offer.campaign_code,
        campaign_name: offer.campaign_name,
        discount_minor: offerDisc.toString(),
      });
    } else {
      const remainingAllowed = subtotal - runningDiscount;
      if (remainingAllowed > 0n) {
        runningDiscount += remainingAllowed;
        applied.push({
          campaign_id: offer.campaign_id,
          campaign_code: offer.campaign_code,
          campaign_name: offer.campaign_name,
          discount_minor: remainingAllowed.toString(),
        });
      }
      break;
    }
  }

  return {
    applied_promotions: applied,
    total_discount_minor: runningDiscount.toString(),
  };
}

/**
 * 4. Margin protection and discount governance check.
 */
export function assertPriceMeetsMarginPolicy(params: {
  unitPriceMinor: string;
  costMinor: string;
  basePriceMinor: string;
  minMarginPercentBp: number; // e.g. 1500 = 15.0%
  maxDiscountPercentBp: number; // e.g. 3000 = 30.0%
}): {
  meets_policy: boolean;
  margin_percent_bp: number;
  discount_percent_bp: number;
  violations: string[];
} {
  const price = BigInt(params.unitPriceMinor || '0');
  const cost = BigInt(params.costMinor || '0');
  const basePrice = BigInt(params.basePriceMinor || '0');

  const violations: string[] = [];

  // Calculate actual margin: (Price - Cost) * 10000 / Price
  let marginBp = 0;
  if (price > cost && price > 0n) {
    const profit = price - cost;
    marginBp = Number((profit * 10000n) / price);
  } else if (price <= cost) {
    marginBp = 0;
  }

  // Calculate discount from base price: (Base - Price) * 10000 / Base
  let discountBp = 0;
  if (basePrice > price && basePrice > 0n) {
    const disc = basePrice - price;
    discountBp = Number((disc * 10000n) / basePrice);
  }

  if (marginBp < params.minMarginPercentBp) {
    violations.push(
      `Margin ${marginBp} bp is below the required minimum of ${params.minMarginPercentBp} bp`,
    );
  }

  if (discountBp > params.maxDiscountPercentBp) {
    violations.push(
      `Discount ${discountBp} bp exceeds the maximum permitted discount of ${params.maxDiscountPercentBp} bp`,
    );
  }

  return {
    meets_policy: violations.length === 0,
    margin_percent_bp: marginBp,
    discount_percent_bp: discountBp,
    violations,
  };
}

/**
 * 5. Pro-rata reversal of loyalty points for order returns/refunds.
 */
export function calculateLoyaltyReturnReversal(params: {
  originalOrderTotalMinor: string;
  returnAmountMinor: string;
  originalPointsEarned: number;
  originalPointsRedeemed: number;
}): {
  points_to_deduct: number;
  points_to_restore: number;
} {
  const origTotal = BigInt(params.originalOrderTotalMinor || '0');
  const retAmount = BigInt(params.returnAmountMinor || '0');

  if (origTotal <= 0n || retAmount <= 0n) {
    return { points_to_deduct: 0, points_to_restore: 0 };
  }

  // Pure integer pro-rata: (returnAmount * points) / originalOrderTotal
  const pointsToDeduct = Number((retAmount * BigInt(params.originalPointsEarned)) / origTotal);
  const pointsToRestore = Number((retAmount * BigInt(params.originalPointsRedeemed)) / origTotal);

  return {
    points_to_deduct: pointsToDeduct,
    points_to_restore: pointsToRestore,
  };
}
