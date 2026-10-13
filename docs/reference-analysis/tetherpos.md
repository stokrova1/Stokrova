# Reference Analysis: TetherPOS

## 1. Overview
- **Repository**: `paulo-aunor/tetherpos`
- **Stack**: React, Vite, Dexie.js (IndexedDB), PWA
- **License**: Open Source

## 2. Useful Domain Concepts to Adopt
- **Browser-Local POS UX**: Instant cashier checkout UI using local IndexedDB storage.
- **Hardware Integration**: Touch-first, barcode-scanner-first keyboard shortcuts and receipt formatting.
- **Offline Cash Register Tracking**: Tracking shift opens, cash drops, and register closes offline.

## 3. Ideas to Reject
- **Client-Only Architecture**: Lacks an enterprise-grade backend, server reconciliation, multi-tenant RBAC, and double-entry accounting.
- **Unfinished Cloud Sync**: Does not have a production-grade cursor/inbox synchronization engine.

## 4. Key Takeaway for STOKROVA
TetherPOS provides good UX references for fast keyboard/barcode cashier flows, confirming that the client must store sales locally before network round-trips.
