# STOKROVA — Phase 8 Implementation Plan
## Advanced Pricing, Promotions, Loyalty, Rebates & Commercial Incentives

**Status:** APPROVED FOR EXECUTION  
**Author:** STOKROVA Core Architecture Team  
**Milestone:** Phase 8  
**Previous Gate:** `READY_FOR_PHASE_8`  
**Target Gate:** `READY_FOR_PHASE_9`  
**Baseline Workspace Status:**  
- 1,115 Automated Tests across 119 test files (100% Green, 0 failures)  
- 0 TypeScript errors across all 8 workspace packages (`pnpm -r run typecheck`)  
- 0 Build failures across all workspace packages (`pnpm -r run build`)  
- Database migrations: `0000` through `0007` cleanly applied  

---

## 1. Executive Mission & Strategic Scope

Phase 8 implements a production-grade, multi-tenant commercial pricing, promotion, loyalty, and rebate operating engine for STOKROVA.

The system empowers single traders, retail chains, wholesalers, distributors, and multinational multi-entity enterprises to configure and execute commercial pricing policies without duplicating commerce logic or compromising financial invariants:

$$\begin{aligned}
\text{Base Price} &\longrightarrow \text{Pricelist / Contract Rule (Precedence)} \longrightarrow \text{Volume Tier} \longrightarrow \text{Gross Line Unit Price} \\
&\longrightarrow \text{Promotions (Best Deal / Stacked)} \longrightarrow \text{Margin Floor Check (Governance Override)} \\
&\longrightarrow \text{Taxes (Inclusive/Exclusive)} \longrightarrow \text{Loyalty Redemption} \longrightarrow \text{Final Line & Order Total} \\
&\longrightarrow \text{Immutable Snapshot & Explanation} \longrightarrow \text{Loyalty Accrual \& Rebate Accrual Outbox}
\end{aligned}$$

---

## 2. Capabilities Reconnaissance & Gap Analysis

| Capability | Current State in Repository | Planned Phase 8 Extension |
| :--- | :--- | :--- |
| **Base Price Lists & Tiered Rules** | Existing `price_lists`, `price_list_rules` (`fixed_price_minor`, `discount_percent_bp`, `min_quantity`) in `@stokrova/database/schema/pricing.ts` | Complete deterministic price resolution engine with documented precedence (Contract > Customer-Specific > Customer Group > Channel > Default Retail > Base). Support rule versioning, effective dates, currency precision, and explicit fallback. |
| **Contract & Customer-Specific Pricing** | Existing customer group field on price lists | Dedicated customer contract pricing with valid date ranges, minimum order quantities, and priority flags. |
| **Promotions & Coupons** | Basic `discount_promotions` (percentage, fixed amount with min subtotal and usage count) | Comprehensive promotional campaigns: Buy-X-Get-Y (BXGY), bundle/kit discounts, product/category eligibility, channel eligibility, budget caps, customer redemption limits, stacking rules (`EXCLUSIVE`, `STACKABLE`, `BEST_DEAL`), and atomic redemption distinct from preview. |
| **Loyalty & Rewards Ledger** | Existing tables in `schema/loyalty-giftcards.ts` and pure domain math in `@stokrova/domain/loyalty-giftcards.ts` | Fully operational append-only loyalty ledger (`loyalty_transactions`). Earning rules tied to net sales, points redemption with caps and minimum thresholds, automated reversals on order returns/refunds, tier multipliers, and double-redemption prevention. |
| **Rebates & Commercial Agreements** | Not implemented | Complete customer & supplier rebate engine: volume & spend thresholds, graduated & retroactive tiers, distinct financial lifecycles (`ESTIMATE` $\rightarrow$ `ACCRUED` $\rightarrow$ `CLAIMED` $\rightarrow$ `APPROVED` $\rightarrow$ `SETTLED`), return recalculations without mutating history, and credit note references. |
| **Margin Protection & Discount Governance** | Not implemented | Configurable margin floor thresholds based on cost provenance (inventory FIFO/moving-average or landed cost). Prohibits unauthorized below-margin sales; provides dual-authorized override workflows with full audit evidence. |
| **Price Snapshot & Explainability** | Line items store final amounts only | Immutable commercial price snapshots per line: records matching rules, winner rule, applied promotions, rejected promotions with reason codes, tax calculations, loyalty earned/redeemed, and rebate references. |
| **Offline Price Synchronization** | SQLite sync exists for catalog | Synchronize versioned pricing configurations with timestamp validity, offline risk limits for promotions and loyalty redemption, and deterministic conflict reconciliation. |

---

## 3. Core Architectural Boundaries & Golden Rules

1. **Rule 7 & 11: Receipts are not financial truth & Never silently delete financial history**: Price list changes or promotion edits never retroactively mutate finalized order prices or posted General Ledger journals.
2. **Rule 18 & 19: Concurrency safety & Idempotent commands**: Concurrent redemptions of limited-use coupons, campaign budgets, or loyalty points must not exceed caps. Every redemption, reversal, and settlement requires an `operation_id`.
3. **Rule 21: Preserved multi-tenant isolation**: Every pricing rule, campaign, loyalty account, rebate agreement, and snapshot is strictly tenant-scoped (`tenant_id`). Top-level records enforce `onDelete: 'restrict'` on `tenants.id`.
4. **Rule 22: Decoupled pure domain logic**: Pricing calculations, tax extractions, promotion stacking, loyalty accruals, and rebate evaluations reside in pure TypeScript domain functions with zero database or framework dependencies.
5. **Rule 26: Pure integer arithmetic**: Absolute precision in integer minor units and basis points ($10,000 = 100.00\% = 1.0000$). Binary floating point math (`number` with decimals, `parseFloat`) is strictly prohibited in monetary paths.
6. **Rule 27: Feature preservation**: Existing price lists, price list rules, tax rates, and discount promotions are retained, connected, and cumulatively enhanced without destructive rewrites.

---

## 4. Technical Design Details

### 4.1. Pricing Precedence Model
When evaluating price for product variant $V$, quantity $Q$, customer $C$, customer group $G$, channel $H$, currency $K$ at evaluation time $T$:

```text
Priority 1: Active Customer-Specific Contract Pricing (Variant V, Customer C, min_qty <= Q)
    ↓ (if none matches)
Priority 2: Customer-Specific Price List (PriceList assigned to C, min_qty <= Q)
    ↓ (if none matches)
Priority 3: Customer-Group Price List (PriceList assigned to G, min_qty <= Q)
    ↓ (if none matches)
Priority 4: Channel-Specific Price List (PriceList assigned to H, min_qty <= Q)
    ↓ (if none matches)
Priority 5: Default Active Retail Price List (Default PriceList for Tenant & Currency K, min_qty <= Q)
    ↓ (if none matches)
Priority 6: Base Product Variant Price (product_variants.price_minor)
```

Within the matching tier, if multiple volume rules match, the rule with the highest `min_quantity` $\le Q$ wins deterministically.

### 4.2. Promotions & Stacking Engine
- **Stacking Policies:**
  - `EXCLUSIVE`: If applied, no other promotion may apply to the line or cart.
  - `STACKABLE`: Can combine with other stackable promotions in priority order.
  - `BEST_DEAL`: Evaluates all eligible promotions and applies the subset maximizing customer savings without violating exclusion rules.
- **Preview vs Redemption Separation:**
  - `evaluatePromotions`: Pure calculation returning potential discount, explanation, and required coupons. Does **not** decrement campaign budgets or mark coupons as used.
  - `redeemPromotions`: Executed atomically at order checkout with `operation_id` to increment `usage_count` and record redemption history.

### 4.3. Loyalty Ledger Subsystem
- **Ledger Model:** All point changes are recorded in append-only `loyalty_transactions` with typed reasons (`EARN`, `REDEEM`, `EXPIRE`, `REVERSAL`, `MANUAL_ADJUSTMENT`).
- **Derived Balances:** Account balance is reconciled against $\sum \text{Earned} - \sum \text{Redeemed} - \sum \text{Expired} \pm \sum \text{Reversals}$.
- **Return Reversals:** When an order is refunded or returned, a reversal transaction subtracts the pro-rata earned points and/or restores redeemed points to the customer.

### 4.4. Rebate Agreements & Financial States
- **Rebate Lifecycles:**
  - `ESTIMATE`: Projected rebate based on current sales trajectory.
  - `ACCRUED`: Earned liability/asset at period close based on actual eligible volume or spend.
  - `CLAIMED`: Formal claim submitted by counterparty.
  - `APPROVED`: Claim verified by commercial controller.
  - `SETTLED`: Settled via credit note or payment reference.
- **Customer Rebates vs Supplier Rebates:**
  - Customer rebate: Contra-revenue commercial incentive.
  - Supplier rebate: Inventory cost reduction / procurement recovery.

### 4.5. Margin Protection & Governance
- **Floor Check:** $\text{Unit Price} \ge \text{Cost Basis} \times (1 + \text{Min Margin Bp} / 10000)$.
- **Cost Basis:** Dynamically references inventory unit cost or landed cost from catalog/procurement.
- **Override Workflow:** If price falls below margin floor or discount exceeds policy cap, an override approval record (`pricing_override_requests`) is created. Checkout is blocked until an authorized manager approves.

---

## 5. Database Schema & Migration Strategy

Create a new migration (`0008_...`) expanding `@stokrova/database`:
1. `customer_contracts`: Contract pricing agreements with effective dates and customer IDs.
2. `promotion_campaigns`: Expanded campaign definitions (BXGY, bundle, thresholds, budgets, stacking rules).
3. `promotion_redemptions`: Audit records of atomic coupon and campaign redemptions per order.
4. `rebate_agreements`: Customer and supplier rebate contracts.
5. `rebate_tiers`: Volume and spend threshold tiers for rebates.
6. `rebate_accruals`: Period accrual calculations and settlement state tracking.
7. `pricing_override_requests`: Audit and approval tracking for below-margin or exceptional discounts.
8. `commercial_price_snapshots`: Immutable snapshot records attached to sales order lines.

All foreign keys to top-level records enforce `onDelete: 'restrict'` for multi-tenant and audit safety.

---

## 6. Implementation Sequence

1. **Step 1: Contracts Layer (`@stokrova/contracts`)**
   - Add types for advanced pricing, contract pricing, promotional campaigns, BXGY, stacking rules, rebates, margin governance, snapshots, and explainability.
2. **Step 2: Database Layer (`@stokrova/database`)**
   - Create schema definitions in `packages/database/src/schema/pricing-advanced.ts` and `schema/rebates.ts`.
   - Update `packages/database/src/schema/index.ts`.
   - Generate and validate migration `0008_...`.
3. **Step 3: Domain Layer (`@stokrova/domain`)**
   - Implement pure domain algorithms for precedence resolution, BXGY, promotion stacking, margin protection, loyalty reversal, and rebate tier calculation.
   - Author domain test suite `packages/domain/tests/pricing_advanced.spec.ts`.
4. **Step 4: Validation Layer (`@stokrova/validation`)**
   - Add Zod validation schemas for all Phase 8 contracts.
   - Author validation test suite `packages/validation/tests/pricing_advanced.spec.ts`.
5. **Step 5: API Services & Integration (`apps/api`)**
   - Enhance `PricingService` with precedence resolution, explainability snapshots, and margin protection.
   - Create `PromotionsService`, `LoyaltyService`, and `RebatesService`.
   - Register in module dependency graphs.
6. **Step 6: Master Acceptance Test Suite (`apps/api/src/pricing/pricing-phase8.spec.ts`)**
   - Implement 20 master acceptance scenarios covering all required capabilities.
7. **Step 7: Dangerous-Pattern Audit & Quality Gate Verification**
   - Monorepo-wide audit for floating point math, journal mutations, and tenant isolation.
   - Full monorepo build and test run.
8. **Step 8: Architecture Documentation & Certification**
   - Author `PHASE_8_PRICING_AND_INCENTIVES_MODEL.md` and `PHASE_8_COMPLETION_REPORT.md` with gate verdict `READY_FOR_PHASE_9`.
