# STOKROVA Product Gap Register
## Identified Discrepancies, Severity Classifications & Remediation Roadmap

**Project:** STOKROVA Enterprise Business Operations Platform  
**Authority:** Section 3.2, 11 & 20 Mandate  
**Status:** Active Gap Tracking & Remediation Log

---

## 1. Severity Definitions

- **P0 — Critical**: Security breaches, multi-tenant leaks, unauthorized financial/inventory mutations, platform crashes.
- **P1 — Major**: Core designed capabilities missing from intended role workspaces, navigation filtering lockouts, mock/fake implementations in production paths, broken role workflows.
- **P2 — Moderate**: Incomplete filters, placeholder visual charts, missing secondary contextual shortcuts, incomplete error feedback.
- **P3 — Minor**: Minor visual polish, spacing inconsistencies, nonessential label alignments.

---

## 2. Identified Gaps & Defect Register

| Gap ID | Severity | Title & Root Cause | Affected Roles & Pages | Impact on System | Corrective Action & Invariant | Status |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| `GAP-001` | **P1** | **Permission Code Mismatch in UI Navigation Tree**<br>Navigation items in `packages/ui/src/navigation.ts` checked legacy or non-standard permission codes (`sales.read`, `inventory.read`, etc.) instead of canonical `StandardPermissions` from `@stokrova/domain`. | All Non-Superuser Roles (`BRANCH_MANAGER`, `INVENTORY_CONTROLLER`, `ACCOUNTANT`, `SALES_CLERK`, etc.) | When non-wildcard users authenticated, `buildUserNavigation()` filtered out menu sections, rendering an empty sidebar despite valid backend role assignments. | Bidirectional alias mapping implemented in `packages/ui/src/navigation.ts` supporting both canonical `StandardPermissions` and legacy aliases. Verified in `navigation.spec.ts` & `business-owner-workspace.spec.ts`. | **RESOLVED** |
| `GAP-002` | **P1** | **Static Demo Build Baking Hardcoded Mock State**<br>`apps/admin-web/build-static.mjs` previously generated static bundles with hard-coded customer names and simulated personas without dynamic payload ingestion. | `PLATFORM_FOUNDER`, `BUSINESS_OWNER`, All Admin Views | The application displayed fabricated demo numbers ($4.85M GMV, 78.5% warehouse utilization) regardless of actual database state. | Refactored `apps/admin-web/build-static.mjs` and all ViewModels in `apps/admin-web/src/*` to accept real data payloads, eliminating fake demo state. Verified in `business-owner-workspace.spec.ts`. | **RESOLVED** |
| `GAP-003` | **P1** | **Missing Role Operational Views in Admin Console**<br>The admin web package only implemented 5 basic views. Critical designed domains lacked dedicated UI components (Procurement, Finance, Registers, RBAC, Org). | `BUSINESS_OWNER`, `FINANCIAL_CONTROLLER`, `PROCUREMENT_OFFICER`, `BRANCH_MANAGER` | Business Owners and managers could not perform designed core workflows through the browser interface. | Implemented modular view renderers for Procurement, Finance/GL, Cash Registers, Scoped RBAC, Organization, and Analytics in `apps/admin-web/src/`. Verified in 36 passing admin tests. | **RESOLVED** |
| `GAP-004` | **P2** | **Executive Dashboard Placeholder String**<br>`DashboardViewModel.renderDashboardHtml` contained a static text element: `[Visual Revenue Stream Graph Placeholder]`. | `BUSINESS_OWNER`, `EXECUTIVE_VIEWER`, `/analytics/dashboards` | Visually incomplete dashboard, violated Section 11 mandate ("no useless interface elements or placeholders"). | Replaced placeholder in `apps/admin-web/src/dashboard-view.ts` with a responsive SVG Area revenue chart with gradient fill, trend line, data markers, and drill-down links. | **RESOLVED** |
| `GAP-005` | **P1** | **Disconnected Staff Invitation Flow**<br>The API controller `RbacController.inviteStaff` existed, but the admin UI lacked an interactive modal to issue staff invites or assign 5-tier scope targets. | `BUSINESS_OWNER`, `BRANCH_MANAGER`, `/settings/roles` | Business Owners could not invite staff members or manage role scopes through the web application. | Built Scoped RBAC & Staff Invitation management view in `apps/admin-web/src/rbac-view.ts` and `RbacViewModel` with 5-tier dimensional scope targets. Verified in integration suite. | **RESOLVED** |
| `GAP-006` | **P2** | **Cashier Till Variance Oversight Disconnected in Admin Web**<br>While `apps/pos-desktop` had a blind reconciliation modal, the admin console lacked a till session audit view to inspect cashier variances. | `BRANCH_MANAGER`, `ACCOUNTANT`, `BUSINESS_OWNER`, `/registers` | Managers could not audit cashier shortages from the admin console without physically accessing the till. | Implemented `RegistersViewModel` and `RegistersView` in `apps/admin-web/src/registers-view.ts` displaying active sessions, counted amounts, variances, and status. | **RESOLVED** |
| `GAP-007` | **P2** | **3-Way Match GRN Discrepancy UI Integration**<br>`OrdersViewModel` contained match evaluation logic, but lacked the interactive form to record inbound goods receipt (GRN) against purchase orders. | `PROCUREMENT_OFFICER`, `INVENTORY_CONTROLLER`, `/procurement/receiving` | Goods receiving could not be formally signed off or matched against supplier invoices in the browser. | Integrated Goods Receiving & 3-Way Match evaluation view in `apps/admin-web/src/procurement-view.ts` and `ProcurementViewModel` with automated variance flag badges. | **RESOLVED** |

---

## 3. Remediation & Verification Summary

All 7 identified gaps have been completely remediated, integrated across the monorepo, and validated with passing automated tests:

1. **Navigation & Permissions:** `packages/ui/src/navigation.ts` passed `navigation.spec.ts` (27/27 tests).
2. **Dynamic UI ViewModels:** All new operational views in `apps/admin-web/src/` passed `business-owner-workspace.spec.ts` (11/11 tests) and `platform-founder-view.spec.ts` (5/5 tests).
3. **Static Bundle Assembly:** `apps/admin-web/build-static.mjs` generates an interactive 165 KB self-contained artifact (`dist/index.html`) using live ViewModel logic with zero placeholders.
4. **Platform Regression Gate:** Full monorepo verification shows **721 passing tests, 0 failures, 0 regressions**.

