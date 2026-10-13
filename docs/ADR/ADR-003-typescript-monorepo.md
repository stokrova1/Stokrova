# ADR-003: TypeScript-First Monorepo

## Status
Accepted

## Context
Codebase components (Web Admin, Tauri POS, Expo Mobile, NestJS Server) share common domain rules, data contracts, validation schemas, and error codes. Maintaining duplicated types in multiple languages leads to schema drift.

## Decision
Use a pnpm workspaces monorepo with strict TypeScript throughout. Core business contracts (`packages/contracts`), domain rules (`packages/domain`), validation (`packages/validation`), and database schemas (`packages/database`) are shared packages consumed directly by clients and server.

## Consequences
- End-to-end type safety from local SQLite to server PostgreSQL.
- Eliminates duplicate DTO maintenance across clients.
