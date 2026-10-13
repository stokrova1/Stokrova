# STOKROVA Phase Boundaries & Scope Separation

## 1. Executive Strategy: Preventing Scope Explosion

To deliver a production-grade enterprise platform, STOKROVA enforces strict phase boundaries. We do not attempt to build POS interfaces, procurement, warehouse picking, and accounting simultaneously. 

Every phase builds upon the mathematically hardened foundation established by prior phases.

```text
PHASE 0 / 0.5: Architecture, Reference Intelligence & Blueprint (COMPLETED)
     ↓
PHASE 1: Operational Foundation & Business Engine (ESTABLISHED & VERIFIED)
     ↓
PHASE 2: Product Master & Deep Inventory Core (NEXT IMPLEMENTATION TARGET)
     ↓
PHASE 3+: Commerce, Procurement, Warehouse, Finance & Enterprise Scale
```

---

## 2. Phase 1 Scope: Operational Foundation & Business Engine

Phase 1 provides the foundational platform services upon which all physical goods and commerce operations execute:

| Sub-Phase | Core Responsibility | Implemented Artifacts & Invariants |
| :--- | :--- | :--- |
| **Phase 1A: Tenancy & Identity** | Multi-tenant isolation & authentication | Supabase Auth JWT validation, `TenantGuard`, atomic provisioning of Tenant $\rightarrow$ Company $\rightarrow$ Branch $\rightarrow$ Owner. |
| **Phase 1B: Scoped Dynamic RBAC** | Capability-based access control | `StandardPermissions`, role templates, custom roles, multi-dimensional scoping (`Tenant → Company → Branch → WH → Register → Station`). |
| **Phase 1C: Registers & Work Centers** | Cash truth & operational stations | First-class registers, `RegisterSession` with opening float, real-time cash moves, blind closing count, variance computation. |
| **Phase 1D: Directed Workflow Engine** | Operations orchestration & queues | Directed workflow graphs, version immutability, task queues, lease-based concurrency locking, anti-cycle execution bounds. |
| **Phase 1E: Declarative Rules** | Manager approvals & policy | Pure declarative condition evaluation (zero arbitrary code execution), approval request routing. |
| **Phase 1F: Payments Foundation** | Financial truth & receipt safety | Idempotent payment recording (`operation_id`), payment methods, receipt print events with reprint tracking (`Order != Invoice != Payment != Receipt`). |
| **Phase 1G: Offline Sync & Audit** | Local-first outbox & tamper-proof audit | Registered devices, client SQLite outbox schema, server idempotent inbox, monotonic change feeds, append-only audit & security events. |

---

## 3. Phase 2 Scope: Product Master & Deep Inventory Core

Phase 2 builds the physical-goods catalog and inventory ledger directly upon Phase 1's tenancy, RBAC, and storage foundation:

1. **Units of Measure (UOM), Categories & Brands**:
   - Base stock units and auditable unit conversions with fractional precision arithmetic.
   - Hierarchical category taxonomy and brand registries.
2. **Product Master & Universal Variant Matrix**:
   - Product concepts, attribute dimensions (Size, Color, Material), and values.
   - Universal Matrix Generator expanding dimensions into sellable variants with deterministic SKUs and 1D/2D barcodes.
3. **8-Tier Physical Storage Locations**:
   - Topology: `Tenant → Company → Branch → Warehouse → Zone → Aisle → Rack → Shelf → Bin`.
   - Materialized path indexing (`WH/ZONE/AISLE/RACK/SHELF/BIN`) for sub-millisecond tree queries.
4. **Deep Inventory Engine & Invariant Truth**:
   - Append-only immutable `inventory_movements` ledger (13 typed movements).
   - Physical stock partitions decoupled from commitments:
     $$\text{Physical On-Hand} = \text{Physically Unrestricted} + \text{Quarantined} + \text{Damaged} + \text{Physically Restricted}$$
     $$\text{Available to Promise (ATP)} = \text{Physically Unrestricted} - (\text{Allocated} + \text{Reserved})$$
5. **Lots, Batches & Discrete Serials**:
   - Batch numbers, manufacture dates, expiration dates, and FEFO picking priority.
   - Discrete serial number tracking with unique unit lifecycle state machines.
6. **Price Lists & Tax Profiles**:
   - Retail, wholesale, and distributor price lists with branch-level overrides and volume breaks.
   - Configurable tax profiles (VAT, sales tax, exempt, inclusive/exclusive).
7. **Product Media Integration**:
   - Cloudflare R2 object storage provider integration with variant-specific image mapping.

---

## 4. Future Phases: Downstream Roadmap (Phases 3 through 9)

The following domains are architecturally prepared for in Phase 0.5/1, but their implementation begins strictly after Phase 2:

- **Phase 3: Procurement & Suppliers**: RFQs, purchase orders, goods receipt notes (GRN), inbound inspection, 3-way matching, landed cost allocation.
- **Phase 4: Sales, Commerce & Point-of-Sale (POS)**: High-speed POS checkout, cart suspension, B2B wholesale orders, credit limits, delivery notes.
- **Phase 5: Warehouse Logistics & Fulfillment**: Wave picking, packing verification benches, dispatch manifests, inter-branch in-transit transfers.
- **Phase 6: Finance & Accounting**: Double-entry general ledger, chart of accounts, automated journal postings, financial statements.
- **Phase 7: Manufacturing & Assembly**: Bills of Materials (BOM), work orders, material consumption, kit assembly/disassembly.
- **Phase 8: Intelligence & Replenishment**: Average Daily Sales (ADS) calculation, Reorder Point (ROP) modeling, automated purchase requisition drafting.
- **Phase 9: Enterprise Platform**: Multi-company holding structures, third-party API webhooks, production observability, and performance scaling.
