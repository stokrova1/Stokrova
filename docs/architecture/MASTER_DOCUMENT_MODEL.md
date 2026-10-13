# STOKROVA Master Document Engine Model

## 1. Document Subsystem Scope

The STOKROVA Document Engine generates, numbers, renders, formats, and archives all formal commercial and operational business documents across the physical-goods lifecycle:

```text
COMMERCIAL DOCUMENTS          OPERATIONAL DOCUMENTS          SUPPLIER DOCUMENTS
├── Quotations                ├── Pick Lists                 ├── Purchase Requisitions
├── Sales Orders              ├── Packing Slips              ├── Requests for Quotation (RFQ)
├── Invoices                  ├── Delivery Notes             ├── Purchase Orders (PO)
├── Receipts                  ├── Inter-Branch Transfers     ├── Goods Receipt Notes (GRN)
└── Credit / Debit Notes      └── Stocktake Count Sheets     └── Supplier Return Slips
```

---

## 2. Deterministic Numbering Engine

Every document type follows a configurable, collision-resistant numbering sequence:

$$\text{Document Number} = \{\text{Prefix}\} - \{\text{Branch Code}\} - \{\text{YYYY}\} - \{\text{Padded Monotonic Sequence}\}$$

### Examples:
- Invoice: `INV-LOS-2026-000452`
- Purchase Order: `PO-HQ-2026-000128`
- Goods Receipt: `GRN-LOS-2026-000891`
- Receipt: `REC-REG01-2026-012940`

### Sequence Invariant
Sequence generation is tenant-isolated and branch-isolated, utilizing PostgreSQL atomic sequences (`SELECT nextval(...)`) to prevent gaps or sequence collisions under high concurrency.

---

## 3. Template Rendering & Multi-Format Output

1. **Templating Engine**:
   - Built on lightweight HTML/CSS templates compiled with dynamic payload binding.
   - Tenants can customize branding: logo, business registration number, tax ID, header/footer notes, return policy, and signature lines.
2. **Output Channels**:
   - **ESC/POS Stream**: Raw binary control codes optimized for 58mm and 80mm thermal receipt printers.
   - **Vector PDF**: High-resolution PDF generated for A4/Letter invoicing, quotes, and delivery notes.
   - **Direct Email Delivery**: Automatic transmission to customer/vendor contacts with PDF attachments.
   - **Cloud Storage Archival**: Rendered PDFs uploaded to Cloudflare R2 with permanent signed download links.

---

## 4. Document History & Audit Immutability

1. **Finalized Documents Cannot Be Silently Altered**:
   - Once an invoice or purchase order is confirmed, the document content is permanently sealed.
   - Any modifications require creating an explicit **Revision** (e.g. `INV-LOS-2026-000452-R1`) with an audit log of what changed and who authorized the revision.
2. **Print Event Auditing**:
   - Every physical print or PDF download is recorded as an immutable read event (tracking user, timestamp, device, and print count).
   - Subsequent prints prominently display an `IS_REPRINT` watermark to prevent document fraud.
