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
| `GAP-001` | **P1** | **Permission Code Mismatch in UI Navigation Tree**<br>Navigation items in `packages/ui/src/navigation.ts` check legacy or non-standard permission codes (`sales.read`, `inventory.read`, `procurement.read`, etc.) instead of canonical `StandardPermissions` from `@stokrova/domain` (`sales.order.view`, `inventory.view`, `suppliers.view`, etc.). | All Non-Superuser Roles (`BRANCH_MANAGER`, `INVENTORY_CONTROLLER`, `ACCOUNTANT`, `SALES_CLERK`, etc.) | When non-wildcard users authenticate, `buildUserNavigation()` filters out virtually all menu sections, rendering an empty sidebar despite valid backend role assignments. | Align all `requiredPermission` properties in `MASTER_NAVIGATION_SECTIONS` with canonical `StandardPermissions` codes from `@stokrova/domain/src/rbac.ts`. | **IDENTIFIED** |
| `GAP-002` | **P1** | **Static Demo Build Baking Hardcoded Mock State**<br>`apps/admin-web/build-static.mjs` generates a static `dist/index.html` with hard-coded customer names, static GMV, and client-side simulated persona switching, bypassing the live API client. | `PLATFORM_FOUNDER`, `BUSINESS_OWNER`, All Admin Views | The application displays fabricated demo numbers ($4.85M GMV, 78.5% warehouse utilization) regardless of actual database state, violating Rule 26 & Section 11. | Refactor `AdminWebShell` and all view models to accept real data payloads, wire live `api-client.ts` fetchers, and remove hardcoded seed arrays from production bundles. | **IDENTIFIED** |
| `GAP-003` | **P1** | **Missing Role Operational Views in Admin Console**<br>The admin web package only implemented 5 basic views (Catalog, Inventory, Orders, Workflows, Founder). Critical designed domains lack dedicated UI components: Procurement (Suppliers/3-Way Match), Finance (GL/CoA/Periods), Cash Registers (Till Sessions), RBAC/Staff, Organization/Branches. | `BUSINESS_OWNER`, `FINANCIAL_CONTROLLER`, `PROCUREMENT_OFFICER`, `BRANCH_MANAGER` | Business Owners and managers cannot perform designed core workflows through the browser interface. | Implement modular view renderers for Procurement, Finance/GL, Cash Registers, Scoped RBAC, Organization, and Analytics, seamlessly integrated into `AdminWebShell`. | **IDENTIFIED** |
| `GAP-004` | **P2** | **Executive Dashboard Placeholder String**<br>`DashboardViewModel.renderDashboardHtml` contains a static text element: `[Visual Revenue Stream Graph Placeholder]` instead of an interactive SVG or data-driven revenue chart. | `BUSINESS_OWNER`, `EXECUTIVE_VIEWER`, `/analytics/dashboards` | Visually incomplete dashboard, fails Section 11 mandate ("no useless interface elements or placeholders"). | Replace placeholder with an elegant SVG sparkline/area revenue chart dynamically rendered from actual minor currency numbers. | **IDENTIFIED** |
| `GAP-005` | **P1** | **Disconnected Staff Invitation Flow**<br>The API controller `RbacController.inviteStaff` and token acceptance endpoint exist, but the admin UI has no interactive modal to issue staff invites or assign 5-tier scope targets. | `BUSINESS_OWNER`, `BRANCH_MANAGER`, `/settings/roles` | Business Owners cannot invite staff members or manage role scopes through the web application. | Build the Scoped RBAC & Staff Invitation management view in `apps/admin-web` and connect it to `GET/POST /v1/rbac/*`. | **IDENTIFIED** |
| `GAP-006` | **P2** | **Cashier Till Variance Oversight Disconnected in Admin Web**<br>While `apps/pos-desktop` has a blind reconciliation modal, the admin console lacks a till session audit view to inspect cashier variances and approve closings. | `BRANCH_MANAGER`, `ACCOUNTANT`, `BUSINESS_OWNER`, `/registers` | Managers cannot audit cashier shortages from the admin console without physically accessing the till. | Wire `RegistersView` in `apps/admin-web` connected to `GET /v1/registers/sessions` to display cashier variances and closing status. | **IDENTIFIED** |
| `GAP-007` | **P2** | **3-Way Match GRN Discrepancy UI Integration**<br>`OrdersViewModel` contains the logic for `evaluateThreeWayMatch`, but lacks the interactive form to record inbound goods receipt (GRN) against purchase orders. | `PROCUREMENT_OFFICER`, `INVENTORY_CONTROLLER`, `/procurement/receiving` | Goods receiving cannot be formally signed off or matched against supplier invoices in the browser. | Add interactive Goods Receipt & 3-Way Match view to `apps/admin-web` with variance flagging. | **IDENTIFIED** |
