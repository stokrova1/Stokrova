# Database Blueprint

## 1. PostgreSQL (Supabase)

Use PostgreSQL 18.x running via Supabase.
Use Drizzle ORM for schema definitions and migrations.

Prefer explicit constraints, foreign keys, unique constraints, check constraints, indexes and transactional semantics over application-only validation.

## 2. Naming Conventions

- snake_case in PostgreSQL
- plural table names consistently
- primary keys: `id` (UUIDv7 or ULID strings generated client/server)
- tenant-owned records: `tenant_id`
- foreign keys: `<entity>_id`
- timestamps: `created_at`, `updated_at` (timestamptz in UTC)
- soft deletion only where business semantics require it

## 3. Common Operational Columns

```text
id
tenant_id
created_at
updated_at
created_by
updated_by
```

---

## 4. Identity, Tenancy & Scoped RBAC Tables

```text
tenants
companies
branches
users
memberships
roles (template & custom)
permissions
role_permissions
role_assignments
```

### memberships
```text
id
tenant_id
user_id
status (INVITED, ACTIVE, SUSPENDED)
created_at
```

### roles
```text
id
tenant_id nullable (null for global templates, populated for custom roles)
name
code
description
is_system_template boolean
created_at
```

### role_assignments
```text
id
tenant_id
user_id
role_id
company_id nullable
branch_id nullable
warehouse_id nullable
register_id nullable
work_center_id nullable
created_at
```

---

## 5. Work Centers, Registers & Till Sessions

```text
work_centers
registers
register_sessions
cash_movements
```

### work_centers
```text
id
tenant_id
branch_id
name (e.g. Sales Desk, Picking Station, Verification, Cashier Desk)
type (SALES, PICKING, VERIFICATION, PACKING, PAYMENT, DISPATCH)
created_at
```

### registers
```text
id
tenant_id
branch_id
work_center_id nullable
name (e.g. POS 01, Till 02)
code
status (ACTIVE, INACTIVE)
created_at
```

### register_sessions
```text
id
tenant_id
register_id
opened_by_user_id
closed_by_user_id nullable
opening_float_minor bigint
closing_expected_minor bigint nullable
closing_actual_minor bigint nullable
variance_minor bigint nullable (actual - expected)
status (OPEN, CLOSED, RECONCILED)
opened_at timestamptz
closed_at timestamptz nullable
notes text
```

### cash_movements
```text
id
tenant_id
register_session_id
movement_type (OPENING_FLOAT, CASH_SALE, CASH_REFUND, CASH_IN, CASH_OUT)
amount_minor bigint
currency_code
source_type
source_id
reason text
created_by_user_id
occurred_at
```

---

## 6. Graph-Based Workflow Engine Tables

```text
workflows
workflow_versions
workflow_steps
workflow_transitions
workflow_tasks
workflow_task_claims
business_rules
approval_requests
```

### workflows
```text
id
tenant_id
name
description
category (RETAIL_SALE, WHOLESALE_FULFILLMENT, RETURN, PURCHASE_RECEIVE, TRANSFER)
is_active boolean
created_at
```

### workflow_versions
```text
id
tenant_id
workflow_id
version_number integer
definition_graph jsonb (nodes, edges, execution rules)
status (DRAFT, PUBLISHED, ARCHIVED)
published_at timestamptz nullable
```

### workflow_tasks
```text
id
tenant_id
workflow_version_id
step_key text
entity_type text (e.g. SALE_ORDER, RETURN_REQUEST)
entity_id text
status (PENDING, CLAIMED, IN_PROGRESS, COMPLETED, FAILED, SKIPPED)
assigned_role_id nullable
assigned_user_id nullable
assigned_work_center_id nullable
priority (LOW, NORMAL, HIGH, URGENT)
payload jsonb
created_at
completed_at
```

### workflow_task_claims
```text
id
tenant_id
task_id
claimed_by_user_id
claimed_at
expires_at
status (ACTIVE, RELEASED, COMPLETED)
```

### business_rules
```text
id
tenant_id
name
event_trigger text
condition_expression jsonb
action_type text (REQUIRE_APPROVAL, ROUTE_WORKFLOW, BLOCK_ACTION, FLAG_REVIEW)
action_parameters jsonb
is_active boolean
```

### approval_requests
```text
id
tenant_id
entity_type text
entity_id text
requested_by_user_id
approver_role_id nullable
approver_user_id nullable
status (PENDING, APPROVED, REJECTED)
decision_reason text
occurred_at
decided_at
```

---

## 7. Payments & Receipt Prints

```text
payments
payment_allocations
receipt_prints
```

### payments
```text
id
tenant_id
order_id nullable
invoice_id nullable
register_session_id nullable
amount_minor bigint
currency_code
payment_method (CASH, BANK_TRANSFER, CARD, STORE_CREDIT)
status (PENDING, CONFIRMED, CAPTURED, FAILED, REFUNDED)
provider_reference text
captured_by_user_id
occurred_at
operation_id nullable (idempotency key)
```

### receipt_prints
```text
id
tenant_id
order_id
payment_id nullable
receipt_number text
printed_by_user_id
register_id
print_count integer default 1
is_reprint boolean default false
occurred_at
```

---

## 8. Catalog Tables

```text
products
product_variants
product_categories
brands
units
unit_conversions
barcodes
price_lists
price_list_items
tax_profiles
product_tax_profiles
product_media
```

---

## 9. Warehouses & Inventory Ledger Tables

```text
warehouses
storage_locations (zones, bins)
inventory_balances (derived materialized cache)
inventory_movements (immutable append-only ledger)
inventory_reservations
stock_counts
stock_count_lines
stock_adjustments
stock_transfers
stock_transfer_lines
batches
serial_numbers
```

---

## 10. Synchronization & Offline Tables

```text
sync_devices
sync_operations (idempotent server inbox)
sync_changes (ordered monotonic change feed)
sync_cursors
sync_conflicts
```

---

## 11. Audit & Security Tables

```text
audit_events
security_events
```

---

## 12. Object Storage Metadata

```text
files (Cloudflare R2 / S3-compatible metadata)
```
