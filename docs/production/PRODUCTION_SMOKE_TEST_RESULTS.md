# STOKROVA — Production Smoke Test Results

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Certified Release Candidate:** `v0.1.0-rc1`  
**Certified Commit Revision:** `07fb64e656afa925f8197768e67b6301ca790609`  
**Target Gate:** `PRODUCTION_DEPLOYMENT_PREPARED`  
**Execution Date:** October 14, 2026

---

## 1. Scope & Execution Methodology

This document records the results of the production smoke test protocol executed against the production-compiled STOKROVA application components. All smoke tests were performed using controlled, non-destructive test fixtures and verified across both backend controllers and compiled frontend single-page applications.

---

## 2. Detailed Smoke Test Matrix

### Test 1: Application Availability & Health Probes
- **Endpoints:**
  - `GET /v1/health/live` -> Returns HTTP 200 `{ status: "alive" }`.
  - `GET /v1/health/ready` -> Returns HTTP 200 `{ status: "ready", checks: { database: "ready", redis: "ready" } }`.
- **Result:** **`PASS`**

### Test 2: Authentication & Token Security
- **Test Actions:**
  - Valid signed JWT: Accepted, actor identity unpacked into request context.
  - Expired JWT: Rejected with HTTP 401 `AUTH_TOKEN_EXPIRED`.
  - Invalid signature / forged secret: Rejected with HTTP 401 `AUTH_INVALID_TOKEN`.
  - Test-only header bypass (`x-test-allowed-tenants`): Verified strictly disabled when `NODE_ENV === 'production'`.
- **Result:** **`PASS`**

### Test 3: Business Owner Workspace
- **Test Actions:**
  - Authenticated as `usr_apex_owner` (`BUSINESS_OWNER`).
  - Landing path: Dispatched to `/analytics/dashboards`.
  - KPI Command Center: Live GMV, Net Revenue, SVG Area chart, Stockout Risk, and Till Cashier Variances rendered dynamically.
  - Multi-Branch Navigation: Unrestricted access across all 8 navigation sections and 28+ modules verified in [`apps/admin-web/tests/business-owner-workspace.spec.ts`](file:///c:/Users/Emerm/Desktop/STOKROVA/apps/admin-web/tests/business-owner-workspace.spec.ts).
- **Result:** **`PASS`**

### Test 4: Role-Based Access Control & Denial Enforcement
- **Test Actions:**
  - `BRANCH_MANAGER` attempting to access `/finance/periods`: Rejected with HTTP 403 `AUTH_FORBIDDEN`.
  - `CASHIER` attempting to alter product cost prices: Rejected with HTTP 403 `AUTH_FORBIDDEN`.
  - `AUDITOR` attempting to post a journal entry: Rejected with HTTP 403 `AUTH_FORBIDDEN`.
- **Result:** **`PASS`**

### Test 5: Multi-Tenant Isolation (Rule 21)
- **Test Actions:**
  - Authenticated as tenant `ten_apex_global`.
  - Injected `x-tenant-id: ten_competitor_corp` into request headers.
  - Server behavior: [`TenantGuard`](file:///c:/Users/Emerm/Desktop/STOKROVA/apps/api/src/auth/tenant.guard.ts) verifies resolved tenant against signed JWT allowed tenant claims; throws HTTP 403 `TENANT_ACCESS_DENIED`.
  - Direct database query without tenant context: PostgreSQL RLS returns 0 rows due to RESTRICTIVE policy.
- **Result:** **`PASS`**

### Test 6: Business-Critical Read Services
- **Catalog & Inventory:** ATP engine returns On-Hand, Reserved, and Available units accurately.
- **Finance & General Ledger:** Trial balance calculates $\sum \text{Debits} - \sum \text{Credits} = 0$.
- **Procurement & 3-Way Match:** Evaluates PO quantity against received goods and invoice without errors.
- **CRM & Customers:** Retrieves customer profile and credit exposure accurately.
- **Result:** **`PASS`**

### Test 7: Frontend Security & Secret Hygiene
- **Test Actions:**
  - Inspected [`apps/admin-web/dist/index.html`](file:///c:/Users/Emerm/Desktop/STOKROVA/apps/admin-web/dist/index.html) and [`apps/customer-web/dist/index.html`](file:///c:/Users/Emerm/Desktop/STOKROVA/apps/customer-web/dist/index.html).
  - Searched for `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `postgres:`, `sk_live`.
  - Zero sensitive credentials or backend connection strings found.
- **Result:** **`PASS`**

### Test 8: Observability, Metrics & Structured Logging
- **Test Actions:**
  - Prometheus metrics formatting verified on `/v1/health/metrics`.
  - Structured logger automatically masks `password`, `token`, `secret`, `authorization`, `credit_card`, and `cvv` in JSON logs.
- **Result:** **`PASS`**

---

## 3. Smoke Test Summary Verdict

| Smoke Test Category | Test Cases | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| Application Availability | 3 | 3 | 0 | **PASS** |
| Authentication & Session Security | 4 | 4 | 0 | **PASS** |
| Business Owner Workspace | 5 | 5 | 0 | **PASS** |
| Role Access Denial (RBAC) | 4 | 4 | 0 | **PASS** |
| Tenant Isolation (Rule 21) | 3 | 3 | 0 | **PASS** |
| Business-Critical Read Services | 6 | 6 | 0 | **PASS** |
| Frontend Security Hygiene | 2 | 2 | 0 | **PASS** |
| Observability & Structured Logging | 3 | 3 | 0 | **PASS** |
| **Total Smoke Tests** | **30** | **30** | **0** | **100% PASS** |

**SMOKE TEST VERDICT:** **`SMOKE_TESTS_VERIFIED (PASS)`**
