# ADR-016: Declarative Graph-Based Workflow and Rules Engine

## Status
Accepted

## Context
High-traffic shops (such as wholesale building materials or supermarkets) operate with different fulfillment flows:
- Wholesale: `Sales Desk -> Picking -> Verification -> Packing -> Cashier -> Dispatch`
- Fast retail: `POS -> Cashier -> Complete`
- Credit customers: `Sales -> Credit Approval -> Dispatch -> Invoice -> Payment Later`
Hard-coding one linear path or creating separate database schemas per workflow makes the software brittle and unscalable.

## Decision
1. Implement a **declarative, graph-based Workflow Engine**:
   - Directed acyclic graph (DAG) of steps with typed transitions (Sequential, Branching, Parallel, Merging, Approval).
   - Workflows are versioned; published versions are immutable.
   - Dynamic assignment: step can be assigned to a User, Role, Team, Work Center, or Queue.
2. **Task Queues & Concurrency Locks**:
   - High-traffic queues (e.g. Warehouse Picking Queue) allow multiple workers to claim tasks with optimistic concurrency/locking to ensure two pickers cannot claim the same task.
3. **Declarative Rules Engine**:
   - Business policies (e.g. `IF order.total > 1,000,000 THEN require_approval('manager')`) are evaluated declaratively. No tenant-provided arbitrary script execution.

## Consequences
- The platform dynamically adapts to any business structure without code changes.
- Generic database tables support diverse operational flows without schema churn.
