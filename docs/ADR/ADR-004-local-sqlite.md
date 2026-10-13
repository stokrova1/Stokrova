# ADR-004: Local SQLite for Offline Clients

## Status
Accepted

## Context
Clients must continue normal point-of-sale and barcode warehouse operations during network drops. HTTP caching or browser localStorage is insufficient for transactional operations.

## Decision
Use embedded SQLite for desktop POS (via Tauri 2) and mobile (via Expo SQLite). Local business writes and outbox records commit in atomic SQLite transactions before presenting success to the cashier.

## Consequences
- Guaranteed durability across device reboots.
- Offline queries are fast and reliable.
