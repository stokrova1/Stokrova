import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  PromotionCampaign,
  PromotionRedemptionRecord,
  CreatePromotionCampaignRequest,
  RedeemPromotionRequest,
} from '@stokrova/contracts';
import {
  evaluatePromotionStacking,
  CandidatePromotion,
} from '@stokrova/domain';

@Injectable()
export class PromotionsService {
  private campaignsStore = new Map<string, PromotionCampaign>();
  private redemptionsStore = new Map<string, PromotionRedemptionRecord>();

  // --------------------------------------------------------------------------
  // Campaign Administration
  // --------------------------------------------------------------------------

  async createCampaign(
    tenantId: string,
    req: CreatePromotionCampaignRequest,
  ): Promise<PromotionCampaign> {
    const code = req.campaign_code.trim().toUpperCase();

    const existing = Array.from(this.campaignsStore.values()).find(
      (c) => c.tenant_id === tenantId && c.campaign_code === code,
    );
    if (existing) {
      throw new ConflictException(`Promotion campaign '${code}' already exists.`);
    }

    const now = new Date().toISOString();
    const campaign: PromotionCampaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      campaign_code: code,
      name: req.name.trim(),
      description: req.description || null,
      promotion_type: req.promotion_type,
      stacking_rule: req.stacking_rule || 'BEST_DEAL',
      value_minor_or_bp: req.value_minor_or_bp,
      buy_quantity: req.buy_quantity ?? null,
      get_quantity: req.get_quantity ?? null,
      get_discount_percent_bp: req.get_discount_percent_bp ?? null,
      bundle_variant_ids: req.bundle_variant_ids ?? null,
      bundle_fixed_price_minor: req.bundle_fixed_price_minor ?? null,
      min_subtotal_minor: req.min_subtotal_minor ?? null,
      max_discount_minor: req.max_discount_minor ?? null,
      eligible_variant_ids: req.eligible_variant_ids ?? null,
      eligible_customer_group: req.eligible_customer_group ?? null,
      eligible_channel: req.eligible_channel ?? null,
      valid_from: req.valid_from ?? null,
      valid_until: req.valid_until ?? null,
      budget_limit_minor: req.budget_limit_minor ?? null,
      budget_consumed_minor: '0',
      usage_limit_total: req.usage_limit_total ?? null,
      usage_count_total: 0,
      usage_limit_per_customer: req.usage_limit_per_customer ?? null,
      coupon_code: req.coupon_code ? req.coupon_code.trim().toUpperCase() : null,
      requires_coupon: req.requires_coupon ?? false,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.campaignsStore.set(campaign.id, campaign);
    return campaign;
  }

  async getCampaign(tenantId: string, campaignId: string): Promise<PromotionCampaign> {
    const c = this.campaignsStore.get(campaignId);
    if (!c || c.tenant_id !== tenantId) {
      throw new NotFoundException(`Campaign '${campaignId}' not found.`);
    }
    return c;
  }

  async getCampaignByCode(tenantId: string, code: string): Promise<PromotionCampaign | null> {
    const cleanCode = code.trim().toUpperCase();
    return (
      Array.from(this.campaignsStore.values()).find(
        (c) =>
          c.tenant_id === tenantId &&
          (c.campaign_code === cleanCode || (c.coupon_code && c.coupon_code === cleanCode)) &&
          c.is_active,
      ) || null
    );
  }

  async listCampaigns(tenantId: string): Promise<PromotionCampaign[]> {
    return Array.from(this.campaignsStore.values()).filter(
      (c) => c.tenant_id === tenantId,
    );
  }

  // --------------------------------------------------------------------------
  // Non-Consuming Evaluation (Preview)
  // --------------------------------------------------------------------------

  async evaluatePromotions(
    tenantId: string,
    params: {
      subtotalMinor: string;
      variantIds: string[];
      customerGroup?: string;
      channel?: string;
      couponCode?: string;
    },
  ): Promise<{
    applied_promotions: {
      campaign_id: string;
      campaign_code: string;
      campaign_name: string;
      discount_minor: string;
    }[];
    total_discount_minor: string;
  }> {
    const { subtotalMinor, variantIds, customerGroup, channel, couponCode } = params;
    const subtotal = BigInt(subtotalMinor || '0');
    if (subtotal <= 0n) {
      return { applied_promotions: [], total_discount_minor: '0' };
    }

    const activeCampaigns = Array.from(this.campaignsStore.values()).filter(
      (c) => c.tenant_id === tenantId && c.is_active,
    );

    const candidates: CandidatePromotion[] = [];

    for (const c of activeCampaigns) {
      // 1. Coupon requirement
      if (c.requires_coupon) {
        if (!couponCode || (c.coupon_code && c.coupon_code !== couponCode.trim().toUpperCase())) {
          continue; // Coupon missing or does not match
        }
      }

      // 2. Customer group & channel eligibility
      if (c.eligible_customer_group && c.eligible_customer_group !== customerGroup) {
        continue;
      }
      if (c.eligible_channel && c.eligible_channel !== channel) {
        continue;
      }

      // 3. Variant eligibility if specified
      if (c.eligible_variant_ids && c.eligible_variant_ids.length > 0) {
        const hasEligible = variantIds.some((v) => c.eligible_variant_ids!.includes(v));
        if (!hasEligible) continue;
      }

      // 4. Subtotal threshold
      if (c.min_subtotal_minor && subtotal < BigInt(c.min_subtotal_minor)) {
        continue;
      }

      // 5. Budget or usage exhaustion check
      if (c.usage_limit_total && c.usage_count_total >= c.usage_limit_total) {
        continue;
      }
      if (c.budget_limit_minor && BigInt(c.budget_consumed_minor) >= BigInt(c.budget_limit_minor)) {
        continue;
      }

      // 6. Calculate potential discount
      let discount = 0n;
      if (c.promotion_type === 'PERCENTAGE') {
        const bp = parseInt(c.value_minor_or_bp, 10);
        discount = (subtotal * BigInt(bp)) / 10000n;
        if (c.max_discount_minor) {
          const cap = BigInt(c.max_discount_minor);
          if (discount > cap) discount = cap;
        }
      } else if (c.promotion_type === 'FIXED_AMOUNT') {
        discount = BigInt(c.value_minor_or_bp);
      } else {
        // BXGY or Bundle
        discount = BigInt(c.value_minor_or_bp || '0');
      }

      if (discount > subtotal) discount = subtotal;

      candidates.push({
        campaign_id: c.id,
        campaign_code: c.campaign_code,
        campaign_name: c.name,
        stacking_rule: c.stacking_rule,
        discount_minor: discount.toString(),
      });
    }

    return evaluatePromotionStacking(subtotalMinor, candidates);
  }

  // --------------------------------------------------------------------------
  // Atomic Redemption (Checkout Time)
  // --------------------------------------------------------------------------

  async redeemPromotion(
    tenantId: string,
    req: RedeemPromotionRequest,
  ): Promise<PromotionRedemptionRecord> {
    // 1. Idempotency Check via operation_id
    const existing = Array.from(this.redemptionsStore.values()).find(
      (r) => r.tenant_id === tenantId && r.operation_id === req.operation_id,
    );
    if (existing) {
      return existing; // Idempotently return already-recorded redemption
    }

    const campaign = await this.getCampaign(tenantId, req.campaign_id);

    // 2. Validate usage limits
    if (campaign.usage_limit_total && campaign.usage_count_total >= campaign.usage_limit_total) {
      throw new BadRequestException(
        `Campaign '${campaign.campaign_code}' has reached its total usage limit of ${campaign.usage_limit_total}.`,
      );
    }

    // 3. Validate budget limits
    const discountAmt = BigInt(req.discount_amount_minor || '0');
    if (campaign.budget_limit_minor) {
      const budgetLimit = BigInt(campaign.budget_limit_minor);
      const budgetConsumed = BigInt(campaign.budget_consumed_minor);
      if (budgetConsumed + discountAmt > budgetLimit) {
        throw new BadRequestException(
          `Campaign '${campaign.campaign_code}' has exceeded its promotional budget limit.`,
        );
      }
    }

    // 4. Increment usage & budget consumed
    campaign.usage_count_total += 1;
    campaign.budget_consumed_minor = (
      BigInt(campaign.budget_consumed_minor) + discountAmt
    ).toString();
    campaign.updated_at = new Date().toISOString();

    const record: PromotionRedemptionRecord = {
      id: `red_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      campaign_id: campaign.id,
      coupon_code: req.coupon_code || campaign.coupon_code,
      order_id: req.order_id,
      customer_id: req.customer_id || null,
      discount_amount_minor: req.discount_amount_minor,
      operation_id: req.operation_id,
      redeemed_at: new Date().toISOString(),
    };

    this.redemptionsStore.set(record.id, record);
    return record;
  }
}
