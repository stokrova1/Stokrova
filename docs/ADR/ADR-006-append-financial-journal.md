# ADR-006: Append-Oriented Financial Journal

## Status
Accepted

## Context
Retrofitting double-entry accounting onto a stock application is notoriously difficult. Destructive edits on completed invoices or payments corrupt accounting books.

## Decision
Double-entry principles are enforced from Day 1. All financial entries are recorded in append-only journal entries where $\sum(\text{debits}) = \sum(\text{credits})$. Edits on posted financial entries are strictly prohibited; corrections must be made via reversing entries.

## Consequences
- Permanent audit trail for compliance, tax, and investor scrutiny.
- Clean integration with purchasing and inventory valuation.
