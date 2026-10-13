# Reference Architecture Comparison Matrix & Capability Benchmark

## 1. Architectural Foundation Comparison

| Dimension | ERPNext | Odoo | InvenTree | OpenBoxes | TetherPOS | QuickStock Sync | **STOKROVA Target** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Language** | Python / JS | Python / JS | Python | Groovy / Java | JavaScript / TS | JavaScript | **TypeScript Full-Stack** |
| **Backend Framework** | Frappe | Custom ORM | Django | Grails / Spring | None (client-only) | Node (lightweight) | **NestJS (Modular Monolith)** |
| **Central Database** | MariaDB | PostgreSQL | PostgreSQL | MySQL / MariaDB | None | File / JSON | **PostgreSQL 18.x + Drizzle ORM** |
| **Local Client DB** | None | None / Web cache | None | None | Dexie (IndexedDB) | Local JSON / Web | **SQLite (Tauri 2 & Expo) / IDB** |
| **Stock Ledger Model** | Append-only ledger | Double-entry locations | Status & balance | Balance & transactions | Mutated stock | Mutated stock | **Immutable Movement Ledger** |
| **Offline-First Sync** | No | Limited (Web POS) | No | No | None | Outbox queue (LWW) | **Idempotent Outbox + Cursor Feed** |
| **Financial Journals** | Double-entry GL | Double-entry GL | None | None | Simple totals | None | **Append-Only Double-Entry Journal** |
| **Multi-Tenancy** | Multi-company | Multi-company | Single instance | Single instance | Single store | Single shop | **Isolated Tenant Hierarchy** |
| **Target Scale** | SMB $\rightarrow$ Enterprise | SMB $\rightarrow$ Enterprise | Maker $\rightarrow$ Warehouse | Warehouse/Logistics | Single retail store | Small trader | **Small Trader $\rightarrow$ Enterprise** |
| **License** | GPLv3 (Study only) | LGPLv3 / Proprietary | MIT (Study/learn) | EPL-2.0 (Study) | Open (Study/learn) | MIT (Study/learn) | **Independent Proprietary IP** |

---

## 2. Master Capability Matrix Across the Six References

Based on deep capability analysis across the six reference systems, the following matrix benchmarks where each project excels and how STOKROVA targets a superior unified baseline:

| Domain | ERPNext | Odoo | InvenTree | OpenBoxes | TetherPOS | QuickStock | **STOKROVA Target** | Architectural Advantage |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Products & Variants** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Superior** | Universal variant attributes, matrix generation, multiple barcodes & packaging kits |
| **Inventory Ledger** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Superior** | Mathematically pure immutable movement ledger: $\text{Stock} = \sum(\text{Movements})$; zero direct mutation |
| **Warehouses & Bins** | ✓ | ✓ | ✓ | ✓ | — | ✓ | **Superior** | 8-tier location hierarchy (Tenant $\rightarrow$ Company $\rightarrow$ Branch $\rightarrow$ Warehouse $\rightarrow$ Zone $\rightarrow$ Aisle $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin) |
| **Point of Sale (POS)** | ✓ | ✓ | — | — | ✓ | ✓ | **Superior** | High-speed desktop (Tauri 2) & mobile (Expo), blind till reconciliation, register sessions, offline-first |
| **Purchasing & RFQs** | ✓ | ✓ | ✓ | ✓ | — | — | **Superior** | RFQ $\rightarrow$ Supplier Quotes $\rightarrow$ PO $\rightarrow$ Goods Receipt $\rightarrow$ Quality Inspection $\rightarrow$ Invoicing |
| **Sales & Quotations** | ✓ | ✓ | — | — | ✓ | ✓ | **Superior** | Unified commerce engine: single core for Retail POS, Wholesale Orders, and Distribution |
| **Workflows & Approvals**| ✓ | ✓ | — | — | — | — | **More Flexible**| Graph-based DAG workflows with parallel fork/join, task queues, concurrency leases, zero code execution |
| **Offline-First Resilience**| Limited | Limited | — | — | Varies | ✓ | **First-Class** | Local SQLite on native desktop/mobile, atomic command outbox, idempotent inbox, monotonic cursors |
| **Multi-Branch Topology**| ✓ | ✓ | — | ✓ | ✓ | — | **Superior** | Centralized catalog, branch-specific pricing, transit tracking, work center segregation |
| **Lots, Batches & Serials**| ✓ | ✓ | ✓ | ✓ | Varies | — | **Superior** | First-class FEFO (First Expired First Out) & FIFO, serial genealogy, regulatory compliance |
| **Manufacturing (BOM)** | ✓ | ✓ | ✓ | — | — | — | **Planned** | Multi-level Bills of Materials, work orders, scrap tracking, assembly/disassembly |
| **Finance & Accounting** | ✓ | ✓ | — | — | — | — | **Integrated** | Double-entry general ledger, chart of accounts, immutable journals, COGS, tax profiles |
| **Analytics & Intelligence**| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Superior** | ADS forecasting, lead-time reordering, dead stock detection, cashier variance tracking |
| **Synchronization** | Limited | Limited | — | — | — | ✓ | **First-Class** | Fully deterministic sync protocol: zero last-write-wins for financial/stock data, auditable exceptions |

---

## 3. Synthesis & Strategic Differentiation

The six reference repositories are valuable research pillars, but no single one combines:
1. **Deep physical goods inventory** (InvenTree / OpenBoxes),
2. **Comprehensive enterprise ERP & accounting** (ERPNext / Odoo),
3. **High-speed retail cashier operations** (TetherPOS), and
4. **Resilient offline-first synchronization** (QuickStock Sync),
...all built on a **modern TypeScript modular monolith**, with **immutable ledgers**, **configurable DAG workflows**, and **progressive complexity** that equally empowers a solo shopkeeper and an enterprise distributor.

STOKROVA establishes this unified, superior platform from day one.
