import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type {
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyAccount,
  LoyaltyTransaction,
} from '@stokrova/contracts';
import {
  calculateEarnedLoyaltyPoints,
  calculatePointsRedemptionDiscount,
  evaluateTierProgression,
  calculateLoyaltyReturnReversal,
  LoyaltyTierDef,
} from '@stokrova/domain';

@Injectable()
export class LoyaltyService {
  private programsStore = new Map<string, LoyaltyProgram>();
  private tiersStore = new Map<string, LoyaltyTier[]>(); // programId -> tiers
  private accountsStore = new Map<string, LoyaltyAccount>(); // tenantId:customerId -> account
  private transactionsStore = new Map<string, LoyaltyTransaction>(); // tenantId:opId -> tx

  // --------------------------------------------------------------------------
  // Program & Tier Configuration
  // --------------------------------------------------------------------------

  async createProgram(
    tenantId: string,
    params: {
      name: string;
      points_per_currency_minor?: number;
      points_currency?: string;
      redemption_ratio_bp?: number;
      max_redemption_percent_bp?: number;
      points_validity_days?: number;
    },
  ): Promise<LoyaltyProgram> {
    const program: LoyaltyProgram = {
      id: `lprog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      name: params.name.trim(),
      points_per_currency_minor: params.points_per_currency_minor ?? 100, // 1 point per $1.00
      points_currency: params.points_currency ?? 'USD',
      redemption_ratio_bp: params.redemption_ratio_bp ?? 100, // 100 bp = $0.01 per point
      max_redemption_percent_bp: params.max_redemption_percent_bp ?? 5000, // max 50% of order
      points_validity_days: params.points_validity_days ?? 365,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.programsStore.set(program.id, program);
    this.tiersStore.set(program.id, []);
    return program;
  }

  async addTier(
    tenantId: string,
    programId: string,
    params: {
      tier_code: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
      tier_name: string;
      min_spend_minor: string;
      multiplier_bp?: number;
      priority?: number;
    },
  ): Promise<LoyaltyTier> {
    const program = this.programsStore.get(programId);
    if (!program || program.tenant_id !== tenantId) {
      throw new NotFoundException(`Loyalty program '${programId}' not found.`);
    }

    const tier: LoyaltyTier = {
      id: `ltier_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      program_id: programId,
      tier_code: params.tier_code,
      tier_name: params.tier_name,
      min_spend_minor: params.min_spend_minor,
      multiplier_bp: params.multiplier_bp ?? 10000, // 1.0x
      priority: params.priority ?? 1,
      created_at: new Date().toISOString(),
    };

    const currentTiers = this.tiersStore.get(programId) || [];
    currentTiers.push(tier);
    this.tiersStore.set(programId, currentTiers);

    return tier;
  }

  // --------------------------------------------------------------------------
  // Account Enrollment & Lifecycle
  // --------------------------------------------------------------------------

  async enrollCustomer(
    tenantId: string,
    programId: string,
    customerId: string,
  ): Promise<LoyaltyAccount> {
    const key = `${tenantId}:${customerId}`;
    const existing = this.accountsStore.get(key);
    if (existing) {
      return existing;
    }

    const program = this.programsStore.get(programId);
    if (!program || program.tenant_id !== tenantId) {
      throw new NotFoundException(`Loyalty program '${programId}' not found.`);
    }

    const now = new Date().toISOString();
    const account: LoyaltyAccount = {
      id: `lacc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      customer_id: customerId,
      program_id: programId,
      current_tier_code: 'BRONZE',
      lifetime_spend_minor: '0',
      points_balance: 0,
      lifetime_points_earned: 0,
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    };

    this.accountsStore.set(key, account);
    return account;
  }

  async getAccount(tenantId: string, customerId: string): Promise<LoyaltyAccount | null> {
    const key = `${tenantId}:${customerId}`;
    return this.accountsStore.get(key) || null;
  }

  // --------------------------------------------------------------------------
  // Points Earning & Tier Progression
  // --------------------------------------------------------------------------

  async earnPoints(
    tenantId: string,
    params: {
      customerId: string;
      orderId: string;
      spendMinor: string;
      operationId: string;
    },
  ): Promise<{ points_earned: number; account: LoyaltyAccount }> {
    const opKey = `${tenantId}:${params.operationId}`;
    const existingTx = this.transactionsStore.get(opKey);
    if (existingTx) {
      const account = await this.getAccount(tenantId, params.customerId);
      return { points_earned: existingTx.points, account: account! };
    }

    const account = await this.getAccount(tenantId, params.customerId);
    if (!account) {
      throw new NotFoundException(`Customer '${params.customerId}' is not enrolled in a loyalty program.`);
    }

    const program = this.programsStore.get(account.program_id);
    if (!program) {
      throw new NotFoundException(`Loyalty program '${account.program_id}' not found.`);
    }

    const tiers = (this.tiersStore.get(program.id) || []).map((t) => ({
      tier_code: t.tier_code,
      tier_name: t.tier_name,
      min_spend_minor: t.min_spend_minor,
      multiplier_bp: t.multiplier_bp,
      priority: t.priority,
    })) as LoyaltyTierDef[];

    // Find current tier multiplier
    const currentTier = tiers.find((t) => t.tier_code === account.current_tier_code);
    const multiplier = currentTier ? currentTier.multiplier_bp : 10000;

    const pointsEarned = calculateEarnedLoyaltyPoints(
      params.spendMinor,
      program.points_per_currency_minor,
      multiplier,
    );

    // Record append-only ledger transaction
    const tx: LoyaltyTransaction = {
      id: `ltx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      account_id: account.id,
      transaction_type: 'EARN',
      points: pointsEarned,
      order_id: params.orderId,
      notes: `Earned from Order ${params.orderId}`,
      operation_id: params.operationId,
      created_at: new Date().toISOString(),
    };
    this.transactionsStore.set(opKey, tx);

    // Update account balances
    account.points_balance += pointsEarned;
    account.lifetime_points_earned += pointsEarned;
    account.lifetime_spend_minor = (
      BigInt(account.lifetime_spend_minor) + BigInt(params.spendMinor)
    ).toString();
    account.last_activity_at = new Date().toISOString();
    account.updated_at = new Date().toISOString();

    // Re-evaluate tier progression
    const newTier = evaluateTierProgression(account.lifetime_spend_minor, tiers);
    account.current_tier_code = newTier;

    return { points_earned: pointsEarned, account };
  }

  // --------------------------------------------------------------------------
  // Points Redemption (Order Checkout)
  // --------------------------------------------------------------------------

  async redeemPoints(
    tenantId: string,
    params: {
      customerId: string;
      orderId: string;
      pointsToRedeem: number;
      orderTotalMinor: string;
      operationId: string;
    },
  ): Promise<{
    discount_minor: string;
    points_used: number;
    remaining_balance: number;
  }> {
    const opKey = `${tenantId}:${params.operationId}`;
    const existingTx = this.transactionsStore.get(opKey);
    if (existingTx) {
      const account = await this.getAccount(tenantId, params.customerId);
      return {
        discount_minor: '0',
        points_used: existingTx.points,
        remaining_balance: account!.points_balance,
      };
    }

    const account = await this.getAccount(tenantId, params.customerId);
    if (!account) {
      throw new NotFoundException(`Customer '${params.customerId}' is not enrolled in loyalty.`);
    }

    const program = this.programsStore.get(account.program_id);
    if (!program) {
      throw new NotFoundException('Program not found.');
    }

    if (account.points_balance < params.pointsToRedeem) {
      throw new BadRequestException(
        `Insufficient loyalty points. Balance: ${account.points_balance}, requested: ${params.pointsToRedeem}.`,
      );
    }

    const calc = calculatePointsRedemptionDiscount({
      pointsToRedeem: params.pointsToRedeem,
      availablePointsBalance: account.points_balance,
      redemptionRatioBp: program.redemption_ratio_bp,
      orderTotalMinor: params.orderTotalMinor,
      maxRedemptionPercentBp: program.max_redemption_percent_bp,
    });

    // Record append-only ledger transaction
    const tx: LoyaltyTransaction = {
      id: `ltx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      account_id: account.id,
      transaction_type: 'REDEEM',
      points: -calc.points_used,
      order_id: params.orderId,
      notes: `Redeemed on Order ${params.orderId}`,
      operation_id: params.operationId,
      created_at: new Date().toISOString(),
    };
    this.transactionsStore.set(opKey, tx);

    // Deduct points
    account.points_balance -= calc.points_used;
    account.last_activity_at = new Date().toISOString();
    account.updated_at = new Date().toISOString();

    return {
      discount_minor: calc.discount_minor,
      points_used: calc.points_used,
      remaining_balance: account.points_balance,
    };
  }

  // --------------------------------------------------------------------------
  // Return & Refund Pro-Rata Reversals
  // --------------------------------------------------------------------------

  async reverseReturnPoints(
    tenantId: string,
    params: {
      customerId: string;
      orderId: string;
      returnAmountMinor: string;
      originalOrderTotalMinor: string;
      originalPointsEarned: number;
      originalPointsRedeemed: number;
      operationId: string;
    },
  ): Promise<{
    points_deducted: number;
    points_restored: number;
    account: LoyaltyAccount;
  }> {
    const opKey = `${tenantId}:${params.operationId}`;
    const existingTx = this.transactionsStore.get(opKey);
    if (existingTx) {
      const account = await this.getAccount(tenantId, params.customerId);
      return {
        points_deducted: 0,
        points_restored: 0,
        account: account!,
      };
    }

    const account = await this.getAccount(tenantId, params.customerId);
    if (!account) {
      throw new NotFoundException(`Customer '${params.customerId}' loyalty account not found.`);
    }

    const reversal = calculateLoyaltyReturnReversal({
      originalOrderTotalMinor: params.originalOrderTotalMinor,
      returnAmountMinor: params.returnAmountMinor,
      originalPointsEarned: params.originalPointsEarned,
      originalPointsRedeemed: params.originalPointsRedeemed,
    });

    const netPointsChange = reversal.points_to_restore - reversal.points_to_deduct;

    // Record append-only ledger transaction
    const tx: LoyaltyTransaction = {
      id: `ltx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      account_id: account.id,
      transaction_type: 'REVERSAL',
      points: netPointsChange,
      order_id: params.orderId,
      notes: `Pro-rata return reversal on Order ${params.orderId} (-${reversal.points_to_deduct} earned, +${reversal.points_to_restore} redeemed)`,
      operation_id: params.operationId,
      created_at: new Date().toISOString(),
    };
    this.transactionsStore.set(opKey, tx);

    // Update account points
    account.points_balance += netPointsChange;
    account.last_activity_at = new Date().toISOString();
    account.updated_at = new Date().toISOString();

    return {
      points_deducted: reversal.points_to_deduct,
      points_restored: reversal.points_to_restore,
      account,
    };
  }

  // --------------------------------------------------------------------------
  // Authoritative Ledger Verification (Rule 11)
  // --------------------------------------------------------------------------

  async verifyAccountBalanceAgainstLedger(
    tenantId: string,
    customerId: string,
  ): Promise<{ is_verified: boolean; stored_balance: number; ledger_balance: number }> {
    const account = await this.getAccount(tenantId, customerId);
    if (!account) {
      throw new NotFoundException(`Customer '${customerId}' loyalty account not found.`);
    }

    const txs = Array.from(this.transactionsStore.values()).filter(
      (t) => t.tenant_id === tenantId && t.account_id === account.id,
    );

    let calculatedBalance = 0;
    for (const t of txs) {
      calculatedBalance += t.points;
    }

    return {
      is_verified: calculatedBalance === account.points_balance,
      stored_balance: account.points_balance,
      ledger_balance: calculatedBalance,
    };
  }
}
