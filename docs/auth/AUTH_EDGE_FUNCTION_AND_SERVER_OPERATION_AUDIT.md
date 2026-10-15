# STOKROVA — Authentication Edge Function & Server Operation Audit
**Platform:** STOKROVA Enterprise Business Operating Platform & Inventory OS  
**Target Gate:** `SUPABASE_AUTH_LIVE_VERIFIED`  
**Document Revision:** 1.0.0  

---

## 1. Architectural Responsibility Audit

Per Golden Rule 22 and the project architecture, STOKROVA's backend services are consolidated in the authoritative NestJS API with Drizzle ORM and direct Supabase PostgreSQL connections, rather than fragmented across external Edge Functions.

| Component / Responsibility | Target Architectural Location | Deployed Status | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Token & Identity Verification** | NestJS `AuthGuard` (`apps/api/src/auth/auth.guard.ts`) | **Active / Live** | Upgraded with asymmetric JWKS ES256 ECDSA verification and PostgreSQL database membership resolution. |
| **Session State & Recovery** | NestJS `AuthService` (`apps/api/src/auth/auth.service.ts`) | **Active / Live** | Resolves user profile, active tenant memberships, and onboarding status. |
| **Tenant Onboarding & Provisioning** | NestJS `TenancyService` (`apps/api/src/tenancy/tenancy.service.ts`) | **Active / Live** | Executes atomic PostgreSQL transaction creating `tenants`, `companies`, `branches`, `users`, `user_profiles`, `memberships`, and `role_assignments`. |
| **Staff Invitations & Acceptance** | NestJS `RbacService` (`apps/api/src/rbac/rbac.service.ts`) | **Active / Live** | Persists cryptographic invitation tokens to `public.invitations` in PostgreSQL and links invitees to active memberships. |
| **Database RLS Policies** | Supabase PostgreSQL (`public` schema) | **Active / Live** | 245 active RLS policies enforced with `SET LOCAL ROLE authenticated` and `app.current_tenant_id`. |
| **Edge Functions Repository Scan** | `supabase/functions` | **Not Utilized** | No standalone Edge Functions exist; all business invariants remain unified within the NestJS API domain services. |

---

## 2. Server-Side Administrative Operations Security

1. **Privileged Database Credentials:**
   - Database connection strings (`DIRECT_URL`, `DATABASE_POOLER_TRANSACTION_URL`) reside strictly on the server and are never included in client-side bundles or public API responses.
2. **Asymmetric Key Discovery:**
   - Cryptographic public keys are fetched from Supabase's standard JWKS endpoint (`https://vbtuccvxtgjhaywijmwa.supabase.co/auth/v1/.well-known/jwks.json`) and cached with a 1-hour TTL, eliminating external network latency on request hot paths.
3. **Idempotency & Isolation:**
   - Cross-system operations between Supabase Auth and STOKROVA PostgreSQL maintain defined transactional lifecycles without leaking permissions across pooled connections.
