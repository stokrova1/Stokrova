# InvenTree Reference Architecture & Capability Analysis

## 1. System Identity & Overview
- **Repository**: `https://github.com/inventree/inventree`
- **Architecture**: Python / Django / Django REST Framework / PostgreSQL / React frontend.
- **License**: MIT
- **Primary Domain**: Deep Inventory, Parts Management, Serial/Batch Tracking, Bills of Materials (BOM), and Stock Allocations.

---

## 2. Core Capabilities & Observed Architecture

### Capability A: Parametric Variants & Part Templates
- **Reference Behavior**: Supports base part templates that generate sellable variants with specific parameters (voltage, size, material) and attachments.
- **Evidence**: `InvenTree/part/models.py` defines `Part`, `PartParameter`, and `PartCategory` with hierarchical self-referencing trees.
- **Limitation**: Creating variant matrices requires manual multi-step configuration; lacks an atomic multi-attribute matrix generator.
- **STOKROVA Decision**: Implement an atomic Universal Variant Matrix Generator that expands $N$ dimensions (e.g. Size $\times$ Color) into sellable variants with deterministic SKUs and barcodes in a single database transaction.
- **Reason**: Drastically reduces administrative time when onboarding thousands of apparel, footwear, or industrial SKUs.

### Capability B: Discrete Serial Number & Batch Discipline
- **Reference Behavior**: Each serialized item is tracked as an individual physical unit with a distinct lifecycle and history.
- **Evidence**: `InvenTree/stock/models.py` (`StockItem`) enforces unique serial numbers per part, tracking stock status (OK, Damaged, Destroyed, In Production).
- **Limitation**: Serial lookup is performed through synchronous Django API calls; fails when warehouse scanners lose Wi-Fi.
- **STOKROVA Decision**: Adopt InvenTree's discrete serial lifecycle model, but replicate serial tables locally to mobile SQLite databases for instant offline barcode validation.
- **Reason**: Ensures warehouse pickers can scan serial numbers with zero network latency and verify unit validity offline.

### Capability C: Stock Allocation Mechanics
- **Reference Behavior**: Physical stock is allocated against open sales and build orders before physical fulfillment, preventing double-selling.
- **Evidence**: `InvenTree/stock/models.py` calculates `allocated_quantity` by aggregating open order lines.
- **Limitation**: Does not explicitly distinguish between temporary soft holds (active customer carts) and firm commitments (confirmed orders).
- **STOKROVA Decision**: Implement a 2-tier commitment engine separating soft reservations (`reserved_qty`, TTL-cached) from firm commitments (`allocated_qty`).
- **Reason**: Prevents inventory lockup from abandoned shopping carts while safeguarding confirmed commercial orders.
