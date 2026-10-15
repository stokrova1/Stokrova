# STOKROVA — Authentication Mock & Demo Purge Report
**Platform:** STOKROVA Enterprise Business Operating Platform & Inventory OS  
**Target Gate:** `SUPABASE_AUTH_LIVE_VERIFIED`  
**Document Revision:** 1.0.0  

---

## 1. Inventory of Identified Fake & Demo Authentication Artifacts

During the reconnaissance audit across `apps/api`, `apps/admin-web`, and `apps/customer-web`, the following fake authentication behaviors, in-memory simulations, and browser-local registries were identified:

| Artifact / Pattern | File Location | Severity | Description & Security Impact |
| :--- | :--- | :--- | :--- |
| **Browser-local tenant registry** | `apps/customer-web/build-static.mjs`<br>`apps/customer-web/src/landing-view.ts` | **CRITICAL** | `handleRegisterSubmit` wrote tenant objects to `localStorage.getItem('stokrova_tenants')`, bypassing both Supabase Auth and the NestJS API. |
| **Simulated staff login & name matching** | `apps/customer-web/build-static.mjs`<br>`apps/customer-web/src/landing-view.ts` | **CRITICAL** | `handleLoginSubmit` inspected email strings for words like "manager", "cashier", "picker", or "victoria", and synthesized fake active sessions with arbitrary permissions. |
| **In-Memory Tenancy Storage** | `apps/api/src/tenancy/tenancy.service.ts` | **HIGH** | `tenantsStore`, `companiesStore`, `branchesStore`, and `membershipsStore` were in-memory `Map`s, completely disconnected from PostgreSQL. |
| **Unauthenticated Tenant Onboarding** | `apps/api/src/tenancy/tenancy.controller.ts` | **HIGH** | `@Post('onboard')` lacked `@UseGuards(AuthGuard)` and fabricated random owner IDs (`usr_${randomUUID()}`) rather than linking to a verified Supabase identity. |
| **Hardcoded Staff Workspace Verification** | `apps/api/src/tenancy/tenancy.service.ts` | **MEDIUM** | `verifyStaffWorkspace` returned synthetic JSON fixtures (`Apex Global Retail Ltd`, `London Flagship`, `Victoria Sterling`) without querying the database. |
| **In-Memory RBAC & Fake Invites** | `apps/api/src/rbac/rbac.service.ts` | **HIGH** | Roles, assignments, and invitations were stored in memory; invitation acceptance synthesized random user IDs instead of verifying Auth sessions. |
| **Hardcoded HMAC JWT Secret Fallback** | `apps/api/src/auth/auth.guard.ts` | **CRITICAL** | Hardcoded HMAC-SHA256 signature verification failed to support Supabase's asymmetric ES256 key, locking out real Supabase tokens while allowing simulated tokens. |
| **Client-Side Role Impersonation** | `apps/admin-web/build-static.mjs` | **MEDIUM** | `handlePersonaChange` allowed toggling view visibility in the DOM without backend authorization. |

---

## 2. Remediation Strategy & Boundaries

1. **Preserve Legitimate Test Fixtures:**
   - Existing automated tests in `apps/api` (e.g. `apps/api/src/security/production-readiness.spec.ts`, `tenancy.service.spec.ts`) rely on isolated unit test invocations.
   - We maintain backward compatibility by allowing in-memory fallback **only when no database connection is injected**, ensuring unit tests run fast without network dependencies.
   - In production and live environments (when `DATABASE_CLIENT` / `TransactionManager` is available), all operations execute real PostgreSQL transactions with RLS.

2. **Purge Browser LocalStorage Fakes:**
   - Replace fake `handleRegisterSubmit` and `handleLoginSubmit` in `apps/customer-web` with genuine Supabase client calls.
   - Display truthful "Email confirmation required" state according to Supabase's actual `mailer_autoconfirm: false` setting.
   - Route authenticated sessions to the real STOKROVA API for profile and membership resolution.

3. **Secure Backend Gateways:**
   - Require `AuthGuard` on all onboarding endpoints.
   - Verify Supabase JWTs cryptographically against Supabase JWKS (ES256).
   - Reconcile `UserIdentity` with PostgreSQL `users` and `memberships` tables.
