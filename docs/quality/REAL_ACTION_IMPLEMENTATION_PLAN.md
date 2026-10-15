# STOKROVA — Real Action Execution, Backend Connectivity & Truthful Feedback Implementation Plan

**Target Gate:** `REAL_ACTIONS_AND_FEEDBACK_VERIFIED`  
**Document Reference:** `docs/quality/REAL_ACTION_IMPLEMENTATION_PLAN.md`  
**Classification:** Quality, Architecture & Execution Protocol  
**Date:** 2026-10-15  
**Version:** 1.0.0

---

## 1. Executive Summary & Problem Analysis

In previous iterations of the STOKROVA application, UI prototypes and static views occasionally relied on inline placeholder handlers such as:

```html
<button onclick="window.stokrovaApp?.showToast('Refreshed real-time telemetry from double-entry ledger.')">
  Refresh Ledgers
</button>
```

This pattern violated core engineering tenets:
1. **Premature / Fabricated Success Feedback:** A success toast was displayed immediately on click without dispatching a network call, executing a domain mutation, or confirming persistence in the PostgreSQL / Supabase ledger.
2. **Missing In-Flight / Loading State:** Buttons did not indicate that an operation was pending (`disabled`, `aria-busy`, spinner), allowing duplicate submissions and clicks.
3. **Absence of Real Modals:** Action buttons labeled "+ Post Journal", "+ Add Account", or "+ Add Company" merely popped a generic toast stating "Modal opened" rather than actually opening an interactive modal dialog with form fields, validation, and real submission handlers.
4. **Untruthful Empty & Pending States:** Incomplete workflows or background tasks were masked by generic success toasts rather than declaring their true operational state (`ACCEPTED_PENDING`, `NOT_STARTED`, `EMPTY`, or `FAILED`).

This plan sets forth the architecture, implementation phases, and verification criteria to eliminate every fake success control across STOKROVA.

---

## 2. Universal Action & Feedback Standard

Every actionable control in STOKROVA must strictly produce one of the seven canonical outcome states:

| Outcome State | Trigger & Meaning | UI Treatment | Button In-Flight Behavior |
| :--- | :--- | :--- | :--- |
| `SUCCEEDED` | Backend API returned `200 OK` or `201 Created` with verified ledger mutation or client data mutation completed with verified persistence. | Green toast/badge with verified entity ID, reference number, or transaction hash. | Enabled after spinner, icon returns to normal. |
| `ACCEPTED_PENDING` | Operation accepted into async queue or local offline buffer queue (e.g. POS offline ticket, driver GPS drop). | Blue / Amber badge with exact queue depth, local buffer ID, and sync status. | Enabled after enqueueing, status icon reflects buffered state. |
| `VALIDATION_FAILED` | Input fields failed client-side schema or server-side domain constraints. | Inline red field border, contextual error list, no success toast. | Enabled immediately for user correction. |
| `FORBIDDEN` | User role / scope lacks permission (HTTP 403 or RBAC barrier). | Red security warning dialog or banner with required permission code. | Enabled with security lock badge. |
| `EMPTY` | Query executed successfully but returned zero records. | Honest zero-state illustration, explanation of why data is absent, and call-to-action to seed/create. | Enabled. |
| `NOT_STARTED` | Feature or workflow requires prerequisites before execution (e.g. unopened till drawer, unconfigured tax profile). | Neutral grey state banner detailing required prerequisite steps. | Disabled or redirects to prerequisite configuration. |
| `FAILED` | Server error (500), network partition, or unhandled rejection. | Red error toast with diagnostic error message and retry action. | Re-enabled with retry button. |

---

## 3. Seven-Stage Execution Protocol

### Stage ACT-0: Discovery & Static Analysis
- Audit every `.ts`, `.tsx`, `.html`, and `.mjs` file in `apps/admin-web`, `apps/pos-desktop`, `apps/mobile`, and `packages/ui`.
- Catalog every occurrence of `showToast`, `toastFn`, inline `onclick`, and unhandled button events.
- Output results to `docs/quality/STOKROVA_REAL_ACTION_INVENTORY.md`.

### Stage ACT-1: Real Action Dispatcher Core
- Implement `@stokrova/ui` `action-dispatcher.ts` and `ActionController`:
  - Typed `ActionOutcome` enum and `ActionFeedback` interface.
  - Double-click debounce and `aria-busy` / button disabling wrapper.
  - Safe error catching: any rejected promise translates to `ActionOutcome.FAILED` with error message.
  - Real notification banner and toast rendering with distinct visual indicators for `SUCCESS`, `PENDING`, `ERROR`, and `WARNING`.

### Stage ACT-2: Interactive Modals & Admin Web Views Remediation
- **`finance-view.ts`:**
  - Build real interactive "Post General Journal Entry" modal (Journal #, Debit Account, Credit Account, Amount, Description).
  - Build real interactive "Add Account" modal (Code, Title, Type, Balance).
  - Build real "Draft Voucher" and "Post Batch Drafts" handlers with live ledger balancing updates.
  - Build real subledger reconciliation inspector and balancing action.
- **`organization-view.ts`:**
  - Build real interactive "Add Company" modal (Entity Code, Legal Name, Currency, Tax ID).
  - Build real interactive "Add Branch" modal (Branch Code, Name, Company, Address).
- **`procurement-view.ts`:**
  - Build real interactive "Enroll Supplier" modal (Vendor Code, Name, Email, Payment Terms, Lead Time).
  - Connect "Catalog" action to real supplier catalog filter / view.
- **`registers-view.ts`:**
  - Build real interactive "Blind Cash Count" modal with live float variance calculation.
  - Connect "Refresh Sessions" to live state query.
- **`rbac-view.ts`:**
  - Connect staff invitation modal and link generator to persistent roster.
  - Build real scope configuration modal.
- **`dashboard-view.ts`:**
  - Connect "Refresh Ledgers" to actual telemetry refetch with loading indicator.
  - Connect "Export Briefing" to real CSV / JSON report file generation and browser download trigger.

### Stage ACT-3: Master Workspace Views Remediation (`packages/ui/src/workspace-views.ts`)
- Replace every raw `${toastFn}('...')` string with real action handler invocations on `window.stokrovaApp`:
  - `exportExecutiveReport()`: Generates and downloads real CSV report blob.
  - `convertQuoteToSalesOrder(quoteId)`: Updates quote state to `CONVERTED` and creates sales order.
  - `recordInboundGRN(poId)`: Records Goods Received Note and updates inventory availability.
  - `submitWavePick()`: Updates wave status to `PACKING_DOCK`.
  - `printBillOfLading()`: Opens real printable Bill of Lading window.
  - `deliverAndSignPod(shipmentId)`: Records electronic POD signature and completes delivery.
  - `recordAssemblyOutput()`: Records assembly output into finished goods ledger.
  - `exportFiscalAudit()`: Generates and downloads compliant fiscal tax audit file.
  - `resetStaffPin(userId)`: Triggers secure PIN reset token generation.
  - `testPrintHardware()`: Tests ESC/POS printer status and prints test ticket.
  - `simulateWorkflowDryRun()`: Executes DAG rule engine dry-run and displays step execution results.

### Stage ACT-4: POS Terminal & Mobile Outbox Verification
- Verify POS Terminal split tender validation and change calculation.
- Verify ticket holding and recall persistence.
- Verify Mobile Outbox mutation counting and offline pending indicator.

### Stage ACT-5: Automated Test Matrix & Regression Suite
- Add end-to-end and unit tests in `apps/admin-web/test/` and `packages/ui/test/`.
- Verify:
  - Button disabling during in-flight operations.
  - Successful operations produce `SUCCEEDED` with verified payload.
  - Network errors produce `FAILED` without fake success.
  - Offline operations produce `ACCEPTED_PENDING` with queue depth.

### Stage ACT-6: Certification & Sign-Off
- Complete all 6 mandatory documents in `docs/quality/`.
- Run full typecheck and monorepo test suite.
- Certify `REAL_ACTIONS_AND_FEEDBACK_VERIFIED`.
