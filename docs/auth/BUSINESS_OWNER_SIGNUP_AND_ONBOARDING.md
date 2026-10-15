# STOKROVA — Business Owner Self-Signup & Real Onboarding Architecture
**Platform:** STOKROVA Enterprise Business Operating Platform & Inventory OS  
**Target Gate:** `SUPABASE_AUTH_LIVE_VERIFIED`  
**Identity Provider:** Supabase Auth (`https://vbtuccvxtgjhaywijmwa.supabase.co`)  
**Database:** Supabase PostgreSQL with RLS  
**Document Revision:** 1.0.0  

---

## 1. Primary Registration Lifecycle

The canonical business registration journey implements the strict lifecycle:

```
  ┌─────────────────────────┐
  │ 1. SIGNUP_SUBMITTED     │ ──► User submits Registration form (name, email, password)
  └───────────┬─────────────┘
              │
              ▼
  ┌──────────────────────────────┐
  │ 2. EMAIL_CONFIRM_PENDING     │ ──► Supabase Auth sends verification email (mailer_autoconfirm: false)
  └───────────┬──────────────────┘     Client shows truthful "Check Your Email" screen.
              │
              ▼
  ┌──────────────────────────────┐
  │ 3. IDENTITY_CONFIRMED        │ ──► User clicks link / callback verifies code & issues JWT session.
  └───────────┬──────────────────┘
              │
              ▼
  ┌──────────────────────────────┐
  │ 4. BUSINESS_SETUP_PENDING    │ ──► GET /v1/auth/session returns ONBOARDING_REQUIRED.
  └───────────┬──────────────────┘     Owner enters business name, slug, currency, branch details.
              │
              ▼
  ┌──────────────────────────────┐
  │ 5. ATOMIC BUSINESS CREATION  │ ──► POST /v1/auth/onboard executes in a single PostgreSQL transaction:
  └───────────┬──────────────────┘     - Inserts public.tenants (id, name, slug, status='ACTIVE')
              │                        - Inserts public.companies (id, tenant_id, name, currency)
              │                        - Inserts public.branches (id, tenant_id, company_id, code='MAIN')
              │                        - Inserts public.users (id=auth.uid, tenant_id, email, full_name)
              │                        - Inserts public.user_profiles (id, user_id, display_name)
              │                        - Inserts public.memberships (id, tenant_id, user_id, status='ACTIVE')
              │                        - Inserts public.role_assignments (id, role='BUSINESS_OWNER')
              ▼
  ┌──────────────────────────────┐
  │ 6. ONBOARDING_COMPLETE       │ ──► User authenticated with active tenant membership.
  └──────────────────────────────┘     Landing page resolves to sovereign Admin Workspace.
```

---

## 2. Idempotency & Resilient Recovery Guarantees

1. **Repeated Callback / Multi-Click Protection:**
   - When a confirmation callback is opened multiple times or refreshed, the system checks whether the user already has an active membership (`SELECT * FROM memberships WHERE user_id = $1`).
   - If membership is already active, `GET /v1/auth/session` returns `ONBOARDING_COMPLETE` without duplicating tenant or company rows.
2. **Duplicate Slug Detection:**
   - Slugs are sanitized (`sanitizeSlug`) and checked for uniqueness in PostgreSQL before transaction commit.
   - If a conflict occurs, a clear `ConflictException` is returned so the user can select an alternative slug without losing their authenticated session.
3. **Partial Provisioning Recovery:**
   - If business creation encounters a network or validation interruption after signup, the Supabase Auth user identity remains intact.
   - Upon next sign-in, the API detects `onboarding_status === 'ONBOARDING_REQUIRED'` and allows the user to resume onboarding without registering a new email address.
4. **Client-Side Authorization Denial:**
   - User metadata in JWTs (`user_metadata`, `app_metadata`) is treated as advisory description only.
   - All tenant authorizations and permissions are resolved exclusively from authoritative database rows in `public.memberships` and `public.role_assignments`.
