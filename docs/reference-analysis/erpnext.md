# Reference Analysis: ERPNext

## 1. Overview
- **Repository**: `frappe/erpnext`
- **Stack**: Python, MariaDB, Frappe Framework, JavaScript
- **License**: GPLv3

## 2. Useful Domain Concepts to Adopt
- **Transaction-Driven Stock Movements**: Stock Ledger Entry (`Stock Ledger Entry`) as immutable records of quantities and valuation.
- **Double-Entry Accounting Architecture**: Direct linkage between inventory valuation changes and General Ledger entries.
- **Enterprise Hierarchy**: Multi-company, cost centers, branches, and multi-warehouse structures.
- **Batches & Serials**: Strict validation around batch numbers and serial unit tracking.

## 3. Ideas to Reject
- **MariaDB / Frappe Metadata coupling**: Avoid tightly coupled Python/DocType runtime; our platform requires TypeScript-first, compile-time type safety via Drizzle ORM and NestJS.
- **GPLv3 Code Contamination**: Zero source code is copied into STOKROVA. Pure conceptual study only.
- **Monolithic UI Rendering**: Frappe's server-rendered desk UI is not suitable for offline-first React/Tauri/Expo clients.

## 4. Key Takeaway for STOKROVA
Adopt ERPNext's comprehensive transaction-to-general-ledger mapping and batch/serial lifecycle models while implementing them independently in TypeScript and PostgreSQL.
