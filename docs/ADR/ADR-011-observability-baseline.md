# ADR-011: Observability Baseline

## Status
Accepted

## Context
Diagnosing synchronization issues, transaction failures, and latency regressions across distributed offline devices requires end-to-end tracing and structured telemetry.

## Decision
Incorporate OpenTelemetry instrumentation and Sentry from Day 1. Every incoming command carries a `request_id` / `correlation_id` propagated through database operations, outbox events, and background workers.

## Consequences
- Every sync anomaly can be traced down to tenant, device, operation, and SQL query.
- Instant error alerting in production.
