# STOKROVA — Demo & Live Environment Isolation Model

**Document ID:** `STOKROVA-ISO-001`  
**Platform:** STOKROVA Enterprise Business Operating Platform & Inventory OS  
**Target Gate:** `LIVE_DATA_INTEGRITY_VERIFIED`  
**Date:** October 15, 2026  
**Status:** Canonical Reference Architecture  

---

## 1. Architectural Philosophy & Dual-Space Isolation

STOKROVA operates under a strict dual-space execution model:
1. **Live Production Space (Authoritative):** Every account, company, branch, transaction, catalog item, and journal entry is backed strictly by Supabase Auth and Supabase PostgreSQL with enforced Row Level Security (RLS). When a business has no data, the system truthfully displays an empty state or zero metrics.
2. **Interactive Demo Space (Sandboxed):** An isolated, non-authoritative simulation mode designed exclusively for product tours, sales demonstrations, and staff training. It operates with explicitly labeled demonstration entities (e.g. *Apex Global Retail Ltd*, *Victoria Sterling*).

```
                             ┌───────────────────────────────────────┐
                             │       STOKROVA ENTRY ROUTER           │
                             └───────────────────────────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
          ┌───────────────────────────┐                     ┌───────────────────────────┐
          │     LIVE WORKSPACE        │                     │      DEMO WORKSPACE       │
          ├───────────────────────────┤                     ├───────────────────────────┤
          │ Database: Supabase PG     │                     │ Database: None / Ephemeral│
          │ Auth: Cryptographic ES256 │                     │ Auth: Simulated Guest     │
          │ Tenancy: Real UUID/Slug   │                     │ Tenancy: demo-apex-global │
          │ Storage: Real S3/R2       │                     │ Storage: In-Memory / Blob │
          │ Metrics: True Ledger SQL  │                     │ Metrics: Static Showcase  │
          │ Fallback on Error: ERROR  │                     │ Fallback on Error: Reset  │
          └───────────────────────────┘                     └───────────────────────────┘
```

---

## 2. Six Non-Negotiable Isolation Boundaries

### Boundary 1: Database & Storage Partitioning
- **Live Rule:** Live backend services connect directly to PostgreSQL via the connection pooler.
- **Demo Rule:** The demo environment cannot write to, alter, or execute migrations against the live database. No demo seeder may execute in production.
- **Guard:** Environment variable verification prevents seeder execution when `NODE_ENV === 'production'`.

### Boundary 2: Authentication & Token Verification
- **Live Rule:** Every API request requires a valid Supabase JWT signed with asymmetric ECDSA (`ES256`) verified via the live Supabase JWKS endpoint (`/auth/v1/.well-known/jwks.json`).
- **Demo Rule:** Demo mode uses an explicit `DEMO_GUEST` session flag. Demo tokens are cryptographically rejected by the live API `AuthGuard`.
- **Guard:** Zero mock token bypass in live `AuthGuard`.

### Boundary 3: Browser Client Storage Partitioning
- **Live Rule:** Real tenant session tokens and identities are stored in official Supabase client storage keys (`sb-<project-ref>-auth-token`).
- **Demo Rule:** Any client-side state used in interactive demo sessions MUST be prefixed with `stokrova_demo_`.
- **Guard:** Logging into or launching a real account automatically purges `stokrova_demo_*` storage items, ensuring no stale demo state pollutes a live account.

### Boundary 4: Business Identity & Onboarding
- **Live Rule:** Every live tenant created via `/api/v1/tenants/onboard` requires genuine user input (company name, slug, legal jurisdiction, currency). Default names such as *"Demo Store"*, *"Apex Global"*, or *"My Company"* are strictly prohibited.
- **Demo Rule:** Only the dedicated demo mode modal may launch a session under the demo company name.
- **Guard:** The onboarding controller validates that company names are at least 2 non-whitespace characters and rejects known synthetic placeholders.

### Boundary 5: Zero Error Fallback Policy
- **Live Rule:** If a network call fails, Supabase times out, or a query encounters an error, the frontend MUST display a truthful error state with an action to retry.
- **Prohibited Behavior:** It is strictly prohibited to swap in demo data, mock revenue numbers, or sample products when an API call fails.
- **Guard:** Client services throw typed `ApiUnavailableError` and render error banners, never mock arrays.

### Boundary 6: Truthful Empty States (Zero-Data Integrity)
- **Live Rule:** An account with zero sales displays:
  - GMV: `$0.00`
  - Net Revenue: `$0.00`
  - Active Orders: `0`
  - Cashier Alerts: `0`
  - An empty catalog table renders: *"No products in catalog. Click '+ New Product' to create your first item."*
  - An empty branch tree renders: *"No branches registered. Go to Organization Settings to configure your first location."*
- **Guard:** View models and templates require explicit empty state branches instead of defaulting to sample data arrays.

---

## 3. Demarcation Checklist

| Feature Area | Live Mode Implementation | Demo Mode Implementation |
| :--- | :--- | :--- |
| **Top Navigation Brand** | Persisted Tenant / Company Name | `Apex Global Retail Ltd` (with [DEMO] badge) |
| **Branch Selector** | Real branches returned by API / DB | London Flagship / Birmingham DC (Demo only) |
| **POS Terminal** | Real catalog variants from database | Sample Quick-Select (Laptop / Phone) |
| **Fulfillment & POs** | Real purchase orders & 3-way match | Simulated POs (Demo only) |
| **General Ledger** | Real double-entry balanced journals | Sample journal showcase (Demo only) |
| **Staff Roster** | Real Supabase members from DB | Sample personas (Demo only) |
| **Reporting / Analytics**| Genuine aggregation queries | Static sample charts |

---

## 4. Enforcement Mechanisms
1. **Automated Audits:** `npm run audit:live` in `@stokrova/database` verifies PostgreSQL purity.
2. **Acceptance Tests:** Automated tests verify that unpopulated live accounts display 0 metrics and zero placeholder company names.
3. **CI Gate:** Every build verifies `typecheck`, `lint`, and data integrity acceptance suites before deployment.
