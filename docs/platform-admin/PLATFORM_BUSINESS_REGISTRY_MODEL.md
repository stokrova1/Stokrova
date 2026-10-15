# STOKROVA Platform Business Registry Model

**Target Gate:** `PLATFORM_ADMIN_CONSOLE_LIVE_VERIFIED`  
**Classification:** Core Multi-Tenant Architecture & Data Registry  
**Primary Database Authority:** Shared Supabase PostgreSQL  
**Schema Level:** Public Relational Schema

---

## 1. Architectural Foundation & Single Source of Truth

The STOKROVA Platform Founder Console provides platform administrators with an authoritative, unified view of all registered business client organizations.

### The Golden Rule of Registry Integrity
> **Golden Rule 27:** Never create separate founder databases or duplicate tenant tables.
> The Platform Business Registry queries the genuine, live business records (`public.tenants`, `public.companies`, `public.branches`, `public.memberships`, `public.users`, `public.user_profiles`, `public.audit_events`) directly.

Standard tenant users access their data through isolated `tenant_id` boundaries enforced by Postgres Row-Level Security (RLS). The platform administrator accesses cross-tenant metadata by evaluating platform founder privileges through session-scoped configuration (`SELECT set_config('app.is_platform_admin', 'true', true)`).

---

## 2. Relational Schema & Entity Relationship Model

```
 ┌─────────────────────────────────────────────────────────┐
 │                     public.tenants                      │
 │ ─────────────────────────────────────────────────────── │
 │  id              VARCHAR(64) PRIMARY KEY               │
 │  name            VARCHAR(255) NOT NULL                 │
 │  slug            VARCHAR(100) UNIQUE NOT NULL          │
 │  status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' │
 │  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()    │
 │  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()    │
 └─────────────┬───────────────────────────────┬───────────┘
               │ 1:N                           │ 1:N
               ▼                               ▼
 ┌───────────────────────────┐   ┌───────────────────────────┐
 │     public.companies      │   │    public.memberships     │
 │ ───────────────────────── │   │ ───────────────────────── │
 │  id           VARCHAR(64) │   │  id           VARCHAR(64) │
 │  tenant_id    VARCHAR(64) │   │  tenant_id    VARCHAR(64) │
 │  name         VARCHAR(255)│   │  user_id      VARCHAR(64) │
 │  currency_code VARCHAR(3) │   │  status       VARCHAR(32) │
 │  created_at   TIMESTAMPTZ │   │  created_at   TIMESTAMPTZ │
 └─────────────┬─────────────┘   └─────────────┬─────────────┘
               │ 1:N                           │ N:1
               ▼                               ▼
 ┌───────────────────────────┐   ┌───────────────────────────┐
 │      public.branches      │   │       public.users        │
 │ ───────────────────────── │   │ ───────────────────────── │
 │  id           VARCHAR(64) │   │  id           VARCHAR(64) │
 │  tenant_id    VARCHAR(64) │   │  email        VARCHAR(255)│
 │  company_id   VARCHAR(64) │   │  full_name    VARCHAR(255)│
 │  name         VARCHAR(255)│   │  role         VARCHAR(64) │
 │  code         VARCHAR(32) │   │  is_active    BOOLEAN     │
 └───────────────────────────┘   └───────────────────────────┘
```

---

## 3. Query Aggregation & Performance Strategy

To present the platform founder with an instant operational summary without executing N+1 queries, the registry executes an aggregated query:

```sql
SELECT 
  t.id,
  t.name,
  t.slug,
  t.status,
  t.created_at,
  t.updated_at,
  count(DISTINCT c.id)::int AS companies_count,
  count(DISTINCT b.id)::int AS branches_count,
  coalesce(max(u.full_name), 'Business Owner') AS owner_name,
  coalesce(max(u.email), 'owner@stokrova.com') AS owner_email,
  coalesce(max(c.currency_code), 'USD') AS currency_code
FROM public.tenants t
LEFT JOIN public.companies c ON c.tenant_id = t.id
LEFT JOIN public.branches b ON b.tenant_id = t.id
LEFT JOIN public.memberships m ON m.tenant_id = t.id
LEFT JOIN public.users u ON u.id = m.user_id
WHERE ($1::text IS NULL OR t.status = $1)
  AND (
    $2::text IS NULL OR 
    LOWER(t.name) LIKE $2 OR 
    LOWER(t.slug) LIKE $2 OR 
    LOWER(u.email) LIKE $2
  )
GROUP BY t.id, t.name, t.slug, t.status, t.created_at, t.updated_at
ORDER BY t.created_at DESC
LIMIT $3 OFFSET $4;
```

### Server-Side Pagination & Filtering
1. **Search (`search`):** Case-insensitive substring matching against `t.name`, `t.slug`, and `u.email`.
2. **Status (`status`):** Filters by `ACTIVE`, `SUSPENDED`, `ARCHIVED`, or returns all when `ALL` or empty.
3. **Pagination (`page`, `limit`):** Defaults to `page = 1, limit = 20`. Returns total record count, page count, and item array.

---

## 4. Truthful Empty & Error States

- If the search query returns zero records, the UI renders:
  ```html
  <div class="empty-state">
    <span class="icon">🔍</span>
    <h4>No matching business organizations</h4>
    <p>No business client found matching "query". Check your search spelling or clear filters.</p>
  </div>
  ```
- If database connectivity is degraded, the UI displays an alert banner with retry capability and never fabricates mock organizations.
