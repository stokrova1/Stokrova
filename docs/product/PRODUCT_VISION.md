# STOKROVA Product Vision

## 1. Executive Summary

**STOKROVA** is not merely an inventory app, a Point-of-Sale (POS) tool, an ERP clone, or a standalone accounting system.

It is a **World-Class, Configurable, Offline-Capable, Multi-Tenant Business Operating Platform**.

It empowers businesses across their complete physical-goods lifecycle:
$$\text{Procurement} \longrightarrow \text{Receiving} \longrightarrow \text{Storage} \longrightarrow \text{Inventory} \longrightarrow \text{Sales} \longrightarrow \text{Fulfillment} \longrightarrow \text{Payments} \longrightarrow \text{Transfers} \longrightarrow \text{Returns} \longrightarrow \text{Finance}$$

From a single trader selling from one shop to a multinational enterprise managing dozens of branches, warehouses, and legal entities—all operate on the same unified domain engine without requiring distinct software versions.

---

## 2. Foundational Axiom

> **"The business does not adapt itself to our software. Our software adapts itself to the business."**

Traditional business software forces rigid workflows upon companies, demanding that small businesses adopt overwhelming enterprise forms or forcing growing distributors to rewrite their software when they outgrow simple apps.

STOKROVA inverts this paradigm:
- The system is **Simple When Simple Is Enough** (a single shopkeeper sees a clean, immediate POS screen with zero bureaucratic overhead).
- The system is **Powerful When Complexity Is Required** (a distribution enterprise activates multi-echelon warehousing, approval thresholds, parallel picking queues, and double-entry accounting).

---

## 3. The 14 Foundational Truths

A world-class inventory and business operations engine does not treat stock as a mutable number. For every item, balance, and transaction, the platform understands and explains:

1. **WHAT** does the business own? *(Products, sellable variants, bundles, kits, lots, discrete serials)*
2. **WHERE** is it physically located? *(Branch, warehouse, zone, aisle, rack, shelf, bin)*
3. **HOW MUCH** exists? *(On-hand, available, reserved, allocated, quarantined, damaged, in-transit, safety stock)*
4. **WHO** controls and is accountable for it? *(Owner, branch manager, custodian, work center)*
5. **WHERE** did it come from? *(Supplier, purchase order, manufacture batch, return, transfer)*
6. **WHERE** is it going? *(Customer order, branch transfer, repair, scrap, delivery route)*
7. **WHO** ordered it? *(Customer, sales representative, purchasing agent, automated reorder rule)*
8. **WHO** sold it? *(Cashier, B2B account rep, e-commerce channel)*
9. **WHO** received it? *(Receiving clerk, inspection officer)*
10. **WHO** moved it? *(Warehouse picker, forklift operator, delivery driver)*
11. **WHO** approved it? *(Manager, credit controller, declarative policy engine)*
12. **HOW** was it paid for? *(Cash, bank transfer, card, credit terms, split tender)*
13. **WHEN** did every action happen? *(Client timestamp, server received timestamp, immutable ledger timestamp)*
14. **WHY** did the balance or state change? *(13+ typed movement reasons, audit event trails)*

---

## 4. The Resilience Imperative: Offline-First

> **"The business does not stop because the internet stopped."**

Connectivity in the real world is intermittent. In high-traffic retail stores or large metal warehouse structures, internet outages are routine occurrences. 

A platform that halts when the internet goes down is unacceptable for serious commerce.

STOKROVA guarantees:
- Every cashier can continue scanning, carting, and completing sales offline.
- Every warehouse picker can continue barcode verification and bin picking offline.
- Disconnected terminals record atomic local transactions to embedded **SQLite** databases.
- When connectivity resumes, an idempotent outbox/inbox synchronization engine reconciles data authoritatively without data loss, stock drift, or duplicate payments.

---

## 5. Architectural Non-Negotiables

1. **Never hard-code one business workflow.**
2. **Never treat receipts as financial truth.** (Payment is truth; receipts are customer documentation).
3. **Never mutate stock balances directly.** (Stock balance is strictly the mathematical sum of valid immutable movement ledger entries).
4. **Never rely on global Last-Write-Wins for business-critical conflicts.**
5. **Never force enterprise complexity onto a solo trader.**
6. **Never build separate domain architectures for small and enterprise businesses.**
7. **Always benchmark against reference systems and design every feature, capability, and UX to surpass them in elegance, speed, type safety, and correctness.**
