/**
 * SQLite Schema & DDL Definitions for Native Offline-First Sync Store (ADR-004, ADR-009)
 * Used in desktop (Tauri/SQLite) and mobile (Expo SQLite/OP-SQLite).
 */

export const SQLITE_PRAGMAS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA foreign_keys = ON;',
  'PRAGMA synchronous = NORMAL;',
] as const;

export const SQLITE_INIT_SCRIPTS: readonly string[] = [
  // 1. Client Outbox Queue
  `CREATE TABLE IF NOT EXISTS local_outbox (
    id TEXT PRIMARY KEY,
    operation_id TEXT UNIQUE NOT NULL,
    tenant_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    client_sequence INTEGER NOT NULL,
    command_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    last_error_code TEXT,
    last_error_message TEXT,
    created_at TEXT NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_outbox_status_seq ON local_outbox (status, client_sequence);`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_op_id ON local_outbox (operation_id);`,

  // 2. Sync Cursor & Feed State
  `CREATE TABLE IF NOT EXISTS sync_cursor (
    tenant_id TEXT PRIMARY KEY,
    last_server_sequence INTEGER NOT NULL DEFAULT 0,
    last_pulled_at TEXT,
    updated_at TEXT NOT NULL
  );`,

  // 3. Local Catalog Cache
  `CREATE TABLE IF NOT EXISTS local_catalog (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    barcode TEXT,
    base_price_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    tax_category TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    vector_clock TEXT,
    updated_at TEXT NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_catalog_sku ON local_catalog (tenant_id, sku);`,
  `CREATE INDEX IF NOT EXISTS idx_catalog_barcode ON local_catalog (tenant_id, barcode);`,

  // 4. Local Customers Cache
  `CREATE TABLE IF NOT EXISTS local_customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_customer_phone ON local_customers (tenant_id, phone);`,

  // 5. Local Orders (Offline Transactions)
  `CREATE TABLE IF NOT EXISTS local_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    device_id TEXT NOT NULL,
    cashier_user_id TEXT NOT NULL,
    customer_id TEXT,
    status TEXT NOT NULL,
    total_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced_at TEXT
  );`,

  `CREATE INDEX IF NOT EXISTS idx_orders_device ON local_orders (device_id, created_at);`,

  // 6. Local Order Lines
  `CREATE TABLE IF NOT EXISTS local_order_lines (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_minor INTEGER NOT NULL,
    total_minor INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES local_orders(id) ON DELETE CASCADE
  );`,

  // 7. Local Payments (Immutable Ledger)
  `CREATE TABLE IF NOT EXISTS local_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (order_id) REFERENCES local_orders(id) ON DELETE CASCADE
  );`,

  // 8. Local Inventory Ledger Entries
  `CREATE TABLE IF NOT EXISTS local_inventory_ledger (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    occurred_at TEXT NOT NULL
  );`,

  // 9. Conflict Audit & Exception Workflow Store (Rule 10)
  `CREATE TABLE IF NOT EXISTS sync_conflict_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    client_version INTEGER NOT NULL,
    server_version INTEGER NOT NULL,
    client_payload TEXT NOT NULL,
    server_payload TEXT NOT NULL,
    resolution_strategy TEXT NOT NULL,
    resolved_payload TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL
  );`,
];
