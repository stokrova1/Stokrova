import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyAccount,
  LoyaltyTransaction,
  CreateLoyaltyProgramRequest,
  EarnLoyaltyPointsRequest,
  RedeemLoyaltyPointsRequest,
  PointsRedemptionCalculationResult,
} from '@stokrova/contracts';
import {
  CreateLoyaltyProgramSchema,
  EarnLoyaltyPointsSchema,
  RedeemLoyaltyPointsSchema,
} from '@stokrova/validation';
import {
  calculateEarnedLoyaltyPoints,
  evaluateTierProgression,
  calculatePointsRedemptionDiscount,
  LoyaltyDomainError,
} from '@stokrova/domain';

@Injectable()
export class LoyaltyService {
  private readonly programs = new Map<string, LoyaltyProgram>();
  private readonly tiersByProgram = new Map<string, LoyaltyTier[]>();
  private readonly accounts = new Map<string, LoyaltyAccount>(); // tenant:customer -> account
  private readonly transactions = new Map<string, LoyaltyTransaction>();
  private readonly processedOperations = new Set<string>(); // tenant:operationId

  // ==========================================================================
  // Program Management
  // ==========================================================================

  async createProgram(
    tenantId: string,
    req: CreateLoyaltyProgramRequest,
  ): Promise<LoyaltyProgram> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateLoyaltyProgramSchema.parse(req);
    const now = new Date().toISOString();
    const id = `prog_${randomUUID()}`;

    const program: LoyaltyProgram = {
      id,
      tenant_id: tenantId,
      name: parsed.name,
      points_per_currency_minor: parsed.points_per_currency_minor,
      points_currency: parsed.points_currency,
      redemption_ratio_bp: parsed.redemption_ratio_bp,
      max_redemption_percent_bp: parsed.max_redemption_percent_bp,
      points_validity_days: parsed.points_validity_days,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.programs.set(id, program);

    // Initialize tiers
    const tiers: LoyaltyTier[] = (parsed.tiers || [
      {
        tier_code: 'BRONZE',
        tier_name: 'Bronze Member',
        min_spend_minor: '0',
        multiplier_bp: 10000,
        priority: 1,
      },
      {
        tier_code: 'SILVER',
        tier_name: 'Silver Member',
        min_spend_minor: '50000',
        multiplier_bp: 12500,
        priority: 2,
      },
      {
        tier_code: 'GOLD',
        tier_name: 'Gold Elite',
        min_spend_minor: '200000',
        multiplier_bp: 15000,
        priority: 3,
      },
      {
        tier_code: 'PLATINUM',
        tier_name: 'Platinum VIP',
        min_spend_minor: '500000',
        multiplier_bp: 20000,
        priority: 4,
      },
    ]).map((t) => ({
      id: `tier_${randomUUID()}`,
      tenant_id: tenantId,
      program_id: id,
      tier_code: t.tier_code,
      tier_name: t.tier_name,
      min_spend_minor: t.min_spend_minor,
      multiplier_bp: t.multiplier_bp,
      priority: t.priority,
      created_at: now,
    }));

    this.tiersByProgram.set(id, tiers);

    return program;
  }

  async getProgram(tenantId: string, programId?: string): Promise<LoyaltyProgram> {
    if (programId) {
      const p = this.programs.get(programId);
      if (!p || p.tenant_id !== tenantId) {
        throw new NotFoundException(`Loyalty program '${programId}' not found`);
      }
      return p;
    }

    // Default to first active tenant program
    const first = Array.from(this.programs.values()).find(
      (p) => p.tenant_id === tenantId && p.is_active,
    );
    if (!first) {
      throw new NotFoundException(`No active loyalty program found for tenant`);
    }
    return first;
  }

  // ==========================================================================
  // Customer Loyalty Accounts
  // ==========================================================================

  async getOrCreateAccount(
    tenantId: string,
    customerId: string,
    programId?: string,
  ): Promise<LoyaltyAccount> {
    const key = `${tenantId}:${customerId}`;
    let account = this.accounts.get(key);
    if (account) {
      return account;
    }

    const program = await this.getProgram(tenantId, programId);
    const now = new Date().toISOString();

    account = {
      id: `lyacc_${randomUUID()}`,
      tenant_id: tenantId,
      customer_id: customerId,
      program_id: program.id,
      current_tier_code: 'BRONZE',
      lifetime_spend_minor: '0',
      points_balance: 0,
      lifetime_points_earned: 0,
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    };

    this.accounts.set(key, account);
    return account;
  }

  // ==========================================================================
  // Points Accrual & Redemption
  // ==========================================================================

  async earnPoints(
    tenantId: string,
    req: EarnLoyaltyPointsRequest,
  ): Promise<{ account: LoyaltyAccount; pointsEarned: number }> {
    const parsed = EarnLoyaltyPointsSchema.parse(req);
    const opKey = `${tenantId}:${parsed.operation_id}`;

    // Rule 19: Durable idempotency
    if (this.processedOperations.has(opKey)) {
      const account = await this.getOrCreateAccount(tenantId, parsed.customer_id);
      return { account, pointsEarned: 0 };
    }

    const account = await this.getOrCreateAccount(tenantId, parsed.customer_id);
    const program = await this.getProgram(tenantId, account.program_id);
    const tiers = this.tiersByProgram.get(program.id) || [];

    // Find multiplier for current tier
    const currentTier = tiers.find((t) => t.tier_code === account.current_tier_code);
    const multiplierBp = currentTier ? currentTier.multiplier_bp : 10000;

    const pointsEarned = calculateEarnedLoyaltyPoints(
      parsed.spend_minor,
      program.points_per_currency_minor,
      multiplierBp,
    );

    const now = new Date().toISOString();
    const newLifetimeSpend = (
      BigInt(account.lifetime_spend_minor) + BigInt(parsed.spend_minor)
    ).toString();
    const newTier = evaluateTierProgression(newLifetimeSpend, tiers);

    account.points_balance += pointsEarned;
    account.lifetime_points_earned += pointsEarned;
    account.lifetime_spend_minor = newLifetimeSpend;
    account.current_tier_code = newTier;
    account.last_activity_at = now;
    account.updated_at = now;

    const tx: LoyaltyTransaction = {
      id: `lytx_${randomUUID()}`,
      tenant_id: tenantId,
      account_id: account.id,
      transaction_type: 'EARN',
      points: pointsEarned,
      order_id: parsed.order_id ?? null,
      notes: `Earned on order ${parsed.order_id ?? 'N/A'} at tier ${account.current_tier_code}`,
      operation_id: parsed.operation_id,
      created_at: now,
    };
    this.transactions.set(tx.id, tx);
    this.processedOperations.add(opKey);

    return { account, pointsEarned };
  }

  async calculateRedemptionDiscount(
    tenantId: string,
    customerId: string,
    pointsToRedeem: number,
    orderTotalMinor: string,
  ): Promise<PointsRedemptionCalculationResult> {
    const account = await this.getOrCreateAccount(tenantId, customerId);
    const program = await this.getProgram(tenantId, account.program_id);

    return calculatePointsRedemptionDiscount({
      pointsToRedeem,
      availablePointsBalance: account.points_balance,
      redemptionRatioBp: program.redemption_ratio_bp,
      orderTotalMinor,
      maxRedemptionPercentBp: program.max_redemption_percent_bp,
    });
  }

  async redeemPoints(
    tenantId: string,
    req: RedeemLoyaltyPointsRequest,
  ): Promise<{ account: LoyaltyAccount; discountMinor: string; pointsUsed: number }> {
    const parsed = RedeemLoyaltyPointsSchema.parse(req);
    const opKey = `${tenantId}:${parsed.operation_id}`;

    if (this.processedOperations.has(opKey)) {
      const account = await this.getOrCreateAccount(tenantId, parsed.customer_id);
      return { account, discountMinor: '0', pointsUsed: 0 };
    }

    const account = await this.getOrCreateAccount(tenantId, parsed.customer_id);
    const program = await this.getProgram(tenantId, account.program_id);

    if (account.points_balance < parsed.points_to_redeem) {
      throw new LoyaltyDomainError(
        'INSUFFICIENT_POINTS',
        `Customer points balance (${account.points_balance}) is less than requested redemption (${parsed.points_to_redeem})`,
        {
          balance: account.points_balance,
          requested: parsed.points_to_redeem,
        },
      );
    }

    const calc = calculatePointsRedemptionDiscount({
      pointsToRedeem: parsed.points_to_redeem,
      availablePointsBalance: account.points_balance,
      redemptionRatioBp: program.redemption_ratio_bp,
      orderTotalMinor: parsed.order_total_minor,
      maxRedemptionPercentBp: program.max_redemption_percent_bp,
    });

    const now = new Date().toISOString();
    account.points_balance -= calc.points_used;
    account.last_activity_at = now;
    account.updated_at = now;

    const tx: LoyaltyTransaction = {
      id: `lytx_${randomUUID()}`,
      tenant_id: tenantId,
      account_id: account.id,
      transaction_type: 'REDEEM',
      points: -calc.points_used,
      order_id: parsed.order_id ?? null,
      notes: `Redeemed ${calc.points_used} points for ${calc.discount_minor} minor units discount`,
      operation_id: parsed.operation_id,
      created_at: now,
    };
    this.transactions.set(tx.id, tx);
    this.processedOperations.add(opKey);

    return {
      account,
      discountMinor: calc.discount_minor,
      pointsUsed: calc.points_used,
    };
  }
}
