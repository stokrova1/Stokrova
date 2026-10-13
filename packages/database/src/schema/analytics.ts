import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const analytics_abc_snapshots = pgTable(
  'analytics_abc_snapshots',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    company_id: text('company_id').notNull(),
    criterion: text('criterion').notNull(), // REVENUE, QUANTITY_VELOCITY, PROFIT_MARGIN
    total_items: integer('total_items').notNull(),
    total_value_minor: text('total_value_minor').notNull(),
    a_items_count: integer('a_items_count').notNull(),
    b_items_count: integer('b_items_count').notNull(),
    c_items_count: integer('c_items_count').notNull(),
    a_items_value_minor: text('a_items_value_minor').notNull(),
    b_items_value_minor: text('b_items_value_minor').notNull(),
    c_items_value_minor: text('c_items_value_minor').notNull(),
    items_json: text('items_json').notNull(), // JSON serialized classified items
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_abc_snapshot_tenant_company').on(table.tenant_id, table.company_id),
    index('idx_abc_snapshot_created_at').on(table.tenant_id, table.created_at),
  ],
);

export const analytics_demand_forecasts = pgTable(
  'analytics_demand_forecasts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    company_id: text('company_id').notNull(),
    variant_id: text('variant_id').notNull(),
    method: text('method').notNull(), // SIMPLE_MOVING_AVERAGE, WEIGHTED_MOVING_AVERAGE, EXPONENTIAL_SMOOTHING
    historical_mean: integer('historical_mean').notNull(),
    projected_demands_json: text('projected_demands_json').notNull(),
    mean_absolute_deviation: integer('mean_absolute_deviation').notNull(),
    tracking_signal: integer('tracking_signal').notNull(),
    stockout_risk_score: integer('stockout_risk_score').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_forecast_tenant_variant').on(table.tenant_id, table.variant_id),
    index('idx_forecast_created_at').on(table.tenant_id, table.created_at),
  ],
);

export const analytics_dead_stock_alerts = pgTable(
  'analytics_dead_stock_alerts',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    company_id: text('company_id').notNull(),
    warehouse_id: text('warehouse_id').notNull(),
    variant_id: text('variant_id').notNull(),
    sku: text('sku').notNull(),
    days_inactive: integer('days_inactive').notNull(),
    on_hand_quantity: integer('on_hand_quantity').notNull(),
    tied_up_capital_minor: text('tied_up_capital_minor').notNull(),
    holding_cost_minor: text('holding_cost_minor').notNull(),
    aging_tier: text('aging_tier').notNull(), // ACTIVE, SLOW_MOVING, STAGNANT, DEAD_STOCK
    recommended_action: text('recommended_action').notNull(), // NONE, PROMOTIONAL_MARKDOWN, BUNDLE_LIQUIDATION, WRITE_OFF_SCRAP
    is_resolved: boolean('is_resolved').notNull().default(false),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dead_stock_tenant_wh').on(table.tenant_id, table.warehouse_id),
    index('idx_dead_stock_aging').on(table.tenant_id, table.aging_tier),
  ],
);
