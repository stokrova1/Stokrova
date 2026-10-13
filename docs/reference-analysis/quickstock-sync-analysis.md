# QuickStock Sync Reference Architecture & Capability Analysis

## 1. System Identity & Overview
- **Repository**: `https://github.com/SHalimoosavi/SYJ-QuickStock-Sync`
- **Architecture**: Lightweight Node.js / JavaScript application utilizing local file/JSON storage and HTTP sync buffering.
- **License**: MIT
- **Primary Domain**: Offline-First Inventory Scanning, Local Operation Queuing, and Distributed Peer Sync.

---

## 2. Core Capabilities & Observed Architecture

### Capability A: Offline Operation Queuing
- **Reference Behavior**: Captures barcode scanning operations while disconnected, storing transactions in a local queue for later transmission.
- **Evidence**: `client/syncQueue.js` buffers local commands and tracks pending transmission status.
- **Limitation**: Uses non-transactional local JSON files. An unexpected client crash or power loss during disk write can corrupt the local queue.
- **STOKROVA Decision**: Utilize native embedded SQLite on desktop (Tauri 2) and mobile (Expo). Transactions write atomically to local domain tables and `outbox_operations` in a single `BEGIN...COMMIT` block.
- **Reason**: Guarantees zero lost transactions even under sudden device power failure.

### Capability B: Connection State Monitoring
- **Reference Behavior**: Tracks network connectivity status and transitions between online, offline, and syncing states.
- **Evidence**: `client/networkMonitor.js` listens to ping heartbeats and triggers queue flushes upon reconnection.
- **Limitation**: Naive retry loop that hammers the server immediately upon reconnection, risking network storms across multiple reconnecting devices.
- **STOKROVA Decision**: Implement a 5-state connection machine (`ONLINE`, `OFFLINE`, `RECONNECTING`, `SYNCING`, `SYNC_ERROR`) with randomized jittered exponential backoff.
- **Reason**: Protects central API servers from thundering herd problems when retail stores reconnect simultaneously.

### Capability C: Conflict Resolution Policy
- **Reference Behavior**: Resolves conflicting updates between devices using timestamp-based Last-Write-Wins (LWW).
- **Evidence**: `server/syncHandler.js` compares `updated_at` timestamps and overwrites existing records if the incoming timestamp is newer.
- **Limitation**: High risk of silent data loss. If Device A sells 5 units offline and Device B adjusts stock offline, LWW overwrites one of the operations, creating untraceable stock drift.
- **STOKROVA Decision**: Ban global Last-Write-Wins for inventory and financial data (Rule 10). Implement `IMMUTABLE_APPEND` for movements and payments, and `DOMAIN_EXCEPTION` workflows for concurrent master data collisions.
- **Reason**: Guarantees mathematical correctness and full audibility across concurrent offline writes.
