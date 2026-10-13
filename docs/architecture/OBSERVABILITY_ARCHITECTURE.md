# STOKROVA — Observability Architecture & Metrics

## 1. Principles

1. **Structured JSON Logs**: All application logs are emitted as single-line structured JSON objects with standard fields: `timestamp`, `level`, `message`, `service`, `requestId`, `tenantId`, `context`.
2. **Correlation Tracing**: Every request is tagged with an `x-request-id` propagated via `RequestIdMiddleware` through controllers, database queries, audit records, and downstream responses.
3. **Zero Secret Leakage**: Configuration secrets, database connection strings, bearer tokens, and private keys are scrubbed before logging.
4. **Metrics Instrumentation**: HTTP duration histograms, request counters, error rates, and cache hits/misses are tracked via `MetricsService`.

---

## 2. Health & Readiness Probes

Exposed under `/v1/health`:
- **Liveness Probe** (`GET /v1/health/live`): Confirms the NestJS event loop is active and serving traffic. Returns `{ status: 'ok', uptime: number }`.
- **Readiness Probe** (`GET /v1/health/ready`): Validates database connectivity (`SELECT 1`), Redis connection status, and critical configuration integrity. Returns status `ok` (200) or `degraded`/`error` (503).
- **Comprehensive Status** (`GET /v1/health`): Detailed health report including memory footprint, uptime, environment, and subsystem states.

---

## 3. Log Formatting Example

```json
{
  "timestamp": "2026-10-08T14:07:10.123Z",
  "level": "info",
  "service": "stokrova-api",
  "requestId": "req_01925b30-e374-7264-a95e-5b121980875d",
  "tenantId": "ten_alpha_enterprise",
  "message": "Processed warehouse creation command",
  "context": {
    "warehouseId": "wh_01925b30-e374-7264-a95e-5b121980875e",
    "durationMs": 14.2
  }
}
```
