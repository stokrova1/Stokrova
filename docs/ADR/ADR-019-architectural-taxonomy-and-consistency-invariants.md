# ADR-019 — Architectural Taxonomy and Consistency Invariants

## Status
Accepted

## Context
During the Phase 0.5.1 validation gate, an architectural consistency check identified potential terminology ambiguities across domain models, workflows, and inventory equations:
1. Describing workflows as a "DAG" conflicted with real-world requirements for controlled loops, rework, and retries.
2. The initial inventory equation conflated physical stock partitions with commercial commitments, creating a risk of double-counting.
3. Multiple terms across documents risked inconsistent interpretation (e.g., order vs invoice, payment vs receipt, ledger vs projection).

## Decision
Enshrine the authoritative definitions and invariants across the entire STOKROVA platform:

1. **Workflow Engine**: Defined strictly as a **Directed workflow graph with validated transitions, controlled loops, retries, and bounded execution** (not a strict DAG). Controlled rework is permitted with mandatory execution hop limits (maximum 50 hops) and iteration guards (default maximum 3 iterations) to eliminate infinite cycles.
2. **Physical Stock vs Commitments**:
   - Physical Stock partitions: $\text{Physical On-Hand} = \text{Physically Unrestricted} + \text{Quarantined} + \text{Damaged} + \text{Physically Restricted}$.
   - Commitments: $\text{Reserved}$ (temporary cart/quote soft hold) and $\text{Allocated}$ (confirmed order hold) are logical claims, not separate physical piles.
   - Commercial Availability: $\text{Available to Promise (ATP)} = \text{Physically Unrestricted} - (\text{Allocated} + \text{Reserved})$.
3. **Separation of Financial Entities**:
   $$\text{Sales Order (Agreement)} \neq \text{Invoice (Legal Claim)} \neq \text{Payment (Asset Settlement)} \neq \text{Receipt (Customer Document)}$$
4. **Ledger vs Projection**:
   - `inventory_movements` and `journal_entries` are the permanent, immutable sources of truth.
   - Balances and current states are read-optimized projections that can be recalculated from the ledger at any time.
5. **Tenancy Hierarchy**:
   - `Tenant`: SaaS isolation boundary.
   - `Company`: Legal entity with financial accounts and tax identity.
   - `Branch`: Physical trading location.
   - `Warehouse`: Physical storage facility.
6. **RBAC Taxonomy**:
   - `Permission`: Granular capability string.
   - `Role`: Set of permissions.
   - `Scope`: Operational boundary (`Tenant → Company → Branch → WH → Register → Work Center`).

## Consequences
- All architecture documents, API contracts, and domain engines must adhere strictly to this taxonomy.
- Prevents double-counting inventory, infinite workflow loops, and duplicate payment captures.
