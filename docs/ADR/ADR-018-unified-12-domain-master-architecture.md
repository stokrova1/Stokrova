# ADR-018 — Unified 12-Domain Master Architecture & Reference Benchmark

## Status
Accepted

## Context
During initial development, rapid focus on the configurable workflow engine risked narrowing the platform's perceived scope to a "POS with customizable workflows". In reality, the strategic ambition of STOKROVA is to be a world-class, enterprise-grade inventory, commerce, and business operations platform that manages the entire physical-goods lifecycle (from procurement and warehousing to multi-channel sales, fulfillment, accounting, and replenishment intelligence).

Six mature open-source systems were studied:
1. **ERPNext** (ERP & accounting breadth)
2. **Odoo** (modular business ecosystem & POS)
3. **InvenTree** (deep inventory, parts, variants, BOM)
4. **OpenBoxes** (warehouse logistics, bins, lots, expiry, FEFO)
5. **TetherPOS** (high-speed retail checkout UX)
6. **QuickStock Sync** (offline outbox resilience)

The platform must surpass the limitations of all six without becoming an uncoordinated patchwork of their codebases.

## Decision
1. **Platform Scope**: Enshrine the platform identity as a World-Class Inventory, Commerce & Business Operations Platform covering 12 distinct capability domains:
   - Commerce & Sales
   - Deep Inventory Core
   - Operations & Workflows
   - Procurement & Suppliers
   - Finance, Cash Truth & Accounting
   - Logistics & Fulfillment
   - Manufacturing & Assembly
   - Analytics & Replenishment Intelligence
   - Platform, Tenancy & Security
   - Offline-First & Synchronization
   - Device & Integration Ecosystem
   - Cross-Cutting Enterprise Engines
2. **Subsystem Framing**: The configurable DAG workflow engine is formally classified as an *operations subsystem* that orchestrates transitions and tasks across business domains, but never bypasses or substitutes domain invariants.
3. **Inventory Depth**: The inventory core must support an 8-tier physical location hierarchy (Tenant $\rightarrow$ Company $\rightarrow$ Branch $\rightarrow$ Warehouse $\rightarrow$ Zone $\rightarrow$ Aisle $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin), multi-state stock availability, FEFO/FIFO lot tracking, and discrete serial number lifecycles.
4. **Progressive Complexity**: All capability domains must scale smoothly from a single-screen solo trader to a high-throughput multi-warehouse enterprise.

## Alternatives Considered
1. *Platform-as-Workflow-Engine*: Rejected because workflow configuration must not dictate or replace domain models, ledger immutability, or financial truth.
2. *Direct Code Reuse from Reference Projects*: Rejected to avoid licensing contamination (GPLv3, LGPLv3, EPL), language mismatches (Python/Java/Groovy vs TypeScript), and legacy architectural debt.

## Consequences
- Every subsequent module and phase is built against the comprehensive 12-domain blueprint.
- Phase 2 expands from simple catalog items to a deep product and inventory core (variants, units, 8-tier locations, stock movements, and lot/serial foundations).
