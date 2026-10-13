# Reference Analysis: QuickStock Sync

## 1. Overview
- **Repository**: `SHalimoosavi/SYJ-QuickStock-Sync`
- **Stack**: JavaScript, PWA, JSON-based storage
- **License**: MIT

## 2. Useful Domain Concepts to Adopt
- **Local Operation Outbox Queue**: Queueing offline writes locally and draining when connectivity resumes.
- **LAN / Local Peer Sync**: Concepts for synchronizing stock updates across devices on a local shop network.
- **Offline Scanning & Stock Counting**: Instant barcode lookup against a locally cached catalog.

## 3. Ideas to Reject
- **Whole-Record Last-Write-Wins (LWW)**: QuickStock uses naive LWW conflicts. In STOKROVA, money and inventory are append-only ledger movements; stock is never overwritten by whole-record timestamp comparisons.
- **Unstructured JSON Storage**: QuickStock is deliberately lightweight; an enterprise system requires SQLite locally and PostgreSQL centrally with strict relational invariants.

## 4. Key Takeaway for STOKROVA
QuickStock confirms the UX viability of local outbox operations and offline scanning, while highlighting the absolute necessity of our idempotent, append-only synchronization protocol.
