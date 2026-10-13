# Odoo Reference Analysis

## 1. Overview & Repository

- **Repository**: `https://github.com/odoo/odoo`
- **License**: LGPLv3 (Community Core) / Proprietary (Enterprise)
- **Role in STOKROVA**: Reference for the modular business application ecosystem, inventory routing, POS integration, and extensibility patterns.

## 2. Key Architectural Strengths

1. **Vast Modular Business Ecosystem**:
   - Integrates inventory, sales, purchasing, POS, accounting, CRM, manufacturing, warehousing, and shipping under a single unified metadata-driven system.
2. **Double-Entry Inventory Routing Concept**:
   - Odoo treats inventory as a double-entry ledger where every stock movement is a transfer between locations (e.g. `Physical Locations/Stock` $\rightarrow$ `Partner Locations/Customers` or `Virtual Locations/Scrap`).
3. **Integrated Point-of-Sale (POS)**:
   - POS runs in the browser, supports offline cart caching, connects with local POS boxes for receipt printers/scanners, and synchronizes sales back to the inventory/accounting core.
4. **Multi-Company & Multi-Warehouse**:
   - Supports parent/child companies, inter-company transactions, and complex warehouse routes (Push/Pull rules, Drop-shipping, Cross-docking).

## 3. Architectural Limitations & Weaknesses

1. **Heavy Coupled Python ORM**:
   - Business logic is tightly bound to Odoo's custom Python ORM (`models.Model`), XML views, and PostgreSQL schema mutation mechanisms, making headless or decoupled API architectures cumbersome.
2. **Offline Fragility in POS**:
   - While the POS has client-side offline cart capabilities in JavaScript/IndexedDB, conflict resolution and deep inventory constraints during long network partitions are fragile.
3. **Monolithic DB Schema Coupling**:
   - Modules frequently alter or append columns to shared tables, creating migration fragility and performance bottlenecks on large tables.
4. **Lack of Compile-Time Type Safety**:
   - Python/JS dynamic typing leads to runtime bugs in complex multi-module workflows, whereas a modern TypeScript monorepo provides strict compile-time verification across contracts, domain logic, and UI.

## 4. How STOKROVA Improves Upon Odoo

| Capability | Odoo | STOKROVA |
| :--- | :--- | :--- |
| **Type Safety** | Dynamic Python/JS | End-to-end TypeScript (Contracts $\rightarrow$ Validation $\rightarrow$ Domain $\rightarrow$ API $\rightarrow$ UI) |
| **Offline Resilience** | Browser IndexedDB / POS Box | First-class local SQLite on Tauri 2 & Expo with deterministic command outbox & monotonic server change feed |
| **Inventory Ledger** | Location-to-location double entry in relational tables | Append-only immutable `inventory_movements` ledger with mathematical sum invariant & materialized balances |
| **Workflow Engine** | Fixed Python state transitions & automated actions | Versioned, immutable Directed Acyclic Graph (DAG) with concurrency-leased task queues |
| **Modularity** | Heavy ORM inheritance | Clean modular monolith with strict domain boundaries and decoupled application services |
