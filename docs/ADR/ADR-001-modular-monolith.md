# ADR-001: Modular Monolith Instead of Microservices

## Status
Accepted

## Context
STOKROVA is an enterprise business operating platform. Starting with a distributed microservices architecture introduces network latency, distributed transaction complexity, deployment overhead, and failure points without providing tangible early benefits.

## Decision
Adopt a strongly modular monolith backend using NestJS. Modules are strictly isolated into Domain, Application, Infrastructure, and Presentation layers. Modules communicate via application interfaces and domain events, never through arbitrary cross-module database access.

## Consequences
- Single deployable backend simplifies testing, CI, and local development.
- Clean boundaries preserve the ability to extract high-throughput modules later if scale demands.
