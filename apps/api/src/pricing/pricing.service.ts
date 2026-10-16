import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PriceList,
  PriceListRule,
  TaxRate,
  DiscountPromotion,
  CreatePriceListRequest,
  CreatePriceListRuleRequest,
  CreateTaxRateRequest,
  CreateDiscountPromotionRequest,
  CalculateCartRequest,
  CalculateCartResponse,
  CalculatedCartSummary,
  CalculatedLineItem,
  CustomerContract,
  CustomerContractItem,
  CreateCustomerContractRequest,
  AddContractItemRequest,
  PricingMarginPolicy,
  CreateMarginPolicyRequest,
  PricingOverrideRequest,
  RequestPriceOverrideRequest,
  DecidePriceOverrideRequest,
  CommercialPriceSnapshot,
  ResolvePriceItemInput,
  ResolvedPriceItemResult,
} from '@stokrova/contracts';
import {
  calculateCart as domainCalculateCart,
  DomainCartItemInput,
  DomainPriceListRule,
  DomainTaxRate,
  DomainDiscountPromotion,
  PricingDomainError,
  resolvePriceWithPrecedence,
  assertPriceMeetsMarginPolicy,
  DomainContractRule,
  DomainPriceTierRule,
} from '@stokrova/domain';
import { VariantsService } from '../catalog/variants.service.js';

@Injectable()
export class PricingService {
  private priceListsStore = new DurableMap<PriceList>('price_lists');
  private priceListRulesStore = new DurableMap<PriceListRule>('price_list_rules');
  private taxRatesStore = new DurableMap<TaxRate>('tax_rates');
  private promotionsStore = new DurableMap<DiscountPromotion>('discount_promotions');
  private contractsStore = new DurableMap<CustomerContract>('customer_contracts');
  private contractItemsStore = new Map<string, CustomerContractItem[]>();
  private marginPoliciesStore = new DurableMap<PricingMarginPolicy>('pricing_margin_policies');
  private overrideRequestsStore = new DurableMap<PricingOverrideRequest>('pricing_override_requests');
  private snapshotsStore = new DurableMap<CommercialPriceSnapshot>('commercial_price_snapshots');

  constructor(private readonly variantsService: VariantsService) {}

  // --------------------------------------------------------------------------
  // Price Lists & Rules
  // --------------------------------------------------------------------------

  async createPriceList(
    tenantId: string,
    req: CreatePriceListRequest,
  ): Promise<PriceList> {
    const code = req.code.trim().toUpperCase();

    const existing = Array.from(this.priceListsStore.values()).find(
      (p) => p.tenant_id === tenantId && p.code === code,
    );
    if (existing) {
      throw new ConflictException(`Price list '${code}' already exists.`);
    }

    // If new list is default, reset previous default
    if (req.is_default) {
      for (const p of this.priceListsStore.values()) {
        if (p.tenant_id === tenantId && p.is_default) {
          p.is_default = false;
        }
      }
    }

    const now = new Date().toISOString();
    const priceList: PriceList = {
      id: `pl_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      currency_code: req.currency_code.trim().toUpperCase(),
      is_default: req.is_default ?? false,
      customer_group: req.customer_group?.trim() || null,
      is_active: true,
      valid_from: req.valid_from || null,
      valid_until: req.valid_until || null,
      created_at: now,
      updated_at: now,
    };

    this.priceListsStore.set(priceList.id, priceList);
    return priceList;
  }

  async getPriceLists(tenantId: string): Promise<PriceList[]> {
    return Array.from(this.priceListsStore.values()).filter(
      (p) => p.tenant_id === tenantId,
    );
  }

  async getPriceListById(tenantId: string, id: string): Promise<PriceList> {
    const pl = this.priceListsStore.get(id);
    if (!pl || pl.tenant_id !== tenantId) {
      throw new NotFoundException(`Price list with ID '${id}' not found.`);
    }
    return pl;
  }

  async createPriceListRule(
    tenantId: string,
    req: CreatePriceListRuleRequest,
  ): Promise<PriceListRule> {
    await this.getPriceListById(tenantId, req.pricelist_id);
    await this.variantsService.getVariantById(tenantId, req.variant_id);

    const now = new Date().toISOString();
    const rule: PriceListRule = {
      id: `plr_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      pricelist_id: req.pricelist_id,
      variant_id: req.variant_id,
      min_quantity: req.min_quantity,
      fixed_price_minor: req.fixed_price_minor || null,
      discount_percent_bp: req.discount_percent_bp ?? null,
      created_at: now,
      updated_at: now,
    };

    this.priceListRulesStore.set(rule.id, rule);
    return rule;
  }

  async getPriceListRules(
    tenantId: string,
    pricelistId: string,
  ): Promise<PriceListRule[]> {
    return Array.from(this.priceListRulesStore.values()).filter(
      (r) => r.tenant_id === tenantId && r.pricelist_id === pricelistId,
    );
  }

  // --------------------------------------------------------------------------
  // Tax Rates
  // --------------------------------------------------------------------------

  async createTaxRate(
    tenantId: string,
    req: CreateTaxRateRequest,
  ): Promise<TaxRate> {
    const code = req.code.trim().toUpperCase();

    const existing = Array.from(this.taxRatesStore.values()).find(
      (t) => t.tenant_id === tenantId && t.code === code,
    );
    if (existing) {
      throw new ConflictException(`Tax rate '${code}' already exists.`);
    }

    const now = new Date().toISOString();
    const taxRate: TaxRate = {
      id: `tax_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      rate_bp: req.rate_bp,
      computation_type: req.computation_type ?? 'PERCENTAGE',
      inclusion_type: req.inclusion_type ?? 'EXCLUSIVE',
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.taxRatesStore.set(taxRate.id, taxRate);
    return taxRate;
  }

  async getTaxRates(tenantId: string): Promise<TaxRate[]> {
    return Array.from(this.taxRatesStore.values()).filter(
      (t) => t.tenant_id === tenantId,
    );
  }

  async getTaxRateById(tenantId: string, id: string): Promise<TaxRate> {
    const tax = this.taxRatesStore.get(id);
    if (!tax || tax.tenant_id !== tenantId) {
      throw new NotFoundException(`Tax rate with ID '${id}' not found.`);
    }
    return tax;
  }

  // --------------------------------------------------------------------------
  // Discount Promotions & Coupons
  // --------------------------------------------------------------------------

  async createDiscountPromotion(
    tenantId: string,
    req: CreateDiscountPromotionRequest,
  ): Promise<DiscountPromotion> {
    const code = req.code.trim().toUpperCase();

    const existing = Array.from(this.promotionsStore.values()).find(
      (p) => p.tenant_id === tenantId && p.code === code,
    );
    if (existing) {
      throw new ConflictException(`Promotion coupon '${code}' already exists.`);
    }

    const now = new Date().toISOString();
    const promotion: DiscountPromotion = {
      id: `promo_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      discount_type: req.discount_type,
      value_minor_or_bp: req.value_minor_or_bp,
      max_discount_minor: req.max_discount_minor || null,
      min_subtotal_minor: req.min_subtotal_minor || null,
      valid_from: req.valid_from || null,
      valid_until: req.valid_until || null,
      usage_limit: req.usage_limit ?? null,
      usage_count: 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.promotionsStore.set(promotion.id, promotion);
    return promotion;
  }

  async getPromotionByCode(
    tenantId: string,
    code: string,
  ): Promise<DiscountPromotion | null> {
    const cleanCode = code.trim().toUpperCase();
    return (
      Array.from(this.promotionsStore.values()).find(
        (p) =>
          p.tenant_id === tenantId &&
          p.code === cleanCode &&
          p.is_active,
      ) || null
    );
  }

  // --------------------------------------------------------------------------
  // Cart & Pricing Pipeline Calculation
  // --------------------------------------------------------------------------

  async calculateCart(
    tenantId: string,
    req: CalculateCartRequest,
  ): Promise<CalculateCartResponse> {
    // 1. Resolve pricelist rules if applicable
    let pricelistId = req.pricelist_id;
    if (!pricelistId) {
      const defaultPl = Array.from(this.priceListsStore.values()).find(
        (p) => p.tenant_id === tenantId && p.is_default,
      );
      if (defaultPl) {
        pricelistId = defaultPl.id;
      }
    }

    const domainRules: DomainPriceListRule[] = pricelistId
      ? (await this.getPriceListRules(tenantId, pricelistId)).map((r) => ({
          variant_id: r.variant_id,
          min_quantity: r.min_quantity,
          fixed_price_minor: r.fixed_price_minor,
          discount_percent_bp: r.discount_percent_bp,
        }))
      : [];

    // 2. Resolve promotion coupon if applicable
    let domainPromo: DomainDiscountPromotion | null = null;
    if (req.promo_code) {
      const promo = await this.getPromotionByCode(tenantId, req.promo_code);
      if (promo) {
        domainPromo = {
          code: promo.code,
          discount_type: promo.discount_type,
          value_minor_or_bp: promo.value_minor_or_bp,
          max_discount_minor: promo.max_discount_minor,
          min_subtotal_minor: promo.min_subtotal_minor,
        };
      }
    }

    // 3. Resolve cart items and attached taxes
    const domainItems: DomainCartItemInput[] = [];

    for (const item of req.items) {
      // Ensure variant exists
      await this.variantsService.getVariantById(tenantId, item.variant_id);

      const taxes: DomainTaxRate[] = [];
      if (item.tax_rate_ids && item.tax_rate_ids.length > 0) {
        for (const taxId of item.tax_rate_ids) {
          const t = await this.getTaxRateById(tenantId, taxId);
          taxes.push({
            id: t.id,
            code: t.code,
            name: t.name,
            rate_bp: t.rate_bp,
            computation_type: t.computation_type,
            inclusion_type: t.inclusion_type,
          });
        }
      }

      domainItems.push({
        variant_id: item.variant_id,
        quantity: item.quantity,
        base_unit_price_minor: item.base_unit_price_minor,
        custom_unit_price_minor: item.custom_unit_price_minor,
        line_discount_percent_bp: item.line_discount_percent_bp,
        taxes,
      });
    }

    // 4. Execute domain calculation
    let domainSummary;
    try {
      domainSummary = domainCalculateCart(domainItems, domainRules, domainPromo);
    } catch (err: unknown) {
      if (err instanceof PricingDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const summary: CalculatedCartSummary = {
      items: domainSummary.items as CalculatedLineItem[],
      subtotal_minor: domainSummary.subtotal_minor,
      discount_total_minor: domainSummary.discount_total_minor,
      tax_total_minor: domainSummary.tax_total_minor,
      grand_total_minor: domainSummary.grand_total_minor,
      rounding_adjustment_minor: '0',
      currency_code: req.currency_code,
    };

    return { summary };
  }

  // --------------------------------------------------------------------------
  // Phase 8: Customer Contract Pricing
  // --------------------------------------------------------------------------

  async createCustomerContract(
    tenantId: string,
    req: CreateCustomerContractRequest,
  ): Promise<CustomerContract> {
    const existing = Array.from(this.contractsStore.values()).find(
      (c) => c.tenant_id === tenantId && c.contract_number === req.contract_number,
    );
    if (existing) {
      throw new ConflictException(`Contract '${req.contract_number}' already exists.`);
    }

    const now = new Date().toISOString();
    const contract: CustomerContract = {
      id: `cnt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      contract_number: req.contract_number,
      customer_id: req.customer_id,
      name: req.name.trim(),
      currency_code: req.currency_code || 'USD',
      valid_from: req.valid_from,
      valid_until: req.valid_until ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.contractsStore.set(contract.id, contract);
    this.contractItemsStore.set(contract.id, []);
    return contract;
  }

  async addContractItem(
    tenantId: string,
    contractId: string,
    req: AddContractItemRequest,
  ): Promise<CustomerContractItem> {
    const contract = this.contractsStore.get(contractId);
    if (!contract || contract.tenant_id !== tenantId) {
      throw new NotFoundException(`Contract '${contractId}' not found.`);
    }

    const item: CustomerContractItem = {
      id: `citem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      contract_id: contractId,
      variant_id: req.variant_id,
      min_quantity: req.min_quantity ?? 1,
      fixed_price_minor: req.fixed_price_minor ?? null,
      discount_percent_bp: req.discount_percent_bp ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const items = this.contractItemsStore.get(contractId) || [];
    items.push(item);
    this.contractItemsStore.set(contractId, items);

    return item;
  }

  // --------------------------------------------------------------------------
  // Phase 8: Margin Protection & Price Overrides
  // --------------------------------------------------------------------------

  async createMarginPolicy(
    tenantId: string,
    req: CreateMarginPolicyRequest,
  ): Promise<PricingMarginPolicy> {
    const policy: PricingMarginPolicy = {
      id: `mpol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      name: req.name.trim(),
      min_margin_percent_bp: req.min_margin_percent_bp,
      max_discount_percent_bp: req.max_discount_percent_bp,
      cost_basis_type: req.cost_basis_type || 'INVENTORY_COST',
      requires_approval: req.requires_approval ?? true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.marginPoliciesStore.set(policy.id, policy);
    return policy;
  }

  async requestPriceOverride(
    tenantId: string,
    req: RequestPriceOverrideRequest,
  ): Promise<PricingOverrideRequest> {
    // Idempotency check via operation_id
    const existing = Array.from(this.overrideRequestsStore.values()).find(
      (o) => o.tenant_id === tenantId && o.operation_id === req.operation_id,
    );
    if (existing) {
      return existing;
    }

    const price = BigInt(req.requested_price_minor);
    const cost = BigInt(req.cost_minor);
    const base = BigInt(req.original_price_minor);

    const marginBp = price > cost && price > 0n ? Number(((price - cost) * 10000n) / price) : 0;
    const discountBp = base > price && base > 0n ? Number(((base - price) * 10000n) / base) : 0;

    const overrideReq: PricingOverrideRequest = {
      id: `ovr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      order_id: req.order_id ?? null,
      variant_id: req.variant_id,
      original_price_minor: req.original_price_minor,
      requested_price_minor: req.requested_price_minor,
      cost_minor: req.cost_minor,
      margin_percent_bp: marginBp,
      discount_percent_bp: discountBp,
      reason: req.reason.trim(),
      requested_by: req.requested_by,
      approved_by: null,
      status: 'PENDING',
      operation_id: req.operation_id,
      created_at: new Date().toISOString(),
      decided_at: null,
    };

    this.overrideRequestsStore.set(overrideReq.id, overrideReq);
    return overrideReq;
  }

  async decidePriceOverride(
    tenantId: string,
    req: DecidePriceOverrideRequest,
  ): Promise<PricingOverrideRequest> {
    const overrideReq = this.overrideRequestsStore.get(req.override_id);
    if (!overrideReq || overrideReq.tenant_id !== tenantId) {
      throw new NotFoundException(`Override request '${req.override_id}' not found.`);
    }

    if (overrideReq.requested_by === req.decided_by) {
      throw new BadRequestException('Requestor cannot self-approve their own price override.');
    }

    overrideReq.status = req.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    overrideReq.approved_by = req.decided_by;
    overrideReq.decided_at = new Date().toISOString();

    return overrideReq;
  }

  // --------------------------------------------------------------------------
  // Phase 8: Advanced Precedence Resolution & Explainability Snapshots
  // --------------------------------------------------------------------------

  async resolvePriceAdvanced(
    tenantId: string,
    input: ResolvePriceItemInput,
  ): Promise<ResolvedPriceItemResult> {
    // 1. Gather Contract Rules
    const contractRules: DomainContractRule[] = [];
    if (input.customer_id) {
      const activeContracts = Array.from(this.contractsStore.values()).filter(
        (c) => c.tenant_id === tenantId && c.customer_id === input.customer_id && c.is_active,
      );
      for (const contract of activeContracts) {
        const items = this.contractItemsStore.get(contract.id) || [];
        for (const item of items) {
          contractRules.push({
            id: item.id,
            contract_number: contract.contract_number,
            variant_id: item.variant_id,
            min_quantity: item.min_quantity,
            fixed_price_minor: item.fixed_price_minor,
            discount_percent_bp: item.discount_percent_bp,
          });
        }
      }
    }

    // 2. Gather PriceList Rules by tier
    const customerRules: DomainPriceTierRule[] = [];
    const customerGroupRules: DomainPriceTierRule[] = [];
    const channelRules: DomainPriceTierRule[] = [];
    const defaultRules: DomainPriceTierRule[] = [];

    const allPriceLists = Array.from(this.priceListsStore.values()).filter(
      (p) => p.tenant_id === tenantId && p.is_active,
    );

    for (const pl of allPriceLists) {
      const rules = Array.from(this.priceListRulesStore.values()).filter(
        (r) => r.tenant_id === tenantId && r.pricelist_id === pl.id,
      );
      for (const r of rules) {
        const mappedRule: DomainPriceTierRule = {
          id: r.id,
          pricelist_name: pl.name,
          variant_id: r.variant_id,
          min_quantity: r.min_quantity,
          fixed_price_minor: r.fixed_price_minor,
          discount_percent_bp: r.discount_percent_bp,
        };

        if (input.pricelist_id && pl.id === input.pricelist_id) {
          customerRules.push(mappedRule);
        } else if (pl.customer_group && input.customer_group && pl.customer_group === input.customer_group) {
          customerGroupRules.push(mappedRule);
        } else if (pl.is_default) {
          defaultRules.push(mappedRule);
        } else if (input.channel && (pl.code === input.channel || pl.name === input.channel)) {
          channelRules.push(mappedRule);
        }
      }
    }

    // 3. Resolve unit price using pure domain precedence
    const precResult = resolvePriceWithPrecedence({
      variant_id: input.variant_id,
      quantity: input.quantity,
      base_price_minor: input.base_unit_price_minor,
      contractRules,
      customerRules,
      customerGroupRules,
      channelRules,
      defaultRules,
    });

    const qtyBig = BigInt(input.quantity);
    const resolvedUnitMinor = BigInt(precResult.resolved_unit_price_minor);
    const grossSubtotalMinor = (resolvedUnitMinor * qtyBig).toString();

    // 4. Margin Policy Check
    let marginApproved = true;
    let marginBp = 0;
    if (input.unit_cost_minor) {
      const activePolicy = Array.from(this.marginPoliciesStore.values()).find(
        (p) => p.tenant_id === tenantId && p.is_active,
      );
      if (activePolicy) {
        const marginCheck = assertPriceMeetsMarginPolicy({
          unitPriceMinor: precResult.resolved_unit_price_minor,
          costMinor: input.unit_cost_minor,
          basePriceMinor: input.base_unit_price_minor,
          minMarginPercentBp: activePolicy.min_margin_percent_bp,
          maxDiscountPercentBp: activePolicy.max_discount_percent_bp,
        });
        marginBp = marginCheck.margin_percent_bp;
        if (!marginCheck.meets_policy && activePolicy.requires_approval) {
          // Check for approved override
          const hasApprovedOverride = Array.from(this.overrideRequestsStore.values()).some(
            (o) =>
              o.tenant_id === tenantId &&
              o.variant_id === input.variant_id &&
              o.requested_price_minor === precResult.resolved_unit_price_minor &&
              o.status === 'APPROVED',
          );
          if (!hasApprovedOverride) {
            marginApproved = false;
          }
        }
      }
    }

    // 5. Build and persist immutable CommercialPriceSnapshot
    const snapshotId = `psnap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const snapshot: CommercialPriceSnapshot = {
      id: snapshotId,
      tenant_id: tenantId,
      order_id: null,
      line_item_id: null,
      variant_id: input.variant_id,
      quantity: input.quantity,
      currency_code: input.currency_code || 'USD',
      base_unit_price_minor: input.base_unit_price_minor,
      resolved_unit_price_minor: precResult.resolved_unit_price_minor,
      gross_line_minor: grossSubtotalMinor,
      discount_amount_minor: '0',
      net_line_minor: grossSubtotalMinor,
      matched_rules: precResult.matched_rules,
      applied_promotions: [],
      tax_details: [],
      loyalty_points_earned: 0,
      loyalty_points_redeemed: 0,
      override_id: null,
      evaluation_timestamp: new Date().toISOString(),
    };

    this.snapshotsStore.set(snapshot.id, snapshot);

    return {
      variant_id: input.variant_id,
      quantity: input.quantity,
      base_unit_price_minor: input.base_unit_price_minor,
      resolved_unit_price_minor: precResult.resolved_unit_price_minor,
      gross_subtotal_minor: grossSubtotalMinor,
      promotion_discount_minor: '0',
      tax_amount_minor: '0',
      net_line_total_minor: grossSubtotalMinor,
      margin_percent_bp: marginBp,
      margin_approved: marginApproved,
      snapshot,
    };
  }

  async getSnapshot(tenantId: string, snapshotId: string): Promise<CommercialPriceSnapshot> {
    const s = this.snapshotsStore.get(snapshotId);
    if (!s || s.tenant_id !== tenantId) {
      throw new NotFoundException(`Price snapshot '${snapshotId}' not found.`);
    }
    return s;
  }

  clearStore(): void {
    this.priceListsStore.clear();
    this.priceListRulesStore.clear();
    this.taxRatesStore.clear();
    this.promotionsStore.clear();
    this.contractsStore.clear();
    this.contractItemsStore.clear();
    this.marginPoliciesStore.clear();
    this.overrideRequestsStore.clear();
    this.snapshotsStore.clear();
  }
}

