/**
 * ============================================================================
 * STOKROVA — Customer Loyalty, Rewards & Omnichannel Gift Cards Contracts
 * Phase 17: Customer Loyalty, Rewards, Omnichannel Gift Cards & Stored-Value Ledger
 * ============================================================================
 */

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

export interface LoyaltyProgram {
  id: string;
  tenant_id: string;
  name: string;
  points_per_currency_minor: number; // e.g. 100 = 1 point per 100 minor units ($1.00)
  points_currency: string;
  redemption_ratio_bp: number;       // e.g. 100 bp = 1 point = 1 minor unit ($0.01)
  max_redemption_percent_bp: number; // e.g. 5000 bp = max 50% of order line total
  points_validity_days: number;      // e.g. 365 days
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTier {
  id: string;
  tenant_id: string;
  program_id: string;
  tier_code: LoyaltyTierCode;
  tier_name: string;
  min_spend_minor: string;
  multiplier_bp: number;             // e.g. 10000 = 1.0x, 15000 = 1.5x
  priority: number;                  // 1 = Bronze, 4 = Platinum
  created_at: string;
}

export interface LoyaltyAccount {
  id: string;
  tenant_id: string;
  customer_id: string;
  program_id: string;
  current_tier_code: LoyaltyTierCode;
  lifetime_spend_minor: string;
  points_balance: number;
  lifetime_points_earned: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  tenant_id: string;
  account_id: string;
  transaction_type: LoyaltyTransactionType;
  points: number;
  order_id?: string | null;
  notes?: string | null;
  operation_id: string;
  created_at: string;
}

export interface GiftCardAccount {
  id: string;
  tenant_id: string;
  card_code: string;                 // e.g. GFT-9842-1204-5519
  pin_hash?: string | null;
  pin_salt?: string | null;
  currency: string;
  initial_balance_minor: string;
  current_balance_minor: string;
  status: GiftCardStatus;
  customer_id?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftCardTransaction {
  id: string;
  tenant_id: string;
  gift_card_id: string;
  transaction_type: GiftCardTransactionType;
  amount_minor: string;
  previous_balance_minor: string;
  new_balance_minor: string;
  reference_order_id?: string | null;
  operation_id: string;
  created_at: string;
}

// ============================================================================
// DTOs & Request Interfaces
// ============================================================================

export interface CreateLoyaltyProgramRequest {
  name: string;
  points_per_currency_minor?: number;
  points_currency?: string;
  redemption_ratio_bp?: number;
  max_redemption_percent_bp?: number;
  points_validity_days?: number;
  tiers?: Array<{
    tier_code: LoyaltyTierCode;
    tier_name: string;
    min_spend_minor: string;
    multiplier_bp: number;
    priority: number;
  }>;
}

export interface EarnLoyaltyPointsRequest {
  customer_id: string;
  spend_minor: string;
  order_id?: string;
  operation_id: string;
}

export interface RedeemLoyaltyPointsRequest {
  customer_id: string;
  points_to_redeem: number;
  order_total_minor: string;
  order_id?: string;
  operation_id: string;
}

export interface IssueGiftCardRequest {
  initial_balance_minor: string;
  currency?: string;
  pin?: string;
  customer_id?: string | null;
  expires_at?: string | null;
  operation_id: string;
}

export interface RedeemGiftCardRequest {
  card_code: string;
  pin?: string;
  amount_minor: string;
  order_id?: string;
  operation_id: string;
}

export interface ReloadGiftCardRequest {
  card_code: string;
  amount_minor: string;
  operation_id: string;
}

export interface InquireGiftCardRequest {
  card_code: string;
  pin?: string;
}

export interface PointsRedemptionCalculationResult {
  discount_minor: string;
  points_used: number;
  remaining_points: number;
  net_order_total_minor: string;
}
