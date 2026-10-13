# Odoo Reference Architecture & Capability Analysis

## 1. System Identity & Overview
- **Repository**: `https://github.com/odoo/odoo`
- **Architecture**: Dynamic Python ORM, PostgreSQL, Owl Web Framework, modular app ecosystem.
- **License**: LGPLv3 (Community) / Proprietary (Enterprise)
- **Primary Domain**: Modular ERP & Business Operations (POS, Inventory, Accounting, Sales, Purchase, Manufacturing).

---

## 2. Core Capabilities & Observed Architecture

### Capability A: Double-Entry Location Stock Routing
- **Reference Behavior**: Every stock movement is treated as a transfer between two locations (`src_location_id` $\rightarrow$ `dest_location_id`). Virtual locations represent vendors, customers, production, and inventory loss.
- **Evidence**: `odoo/addons/stock/models/stock_move.py` defines `location_id` and `location_dest_id` on every movement.
- **Limitation**: Recursive tree queries across hierarchical locations without path indexing cause latency under large multi-warehouse setups.
- **STOKROVA Decision**: Adopt the double-entry location concept across our 8-tier location hierarchy, indexed using materialized path strings (`WH/ZONE/AISLE/RACK/SHELF/BIN`).
- **Reason**: Unifies internal moves, customer dispatches, and scrap into a single mathematical transfer model with sub-millisecond tree lookups.

### Capability B: Web Point-of-Sale (POS) & Peripheral Hardware
- **Reference Behavior**: Browser-based POS communicating with local IoT hardware boxes (printers, scanners, scales) via local HTTP requests.
- **Evidence**: `odoo/addons/point_of_sale/static/src/app` runs as a Single Page Application in the browser.
- **Limitation**: Client state relies on browser IndexedDB, which is vulnerable to browser cache eviction and lacks multi-process concurrency locks.
- **STOKROVA Decision**: Deploy native desktop applications (React + Tauri 2) and mobile applications (React + Expo) with native SQLite persistence and direct OS-level driver access for ESC/POS printers.
- **Reason**: Eliminates the need for external IoT proxy daemons while providing robust durability.

### Capability C: Module Extensibility & ORM Inheritance
- **Reference Behavior**: Apps extend functionality by subclassing existing models using `_inherit = 'res.partner'`, dynamically injecting new columns into shared tables.
- **Evidence**: `odoo/models.py` dynamically builds PostgreSQL schema migrations at startup based on installed module metadata.
- **Limitation**: Creates tightly coupled database tables and migration fragility across version upgrades.
- **STOKROVA Decision**: Enforce strict modular monolith boundaries in NestJS. Modules interact via typed application contracts and domain events rather than mutating core relational schemas.
- **Reason**: Preserves database schema immutability (Rule 4: *Never make workflow configuration change database schema*).
