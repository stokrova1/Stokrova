/**
 * ============================================================================
 * STOKROVA — Rebates & Commercial Incentive Agreements Domain Engine
 * Phase 8 Pure Domain Engine
 *
 * Golden Rules:
 * - Rule 22: Decoupled pure domain logic (Zero external runtime imports)
 * - Rule 26: Pure integer arithmetic (minor units, basis points)
 * ============================================================================
 */

import { calculateBasisPointsAmount } from './pricing.js';

export interface DomainRebateTier {
  tier_number: number;
  threshold_quantity?: number | null;
  threshold_amount_minor?: string | null;
  rebate_rate_bp: number; // e.g. 500 = 5.0%
  fixed_rebate_per_unit_minor?: string | null;
}

export class RebateDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RebateDomainError';
  }
}

/**
 * Calculates rebate amount using graduated marginal brackets.
 * Each tier rate applies only to the volume or spend within that bracket.
 */
export function calculateGraduatedRebate(params: {
  isSpendBased: boolean;
  totalQuantity: number;
  totalSpendMinor: string;
  tiers: DomainRebateTier[];
}): string {
  const { isSpendBased, totalQuantity, totalSpendMinor, tiers } = params;

  if (tiers.length === 0) return '0';

  const sortedTiers = [...tiers].sort((a, b) => a.tier_number - b.tier_number);
  let totalRebateMinor = 0n;

  if (isSpendBased) {
    const totalSpend = BigInt(totalSpendMinor || '0');
    let previousThreshold = 0n;

    for (const tier of sortedTiers) {
      const currentThreshold = BigInt(tier.threshold_amount_minor || '0');
      if (totalSpend <= previousThreshold) break;

      const bracketUpper = totalSpend < currentThreshold ? totalSpend : currentThreshold;
      const bracketAmount = bracketUpper - previousThreshold;

      if (bracketAmount > 0n && tier.rebate_rate_bp > 0) {
        const bracketRebate = calculateBasisPointsAmount(bracketAmount, tier.rebate_rate_bp);
        totalRebateMinor += bracketRebate;
      }

      previousThreshold = currentThreshold;
    }

    // Top bracket if spend exceeds highest tier threshold
    const highestTier = sortedTiers[sortedTiers.length - 1];
    if (highestTier && totalSpend > previousThreshold && highestTier.rebate_rate_bp > 0) {
      const excess = totalSpend - previousThreshold;
      totalRebateMinor += calculateBasisPointsAmount(excess, highestTier.rebate_rate_bp);
    }
  } else {
    // Quantity-based graduated
    let previousThreshold = 0;

    for (const tier of sortedTiers) {
      const currentThreshold = tier.threshold_quantity || 0;
      if (totalQuantity <= previousThreshold) break;

      const bracketUpper = totalQuantity < currentThreshold ? totalQuantity : currentThreshold;
      const bracketUnits = bracketUpper - previousThreshold;

      if (bracketUnits > 0 && tier.fixed_rebate_per_unit_minor) {
        totalRebateMinor += BigInt(bracketUnits) * BigInt(tier.fixed_rebate_per_unit_minor);
      }

      previousThreshold = currentThreshold;
    }

    const highestTier = sortedTiers[sortedTiers.length - 1];
    if (highestTier && totalQuantity > previousThreshold && highestTier.fixed_rebate_per_unit_minor) {
      const excess = totalQuantity - previousThreshold;
      totalRebateMinor += BigInt(excess) * BigInt(highestTier.fixed_rebate_per_unit_minor);
    }
  }

  return totalRebateMinor.toString();
}

/**
 * Calculates rebate amount using retroactive tiering.
 * The highest qualifying tier rate is applied to 100% of the volume or spend.
 */
export function calculateRetroactiveRebate(params: {
  isSpendBased: boolean;
  totalQuantity: number;
  totalSpendMinor: string;
  tiers: DomainRebateTier[];
}): { rebate_minor: string; qualifying_tier_number: number } {
  const { isSpendBased, totalQuantity, totalSpendMinor, tiers } = params;

  if (tiers.length === 0) return { rebate_minor: '0', qualifying_tier_number: 0 };

  // Sort descending by threshold
  const sortedTiers = [...tiers].sort((a, b) => {
    if (isSpendBased) {
      const aVal = BigInt(a.threshold_amount_minor || '0');
      const bVal = BigInt(b.threshold_amount_minor || '0');
      return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
    } else {
      return (b.threshold_quantity || 0) - (a.threshold_quantity || 0);
    }
  });

  let winningTier: DomainRebateTier | null = null;

  for (const tier of sortedTiers) {
    if (isSpendBased) {
      const threshold = BigInt(tier.threshold_amount_minor || '0');
      if (BigInt(totalSpendMinor || '0') >= threshold) {
        winningTier = tier;
        break;
      }
    } else {
      const threshold = tier.threshold_quantity || 0;
      if (totalQuantity >= threshold) {
        winningTier = tier;
        break;
      }
    }
  }

  if (!winningTier) {
    return { rebate_minor: '0', qualifying_tier_number: 0 };
  }

  let rebateMinor = 0n;
  if (isSpendBased) {
    const totalSpend = BigInt(totalSpendMinor || '0');
    rebateMinor = calculateBasisPointsAmount(totalSpend, winningTier.rebate_rate_bp);
  } else {
    if (winningTier.fixed_rebate_per_unit_minor) {
      rebateMinor = BigInt(totalQuantity) * BigInt(winningTier.fixed_rebate_per_unit_minor);
    }
  }

  return {
    rebate_minor: rebateMinor.toString(),
    qualifying_tier_number: winningTier.tier_number,
  };
}

/**
 * Validates state transitions for rebate accruals and claims.
 */
export function assertValidRebateStatusTransition(
  currentStatus: string,
  targetStatus: string,
): void {
  const validTransitions: Record<string, string[]> = {
    ESTIMATE: ['ACCRUED', 'DISPUTED'],
    ACCRUED: ['CLAIMED', 'DISPUTED'],
    CLAIMED: ['APPROVED', 'DISPUTED'],
    APPROVED: ['SETTLED', 'DISPUTED'],
    DISPUTED: ['ACCRUED', 'APPROVED'],
    SETTLED: [], // Final immutable state
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new RebateDomainError(
      `Invalid rebate status transition from '${currentStatus}' to '${targetStatus}'.`,
    );
  }
}
