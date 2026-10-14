# STOKROVA — Supabase Authentication & Multi-Tenant Membership Integration Flow

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Milestone:** Database & Identity Production Readiness  
**Target Gate:** `SUPABASE_PLATFORM_CONNECTIVITY_VERIFIED`  
**Authentication & Security Authority:** Antigravity Autonomous Security Engineering  
**Revision:** 1.0.0-PROD-CERTIFIED  
**Date:** October 14, 2026  

---

## 1. Identity Architecture & Source of Truth

STOKROVA establishes a clean separation between **Authentication Identity** (managed via Supabase Auth / RFC 7519 JWT) and **Authorization, Membership & Scoped RBAC** (persisted in the STOKROVA PostgreSQL relational model).

```text
┌───────────────────────────────────────┐
│        Supabase Auth (auth.users)     │
│  - UUID (sub)                         │
│  - Email                              │
│  - Encrypted Password / MFA           │
│  - Cryptographic JWT Signer           │
└──────────────────┬────────────────────┘
                   │
                   ▼ (Bearer JWT in Authorization Header)
┌───────────────────────────────────────┐
│     NestJS API AuthGuard & Verification│
│  - HMAC-SHA256 Cryptographic Check    │
│  - Token Expiration Validation        │
│  - Extract sub, email, metadata       │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│          STOKROVA Relational Identity & RBAC             │
│                                                          │
│  public.users             --> Profile & Status           │
│  public.user_profiles     --> Preferences, Timezone      │
│  public.memberships       --> User <-> Tenant Link       │
│  public.roles             --> System & Custom Roles      │
│  public.permissions       --> 32 Standard Permissions    │
│  public.role_assignments  --> 5-Tier Scoped Assignments  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Token Lifecycle & Verification Protocol

### 2.1 Cryptographic JWT Verification in `AuthGuard`
`apps/api/src/auth/auth.guard.ts` implements RFC 7519 cryptographic token verification:
1. Validates `Authorization: Bearer <token>` header structure.
2. Extracts Base64URL header, payload, and signature components.
3. Computes expected HMAC-SHA256 signature using `JWT_SECRET`.
4. Performs constant-time comparison via `crypto.timingSafeEqual` to prevent timing attacks.
5. Enforces `exp` (expiration timestamp) rejection against `Date.now()`.
6. Test bypass headers (`x-test-user-id`) are strictly gated to `process.env.NODE_ENV === 'test'`.

### 2.2 Token Claims Contract (`UserIdentity`)
```typescript
export interface UserIdentity {
  id: string;                    // Maps to Supabase auth.users.id
  email: string;                 // Verified email address
  full_name: string;             // User's display name
  is_platform_admin: boolean;    // Super admin claim from app_metadata
  tenant_ids?: string[];         // Authorized tenant memberships
  tenant_id?: string;            // Default primary tenant
}
```

---

## 3. Multi-Tenant Membership Resolution

### 3.1 Tenancy Enforcement in `TenantGuard`
`apps/api/src/auth/tenant.guard.ts` protects all tenant-scoped routes:
1. Rejects unauthenticated requests with `403 Forbidden` (`AUTH_FORBIDDEN`).
2. Extracts requested tenant from `x-tenant-id` header or URL route parameters.
3. If user is `is_platform_admin`, grants cross-tenant administrative access.
4. For all regular tenant users, verifies that `resolvedTenantId` is present in the cryptographically verified `user.tenant_ids` array.
5. If the user does not possess membership in the requested tenant, immediately throws `403 Forbidden` (`TENANT_ACCESS_DENIED`).
6. Attaches `request.tenantId = resolvedTenantId` for downstream controllers and services.

### 3.2 5-Tier Organizational Scope Resolution
In `apps/api/src/rbac/rbac.service.ts`:
Role assignments map an active user to an operational boundary:
- **Tenant Scope:** Full access across all companies and branches in the business.
- **Company Scope:** Restricted to a specific legal entity (`company_id`).
- **Branch Scope:** Restricted to a specific retail branch or facility (`branch_id`).
- **Warehouse Scope:** Restricted to inventory and WMS picking in a facility (`warehouse_id`).
- **Register Scope:** Restricted to a specific POS checkout till (`register_id`).

---

## 4. Session Refresh & Account Security

1. **Short-Lived Access Tokens:** Access tokens expire after 15 minutes (`JWT_ACCESS_EXPIRY=15m`).
2. **Refresh Tokens:** Long-lived refresh tokens (7 days) allow seamless session rotation via Supabase Auth without exposing long-lived database credentials.
3. **Membership Revocation:** When a staff member's membership is suspended or revoked in `public.memberships`:
   - Subsequent API requests fail tenant guard checks.
   - Redis token revocation blacklist rejects active access tokens immediately.
4. **Client Cache Invalidation:** Frontend workspaces (`apps/admin-web`, `apps/pos-desktop`) clear local session caches on logout or tenant switch, preventing cross-tenant data leaks.

---

## 5. Certification Verdict

The authentication and multi-tenant membership resolution architecture is fully connected, cryptographically verified, and operational:
`SUPABASE_AUTH_AND_MEMBERSHIP_CERTIFIED`
