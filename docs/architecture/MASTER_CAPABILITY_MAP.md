# STOKROVA Master Capability Map & Domain Blueprint

## 1. Executive Product Vision

**STOKROVA** is a **World-Class Inventory, Commerce & Business Operations Platform**.

It enables any business to manage the complete physical-goods lifecycle—from procurement and supplier relationships through receiving, multi-echelon warehousing, inventory control, sales, multi-channel fulfillment, payments, transfers, returns, financial accounting, and operational intelligence.

```text
               SINGLE TRADER (Zero-friction unified screen)
                     ↓
               SMALL SHOP / RETAIL STORE
                     ↓
               WHOLESALE BUSINESS
                     ↓
               DISTRIBUTOR / LOGISTICS HUB
                     ↓
               MULTI-BRANCH COMPANY
                     ↓
               LARGE ENTERPRISE (Multi-company, multi-warehouse)
```

The central architectural axiom:
> **"The business does not adapt itself to our software. Our software adapts itself to the business."**

---

## 2. The 14 Foundational Questions

A world-class inventory platform does not simply store a mutable integer balance. Every entity and transaction answers:

1. **WHAT** does the business own? *(Products, variants, kits, lots, serials, assets)*
2. **WHERE** is it physically located? *(Branch, warehouse, zone, aisle, rack, shelf, bin)*
3. **HOW MUCH** exists? *(On-hand, available, reserved, allocated, damaged, quarantined, in-transit, safety stock)*
4. **WHO** controls and is accountable for it? *(Owner, branch manager, custodian, work center)*
5. **WHERE** did it come from? *(Supplier, purchase order, manufacture batch, return, transfer)*
6. **WHERE** is it going? *(Customer order, branch transfer, repair, scrap, delivery route)*
7. **WHO** ordered it? *(Customer, sales representative, purchasing agent, system replenishment rule)*
8. **WHO** sold it? *(Cashier, B2B account rep, e-commerce channel)*
9. **WHO** received it? *(Receiving clerk, inspection officer)*
10. **WHO** moved it? *(Warehouse picker, forklift operator, delivery driver)*
11. **WHO** approved it? *(Manager, credit controller, automated declarative policy)*
12. **HOW** was it paid for? *(Cash, bank transfer, card, credit terms, split tender)*
13. **WHEN** did every action happen? *(Client event timestamp, server received timestamp, immutable ledger timestamp)*
14. **WHY** did the balance or state change? *(13+ typed movement reasons, audit event trails)*

---

## 3. The 12 Platform Capability Domains

```text
                                 STOKROVA BUSINESS PLATFORM
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
   COMMERCE                              INVENTORY                              OPERATIONS
  ├── Sales & Orders                    ├── Products & Variants                ├── Graph Workflow Engine
  ├── POS Checkout                      ├── 8-Tier Locations                   ├── Work Centers & Stations
  ├── Customers & Groups                ├── Stock State Engine                 ├── Task Queues & Leases
  ├── Dynamic Pricing                   ├── Lots, Batches & Serials            ├── Approvals & Declarative Rules
  └── Wholesale & Quotes                └── Traceability & Movements           └── Multi-Role Scoped RBAC
      │                                      │                                      │
      ├──────────────────────────────────────┼──────────────────────────────────────┤
      │                                      │                                      │
  PROCUREMENT                             FINANCE                               LOGISTICS
  ├── Suppliers & RFQs                  ├── Registers & Till Sessions          ├── Picking & Packing
  ├── Purchase Orders                   ├── Blind Cash Reconciliation          ├── Verification & Dispatch
  ├── Receiving & Inspection            ├── Invoices & Payments                ├── Inter-Branch Transfers
  ├── Landed Costs                      ├── Expenses & Payables                ├── In-Transit Tracking
  └── Supplier Performance              └── Double-Entry General Ledger        └── Proof of Delivery
      │                                      │                                      │
      ├──────────────────────────────────────┼──────────────────────────────────────┤
      │                                      │                                      │
 MANUFACTURING                           ANALYTICS                               PLATFORM
  ├── Bills of Materials (BOM)          ├── Real-Time Dashboards               ├── Isolated Multi-Tenancy
  ├── Production & Work Orders          ├── ADS Forecasting                    ├── Offline-First SQLite Sync
  ├── Material Consumption              ├── Replenishment Intelligence         ├── Append-Only Audit Trail
  ├── Assembly & Disassembly            ├── Dead Stock & Expiry Alerts         ├── Hardware & Device Ecosystem
  └── Production Costing                └── Financial & Margin Analysis        └── Integrations & Webhooks
```

---

## 4. Architectural Benchmark: What "World-Class" Means

| Standard | Traditional Legacy Systems | STOKROVA Platform Standard |
| :--- | :--- | :--- |
| **Data Integrity** | Mutable `stock` column, prone to silent drift | Mathematically pure immutable movement ledger: $\text{Stock} = \sum(\text{Movements})$ |
| **Financial Rigor** | Receipts used as financial truth | Double-entry journal entries; payments separated from receipt reprints |
| **Offline Resilience**| Online-only or fragile browser web cache | First-class local SQLite on native desktop/mobile with deterministic outbox sync |
| **Workflow Flexibility**| Hardcoded monolithic state machines | Versioned Directed Acyclic Graph (DAG) with concurrency-leased task queues |
| **Progressive UX** | Massive enterprise forms or toy checkout screens | Scales progressively from single-screen solo trader to enterprise multi-warehouse |
| **Traceability** | Stock count only | Complete genealogy: Supplier $\rightarrow$ PO $\rightarrow$ Batch/Serial $\rightarrow$ Warehouse $\rightarrow$ Transfer $\rightarrow$ Sale $\rightarrow$ Customer |

---

## 5. Implementation Milestones & Certification Gates

| Phase | Domain / Focus | Quality Gate | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Platform Foundation, Tenancy, RBAC & Work Centers | `READY_FOR_PHASE_2` | **COMPLETE** |
| **Phase 2** | Deep Inventory Core, Materialized Balances & Stock Ledger | `READY_FOR_PHASE_3` | **COMPLETE** |
| **Phase 3** | Multi-Channel Commerce, POS & Customer Payments | `READY_FOR_PHASE_4` | **COMPLETE** |
| **Phase 4** | Procurement, Receiving, Landed Cost & 3-Way Matching | `READY_FOR_PHASE_5` | **COMPLETE** |
| **Phase 5** | Manufacturing, BOMs, Production Orders & Genealogy | `READY_FOR_PHASE_6` | **COMPLETE** |
| **Phase 6** | Financial Accounting, General Ledger, AR/AP & Fiscal Periods | `READY_FOR_PHASE_7` | **COMPLETE** |
| **Phase 7** | Multi-Entity Consolidation, Intercompany, Treasury & Tax | `READY_FOR_PHASE_8` | **COMPLETE** |
| **Phase 8** | Advanced Pricing, Promotions, Loyalty, Rebates & Incentives | `READY_FOR_PHASE_9` | **COMPLETE** |
| **Phase 9** | CRM, Marketing Automation & Customer Engagement | `READY_FOR_PHASE_10` | **COMPLETE** |
| **Phase 10** | Advanced Logistics, Fulfillment & Distribution | `READY_FOR_PHASE_11` | **COMPLETE** |
| **Phase 11** | Enterprise Reporting, Analytics & Business Intelligence | `READY_FOR_PHASE_12` | **COMPLETE** |

