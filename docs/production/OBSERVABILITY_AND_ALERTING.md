# STOKROVA — Observability, Monitoring & Alerting Guide

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `PRODUCTION_READY`  
**Classification:** SRE Telemetry & Monitoring Architecture (SOP-005)  
**Date:** October 13, 2026  

---

## 1. Observability Architecture & Standards

STOKROVA implements the three pillars of modern cloud observability: **Structured Logging**, **Operational Metrics**, and **Distributed Tracing**.

```text
  [ Client Request ] 
          │
          ▼ (x-request-id generated / propagated)
  ┌─────────────────────────────────────────────────────────────┐
  │ NestJS API Gateway                                          │
  │  ├── StructuredLoggingInterceptor (JSON stdout)            │
  │  ├── MetricsService (Latency, Error Rate, Codes)            │
  │  └── URL Sanitizer (Query Secret Redactor)                  │
  └─────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
  [ Central Log Aggregator ]    [ Metrics Store / Prometheus ]
  (Datadog / CloudWatch / ELK)  (Prometheus / Grafana / Datadog)
          │                              │
          └───────────────┬──────────────┘
                          ▼
              [ Actionable Alerting ]
            (PagerDuty / Opsgenie / Slack)
```

---

## 2. Structured Logging Standards

All application logs are formatted as single-line structured JSON emitted to standard output (`stdout` for `INFO`/`WARN`, `stderr` for `ERROR`).

### Standard Log Schema
```json
{
  "timestamp": "2026-10-13T18:00:00.123Z",
  "level": "INFO",
  "context": "HTTP",
  "requestId": "req_01924b11-92b8-7c1e-84bc-2a6c1110e52b",
  "tenantId": "tenant_apex_global",
  "userId": "usr_c34a9812",
  "method": "POST",
  "path": "/v1/orders/so_1001/checkout?token=[REDACTED]",
  "statusCode": 201,
  "durationMs": 42
}
```

### Mandatory Redaction Rules
1. **URL Query Parameters**: Any query key matching `token`, `password`, `secret`, `api_key`, `key`, or `auth` is automatically replaced with `[REDACTED]` by `sanitizeUrl()`.
2. **Authorization Headers**: Raw Bearer tokens and cookie headers are never logged.
3. **Database Connection Strings**: Passwords embedded in PostgreSQL URLs are masked as `******`.
4. **Internal Stack Traces**: In production (`NODE_ENV=production`), unhandled SQL or internal stack traces are redacted before sending responses to clients.

---

## 3. Key Operational Metrics

Operational metrics are tracked by `MetricsService` and exposed at `GET /v1/health/metrics`:

| Metric Name | Type | Description | Healthy Baseline |
| :--- | :---: | :--- | :--- |
| `stokrova_api_requests_total` | Counter | Total incoming HTTP requests | Monotonically increasing |
| `stokrova_api_errors_total` | Counter | Total HTTP 4xx and 5xx responses | $< 1.0\%$ of total requests |
| `stokrova_api_latency_ms` | Gauge | Moving average response latency | $< 150\text{ms}$ (p95 $< 300\text{ms}$) |
| `stokrova_db_pool_active` | Gauge | Active PostgreSQL connections | $< 80\%$ of pool maximum |
| `stokrova_outbox_pending_events` | Gauge | Count of outbox events awaiting dispatch | $< 100$ events |
| `stokrova_idempotency_conflicts` | Counter | Duplicate operations blocked | Expected in high concurrency |
| `stokrova_sync_batches_processed` | Counter | Offline sync transactions ingested | Continuous during store hours |

---

## 4. Actionable Production Alerting Rules

Alerts must be actionable, symptom-oriented, and directly linked to operational runbooks:

### Tier 1: P1 Critical Alerts (Immediate 24/7 Page)

#### Alert 1.1: `HighApiErrorRate`
- **Condition**: HTTP 5xx error rate $> 5.0\%$ over a 5-minute sliding window.
- **Impact**: Business users and POS terminals experiencing transaction failures.
- **Runbook**: `docs/production/INCIDENT_RESPONSE_RUNBOOK.md` (Playbook 4).
- **Initial Action**: Check `/v1/health/ready`; inspect recent deployments; rollback if recent release occurred within 30 minutes.

#### Alert 1.2: `DatabaseReadinessProbeFailed`
- **Condition**: `/v1/health/ready` returns HTTP 503 (`database: down`) for $> 60$ seconds.
- **Impact**: All stateful commerce and inventory operations blocked.
- **Runbook**: `docs/production/DISASTER_RECOVERY_RUNBOOK.md`.
- **Initial Action**: Inspect PostgreSQL pooler status in Supabase console; check for connection exhaustion.

#### Alert 1.3: `CrossTenantAccessAttempt`
- **Condition**: Rate of `TENANT_ACCESS_DENIED` errors from `TenantGuard` $> 10$ in 1 minute.
- **Impact**: Possible credential stuffing or IDOR attack against tenant isolation.
- **Runbook**: `docs/production/INCIDENT_RESPONSE_RUNBOOK.md` (Playbook 2).

---

### Tier 2: P2 High Alerts (15-Minute Response)

#### Alert 2.1: `ElevatedLatency`
- **Condition**: p95 API response latency $> 1{,}000\text{ms}$ for $> 5$ minutes.
- **Impact**: Degraded checkout performance at POS and delayed warehouse scanner feedback.
- **Initial Action**: Check slow queries in PostgreSQL `pg_stat_activity`; inspect Redis lock contention.

#### Alert 2.2: `OutboxQueueBacklog`
- **Condition**: `stokrova_outbox_pending_events` $> 500$ for $> 10$ minutes.
- **Impact**: Domain event propagation and asynchronous notifications delayed.
- **Initial Action**: Restart outbox worker process; check for unhandled event consumer failures.

#### Alert 2.3: `RedisDegraded`
- **Condition**: `/v1/health/ready` reports `checks.redis: "degraded"` for $> 5$ minutes.
- **Impact**: Distributed locking and rate-limiting fall back to degraded mode.
- **Initial Action**: Inspect Redis cluster health and memory consumption.
