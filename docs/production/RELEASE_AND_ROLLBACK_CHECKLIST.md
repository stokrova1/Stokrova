# STOKROVA — Production Release & Rollback Checklist

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `PRODUCTION_READY`  
**Classification:** Release Management Standard (SOP-006)  
**Date:** October 13, 2026  

---

## 1. Pre-Release Verification Checklist (Gate A to F)

Before any production deployment window opens, all items below must be signed off by the engineering team:

- [ ] **Lockfile & Clean Dependencies**: Monorepo installed cleanly from committed `pnpm-lock.yaml` (`pnpm install --frozen-lockfile`).
- [ ] **Typecheck Verification**: `pnpm -r run typecheck` passes with zero errors across all 12 workspaces.
- [ ] **Automated Test Matrix**: 100% of test suites pass (>1,515 automated unit, integration, and security tests).
- [ ] **Security Negative Regressions**: All 72 security and production readiness tests pass (`master-security.spec.ts` and `production-readiness.spec.ts`).
- [ ] **Supply Chain Audit**: `pnpm audit` passes with 0 known high or critical vulnerabilities.
- [ ] **Zero Secrets in Git / Bundles**: Repository history clean; client asset bundles scanned with zero secret exposures.
- [ ] **Database Migration Plan**: Backward-compatible expand-and-contract migration verified against staging PostgreSQL.
- [ ] **Backup Verified**: Fresh database snapshot confirmed within 60 minutes of maintenance window.
- [ ] **Release Manifest Created**: Tagged Git release commit SHA recorded (e.g. `release-v0.1.0-sha`).

---

## 2. Release Window Execution Protocol

- [ ] **Step 1: Maintenance Notification**: Send notice to operational stakeholders and branch managers.
- [ ] **Step 2: Database Migration DDL Execution**: Apply pending migrations using direct connection (`DIRECT_URL`).
  ```bash
  pnpm --filter @stokrova/database run db:migrate
  ```
- [ ] **Step 3: Verify Migration & RLS**:
  ```sql
  SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
  ```
- [ ] **Step 4: Container Deployment**: Deploy new API container image with rolling update.
- [ ] **Step 5: Verify Liveness & Readiness**:
  - Check `/v1/health/live` returns HTTP 200.
  - Check `/v1/health/ready` returns HTTP 200 with `database: ready`.
- [ ] **Step 6: Deploy Admin Web Static Bundle**: Deploy compiled Nginx container with cache-busted assets.

---

## 3. Post-Deployment Smoke Test Protocol

Execute automated smoke test commands against deployed environment:

```bash
# 1. Probe liveness
curl -fsS https://api.stokrova.com/v1/health/live

# 2. Probe readiness
curl -fsS https://api.stokrova.com/v1/health/ready

# 3. Check security headers
curl -sI https://api.stokrova.com/v1/health | grep -i "strict-transport-security"

# 4. Check telemetry snapshot
curl -fsS https://api.stokrova.com/v1/health/metrics
```

- [ ] Verify point-of-sale checkout flow in staging/smoke test fixture.
- [ ] Verify warehouse receiving and bin transfer in smoke test fixture.
- [ ] Verify background outbox event processing.

---

## 4. Rollback Criteria & Decision Matrix

| Condition | Action | Responsibility |
| :--- | :--- | :--- |
| `/v1/health/ready` returns 503 for $> 2\text{ minutes}$ | **Immediate Rollback** | Release Manager / On-Call SRE |
| HTTP 5xx error rate $> 1.0\%$ over 5 minutes | **Immediate Rollback** | SRE Lead |
| RLS policy bypass or tenant isolation alert | **Immediate Rollback + Security Freeze** | Security Lead |
| Non-critical third-party webhook failure | **Forward-Fix Allowed** | Domain Engineer |

### Rollback Commands:
```bash
# 1. Rollback API container deployment to previous image tag
kubectl rollout undo deployment/stokrova-api

# 2. Rollback Admin Web container deployment
kubectl rollout undo deployment/stokrova-admin-web

# 3. Confirm health check recovery
curl -fsS https://api.stokrova.com/v1/health/ready
```
