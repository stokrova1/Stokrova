# Roadmap

## Open
- [x] Order ticket flow: order taker builds list -> items reserved (not deducted) -> printed slip with barcode -> picker ticks/scans each item, flags missing -> cashier scans barcode, sees items+prices, records cash/transfer -> stock deducted, receipt printed. Unpaid tickets release reservation after a set time. One-person shops can do all steps on one screen.
- [x] "My day" (taker, picker, cashier; warehouse/procurement counts not yet) dashboard per worker: order taker (tickets, value), picker (tickets/items picked, misses), cashier (sales, cash vs transfer, returns), warehouse/procurement staff (their records today), with end-of-day summary.
- [x] Push approved changes to stokrova1/Stokrova — done Oct 16, commit 2e098a6 on master (239 files, nothing removed).

## Live tracking & product profit (requested Oct 16)
- [x] Product price tab: cost, selling price, auto margin per product (edit + history)
- [x] Per-product daily sold volume, revenue, profit + comparison chart (owner, manager, and each seller sees own)
- [x] Manager "Live activity" board: every staff member's sales/transactions/stock moves as they happen
- [x] Warehouse in/out totals on owner/manager dashboard (receipts, sales, transfers, adjustments)
- [x] Fleet/delivery summary on dashboard (runs, delivered, late, value in transit)

## Operations & alerts (requested Oct 16)
- [x] Reliability: tax receipt chain and marketing opt-outs saved permanently; receipt chain continues after restart
- [x] Reorder suggestions and best sellers (ABC, server-calculated from 90 days of sales) shown on pages
- [x] Daily summary + low-stock/expiry alerts by email (Resend) or WhatsApp (Meta) — needs keys on the user's server
- [x] Customers who owe / what we owe suppliers (30/60/90 days), guided stock count with money value
- [x] Product import from CSV, product photos, printable barcode labels
- [ ] Live database check — database itself migrated and verified (0016–0026); still needs the engine running (Render) so founder + owner sign-in can be checked live
