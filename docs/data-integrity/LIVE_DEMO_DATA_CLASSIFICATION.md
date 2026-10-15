# STOKROVA — Live Demo Data Classification & Provenance Audit

**Audit Timestamp:** 2026-10-15T15:35:00Z  
**Target Environment:** Supabase PostgreSQL (`db.vbtuccvxtgjhaywijmwa.supabase.co`) & Monorepo Runtimes  
**Readiness Gate:** `LIVE_ADMIN_CLEANUP_AND_ENFORCEMENT_VERIFIED` (Classification Phase)

---

## 1. Executive Summary

A comprehensive, read-only and provenance audit was conducted across the live Supabase PostgreSQL database, Supabase Auth store, and monorepo source code to identify and classify all data records, schemas, seed artifacts, and in-memory fallback collections.

The live database audit confirmed:
- **`auth.users`:** Contains exactly 1 genuine account (`stokrova1@gmail.com`, UUID `f145cbc0-65be-4903-ad5e-28562ef44a0f`). Zero synthetic demo user accounts exist in live Supabase Auth.
- **`public.tenants`:** Contains exactly 1 sovereign root tenant (`ten_platform_root` - "STOKROVA Global Platform Management"). Zero synthetic demo tenants exist in PostgreSQL.
- **`public.users`:** Contains exactly 1 root administrator record linked to `stokrova1@gmail.com`.
- **`public.memberships`:** Contains exactly 1 root membership.
- **`public.roles`:** Contains system templates (`role_tmpl_business_owner`, `role_tmpl_platform_super_admin`).

**Root Cause of Synthetic Data Exposure:**  
Synthetic businesses (`ten_apex_global`, `ten_metro_retail`, `ten_aurora_boutiques`, `ten_lagos_fastmart`) and demo personas were originating from **in-memory seed initializers** inside `apps/api/src/platform-admin/platform-admin.service.ts` and `apps/admin-web/src/platform-founder-view.ts`. Because these fallback arrays were populated at construction time, any API failure or lack of database rows caused the Platform Founder Console to display synthetic businesses as if they were live records.

---

## 2. Comprehensive Record Classification Inventory

| Entity / Dataset Identifier | Source Location | Classification | Evidence & Provenance | Proposed Action |
|---|---|---|---|---|
| `stokrova1@gmail.com` | `auth.users` & `public.users` | `GENUINE_LIVE_DATA` | Verified root platform founder account authenticated in Supabase Auth with permanent trigger `on_auth_user_platform_admin_sync`. | **PRESERVE UNCONDITIONALLY**. Protect from any modification or deletion. |
| `ten_platform_root` | `public.tenants` | `GENUINE_LIVE_DATA` | Sovereign root anchor tenant provisioned in migration `0016_platform_admin_stokrova1.sql` for platform-level management. | **PRESERVE UNCONDITIONALLY**. |
| `role_tmpl_platform_super_admin` | `public.roles` | `GENUINE_LIVE_DATA` | System template role assigned to root platform founder. | **PRESERVE UNCONDITIONALLY**. |
| `role_tmpl_business_owner` | `public.roles` | `GENUINE_LIVE_DATA` | Canonical system role template for tenant business owners. | **PRESERVE UNCONDITIONALLY**. |
| `ten_apex_global` ("Apex Global Retail") | `platform-admin.service.ts` & `platform-founder-view.ts` | `CONFIRMED_SYNTHETIC_DEMO` | Hardcoded in-memory array created for demo mode; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. Remove default instantiation from production runtime. |
| `ten_metro_retail` ("Metro Department Stores") | `platform-admin.service.ts` & `platform-founder-view.ts` | `CONFIRMED_SYNTHETIC_DEMO` | Hardcoded in-memory array created for demo mode; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. Remove default instantiation from production runtime. |
| `ten_aurora_boutiques` ("Aurora Luxury Boutiques") | `platform-admin.service.ts` & `platform-founder-view.ts` | `CONFIRMED_SYNTHETIC_DEMO` | Hardcoded in-memory array created for demo mode; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. Remove default instantiation from production runtime. |
| `ten_lagos_fastmart` ("Lagos FastMart Express") | `platform-admin.service.ts` & `platform-founder-view.ts` | `CONFIRMED_SYNTHETIC_DEMO` | Hardcoded in-memory array created for demo mode; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. Remove default instantiation from production runtime. |
| `usr_owner_victoria` | `platform-admin.service.ts` | `CONFIRMED_SYNTHETIC_DEMO` | In-memory dummy user record; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. |
| `usr_owner_charles` | `platform-admin.service.ts` | `CONFIRMED_SYNTHETIC_DEMO` | In-memory dummy user record; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. |
| `usr_owner_isabella` | `platform-admin.service.ts` | `CONFIRMED_SYNTHETIC_DEMO` | In-memory dummy user record; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. |
| `usr_owner_baba` | `platform-admin.service.ts` | `CONFIRMED_SYNTHETIC_DEMO` | In-memory dummy user record; does NOT exist in live PostgreSQL. | **ISOLATE TO TEST FIXTURES ONLY**. |
| Hardcoded `$7,092,000+` GMV Metric | `platform-founder-view.ts` | `CONFIRMED_SYNTHETIC_DEMO` | Static string in `renderPlatformKpiCardsHtml()`. | **ELIMINATE**. Compute dynamically from authoritative database records (renders `$0.00` when zero). |
| Hardcoded `14ms latency / 99.98%` | `platform-founder-view.ts` | `CONFIRMED_SYNTHETIC_DEMO` | Static string in `renderPlatformKpiCardsHtml()`. | **ELIMINATE**. Render authentic system status and honest connection telemetry. |
| Seed Constants (`ten_prod_primary_01`) | `packages/database/src/seed.ts` | `CONFIRMED_TEST_FIXTURE` | Guarded by `NODE_ENV === 'production' && ALLOW_PRODUCTION_SEED !== 'true'`. Never executed in live database. | **PRESERVE IN SEED SCRIPT FOR ISOLATED TESTING**. Verified absent from live database. |

---

## 3. Dry-Run Verification

A dry-run query on the live Supabase database confirmed that no destructive SQL deletion was required because the live database is already pure:
```sql
SELECT count(*) FROM public.tenants WHERE id IN ('ten_apex_global', 'ten_metro_retail', 'ten_aurora_boutiques', 'ten_lagos_fastmart');
-- Result: 0 records
```
Therefore:
1. Zero live database records will be dropped or corrupted.
2. Genuine customer records are 100% safe.
3. Code-level purification is required to eliminate default in-memory seeding in production, enforce database-backed operations, and replace hardcoded metrics with honest empty/dynamic states.
