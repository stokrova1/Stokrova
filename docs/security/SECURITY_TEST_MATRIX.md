# STOKROVA — Master Security Test Matrix

This matrix specifies the 50 mandatory security test scenarios across 6 core domains.

---

## 1. Test Matrix Breakdown

| Category | Target Focus | Scenario Count | Suite Location |
| :--- | :--- | :---: | :--- |
| **Category 1** | Frontend Secret Exposure & Bundles | 8 Scenarios | `apps/api/src/security/frontend-secrets.spec.ts` |
| **Category 2** | Authentication & Session Integrity | 7 Scenarios | `apps/api/src/security/auth-session.spec.ts` |
| **Category 3** | Authorization & Tenant Isolation | 7 Scenarios | `apps/api/src/security/tenant-isolation.spec.ts` |
| **Category 4** | Database & Storage Security | 7 Scenarios | `apps/api/src/security/database-storage.spec.ts` |
| **Category 5** | API, Business Logic & Anti-Abuse | 11 Scenarios | `apps/api/src/security/api-business-logic.spec.ts` |
| **Category 6** | Infrastructure, Supply Chain & Headers | 10 Scenarios | `apps/api/src/security/infrastructure-headers.spec.ts` |
| **Total** | **Full Security Coverage** | **50 Scenarios** | `apps/api/src/security/*.spec.ts` |

---

## 2. Test Scenarios Specification

### Category 1: Frontend Secret Exposure & Bundles (Scenarios 1–8)
1. Production frontend bundles contain zero server secrets, passwords, or connection strings.
2. Privileged Supabase service-role keys cannot be extracted from client bundles or source maps.
3. Client API responses do not expose internal database connection URLs.
4. Payment gateway private keys (`sk_live_...`) are absent from POS desktop bundles.
5. Cloud storage secret access keys (`R2_SECRET_ACCESS_KEY`) are absent from mobile bundles.
6. Local browser storage does not retain long-lived confidential credentials.
7. Logout and account switching invalidate local session access and clear memory.
8. Public configuration (e.g. Supabase anon key) is classified as public, while service-role keys are kept confidential.

### Category 2: Authentication & Session Integrity (Scenarios 9–15)
9. Protected routes reject requests with missing Authorization header with 401 Unauthorized.
10. Unsigned JWT tokens (tampered signature) are rejected with 401 Unauthorized.
11. Expired JWT tokens (`exp < now`) are rejected with 401 Unauthorized.
12. Malformed tokens (invalid base64 or garbage data) are rejected with 401 Unauthorized.
13. `x-test-user-id` and `x-test-platform-admin` headers are ignored when not in test environment.
14. Random fallback strings are rejected instead of treated as valid user IDs.
15. Revoked or invalidated API keys immediately reject subsequent requests.

### Category 3: Authorization & Tenant Isolation (Scenarios 16–22)
16. Tenant A authenticated actor cannot access Tenant B customer, order, or invoice records (IDOR blocked).
17. Tenant A actor cannot mutate Tenant B records by changing URL parameters or request bodies.
18. Lower-privileged actors cannot execute administrative, financial, or configuration functions.
19. Protected properties (`tenant_id`, `created_by`, `status`) cannot be modified via mass assignment.
20. Cross-tenant reports, analytics drill-downs, and exports are strictly denied.
21. Unauthorized users cannot access another tenant's files or signed storage documents.
22. Background jobs and integration sync runs execute strictly within authorized tenant boundaries.

### Category 4: Database & Storage Security (Scenarios 23–29)
23. PostgreSQL Row-Level Security (RLS) is enabled and enforced across all tenant tables.
24. Direct queries with `anon` or untrusted role cannot bypass tenant RLS policies.
25. Privileged database functions operate under least privilege.
26. Private file storage objects cannot be downloaded by guessing object identifiers.
27. Signed storage download URLs have short, bounded expiration times.
28. SQL injection attempts against search and reporting filters are safely handled as parameterized data.
29. Database migrations preserve foreign keys, tenant constraints, and RLS policies.

### Category 5: API, Business Logic & Anti-Abuse (Scenarios 30–40)
30. Server-side validation rejects unauthorized mass assignment and invalid state transitions.
31. Inventory balances cannot be modified without authorized ledger movement entries.
32. Payment and refund operations are strictly idempotent (no double captures or duplicate refunds).
33. Price and discount tampering is rejected; server calculates authoritative totals.
34. Inbound webhooks require valid cryptographic HMAC signatures.
35. Replayed webhooks outside the 300-second window are rejected.
36. Duplicate webhook event deliveries return cached idempotent receipts without reprocessing.
37. Integration URLs are protected against Server-Side Request Forgery (SSRF).
38. External identity mappings prevent cross-tenant object confusion.
39. Data export generation mitigates spreadsheet formula injection (`=`, `+`, `-`, `@`).
40. Error responses sanitize internal exception messages and stack traces.

### Category 6: Infrastructure, Supply Chain & Headers (Scenarios 41–50)
41. HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`) are enforced.
42. Content Security Policy (`CSP`) is returned on HTTP responses.
43. Strict Transport Security (`HSTS`) header is enforced.
44. CORS allowlist rejects unauthorized cross-origin requests.
45. In-memory rate limiting throttles excessive volumetric requests.
46. Request body payloads exceeding 1MB are rejected with 413 Payload Too Large.
47. Structured logging redacts sensitive parameters from URLs and payloads.
48. Sensitive secrets in configuration are masked by `sanitizeConfig`.
49. Supply-chain dependencies pass vulnerability audit without critical or high vulnerabilities.
50. Full repository functional regression suite remains 100% green after security hardening.
