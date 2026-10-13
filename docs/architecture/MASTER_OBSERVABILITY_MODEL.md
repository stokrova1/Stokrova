# STOKROVA Master Observability & Monitoring Model

## 1. Observability Pillars

Production reliability and performance monitoring across multi-branch enterprise environments are anchored on four pillars:

```text
                                 OBSERVABILITY CORE
                                         │
        ┌───────────────────────┬────────┴──────────────┬───────────────────────┐
        │                       │                       │                       │
     LOGGING                 TRACING                 METRICS                TELEMETRY
  ├── Structured JSON     ├── OpenTelemetry       ├── Prometheus/OTel     ├── Sentry Errors
  ├── Correlation IDs     ├── Span Context        ├── Latency / p99       ├── Queue Depths
  └── Redacted Payloads   └── Database Queries    ├── Cash Variances      └── Sync Lag Times
```

---

## 2. Distributed Tracing & Correlation IDs

Every incoming request or offline sync batch is stamped with a unique `correlation_id` (UUIDv7) at the API gateway:
- Propagated across all downstream service calls, Redis queue jobs, and database spans.
- Captured in client responses via the `X-Correlation-ID` header.
- Enables support and engineering teams to trace any failed transaction end-to-end within seconds.

---

## 3. Key Health & Telemetry Metrics

| Metric Name | Type | Warning Threshold | Description |
| :--- | :--- | :---: | :--- |
| `http_request_duration_ms` | Histogram | $p99 > 500\text{ms}$ | Latency of critical API endpoints (POS sale, barcode scan). |
| `sync_outbox_queue_lag_seconds` | Gauge | $> 300\text{s}$ | Delay between client offline commit and server inbox application. |
| `cash_register_variance_minor` | Gauge | $> ₦5,000$ | Magnitude of closing till discrepancies requiring investigation. |
| `db_connection_pool_utilization`| Gauge | $> 80\%$ | PostgreSQL connection pool saturation. |
| `security_violations_count` | Counter | $> 0 \text{ Critical}$ | Volume of cross-tenant or revoked device attempts. |

---

## 4. Production Health & Readiness Endpoints

The API exposes standard Kubernetes/cloud health endpoints:
- `GET /health/liveness`: Checks process execution and internal event loop responsiveness.
- `GET /health/readiness`: Verifies active connectivity to Supabase PostgreSQL, Redis cache/queue, and Cloudflare R2 storage.
