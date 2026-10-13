# TetherPOS Reference Architecture & Capability Analysis

## 1. System Identity & Overview
- **Repository**: `https://github.com/paulo-aunor/tetherpos`
- **Architecture**: Single-page React application with client-side IndexedDB persistence (Dexie.js).
- **License**: Open Source
- **Primary Domain**: Lightweight Point-of-Sale (POS) Retail Checkout & Browser Persistence.

---

## 2. Core Capabilities & Observed Architecture

### Capability A: Cashier Checkout Ergonomics & Speed
- **Reference Behavior**: High-speed retail checkout screen with instant item selection, automatic barcode search focus, and keyboard-driven cart manipulation.
- **Evidence**: `src/components/Pos.js` mounts an auto-focus search field and binds keyboard shortcuts for tender selection and cart clearance.
- **Limitation**: Implemented purely as an isolated single-device frontend without an authoritative server backend, multi-tenancy, or centralized reporting.
- **STOKROVA Decision**: Adopt TetherPOS's keyboard-first, distraction-free cashier ergonomics into our Tauri 2 Desktop and Expo Mobile POS interfaces.
- **Reason**: Combines high cashier throughput with an enterprise-grade backend engine.

### Capability B: Client-Side Persistence
- **Reference Behavior**: Uses browser IndexedDB (via Dexie.js) to store sales and product records locally.
- **Evidence**: `src/db.js` defines local IndexedDB object stores (`products`, `sales`).
- **Limitation**: Directly mutates `stock` integers in the browser. Vulnerable to browser cache clearance, lacks transaction isolation across browser tabs, and cannot guarantee financial auditability.
- **STOKROVA Decision**: Replace browser IndexedDB with native transactional SQLite on Tauri 2 and Expo. Enforce an append-only outbox queue rather than mutating stock in place.
- **Reason**: Provides true ACID durability, protection against unexpected application crashes, and cryptographic operation IDs.

### Capability C: Receipt Printing
- **Reference Behavior**: Directly generates printable HTML receipt modals after tender capture.
- **Evidence**: `src/components/Receipt.js` renders formatted receipt components.
- **Limitation**: Conflates receipt generation with financial settlement truth; lacks reprint tracking or cash drawer reconciliation.
- **STOKROVA Decision**: Enforce strict separation: `Order != Invoice != Payment != Receipt`. Generate raw ESC/POS binary streams for thermal receipt printers with mandatory `is_reprint` auditing.
- **Reason**: Prevents receipt reprints from duplicating financial ledger entries or obscuring cash discrepancies.
