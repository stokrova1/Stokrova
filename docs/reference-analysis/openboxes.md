# OpenBoxes Reference Analysis

## 1. Overview & Repository

- **Repository**: `https://github.com/openboxes/openboxes`
- **License**: Eclipse Public License 2.0 (EPL-2.0)
- **Role in STOKROVA**: Reference for serious warehouse logistics, granular stock location hierarchy, lot/batch/serial tracking, cold-chain, expiry management, and humanitarian/regulated supply chains.

## 2. Key Architectural Strengths

1. **Granular Storage Location Hierarchy**:
   - Models warehouse physical topology down to zones, aisles, racks, shelves, and bins.
2. **Deep Lot, Batch & Expiry Management**:
   - Built specifically for pharmaceuticals, medical supplies, and food relief where batch numbers, manufacture dates, and strict expiry dates determine pick viability (FEFO - First Expired, First Out).
3. **Formal Inbound & Outbound Logistics**:
   - Strong requisition, purchase order receipt, inbound inspection, cross-docking, pick list generation, packing slips, and shipment dispatch workflows.
4. **Cold Chain & Regulated Goods Support**:
   - Tracking storage temperature conditions and specialized handling requirements across transfers.

## 3. Architectural Limitations & Weaknesses

1. **Legacy Tech Stack (Grails / Java / GSP)**:
   - Built on Groovy/Grails with server-rendered pages and legacy Hibernate ORM, making modern mobile and desktop POS experiences difficult to integrate.
2. **Lack of High-Speed POS & Retail Capabilities**:
   - OpenBoxes is strictly an inventory and warehouse management system; it has no integrated cashier, till register, or high-throughput retail checkout engine.
3. **No Offline-First Client Architecture**:
   - Requires continuous server connectivity. Handheld devices in warehouses or remote clinics suffer when Wi-Fi is intermittent.
4. **Rigid Workflow Lifecycles**:
   - Hardcoded state machines for requisitions and shipments make it difficult to adapt to diverse commercial retail and wholesale workflows.

## 4. How STOKROVA Improves Upon OpenBoxes

| Capability | OpenBoxes | STOKROVA |
| :--- | :--- | :--- |
| **Tech Stack** | Grails / Java / Hibernate / GSP | Modern TypeScript Modular Monolith (NestJS + Drizzle + React + Tauri 2 + React Native) |
| **Retail & POS Integration** | None (pure warehouse/logistics) | Unified Commerce: POS, Wholesale, and Distribution share the identical real-time inventory ledger |
| **Location Topology** | Hierarchical DB tables | Flexible 8-tier hierarchy: Tenant $\rightarrow$ Company $\rightarrow$ Branch $\rightarrow$ Warehouse $\rightarrow$ Zone $\rightarrow$ Aisle $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin |
| **Offline Warehouse Scanning**| Web-based (requires active network) | Native local SQLite on handheld mobile audit devices (Expo) with outbox queuing |
| **Workflow Flexibility** | Fixed requisition/shipment states | Configurable DAG workflow engine with work-center assignment and declarative approval rules |
