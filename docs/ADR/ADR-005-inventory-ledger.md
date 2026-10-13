# ADR-005: Inventory Movement Ledger as Source of Truth

## Status
Accepted

## Context
Small inventory apps frequently update a mutable `products.stock` integer. This makes auditing impossible, leads to race conditions, prevents reconciliation, and breaks offline synchronization.

## Decision
All stock changes are recorded as append-only immutable records in `inventory_movements`. Physical stock balance is mathematically defined as $\sum(\text{valid inventory movements})$. Operational `inventory_balances` table is a derived cache for rapid lookups, maintained strictly by ledger transaction handlers. Direct UI mutation of stock is prohibited.

## Consequences
- Full audibility, fraud tracking, and retrospective balance reconstruction.
- Concurrent offline sales merge cleanly as independent ledger entries.
