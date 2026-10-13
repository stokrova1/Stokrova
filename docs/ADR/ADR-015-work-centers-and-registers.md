# ADR-015: Work Centers and Register/Till Cash Sessions

## Status
Accepted

## Context
In retail, wholesale, and distribution, cash management and task stations require strict physical accountability:
1. Cash shortages occur when cash transactions are not bound to an identifiable till session with open/close counts.
2. Orders move across stations (Sales Desk, Picking Station, Verification Station, Cashier Desk, Dispatch).
3. Receipts are often confused with payments; reprinting a receipt must never create an additional payment.

## Decision
1. **Registers & Tills as First-Class Entities**: Every cash-handling terminal operates within a `RegisterSession`:
   - Opening float
   - Real-time ledger of Cash In / Cash Out / Sales / Refunds
   - Blind closing count vs calculated expected balance
   - Mandatory variance recording and reconciliation
2. **Financial Truth Decoupled from Receipts**:
   - `Order` $\rightarrow$ `Invoice` $\rightarrow$ `Payment` $\rightarrow$ `Receipt`
   - Receipts are immutable print events and can be reprinted without affecting financial balances.
   - Payment methods have dedicated lifecycles (Cash immediate, Bank Transfer with `PENDING -> CONFIRMED` lifecycle, Card with authorization/capture).
3. **Generic Work Centers**: Model physical stations (`Sales Desk`, `Picking Station`, `Verification Station`, `Dispatch`) for task distribution.

## Consequences
- Complete fraud prevention and cash auditability for store owners.
- Eliminates duplicate payment anomalies on receipt reprints.
