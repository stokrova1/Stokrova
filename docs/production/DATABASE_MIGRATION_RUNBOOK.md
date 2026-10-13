# STOKROVA — Database Migration & Schema Release Runbook

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `PRODUCTION_READY`  
**Classification:** Database Reliability Engineering (DBRE Standard SOP-002)  
**Date:** October 13, 2026  

---

## 1. Scope & Architectural Philosophy

STOKROVA manages mission-critical physical inventory and immutable financial general ledger data. Database migrations must guarantee:
- **Zero Data Loss**: Financial and inventory history is never discarded.
- **Zero Downtime**: Rolling updates must operate safely while both $N$ and $N+1$ application versions run concurrently.
- **Preserved Tenant Isolation**: PostgreSQL Row-Level Security (RLS) policies must remain active and enforced across all schema evolutions.

---

## 2. Migration Journal & Historical Sequence

All schema migrations are version-controlled, tracked, and ordered in `packages/database/drizzle/meta/_journal.json`:

| Index | Migration Tag | Domain / Focus | RLS / Safety Impact |
| :---: | :--- | :--- | :--- |
| `0000` | `0000_superb_risque` | Initial core tables, multi-tenancy, users | Root tenant tables created |
| `0001` | `0001_icy_crystal` | Products, variants, categories | Catalog domain foundation |
| `0002` | `0002_tidy_exodus` | Warehouses, locations, stock ledger | Immutable inventory movement model |
| `0003` | `0003_needy_the_spike` | Orders, order lines, quotations | Sales and quotation engine |
| `0004` | `0004_glamorous_black_widow`| Invoices, payments, allocations | Financial receivables |
| `0005` | `0005_crazy_meltdown` | Suppliers, POs, goods receipts | Procurement & inbound receiving |
| `0006` | `0006_silent_nicolaos` | CRM contacts, leads, activities | Customer relationship management |
| `0007` | `0007_parallel_radioactive_man`| Logistics, shipments, delivery runs | Dispatch and delivery fleet |
| `0008` | `0008_normal_swarm` | Double-entry general ledger, chart of accounts | Strict financial double-entry |
| `0009` | `0009_brave_crm` | Advanced CRM pipeline & loyalty | Customer rewards & pipelines |
| `0010` | `0010_calm_logistics` | Carrier integrations, proof-of-delivery | Logistics tracking & carriers |
| `0011` | `0011_reporting_analytics`| Saved reports, dashboards, exports | Analytical data structures |
| `0012` | `0012_integration_hub` | Webhooks, API keys, connections | Integration endpoints & sync |
| `0013` | `0013_security_hardening_rls` | **Full PostgreSQL Row-Level Security (RLS)** | **Mandatory security boundary** |

---

## 3. The Expand-and-Contract Migration Discipline

Every schema change affecting live tables must be broken into backward-compatible phases:

```text
Phase 1: EXPAND
  - Add new column as NULLABLE (or with default value).
  - Add new table or index CONCURRENTLY.
  - Previous application version (N) continues functioning normally.

Phase 2: APPLICATION ROLLOUT
  - Deploy new application version (N+1).
  - Application writes to new column/structure while reading with fallback.

Phase 3: DATA BACKFILL
  - Execute background idempotent script to backfill historical rows.
  - Verify backfill completion and data parity.

Phase 4: CONTRACT (Subsequent Release)
  - Alter column to NOT NULL if required.
  - Drop obsolete old column or temporary trigger after version N is retired.
```

---

## 4. Connection Privileges & Pooler Separation

STOKROVA uses two separate database connection strings for distinct operational concerns:

1. **`DIRECT_URL` (Port 5432 - Direct Postgres Connection)**:
   - Used **exclusively** for DDL schema migrations, index creation, and administrative scripts.
   - Bypasses PgBouncer pooler to support full DDL transactions, advisory locks, and non-pooled session commands.
2. **`DATABASE_POOLER_TRANSACTION_URL` (Port 6543 - PgBouncer Transaction Pool)**:
   - Used by the API server and runtime workers.
   - High-throughput multiplexing for parameterized DML transactions.
   - Enforces `set_config('app.current_tenant_id', ..., true)` within each transaction.

---

## 5. Migration Execution Runbook

### Pre-Migration Checklist
- [ ] Direct database backup snapshot taken and verified.
- [ ] No long-running database transactions or bulk sync jobs active.
- [ ] Verified that migration file has valid syntax and is recorded in `_journal.json`.

### Execution Steps
```bash
# 1. Connect using direct connection string (DIRECT_URL)
export DATABASE_URL="$DIRECT_URL"

# 2. Apply pending migrations using Drizzle
pnpm --filter @stokrova/database run db:migrate

# 3. Verify migration status and verify RLS remains active
pnpm exec tsx -e "
import { createDatabaseClient } from '@stokrova/database';
const { pool } = createDatabaseClient(process.env.DATABASE_URL);
async function check() {
  const res = await pool.query(\"SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;\");
  console.log('Unprotected public tables count:', res.rows.length);
  await pool.end();
}
check();
"
```

### Post-Migration Verification Queries
Execute against PostgreSQL:
```sql
-- 1. Verify RLS is enabled and forced on critical tenant tables
SELECT tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tenants', 'orders', 'stock_ledger', 'journal_entries');

-- 2. Verify all RLS policies are active and RESTRICTIVE
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 3. Verify that app.current_tenant_id scoping works
BEGIN;
SELECT set_config('app.current_tenant_id', 'test_tenant', true);
SELECT COUNT(*) FROM orders; -- Should only return test_tenant rows
COMMIT;
```

---

## 6. Migration Failure Recovery Protocol

If a migration fails midway:
1. **Transaction Abort**: Drizzle wraps transactional DDL in `BEGIN ... COMMIT`. If an error occurs, PostgreSQL automatically rolls back the transaction.
2. **Lock Saturation**: If a migration hangs waiting on table locks, terminate the migrating process:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'active' AND query LIKE '%ALTER TABLE%';
   ```
3. **Recovery Determination**:
   - Backward-compatible Expand migration failed: Safe to restart previous application version immediately.
   - Partial schema drift: Restore from the pre-migration snapshot taken immediately prior to the deployment window.
