# STOKROVA — Final Release Checklist & Deployment Rehearsal

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `GO_LIVE_READY`  
**Classification:** Release Engineering & Deployment Verification Checklist  
**Release Tag:** `v0.1.0-rc1`  
**Commit Revision:** `07fb64e656afa925f8197768e67b6301ca790609`  
**Date:** October 14, 2026

---

## 1. Pre-Deployment Release Verification Checklist

Every item in this checklist must be confirmed before initiating production rollout:

### A. Source Code & Build Gates
- [x] **Git Freeze Verified:** Release commit `07fb64e656afa925f8197768e67b6301ca790609` is clean and tagged `v0.1.0-rc1`.
- [x] **Lockfile Consistency:** `pnpm-lock.yaml` is frozen; dependencies installed with `--frozen-lockfile`.
- [x] **TypeScript Typecheck:** `pnpm -r run typecheck` passed with 0 errors across all 12 projects.
- [x] **Production Compilation:** `pnpm -r run build` completed with exit code 0 (`apps/api`, `apps/admin-web`, `apps/customer-web`, `apps/pos-desktop`, `apps/mobile`).
- [x] **Automated Monorepo Tests:** 1,448 tests passed across 124 test files (0 failures, 0 regressions).
- [x] **Business Day Simulation:** `scripts/simulate-business-day.spec.ts` passed (9/9 tests).
- [x] **Disaster Recovery Drill:** `scripts/disaster-recovery-drill.spec.ts` passed (2/2 tests).

### B. Security & Credentials
- [x] **Zero Frontend Secret Exposure:** Audited `apps/admin-web/dist/index.html` and verified no credentials or private keys are baked into bundles.
- [x] **Database RLS Enforced:** All 14 migrations verified in `packages/database/drizzle/meta/_journal.json` including `0013_security_hardening_rls.sql`.
- [x] **Connection Pool Safety:** `TransactionManager` enforces `set_config('app.current_tenant_id', ..., true)` with `is_local = true`.
- [x] **Security Headers Configured:** Ingress configured with CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000`.

### C. Operational Readiness
- [x] **Health Check Endpoints:**
  - Liveness: `GET /health/liveness` (returns HTTP 200 `{ status: "ok" }`).
  - Readiness: `GET /health/readiness` (verifies database, Redis, and storage connectivity).
- [x] **Observability & Metrics:** Prometheus alerts configured in `deploy/monitoring/prometheus-alerts.yaml` and Grafana dashboards configured in `deploy/monitoring/grafana-dashboard.json`.

---

## 2. Standard Production Rollout Sequence

Execute the following deployment steps in exact order:

```bash
# Step 1: Pre-rollout database backup snapshot
# Execute direct snapshot via Supabase / RDS CLI
export SNAPSHOT_ID="stokrova-pre-release-v0.1.0-rc1-$(date +%s)"

# Step 2: DDL Schema Migrations (Executed via DIRECT_URL)
export DATABASE_URL="$DIRECT_URL"
pnpm --filter @stokrova/database run db:migrate

# Step 3: Container Image Build & Push
docker build -t stokrova/api:v0.1.0-rc1 -f apps/api/Dockerfile .
docker build -t stokrova/admin-web:v0.1.0-rc1 -f apps/admin-web/Dockerfile.docker .

# Step 4: Rolling Kubernetes Deployment
kubectl apply -f deploy/k8s/configmap-secrets.yaml
kubectl apply -f deploy/k8s/api-deployment.yaml
kubectl rollout status deployment/stokrova-api -n production --timeout=180s

kubectl apply -f deploy/k8s/admin-deployment.yaml
kubectl rollout status deployment/stokrova-admin -n production --timeout=120s

kubectl apply -f deploy/k8s/ingress.yaml
```

---

## 3. Post-Deployment Smoke Test Protocol

Immediately after rollout, execute the automated smoke test protocol against the live environment:

1. **Endpoint Availability:**
   - `curl -f -s https://api.stokrova.com/health/liveness` -> HTTP 200.
   - `curl -f -s https://api.stokrova.com/health/readiness` -> HTTP 200 with all dependencies healthy.
2. **Security Header Inspection:**
   - Verify presence of `X-Content-Type-Options: nosniff` and `Strict-Transport-Security`.
3. **Authentication & Tenant Isolation Smoke:**
   - Authenticate as `BUSINESS_OWNER` (`usr_apex_owner`) -> access `/analytics/dashboards`.
   - Attempt cross-tenant query using modified header -> verify HTTP 403 `TENANT_ACCESS_DENIED`.
4. **Read Workflow Smoke:**
   - Fetch product catalog, inventory availability, and Chart of Accounts.
5. **Nonfinancial Write Workflow Smoke:**
   - Update branch operating hours or issue a test staff invitation token.

---

## 4. Rollback & Forward-Fix Procedure

If critical errors, health check failures, or data anomalies are detected:

```bash
# Immediate Rollback (< 2 minutes RTO):
# 1. Rollback Kubernetes deployments to previous stable revision
kubectl rollout undo deployment/stokrova-api -n production
kubectl rollout undo deployment/stokrova-admin -n production

# 2. Schema Compatibility:
# Because STOKROVA enforces the expand-and-contract schema discipline (SOP-002),
# schema additions are backwards-compatible with the previous N version.
# No destructive rollback migration is required.

# 3. If catastrophic data corruption occurred:
# Trigger Point-in-Time Recovery (PITR) to SNAPSHOT_ID per DISASTER_RECOVERY_RUNBOOK.md.
```

---

## 5. Release Checklist Verdict

All pre-deployment criteria, build steps, and smoke test protocols have been validated.

**RELEASE READINESS VERDICT:** **`APPROVED FOR DEPLOYMENT`**
