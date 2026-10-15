# STOKROVA — Supabase Authentication & Real User Onboarding Implementation Plan
**Platform:** STOKROVA Enterprise Business Operating Platform & Inventory OS  
**Target Gate:** `SUPABASE_AUTH_LIVE_VERIFIED`  
**Identity Provider:** Supabase Auth (`https://vbtuccvxtgjhaywijmwa.supabase.co`)  
**Application Database:** Supabase PostgreSQL (Managed Postgres 17+ with RLS)  
**Document Revision:** 1.0.0 — Live Activation Baseline  

---

## 1. Executive Summary & Audit Baseline

An exhaustive architectural audit of the STOKROVA codebase has identified critical discrepancies between the declared enterprise architecture and the live runtime implementation:

1. **Supabase Auth Project Status:**
   - Supabase project reference: `vbtuccvxtgjhaywijmwa`.
   - Live HTTPS settings diagnostic (`GET /auth/v1/settings` with API key) confirms:
     - `disable_signup: false` (Signups are **enabled**).
     - `mailer_autoconfirm: false` (Email confirmation is **required**; users must confirm email before session issuance unless pre-authenticated or invited).
     - `external.email: true` (Email/password provider active).
   - JWKS endpoint diagnostic (`GET /auth/v1/.well-known/jwks.json`):
     - Asymmetric **ES256** (ECDSA P-256) signature verification key is published by Supabase (`kid: 39e66b5f-416f-447c-b0f4-be5b56d94ffd`).

2. **Backend Authentication Guards Disconnection (`auth.guard.ts`):**
   - The current `AuthGuard` implements a hardcoded HMAC-SHA256 (`crypto.createHmac('sha256', jwtSecret)`) verification scheme against a local secret string.
   - Any legitimate Supabase JWT issued by project `vbtuccvxtgjhaywijmwa` (signed with ES256) is rejected with `Invalid JWT signature`.
   - `AuthGuard` extracted `tenant_id` from JWT `user_metadata` or `app_metadata`, allowing untrusted client-supplied metadata to dictate tenancy if not verified against PostgreSQL.

3. **In-Memory Tenancy & RBAC Persistence Disconnection:**
   - `apps/api/src/tenancy/tenancy.service.ts` relied entirely on in-memory `Map`s (`tenantsStore`, `companiesStore`, `branchesStore`, `membershipsStore`).
   - `apps/api/src/rbac/rbac.service.ts` relied on in-memory `Map`s (`rolesStore`, `assignmentsStore`, `invitationsStore`).
   - None of the onboarding or tenant provisioning operations persisted to the live 244-table PostgreSQL schema in Supabase!
   - Database tables `users`, `user_profiles`, `tenants`, `companies`, `branches`, `memberships`, `roles`, and `role_assignments` currently contain 0 records.

4. **Frontend Mock / LocalStorage Traps:**
   - `apps/customer-web`: `handleRegisterSubmit` stored serialized tenant objects into `localStorage.getItem('stokrova_tenants')` and simulated workspace launch without contacting Supabase Auth.
   - `apps/customer-web`: `handleLoginSubmit` simulated credential validation and hardcoded fake identities (`Victoria Sterling`, `David O'Connor`, etc.).
   - `apps/admin-web`: Static bundle used default hardcoded context without a live authentication boundary.

---

## 2. Target Canonical Architecture

```
                                  CANONICAL AUTHENTICATION FLOW
                                  
  [Browser / Mobile Client]
             │
             │  1. Credentials (Email/Password)
             ▼
   [Supabase Auth Service]  ───(If mailer_autoconfirm: false)───► [Email Delivery / SMTP]
             │                                                           │
             │  2. Issue JWT (ES256 ECDSA P-256)                         │ 3. Confirmation Link
             ▼                                                           ▼
  [Client Session Established] ◄─────────────────────────────────────────┘
             │
             │  4. HTTP Request (Authorization: Bearer <Supabase_JWT>)
             ▼
      [STOKROVA API]
             │
             ├──► [AuthGuard]: Cryptographic ES256 / JWKS or Supabase Auth verification
             │                 (Verifies issuer, audience, unexpired timestamp, sub)
             │
             ├──► [Authoritative Membership Service / DB]:
             │       Resolves user profile & active memberships from PostgreSQL:
             │       `SELECT * FROM memberships WHERE user_id = $sub AND status = 'ACTIVE'`
             │
             ├──► [TenantGuard & RbacGuard]:
             │       Enforces tenant isolation & RBAC permissions from authoritative DB
             │
             ▼
   [PostgreSQL Database (Supabase)]
      (Enforces RLS with `SET LOCAL ROLE authenticated` & `app.current_tenant_id`)
```

### Architectural Ownership Separation
- **Supabase Auth owns:** Account creation, password hashing, email verification tokens, session issuance, refresh tokens, password reset tokens, logout.
- **STOKROVA API & PostgreSQL own:** User profile records (`users`, `user_profiles`), tenant entities (`tenants`, `companies`, `branches`), business memberships (`memberships`), system/custom roles (`roles`, `permissions`, `role_permissions`), role assignments (`role_assignments`), and staff invitations.

---

## 3. Implementation Blueprint & Phase Gates

### Phase AUTH-1: Environment & Client Standardization
- Configure universal Supabase client initializer for backend and frontend environments.
- Support `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_JWKS_URL`.
- Ensure no sensitive database superuser credentials or service keys leak to frontend bundles.

### Phase AUTH-2: Real Cryptographic JWT Verification in `AuthGuard`
- Implement asymmetric JWKS / ES256 signature verification in `apps/api/src/auth/auth.guard.ts`.
- Cache public JWKS keys with TTL to ensure high throughput and zero request bottlenecks.
- Support dual verification mode:
  1. Primary: Asymmetric ES256 verification against Supabase JWKS (for live Supabase Auth tokens).
  2. Fallback: HMAC-SHA256 for test environments when explicit test secrets are provided in isolated unit tests.
- Reconcile `UserIdentity` with authoritative database membership resolution.

### Phase AUTH-3: PostgreSQL Persistence for Tenancy & RBAC
- Refactor `TenancyService` in `apps/api/src/tenancy/tenancy.service.ts`:
  - When `DatabaseClient` / `TransactionManager` is available, execute atomic transactional inserts:
    - Insert `tenants` (id, name, slug, status='ACTIVE').
    - Insert `companies` (id, tenant_id, name, currency_code).
    - Insert `branches` (id, tenant_id, company_id, name, code='MAIN').
    - Insert `users` (id=user.id, tenant_id, email, full_name, role='tenant_admin').
    - Insert `user_profiles` (id, user_id, display_name).
    - Insert `memberships` (id, tenant_id, user_id, status='ACTIVE').
    - Insert `role_assignments` (id, tenant_id, user_id, role_id='role_tmpl_business_owner').
  - Ensure idempotency: If user or tenant slug exists, handle gracefully without creating orphaned rows.
  - Maintain fallback in-memory store for isolated unit tests that instantiate the service without DB.
- Refactor `RbacService` in `apps/api/src/rbac/rbac.service.ts`:
  - Persist roles, assignments, and invitations to PostgreSQL when DB is available.

### Phase AUTH-4: Dedicated Authentication Controller & Endpoints
- Create `apps/api/src/auth/auth.controller.ts` & `apps/api/src/auth/auth.service.ts`:
  - `GET /v1/auth/session` (or `GET /v1/auth/me`): Returns verified user profile, active memberships, tenant names, roles, and onboarding status (`COMPLETED` vs `ONBOARDING_REQUIRED`).
  - `POST /v1/auth/onboard`: Protected by `AuthGuard`. Accepts business onboarding details, binds to authenticated Supabase `user.id`, and provisions tenant in PostgreSQL atomically.
  - `POST /v1/auth/invite`: Owner invites staff; records pending invitation in PostgreSQL.
  - `POST /v1/auth/accept-invite`: Invitee accepts invitation with verified Supabase session; establishes active membership.

### Phase AUTH-5: Frontend Real Authentication & Elimination of Fake Flows
- In `apps/customer-web`:
  - Connect `handleRegisterSubmit` to real Supabase client (`supabase.auth.signUp`).
  - Display truthful "Check Your Email" state when Supabase reports confirmation required (`mailer_autoconfirm: false`).
  - Connect `handleLoginSubmit` to `supabase.auth.signInWithPassword`.
  - On authenticated session, check backend `/v1/auth/session`:
    - If onboarding required -> prompt business onboarding form.
    - If active tenant -> route to authorized workspace with real verified credentials.
  - Purge `localStorage.getItem('stokrova_tenants')` fake storage.
- In `apps/admin-web`:
  - Ensure workspace header displays verified session user and active tenant from API.
  - Remove fake client-side role impersonation fallback.

### Phase AUTH-6: Staff Invitation & Role Acceptance Workflow
- Integrate staff invitations with authoritative PostgreSQL records.
- Ensure only active business owners or authorized managers can invite staff for their specific tenant.
- Prevent privilege escalation or cross-tenant membership injection.

### Phase AUTH-7: Automated Regression & Integration Testing
- Comprehensive unit tests for `AuthGuard` verifying ES256 JWKS tokens, invalid signatures, expired tokens, and test mode fallback.
- Tenancy and RBAC database integration tests against Supabase PostgreSQL.
- End-to-end verification of registration, onboarding, login, session restoration, and logout.

---

## 4. Verification & Certification Standard
The implementation will be evaluated against:
1. `npm test` across all 13 workspace projects (100% green).
2. Live Supabase API calls verified against project `vbtuccvxtgjhaywijmwa`.
3. Live PostgreSQL queries confirming real row persistence in `tenants`, `users`, and `memberships`.
