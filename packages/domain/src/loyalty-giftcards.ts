/**
 * ============================================================================
 * STOKROVA — Customer Loyalty, Rewards & Gift Cards Domain Engine
 * Phase 17: Customer Loyalty, Rewards, Omnichannel Gift Cards & Stored-Value Ledger
 *
 * Benchmark: Starbucks Rewards Engine, Shopify Balance / Gift Cards,
 * Lightspeed Loyalty, Toast Stored Value, Adyen Gift Card Scheme
 *
 * Golden Rules Compliance:
 * - Rule 7: Never treat receipts as financial truth (gift card purchase creates deferred liability, redemption recognizes revenue)
 * - Rule 8: Idempotent payment recording (no duplicate card charges or double-redemptions)
 * - Rule 11: Non-destructive financial history (immutable balances and audit ledgers)
 * - Rule 18 & 19: Atomic concurrency and idempotent state transitions
 * - Rule 22: Decoupled pure domain logic (Zero node: imports, runtime-agnostic)
 * - Rule 26: Pure integer arithmetic (minor units for currency, basis points for rates, integer points)
 * ============================================================================
 */

import { sha256 } from './search-reporting.js';

export type LoyaltyTierCode = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type LoyaltyTransactionType =
  | 'EARN'
  | 'REDEEM'
  | 'EXPIRE'
  | 'REVERSAL'
  | 'MANUAL_ADJUSTMENT';

export type GiftCardStatus =
  | 'INACTIVE'
  | 'ACTIVE'
  | 'DEPLETED'
  | 'EXPIRED'
  | 'FROZEN';

export type GiftCardTransactionType =
  | 'ISSUE'
  | 'RELOAD'
  | 'REDEEM'
  | 'REFUND'
  | 'ESCHEATMENT_FORFEIT';

export interface LoyaltyTierDef {
  tier_code: LoyaltyTierCode;
  tier_name: string;
  min_spend_minor: string;
  multiplier_bp: number;
  priority: number;
}

export class LoyaltyDomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'LoyaltyDomainError';
  }
}

// ============================================================================
// 1. Points Accrual & Tier Multiplier Calculation (Rule 26)
// ============================================================================

export function calculateEarnedLoyaltyPoints(
  spendMinor: string,
  pointsPerCurrencyMinor = 100, // Default 1 point per $1.00 (100 cents)
  multiplierBp = 10000,         // Default 1.0x (10,000 basis points)
): number {
  const spend = BigInt(spendMinor || '0');
  if (spend <= 0n || pointsPerCurrencyMinor <= 0) {
    return 0;
  }

  const rate = BigInt(pointsPerCurrencyMinor);
  const basePoints = spend / rate;

  if (basePoints <= 0n) {
    return 0;
  }

  const multiplied = (basePoints * BigInt(multiplierBp)) / 10000n;
  return Number(multiplied);
}

// ============================================================================
// 2. Loyalty Tier Progression Engine
// ============================================================================

export function evaluateTierProgression(
  lifetimeSpendMinor: string,
  tiers: LoyaltyTierDef[],
): LoyaltyTierCode {
  if (!tiers || tiers.length === 0) {
    return 'BRONZE';
  }

  const spend = BigInt(lifetimeSpendMinor || '0');

  // Sort tiers by priority descending
  const sorted = [...tiers].sort((a, b) => b.priority - a.priority);

  for (const tier of sorted) {
    const minSpend = BigInt(tier.min_spend_minor || '0');
    if (spend >= minSpend) {
      return tier.tier_code;
    }
  }

  return sorted[sorted.length - 1]?.tier_code || 'BRONZE';
}

// ============================================================================
// 3. Points Redemption & Order Discount Calculation (Rule 26)
// ============================================================================

export function calculatePointsRedemptionDiscount(params: {
  pointsToRedeem: number;
  availablePointsBalance: number;
  redemptionRatioBp: number;        // e.g. 100 bp = 1 point is 1 cent (100 bp of $0.01 = 1 point -> 1 cent)
  orderTotalMinor: string;
  maxRedemptionPercentBp?: number;  // e.g. 5000 bp = max 50% of order line total
}): {
  discount_minor: string;
  points_used: number;
  remaining_points: number;
  net_order_total_minor: string;
} {
  const {
    pointsToRedeem,
    availablePointsBalance,
    redemptionRatioBp,
    orderTotalMinor,
    maxRedemptionPercentBp = 5000,
  } = params;

  if (pointsToRedeem <= 0 || availablePointsBalance <= 0) {
    const orderTotal = BigInt(orderTotalMinor || '0');
    return {
      discount_minor: '0',
      points_used: 0,
      remaining_points: availablePointsBalance,
      net_order_total_minor: orderTotal.toString(),
    };
  }

  const pointsAllowed = Math.min(pointsToRedeem, availablePointsBalance);
  const orderTotal = BigInt(orderTotalMinor || '0');

  // Max discount allowed by policy cap (e.g. 50% of order total)
  const maxDiscountAllowed = (orderTotal * BigInt(maxRedemptionPercentBp)) / 10000n;

  // Potential discount from points: 1 point = (redemptionRatioBp / 100) minor units
  // For example with ratio 100 bp: 1 point = 1 minor unit ($0.01)
  const potentialDiscount = (BigInt(pointsAllowed) * BigInt(redemptionRatioBp)) / 100n;

  let effectiveDiscount = potentialDiscount;
  let pointsUsed = pointsAllowed;

  if (effectiveDiscount > maxDiscountAllowed) {
    effectiveDiscount = maxDiscountAllowed;
    // Recalculate actual points needed for the capped discount
    if (redemptionRatioBp > 0) {
      pointsUsed = Number((effectiveDiscount * 100n) / BigInt(redemptionRatioBp));
    }
  }

  if (effectiveDiscount > orderTotal) {
    effectiveDiscount = orderTotal;
    pointsUsed = Number((effectiveDiscount * 100n) / BigInt(redemptionRatioBp));
  }

  const netOrderTotal = orderTotal - effectiveDiscount;
  const remainingPoints = availablePointsBalance - pointsUsed;

  return {
    discount_minor: effectiveDiscount.toString(),
    points_used: pointsUsed,
    remaining_points: remainingPoints,
    net_order_total_minor: netOrderTotal.toString(),
  };
}

// ============================================================================
// 4. Stored-Value Gift Cards & PIN Verification (Rule 7, 26)
// ============================================================================

export function generateGiftCardCode(prefix = 'GFT', entropy?: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous
  const seed = entropy || `${Date.now()}-${Math.random()}`;
  const hash = sha256(seed).toUpperCase();

  let part1 = '';
  let part2 = '';
  let part3 = '';

  for (let i = 0; i < 4; i++) {
    const idx1 = parseInt(hash.substring(i * 2, i * 2 + 2), 16) % chars.length;
    const idx2 = parseInt(hash.substring(8 + i * 2, 8 + i * 2 + 2), 16) % chars.length;
    const idx3 = parseInt(hash.substring(16 + i * 2, 16 + i * 2 + 2), 16) % chars.length;
    part1 += chars[idx1];
    part2 += chars[idx2];
    part3 += chars[idx3];
  }

  return `${prefix}-${part1}-${part2}-${part3}`;
}

export function hashGiftCardPin(pin: string, salt: string): string {
  return sha256(`${pin}:${salt}`);
}

export function verifyGiftCardPin(
  providedPin: string,
  storedHash: string,
  salt: string,
): boolean {
  if (!providedPin || !storedHash || !salt) {
    return false;
  }
  const computed = hashGiftCardPin(providedPin, salt);
  return computed === storedHash;
}

export function applyGiftCardRedemption(
  currentBalanceMinor: string,
  redeemAmountMinor: string,
): {
  new_balance_minor: string;
  actual_deducted_minor: string;
  status: GiftCardStatus;
} {
  const balance = BigInt(currentBalanceMinor || '0');
  const redeem = BigInt(redeemAmountMinor || '0');

  if (redeem <= 0n) {
    throw new LoyaltyDomainError(
      'INVALID_REDEMPTION_AMOUNT',
      'Redemption amount must be strictly greater than 0',
      { redeem_amount_minor: redeemAmountMinor },
    );
  }

  if (redeem > balance) {
    throw new LoyaltyDomainError(
      'INSUFFICIENT_GIFT_CARD_BALANCE',
      `Gift card balance (${currentBalanceMinor}) is less than redemption request (${redeemAmountMinor})`,
      {
        current_balance_minor: currentBalanceMinor,
        requested_redeem_minor: redeemAmountMinor,
      },
    );
  }

  const newBalance = balance - redeem;
  const status: GiftCardStatus = newBalance === 0n ? 'DEPLETED' : 'ACTIVE';

  return {
    new_balance_minor: newBalance.toString(),
    actual_deducted_minor: redeem.toString(),
    status,
  };
}

export function applyGiftCardReload(
  currentBalanceMinor: string,
  reloadAmountMinor: string,
): {
  new_balance_minor: string;
  status: GiftCardStatus;
} {
  const balance = BigInt(currentBalanceMinor || '0');
  const reload = BigInt(reloadAmountMinor || '0');

  if (reload <= 0n) {
    throw new LoyaltyDomainError(
      'INVALID_RELOAD_AMOUNT',
      'Reload amount must be strictly greater than 0',
      { reload_amount_minor: reloadAmountMinor },
    );
  }

  const newBalance = balance + reload;

  return {
    new_balance_minor: newBalance.toString(),
    status: 'ACTIVE',
  };
}
