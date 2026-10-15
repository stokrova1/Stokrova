# STOKROVA — Supabase Authentication Environment Matrix
**Platform:** STOKROVA Enterprise Business Operating Platform & Inventory OS  
**Target Gate:** `SUPABASE_AUTH_LIVE_VERIFIED`  
**Document Revision:** 1.0.0  

---

## 1. Environment Variables Specification

The table below catalogs every authentication, identity, and database configuration variable used across the STOKROVA ecosystem, specifying security exposure boundaries and runtime environments.

| Variable | Description | Exposure Tier | Required Environments | Example / Format |
| :--- | :--- | :--- | :--- | :--- |
| `SUPABASE_PROJECT_REF` | Unique reference ID for the Supabase project | Public / Server | Dev, Staging, Prod | `vbtuccvxtgjhaywijmwa` |
| `SUPABASE_URL` | Hosted Supabase API gateway origin | Public / Server | Dev, Staging, Prod | `https://<ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase new publishable API key | Public (Browser, Mobile, Desktop) | Dev, Staging, Prod | `sb_publish_...` |
| `SUPABASE_ANON_KEY` | Supabase standard public anon key | Public (Browser, Mobile, Desktop) | Dev, Staging, Prod | `sb_publish_...` or JWT anon |
| `SUPABASE_JWKS_URL` | Endpoint for asymmetric cryptographic key verification | Public / Server | Dev, Staging, Prod | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public client mirror of Supabase URL | Public | Frontend apps | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public client mirror of publishable key | Public | Frontend apps | `sb_publish_...` |
| `DATABASE_URL` | PostgreSQL direct connection string | **Server-Only (Confidential)** | Dev, Staging, Prod | `postgresql://postgres:<pw>@<host>:5432/postgres` |
| `DIRECT_URL` | PostgreSQL direct connection string | **Server-Only (Confidential)** | Migration / Seed | `postgresql://postgres:<pw>@<host>:5432/postgres` |
| `DATABASE_POOLER_TRANSACTION_URL` | Supavisor transaction pooler URL (Port 6543) | **Server-Only (Confidential)** | API Server | `postgresql://...:6543/postgres` |
| `DATABASE_POOLER_SESSION_URL` | Supavisor session pooler URL (Port 5432) | **Server-Only (Confidential)** | API Server | `postgresql://...:5432/postgres` |
| `JWT_SECRET` | Fallback secret for local unit test token generation | **Server-Only (Test only)** | Test only | Minimum 32 characters |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged admin key for server-side auth administration | **Server-Only (Strictly Protected)** | Server / Edge only | Never exposed to clients |

---

## 2. Redirects & Callback Configuration

Configured and permitted redirect URLs for Supabase Auth in project `vbtuccvxtgjhaywijmwa`:

| Purpose | Callback Path | Environment | Allowed Targets |
| :--- | :--- | :--- | :--- |
| **Email Confirmation** | `/auth/callback` | Local / Preview / Production | `http://localhost:3000/auth/callback`<br>`http://localhost:5173/auth/callback`<br>`https://*.stokrova.com/auth/callback`<br>`https://*.vercel.app/auth/callback` |
| **Password Recovery** | `/auth/reset-password` | Local / Preview / Production | `http://localhost:3000/auth/reset-password`<br>`https://*.stokrova.com/auth/reset-password` |
| **Staff Invitation Acceptance** | `/auth/invite` | Local / Preview / Production | `http://localhost:3000/auth/invite`<br>`https://*.stokrova.com/auth/invite` |
| **Native Mobile Deep Link** | `stokrova://auth/callback` | Mobile iOS & Android | `stokrova://auth/callback` |
| **Native Desktop Deep Link** | `stokrova://auth/callback` | Desktop Windows & macOS | `stokrova://auth/callback` |

---

## 3. Security Boundary Rules
1. **Never inject `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` into browser bundles.** Bundler configs must exclude server-only variables.
2. **Never commit `.env` containing production passwords or service keys.**
3. **Frontend applications only consume `SUPABASE_URL` and `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`.**
