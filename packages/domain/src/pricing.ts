/**
 * STOKROVA Pricing, Tax & Cart Calculation Domain Engine (Phase 3A)
 *
 * Surpassing ERPNext, Odoo, InvenTree, and TetherPOS:
 * - Deterministic integer minor unit arithmetic (zero floating point drift)
 * - Half-up integer rounding on basis points (1 bp = 0.01%)
 * - Inclusive tax extraction and Exclusive tax stacking
 * - Tiered volume break rule selection
 * - Capped promotional discount evaluation
 *
 * ZERO EXTERNAL DEPENDENCIES INVARIANT: Local types only.
 */

export class PricingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingDomainError';
  }
}

export type DomainTaxInclusionType = 'INCLUSIVE' | 'EXCLUSIVE';

export type DomainTaxComputationType = 'PERCENTAGE' | 'FIXED_PER_UNIT';

export type DomainDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface DomainTaxRate {
  id: string;
  code: string;
  name: string;
  rate_bp: number; // e.g. 750 = 7.5%
  computation_type: DomainTaxComputationType;
  inclusion_type: DomainTaxInclusionType;
}

export interface DomainPriceListRule {
  variant_id: string;
  min_quantity: number;
  fixed_price_minor: string | null;
  discount_percent_bp: number | null;
}

export interface DomainDiscountPromotion {
  code: string;
  discount_type: DomainDiscountType;
  value_minor_or_bp: string;
  max_discount_minor: string | null;
  min_subtotal_minor: string | null;
}

export interface DomainCartItemInput {
  variant_id: string;
  quantity: number;
  base_unit_price_minor: string;
  custom_unit_price_minor?: string | null;
  line_discount_percent_bp?: number | null;
  taxes: DomainTaxRate[];
}

export interface DomainCartTaxDetail {
  tax_rate_id: string;
  tax_name: string;
  tax_code: string;
  amount_minor: string;
  inclusion_type: DomainTaxInclusionType;
}

export interface DomainCalculatedLineItem {
  variant_id: string;
  quantity: number;
  base_unit_price_minor: string;
  effective_unit_price_minor: string;
  gross_subtotal_minor: string;
  discount_amount_minor: string;
  tax_amount_minor: string;
  net_line_total_minor: string;
  taxes: DomainCartTaxDetail[];
}

export interface DomainCalculatedCartSummary {
  items: DomainCalculatedLineItem[];
  subtotal_minor: string;
  discount_total_minor: string;
  tax_total_minor: string;
  grand_total_minor: string;
}

const BP_DIVISOR = 10000n;
const HALF_BP = 5000n;

/**
 * Multiplies an integer minor amount by basis points with half-up rounding.
 * e.g., $100.00 (10000) * 7.5% (750 bp) = $7.50 (750)
 */
export function calculateBasisPointsAmount(
  amountMinor: bigint,
  basisPoints: number,
): bigint {
  if (basisPoints <= 0) return 0n;
  const bp = BigInt(basisPoints);
  return (amountMinor * bp + HALF_BP) / BP_DIVISOR;
}

/**
 * Calculates tax on a line amount:
 * - EXCLUSIVE: tax is added onto the base: tax = round(base * rate_bp / 10000)
 * - INCLUSIVE: tax is embedded in gross: tax = gross - round(gross * 10000 / (10000 + rate_bp))
 */
export function calculateTaxAmount(
  amountMinor: bigint,
  tax: DomainTaxRate,
  quantity = 1,
): bigint {
  if (tax.computation_type === 'FIXED_PER_UNIT') {
    return BigInt(tax.rate_bp) * BigInt(quantity);
  }

  if (tax.rate_bp <= 0) return 0n;

  if (tax.inclusion_type === 'EXCLUSIVE') {
    return calculateBasisPointsAmount(amountMinor, tax.rate_bp);
  }

  // INCLUSIVE TAX: extract embedded tax
  const rateBp = BigInt(tax.rate_bp);
  const netBeforeTax = (amountMinor * BP_DIVISOR) / (BP_DIVISOR + rateBp);
  return amountMinor - netBeforeTax;
}

/**
 * Resolves effective unit price based on tiered volume pricelist rules.
 */
export function resolveEffectiveUnitPrice(
  basePriceMinor: bigint,
  quantity: number,
  rules: DomainPriceListRule[] = [],
): bigint {
  if (quantity <= 0) {
    throw new PricingDomainError(`Quantity must be positive. Received: ${quantity}.`);
  }

  // Find best volume tier matching quantity
  const applicableRules = rules
    .filter((r) => r.min_quantity <= quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity);

  const bestRule = applicableRules[0];
  if (!bestRule) {
    return basePriceMinor;
  }

  if (bestRule.fixed_price_minor !== null) {
    return BigInt(bestRule.fixed_price_minor);
  }

  if (bestRule.discount_percent_bp !== null) {
    const discount = calculateBasisPointsAmount(
      basePriceMinor,
      bestRule.discount_percent_bp,
    );
    return basePriceMinor > discount ? basePriceMinor - discount : 0n;
  }

  return basePriceMinor;
}

/**
 * Evaluates promotional coupon discount against cart subtotal.
 */
export function evaluatePromotionDiscount(
  subtotalMinor: bigint,
  promotion?: DomainDiscountPromotion | null,
): bigint {
  if (!promotion) return 0n;

  // Check minimum subtotal qualification
  if (promotion.min_subtotal_minor) {
    const minSubtotal = BigInt(promotion.min_subtotal_minor);
    if (subtotalMinor < minSubtotal) {
      return 0n;
    }
  }

  let discount = 0n;

  if (promotion.discount_type === 'PERCENTAGE') {
    const bp = parseInt(promotion.value_minor_or_bp, 10);
    discount = calculateBasisPointsAmount(subtotalMinor, bp);

    if (promotion.max_discount_minor) {
      const cap = BigInt(promotion.max_discount_minor);
      if (discount > cap) {
        discount = cap;
      }
    }
  } else {
    // FIXED_AMOUNT
    discount = BigInt(promotion.value_minor_or_bp);
  }

  // Discount cannot exceed subtotal
  return discount > subtotalMinor ? subtotalMinor : discount;
}

/**
 * Processes complete cart calculation deterministically.
 */
export function calculateCart(
  items: DomainCartItemInput[],
  pricelistRules: DomainPriceListRule[] = [],
  promotion?: DomainDiscountPromotion | null,
): DomainCalculatedCartSummary {
  let cartSubtotal = 0n;
  let cartLineDiscountTotal = 0n;
  let cartTaxTotal = 0n;
  let cartExclusiveTaxTotal = 0n;

  const calculatedItems: DomainCalculatedLineItem[] = [];

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new PricingDomainError(
        `Item quantity must be positive. Received: ${item.quantity}.`,
      );
    }

    const qtyBig = BigInt(item.quantity);
    const basePrice = BigInt(item.base_unit_price_minor);

    // 1. Determine effective unit price (custom override or volume rule)
    const effectiveUnitPrice = item.custom_unit_price_minor
      ? BigInt(item.custom_unit_price_minor)
      : resolveEffectiveUnitPrice(
          basePrice,
          item.quantity,
          pricelistRules.filter((r) => r.variant_id === item.variant_id),
        );

    const grossSubtotal = effectiveUnitPrice * qtyBig;
    cartSubtotal += grossSubtotal;

    // 2. Line discount
    let lineDiscount = 0n;
    if (item.line_discount_percent_bp) {
      lineDiscount = calculateBasisPointsAmount(
        grossSubtotal,
        item.line_discount_percent_bp,
      );
    }
    cartLineDiscountTotal += lineDiscount;
    const taxableSubtotal = grossSubtotal > lineDiscount ? grossSubtotal - lineDiscount : 0n;

    // 3. Taxes
    let lineTaxTotal = 0n;
    const taxDetails: DomainCartTaxDetail[] = [];

    for (const tax of item.taxes) {
      const taxAmount = calculateTaxAmount(taxableSubtotal, tax, item.quantity);
      lineTaxTotal += taxAmount;
      if (tax.inclusion_type === 'EXCLUSIVE') {
        cartExclusiveTaxTotal += taxAmount;
      }
      taxDetails.push({
        tax_rate_id: tax.id,
        tax_name: tax.name,
        tax_code: tax.code,
        amount_minor: taxAmount.toString(),
        inclusion_type: tax.inclusion_type,
      });
    }
    cartTaxTotal += lineTaxTotal;

    // 4. Net line total:
    // If tax is inclusive, tax is already part of grossSubtotal.
    // If tax is exclusive, add exclusive tax onto total.
    const netTotal =
      taxableSubtotal +
      taxDetails
        .filter((t) => t.inclusion_type === 'EXCLUSIVE')
        .reduce((sum, t) => sum + BigInt(t.amount_minor), 0n);

    calculatedItems.push({
      variant_id: item.variant_id,
      quantity: item.quantity,
      base_unit_price_minor: basePrice.toString(),
      effective_unit_price_minor: effectiveUnitPrice.toString(),
      gross_subtotal_minor: grossSubtotal.toString(),
      discount_amount_minor: lineDiscount.toString(),
      tax_amount_minor: lineTaxTotal.toString(),
      net_line_total_minor: netTotal.toString(),
      taxes: taxDetails,
    });
  }

  // 5. Cart-level promotional coupon
  const promoDiscount = evaluatePromotionDiscount(
    cartSubtotal - cartLineDiscountTotal,
    promotion,
  );
  const totalDiscount = cartLineDiscountTotal + promoDiscount;

  // 6. Grand total
  const grandTotal = cartSubtotal - totalDiscount + cartExclusiveTaxTotal;

  return {
    items: calculatedItems,
    subtotal_minor: cartSubtotal.toString(),
    discount_total_minor: totalDiscount.toString(),
    tax_total_minor: cartTaxTotal.toString(),
    grand_total_minor: grandTotal.toString(),
  };
}
