# Reference Projects

**Purpose**: Study mature ideas and real-world domain patterns from industry-leading open-source systems without turning STOKROVA into an inconsistent source-code mixture.

We analyze six foundational references:
1. **ERPNext** (Enterprise ERP & Accounting Core)
2. **Odoo** (Modular Business Ecosystem & Unified POS)
3. **InvenTree** (Deep Inventory, Parts, Variants & Engineering BOM)
4. **OpenBoxes** (Warehouse Management, Bins, Lots, Expiry & Logistics)
5. **TetherPOS** (Lightweight Retail Checkout UX & Register Speed)
6. **QuickStock Sync** (Offline Outbox & Local Storage Resilience)

---

## 1. ERPNext

- **Repository**: `https://github.com/frappe/erpnext`
- **License**: GPLv3 (Study only; do not copy source directly).
- **Core Insights to Study**:
  - Double-entry general ledger integration with sales and inventory movements.
  - Multi-company organizational hierarchy and consolidation.
  - Procurement cycles (Material Request $\rightarrow$ RFQ $\rightarrow$ Supplier Quotation $\rightarrow$ Purchase Order $\rightarrow$ Purchase Receipt $\rightarrow$ Purchase Invoice).
  - Configurable document workflows and permission managers.
  - Valuation methods (FIFO, Moving Average).

---

## 2. Odoo

- **Repository**: `https://github.com/odoo/odoo`
- **License**: LGPLv3 Core / Proprietary Enterprise (Study only).
- **Core Insights to Study**:
  - Deep modularity and unified business application ecosystem.
  - Double-entry stock routing philosophy (all movements are location transfers).
  - Integrated browser-based POS connecting with hardware peripherals.
  - Multi-warehouse routing (drop-shipping, cross-docking, automated replenishment rules).
  - Price list rules, volume breaks, and customer group discounts.

---

## 3. InvenTree

- **Repository**: `https://github.com/inventree/inventree`
- **License**: MIT (Study/learn).
- **Core Insights to Study**:
  - Rigorous inventory domain modeling: parts, variants, parameters, and attachments.
  - Granular stock tracking: serial numbers, batch/lot tracking, and stock location hierarchy.
  - Bills of Materials (BOM), multi-level subassemblies, and build orders.
  - Stock allocation against sales and build orders before physical movement.
  - Comprehensive stock movement history and auditable adjustments.

---

## 4. OpenBoxes

- **Repository**: `https://github.com/openboxes/openboxes`
- **License**: Eclipse Public License 2.0 (EPL-2.0).
- **Core Insights to Study**:
  - Serious warehouse logistics: zones, aisles, racks, shelves, and bins.
  - First Expired, First Out (FEFO) picking logic and strict expiry date controls.
  - Cold-chain and regulated/medical inventory handling.
  - Inbound receiving inspection, cross-docking, pick lists, and packing slips.
  - Requisition workflows and multi-site inter-facility transfers.

---

## 5. TetherPOS

- **Repository**: `https://github.com/paulo-aunor/tetherpos`
- **License**: Open Source (Study/learn).
- **Core Insights to Study**:
  - High-speed cashier UI ergonomics and keyboard shortcuts.
  - Fast barcode scanning and cart calculation.
  - Local database presentation patterns and responsive touch interfaces.
  - Cash register and till operations for daily retail.

---

## 6. QuickStock Sync

- **Repository**: `https://github.com/SHalimoosavi/SYJ-QuickStock-Sync`
- **License**: MIT (Study/learn).
- **Core Insights to Study**:
  - Local-first architecture: capturing operations when completely disconnected.
  - Outbox operation buffering and retry policies.
  - Lightweight scanning workflows on handheld/desktop clients.
  - Synchronization state transitions and connection status monitoring.

---

## 7. Research & Governance Rule

For every pattern, domain insight, or conceptual structure analyzed from these repositories:
1. **Never copy GPL/LGPL/EPL code directly into the STOKROVA codebase**.
2. **Implement every capability independently in clean TypeScript** within the appropriate bounded context (`packages/domain`, `packages/contracts`, `apps/api`).
3. **Record architectural insights and capability comparisons** under `docs/reference-analysis/`.

---

## 8. The Superiority Mandate: Surpassing Every Reference System

For every domain model, API, engine, and interface built into STOKROVA:
1. **Analyze the Reference Benchmark**: Examine how InvenTree, OpenBoxes, Odoo, ERPNext, TetherPOS, or QuickStock Sync implement it. Identify their limitations, coupling, mutable schema shortcuts, slow database queries, or form-heavy UX.
2. **Elevate Architecture & Invariants**: Implement the capability in pure TypeScript with mathematical invariants (immutable ledgers, double-entry truth), compile-time contract type safety, and offline-first local SQLite resilience.
3. **Elevate UI & UX**: Craft high-speed, keyboard-first, touch-responsive, and visually refined interfaces with clear spatial hierarchy that eliminate the friction and clunkiness of legacy ERP screens.
4. **Target Superiority, Never Mere Parity**: We do not merely replicate reference features; we build them to a higher class in speed, elegance, auditability, and ergonomics.
