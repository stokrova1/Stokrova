# ADR-012: API Versioning and Contract Generation

## Status
Accepted

## Context
Multiple client platforms (Web, Desktop Tauri, Mobile Expo) consume the server API. Breaking changes or manual DTO duplication introduces schema drift and client crashes.

## Decision
All public endpoints are versioned (starting with `/v1/`). Request/response schemas and command envelopes are defined as single sources of truth in `@stokrova/contracts` and `@stokrova/validation`, generating typed client contracts. Clients branch on stable, machine-readable error codes.

## Consequences
- Single source of truth across all clients and server.
- Breaking changes require formal version deprecation policies.
