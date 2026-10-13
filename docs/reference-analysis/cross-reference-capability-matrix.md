# Cross-Reference Capability Benchmark Matrix

## 1. Comprehensive Capability Benchmark

Classification Key:
- **Strong**: Mature, first-class capability.
- **Moderate**: Supported with notable limitations or friction.
- **Weak**: Rudimentary or fragile implementation.
- **Missing**: Not present or out of scope for that system.
- **Superior**: STOKROVA's target baseline combining best practices and addressing all weaknesses.

| Capability Domain | ERPNext | Odoo | InvenTree | OpenBoxes | TetherPOS | QuickStock Sync | **STOKROVA Design** | Architectural Decision |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Product Master & Variants** | Strong | Strong | Strong | Moderate | Weak | Weak | **Superior** | Multi-dimensional variant matrix generator, universal 1D/2D barcodes, packaging kits, and units of measure. |
| **Units of Measure (UOM)** | Strong | Strong | Moderate | Moderate | Missing | Missing | **Superior** | Fractional-precision arithmetic with base UOM and auditable conversion ratios. |
| **Stock Ledger Architecture** | Strong | Strong | Moderate | Moderate | Weak | Weak | **Superior** | Pure immutable `inventory_movements` ledger: $\text{Stock} = \sum(\text{Movements})$; zero direct balance mutation. |
| **Storage Location Depth** | Moderate | Strong | Strong | Strong | Missing | Missing | **Superior** | 8-Tier physical hierarchy: Tenant $\rightarrow$ Company $\rightarrow$ Branch $\rightarrow$ Warehouse $\rightarrow$ Zone $\rightarrow$ Aisle $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin with materialized paths. |
| **Lots, Batches & Serials** | Strong | Strong | Strong | Strong | Missing | Missing | **Superior** | First-class FEFO (First Expired First Out) picking for batches; unique lifetime state tracking for discrete serials. |
| **Retail Point-of-Sale (POS)** | Moderate | Strong | Missing | Missing | Strong | Weak | **Superior** | Native Tauri 2 desktop & Expo mobile with local SQLite, barcode scanning, split tender, and register sessions. |
| **Cash Registers & Tills** | Moderate | Moderate | Missing | Missing | Moderate | Missing | **Superior** | Explicit `RegisterSession` with opening float, real-time cash movements, and blind closing reconciliation. |
| **Procurement & RFQs** | Strong | Strong | Strong | Strong | Missing | Missing | **Superior** | Full 6-stage procurement cycle (Requisition $\rightarrow$ RFQ $\rightarrow$ Quote $\rightarrow$ PO $\rightarrow$ GRN $\rightarrow$ Inspection $\rightarrow$ 3-Way Match). |
| **B2B Wholesale & Credit** | Strong | Strong | Missing | Missing | Missing | Missing | **Superior** | Credit limits, payment terms, customer tier pricing, quotes, sales orders, and customer statements. |
| **Multi-Branch & Transfers** | Strong | Strong | Missing | Strong | Missing | Missing | **Superior** | Central catalog, branch overrides, in-transit virtual location tracking, and transit loss resolution. |
| **Workflow Engine** | Moderate | Moderate | Missing | Missing | Missing | Missing | **Superior** | Directed Acyclic Graph (DAG) with parallel fork/join, task queues, concurrency leases, and version immutability. |
| **Declarative Rules & Approvals**| Moderate | Moderate | Missing | Missing | Missing | Missing | **Superior** | Pure declarative rule evaluation (zero tenant code execution) with approval request inboxes. |
| **Offline-First Resilience** | Weak | Weak | Missing | Missing | Weak | Strong | **Superior** | Native local SQLite on desktop/mobile, atomic command outbox, idempotent inbox, monotonic cursors. |
| **Multi-Tenancy** | Moderate | Moderate | Missing | Missing | Missing | Missing | **Superior** | Full SaaS tenant isolation at schema/query level, separated Super Admin vs Business Owner roles. |
| **Scoped Dynamic RBAC** | Moderate | Moderate | Weak | Weak | Missing | Missing | **Superior** | Fine-grained capability codes with multi-dimensional scope (Tenant, Company, Branch, Warehouse, Register, Work Center). |
| **Accounting & General Ledger**| Strong | Strong | Missing | Missing | Missing | Missing | **Superior** | Double-entry chart of accounts, immutable general journal entries ($\sum \text{debits} = \sum \text{credits}$), reversing entries. |
| **Manufacturing (BOM)** | Strong | Strong | Strong | Missing | Missing | Missing | **Planned** | Multi-level Bills of Materials, work orders, material consumption movements, and production costing. |
| **Replenishment Intelligence** | Moderate | Moderate | Weak | Weak | Missing | Missing | **Superior** | Average Daily Sales (ADS) calculation, Reorder Point (ROP) modeling, and dead stock early warnings. |
| **Audit & Governance** | Moderate | Moderate | Moderate | Moderate | Missing | Missing | **Superior** | Append-only audit records, sensitive data redaction, device/station tracking, and security event alerts. |
| **Hardware & Peripherals** | Moderate | Strong | Weak | Missing | Moderate | Missing | **Superior** | Direct support for ESC/POS thermal printers, 1D/2D scanners, cash drawer kickout, and digital weighing scales. |

---

## 2. Summary of Strategic Synthesis

STOKROVA synthesizes the best aspects of all six systems:
- The **accounting and enterprise breadth** of ERPNext
- The **modular business ecosystem and location routing** of Odoo
- The **deep inventory, variant, and serial discipline** of InvenTree
- The **warehouse bin topography, lot/expiry tracking, and FEFO picking** of OpenBoxes
- The **cashier-speed retail checkout ergonomics** of TetherPOS
- The **offline-first outbox and sync mindset** of QuickStock Sync

...while building on a modern, unified TypeScript modular monolith with mathematically sound invariants, compile-time type safety, and progressive complexity.
