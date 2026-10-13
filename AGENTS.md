# Agent Collaboration Rules

## Roles

### Claude Code

Primary authority for:

- architecture
- backend
- database
- domain logic
- synchronization
- migrations
- security
- automated tests
- CI

### Antigravity

Primary authority for:

- admin UI
- POS UI
- mobile UI
- UX refinement
- frontend integration
- visual QA
- browser/device behavior

Neither agent changes the other's architectural boundaries without documenting the change.

## Branching

Do not let multiple agents modify the same working branch concurrently.

Use focused branches:

```text
feature/inventory-ledger
feature/sync-engine
feature/admin-catalog
feature/pos
```

Merge in small units.

## Feature Evolution & Preservation

- **Never delete or discard existing features**: If a feature already exists in the codebase and a new prompt or specification asks for a similar feature, do not wipe out, delete, or replace existing code. Merge, combine, and enhance both to create a unified, workable, and superior solution.
- **Connect and repair before rebuilding**: If a feature is partially built, disconnected, or missing parts, wire it up and complete the missing gaps rather than building from scratch. Build from scratch only when nothing exists.
- **Keep documentation and checklists synchronized**: Whenever a feature is identified as already built, completed, or enhanced, update the relevant checklist, rules, or documentation immediately so all agents (Claude Code, Antigravity) and contributors stay in sync.
- **Additive progress**: Treat all new prompts and requirements as cumulative enhancements. Never cause regressions or remove working functionality.

## Shared contract

The source of truth is:

```text
docs/
packages/contracts/
packages/domain/
```

If a UI needs a missing capability, request it through the contract/application layer rather than reaching into database internals.

## Before merge

Every branch must pass:

```text
typecheck
lint
unit tests
relevant integration tests
build
```

## Architecture changes

Any architecture change requires an ADR:

```text
docs/ADR/ADR-XXX-name.md
```

The ADR records:

- context
- decision
- alternatives
- consequences
- migration/rollback considerations

## Architectural Golden Rules

1. Never hard-code one business workflow.
2. Never assume one role per user.
3. Never assume one branch per user.
4. Never make workflow configuration change database schema.
5. Never allow workflow configuration to bypass domain invariants.
6. Never execute arbitrary tenant-supplied code.
7. Never treat receipts as financial truth.
8. Never allow payment retries to duplicate payments.
9. Never rely on client-side authorization.
10. Never use global last-write-wins for business-critical conflicts.
11. Never silently delete financial history.
12. Never mutate published workflow versions.
13. Never use Redis as authoritative business storage.
14. Never assume every business needs warehouse operations.
15. Never force enterprise complexity onto a solo trader.
16. Never build separate domain architectures for small and enterprise businesses.
17. Never let one large workflow lock the entire business.
18. Always design for concurrency.
19. Always make critical commands idempotent.
20. Always audit sensitive business operations.
21. Always preserve tenant isolation.
22. Always keep domain logic separate from UI.
23. Always keep workflow orchestration separate from domain invariants.
24. Always make offline behavior explicit.
25. Always prefer configurable capabilities over rigid business-size modes.
26. Always benchmark against reference systems and design every feature, capability, and UX to surpass them in elegance, speed, type safety, and correctness.
27. Never delete or discard existing features when receiving overlapping requirements—merge, combine, connect, and enhance to build a superior, unified system.
28. Always keep project checklists, documentation, and feature statuses synchronized across all agents and sessions.
