# STOKROVA — Phase 8 Commercial Pricing & Incentive Architecture Model

**Product:** STOKROVA — Configurable, Offline-Capable, Multi-Tenant Enterprise Business Operating Platform  
**Phase:** Phase 8 — Advanced Pricing, Promotions, Loyalty, Rebates & Commercial Incentives  
**Target Milestone Gate:** `READY_FOR_PHASE_9`  
**Status:** COMPLETE & AUTHORITATIVE  

---

## 1. Executive Architectural Overview

Phase 8 implements the commercial pricing and incentive engine for STOKROVA. It empowers businesses ranging from solo retailers to multinational distributor groups to define, evaluate, apply, audit, and reconcile complex commercial pricing policies without compromising financial truth or duplicating commerce logic.

The engine sits downstream of the authoritative Product Catalog (Phase 2 & 3), operates seamlessly across POS and Sales Orders (Phase 3), respects Multi-Entity Group structures (Phase 7), and bridges into the double-entry General Ledger (Phase 6) through immutable, auditable snapshots and credit notes.

$$\begin{aligned}
\text{Variant / Base Price} &\longrightarrow \text{Deterministic Precedence Ladder} \longrightarrow \text{Gross Unit Price} \\
\text{Campaigns / Vouchers} &\longrightarrow \text{Stacking & Exclusivity Engine} \longrightarrow \text{Promotional Discounts} \\
\text{Gross Price \& Cost} &\longrightarrow \text{Margin Protection Floor} \longrightarrow \begin{cases} \text{Passed} & \text{Standard Flow} \\ \text{Failed} & \text{Dual-Auth Override Flow} \end{cases} \\
\text{Eligible Spend} &\longrightarrow \text{Append-Only Loyalty Ledger} \longrightarrow \text{Tier Multipliers \& Redemptions} \\
\text{Periodic Volume / Spend} &\longrightarrow \text{Graduated / Retroactive Tiers} \longrightarrow \text{Rebate Accrual \& Settlement} \\
\text{All Executions} &\longrightarrow \text{CommercialPriceSnapshot} \longrightarrow \text{Immutable Explainability Audit}
\end{aligned}$$

---

## 2. Core Architectural Pillars

### Pillar A: Deterministic Pricing Precedence Ladder

Pricing resolution follows a strictly defined, non-overlapping precedence ladder. The first matching tier with a qualifying volume break wins:

1. **Customer Contract (`CUSTOMER_CONTRACT`)**: Negotiated master supply agreements with fixed prices or contract discount percentages for specific customer accounts.
2. **Customer Price List (`CUSTOMER_PRICELIST`)**: Price lists specifically assigned to an individual customer account.
3. **Customer Group Price List (`CUSTOMER_GROUP_PRICELIST`)**: Price lists assigned to customer cohorts (e.g. `WHOLESALE`, `VIP`, `DISTRIBUTOR`).
4. **Channel Price List (`CHANNEL_PRICELIST`)**: Channel or location-specific price lists (e.g. `ECOMMERCE`, `RETAIL_STORE`, `B2B_PORTAL`).
5. **Default Price List (`DEFAULT_PRICELIST`)**: Active tenant-wide default retail price list.
6. **Base Catalog Variant Price (`BASE_PRICE`)**: Authoritative base selling price defined on the product variant.

#### Volume Break Evaluation
Within any matching tier, volume breaks are evaluated by selecting the qualifying rule with the highest `min_quantity` such that:
$$\text{min\_quantity} \le \text{order\_line\_quantity}$$

Adjacent boundary conditions evaluate deterministically without ambiguity.

---

### Pillar B: Promotions & Campaign Evaluation Engine

The promotional engine supports dynamic retail and B2B campaigns while protecting inventory and budgets:

- **Promotion Types**:
  - `PERCENTAGE`: Subtotal or line discount in basis points ($10000 = 100.00\%$).
  - `FIXED_AMOUNT`: Subtotal or line discount in integer minor units.
  - `BUY_X_GET_Y` (BXGY): e.g. Buy 2, Get 1 at 100% off. Number of discounted items is:
    $$\text{Discounted Units} = \left\lfloor \frac{\text{Quantity}}{\text{BuyQty} + \text{GetQty}} \right\rfloor \times \text{GetQty}$$
  - `BUNDLE`: Fixed price or package discount on designated product bundles.
  - `TIERED_SUBTOTAL`: Volume-based order total discounts.

- **Stacking Rules**:
  - `STACKABLE`: Multiple promotions can combine additively up to line item or order subtotal limits.
  - `EXCLUSIVE`: If an exclusive campaign triggers and offers greater benefit than the sum of stackable promotions, it wins exclusively.
  - `BEST_DEAL`: Evaluates all candidates and applies the single greatest individual or valid combination discount.

- **Atomic Redemption vs Preview**:
  - **Cart Preview**: Evaluates discount calculations without consuming usage counters or budgets.
  - **Checkout Redemption**: Requires unique `operation_id` and idempotently records atomic `promotion_redemptions` entries, decrementing remaining budget and usage counters.

---

### Pillar C: Authoritative Append-Only Loyalty Ledger

Loyalty point operations are maintained in a strictly auditable, append-only ledger (`loyalty_transactions`):

$$\text{Points Balance} = \sum_{t \in \text{Transactions}} t.\text{points}$$

- **Transaction Types**:
  - `EARN`: Credit points based on eligible spend:
    $$\text{Earned Points} = \left\lfloor \frac{\text{SpendMinor}}{\text{PointsPerCurrencyMinor}} \right\rfloor \times \frac{\text{TierMultiplierBp}}{10000}$$
  - `REDEEM`: Debit points to apply order discount, subject to maximum order redemption percentage caps (e.g. max 50% of order total).
  - `EXPIRE`: Debit points reaching configured expiry horizons.
  - `REVERSAL`: Pro-rata adjustment on returns and refunds.
  - `MANUAL_ADJUSTMENT`: Supervised customer service adjustment with mandatory audit note.

- **Tier Progression**: Evaluated dynamically based on lifetime qualifying spend against sorted tier thresholds (`BRONZE` $\rightarrow$ `SILVER` $\rightarrow$ `GOLD` $\rightarrow$ `PLATINUM`).
- **Return Pro-Rata Reversal**:
  $$\text{Points To Deduct} = \left\lfloor \frac{\text{ReturnAmountMinor} \times \text{OriginalEarnedPoints}}{\text{OriginalOrderTotalMinor}} \right\rfloor$$
  $$\text{Points To Restore} = \left\lfloor \frac{\text{ReturnAmountMinor} \times \text{OriginalRedeemedPoints}}{\text{OriginalOrderTotalMinor}} \right\rfloor$$

---

### Pillar D: Rebates & Incentive Agreements Engine

Rebate agreements govern retrospective commercial incentives for customers and suppliers:

- **Rebate Types**:
  - `CUSTOMER_VOLUME` & `CUSTOMER_SPEND`
  - `SUPPLIER_VOLUME` & `SUPPLIER_SPEND`
- **Calculation Methods**:
  - `GRADUATED_TIERS`: Marginal bracket calculation where each tier rate applies strictly to the incremental volume or spend within that bracket.
  - `RETROACTIVE_ALL_UNITS`: Once a higher threshold is attained, that qualifying tier rate applies retroactively to 100% of accumulated volume or spend.
- **Strict State Machine**:
  $$\text{ESTIMATE} \longrightarrow \text{ACCRUED} \longrightarrow \text{CLAIMED} \longrightarrow \text{APPROVED} \longrightarrow \text{SETTLED}$$
- **Settlement**: Generates AP bills or Accounts Receivable credit notes. Guarded by `operation_id` to ensure absolute idempotency.

---

### Pillar E: Margin Protection & Governance

Commercial pricing is governed by strict profitability floors:

- **Margin Check**:
  $$\text{Margin Basis Points} = \frac{(\text{Price} - \text{Cost}) \times 10000}{\text{Price}}$$
- **Enforcement**: If resolved price yields margin below `min_margin_percent_bp` or discount exceeds `max_discount_percent_bp`, the system sets `margin_approved: false`.
- **Dual-Authorization Workflow (Two-Person Rule)**:
  - Sales representative submits a `pricing_override_requests` with business rationale and requested price.
  - Approval strictly requires `PRICING_MARGIN_APPROVE` permission.
  - **Self-Approval Prohibited**: The requestor cannot approve their own override request under any circumstance.

---

### Pillar F: Commercial Price Snapshots & Explainability

Every resolved commercial line item generates an immutable `CommercialPriceSnapshot`:

- Captures the complete evaluation tree: candidate rules inspected, winner identified, elimination reasons recorded.
- Captures applied promotional adjustments, tax rates, loyalty points earned/redeemed, and override approvals.
- Preserves historical explainability: if pricing rules or catalog base prices change in the future, past orders and historical invoices remain 100% verifiable and auditable.

---

## 3. Mathematical Invariants & Compliance Rules

1. **Rule 26: Pure Integer Arithmetic**:
   - Currency amounts expressed exclusively as string or `BigInt` minor units (e.g. cents, pence, yen).
   - Rates, margins, and discounts expressed exclusively in integer basis points ($10000 = 100.00\%$, $1 = 0.01\%$).
   - Floating point arithmetic (`number` division/multiplication for financial amounts) is strictly forbidden.
2. **Rule 11: Non-Destructive Ledger**:
   - Loyalty transactions, price snapshots, and rebate accruals are append-only.
   - Historical orders and posted GL journals are never mutated.
3. **Rule 21: Tenant Isolation**:
   - All Phase 8 tables have `tenant_id` foreign keys with `onDelete: 'restrict'`.
   - Cross-tenant queries are rejected with 404/403.
4. **Rule 19: Command Idempotency**:
   - Promotional redemptions, loyalty mutations, override requests, and rebate settlements enforce idempotency via `operation_id`.
