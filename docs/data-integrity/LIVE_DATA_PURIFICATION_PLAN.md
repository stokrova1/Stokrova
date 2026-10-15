# STOKROVA — Live Account Data Purification, Demo Isolation & Zero-Placeholder Enforcement Plan

**Document ID:** `STOKROVA-DATA-PURIFY-001`  
**Platform:** STOKROVA Enterprise Business Operating Platform & Inventory OS  
**Target Gate:** `LIVE_DATA_INTEGRITY_VERIFIED`  
**Date:** October 15, 2026  
**Status:** Approved for Execution  
**Authority:** Master Authorization under `AGENTS.md` and Live Account Data Purification Mandate  

---

## 1. Executive Summary & Master Authorization

In accordance with the STOKROVA Master Mandate, every real account in STOKROVA must contain and display only genuine business data. STOKROVA possesses a designated **Demo Mode** specifically designed for interactive tours, training, and sales presentations using fictional entities such as *Apex Global Retail Ltd* and *Victoria Sterling*.

Under no circumstances may live tenant workspaces or production accounts display:
1. Hardcoded synthetic revenue, profit, or GMV totals.
2. Fabricated staff rosters, pre-filled PINs, or synthetic activity timelines.
3. Hardcoded catalog products or mock purchase orders.
4. Fictional holding companies or hardcoded branch selector options.
5. Fallbacks to demo data upon network or database failures.
6. Silent creation of tenants with synthetic placeholder names.

This plan details the discovery findings from Phase DATA-0, specifies the strict boundary separating Demo Mode from Live Mode, and establishes the phase-by-phase execution path to achieve `LIVE_DATA_INTEGRITY_VERIFIED`.

---

## 2. Reconnaissance Findings (Phase DATA-0)

### 2.1 Live Database Provenance & Status
- **PostgreSQL Connection:** Connected successfully via Supabase transaction pooler (`aws-0-eu-west-1.pooler.supabase.com:6543`) and session pooler (`port 5432`).
- **Database Table Inventory:** Scanned all 245 public schema tables and `auth.users`.
- **Finding:** **Zero rows exist across all 245 public tables, and `auth.users` contains 0 rows.**
- **Provenance Conclusion:** The production Supabase database is completely clean and unpolluted. No historical seed scripts or demo records were inserted into the live database.
- **Architectural Consequence:** The fake/demo data observed in real account screens originates entirely from **source-code defaults, frontend mock fallbacks, static pre-renders, and in-memory test fixtures**, rather than database pollution.

### 2.2 Source-Code & Frontend Fallback Inventory

| Location | Component / File | Severity | Nature of Synthetic Data | Target Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **API Backend** | `apps/api/src/tenancy/tenancy.service.ts` | **CRITICAL** | `verifyStaffWorkspace` returns synthetic JSON for `Apex Global Retail Ltd`, `London Flagship`, and synthetic staff names if no tenant match is found. | Remove synthetic defaults. Return truthful `verified: false` and `404 Not Found` when no tenant or staff membership exists in PostgreSQL. |
| **API Backend** | `apps/api/src/search-reporting/reporting.service.ts` | **HIGH** | `runReport` generates default mock row with `TOTAL_REVENUE: 1500000` when no rows are found. | Remove default mock row; return truthful empty report rows with `row_count: 0`. |
| **UI Components** | `packages/ui/src/workspace-views.ts` | **CRITICAL** | Default `tenantName = options.tenantName \|\| 'Apex Global Retail Ltd'`; hardcoded POS buttons for `Apex Pro 16 Laptop` and `Apex Ultra 5G Phone`; hardcoded quote/order tables; hardcoded holding structure; hardcoded staff emails (`@apex.com`) and prefilled PIN `7788`. | Decouple demo fixtures: render honest empty states when options/data are empty. Preserve demo fixtures strictly under explicit `isDemo: true` parameter. |
| **Admin Web Shell** | `apps/admin-web/src/index.ts` | **HIGH** | Navbar branch switcher dropdown hardcodes `Apex Retail UK Ltd`, `London Flagship Store`, `Birmingham Logistics Hub`, and `Apex Retail US Inc`. | Render dynamic branches from `context.branches` / `context.companies`. If empty, render truthful prompt to create branch in Organization Topology. |
| **Admin Web Views** | `apps/admin-web/src/dashboard-view.ts` | **HIGH** | Hardcoded fiscal compliance metrics (`$76,400.00`, `1,420 / 1,420 PEPPOL Dispatch`, `43.4 d DSI`, `285% GMROI`). | Render calculated real values or honest zero/unconfigured states for fresh tenants. |
| **Admin Web Views** | `apps/admin-web/src/organization-view.ts` | **MEDIUM** | Lacks empty states when `companies` or `branches` maps are empty, rendering a blank table body. | Add truthful empty state rows explaining that no legal entities or branches have been created yet. |
| **Admin Web Static** | `apps/admin-web/build-static.mjs` | **CRITICAL** | Statically seeds `DashboardViewModel` with `$4,850,000.00` GMV and `$382,000.00` net revenue; seeds Intel & Samsung suppliers, Apex POs, and fake journal entries. | Guard static seeding: isolate demo seed data to a dedicated demo bundle (`demo.html` / `isDemo=true`), and build clean, truthful empty live admin bundle. |
| **Customer Web Onboarding** | `apps/customer-web/src/landing-view.ts` | **HIGH** | `reg-branch-name` prefilled with `"London Flagship"`; input placeholders displaying `"e.g. Apex Global Retail Ltd"`; provisioning success screen hardcoding `Apex Global Retail Ltd` and `apex.stokrova.com`. | Clear prefilled branch input; use generic neutral placeholders; display user-entered business name on provisioning screen. |
| **Customer Web Auth** | `apps/customer-web/build-static.mjs` | **CRITICAL** | `handleLoginSubmit` falls back to `Apex Global Retail Ltd`, `Victoria Sterling`, and synthetic active session if user is not in local storage. | Remove synthetic login fallback. Disallow session synthesis without valid authentication. |

---

## 3. Strict Demo / Live Boundary Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │                    STOKROVA PLATFORM                   │
                  └────────────────────────────────────────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │        DEMO MODE        │                     │        LIVE MODE        │
         ├─────────────────────────┤                     ├─────────────────────────┤
         │ • Explicit URL / Flag   │                     │ • Real Supabase Auth    │
         │   (?demo=true / modal)  │                     │ • Real PostgreSQL DB    │
         │ • Isolated Demo Context │                     │ • Tenant RLS Enforced   │
         │ • Tenant: Apex Global   │                     │ • Real Business Records │
         │ • User: Victoria S.     │                     │ • Honest Empty States   │
         │ • Sandboxed Operations  │                     │ • Real Network Errors   │
         │ • Read-Only / In-Memory │                     │ • Zero Placeholders     │
         └─────────────────────────┘                     └─────────────────────────┘
                      │                                               │
                      ▼                                               ▼
         Confined to Demo Space                          Authoritative Truth
```

### 3.1 Live Mode Invariants
1. **Authoritative Storage:** Every business entity (tenant, company, branch, product, transaction, invoice, ledger entry) MUST originate from Supabase PostgreSQL via authorized RLS policies or valid user input.
2. **Truthful Zero & Honest Empty States:** If a business has 0 sales, 0 products, or 0 staff, the UI MUST display 0 and render an actionable empty state (e.g., *"No products in catalog. Add your first item to start selling."*).
3. **No Silent Error Fallbacks:** Network, API, or database errors MUST render a retryable error boundary or service unavailable notice. They MUST NEVER fall back to demo data.
4. **Honest Onboarding:** The business name and owner details MUST be explicitly entered by the user. No synthetic names (e.g. *"Demo Store"*, *"My Business"*) may be pre-assigned.

### 3.2 Demo Mode Invariants
1. Demo mode is triggered only via explicit user action (e.g., clicking *"Open Live Interactive Demo"*, navigating with `?demo=true`).
2. Demo mode uses dedicated isolated fixtures and cannot write to or mutate live database tables.
3. Exiting demo mode completely purges demo session tokens and client caches.

---

## 4. Execution Phases

### Phase DATA-1: Source-Code & Fallback Cleanup
- Clean up `apps/api/src/tenancy/tenancy.service.ts` to eliminate `verifyStaffWorkspace` synthetic fallbacks.
- Clean up `apps/api/src/search-reporting/reporting.service.ts` to eliminate default `1500000` revenue generation.
- Clean up `packages/ui/src/workspace-views.ts` to ensure all workspace views render genuine empty states when tenant data is empty, isolating demo fixtures behind `options.isDemo`.

### Phase DATA-2: Supabase Data Provenance Audit
- Document the live database scan findings: all 245 public schema tables have verified 0 rows.
- Publish `docs/data-integrity/LIVE_DATABASE_DEMO_DATA_AUDIT.md`.

### Phase DATA-3: Controlled Live-Data Cleanup & Verification Scripts
- Since live tables currently contain 0 rows, provide an idempotent remediation and audit script in `packages/database` that can be run on demand to verify zero-pollution and detect any rogue demo tenants (`ten_prod_primary_01`, `Apex Global`, etc.).
- Ensure `seedDatabase` in `packages/database/src/seed.ts` is explicitly safeguarded so it cannot run in production environments without authorization.

### Phase DATA-4: Onboarding & Business Identity Purification
- Remove prefilled `"London Flagship"` branch default in `apps/customer-web/src/landing-view.ts`.
- Ensure onboarding form requires explicit business name and slug input with truthful validation.
- Remove synthetic login fallback in `apps/customer-web/build-static.mjs`.

### Phase DATA-5: Dashboard & Page Purification
- Update `apps/admin-web/src/index.ts` to dynamically render branch/company options or display an unconfigured state when no branches exist.
- Update `apps/admin-web/src/organization-view.ts` to display clean, informative empty states.
- Clean up `apps/admin-web/build-static.mjs` and `apps/admin-web/src/dashboard-view.ts` so live dashboard builds default to truthful zero KPIs and empty alert feeds unless real records exist.

### Phase DATA-6: Demo/Live Environment Isolation
- Formalize the architectural isolation model in `docs/data-integrity/DEMO_AND_LIVE_ISOLATION_MODEL.md`.
- Ensure client-side storage keys for demo mode are prefixed (e.g., `stokrova_demo_*`) and cannot collide with live tenant session data.

### Phase DATA-7: Regression & Acceptance Testing
- Implement automated acceptance tests covering all 36 required test scenarios across onboarding, dashboard empty states, fallback removal, and demo isolation.
- Verify test suite passes (`pnpm test`, `tsc --noEmit`).

### Phase DATA-8: Certification & Quality Gate
- Produce all required documentation in `docs/data-integrity/`.
- Validate gate criteria for `LIVE_DATA_INTEGRITY_VERIFIED`.

---

## 5. Sign-off & Authority
- **Agent Authority:** Antigravity (Frontend, UI/UX, Client Integration) & Claude Code (Backend, Database, Security).
- **Compliance Standard:** Golden Rules 1, 7, 10, 11, 20, 21, 27, 28, 29.
