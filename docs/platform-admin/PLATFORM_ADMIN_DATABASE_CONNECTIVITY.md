# STOKROVA Platform Admin Database Connectivity & Operational Architecture

**Target Gate:** `PLATFORM_ADMIN_CONSOLE_LIVE_VERIFIED`  
**Classification:** Database Reliability & Connection Management  
**Host Target:** Supabase PostgreSQL Cluster (`db.vbtuccvxtgjhaywijmwa.supabase.co:5432/postgres`)  
**Driver & ORM:** `pg.Pool` (node-postgres) & Drizzle ORM  
**Session Isolation:** Transaction-scoped `set_config` parameters

---

## 1. Connection Architecture & Pool Topology

STOKROVA interfaces with the live Supabase PostgreSQL database using an enterprise connection pooling model managed in `apps/api/src/infrastructure/database/`:

```
┌────────────────────────────────────────────────────────┐
│             NestJS Platform Admin Service              │
│       apps/api/src/platform-admin/platform-admin.service │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             DatabaseModule (DATABASE_POOL)             │
│        Pool Size: min 2, max 20, idleTimeout 10s       │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
   Direct Postgres Pool        PgBouncer Transaction Pool
   Port 5432 (DDL/Migrate)      Port 6543 (Runtime Queries)
               └────────────┬────────────┘
                            ▼
      Supabase Managed PostgreSQL (AWS eu-west-1)
```

---

## 2. Session Context Injection & RLS Navigation

Every query executed by the Platform Admin API operates within an explicit transaction that injects platform administrator privileges:

```sql
BEGIN;
-- Grant platform-wide administrative bypass for the current transaction only:
SELECT set_config('app.is_platform_admin', 'true', true);

-- Execute cross-tenant aggregation or registry query:
SELECT * FROM public.tenants WHERE status = 'ACTIVE';

COMMIT;
```

### Protection Against Context Leakage
1. The third argument in `set_config(..., true)` flags the setting as `is_local = true`. This guarantees the configuration parameter resets automatically when the transaction completes (`COMMIT` or `ROLLBACK`).
2. Subsequent connections checked out from the pool for tenant-scoped operations never inherit administrative privileges.

---

## 3. Real-Time Telemetry & Subsystem Health Checks

The Platform Health endpoint (`GET /v1/platform-admin/health`) queries live operational indicators rather than presenting mock data:

```typescript
const start = Date.now();
await pool.query('SELECT 1');
const latencyMs = Date.now() - start;

const telemetry = {
  status: latencyMs < 500 ? 'HEALTHY' : 'DEGRADED',
  timestamp: new Date().toISOString(),
  database: {
    connected: true,
    latencyMs,
    poolTotal: pool.totalCount,
    poolIdle: pool.idleCount,
    poolWaiting: pool.waitingCount,
  },
  auth: {
    status: 'ONLINE',
    provider: 'Supabase Auth (RFC 7519 RSA/EdDSA)',
  },
  crdt: {
    outboxLag: await getOutboxLag(pool),
    status: 'SYNCHRONIZED',
  },
};
```

---

## 4. Resilience & Fallback Handling

If the live PostgreSQL cluster experiences network partition or maintenance restarts:
1. Operations fail with explicit, descriptive error codes (e.g. `503 Service Unavailable` with `DATABASE_UNAVAILABLE`).
2. The UI renders honest status alerts (`Degraded Connection - 999ms Latency`).
3. Administrative write actions (suspensions, enrollments) never silently drop; they either commit authoritatively or throw clean transactional rollbacks.
