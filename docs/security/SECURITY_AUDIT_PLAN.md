# STOKROVA — Full-Platform Master Security Audit Plan

## 1. Executive Mission & Scope

This document defines the formal security audit, attack surface analysis, vulnerability assessment, and remediation strategy for the **STOKROVA Enterprise Business Operations Platform**.

**Audit Authorization:** Master Security Audit Authorization  
**Target Quality Gate:** `SECURITY_AUDIT_VERIFIED`  
**Execution Mode:** Multi-phase inspection, static code analysis, secret discovery, supply-chain verification, negative security testing, vulnerability remediation, regression testing, and evidence-based certification.

---

## 2. Platform Architecture & Attack Surface Mapping

STOKROVA is an enterprise modular monolith composed of 4 applications and 7 shared core packages:

```text
                                  CLIENT SURFACES (UNTRUSTED)
       ┌────────────────────────┬────────────────────────┬────────────────────────┐
       │   apps/admin-web       │   apps/pos-desktop     │      apps/mobile       │
       │   (Browser React/Vite) │   (Desktop Electron)   │  (React Native / Expo) │
       └───────────┬────────────┴───────────┬────────────┴───────────┬────────────┘
                   │                        │                        │
                   └────────────────────────┼────────────────────────┘
                                            │ HTTPS / Bearer JWT / x-tenant-id
                                            ▼
       ┌──────────────────────────────────────────────────────────────────────────┐
       │                     apps/api (NESTJS API GATEWAY)                        │
       │  • AuthGuard (JWT signature, expiry, claims)                             │
       │  • TenantGuard (Strict tenant isolation, membership validation)          │
       │  • RbacGuard (Scoped permission evaluation)                              │
       │  • Security Headers Middleware (CSP, HSTS, X-Frame-Options)              │
       │  • Rate Limiting & Anti-DoS Middleware                                   │
       │  • Inbound Webhook Gateway (HMAC-SHA256, Replay window, Dedup)           │
       │  • SSRF Defense Filter (Private IP / metadata blocking)                  │
       └────────────────────────────┬─────────────────────────────┬───────────────┘
                                    │                             │
                                    ▼                             ▼
       ┌────────────────────────────────────────┐   ┌─────────────────────────────┐
       │     SHARED CORE LIBRARIES (TRUSTED)    │   │  DATA STORAGE & PERMANENCE  │
       │  • packages/contracts                  │   │  • PostgreSQL / Supabase    │
       │  • packages/domain (Pure invariants)   │   │    (Row-Level Security RLS) │
       │  • packages/validation (Zod schemas)   │   │  • Drizzle ORM Migrations   │
       │  • packages/sync (Offline engine)      │   │  • Cloudflare R2 / S3       │
       │  • packages/config (Env sanitizer)     │   │  • Redis Cache / Streams    │
       └────────────────────────────────────────┘   └─────────────────────────────┘
```

---

## 3. Trust Boundaries & Threat Modeling

1. **Boundary 1 (Client to API Gateway)**:
   - Untrusted browsers, desktop POS devices, and mobile devices communicate over public networks.
   - Threats: Token forgery, credential stuffing, cross-tenant identifier tampering, payload tampering, XSS, CSRF, clickjacking, DoS.
2. **Boundary 2 (API Gateway to Database / Supabase)**:
   - Server-side queries execute via Drizzle ORM and direct PostgreSQL connection.
   - Threats: SQL injection, missing Row-Level Security (RLS) on direct Supabase client connections, cross-tenant data leakage.
3. **Boundary 3 (External Webhooks & Connectors)**:
   - Inbound webhooks from Stripe, Shopify, FedEx, and third-party partners.
   - Threats: Webhook replay attacks, spoofed signatures, SSRF into internal networks, duplicate financial events.
4. **Boundary 4 (Offline Synchronization)**:
   - Local SQLite caches synchronizing with primary PostgreSQL database.
   - Threats: Stale permission abuse after revocation, malicious sync payloads, out-of-order conflict exploitation.

---

## 4. Workstreams & Testing Methodology

| Workstream | Area | Audit Methodology |
| :--- | :--- | :--- |
| **Workstream A** | Frontend Secret Exposure | Inspect production build bundles (`dist/`), source maps, environment definitions, and browser storage for credentials. |
| **Workstream B** | Repository & Git Secrets | Scan commit history, config files, fixtures, and documentation for leaked private keys, connection strings, and tokens. |
| **Workstream C** | Authentication & Sessions | Audit token generation, signature verification, expiration, revocation, and test bypass headers. |
| **Workstream D** | Authorization & Tenancy | Test object-level authorization (IDOR), protected property assignment, and cross-tenant isolation. |
| **Workstream E** | Database & Storage Security | Verify PostgreSQL Row-Level Security (RLS) policies, storage bucket permissions, and query parameterization. |
| **Workstream F** | API & Business-Logic Security | Abuse testing on financial immutability, inventory ledger integrity, duplicate payment capture, and discount stacking. |
| **Workstream G** | Input Handling & Injections | Fuzzing and validation tests for SQLi, XSS, SSRF, command injection, and CSV formula injection. |
| **Workstream H** | Browser & Frontend Hardening | Verify CSP, anti-framing, referrer policy, MIME sniffing defense, and client storage isolation. |
| **Workstream I** | CORS & Cross-Origin | Audit allowed origins, preflight handling, and credentialed request policies. |
| **Workstream J** | Integrations & Webhooks | Verify HMAC signatures, replay windows, deduplication, and SSRF allowlists. |
| **Workstream K** | Offline & Sync Security | Verify device disconnect recovery, stale token invalidation, and tenant-scoped sync batches. |
| **Workstream L** | Files & Information Leakage | Audit error sanitization, structured logging, file downloads, and signed URL expirations. |
| **Workstream M** | Supply Chain & Dependencies | Execute `pnpm audit`, scan transitive dependencies, and update vulnerable packages. |
| **Workstream N** | CI/CD & Deployment Config | Audit workflow permissions, secret injection, and production deployment configuration. |
| **Workstream O** | Rate Limiting & Availability | Verify request throttling, burst protection, and payload size bounds. |
| **Workstream P** | Master Security Test Suite | Author and execute 50+ negative security test scenarios with 100% pass rate. |

---

## 5. Remediation Strategy & Severity Criteria

- **CRITICAL**: Immediate fix required. Authentication bypass, cross-tenant data disclosure, hard-coded production secrets, remote code execution.
- **HIGH**: Mandatory fix prior to certification. Broken object-level authorization, SQL injection, SSRF, supply-chain vulnerabilities, missing RLS.
- **MEDIUM**: Hardening & defensive controls. Missing security headers, formula injection, permissive CORS, rate limiting.
- **LOW / INFORMATIONAL**: Code style, defensive comments, telemetry enhancements.

Every verified finding must be:
1. Logged in `docs/security/SECURITY_FINDINGS_REGISTER.md`.
2. Reproduced via an automated negative test in `apps/api/src/security/`.
3. Patched with minimal, high-integrity code changes.
4. Verified with passing regression tests.
5. Recorded in `docs/security/SECURITY_REMEDIATION_LOG.md`.
