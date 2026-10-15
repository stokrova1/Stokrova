# STOKROVA Platform User Management & Suspension Architecture

**Target Gate:** `PLATFORM_ADMIN_CONSOLE_LIVE_VERIFIED`  
**Classification:** Identity, RBAC & Account Lifecycle  
**Primary Database Authority:** Supabase PostgreSQL (`public.users`, `public.memberships`, `public.audit_events`)  
**Identity Provider:** Supabase Auth (RFC 7519 JWT)

---

## 1. Identity & Membership Model Separation

STOKROVA strictly distinguishes between **Global User Identity** and **Tenant Membership**:

1. **Global User Record (`public.users`):**
   - Stores user identity, authentication provider (`SUPABASE_AUTH`), email address, full name, and platform activation status (`is_active: boolean`).
   - Represents the sovereign person or system actor.
2. **Tenant Membership (`public.memberships`):**
   - Connects a user to a specific business organization (`tenant_id`).
   - Controls access status to that organization (`status: 'ACTIVE' | 'SUSPENDED'`).
   - A user may possess memberships across multiple business entities, each isolated by RLS.
3. **Platform Administrator (`is_platform_admin`):**
   - Flagged via `is_platform_admin = true` (or `app_metadata.is_platform_admin = true`).
   - Has sovereign authority across all organizations.

---

## 2. Suspension Mechanics: Two Distinct Tiers

```
                 ┌────────────────────────────────────────────────────────┐
                 │                Platform Founder Console                │
                 └───────────────────────────┬────────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          [Tier A: Business Suspension]               [Tier B: User Suspension]
          POST /businesses/:id/suspend                POST /users/:id/suspend
                       │                                           │
                       ▼                                           ▼
       • Sets tenants.status = 'SUSPENDED'         • Sets users.is_active = false
       • Sets memberships.status = 'SUSPENDED'     • Writes PLATFORM_USER_SUSPENDED
       • Writes PLATFORM_TENANT_SUSPENDED audit    • Blocks user across all tenants
       • Halts all staff under tenant at TenantGuard
```

### 2.1 Business Suspension (Tenant-Level Killswitch)
When a business is suspended:
1. `public.tenants.status` transitions from `ACTIVE` to `SUSPENDED`.
2. All associated `public.memberships` for that tenant transition to `SUSPENDED`.
3. Invariant: `TenantGuard` in `apps/api/src/auth/tenant.guard.ts` verifies tenant status on every authenticated API request. Any non-platform-admin request targeting a suspended tenant is rejected with `403 Forbidden` (`TENANT_SUSPENDED`).
4. Financial Ledgers, POS registers, and inventory records remain 100% frozen and intact.

### 2.2 Individual User Suspension (Actor-Level Killswitch)
When an individual user is suspended:
1. `public.users.is_active` is set to `false`.
2. Invariant: `AuthGuard` in `apps/api/src/auth/auth.guard.ts` intercepts requests from deactivated users and rejects them with `401 Unauthorized` (`USER_DEACTIVATED`).
3. The user cannot access any tenant organization regardless of their individual memberships.

---

## 3. Mandatory Reason Enforcement & Audit Trail Durability

In accordance with enterprise audit standards:
- Every suspension request requires a `reason` payload:
  ```json
  {
    "reason": "Repeated failed payments / Dunning policy Level 3 threshold exceeded."
  }
  ```
- If `reason` is omitted, whitespace-only, or fewer than 5 characters in length, the backend immediately rejects the operation with `400 Bad Request` (`A valid suspension reason of at least 5 characters is strictly required.`).
- Every valid transition immutably appends a record to `public.audit_events`:
  - `id`: Unique UUID `aud_...`
  - `actor_id`: Platform Founder user ID (`usr_founder_root`)
  - `event_type`: `PLATFORM_TENANT_SUSPENDED` / `PLATFORM_TENANT_REACTIVATED` / `PLATFORM_USER_SUSPENDED` / `PLATFORM_USER_REACTIVATED`
  - `payload`: `{ previousStatus, newStatus, reason, timestamp }`

---

## 4. Architectural Golden Rule: Zero Silent Deletion
> **Golden Rule 11:** Never silently delete financial history.
> Suspension is non-destructive. No tables, records, ledger journals, or user profiles are purged upon suspension. Reactivation immediately restores operational access with complete state continuity.
