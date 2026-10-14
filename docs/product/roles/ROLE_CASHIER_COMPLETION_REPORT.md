# STOKROVA Role Realization & Verification Report: Head Cashier

**Role Identifier:** `CASHIER`  
**Persona Benchmark:** Emma Watson (Head Cashier — Front Counter Till 01)  
**Execution Phase:** Phase R02 (Store Management & Counter Operations)  
**Status:** `VERIFIED_COMPLETE`  
**Test Suites:**
- `apps/pos-desktop/tests/pos-shell.spec.ts` (9/9 passing)
- `apps/pos-desktop/tests/pos-views.spec.ts` (8/8 passing)
- `apps/admin-web/tests/business-owner-workspace.spec.ts` (Passing)
**Platform Release Artifacts:**
- `apps/admin-web/dist/index.html` (Persona selection: `Head Cashier (Emma Watson)`)
- `@stokrova/pos-desktop` (Native Electron & Web high-speed terminal)

---

## 1. Executive Summary

The Cashier workspace is designed for rapid, error-free point-of-sale operations under high foot-traffic conditions. The interface focuses strictly on rapid barcode scanning, fast-touch tile matrices, split-tender settlement, held order parking/recalling, thermal receipt generation, and opening/closing cash float management. All back-office menus, general ledger journals, and administrative settings are withheld from the cashier's view.

---

## 2. Authentication & Landing Route Traceability

| Stage | Expected Behavior | Observed & Verified Implementation |
|---|---|---|
| **Login Entrypoint** | `/pos` or 4-digit quick PIN authentication | Validates cashier PIN, binds active register session (`REG-LON-01`), and locks to till scope. |
| **Landing Route** | `/pos` (`ws-view-pos` / `pos-desktop` Shell) | Displays high-speed register terminal with numeric keypad, barcode input, cart ticket, and quick-touch items. |
| **Scope Resolution** | Register-scoped (`register:reg_lon_01`) | Actions are restricted to the assigned physical cash drawer and register station. |
| **Persona Switching** | Top navigation persona selector (`CASHIER`) | Filters navigation to Point of Sale, Product Lookup, and Order History. Automatically opens POS view. |

---

## 3. Core Operational Capabilities & Realizations

### 3.1 Barcode Scanning & Acoustic Feedback
- Hardware barcode wedge scanner support (USB / Bluetooth HID) with instant autofocus.
- Fast SKU manual entry with automatic return key handling (`addBarcodeToCart`).
- Real-time cart calculations with line-item quantity adjustments, unit prices, and subtotal updates.

### 3.2 Split-Tender Payment Processing & Idempotency (Rule 8)
- Accepts multi-tender payments across Cash, Credit Card (EMV/NFC), and Gift Card / Loyalty Vouchers (`PosSplitTenderModal`).
- Idempotency key assigned to every payment transaction to prevent duplicate card charges upon network retry.
- Instant change calculation displayed in high-contrast typography.

### 3.3 Held Orders (Park & Recall)
- Cashiers can park up to 10 active tickets (`PosHeldTicketsModal`) when a customer needs time to retrieve payment.
- Unparks ticket with preserved line items, discounts, and customer associations with a single tap.

### 3.4 Immediate Double-Entry Ledger Posting
- Completing a sale automatically triggers the double-entry accounting hook (`completeSale`).
- Immediately generates journal entry:
  - `DR 1010 Cash at Bank: $Total`
  - `CR 4010 Retail Revenue: $Total`
- Verifies zero debit/credit discrepancy (`Delta: $0.00`).

### 3.5 ESC/POS Thermal Receipt Printing
- Generates 80mm / 58mm thermal receipts with store header, tax breakdown, barcode, and fiscal tamper-proof hash (`ReceiptEngine`).

---

## 4. Architectural Invariant Compliance

- **Rule 7 (Never Treat Receipts as Financial Truth):** The paper or digital receipt is merely a proof of transaction; financial truth resides exclusively in the double-entry general ledger.
- **Rule 8 (Never Allow Payment Retries to Duplicate Payments):** Client-side unique transaction UUIDs ensure duplicate retries are recognized as identical idempotent requests.
- **Rule 24 (Always Make Offline Behavior Explicit):** Offline status is signaled via amber indicators; offline sales queue locally in IndexedDB and synchronize automatically upon network resumption.

---

## 5. Certification Sign-off

- [x] High-speed POS register terminal tested and operational.
- [x] Real-time cart calculations and double-entry ledger integration certified.
- [x] Held tickets, split-tender, and thermal receipt generation fully verified.
- [x] 17 dedicated tests passing in `@stokrova/pos-desktop`.

**Certified by:** Antigravity (UI/UX & Platform Lead)  
**Date:** October 14, 2026
