# ADR-013: Supabase as Infrastructure with NestJS Business Core

## Status
Accepted

## Context
Deploying self-managed PostgreSQL and custom authentication adds maintenance burden and operational risk. However, exposing Supabase's auto-generated REST/GraphQL APIs directly to clients would scatter business logic into client queries or PostgreSQL triggers, violating our architectural commandment of domain isolation.

## Decision
1. Use **Supabase** for managed PostgreSQL, Supabase Auth (JWT identity, refresh tokens), and Row Level Security (RLS) as a defense-in-depth layer.
2. Use **Supabase CLI** with Docker for local development, migrations, and local Studio.
3. The **NestJS API** remains the authoritative business brain. All mobile, POS, and admin clients communicate with the NestJS API; direct client-to-database CRUD is forbidden.
4. Supabase Auth authenticates the actor; the application layer authorizes what that actor may execute across companies, branches, warehouses, registers, and workflows.

## Consequences
- Combines the developer velocity and battle-tested auth of Supabase with the strict domain encapsulation of a NestJS modular monolith.
- Clean migration pipeline reproducible locally via Supabase CLI and committed to Git.
