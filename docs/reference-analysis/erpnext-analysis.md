# ERPNext Reference Architecture & Capability Analysis

## 1. System Identity & Overview
- **Repository**: `https://github.com/frappe/erpnext`
- **Architecture**: Monolithic metadata-driven framework (Frappe) on Python, MariaDB, Redis, and Node.js.
- **License**: GPLv3
- **Primary Domain**: Comprehensive Enterprise Resource Planning (Accounting, Procurement, Sales, Inventory, Manufacturing, CRM, Assets).

---

## 2. Core Capabilities & Observed Architecture

### Capability A: Double-Entry General Ledger Integration
- **Reference Behavior**: Stock transactions (Purchase Receipt, Delivery Note, Stock Entry) generate automated balanced journal entries in the General Ledger (`tabGL Entry`).
- **Evidence**: `erpnext/stock/doctype/stock_ledger_entry` integrates with `erpnext/accounts/general_ledger.py`, creating real-time debit/credit postings.
- **Limitation**: Tightly coupled to MariaDB transactional locks. High-frequency sales checkout creates lock contention on central ledger tables.
- **STOKROVA Decision**: Implement an append-only double-entry general ledger in PostgreSQL 18.x with asynchronous posting queues for non-blocking retail checkout.
- **Reason**: Decouples high-throughput POS cart completion from heavy analytical ledger updates while guaranteeing eventual balance consistency.

### Capability B: Six-Stage Procurement Lifecycle
- **Reference Behavior**: Formal procurement chain: Material Request $\rightarrow$ RFQ $\rightarrow$ Supplier Quotation $\rightarrow$ Purchase Order $\rightarrow$ Purchase Receipt $\rightarrow$ Purchase Invoice.
- **Evidence**: Distinct DocTypes enforcing sequential status progression (`Draft` $\rightarrow$ `Submitted` $\rightarrow$ `Closed`).
- **Limitation**: Rigid document workflow; difficult to short-circuit for small emergency purchases without manual role overrides.
- **STOKROVA Decision**: Adopt the 6-stage procurement domain model, but orchestrate stages via our Directed Workflow Graph to allow both 1-click expedited purchasing and multi-stage enterprise procurement.
- **Reason**: Adapts procurement rigor to business scale without schema changes.

### Capability C: Valuation Methods (FIFO & Moving Average)
- **Reference Behavior**: Tracks incoming item valuation queues to calculate real-time Cost of Goods Sold (COGS).
- **Evidence**: `erpnext/stock/stock_ledger.py` maintains valuation rates on each posted stock ledger row.
- **Limitation**: Calculating running valuation dynamically inside request threads causes latency spikes during bulk adjustments.
- **STOKROVA Decision**: Store incoming unit cost on the `inventory_movements` ledger; calculate FIFO valuation via materialized ledger projections.
- **Reason**: Preserves historical cost immutability without slowing down live warehouse movements.

### Capability D: Offline Point-of-Sale (POS)
- **Reference Behavior**: Browser-based POS interface attempting client-side cart caching.
- **Evidence**: Frappe POS uses client-side JavaScript localStorage to cache items.
- **Limitation**: Network disconnects prevent server-side price rule validation and lead to synchronization failures upon reconnection.
- **STOKROVA Decision**: Embed native local transactional SQLite in desktop (Tauri 2) and mobile (Expo) clients with an atomic command outbox and monotonic sequence cursors.
- **Reason**: Guarantees true local-first offline operation with deterministic synchronization.
