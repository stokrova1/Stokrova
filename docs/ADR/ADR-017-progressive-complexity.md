# ADR-017: Progressive Complexity and Capability-Based Modules

## Status
Accepted

## Context
A single trader operating a small shop needs an instant, friction-free interface (Sell, Products, Stock, Cash, Reports) and must not be intimidated by complex enterprise workflow graphs, queue monitors, or approval chains. However, as the trader grows, their system must scale to multi-user, multi-branch, and multi-stage operations without data migration or changing platforms.

## Decision
1. Organize system features into **Capability Flags** activated per tenant (e.g. `multiple_registers`, `warehouse_operations`, `workflow_engine`, `approval_chains`, `multi_branch`, `double_entry_accounting`).
2. Implement **Progressive Complexity in UI**:
   - **Solo Mode**: Unified cashier/manager screen; collapsed behind-the-scenes execution of sales, ledger movements, payments, till updates, and receipts.
   - **Structured & Enterprise Modes**: Exposes dedicated Work Center dashboards, queues, approval inboxes, and workflow designers.
3. The underlying transaction and ledger engine remains identical across all modes.

## Consequences
- Simple enough for a market trader, powerful enough for an enterprise distributor.
- Zero data restructuring required as a company transitions from solo to enterprise scale.
