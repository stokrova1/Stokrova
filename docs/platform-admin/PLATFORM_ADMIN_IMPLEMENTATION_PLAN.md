# STOKROVA Platform Founder Console — Master Implementation Plan

**Target Gate:** `PLATFORM_ADMIN_CONSOLE_LIVE_VERIFIED`  
**Security Level:** Sovereign / Root Administrative Boundary (Tier 1)  
**Database Authority:** Authoritative Shared Supabase PostgreSQL (`public.tenants`, `public.companies`, `public.branches`, `public.memberships`, `public.users`, `public.user_profiles`, `public.audit_events`)  
**Backend:** NestJS API Core (`apps/api/src/platform-admin/`), Drizzle ORM / pg pool connection  
**Frontend Client:** STOKROVA Admin Web (`apps/admin-web/src/platform-founder-view.ts`)

---

## 1. Executive Summary & Architectural Scope

The STOKROVA platform architecture enforces a strict distinction between **Tenant-Level Multi-Entity Administration** (Tier 2/3) and **Platform Founder / Super-Admin Operations** (Tier 1):

1. **Platform Founder / Super-Admin (Tier 1):**
   - Owns and oversees the entire sovereign multi-tenant STOKROVA infrastructure.
   - Enrolls, discovers, inspects, suspends, and reactivates subscriber business organizations (`tenants`).
   - Investigates platform-wide user identities, identities linked via Supabase Auth, role assignments, and account statuses.
   - Monitors authentic infrastructure health (PostgreSQL connection pool status, Supabase Auth service reachability, pending database migrations, transaction throughput).
   - Audits administrative actions with cryptographic durability (`audit_events`).
   - Operates with `is_platform_admin: true` in Supabase Auth JWT claims and explicit platform capabilities.

2. **Tenant Business Owners & Staff (Tier 2 / 3):**
   - Operate strictly within their isolated `tenant_id` scope enforced by Row-Level Security (RLS) policies and NestJS `TenantGuard`.
   - Never have visibility or administrative jurisdiction across other business tenants.
   - Cannot view platform health, cannot suspend peer businesses, and cannot alter platform-wide SaaS tiers.

### Architectural Golden Rule: Single Source of Truth
**No duplicate tenant tables or mock registries shall exist.** Platform administration queries the genuine production tables (`public.tenants`, `public.companies`, `public.branches`, `public.memberships`, `public.users`, `public.user_profiles`, `public.audit_events`) directly using transactional session variables (`set_config('app.is_platform_admin', 'true', true)`).

---

## 2. Authentication, Authorization & Security Architecture

### 2.1 Identity and Claims Model
Platform administration access requires two non-negotiable verification gates:
1. **Authenticated Identity:** Valid Supabase Auth JWT token verified by `AuthGuard`.
2. **Platform Administrator Claim & Capability Verification:**
   - Token payload must contain `is_platform_admin: true` (or `app_metadata.is_platform_admin: true`).
   - Request must satisfy required platform capability (e.g., `platform.businesses.view`, `platform.businesses.suspend`).
   - Enforced server-side by `PlatformAdminGuard` and `@RequirePlatformCapability(...)`.
   - Any access attempt by a standard Business Owner or staff member returns an explicit `403 Forbidden` (`FORBIDDEN_PLATFORM_ADMIN_REQUIRED`).

### 2.2 Capability Matrix
| Capability Code | Description | Authorized Endpoints |
| :--- | :--- | :--- |
| `platform.overview.view` | View platform-level KPIs, MRR, business counts | `GET /v1/platform-admin/overview` |
| `platform.businesses.view` | List, search, filter, and inspect business tenants | `GET /v1/platform-admin/businesses`, `GET /v1/platform-admin/businesses/:id` |
| `platform.businesses.suspend` | Temporarily suspend a business organization | `POST /v1/platform-admin/businesses/:id/suspend` |
| `platform.businesses.reactivate` | Reactivate a suspended business organization | `POST /v1/platform-admin/businesses/:id/reactivate` |
| `platform.businesses.tier` | Update SaaS subscription plan | `PATCH /v1/platform-admin/businesses/:id/tier` |
| `platform.users.view` | Inspect platform users, email addresses, roles | `GET /v1/platform-admin/users`, `GET /v1/platform-admin/users/:id` |
| `platform.users.suspend` | Suspend platform user account | `POST /v1/platform-admin/users/:id/suspend` |
| `platform.users.reactivate` | Reactivate platform user account | `POST /v1/platform-admin/users/:id/reactivate` |
| `platform.health.view` | View live database connection pool, auth, migrations | `GET /v1/platform-admin/health` |
| `platform.audit.view` | Query historical platform administrative audit events | `GET /v1/platform-admin/audit` |

### 2.3 Row-Level Security (RLS) & Bypass Architecture
PostgreSQL policies on `public.tenants`, `public.companies`, and child tables enforce `tenant_id = current_setting('app.current_tenant_id', true)`. For platform founder queries:
1. Queries run through the database connection pool using explicit platform admin session settings:
   ```sql
   SELECT set_config('app.is_platform_admin', 'true', true);
   ```
2. Database RLS policies evaluate:
   ```sql
   CREATE POLICY tenants_platform_admin_all ON public.tenants
     FOR ALL TO authenticated
     USING (current_setting('app.is_platform_admin', true) = 'true');
   ```
3. Business Owner queries never set `app.is_platform_admin = 'true'` and remain strictly isolated to their own tenant record.

---

## 3. Database Schema Mapping & Real Business Registry

### 3.1 Authoritative Entity Relationships
```
[public.tenants]
  ├── id (PK, text/uuid)
  ├── name (varchar)
  ├── slug (varchar, unique)
  ├── status (ACTIVE | SUSPENDED | ARCHIVED)
  ├── created_at (timestamptz)
  ├── updated_at (timestamptz)
  │
  ├── [public.companies] (1:N)
  │     ├── id (PK)
  │     ├── tenant_id (FK -> tenants.id)
  │     ├── name (varchar)
  │     └── currency_code (varchar)
  │
  ├── [public.branches] (1:N)
  │     ├── id (PK)
  │     ├── tenant_id (FK -> tenants.id)
  │     ├── company_id (FK -> companies.id)
  │     ├── name (varchar)
  │     └── code (varchar)
  │
  ├── [public.memberships] (1:N)
  │     ├── id (PK)
  │     ├── tenant_id (FK -> tenants.id)
  │     ├── user_id (FK -> users.id)
  │     └── status (ACTIVE | SUSPENDED)
  │
  └── [public.audit_events] (1:N)
        ├── id (PK)
        ├── tenant_id (FK -> tenants.id, nullable for platform events)
        ├── actor_id (varchar)
        ├── event_type (varchar)
        ├── payload (jsonb)
        └── created_at (timestamptz)
```

### 3.2 Registry Query Aggregation
The Business Registry endpoint (`GET /v1/platform-admin/businesses`) executes an aggregated query:
- Joins `tenants` with count of `companies`, count of `branches`, and primary owner details from `memberships` + `users` / `user_profiles`.
- Server-side filtering: `status` (`ALL`, `ACTIVE`, `SUSPENDED`, `ARCHIVED`), `search` (case-insensitive ILIKE matching on name, slug, owner email).
- Server-side pagination: `page`, `limit` (default 20, max 100), returning total count, pages count, and items.

---

## 4. Suspension & Reactivation State Lifecycle

### 4.1 State Machine
```
       ┌──────────────┐
       │   ACTIVE     │
       └──────┬───────┘
              │  POST /businesses/:id/suspend (reason required)
              ▼
       ┌──────────────┐
       │  SUSPENDED   │
       └──────┬───────┘
              │  POST /businesses/:id/reactivate (reason required)
              ▼
       ┌──────────────┐
       │   ACTIVE     │
       └──────────────┘
```

### 4.2 Enforced Invariants
1. **Mandatory Audit Reason:** A suspension or reactivation request without an explicit non-empty `reason` string (min 5 characters) is rejected with `400 Bad Request`.
2. **Durably Recorded Audit Trail:** Every status change writes an immutable row into `public.audit_events`:
   - `event_type`: `PLATFORM_TENANT_SUSPENDED` or `PLATFORM_TENANT_REACTIVATED`
   - `actor_id`: Platform founder user ID
   - `payload`: `{ tenant_id, previous_status, new_status, reason, timestamp }`
3. **Session & Request Enforcement:**
   - When a tenant is suspended, all subsequent API requests from users belonging to that tenant are intercepted by `TenantGuard` and rejected with `403 Forbidden` (`TENANT_SUSPENDED`).
   - In-flight background jobs for the suspended tenant are paused.
4. **Non-Destructive Guarantee:** In accordance with Golden Rule 11 ("Never silently delete financial history"), suspension never deletes or purges records. All financial ledgers, catalog items, and audit logs remain fully intact.

---

## 5. Authentic Platform Health & Telemetry Engine

Instead of fabricated 100% all-green stats, `GET /v1/platform-admin/health` performs live subsystem checks:
1. **PostgreSQL Database Pool:**
   - Active client count, idle client count, total client pool limit.
   - Round-trip ping latency via `SELECT 1` in milliseconds.
2. **Supabase Auth Gateway:**
   - Health ping to Supabase Auth endpoint (`/auth/v1/health` or jwks endpoint).
3. **Database Migrations Status:**
   - Verification of schema version and any pending unapplied migration files.
4. **CRDT / Event Stream Health:**
   - Outbox table lag check (`SELECT count(*) FROM public.outbox_events WHERE processed_at IS NULL`).

---

## 6. Phased Implementation Roadmap

- **Phase PA-0:** Architecture reconnaissance & documentation (Plan, Registry).
- **Phase PA-1:** Security enforcement & capability guards (`PlatformAdminGuard`, `@RequirePlatformCapability`).
- **Phase PA-2:** Authoritative Platform Admin API module (`apps/api/src/platform-admin/`).
- **Phase PA-3:** Client-side data integration & truthful feedback (`apps/admin-web/src/platform-founder-view.ts`).
- **Phase PA-4:** UI wiring, interactive modals, error handling, empty states.
- **Phase PA-5:** Comprehensive automated unit and integration tests (API & UI).
- **Phase PA-6:** Complete architectural documentation suite in `docs/platform-admin/`.
- **Phase PA-7:** Monorepo validation, test suite execution, and formal certification.
