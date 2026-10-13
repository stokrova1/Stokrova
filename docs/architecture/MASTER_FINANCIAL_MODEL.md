# STOKROVA Master Financial & Accounting Model

## 1. Separation of Financial Concerns

STOKROVA strictly enforces a fundamental separation between commercial agreements, legal claims, financial asset movements, and customer presentation documents:

$$\text{Sales Order} \neq \text{Invoice} \neq \text{Payment} \neq \text{Receipt}$$

```mermaid
flowchart LR
    Order[Sales Order: Commercial Agreement] --> Invoice[Invoice: Accounts Receivable Legal Claim]
    Invoice --> Payment[Payment: Asset / Cash Settlement]
    Payment --> Receipt[Receipt: Customer Documentation]
```

### Invariant Rules
1. **A Receipt is NOT Financial Truth**: Printing or reprinting a receipt never creates a financial transaction, updates account balances, or duplicates money.
2. **Payments are Idempotent Financial Truth**: Payments record actual monetary transfers. Every payment command carries an `operation_id` to guarantee exactly-once execution.
3. **Invoices Represent Legal Claims**: Generated upon fulfillment or confirmation; establishes accounts receivable debt.

---

## 2. Double-Entry General Ledger Core

Financial truth adheres strictly to double-entry accounting principles:

$$\sum \text{Debits (Minor Units)} = \sum \text{Credits (Minor Units)}$$

```text
Chart of Accounts (Standard Hierarchy)
├── 1000 - Assets
│   ├── 1010 - Cash on Hand (Registers / Tills)
│   ├── 1020 - Bank Accounts (Operating / Settlement)
│   ├── 1100 - Accounts Receivable (Customer Debt)
│   └── 1200 - Inventory Asset (Stock Valuation)
├── 2000 - Liabilities
│   ├── 2010 - Accounts Payable (Supplier Debt)
│   ├── 2100 - Sales Tax / VAT Payable
│   └── 2200 - Customer Advance Deposits
├── 3000 - Equity
│   └── 3010 - Retained Earnings
├── 4000 - Revenue
│   ├── 4010 - Retail Sales Revenue
│   └── 4020 - Wholesale Sales Revenue
└── 5000 - Cost of Goods Sold (COGS)
    └── 5010 - Direct Inventory Cost of Goods Sold
```

---

## 3. Standard Automated Accounting Postings

Every critical business transaction generates balanced, append-only journal entries:

### Scenario A: Retail Cash Sale (₦10,000 Sale, ₦6,000 Inventory Cost)
| Account | Account Name | Debit (₦) | Credit (₦) |
| :--- | :--- | :---: | :---: |
| `1010` | Cash on Hand (Register Till) | ₦10,000 | — |
| `4010` | Retail Sales Revenue | — | ₦10,000 |
| `5010` | Cost of Goods Sold (COGS) | ₦6,000 | — |
| `1200` | Inventory Asset | — | ₦6,000 |
| **Total** | | **₦16,000** | **₦16,000** |

### Scenario B: Purchase Order Intake (₦50,000 Inventory Received from Supplier)
| Account | Account Name | Debit (₦) | Credit (₦) |
| :--- | :--- | :---: | :---: |
| `1200` | Inventory Asset | ₦50,000 | — |
| `2010` | Accounts Payable (Supplier Debt) | — | ₦50,000 |
| **Total** | | **₦50,000** | **₦50,000** |

---

## 4. Financial Ledger Immutability & Reversals

> **Rule 11: Never silently delete financial history.**

1. **Posted Entries are Permanent**: Once a journal entry is marked `is_posted = true`, it can never be modified or deleted by any user or administrator.
2. **Reversals via Compensating Entries**: To correct errors, the system generates an explicit reversing journal entry referencing the original entry ID:
   $$\text{Original: Debit A, Credit B} \longleftrightarrow \text{Reversal: Debit B, Credit A}$$
3. **Audit Completeness**: Full before/after metadata and user justification stored with every compensating entry.

---

## 5. Register Cash Reconciliation & Variance Tracking

Cash accountability is mathematically enforced:
$$\text{Expected Cash} = \text{Opening Float} + \text{Cash Sales} - \text{Cash Refunds} + \text{Cash In} - \text{Cash Out}$$
$$\text{Variance} = \text{Blind Physical Count} - \text{Expected Cash}$$

- **Cash Shortage (Negative Variance)**: Debited to `Cash Variance Expense` account.
- **Cash Overage (Positive Variance)**: Credited to `Cash Over/Short Revenue` account.
- Every variance above configured thresholds generates an automated security audit alert for management review.

---

## 6. Multi-Entity Consolidation & Group Chart of Accounts

STOKROVA supports multi-entity corporate structures with parent-subsidiary relationships, joint ventures, and international affiliates:

1. **Entity-Level Book Authoritativeness**: Entity-level general ledgers and local statutory books remain authoritative and immutable. Group consolidation operates purely downstream without modifying source journals.
2. **Group Chart of Accounts (COA)**: Local account codes map to unified group accounts through `entity_account_mappings`.
3. **Pure Integer Basis Point FX Translation**: Multi-currency conversion uses pure integer basis points ($10,000 = 1.0000$):
   $$\text{TranslatedMinor} = \left\lfloor \frac{\text{LocalMinor} \times \text{RateBasisPoints}}{10000} \right\rfloor$$
   Zero floating point math is permitted in financial calculations.
4. **Balanced Elimination Entries**: Intercompany eliminations (AR/AP, investments, internal sales) must balance exactly at group level:
   $$\sum \text{Debits} = \sum \text{Credits}$$

---

## 7. Intercompany Accounting & Automated Matching

Intercompany trading, management fees, and internal fund flows are governed by bilateral tracking:

1. **Bilateral Transaction Tracking**: Every intercompany event is recorded with explicit from-company and to-company identifiers.
2. **Matching Engine with Tolerance**: Automated matching identifies paired transactions within configurable minor unit tolerance.
3. **Transparent Discrepancy Queue**: Unmatched balances or amount discrepancies are permanently visible in reconciliation queues and are never silently auto-eliminated or forced into balance.

---

## 8. Treasury Management, Bank Feeds & Cash Transfers

Treasury operations manage liquidity while protecting financial controls:

1. **Masked Bank Account Registry**: Real bank accounts are registered with masked account numbers (`****1234`) and linked to GL asset accounts.
2. **Idempotent Bank Feed Sync**: External transaction deduplication prevents double-importing bank statement transactions.
3. **Dual Approval for High-Value Transfers**: Cash transfers $\ge \$10,000$ ($1,000,000$ minor units) require two distinct authorized managers before settlement.
4. **Non-Distorting Balance Sheet Settlement**: Fund transfers shift balances between cash/bank asset accounts without creating phantom revenue or expense entries.
5. **Deterministic Cash Forecasting**: Liquidity forecasting projects future cash horizons without altering authoritative GL ledger balances.

---

## 9. Multi-Jurisdiction Tax Compliance & Electronic Gateway Filing

Tax compliance ensures accurate accounting and filing across jurisdictions:

1. **Versioned Jurisdiction Configurations**: Tax rates are versioned in integer basis points (e.g., 750 bp for 7.5% VAT).
2. **Tax Return Calculation & GL Reconciliation**: Output tax and input tax are calculated with integer precision and reconciled against General Ledger tax control accounts.
3. **Truthful Asynchronous Filing**: Gateway communication timeouts return `TIMEOUT_PENDING`, preserving `SUBMITTED` return status to prevent duplicate tax filings, followed by safe asynchronous polling reconciliation.

