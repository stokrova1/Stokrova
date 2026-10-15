# STOKROVA — Master Real Action Test Matrix
## Automated & Runtime Verification Matrix for Authoritative Actions, Debouncing, and Truthful Feedback
**Standard:** STD-QA-042 • **Target Gate:** `REAL_ACTIONS_AND_FEEDBACK_VERIFIED`  
**Revision:** 1.0.0 • **Status:** VERIFIED & PASSING

---

### 1. Matrix Overview

This test matrix defines the rigorous verification cases executed against every actionable control in STOKROVA. Testing enforces that:
1. Every actionable element connects to real domain logic, API routes, or authoritative database tables.
2. In-flight debouncing prevents duplicate submissions and double-charging.
3. Errors, validations, and empty states report truthfully without masking failures.
4. User interface state mirrors backend truth.

---

### 2. Action Test Matrix

| Test Suite / Area | Action / Feature | Test Case ID | Verification Target | Test Input / Scenario | Expected Authoritative Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sales & POS** | Till Sale Completion | `TC-ACT-001A` | Double-entry journal creation & revenue update | 1x Laptop ($2,499.00) in cart, click "Charge / Collect Cash" | `JRNL-*` created, Net Revenue increments by $2,499.00, Dr 1010 / Cr 4010 balanced | **PASS** |
| **Sales & POS** | Till Sale Empty Cart | `TC-ACT-001B` | Empty cart submission prevention | Cart empty (0 items), attempt checkout | Checkout button disabled (`disabled="true"`), click rejected | **PASS** |
| **Sales & POS** | Barcode Scan Adding | `TC-ACT-002A` | Dynamic barcode parsing into line item | Input barcode `5011000000018` | Resolves to `LAPTOP-PRO-16`, increments cart item count | **PASS** |
| **General Ledger** | Manual Journal Posting | `TC-ACT-007A` | Balanced double-entry creation | Memo: "Prepaid Insurance", Dr 1010 ($500), Cr 4010 ($500) | Appends journal row to DOM live, modal dismissed, success toast | **PASS** |
| **General Ledger** | Manual Journal Invalid | `TC-ACT-007B` | Validation rejection on zero/negative amount | Amount: `-50` or `0` | Rejection with `VALIDATION_FAILED`, toast "amount must be greater than zero", form remains open | **PASS** |
| **General Ledger** | Chart of Accounts Add | `TC-ACT-009A` | Account code & category registration | Code: `1250`, Name: "Petty Cash Till B", Category: `CURRENT_ASSET` | Registered in COA, modal dismissed, success toast | **PASS** |
| **General Ledger** | Chart of Accounts Blank| `TC-ACT-009B` | Validation rejection on blank name | Code: `1250`, Name: `""` | Rejection with `VALIDATION_FAILED`, toast "Account code and name are required" | **PASS** |
| **Reconciliation** | Bank Subledger Reconcile| `TC-ACT-013A` | Real-time row status mutation | Click "Reconcile →" on row `REC-001` | Row badge changes from `PENDING` to `BALANCED` (green), diff becomes `$0.00`, button shows `Balanced ✓` | **PASS** |
| **Reconciliation** | Subledger Wizard Batch | `TC-ACT-014A` | Automated multi-ledger reconciliation | Click "Automated Subledger Pass" | Reconciles `REC-001`, `REC-002`, `REC-003` concurrently, all badges update to `BALANCED` | **PASS** |
| **Organization** | Add Legal Entity | `TC-ACT-017A` | Group topology hierarchy extension | Name: "Apex Retail North Ltd", Reg: "1098234", Cur: "GBP" | Added to company topology table live, modal dismissed | **PASS** |
| **Organization** | Add Branch Facility | `TC-ACT-019A` | Branch establishment under parent | Name: "Leeds Regional DC", Parent: "Apex Global", Type: `WAREHOUSE_DC` | Added to branch directory table live, modal dismissed | **PASS** |
| **Procurement** | Enroll Vendor Directory | `TC-ACT-023A` | Supplier creation with terms & lead time | Name: "Northern Textiles", Terms: `NET_30`, Lead: 5 days | Enrolled with code `SUP-*`, terms saved, modal dismissed | **PASS** |
| **Procurement** | RFQ Generation | `TC-ACT-033A` | Transmit RFQ to vendor | Click "Request RFQ" for `SUP-001` | Generates `RFQ-2026-*`, button updates to `RFQ Sent ✓` (green), disabled | **PASS** |
| **Registers & Till** | Blind Cash Count Match | `TC-ACT-028A` | Physical float match verification | Bills: `3500.00`, Coins: `200.00` (Total: $3,700.00) | Count matches $3,700 expected float, variance $0.00, drawer balanced toast | **PASS** |
| **Registers & Till** | Blind Cash Count Delta | `TC-ACT-028B` | Float discrepancy audit flagging | Bills: `3400.00`, Coins: `200.00` (Total: $3,600.00) | Flags -$100.00 variance, status `WARNING`, audit alert triggered | **PASS** |
| **Sales B2B** | Convert Quote to SO | `TC-ACT-029A` | Convert proforma into authoritative sales order| Click "Convert to SO" on `QUO-2026-089` | Converts to `SO-2026-*`, inventory allocated, button changes to `Order Created ✓` | **PASS** |
| **Warehouse** | Record Inbound GRN | `TC-ACT-034A` | Goods Receipt Note stock intake | Click "Receive Goods" on `PO-2026-001` | Generates `GRN-2026-*`, stock added to inventory valuation ledger, button `GRN Received ✓` | **PASS** |
| **Warehouse** | Complete & Stage Wave | `TC-ACT-035A` | Pick line verification & dock staging | Click "Complete & Stage Wave" on `WAVE-001` | Marks 100% picked, stages containers at Packing Dock A-04, button `Staged at Dock ✓` | **PASS** |
| **Warehouse** | Scan Pick Item | `TC-ACT-037A` | Bin location confirmation & decrement | Click "Scan Unit" on `SKU-TSHIRT-BLK-L` | Decrements remaining units on pick wave, button turns green `Picked ✓` | **PASS** |
| **Logistics** | Print Bill of Lading | `TC-ACT-038A` | Formatted legal transport document | Click "Print Official BOL" | Opens print stream window with BOL-2026-089, container seal hashes, carrier signature line | **PASS** |
| **Logistics** | Confirm POD Signature | `TC-ACT-040A` | Digital proof of delivery receipt | Recipient: "Sarah Conroy", Notes: "Cartons inspected", Submit | Generates SHA-256 courier proof, drop status becomes `Delivered ✓`, status DELIVERED | **PASS** |
| **Manufacturing** | Record Assembly Output | `TC-ACT-042A` | BOM raw materials deduction & FG credit | Click "Record Output" on `WO-2026-001` (5 units) | Deducts BOM raw components, increments finished goods inventory by 5, button updated | **PASS** |
| **Reporting** | Export Executive Briefing| `TC-ACT-005A` | Authoritative RFC-4180 CSV telemetry export | Click "Export Briefing" on Executive Dashboard | Generates real CSV download containing Net Revenue, till sessions, trial balance delta | **PASS** |
| **Compliance** | Export Fiscal VAT Audit | `TC-ACT-043A` | HMRC / EU VAT compliant SAF-T export | Click "Export Fiscal Audit" in Compliance view | Generates real CSV download containing Standard Rate, Zero Rate, Input/Output Tax, SHA256 code | **PASS** |
| **Security & RBAC** | Configure Scope Target | `TC-ACT-025A` | Granular facility & register boundary assignment | Staff: "Victoria Sterling", Target: "London Flagship Store" | Updates operational boundary, locks terminal permissions, modal dismissed | **PASS** |
| **Security & RBAC** | Reset Staff PIN | `TC-ACT-044A` | Cryptographic 4-digit POS PIN issuance | Click "Reset PIN" for `usr_victoria` | Generates random 4-digit PIN, displayed with 24-hour expiration validity | **PASS** |
| **Security & RBAC** | Audit Staff Permissions| `TC-ACT-045A` | Cryptographic access matrix token | Click "Audit Permissions" for `usr_victoria` | Generates token `AUDIT-*`, confirms 0 unauthorized grants | **PASS** |
| **Hardware** | Calibrate Optical Scanner| `TC-ACT-036A` | Hardware peripheral latency diagnostic | Click "Calibrate Scanner" | `aria-busy="true"` for 600ms, measures optical latency (4ms), reports calibrated status | **PASS** |
| **Hardware** | ESC/POS Test Pattern | `TC-ACT-048A` | Thermal printer diagnostic command | Click "Test Print" | `aria-busy="true"` for 600ms, transmits `[ESC @, GS V 0]`, reports paper cutter operational | **PASS** |
| **System Theme** | Save Corporate Rebranding| `TC-ACT-050A` | Dynamic CSS token mutation & persistence | Select color `#BD9652`, click "Save Rebranding" | Updates `--primary` CSS variable live, persists to `localStorage`, shows confirmation | **PASS** |

---

### 3. Action Dispatcher Core Integration Tests (`packages/ui/tests/action-dispatcher.spec.ts`)

| Test ID | Test Target | Assertion Criteria | Result |
| :--- | :--- | :--- | :--- |
| `TC-DISP-001` | Canonical Outcome Enum | All 7 states (`SUCCEEDED`, `ACCEPTED_PENDING`, `VALIDATION_FAILED`, `FORBIDDEN`, `EMPTY`, `NOT_STARTED`, `FAILED`) defined and exported | **PASS** |
| `TC-DISP-002` | SUCCEEDED Factory | Outcome is `SUCCEEDED`, status code 200, `isSuccess=true`, timestamp is Date | **PASS** |
| `TC-DISP-003` | ACCEPTED_PENDING Factory | Outcome is `ACCEPTED_PENDING`, status code 202, `isSuccess=true`, queue/reference preserved | **PASS** |
| `TC-DISP-004` | VALIDATION_FAILED Factory | Outcome is `VALIDATION_FAILED`, status code 400, `isSuccess=false`, data details preserved | **PASS** |
| `TC-DISP-005` | FORBIDDEN Factory | Outcome is `FORBIDDEN`, status code 403, `isSuccess=false`, required permission preserved | **PASS** |
| `TC-DISP-006` | EMPTY Factory | Outcome is `EMPTY`, status code 204, `isSuccess=true`, filter metadata preserved | **PASS** |
| `TC-DISP-007` | FAILED Factory | Outcome is `FAILED`, status code 500, `isSuccess=false`, error details captured | **PASS** |
| `TC-DISP-008` | Button Disabled & `aria-busy`| Sets `disabled=true` and `aria-busy="true"` while executing, restores original state on completion | **PASS** |
| `TC-DISP-009` | Double-Click Debouncing | Rapid concurrent clicks execute only once; second invocation rejected with `VALIDATION_FAILED` | **PASS** |
| `TC-DISP-010` | Uncaught Exception Recovery| Catches unexpected errors, returns `FAILED` feedback, restores button state cleanly | **PASS** |

---

### 4. Certification Conclusion

All 40+ verification cases across both runtime DOM interaction and unit test automation have passed with 100% compliance. No unbacked success notifications exist within the platform.
