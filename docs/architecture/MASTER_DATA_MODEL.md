# STOKROVA Master Data Model Semantics

## 1. Data Model Foundations

The STOKROVA data model prioritizes transactional correctness, auditability, offline synchronization, and multi-tenant isolation. All entities adhere to the following universal invariants:

- **Entity IDs**: Client-generable UUIDv7 or ULID (time-ordered, collision-resistant offline).
- **Tenant Scoping**: Mandatory `tenant_id uuid NOT NULL` on every entity.
- **Monetary Storage**: `amount_minor bigint NOT NULL` paired with `currency char(3) NOT NULL`. Floating-point currency is strictly prohibited.
- **Audit Columns**: `created_at timestamptz NOT NULL DEFAULT now()`, `created_by uuid NOT NULL`, `updated_at timestamptz NOT NULL DEFAULT now()`, `updated_by uuid`.

---

## 2. Core Entity Semantics

### Entity 1: `Tenant`
- **Purpose**: Top-level multi-tenant SaaS isolation unit.
- **Ownership**: Platform Super Admin (SaaS layer).
- **Core Fields**: `id`, `name`, `slug`, `status` (ACTIVE, SUSPENDED, ARCHIVED), `settings_jsonb`, `created_at`.
- **Invariants**: Slugs must be globally unique. A suspended tenant blocks all child API access.
- **Deletion Policy**: Soft delete / Archival only. Never physically deleted.

### Entity 2: `Company`
- **Purpose**: Legal commercial entity owning bank accounts, tax numbers, and financial statements.
- **Ownership**: Tenant Business Owner.
- **Core Fields**: `id`, `tenant_id`, `name`, `legal_name`, `tax_identifier`, `base_currency`, `fiscal_year_start`.
- **Invariants**: Every tenant has at least one primary company.
- **Deletion Policy**: Prohibited if active ledger transactions exist.

### Entity 3: `Branch`
- **Purpose**: Physical trading establishment (store, showroom, branch office).
- **Ownership**: Company.
- **Core Fields**: `id`, `tenant_id`, `company_id`, `code`, `name`, `address_jsonb`, `is_active`.
- **Invariants**: Branch code is unique within a tenant.

### Entity 4: `Warehouse` & `StorageLocation`
- **Purpose**: Models physical inventory storage topology down to specific bins.
- **Ownership**: Branch / Company.
- **Core Fields**: `id`, `tenant_id`, `warehouse_id`, `parent_location_id`, `type` (ZONE, AISLE, RACK, SHELF, BIN), `code`, `materialized_path`.
- **Invariants**: Materialized path matches `WH/ZONE/AISLE/RACK/SHELF/BIN`.
- **Offline Behavior**: Replicated locally to mobile and desktop clients for local barcode bin lookup.

### Entity 5: `Product` & `ProductVariant`
- **Purpose**: Represents catalog merchandise and physical sellable SKUs.
- **Ownership**: Catalog Module.
- **Core Fields (Variant)**: `id`, `tenant_id`, `product_id`, `sku`, `name`, `base_uom_id`, `weight_grams`, `dimensions_jsonb`, `is_active`.
- **Invariants**: SKU is globally unique per tenant. Every variant must reference a valid base UOM.
- **Deletion Policy**: Archived (`is_active = false`). Hard deletion prohibited if referenced in movements or sales.

### Entity 6: `Barcode`
- **Purpose**: Maps physical 1D/2D symbologies to sellable variants and packaging units.
- **Ownership**: Catalog Module.
- **Core Fields**: `id`, `tenant_id`, `variant_id`, `barcode_value`, `symbology` (EAN13, UPCA, CODE128, QR), `uom_id`, `is_primary`.
- **Invariants**: Barcode value unique per tenant.
- **Performance**: High-speed B-Tree index on `(tenant_id, barcode_value)` for sub-millisecond checkout scans.

### Entity 7: `InventoryMovement` (Authoritative Stock Truth)
- **Purpose**: Append-only transactional ledger recording every physical stock alteration.
- **Ownership**: Stock Movement Ledger Module.
- **Core Fields**: `id`, `tenant_id`, `variant_id`, `location_id`, `batch_id`, `serial_id`, `movement_type`, `quantity`, `uom_id`, `reference_type`, `reference_id`, `reason_code`, `actor_user_id`, `device_id`, `occurred_at`.
- **Invariants**: Completely immutable upon insert. `UPDATE` and `DELETE` queries are prohibited.
- **Offline Behavior**: Created locally in client SQLite outbox; applied idempotently on server.

### Entity 8: `InventoryBalance` (Derived Projection)
- **Purpose**: Read-optimized cached summary of stock on hand by variant and location.
- **Ownership**: Inventory Module.
- **Core Fields**: `tenant_id`, `variant_id`, `location_id`, `on_hand_qty`, `available_qty`, `reserved_qty`, `allocated_qty`, `quarantined_qty`, `damaged_qty`, `last_movement_id`, `updated_at`.
- **Invariants**: Materialized strictly from $\sum(\text{InventoryMovements})$. Discrepancies resolved by recalculating from the movement ledger.

### Entity 9: `Batch` / `Lot`
- **Purpose**: Groups identical manufactured/imported goods for expiry and traceability.
- **Ownership**: Inventory Module.
- **Core Fields**: `id`, `tenant_id`, `variant_id`, `batch_number`, `manufacture_date`, `expiry_date`, `supplier_id`, `status` (ACTIVE, QUARANTINED, RECALLED, EXPIRED).
- **Invariants**: Mandatory expiry date if product policy requires FEFO tracking.

### Entity 10: `SerialNumber`
- **Purpose**: Tracks discrete individual items with distinct physical identity.
- **Ownership**: Inventory Module.
- **Core Fields**: `id`, `tenant_id`, `variant_id`, `serial_number`, `location_id`, `status` (IN_STOCK, ALLOCATED, SOLD, RETURNED, SCRAPPED), `warranty_expiry`, `condition` (NEW, REFURBISHED, DAMAGED).
- **Invariants**: Unique within `(tenant_id, variant_id)`. Cannot exist in two locations simultaneously.

### Entity 11: `SalesOrder` & `SalesOrderLine`
- **Purpose**: Commercial customer order agreement across POS, wholesale, or mobile.
- **Ownership**: Commerce Module.
- **Core Fields (Order)**: `id`, `tenant_id`, `branch_id`, `customer_id`, `order_number`, `status` (DRAFT, CONFIRMED, FULFILLING, COMPLETED, CANCELLED), `total_minor`, `currency`, `created_at`.
- **Invariants**: Order total matches line item sum + tax - discounts. Completed orders are immutable.

### Entity 12: `RegisterSession` & `CashMovement`
- **Purpose**: Tracks cashier till shifts and physical cash accountability.
- **Ownership**: Registers Module.
- **Core Fields (Session)**: `id`, `tenant_id`, `register_id`, `opened_by`, `closed_by`, `opened_at`, `closed_at`, `opening_float_minor`, `closing_actual_minor`, `closing_expected_minor`, `variance_minor`, `status` (OPEN, CLOSED).
- **Invariants**: A register can have at most one active OPEN session at any time. Closing counts are blind.

### Entity 13: `Payment`
- **Purpose**: Financial asset intake or refund (Financial Truth).
- **Ownership**: Payments Module.
- **Core Fields**: `id`, `tenant_id`, `operation_id` (idempotency key), `invoice_id`, `method` (CASH, CARD, BANK_TRANSFER), `amount_minor`, `currency`, `status` (PENDING, CAPTURED, REFUNDED), `captured_at`.
- **Invariants**: `operation_id` guarantees exactly-once processing. Payment amount cannot exceed outstanding balance.

### Entity 14: `JournalEntry` & `JournalLine`
- **Purpose**: Double-entry general ledger truth.
- **Ownership**: Finance Module.
- **Core Fields (Entry)**: `id`, `tenant_id`, `company_id`, `entry_number`, `entry_date`, `reference_type`, `reference_id`, `is_posted`, `created_at`.
- **Invariants**: $\sum(\text{debit\_minor}) = \sum(\text{credit\_minor})$. Posted entries cannot be edited or deleted; corrections use reversing entries.

### Entity 15: `WorkflowDefinition` & `WorkflowInstance`
- **Purpose**: Graph-based orchestration of operational tasks.
- **Ownership**: Workflow Module.
- **Core Fields**: `id`, `tenant_id`, `graph_definition_jsonb`, `version`, `status` (DRAFT, PUBLISHED, ARCHIVED).
- **Invariants**: Published workflow definitions are immutable. Running instances reference a locked version.

### Entity 16: `Task` & `TaskQueue`
- **Purpose**: Units of operational work routed to physical work centers.
- **Ownership**: Operations Module.
- **Core Fields**: `id`, `tenant_id`, `queue_id`, `work_center_id`, `status` (PENDING, CLAIMED, COMPLETED, CANCELLED), `claimed_by`, `lease_expires_at`.
- **Invariants**: Lease-based concurrency locking prevents concurrent claims on the same task.

### Entity 17: `SyncOperation` & `SyncChange`
- **Purpose**: Idempotent synchronization engine between offline clients and server.
- **Ownership**: Synchronization Module.
- **Core Fields (Operation)**: `id`, `tenant_id`, `device_id`, `operation_id`, `command`, `status` (APPLIED, REJECTED, DUPLICATE), `received_at`.
- **Core Fields (Change)**: `id`, `tenant_id`, `sequence` (monotonic bigint), `entity_name`, `entity_id`, `operation_type` (INSERT, UPDATE, DELETE), `change_payload_jsonb`, `occurred_at`.
- **Invariants**: `operation_id` is unique per tenant. Sequences are strictly monotonically increasing.
