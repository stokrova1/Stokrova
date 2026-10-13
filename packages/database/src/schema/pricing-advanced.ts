import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { customers } from './customers.js';
import { product_variants } from './catalog.js';

// ----------------------------------------------------------------------------
// 1. Customer Contracts & Contract Pricing
// ----------------------------------------------------------------------------

export const customer_contracts = pgTable(
  'customer_contracts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    contract_number: text('contract_number').notNull(),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    currency_code: text('currency_code').notNull().default('USD'),
    valid_from: timestamp('valid_from', { withTimezone: true }).notNull(),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_cust_contracts_tenant_num').on(
      table.tenant_id,
      table.contract_number,
    ),
    index('idx_cust_contracts_cust').on(table.tenant_id, table.customer_id),
  ],
);

export const customer_contract_items = pgTable(
  'customer_contract_items',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    contract_id: text('contract_id')
      .notNull()
      .references(() => customer_contracts.id, { onDelete: 'cascade' }),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'restrict' }),
    min_quantity: integer('min_quantity').notNull().default(1),
    fixed_price_minor: text('fixed_price_minor'),
    discount_percent_bp: integer('discount_percent_bp'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_cust_contract_items_unique').on(
      table.tenant_id,
      table.contract_id,
      table.variant_id,
      table.min_quantity,
    ),
    index('idx_cust_contract_items_variant').on(
      table.tenant_id,
      table.variant_id,
    ),
  ],
);

// ----------------------------------------------------------------------------
// 2. Promotional Campaigns & Redemptions
// ----------------------------------------------------------------------------

export const promotion_campaigns = pgTable(
  'promotion_campaigns',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    campaign_code: text('campaign_code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    promotion_type: text('promotion_type').notNull(), // PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, BUNDLE_PRICE
    stacking_rule: text('stacking_rule').notNull().default('BEST_DEAL'), // EXCLUSIVE, STACKABLE, BEST_DEAL
    value_minor_or_bp: text('value_minor_or_bp').notNull().default('0'),
    buy_quantity: integer('buy_quantity'),
    get_quantity: integer('get_quantity'),
    get_discount_percent_bp: integer('get_discount_percent_bp'),
    bundle_variant_ids: text('bundle_variant_ids'), // JSON array of variant IDs
    bundle_fixed_price_minor: text('bundle_fixed_price_minor'),
    min_subtotal_minor: text('min_subtotal_minor'),
    max_discount_minor: text('max_discount_minor'),
    eligible_variant_ids: text('eligible_variant_ids'), // JSON array of variant IDs
    eligible_customer_group: text('eligible_customer_group'),
    eligible_channel: text('eligible_channel'),
    valid_from: timestamp('valid_from', { withTimezone: true }),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    budget_limit_minor: text('budget_limit_minor'),
    budget_consumed_minor: text('budget_consumed_minor').notNull().default('0'),
    usage_limit_total: integer('usage_limit_total'),
    usage_count_total: integer('usage_count_total').notNull().default(0),
    usage_limit_per_customer: integer('usage_limit_per_customer'),
    coupon_code: text('coupon_code'),
    requires_coupon: boolean('requires_coupon').notNull().default(false),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_promo_campaigns_tenant_code').on(
      table.tenant_id,
      table.campaign_code,
    ),
    index('idx_promo_campaigns_coupon').on(
      table.tenant_id,
      table.coupon_code,
    ),
    index('idx_promo_campaigns_active').on(
      table.tenant_id,
      table.is_active,
    ),
  ],
);

export const promotion_redemptions = pgTable(
  'promotion_redemptions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    campaign_id: text('campaign_id')
      .notNull()
      .references(() => promotion_campaigns.id, { onDelete: 'restrict' }),
    coupon_code: text('coupon_code'),
    order_id: text('order_id').notNull(),
    customer_id: text('customer_id'),
    discount_amount_minor: text('discount_amount_minor').notNull(),
    operation_id: text('operation_id').notNull(),
    redeemed_at: timestamp('redeemed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_promo_redemptions_op').on(
      table.tenant_id,
      table.operation_id,
    ),
    index('idx_promo_redemptions_campaign').on(
      table.tenant_id,
      table.campaign_id,
    ),
    index('idx_promo_redemptions_order').on(
      table.tenant_id,
      table.order_id,
    ),
  ],
);

// ----------------------------------------------------------------------------
// 3. Margin Protection Policies & Pricing Overrides
// ----------------------------------------------------------------------------

export const pricing_margin_policies = pgTable(
  'pricing_margin_policies',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    min_margin_percent_bp: integer('min_margin_percent_bp').notNull().default(1500), // 15%
    max_discount_percent_bp: integer('max_discount_percent_bp').notNull().default(3000), // 30%
    cost_basis_type: text('cost_basis_type').notNull().default('INVENTORY_COST'),
    requires_approval: boolean('requires_approval').notNull().default(true),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_margin_policies_tenant').on(table.tenant_id),
  ],
);

export const pricing_override_requests = pgTable(
  'pricing_override_requests',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    order_id: text('order_id'),
    variant_id: text('variant_id')
      .notNull()
      .references(() => product_variants.id, { onDelete: 'restrict' }),
    original_price_minor: text('original_price_minor').notNull(),
    requested_price_minor: text('requested_price_minor').notNull(),
    cost_minor: text('cost_minor').notNull(),
    margin_percent_bp: integer('margin_percent_bp').notNull(),
    discount_percent_bp: integer('discount_percent_bp').notNull(),
    reason: text('reason').notNull(),
    requested_by: text('requested_by').notNull(),
    approved_by: text('approved_by'),
    status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
    operation_id: text('operation_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    decided_at: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_pricing_override_op').on(
      table.tenant_id,
      table.operation_id,
    ),
    index('idx_pricing_override_status').on(
      table.tenant_id,
      table.status,
    ),
  ],
);

// ----------------------------------------------------------------------------
// 4. Commercial Price Snapshots
// ----------------------------------------------------------------------------

export const commercial_price_snapshots = pgTable(
  'commercial_price_snapshots',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    order_id: text('order_id'),
    line_item_id: text('line_item_id'),
    variant_id: text('variant_id').notNull(),
    quantity: integer('quantity').notNull(),
    currency_code: text('currency_code').notNull().default('USD'),
    base_unit_price_minor: text('base_unit_price_minor').notNull(),
    resolved_unit_price_minor: text('resolved_unit_price_minor').notNull(),
    gross_line_minor: text('gross_line_minor').notNull(),
    discount_amount_minor: text('discount_amount_minor').notNull().default('0'),
    net_line_minor: text('net_line_minor').notNull(),
    matched_rules_json: text('matched_rules_json').notNull(),
    applied_promotions_json: text('applied_promotions_json').notNull(),
    tax_details_json: text('tax_details_json').notNull(),
    loyalty_points_earned: integer('loyalty_points_earned').notNull().default(0),
    loyalty_points_redeemed: integer('loyalty_points_redeemed').notNull().default(0),
    override_id: text('override_id'),
    evaluation_timestamp: timestamp('evaluation_timestamp', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_price_snapshots_order').on(table.tenant_id, table.order_id),
    index('idx_price_snapshots_variant').on(table.tenant_id, table.variant_id),
  ],
);

export {
  customer_contracts as customerContracts,
  customer_contract_items as customerContractItems,
  promotion_campaigns as promotionCampaigns,
  promotion_redemptions as promotionRedemptions,
  pricing_margin_policies as pricingMarginPolicies,
  pricing_override_requests as pricingOverrideRequests,
  commercial_price_snapshots as commercialPriceSnapshots,
};
