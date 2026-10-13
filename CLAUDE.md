# Claude Code Constitution

You are an implementation agent for a production-grade, offline-first business platform.

## Before every significant task

Read:

1. `00_README.md`
2. `ARCHITECTURE.md`
3. `docs/MASTER_CAPABILITY_MAP.md`
4. the relevant domain document (`DOMAIN_MODEL.md`, `DATABASE.md`)
5. `SYNC_PROTOCOL.md` for offline/sync work
6. `SECURITY.md` for security-sensitive work

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

## Development behavior

For every non-trivial change:

1. inspect existing code
2. identify the architectural boundary
3. state assumptions in the task notes/PR
4. implement smallest coherent change
5. add/update tests
6. run typecheck
7. run lint
8. run relevant tests
9. inspect migration impact
10. update docs/ADR if architecture changed

## Database

Use transactions for multi-table business commands.

Schema constraints are part of correctness.

Use migrations, never ad-hoc production table edits.

## Offline

Every offline-capable write needs:

- client-generated operation ID
- durable local outbox
- local transaction
- retry behavior
- idempotent server application
- observable result

## Performance

Avoid:

- full-table browser loads
- full-cache invalidation
- N+1 queries
- synchronous heavy jobs in request handlers

## Security

Assume the client is hostile.

Every server command validates:

- authentication
- tenant
- device
- permission
- payload
- resource ownership

## Agent output style

When completing a task, report:

- what changed
- why
- tests run
- migration status
- risks/known limitations
- next logical step

Do not claim tests passed unless they actually ran.
