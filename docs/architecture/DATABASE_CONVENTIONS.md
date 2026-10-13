# STOKROVA — Database Conventions & Persistence Guidelines

## 1. Principles

1. **PostgreSQL as Source of Truth**: PostgreSQL is the single authoritative system of record for all server-side persistent business state.
2. **Drizzle ORM Ownership**: All table schemas, foreign key relations, unique indices, check constraints, and migrations are managed deterministically in `packages/database`.
3. **Primary Keys**: All primary keys are `varchar(36)` containing time-ordered UUIDv7 identifiers generated in accordance with RFC 9562 via `generateUuidV7()` in `packages/domain`.
4. **Tenant Ownership**: Every tenant-owned table explicitly defines a foreign key `tenant_id` referencing `tenants(id)` with `onDelete: 'cascade'` or appropriate scoping, paired with compound indices `(tenant_id, ...)` for fast, isolated queries.
5. **Timestamps**: All tables include ISO-8601 UTC `created_at` and `updated_at` timestamps (`timestamp({ withTimezone: true })`). Soft-deletable records include `deleted_at`.
6. **Financial & Inventory Precision**: Financial amounts are recorded as integer minor units (`bigint` or `integer` representing cents/minor units). Fractional quantities utilize fixed-precision decimals (`decimal({ precision: 14, scale: 4 })`). Floating-point types are strictly forbidden.

---

## 2. Table Catalog (33 Core Tables)

The baseline migration `0000_superb_risque.sql` defines 33 production tables:
- **Tenancy & Organization**: `tenants`, `companies`, `branches`, `departments`, `tenant_subscriptions`
- **Identity & Access Management**: `users`, `user_profiles`, `tenant_memberships`, `roles`, `permissions`, `role_permissions`, `user_roles`
- **Work Centers & Registers**: `registers`, `register_sessions`, `devices`
- **Warehousing & Storage**: `warehouses`, `storage_locations`
- **Catalog & Pricing**: `categories`, `brands`, `products`, `product_variants`, `price_lists`, `price_list_items`
- **Workflows & Rules**: `workflow_definitions`, `workflow_instances`, `workflow_history`, `rule_definitions`, `rule_execution_logs`
- **Payments & Processing**: `payment_transactions`, `payment_attempts`
- **Platform Infrastructure**: `audit_events`, `idempotency_records`, `outbox_events`

---

## 3. Migration Workflow

Migrations are generated deterministically using Drizzle Kit:
```bash
pnpm --filter @stokrova/database run generate
```
All schema modifications must be committed alongside their corresponding migration SQL files under `packages/database/drizzle/`. Ad-hoc DDL in production is forbidden.

---

## 4. Seed Strategy

Deterministic development and integration test seed data is provided via `packages/database/src/seed.ts`, establishing default permissions, system roles (`owner`, `admin`, `cashier`, `warehouse_manager`), and test tenants.
